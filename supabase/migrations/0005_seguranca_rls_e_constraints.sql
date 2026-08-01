-- ============================================================
-- DROP SECRETO — 0005: RLS nas tabelas internas + hardening do feedback
-- ============================================================

-- cliques, conversoes e logs_importacao foram criadas em 0001_init.sql
-- mas nunca tiveram "enable row level security" em nenhuma migration —
-- ficaram de fora do bloco de RLS por descuido. Sem RLS, qualquer pessoa
-- com a chave anon (pública, usada no navegador) consegue ler e escrever
-- essas 3 tabelas livremente, incluindo dado de comissão (conversoes) e
-- volume de clique por produto.
--
-- Nenhuma policy pública é criada de propósito: cliques agora é escrita
-- pelo redirecionador /go (app/go/[id]/route.ts), e logs_importacao pelo
-- importador — os dois usam a service role key, que ignora RLS mesmo com
-- ela ligada. conversoes não tem nenhuma escrita automática ainda; fica
-- só acessível pela Dashboard/service role quando existir.
alter table cliques enable row level security;
alter table conversoes enable row level security;
alter table logs_importacao enable row level security;

-- feedback (criada em 0004_feedback.sql) já tem RLS + policy de insert
-- público, mas "mensagem text not null" e "pagina_url text" não tinham
-- limite de tamanho — qualquer um com a chave anon podia inserir uma
-- mensagem de qualquer tamanho, sem limite de frequência, o que dá
-- margem pra abuso (spam de linha, texto gigante inflando o banco).
-- Constraint apenas trava um teto folgado; não muda nada pra quem usa
-- o formulário normalmente.
alter table feedback
  add constraint feedback_mensagem_tamanho check (char_length(mensagem) <= 2000),
  add constraint feedback_pagina_url_tamanho check (pagina_url is null or char_length(pagina_url) <= 500);
