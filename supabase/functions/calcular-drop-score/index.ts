// ============================================================
// DROP SECRETO — Edge Function: calcular-drop-score
// Roda sobre os produtos com status='pendente' (gravados pelo importador),
// calcula o Drop Score de cada um e atualiza a linha no banco.
// Deploy: supabase functions deploy calcular-drop-score
// Agendamento sugerido: a cada execução do importador, ou via cron
// (Dashboard → Edge Functions → Schedules).
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { calcularDropScore } from '../_shared/drop-score-engine.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: produtos, error } = await supabase
    .from('produtos')
    .select(
      '*, lojas(loja_oficial, confiabilidade_score, suspeita), historico_precos(preco, registrado_em)'
    )
    .eq('status', 'pendente')
    .limit(200); // processa em lotes para não estourar o tempo de execução

  if (error) {
    return new Response(JSON.stringify({ ok: false, erro: error.message }), { status: 500 });
  }

  let processados = 0;

  for (const p of produtos ?? []) {
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

    await supabase
      .from('produtos')
      .update({
        drop_score: resultado.dropScore,
        classificacao_score: resultado.classificacao,
        promocao_verificada: resultado.promocaoVerificada,
        status: resultado.status,
        motivo_rejeicao: resultado.motivoRejeicao ?? null,
      })
      .eq('id', p.id);

    processados++;
  }

  return new Response(JSON.stringify({ ok: true, processados }), { status: 200 });
});
