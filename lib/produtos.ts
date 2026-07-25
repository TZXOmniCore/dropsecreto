// ============================================================
// DROP SECRETO — Busca de produtos reais no Supabase
// Substitui o lib/mock-data.ts nas páginas do site.
// A RLS do banco (ver 0001_init.sql) já garante que só produtos
// com status='aprovado' e ativo=true aparecem aqui — não precisa
// filtrar isso de novo nas queries.
// ============================================================

import { supabase } from './supabase';
import type { Produto, Categoria } from './types';
export { produtoENovo, produtoPoucoVendido, DIAS_PRODUTO_NOVO, VENDAS_PRODUTO_POUCO_VENDIDO } from './produto-badges';

// Campos + relacionamentos usados em toda listagem de produto.
// "categorias" e "lojas" vêm como objeto (relação de 1 pra 1
// a partir de produtos); "historico_precos" vem como lista.
const CAMPOS_PRODUTO = `
  id,
  nome,
  imagem_principal_url,
  preco_atual,
  preco_antigo,
  desconto_percentual,
  drop_score,
  classificacao_score,
  frete_gratis,
  quantidade_vendida,
  avaliacao,
  link_afiliado,
  cupom_id,
  importado_em,
  categorias ( slug ),
  lojas ( nome, loja_oficial ),
  historico_precos ( preco, registrado_em )
`;

// Mesma coisa, mas com "categorias!inner" — necessário sempre que
// for filtrar por categorias.slug (o Supabase exige o hint !inner
// pra poder filtrar por uma coluna de tabela relacionada).
const CAMPOS_PRODUTO_FILTRO_CATEGORIA = CAMPOS_PRODUTO.replace(
  'categorias ( slug )',
  'categorias!inner ( slug )'
);

// Linha crua que volta do Supabase pra esse SELECT.
interface ProdutoRow {
  id: string;
  nome: string;
  imagem_principal_url: string | null;
  preco_atual: number;
  preco_antigo: number | null;
  desconto_percentual: number | null;
  drop_score: number | null;
  classificacao_score: string | null;
  frete_gratis: boolean | null;
  quantidade_vendida: number | null;
  avaliacao: number | null;
  link_afiliado: string;
  cupom_id: string | null;
  importado_em: string;
  categorias: { slug: string } | null;
  lojas: { nome: string; loja_oficial: boolean } | null;
  historico_precos: { preco: number; registrado_em: string }[] | null;
}

const IMAGEM_PADRAO = 'https://placehold.co/600x600/16161a/9a9aa2?text=Sem+imagem';

function mapearProduto(row: ProdutoRow): Produto {
  const historicoOrdenado = (row.historico_precos ?? [])
    .slice()
    .sort((a, b) => a.registrado_em.localeCompare(b.registrado_em))
    .map((h) => Number(h.preco));

  // Sparkline/gráfico precisam de pelo menos 2 pontos pra não
  // quebrar (divisão por zero com só 1 ponto).
  const historico90d =
    historicoOrdenado.length >= 2
      ? historicoOrdenado
      : [Number(row.preco_atual), Number(row.preco_atual)];

  const classificacoesValidas = ['Excelente', 'Boa', 'Regular', 'Ruim'] as const;
  const classificacao = classificacoesValidas.includes(row.classificacao_score as any)
    ? (row.classificacao_score as Produto['classificacao'])
    : 'Regular';

  return {
    id: row.id,
    nome: row.nome,
    imagemUrl: row.imagem_principal_url || IMAGEM_PADRAO,
    precoAtual: Number(row.preco_atual),
    precoAntigo: row.preco_antigo !== null ? Number(row.preco_antigo) : null,
    dropScore: Number(row.drop_score ?? 0),
    classificacao,
    lojaNome: row.lojas?.nome ?? 'Loja Shopee',
    lojaOficial: row.lojas?.loja_oficial ?? false,
    freteGratis: row.frete_gratis ?? false,
    temCupom: !!row.cupom_id,
    quantidadeVendida: row.quantidade_vendida ?? 0,
    avaliacao: Number(row.avaliacao ?? 0),
    categoriaSlug: row.categorias?.slug ?? '',
    historico90d,
    linkAfiliado: row.link_afiliado,
    importadoEm: row.importado_em,
  };
}

// --- Categorias ---

// Só traz categorias que têm pelo menos uma oferta aprovada — evita chip
// de categoria vazia que leva pra uma página sem produto nenhum. O join
// "produtos!inner" já restringe às categorias com pelo menos 1 produto
// visível (a RLS de produtos, aprovado+ativo, se aplica aqui também), e
// aproveitamos o array embutido pra contar quantos produtos tem em cada uma.
export async function buscarCategorias(): Promise<Categoria[]> {
  const { data, error } = await supabase
    .from('categorias')
    .select('id, nome, slug, produtos!inner(id)')
    .eq('ativa', true)
    .order('ordem', { ascending: true });

  if (error) {
    console.error('Erro ao buscar categorias:', error.message);
    return [];
  }

  return (data ?? []).map(({ id, nome, slug, produtos }) => ({
    id,
    nome,
    slug,
    quantidadeProdutos: Array.isArray(produtos) ? produtos.length : 0,
  }));
}

// --- Listagens de produto ---

export async function buscarTopOfertas(limite = 12): Promise<Produto[]> {
  const { data, error } = await supabase
    .from('produtos')
    .select(CAMPOS_PRODUTO)
    .order('drop_score', { ascending: false })
    .limit(limite);

  if (error) {
    console.error('Erro ao buscar top ofertas:', error.message);
    return [];
  }

  return (data ?? []).map(mapearProduto as any);
}

