# Checklist antes de divulgar o site

O projeto não tem testes automatizados, então esse roteiro manual faz esse
papel por enquanto — rodar depois de subir estas mudanças e antes de
divulgar o link em qualquer canal.

## Backend (Supabase)

- [ ] Rodar a migração nova (`0003_categorias_reais.sql`) no banco
- [ ] Rodar `importar-feed-shopee` de novo depois da migração e conferir que
      os produtos importados agora saem com `categoria_id` preenchido (não
      nulo) — antes ia tudo pra "Outros"
- [ ] Rodar `calcular-drop-score` e comparar: produtos recém-importados
      (sem histórico de preço ainda) não devem mais cair automaticamente
      pra pontuação mínima só por serem novos
- [ ] Copiar o conteúdo de `supabase/functions/_shared/drop-score-engine.ts`
      pra dentro de `supabase/functions/calcular-drop-score/index.ts` (ou
      migrar o deploy pra CLI) se editar o motor de novo — os dois arquivos
      precisam continuar iguais manualmente enquanto o deploy for pela
      Dashboard

## Frontend — telas principais

- [ ] Home, `/produtos`, `/categoria/[slug]`, `/favoritos`, `/busca`: no
      celular, produtos aparecendo 2 por linha (não mais 1 por linha)
- [ ] `/categorias`: categorias reais aparecendo agrupadas por tema (não só
      "Outros")
- [ ] `/como-funciona`: texto não menciona mais "90 dias" fixo
- [ ] Home (hero) e listagem: texto não menciona mais "90 dias" fixo
- [ ] `/privacidade`: página abre e o link aparece no rodapé
- [ ] Conferir em pelo menos um celular Android e um iPhone de verdade (não
      só redimensionando o navegador do computador)

## Antes de divulgar em escala

- [ ] Conferir os limites do plano gratuito do Supabase (linhas de banco,
      invocações de function, banda) — se o lançamento viralizar, é melhor
      saber esse teto antes
- [ ] Preencher o e-mail de contato real em `/privacidade` (está com
      placeholder)
