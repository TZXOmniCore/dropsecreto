// ============================================================
// DROP SECRETO — Motor de Drop Score (módulo compartilhado)
// Importado pela função calcular-drop-score. Ver supabase/functions/README.md
//
// A página "/como-funciona" do site (Next.js) importa PESOS e os limiares
// de aprovação diretamente deste arquivo, pra nunca ficar com texto
// desatualizado em relação ao que o motor realmente faz. Se mudar um peso
// ou limiar aqui, a página muda sozinha — não precisa editar em dois lugares.
// ============================================================

export interface PontoHistorico {
  preco: number;
  data: string; // YYYY-MM-DD
}

export interface ProdutoParaAnalise {
  precoAtual: number;
  precoAntigo?: number | null;
  freteGratis: boolean;
  valorFrete?: number | null;
  avaliacao: number;              // 0 a 5 (0 = produto ainda sem nenhuma avaliação)
  quantidadeAvaliacoes: number;
  quantidadeVendida: number;
  temCupomAtivo: boolean;
  lojaOficial: boolean;
  lojaConfiabilidade: number;     // 0 a 100, calculado previamente para a loja
  lojaAvaliacaoMedia: number;     // 0 a 5, nota da loja na Shopee
  lojaSuspeita: boolean;
  historicoPrecos: PontoHistorico[]; // idealmente últimos 90 dias
}

export type Classificacao = 'Excelente' | 'Boa' | 'Regular' | 'Ruim';
export type StatusProduto = 'aprovado' | 'rejeitado';

export interface ResultadoAnalise {
  dropScore: number;
  classificacao: Classificacao;
  promocaoVerificada: boolean | null; // null = dados insuficientes para verificar
  status: StatusProduto;
  motivoRejeicao?: string;
  subScores: {
    desconto: number;
    historicoPreco: number;
    avaliacao: number;
    vendas: number;
    loja: number;
    frete: number;
    cupom: number;
  };
}

// Pesos do Drop Score. A partir da revisão de julho/2026, o dropScore passou
// a ser só um número de RELEVÂNCIA/ordenação — não decide mais sozinho se um
// produto é aprovado ou não. Quem decide aprovação agora são os limiares de
// nota (LIMIAR_*) logo abaixo, porque um produto novo/pouco vendido pode ter
// dropScore baixo (pouca prova de venda) sem por isso ser um produto ruim.
export const PESOS = {
  desconto: 0.20,
  historicoPreco: 0.20,
  avaliacao: 0.15,
  vendas: 0.15,
  loja: 0.15,
  frete: 0.08,
  cupom: 0.07,
} as const;

// --- Limiares de aprovação (o que de fato barra um produto do site) ---
// Loja com nota abaixo disso nunca aparece no site, não importa o resto.
export const LIMIAR_NOTA_LOJA = 3.5;
// Produto que já tem avaliação, mas ela é baixa, é rejeitado.
export const LIMIAR_NOTA_PRODUTO = 2.5;
// Produto sem nenhuma avaliação ainda (comum em item novo/pouco vendido) só
// é aprovado se a loja tiver nota alta o suficiente pra compensar a falta
// de prova social do produto em si.
export const LIMIAR_NOTA_LOJA_PRODUTO_SEM_AVALIACAO = 3.9;

const FATOR_INFLACAO_SUSPEITA = 1.15; // "de" > 15% acima do maior preço já visto = suspeito

function scoreDesconto(precoAtual: number, precoAntigo?: number | null): number {
  if (!precoAntigo || precoAntigo <= precoAtual) return 0;
  const desconto = ((precoAntigo - precoAtual) / precoAntigo) * 100;
  return Math.min(100, (desconto / 60) * 100);
}

function analisarHistorico(
  precoAtual: number,
  precoAntigo: number | null | undefined,
  historico: PontoHistorico[]
): { score: number; promocaoVerificada: boolean | null } {
  if (historico.length < 3) {
    return { score: 50, promocaoVerificada: null };
  }

  const precos = historico.map((h) => h.preco);
  const menor = Math.min(...precos);
  const maior = Math.max(...precos);
  const media = precos.reduce((a, b) => a + b, 0) / precos.length;

  if (precoAntigo && precoAntigo > maior * FATOR_INFLACAO_SUSPEITA) {
    return { score: 15, promocaoVerificada: false };
  }

  if (precoAtual <= menor) return { score: 100, promocaoVerificada: true };
  if (precoAtual <= media) {
    const proporcao = (media - precoAtual) / (media - menor || 1);
    return { score: 70 + proporcao * 30, promocaoVerificada: true };
  }

  const excedente = (precoAtual - media) / media;
  return { score: Math.max(0, 50 - excedente * 100), promocaoVerificada: true };
}

function scoreAvaliacao(avaliacao: number, quantidadeAvaliacoes: number): number {
  const base = (avaliacao / 5) * 100;
  let fatorConfianca = 1;
  if (quantidadeAvaliacoes < 10) fatorConfianca = 0.6;
  else if (quantidadeAvaliacoes < 50) fatorConfianca = 0.85;
  return base * fatorConfianca;
}