// Página "/produtos" (ver todos) — mesmo critério do Top Ofertas da home
// (drop_score, maior relevância primeiro), só que sem limite curto.
export async function buscarTodosPorScore(limite = 60): Promise<Produto[]> {
  const { data, error } = await supabase
    .from('produtos')
    .select(CAMPOS_PRODUTO)
    .order('drop_score', { ascending: false })
    .limit(limite);

  if (error) {
    console.error('Erro ao buscar todos os produtos:', error.message);
    return [];
  }

  return (data ?? []).map(mapearProduto as any);
}

// Heurística temporária pro Flash Deals: produtos classificados como
// "Excelente". Quando existir uma coluna própria de destaque (ex.:
// "em_destaque"), trocar o filtro abaixo por ela.
export async function buscarFlashDeals(limite = 4): Promise<Produto[]> {
  const { data, error } = await supabase
    .from('produtos')
    .select(CAMPOS_PRODUTO)
    .eq('classificacao_score', 'Excelente')
    .order('drop_score', { ascending: false })
    .limit(limite);

  if (error) {
    console.error('Erro ao buscar flash deals:', error.message);
    return [];
  }

  return (data ?? []).map(mapearProduto as any);
}

export async function buscarUltimasQuedas(limite = 3): Promise<Produto[]> {
  const { data, error } = await supabase
    .from('produtos')
    .select(CAMPOS_PRODUTO)
    .gt('desconto_percentual', 0)
    .order('atualizado_em', { ascending: false })
    .limit(limite);

  if (error) {
    console.error('Erro ao buscar últimas quedas de preço:', error.message);
    return [];
  }

  return (data ?? []).map(mapearProduto as any);
}

// Os 3 produtos com maior desconto de toda a plataforma — usado no
// quadro ao lado do texto de abertura da home.
export async function buscarTop3MaioresDescontos(): Promise<Produto[]> {
  const { data, error } = await supabase
    .from('produtos')
    .select(CAMPOS_PRODUTO)
    .order('desconto_percentual', { ascending: false })
    .limit(3);

  if (error) {
    console.error('Erro ao buscar top 3 maiores descontos:', error.message);
    return [];
  }

  return (data ?? []).map(mapearProduto as any);
}

// Ranking por desconto (página /ranking). "dia" é o catálogo aprovado
// atual ordenado por desconto; "mes" restringe a produtos com preço
// checado nos últimos 30 dias (exclui anúncio parado/desatualizado).
// OBS: isso ainda não é um snapshot histórico de verdade — quando o job
// que popula "ranking_diario" existir, dá pra trocar por dados reais
// de dia/mês em vez de recalcular o catálogo atual toda vez.
export async function buscarRankingPorDesconto(
  periodo: 'dia' | 'mes' = 'dia',
  limite = 20
): Promise<Produto[]> {
  const base = supabase.from('produtos').select(CAMPOS_PRODUTO);

  const comFiltro =
    periodo === 'mes'
      ? base.gte('atualizado_em', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      : base;

  const { data, error } = await comFiltro
    .order('desconto_percentual', { ascending: false })
    .limit(limite);

  if (error) {
    console.error('Erro ao buscar ranking por desconto:', error.message);
    return [];
  }

  return (data ?? []).map(mapearProduto as any);
}

export async function buscarProdutosPorCategoria(slug: string, limite = 24): Promise<Produto[]> {
  const { data, error } = await supabase
    .from('produtos')
    .select(CAMPOS_PRODUTO_FILTRO_CATEGORIA)
    .eq('categorias.slug', slug)
    .order('drop_score', { ascending: false })
    .limit(limite);

  if (error) {
    console.error('Erro ao buscar produtos da categoria:', error.message);
    return [];
  }

  return (data ?? []).map(mapearProduto as any);
}

export async function buscarProdutoPorId(id: string): Promise<Produto | null> {
  const { data, error } = await supabase
    .from('produtos')
    .select(CAMPOS_PRODUTO)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Erro ao buscar produto por id:', error.message);
    return null;
  }

  return data ? mapearProduto(data as any) : null;
}

export async function buscarSemelhantes(
  categoriaSlug: string,
  excluirId: string,
  limite = 4
): Promise<Produto[]> {
  if (!categoriaSlug) return [];

  const { data, error } = await supabase
    .from('produtos')
    .select(CAMPOS_PRODUTO_FILTRO_CATEGORIA)
    .eq('categorias.slug', categoriaSlug)
    .neq('id', excluirId)
    .order('drop_score', { ascending: false })
    .limit(limite);

  if (error) {
    console.error('Erro ao buscar produtos semelhantes:', error.message);
    return [];
  }

  return (data ?? []).map(mapearProduto as any);
}

// Busca por nome (barra de pesquisa da Navbar). Usa ilike, que aproveita
// o índice gin_trgm já criado em produtos.nome (ver 0001_init.sql).
export async function buscarProdutosPorNome(termo: string, limite = 30): Promise<Produto[]> {
  const termoLimpo = termo.trim();
  if (!termoLimpo) return [];

  const { data, error } = await supabase
    .from('produtos')
    .select(CAMPOS_PRODUTO)
    .ilike('nome', `%${termoLimpo}%`)
    .order('drop_score', { ascending: false })
    .limit(limite);

  if (error) {
    console.error('Erro ao buscar produtos por nome:', error.message);
    return [];
  }

  return (data ?? []).map(mapearProduto as any);
}

// Usado na página de Favoritos (que guarda só os ids no localStorage
// do navegador e precisa buscar os dados completos desses produtos).
export async function buscarProdutosPorIds(ids: string[]): Promise<Produto[]> {
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from('produtos')
    .select(CAMPOS_PRODUTO)
    .in('id', ids);

  if (error) {
    console.error('Erro ao buscar produtos favoritados:', error.message);
    return [];
  }

  return (data ?? []).map(mapearProduto as any);
}
