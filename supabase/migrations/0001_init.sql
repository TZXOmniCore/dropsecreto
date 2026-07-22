-- ============================================================
-- DROP SECRETO — Schema inicial do banco de dados (Supabase/PostgreSQL)
-- ============================================================

-- Extensões necessárias
create extension if not exists "uuid-ossp";
create extension if not exists pg_trgm;

-- ============================================================
-- CATEGORIAS
-- ============================================================
create table categorias (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  slug text not null unique,
  categoria_pai_id uuid references categorias(id) on delete set null,
  icone text,
  ordem int default 0,
  ativa boolean default true,
  criado_em timestamptz not null default now()
);

create index idx_categorias_pai on categorias(categoria_pai_id);

-- ============================================================
-- LOJAS
-- ============================================================
create table lojas (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  slug text unique,
  shopee_shop_id bigint unique,
  loja_oficial boolean default false,
  avaliacao_media numeric(3,2) default 0,
  confiabilidade_score numeric(5,2) default 0, -- calculado pelo motor inteligente
  total_produtos int default 0,
  logo_url text,
  suspeita boolean default false, -- flag de loja suspeita
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index idx_lojas_confiabilidade on lojas(confiabilidade_score desc);

-- ============================================================
-- CUPONS
-- ============================================================
create table cupons (
  id uuid primary key default uuid_generate_v4(),
  loja_id uuid references lojas(id) on delete cascade,
  codigo text not null,
  tipo text not null check (tipo in ('percentual','valor_fixo','frete_gratis')),
  valor numeric(10,2),
  valor_minimo_pedido numeric(10,2),
  valido_de timestamptz default now(),
  valido_ate timestamptz,
  ativo boolean default true,
  criado_em timestamptz not null default now()
);

create index idx_cupons_loja on cupons(loja_id);
create index idx_cupons_ativo on cupons(ativo) where ativo = true;

-- ============================================================
-- PRODUTOS
-- ============================================================
create table produtos (
  id uuid primary key default uuid_generate_v4(),
  shopee_item_id bigint unique,
  nome text not null,
  slug text unique,
  descricao text,
  categoria_id uuid references categorias(id) on delete set null,
  loja_id uuid references lojas(id) on delete set null,
  cupom_id uuid references cupons(id) on delete set null,

  imagem_principal_url text,
  galeria_urls text[] default '{}',

  preco_atual numeric(10,2) not null,
  preco_antigo numeric(10,2),
  desconto_percentual numeric(5,2) generated always as (
    case when preco_antigo is not null and preco_antigo > 0
      then round(((preco_antigo - preco_atual) / preco_antigo) * 100, 2)
      else 0
    end
  ) stored,

  moeda text not null default 'BRL',
  frete_gratis boolean default false,
  valor_frete numeric(10,2),

  avaliacao numeric(3,2) default 0,
  quantidade_avaliacoes int default 0,
  quantidade_vendida int default 0,

  link_afiliado text not null,
  link_original text,

  drop_score numeric(5,2) default 0,          -- 0 a 100
  classificacao_score text,                   -- Excelente / Boa / Regular / Ruim
  promocao_verificada boolean,                -- true=verdadeira, false=suspeita, null=nao analisado
  produto_viral boolean default false,
  produto_repetido_de uuid references produtos(id) on delete set null,

  status text not null default 'pendente' check (status in ('pendente','aprovado','rejeitado')),
  motivo_rejeicao text,

  ativo boolean default true,
  importado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index idx_produtos_categoria on produtos(categoria_id);
create index idx_produtos_loja on produtos(loja_id);
create index idx_produtos_score on produtos(drop_score desc);
create index idx_produtos_status on produtos(status);
create index idx_produtos_preco on produtos(preco_atual);
create index idx_produtos_busca on produtos using gin (nome gin_trgm_ops);

-- ============================================================
-- HISTÓRICO DE PREÇO
-- ============================================================
create table historico_precos (
  id uuid primary key default uuid_generate_v4(),
  produto_id uuid not null references produtos(id) on delete cascade,
  preco numeric(10,2) not null,
  registrado_em date not null default current_date
);

create unique index idx_historico_produto_dia on historico_precos(produto_id, registrado_em);
create index idx_historico_produto on historico_precos(produto_id, registrado_em desc);

-- ============================================================
-- USUÁRIOS (perfil complementar ao auth.users do Supabase)
-- ============================================================
create table perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  avatar_url text,
  criado_em timestamptz not null default now()
);

-- ============================================================
-- FAVORITOS
-- ============================================================
create table favoritos (
  id uuid primary key default uuid_generate_v4(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  produto_id uuid not null references produtos(id) on delete cascade,
  criado_em timestamptz not null default now(),
  unique (usuario_id, produto_id)
);

-- ============================================================
-- ALERTAS
-- ============================================================
create table alertas (
  id uuid primary key default uuid_generate_v4(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  produto_id uuid references produtos(id) on delete cascade,
  categoria_id uuid references categorias(id) on delete cascade,
  termo_busca text,
  preco_alvo numeric(10,2) not null,
  ativo boolean default true,
  disparado_em timestamptz,
  criado_em timestamptz not null default now()
);

create index idx_alertas_ativo on alertas(ativo) where ativo = true;

-- ============================================================
-- AVALIAÇÕES / COMENTÁRIOS
-- ============================================================
create table avaliacoes (
  id uuid primary key default uuid_generate_v4(),
  produto_id uuid not null references produtos(id) on delete cascade,
  usuario_id uuid references auth.users(id) on delete set null,
  nota int check (nota between 1 and 5),
  comentario text,
  criado_em timestamptz not null default now()
);

create index idx_avaliacoes_produto on avaliacoes(produto_id);

-- ============================================================
-- RANKING (snapshot diário)
-- ============================================================
create table ranking_diario (
  id uuid primary key default uuid_generate_v4(),
  produto_id uuid not null references produtos(id) on delete cascade,
  categoria_id uuid references categorias(id) on delete set null,
  posicao int not null,
  drop_score numeric(5,2) not null,
  registrado_em date not null default current_date
);

create index idx_ranking_dia on ranking_diario(registrado_em, categoria_id, posicao);

-- ============================================================
-- CLIQUES / CONVERSÕES / COMISSÕES (dashboard admin)
-- ============================================================
create table cliques (
  id uuid primary key default uuid_generate_v4(),
  produto_id uuid references produtos(id) on delete set null,
  usuario_id uuid references auth.users(id) on delete set null,
  origem text, -- site, telegram, whatsapp, instagram...
  criado_em timestamptz not null default now()
);

create table conversoes (
  id uuid primary key default uuid_generate_v4(),
  clique_id uuid references cliques(id) on delete set null,
  produto_id uuid references produtos(id) on delete set null,
  valor_pedido numeric(10,2),
  comissao numeric(10,2),
  status text default 'pendente', -- pendente/aprovada/cancelada
  criado_em timestamptz not null default now()
);

-- ============================================================
-- LOGS DE IMPORTAÇÃO (dashboard admin)
-- ============================================================
create table logs_importacao (
  id uuid primary key default uuid_generate_v4(),
  fonte text not null default 'shopee_feed',
  produtos_importados int default 0,
  produtos_aprovados int default 0,
  produtos_rejeitados int default 0,
  erro text,
  iniciado_em timestamptz not null default now(),
  finalizado_em timestamptz
);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Atualiza "atualizado_em" automaticamente
create or replace function trg_atualiza_timestamp()
returns trigger as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$ language plpgsql;

create trigger set_produtos_atualizado_em
before update on produtos
for each row execute function trg_atualiza_timestamp();

-- Registra o preço no histórico automaticamente (1 registro por produto/dia)
create or replace function trg_registra_historico_preco()
returns trigger as $$
begin
  insert into historico_precos (produto_id, preco, registrado_em)
  values (new.id, new.preco_atual, current_date)
  on conflict (produto_id, registrado_em)
  do update set preco = excluded.preco;
  return new;
end;
$$ language plpgsql;

create trigger produtos_historico_preco
after insert or update of preco_atual on produtos
for each row execute function trg_registra_historico_preco();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table produtos enable row level security;
alter table categorias enable row level security;
alter table lojas enable row level security;
alter table cupons enable row level security;
alter table historico_precos enable row level security;
alter table ranking_diario enable row level security;
alter table avaliacoes enable row level security;
alter table perfis enable row level security;
alter table favoritos enable row level security;
alter table alertas enable row level security;

-- Leitura pública dos dados de vitrine
create policy "Leitura publica de produtos aprovados"
  on produtos for select
  using (status = 'aprovado' and ativo = true);

create policy "Leitura publica de categorias"
  on categorias for select using (true);

create policy "Leitura publica de lojas"
  on lojas for select using (true);

create policy "Leitura publica de cupons ativos"
  on cupons for select using (ativo = true);

create policy "Leitura publica de historico de preco"
  on historico_precos for select using (true);

create policy "Leitura publica de ranking"
  on ranking_diario for select using (true);

create policy "Leitura publica de avaliacoes"
  on avaliacoes for select using (true);

-- Dados privados do usuário
create policy "Usuario ve seu proprio perfil"
  on perfis for select using (auth.uid() = id);
create policy "Usuario edita seu proprio perfil"
  on perfis for update using (auth.uid() = id);

create policy "Usuario gerencia seus favoritos"
  on favoritos for all using (auth.uid() = usuario_id);

create policy "Usuario gerencia seus alertas"
  on alertas for all using (auth.uid() = usuario_id);

create policy "Usuario cria avaliacao autenticado"
  on avaliacoes for insert with check (auth.uid() = usuario_id);

-- Observação: o importador do feed, o motor de Drop Score e o painel admin
-- devem usar a Service Role Key do Supabase (que ignora RLS).
-- Nunca exponha essa chave no frontend.
