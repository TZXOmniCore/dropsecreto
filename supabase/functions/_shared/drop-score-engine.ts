// ============================================================
// DROP SECRETO — Motor do Drop Score
//
// ⚠️ AVISO IMPORTANTE: este arquivo é uma RECONSTRUÇÃO.
// O conteúdo que estava aqui no projeto enviado não era o motor de
// verdade — era uma cópia colada por engano do handler de
// calcular-drop-score/index.ts (sem a função calcularDropScore, sem
// PESOS, sem nada). Isso não foi quebrado nesta sessão: já estava assim
// no zip original.
//
// Reconstruí a lógica abaixo com base no que já estava documentado
// publicamente em components/HowItWorks.tsx (os 7 critérios, os nomes,
// as regras de corte descritas em texto) e no formato de entrada/saída
// que calcular-drop-score/index.ts já esperava. Os PESOS e os limiares
// de nota (LIMIAR_NOTA_LOJA etc.) são valores razoáveis que eu escolhi —
// NÃO são os números originais recuperados, porque esses números nunca
// estavam em lugar nenhum do que foi enviado. Revisa e ajusta como
// achar melhor; se você tiver o arquivo certo salvo em algum outro
// lugar (histórico do git, outra cópia, etc.), me manda que eu troco.
// ============================================================

// Soma tem que dar 1 (100%) — é o que HowItWorks.tsx usa pra mostrar o %.
export const PESOS = {
  desconto: 0.25,
  historicoPreco: 0.2,
  avaliacao: 0.15,
  vendas: 0.1,
  loja: 0.15,
  frete: 0.1,
  cupom: 0.05,
} as const;

export const LIMIAR_NOTA_LOJA = 3.5;
export const LIMIAR_NOTA_PRODUTO = 3.5;
export const LIMIAR_NOTA_LOJA_PRODUTO_SEM_AVALIACAO = 4.0;

export interface HistoricoPrecoPonto {
  preco: number;
  data: string;
}

export interface EntradaDropScore {
  precoAtual: number;
  precoAntigo: number | null;
  freteGratis: boolean;
  valorFrete: number | null;
  avaliacao: number;
  quantidadeAvaliacoes: number;
  quantidadeVendida: number;
  temCupomAtivo: boolean;
  lojaOficial: boolean;
  lojaConfiabilidade: number; // 0–100
  lojaAvaliacaoMedia: number; // 0–5
  lojaSuspeita: boolean;
  historicoPrecos: HistoricoPrecoPonto[]; // últimos 90 dias
}

export interface ResultadoDropScore {
  dropScore: number; // 0–100
  classificacao: 'Excelente' | 'Boa' | 'Regular' | 'Ruim';
  promocaoVerificada: boolean;
  status: 'aprovado' | 'rejeitado';
  motivoRejeicao: string | null;
}

export function calcularDropScore(entrada: EntradaDropScore): ResultadoDropScore {
  // --- Regras de corte — rejeição imediata, sem calcular pontuação ---
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

  // --- Histórico de preço: só é "promoção verificada" se o preço "de"
  // declarado realmente apareceu no histórico dos últimos 90 dias.
  const precoDeExistiuNoHistorico =
    entrada.precoAntigo != null &&
    entrada.historicoPrecos.some((p) => Math.abs(p.preco - entrada.precoAntigo!) < 0.01);
  const promocaoVerificada = entrada.precoAntigo != null && precoDeExistiuNoHistorico;

  // --- Pontuação por critério, cada um normalizado entre 0 e 1 ---
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
  return Math.min(percentual / 70, 1); // 70%+ de desconto já pontua o máximo
}

function calcularPontoAvaliacao(avaliacao: number, quantidadeAvaliacoes: number): number {
  if (quantidadeAvaliacoes === 0) return 0.5; // neutro — produto novo, ainda sem histórico
  const pontoBase = avaliacao / 5;
  const confianca = Math.min(quantidadeAvaliacoes / 50, 1); // poucas avaliações pesam menos
  return pontoBase * (0.5 + 0.5 * confianca);
}

function calcularPontoVendas(quantidadeVendida: number): number {
  if (quantidadeVendida <= 0) return 0.3; // não descarta, só pontua menos
  return Math.min(Math.log10(quantidadeVendida + 1) / 3, 1); // escala log — ~1000 vendas já pontua alto
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
