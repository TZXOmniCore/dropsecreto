// Funções puras de "produto novo" / "pouco vendido" — sem import do
// Supabase de propósito, porque isso aqui também é usado em componentes
// client (ProductCard, página de produto) e não precisa levar todas as
// funções de busca no banco (lib/produtos.ts) pro bundle do navegador.
import type { Produto } from './types';

export const DIAS_PRODUTO_NOVO = 7;
export const VENDAS_PRODUTO_POUCO_VENDIDO = 10;

export function produtoENovo(produto: Pick<Produto, 'importadoEm'>): boolean {
  if (!produto.importadoEm) return false;
  const diasDesdeImportacao =
    (Date.now() - new Date(produto.importadoEm).getTime()) / (1000 * 60 * 60 * 24);
  return diasDesdeImportacao <= DIAS_PRODUTO_NOVO;
}

export function produtoPoucoVendido(produto: Pick<Produto, 'quantidadeVendida'>): boolean {
  return produto.quantidadeVendida < VENDAS_PRODUTO_POUCO_VENDIDO;
}

const DIAS_MINIMO_PRA_BADGE = 3; // histórico curto demais não sustenta a afirmação

// Retorna o texto do badge ("menor preço em 47 dias") só quando o preço
// atual é de fato o mais baixo do histórico acumulado E esse histórico já
// cobre um período com significado (evita a badge aparecer em todo
// produto novo, que teria "menor preço" só por só ter 1 registro).
export function textoMenorPreco(
  produto: Pick<Produto, 'precoAtual' | 'historico90d' | 'historicoDiasCobertos'>
): string | null {
  if (produto.historicoDiasCobertos < DIAS_MINIMO_PRA_BADGE) return null;
  const menorRegistrado = Math.min(...produto.historico90d);
  if (produto.precoAtual > menorRegistrado + 0.01) return null;
  return `menor preço em ${produto.historicoDiasCobertos} dias`;
}
