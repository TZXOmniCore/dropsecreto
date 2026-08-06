-- ============================================================
-- DROP SECRETO — 0006: rotação de sortType no importador +
-- suporte à reclassificação de categoria por função separada
--
-- CONTEXTO (por que essas colunas):
--
-- 1) sort_type em import_estado: a Shopee Affiliate API tem um teto real
--    de profundidade de paginação (o importador já usa LIMITE_POR_PAGINA
--    = 50 por confirmar isso com a própria API) — depois de um certo
--    número de páginas ela para de devolver "hasNextPage" mesmo se o
--    catálogo total for maior. Como o importador sempre pedia a mesma
--    ordenação (sortType 2 = mais vendidos), ele ficava girando sempre
--    na MESMA fatia de produtos — nunca alcançava o resto do catálogo.
--    Agora o importador guarda também qual sortType está usando e alterna
--    pra um diferente toda vez que fecha um ciclo de páginas, então cada
--    volta traz uma fatia diferente do catálogo (por vendas, relevância,
--    comissão, preço). Ver supabase/functions/importar-feed-shopee/index.ts.
--
-- 2) categoria_revisada_em e shopee_cat_ids em produtos: a nova function
--    reclassificar-categorias roda separada da importação e revisita
--    produtos com categoria_id nula ou jogados em "outros", tentando
--    reclassificar pelo nome. categoria_revisada_em é a fila própria dela
--    (produto mais antigo revisado primeiro) — separada de atualizado_em,
--    que é a fila de atualizar-produtos-existentes (preço), pra uma
--    função não atropelar a fila da outra. shopee_cat_ids guarda o
--    productCatIds bruto que a Shopee manda — não é usado pra classificar
--    ainda (o mapeamento de categoryId da Shopee pra cada nicho não está
--    preenchido, ver MAPEAMENTO_CATEGORIAS nas functions), mas fica salvo
--    pra quando esse mapeamento for descoberto/preenchido, sem precisar
--    reimportar nada.
-- ============================================================

alter table import_estado
  add column if not exists sort_type int not null default 2;

alter table produtos
  add column if not exists shopee_cat_ids int[],
  add column if not exists categoria_revisada_em timestamptz;

-- Acelera a query de reclassificar-categorias (produtos sem categoria
-- revisada primeiro).
create index if not exists idx_produtos_categoria_revisada
  on produtos(categoria_revisada_em);

create index if not exists idx_produtos_categoria_id
  on produtos(categoria_id);
