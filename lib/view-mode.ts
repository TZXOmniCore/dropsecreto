// Preferência de visualização (grade de 2 colunas ou lista de 1 coluna),
// salva por aparelho — mesmo padrão de localStorage já usado no resto do
// site. Sem login, sem custo de servidor.
const CHAVE = 'drop-secreto:modo-visualizacao';

export type ModoVisualizacao = 'grade' | 'lista';

export function obterModoVisualizacao(): ModoVisualizacao {
  if (typeof window === 'undefined') return 'grade';
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    return bruto === 'lista' ? 'lista' : 'grade';
  } catch {
    return 'grade';
  }
}

export function salvarModoVisualizacao(modo: ModoVisualizacao) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CHAVE, modo);
  } catch {
    // localStorage indisponível — segue sem quebrar nada
  }
}
