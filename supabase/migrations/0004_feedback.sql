-- Canal de feedback simples: qualquer pessoa pode enviar (sem login,
-- sem e-mail), mas ninguém consegue LER pela chave pública — só quem
-- acessa o banco pela Dashboard do Supabase (ou com a Service Role Key)
-- consegue ver as mensagens. Isso evita expor feedback de um usuário
-- pros outros usuários do site.
create table feedback (
  id uuid primary key default uuid_generate_v4(),
  tipo text not null check (tipo in ('oferta_errada', 'sugestao', 'bug', 'outro')),
  mensagem text not null,
  produto_id uuid references produtos(id) on delete set null,
  pagina_url text,
  criado_em timestamptz not null default now(),
  lido boolean default false
);

alter table feedback enable row level security;

create policy "Qualquer um pode enviar feedback"
  on feedback for insert
  with check (true);

-- Sem policy de select pública de propósito — leitura só pela Dashboard
-- do Supabase ou com a Service Role Key.
