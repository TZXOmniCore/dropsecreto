-- ============================================================
-- DROP SECRETO — 0002: tabela de estado da importação + categoria "Outros"
-- ============================================================

-- Guarda em que página do feed da Shopee a importação parou, pra função
-- importar-feed-shopee continuar de onde parou na próxima execução (cron).
-- O código de importar-feed-shopee já dependia dessa tabela, mas o SQL de
-- criação nunca tinha entrado no projeto — sem ela, a importação sempre
-- recomeçava da página 1 e nunca avançava de verdade pelo catálogo.
create table if not exists import_estado (
  id int primary key,
  proxima_pagina int not null default 1,
  atualizado_em timestamptz not null default now()
);

insert into import_estado (id, proxima_pagina)
values (1, 1)
on conflict (id) do nothing;

alter table import_estado enable row level security;
-- Tabela só de controle interno da importação — só a service role (que
-- ignora RLS) mexe nela; nenhuma policy pública é criada de propósito.

-- Categoria "coringa" pra produto cujo nome não bate com nenhuma palavra-
-- chave conhecida (ver PALAVRAS_CHAVE_CATEGORIA em importar-feed-shopee) —
-- garante que nenhum produto importado fique sem categoria, sem precisar
-- inventar productCatId da Shopee.
insert into categorias (nome, slug, ordem, ativa)
values ('Outros', 'outros', 999, true)
on conflict (slug) do nothing;
