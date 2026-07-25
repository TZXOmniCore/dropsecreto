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