// Produto sem nenhuma venda ainda pontua baixo (não zero) — ele não é mais
// descartado só por isso, mas naturalmente fica atrás de quem já vendeu e
// tem prova real. É esse número que faz um produto novo aparecer numa
// vitrine separada em vez de competir de igual pra igual no topo do ranking.
function scoreVendas(quantidadeVendida: number): number {
  if (quantidadeVendida <= 0) return 30;
  return Math.min(100, (Math.log10(quantidadeVendida + 1) / Math.log10(10000)) * 100);
}

function scoreLoja(lojaOficial: boolean, confiabilidade: number, suspeita: boolean): number {
  if (suspeita) return 0;
  const bonus = lojaOficial ? 15 : 0;
  return Math.min(100, confiabilidade + bonus);
}

function scoreFrete(freteGratis: boolean, valorFrete: number | null | undefined, precoAtual: number): number {
  if (freteGratis) return 100;
  if (!valorFrete || precoAtual <= 0) return 60;
  const proporcao = valorFrete / precoAtual;
  return Math.max(0, 100 - proporcao * 300);
}

function scoreCupom(temCupomAtivo: boolean): number {
  return temCupomAtivo ? 100 : 40;
}

function classificar(dropScore: number): Classificacao {
  if (dropScore >= 85) return 'Excelente';
  if (dropScore >= 70) return 'Boa';
  if (dropScore >= 50) return 'Regular';
  return 'Ruim';
}

// Decide se o produto pode aparecer no site. Isso NÃO depende mais do
// dropScore — depende só de nota (produto/loja) e de sinal de fraude.
// Um produto novo, sem venda nenhuma, passa aqui numa boa desde que a loja
// seja confiável; um produto "veterano" mas com nota ruim, não passa.
function avaliarAprovacao(
  produto: ProdutoParaAnalise,
  promocaoVerificada: boolean | null
): { aprovado: boolean; motivo?: string } {
  if (produto.lojaSuspeita) {
    return { aprovado: false, motivo: 'Loja marcada como suspeita' };
  }

  if (promocaoVerificada === false) {
    return {
      aprovado: false,
      motivo: 'Desconto aparenta ser inflado (preço "de" muito acima do maior preço já registrado)',
    };
  }

  const notaLoja = produto.lojaAvaliacaoMedia ?? 0;
  if (notaLoja > 0 && notaLoja < LIMIAR_NOTA_LOJA) {
    return { aprovado: false, motivo: `Loja com nota abaixo de ${LIMIAR_NOTA_LOJA} estrelas` };
  }

  if (produto.avaliacao > 0 && produto.avaliacao < LIMIAR_NOTA_PRODUTO) {
    return { aprovado: false, motivo: `Produto com nota abaixo de ${LIMIAR_NOTA_PRODUTO} estrelas` };
  }

  if (produto.avaliacao <= 0 && notaLoja < LIMIAR_NOTA_LOJA_PRODUTO_SEM_AVALIACAO) {
    return {
      aprovado: false,
      motivo: `Produto ainda sem avaliação — só é aprovado direto se a loja tiver nota ${LIMIAR_NOTA_LOJA_PRODUTO_SEM_AVALIACAO}+ (esta loja tem ${notaLoja || 'nenhuma'})`,
    };
  }

  return { aprovado: true };
}

export function calcularDropScore(produto: ProdutoParaAnalise): ResultadoAnalise {
  const { score: scoreHist, promocaoVerificada } = analisarHistorico(
    produto.precoAtual,
    produto.precoAntigo,
    produto.historicoPrecos
  );

  const subScores = {
    desconto: scoreDesconto(produto.precoAtual, produto.precoAntigo),
    historicoPreco: scoreHist,
    avaliacao: scoreAvaliacao(produto.avaliacao, produto.quantidadeAvaliacoes),
    vendas: scoreVendas(produto.quantidadeVendida),
    loja: scoreLoja(produto.lojaOficial, produto.lojaConfiabilidade, produto.lojaSuspeita),
    frete: scoreFrete(produto.freteGratis, produto.valorFrete, produto.precoAtual),
    cupom: scoreCupom(produto.temCupomAtivo),
  };

  let dropScore =
    subScores.desconto * PESOS.desconto +
    subScores.historicoPreco * PESOS.historicoPreco +
    subScores.avaliacao * PESOS.avaliacao +
    subScores.vendas * PESOS.vendas +
    subScores.loja * PESOS.loja +
    subScores.frete * PESOS.frete +
    subScores.cupom * PESOS.cupom;

  if (promocaoVerificada === false) {
    dropScore = Math.min(dropScore, 30);
  }

  dropScore = Math.round(dropScore * 100) / 100;

  const { aprovado, motivo } = avaliarAprovacao(produto, promocaoVerificada);

  return {
    dropScore,
    classificacao: classificar(dropScore),
    promocaoVerificada,
    status: aprovado ? 'aprovado' : 'rejeitado',
    motivoRejeicao: motivo,
    subScores,
  };
}
