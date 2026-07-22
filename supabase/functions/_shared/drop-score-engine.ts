// ============================================================
// DROP SECRETO — Motor de Drop Score (módulo compartilhado)
// Importado pela função calcular-drop-score. Ver supabase/functions/README.md
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
  avaliacao: number;              // 0 a 5
  quantidadeAvaliacoes: number;
  quantidadeVendida: number;
  temCupomAtivo: boolean;
  lojaOficial: boolean;
  lojaConfiabilidade: number;     // 0 a 100, calculado previamente para a loja
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

const PESOS = {
  desconto: 0.20,
  historicoPreco: 0.20,
  avaliacao: 0.15,
  vendas: 0.15,
  loja: 0.15,
  frete: 0.08,
  cupom: 0.07,
} as const;

const LIMIAR_APROVACAO = 50;
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

function scoreVendas(quantidadeVendida: number): number {
  if (quantidadeVendida <= 0) return 0;
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

export function calcularDropScore(produto: ProdutoParaAnalise): ResultadoAnalise {
  if (produto.lojaSuspeita) {
    return {
      dropScore: 0,
      classificacao: 'Ruim',
      promocaoVerificada: null,
      status: 'rejeitado',
      motivoRejeicao: 'Loja marcada como suspeita',
      subScores: { desconto: 0, historicoPreco: 0, avaliacao: 0, vendas: 0, loja: 0, frete: 0, cupom: 0 },
    };
  }

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

  const aprovado = dropScore >= LIMIAR_APROVACAO && promocaoVerificada !== false;

  return {
    dropScore,
    classificacao: classificar(dropScore),
    promocaoVerificada,
    status: aprovado ? 'aprovado' : 'rejeitado',
    motivoRejeicao: aprovado
      ? undefined
      : promocaoVerificada === false
      ? 'Desconto aparenta ser inflado (preço "de" muito acima do maior preço já registrado)'
      : `Drop Score abaixo do limiar de aprovação (${LIMIAR_APROVACAO})`,
    subScores,
  };
}
