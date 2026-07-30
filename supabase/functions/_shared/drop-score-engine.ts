// ============================================================
// DROP SECRETO — Motor do Drop Score
//
// Histórico: este arquivo já foi uma reconstrução com valores "razoáveis"
// inventados, e chegou a ficar dessincronizado da cópia que roda de
// verdade em produção (calcular-drop-score/index.ts — que não consegue
// importar daqui porque o deploy é feito pela Dashboard do Supabase, não
// pela CLI). Nesta atualização os dois arquivos foram revisados e
// alinhados de propósito. Se mudar peso ou limiar, muda NOS DOIS
// LUGARES — ou migre o deploy pra CLI (`supabase functions deploy`) pra
// voltar a ter uma fonte única de verdade.
//
// Mudanças feitas nesta revisão:
// 1) Limiares unificados em 3,5 (produto e loja) / 4,0 (loja quando o
//    produto ainda não tem avaliação própria) — antes um arquivo dizia
//    4,0/4,0/4,5 e o outro 3,5/3,5/4,0.
// 2) `frete` e `cupom` zerados: a Shopee Affiliate API (productOfferV2)
//    não devolve frete nem cupom, então esses dois pesos (15% do total)
//    sempre caíam num valor fixo/neutro — nunca discriminavam nada de
//    verdade. O peso foi redistribuído pros critérios que têm dado real
//    (desconto, histórico, avaliação, vendas, loja). Se um dia a API
//    passar a expor frete/cupom de verdade, é só voltar a dar peso a eles.
// 3) Produto sem histórico de preço ACUMULADO AINDA (catálogo novo, recém
//    populado) não é mais tratado como quase-suspeito — só o caso em que
//    existe histórico mas o preço "de" alegado não bate com ele continua
//    sendo penalizado (esse sim é sinal de preço inflado artificialmente).
// ============================================================

// Soma tem que dar 1 (100%) — é o que HowItWorks.tsx usa pra mostrar o %.
// `frete` e `cupom` ficam em 0 até a Shopee Affiliate API expor esse dado
// de verdade (ver nota acima) — não reativar sem dado real chegando.
export const PESOS = {
  desconto: 0.3,
  historicoPreco: 0.25,
  avaliacao: 0.18,
  vendas: 0.12,
  loja: 0.15,
  frete: 0,
  cupom: 0,
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

  // A Shopee Affiliate API (productOfferV2) não expõe contagem de
  // avaliações, só a nota média (ratingStar) — por isso o corte usa a
  // NOTA como sinal de "ainda sem avaliação", não uma contagem que essa
  // integração nunca vai ter como preencher de verdade.
  const produtoSemAvaliacao = entrada.avaliacao <= 0;
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
  const temHistoricoAcumulado = entrada.historicoPrecos.length > 0;
  const precoDeExistiuNoHistorico =
    entrada.precoAntigo != null &&
    entrada.historicoPrecos.some((p) => Math.abs(p.preco - entrada.precoAntigo!) < 0.01);
  const promocaoVerificada = entrada.precoAntigo != null && precoDeExistiuNoHistorico;

  // --- Pontuação por critério, cada um normalizado entre 0 e 1 ---
  const pontoDesconto = calcularPontoDesconto(entrada.precoAtual, entrada.precoAntigo);
  // 1 = preço "de" bate com o histórico (promoção confirmada).
  // 0.6 = produto ainda sem histórico acumulado (catálogo novo/recém
  //       importado) — não é culpa do produto, não deve ser punido como
  //       se fosse suspeito, mas também não ganha o ponto máximo.
  // 0.2 = TEM histórico, mas o preço "de" alegado não aparece nele — esse
  //       sim é o sinal de preço inflado artificialmente.
  // 0.5 = não há preço "de" alegado nenhum (produto sem desconto anunciado).
  const pontoHistorico = promocaoVerificada
    ? 1
    : !temHistoricoAcumulado
      ? 0.6
      : entrada.precoAntigo != null
        ? 0.2
        : 0.5;
  const pontoAvaliacao = calcularPontoAvaliacao(entrada.avaliacao);
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

function calcularPontoAvaliacao(avaliacao: number): number {
  if (avaliacao <= 0) return 0.5; // sem nota ainda — neutro, não pune nem beneficia
  return avaliacao / 5;
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
