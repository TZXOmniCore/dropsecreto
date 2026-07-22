# Drop Secreto — Frontend

Scaffold inicial em Next.js (App Router) + TypeScript + TailwindCSS + Framer Motion,
seguindo a identidade visual definida no brief: fundo escuro, acento verde (#00E676),
glassmorphism discreto.

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha as chaves do Supabase
npm run dev
```

## O que já está aqui

- `app/page.tsx` — Página Inicial: hero de assinatura (o "scanner" que separa
  promoção real de inflada), faixa de confiança, categorias, Top Ofertas,
  Flash Deals com contagem regressiva e Ranking do Dia
- `components/ProductCard.tsx` — card com badge de Drop Score, sparkline de
  histórico de preço e selos (loja oficial / frete grátis / cupom)
- `lib/mock-data.ts` — dados de exemplo. Troque pelas consultas reais via
  `lib/supabase.ts` assim que o banco (`drop_secreto_schema.sql`) e o
  importador estiverem populando a tabela `produtos`
- `tailwind.config.ts` — sistema de tokens (cor, tipografia) derivado do brief

## Próximos passos sugeridos

- Substituir `PRODUTOS_MOCK` por uma consulta Supabase (`select * from produtos
  where status = 'aprovado' order by drop_score desc`)
- Página de produto individual (`app/produto/[slug]/page.tsx`) com o gráfico
  completo de histórico de preço
- Painel admin (`app/admin`)
