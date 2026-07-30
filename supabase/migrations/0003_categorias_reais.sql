-- ============================================================
-- Insere as categorias reais no banco.
--
-- Causa raiz do bug "só aparece Outros": a tabela `categorias` tinha só a
-- estrutura criada (migration 0001) e a categoria coringa "Outros"
-- (migration 0002) — nenhuma das 16 categorias reais, que o classificador
-- de supabase/functions/importar-feed-shopee/index.ts (PALAVRAS_CHAVE_CATEGORIA)
-- já sabe reconhecer pelo nome do produto, tinha sido inserida de verdade
-- no banco. Resultado: a busca por slug (categoriasIdPorSlug) sempre
-- falhava e todo produto ficava sem categoria vinculada.
--
-- Os slugs abaixo têm que bater exatamente com os usados em
-- PALAVRAS_CHAVE_CATEGORIA e em lib/category-clusters.ts (MAPA_GRUPOS) —
-- são os mesmos 16 nichos já cadastrados nos dois lugares.
-- ============================================================

insert into categorias (nome, slug, ordem) values
  ('Celulares',     'celulares',    10),
  ('SSD',           'ssd',          20),
  ('Memória RAM',   'memoria-ram',  30),
  ('Notebook',      'notebook',     40),
  ('Monitor',       'monitor',      50),
  ('Gamer',         'gamer',        60),
  ('Informática',   'informatica',  70),
  ('Ferramentas',   'ferramentas',  80),
  ('Cozinha',       'cozinha',      90),
  ('Casa',          'casa',         100),
  ('Beleza',        'beleza',       110),
  ('Moda',          'moda',         120),
  ('Carro',         'carro',        130),
  ('Pets',          'pets',         140),
  ('Crianças',      'criancas',     150),
  ('Smart Home',    'smart-home',   160)
on conflict (slug) do nothing;
