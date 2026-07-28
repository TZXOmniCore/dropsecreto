// ============================================================
// DROP SECRETO — Edge Function: calcular-drop-score
// Roda sobre os produtos com status='pendente', calcula o Drop Score de
// cada um e atualiza a linha no banco.
//
// CORREÇÃO 1 (CPU Time exceeded): a versão anterior tinha um laço que ia
// drenando lotes de 200 até esgotar 100s de tempo de PAREDE — mas o
// limite que realmente derruba uma Edge Function no Supabase é o de CPU
// TIME (2000ms de processamento ativo por invocação, não conta espera de
// rede/banco). Com bastante "pendente" acumulado, esse laço podia rodar
// dezenas de vezes numa única invocação e estourar o teto de CPU. Agora
// processa 1 lote só por invocação; quem garante que o backlog é
// drenado é a frequência do cron, não um laço interno.
//
// CORREÇÃO 2 (deploy falhando): este arquivo antes importava o motor de
// `../_shared/drop-score-engine.ts`. Pela Dashboard do Supabase (deploy
// via editor de código, e não via CLI), esse import cross-pasta não é
// empacotado — o deploy falhava com "Module not found". A função abaixo
// (calcularDropScore + PESOS + limiares) está copiada aqui dentro pra
// esse deploy funcionar sem depender de outro arquivo.
//
// ⚠️ Essa cópia é idêntica, hoje, à de supabase/functions/_shared/
// drop-score-engine.ts (usada pelo frontend em HowItWorks.tsx). Se um
// dia mudar peso/limiar, muda nos DOIS lugares — ou migra o deploy pra
// CLI (`supabase functions deploy`), que bundla o _shared automático e
// aí volta a ter uma fonte única de verdade.
// ============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const LOTE_POR_EXECUCAO = 200;

// ------------------------------------------------------------
// Motor do Drop Score (cópia de _shared/drop-score-engine.ts — ver aviso
// no topo do arquivo. Reconstruído a partir do que já estava documentado
// em HowItWorks.tsx; pesos/limiares são valores razoáveis escolhidos por
// mim, não os originais recuperados — revisar e ajustar como preferir).
// ------------------------------------------------------------
const PESOS = {
  desconto: 0.25,
  historicoPreco: 0.2,
  avaliacao: 0.15,
  vendas: 0.1,
  loja: 0.15,
  frete: 0.1,
  cupom: 0.05,
} as const;

const LIMIAR_NOTA_LOJA = 4.0;
const LIMIAR_NOTA_PRODUTO = 4.0;
const LIMIAR_NOTA_LOJA_PRODUTO_SEM_AVALIACAO = 4.5;

interface HistoricoPrecoPonto {
  preco: number;
  data: string;
}

interface EntradaDropScore {
  precoAtual: number;
  precoAntigo: number | null;
  freteGratis: boolean;
  valorFrete: number | null;
  avaliacao: number;
  quantidadeAvaliacoes: number;
  quantidadeVendida: number;
  temCupomAtivo: boolean;
  lojaOficial: boolean;
  lojaConfiabilidade: number;
  lojaAvaliacaoMedia: number;
  lojaSuspeita: boolean;
  historicoPrecos: HistoricoPrecoPonto[];
}

interface ResultadoDropScore {
  dropScore: number;
  classificacao: 'Excelente' | 'Boa' | 'Regular' | 'Ruim';
  promocaoVerificada: boolean;
  status: 'aprovado' | 'rejeitado';
  motivoRejeicao: string | null;
}

function calcularDropScore(entrada: EntradaDropScore): ResultadoDropScore {
  if (entrada.lojaSuspeita) {
    return rejeitar('Loja marcada como suspeita.');
  }

  if (entrada.lojaAvaliacaoMedia > 0 && entrada.lojaAvaliacaoMedia < LIMIAR_NOTA_LOJA) {
    return rejeitar(
      `Loja com nota ${entrada.lojaAvaliacaoMedia.toFixed(1)}, abaixo do mínimo de ${LIMIAR_NOTA_LOJA}.`
    );
  }

  const produtoSemAvaliacao = entrada.quantidadeAvaliacoes === 0;
  if (produtoSemAvaliacao) {
    if (entrada.lojaAvaliacaoMedia < LIMIAR_NOTA_LOJA_PRODUTO_SEM_AVALIACAO) {
      return rejeitar(
        'Produto ainda sem avaliação própria e a loja está abaixo do mínimo exigido nesse caso.'
      );
    }
  } else if (entrada.avaliacao < LIMIAR_NOTA_PRODUTO) {
    return rejeitar(
      `Produto com nota ${entrada.avaliacao.toFixed(1)}, abaixo do mínimo de ${LIMIAR_NOTA_PRODUTO}.`
    );
  }

  const precoDeExistiuNoHistorico =
    entrada.precoAntigo != null &&
    entrada.historicoPrecos.some((p) => Math.abs(p.preco - entrada.precoAntigo!) < 0.01);
  const promocaoVerificada = entrada.precoAntigo != null && precoDeExistiuNoHistorico;

  const pontoDesconto = calcularPontoDesconto(entrada.precoAtual, entrada.precoAntigo);
  const pontoHistorico = promocaoVerificada ? 1 : entrada.precoAntigo != null ? 0.2 : 0.5;
  const pontoAvaliacao = calcularPontoAvaliacao(entrada.avaliacao, entrada.quantidadeAvaliacoes);
  const pontoVendas = calcularPontoVendas(entrada.quantidadeVendida);
  const pontoLoja = calcularPontoLoja(entrada.lojaOficial, entrada.lojaConfiabilidade);
  const pontoFrete = calcularPontoFrete(entrada.freteGratis, entrada.valorFrete, entrada.precoAtual);
  const pontoCupom = entrada.temCupomAtivo ? 1 : 0;

  const dropScore = Math.round(
    (pontoDesconto * PESOS.desconto +
      pontoHistorico * PESOS.historicoPreco +
      pontoAvaliacao * PESOS.avaliacao +
      pontoVendas * PESOS.vendas +
      pontoLoja * PESOS.loja +
      pontoFrete * PESOS.frete +
      pontoCupom * PESOS.cupom) *
      100
  );

  return {
    dropScore,
    classificacao: classificar(dropScore),
    promocaoVerificada,
    status: 'aprovado',
    motivoRejeicao: null,
  };
}

