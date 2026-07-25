// ============================================================
// DROP SECRETO — Edge Function: calcular-drop-score
// Roda sobre os produtos com status='pendente', calcula o Drop Score de
// cada um (via motor compartilhado em _shared/drop-score-engine.ts) e
// atualiza a linha no banco.
//
// - Upsert único por lote (evita N updates separados no banco).
// - Laço com orçamento de tempo: se sobrar bastante pendente acumulado,
//   drena mais de um lote de 200 na mesma execução em vez de processar
//   só o primeiro — sem passar da folga de 100s sob o limite de 150s do
//   Supabase.
// - historico_precos vem do banco com a coluna registrado_em; a
//   interface do motor espera "data" — aliasado direto no select
//   (data:registrado_em) pra não precisar mapear na mão.
// ============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { calcularDropScore } from '../_shared/drop-score-engine.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const LOTE_POR_EXECUCAO = 200;
const ORCAMENTO_MS = 100_000; // folga sob os 150s de idle timeout do Supabase

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const inicioMs = Date.now();

  let processados = 0;
  let aprovados = 0;
  let rejeitados = 0;

  while (Date.now() - inicioMs < ORCAMENTO_MS) {
    const { data: produtos, error: erroSelect } = await supabase
      .from('produtos')
      .select(
        '*, lojas(loja_oficial, confiabilidade_score, avaliacao_media, suspeita), historico_precos(preco, data:registrado_em)'
      )
      .eq('status', 'pendente')
      .limit(LOTE_POR_EXECUCAO);

    if (erroSelect) {
      return new Response(
        JSON.stringify({ ok: false, erro: erroSelect.message, processados, aprovados, rejeitados }),
        { status: 500 }
      );
    }

    if (!produtos || produtos.length === 0) break;

    const atualizacoes = produtos.map((p: any) => {
      const resultado = calcularDropScore({
        precoAtual: p.preco_atual,
        precoAntigo: p.preco_antigo,
        freteGratis: p.frete_gratis,
        valorFrete: p.valor_frete,
        avaliacao: p.avaliacao,
        quantidadeAvaliacoes: p.quantidade_avaliacoes,
        quantidadeVendida: p.quantidade_vendida,
        temCupomAtivo: !!p.cupom_id,
        lojaOficial: p.lojas?.loja_oficial ?? false,
        lojaConfiabilidade: p.lojas?.confiabilidade_score ?? 50,
        lojaAvaliacaoMedia: p.lojas?.avaliacao_media ?? 0,
        lojaSuspeita: p.lojas?.suspeita ?? false,
        historicoPrecos: p.historico_precos ?? [],
      });

      if (resultado.status === 'aprovado') aprovados++;
      else rejeitados++;

      return {
        id: p.id,
        drop_score: resultado.dropScore,
        classificacao_score: resultado.classificacao,
        promocao_verificada: resultado.promocaoVerificada,
        status: resultado.status,
        motivo_rejeicao: resultado.motivoRejeicao ?? null,
      };
    });

    const { error: erroUpsert } = await supabase
      .from('produtos')
      .upsert(atualizacoes, { onConflict: 'id' });

    if (erroUpsert) {
      return new Response(
        JSON.stringify({ ok: false, erro: erroUpsert.message, processados, aprovados, rejeitados }),
        { status: 500 }
      );
    }

    processados += atualizacoes.length;

    if (produtos.length < LOTE_POR_EXECUCAO) break; // não sobrou mais pendente
  }

  return new Response(JSON.stringify({ ok: true, processados, aprovados, rejeitados }), { status: 200 });
});
