# Drop Secreto — Supabase

## Estrutura

```
supabase/
├── migrations/
│   ├── 0001_init.sql                              # schema completo (tabelas, triggers, RLS)
│   ├── 0002_import_estado_e_categoria_outros.sql  # tabela de estado da paginação + categoria "outros"
│   ├── 0003_categorias_reais.sql                  # insere as 16 categorias reais
│   ├── 0004_feedback.sql                          # tabela de feedback do site
│   ├── 0005_seguranca_rls_e_constraints.sql       # RLS em cliques/conversoes/logs_importacao
│   └── 0006_rotacao_sort_type_e_reclassificacao.sql # rotação de sortType + fila de reclassificação
└── functions/
    ├── _shared/
    │   ├── drop-score-engine.ts       # lógica de pontuação — fonte de verdade (ver nota abaixo)
    │   └── categoria-classifier.ts    # classificador por palavra-chave — fonte de verdade
    ├── importar-feed-shopee/          # descobre produto novo, 1 página do feed por invocação
    ├── atualizar-produtos-existentes/ # mantém preço/venda/nota em dia dos produtos já aprovados
    ├── calcular-drop-score/           # roda o motor sobre os produtos "pendente"
    └── reclassificar-categorias/      # revisa produto sem categoria ou jogado em "outros"
```

Os arquivos em `_shared/` só são de fato IMPORTADOS se o deploy for feito pela
CLI (Opção 1). Pela Dashboard (Opção 2), cada uma das 4 functions tem sua
PRÓPRIA cópia colada dentro do `index.ts` — o dashboard não empacota pastas
`_shared`. Se um dia mudar peso do Drop Score, limiar de nota, ou a lista de
palavras-chave de categoria, muda no arquivo `_shared/` **e** em toda cópia
correspondente (comentário no topo de cada `index.ts` avisa onde).

## Opção 1 — com a Supabase CLI (recomendado)

```bash
npm install -g supabase
supabase login
supabase link --project-ref <seu-project-ref>

# aplica o schema (roda as migrations que ainda não rodaram, em ordem)
supabase db push

# publica as 4 Edge Functions
supabase functions deploy importar-feed-shopee
supabase functions deploy atualizar-produtos-existentes
supabase functions deploy calcular-drop-score
supabase functions deploy reclassificar-categorias

# variáveis de ambiente que as functions precisam (não commitar valores reais)
supabase secrets set SHOPEE_APP_ID=xxx SHOPEE_SECRET=xxx
```

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já ficam disponíveis automaticamente
dentro de toda Edge Function publicada — não precisa configurá-las à mão.

## Opção 2 — sem instalar nada (pelo dashboard)

1. Abra o projeto no [supabase.com](https://supabase.com/dashboard) → **SQL Editor**
   → cole o conteúdo de `migrations/0006_rotacao_sort_type_e_reclassificacao.sql`
   → Run. (As migrations 0001 a 0005 só precisam ser rodadas uma vez, na
   primeira vez que o projeto for configurado — se elas já rodaram antes,
   rodar de novo não quebra nada, é só `create table if not exists` /
   `add column if not exists`, mas não é necessário repetir.)
2. Vá em **Edge Functions** → na function `importar-feed-shopee`, substitua o
   código pelo conteúdo de `functions/importar-feed-shopee/index.ts` deste
   pacote (já vem com a cópia do classificador embutida, não precisa colar
   mais nada). Repita para `calcular-drop-score`.
3. **Nova function:** em **Edge Functions** → **Deploy a new function** →
   nomeie `reclassificar-categorias` → cole o conteúdo de
   `functions/reclassificar-categorias/index.ts`.
4. Em **Settings → Edge Functions → Secrets**, confirme que `SHOPEE_APP_ID` e
   `SHOPEE_SECRET` já estão configurados (a `reclassificar-categorias` não
   precisa delas — só `atualizar-produtos-existentes`, `importar-feed-shopee`
   e a busca de nota de loja usam a API da Shopee).

## Agendamento

Depois de publicadas, agende as 4 funções em
**Edge Functions → sua função → Schedules**:

| Function                       | Frequência sugerida | Por quê                                                    |
| ------------------------------- | -------------------- | ------------------------------------------------------------ |
| `importar-feed-shopee`          | a cada 1–2 min        | 1 página por invocação — quanto mais frequente, mais rápido cobre o catálogo |
| `atualizar-produtos-existentes` | a cada 1 min          | mantém preço/venda/nota em dia dos produtos já publicados     |
| `calcular-drop-score`           | a cada 2–3 min        | processa o backlog de "pendente" deixado pelo importador      |
| `reclassificar-categorias`      | a cada 10–15 min      | não é urgente — só limpa produto que ficou em "outros"        |