function rejeitar(motivo: string): ResultadoDropScore {
  return { dropScore: 0, classificacao: 'Ruim', promocaoVerificada: false, status: 'rejeitado', motivoRejeicao: motivo };
}

function classificar(score: number): ResultadoDropScore['classificacao'] {
  if (score >= 80) return 'Excelente';
  if (score >= 60) return 'Boa';
  if (score >= 40) return 'Regular';
  return 'Ruim';
}

function calcularPontoDesconto(precoAtual: number, precoAntigo: number | null): number {
  if (!precoAntigo || precoAntigo <= precoAtual) return 0;
  const percentual = (1 - precoAtual / precoAntigo) * 100;
  return Math.min(percentual / 70, 1);
}

function calcularPontoAvaliacao(avaliacao: number, quantidadeAvaliacoes: number): number {
  if (quantidadeAvaliacoes === 0) return 0.5;
  const pontoBase = avaliacao / 5;
  const confianca = Math.min(quantidadeAvaliacoes / 50, 1);
  return pontoBase * (0.5 + 0.5 * confianca);
}

function calcularPontoVendas(quantidadeVendida: number): number {
  if (quantidadeVendida <= 0) return 0.3;
  return Math.min(Math.log10(quantidadeVendida + 1) / 3, 1);
}

function calcularPontoLoja(lojaOficial: boolean, confiabilidade: number): number {
  const pontoConfiabilidade = Math.min(Math.max(confiabilidade, 0), 100) / 100;
  return lojaOficial ? Math.max(pontoConfiabilidade, 0.8) : pontoConfiabilidade;
}

function calcularPontoFrete(freteGratis: boolean, valorFrete: number | null, precoAtual: number): number {
  if (freteGratis) return 1;
  if (!valorFrete || precoAtual <= 0) return 0.5;
  const proporcao = valorFrete / precoAtual;
  if (proporcao <= 0.05) return 0.8;
  if (proporcao <= 0.15) return 0.5;
  return 0.2;
}

// ------------------------------------------------------------
// Roda uma lista de itens com no máximo `limite` chamadas simultâneas.
// ------------------------------------------------------------
async function mapComLimite<T, R>(
  itens: T[],
  limite: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const resultados: R[] = new Array(itens.length);
  let proximo = 0;

  async function worker() {
    while (proximo < itens.length) {
      const indiceAtual = proximo++;
      resultados[indiceAtual] = await fn(itens[indiceAtual]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limite, itens.length) }, () => worker()));
  return resultados;
}

// ------------------------------------------------------------
// Handler da Edge Function — processa 1 lote (200) por invocação.
// ------------------------------------------------------------
Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: produtos, error: erroSelect } = await supabase
    .from('produtos')
    .select(
      '*, lojas(loja_oficial, confiabilidade_score, avaliacao_media, suspeita), historico_precos(preco, data:registrado_em)'
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
  let falhas = 0;

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

  // UPDATE por id em vez de upsert em lote: o upsert do Postgres valida as
  // colunas NOT NULL da tabela inteira (ex.: "nome") mesmo quando o
  // resultado é um UPDATE por conflito — como o lote só tem os campos do
  // score, o upsert quebrava com "null value in column nome". Update não
  // toca em coluna nenhuma fora da lista, então não tem esse problema.
  await mapComLimite(atualizacoes, 20, async (item) => {
    const { error } = await supabase
      .from('produtos')
      .update({
        drop_score: item.drop_score,
        classificacao_score: item.classificacao_score,
        promocao_verificada: item.promocao_verificada,
        status: item.status,
        motivo_rejeicao: item.motivo_rejeicao,
      })
      .eq('id', item.id);

    if (error) {
      falhas++;
      console.error(`Erro ao atualizar produto ${item.id}:`, error.message);
    }
  });

  return new Response(
    JSON.stringify({ ok: falhas === 0, processados: atualizacoes.length - falhas, aprovados, rejeitados, falhas }),
    { status: falhas === 0 ? 200 : 500 }
  );
});
