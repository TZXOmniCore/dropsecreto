// ============================================================
// DROP SECRETO — Edge Function: calcular-drop-score
// Roda sobre os produtos com status='pendente', calcula o Drop Score
// de cada um e atualiza a linha no banco.
//
// CORREÇÃO: a versão anterior tinha um laço que ia drenando lotes de 200
// até esgotar 100s de tempo de PAREDE — mas o limite que realmente
// derruba uma Edge Function no Supabase é o de CPU TIME (2000ms de
// processamento ativo por invocação, não conta espera de rede/banco).
// Com bastante "pendente" acumulado, esse laço podia rodar dezenas de
// vezes numa única invocação e estourar o teto de CPU (mesmo erro do
// importar-feed-shopee — ver o comentário lá). Agora processa 1 lote só
// por invocação; quem garante que o backlog é drenado é a frequência do
// cron, não um laço interno.
// ============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { calcularDropScore } from '../_shared/drop-score-engine.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const LOTE_POR_EXECUCAO = 200;

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: produtos, error: erroSelect } = await supabase
    .from('produtos')
    .select(
      '*, lojas(loja_oficial, confiabilidade_score, avaliacao_media, suspeita), historico_precos(preco, registrado_em)'
    )
    .eq('status', 'pendente')
    .limit(LOTE_POR_EXECUCAO);

  if (erroSelect) {
    return new Response(
      JSON.stringify({ ok: false, erro: erroSelect.message, processados: 0, aprovados: 0, rejeitados: 0 }),
      { status: 500 }
    );
  }

  if (!produtos || produtos.length === 0) {
    return new Response(
      JSON.stringify({ ok: true, processados: 0, aprovados: 0, rejeitados: 0 }),
      { status: 200 }
    );
  }

  let aprovados = 0;
  let rejeitados = 0;

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
      JSON.stringify({
        ok: false,
        erro: erroUpsert.message,
        processados: 0,
        aprovados,
        rejeitados,
      }),
      { status: 500 }
    );
  }

  return new Response(
    JSON.stringify({ ok: true, processados: atualizacoes.length, aprovados, rejeitados }),
    { status: 200 }
  );
});
