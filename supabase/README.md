# Drop Secreto — Supabase

## Estrutura

```
supabase/
├── migrations/
│   └── 0001_init.sql          # schema completo (tabelas, triggers, RLS)
└── functions/
    ├── _shared/
    │   └── drop-score-engine.ts    # lógica de pontuação, importada pelas functions
    ├── importar-feed-shopee/       # busca o feed da Shopee e grava produtos "pendente"
    └── calcular-drop-score/        # roda o motor sobre os produtos "pendente"
```

## Opção 1 — com a Supabase CLI (recomendado)

```bash
npm install -g supabase
supabase login
supabase link --project-ref <seu-project-ref>

# aplica o schema
supabase db push

# publica as duas Edge Functions
supabase functions deploy importar-feed-shopee
supabase functions deploy calcular-drop-score

# variáveis de ambiente que as functions precisam (não commitar valores reais)
supabase secrets set SHOPEE_APP_ID=xxx SHOPEE_SECRET=xxx
```

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já ficam disponíveis automaticamente
dentro de toda Edge Function publicada — não precisa configurá-las à mão.

## Opção 2 — sem instalar nada (pelo dashboard)

1. Abra o projeto no [supabase.com](https://supabase.com/dashboard) → **SQL Editor**
   → cole o conteúdo de `migrations/0001_init.sql` → Run.
2. Vá em **Edge Functions** → **Deploy a new function** → cole o conteúdo de
   `functions/importar-feed-shopee/index.ts` (repita para `calcular-drop-score`).
   Nesse caminho você precisa colar o conteúdo de `_shared/drop-score-engine.ts`
   dentro do próprio arquivo da function, já que o dashboard não lê pastas `_shared`.
3. Em **Settings → Edge Functions → Secrets**, adicione `SHOPEE_APP_ID` e `SHOPEE_SECRET`.

## Agendamento

Depois de publicadas, agende as duas funções para rodar periodicamente em
**Edge Functions → sua função → Schedules** (ex.: `importar-feed-shopee` a cada
1h, `calcular-drop-score` logo em seguida).
