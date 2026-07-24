// ============================================================
// DROP SECRETO — Edge Function: calcular-drop-score
// Roda sobre os produtos com status='pendente' (gravados pelo importador),
// calcula o Drop Score de cada um e atualiza a linha no banco.
//
// v2: os resultados de todos os produtos do lote são gravados num
// único upsert em vez de um update() por produto — mesmo ajuste
// feito na importar-feed-shopee, pelo mesmo motivo (evitar bater no
// limite de 150s de execução da Edge Function).
//
// Deploy: cola esse código na aba "Code" da function no Supabase.
// Agendamento sugerido: a cada execução do importador, ou via cron
// (Dashboard → Edge Functions → Schedules).
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { calcularDropScore } from '../_shared/drop-score-engine.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const LOTE_POR_EXECUCAO = 200; // processa em lotes para não estourar o tempo de execução

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: produtos, error: erroSelect } = await supabase
    .from('produtos')
    .select(
      '*, lojas(loja_oficial, confiabilidade_score, suspeita), historico_precos(preco, registrado_em)'
    )
    .eq('status', 'pendente')
    .limit(LOTE_POR_EXECUCAO);

  if (erroSelect) {
    return new Response(JSON.stringify({ ok: false, erro: erroSelect.message }), { status: 500 });
  }

  if (!produtos || produtos.length === 0) {
    return new Response(JSON.stringify({ ok: true, processados: 0, aprovados: 0, rejeitados: 0 }), {
      status: 200,
    });
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
    return new Response(JSON.stringify({ ok: false, erro: erroUpsert.message }), { status: 500 });
  }

  return new Response(
    JSON.stringify({ ok: true, processados: atualizacoes.length, aprovados, rejeitados }),
    { status: 200 }
  );
});
