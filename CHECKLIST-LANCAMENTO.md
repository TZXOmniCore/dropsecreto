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

## Frontend — segunda leva (personalização, filtros, carrossel, etc.)

- [ ] Configurar `NEXT_PUBLIC_SITE_URL` com o domínio real assim que for
      comprado (hoje está com um placeholder em `lib/site.ts`) — afeta o
      link de compartilhar, o schema.org e o sitemap
- [ ] Home: recarregar a página 2-3 vezes e conferir que os produtos da
      vitrine mudam (não são sempre os mesmos 12)
- [ ] Clicar em alguns produtos de uma mesma categoria (ex.: 3 produtos de
      "gamer"), depois voltar pra home e pra busca — conferir que
      produtos desse grupo aparecem com mais destaque
- [ ] `/produtos` e `/busca`: testar os filtros (desconto mínimo, faixa de
      preço, ordenar por menor preço/maior desconto/avaliação) e o botão
      de alternar grade/lista
- [ ] No mobile, abrir o painel de filtros (botão "Filtros") e conferir
      que abre de baixo pra cima e fecha certo
- [ ] Home: conferir que o carrossel de "últimas quedas de preço" passa
      sozinho e pausa ao tocar/passar o mouse
- [ ] Botão de compartilhar na página de produto — testar no celular (deve
      abrir o menu nativo) e no computador (deve abrir o WhatsApp Web)
- [ ] Abrir um produto removido/inexistente e conferir que aparece uma
      lista de sugestões, não só uma mensagem seca
- [ ] Conferir que o selo "novo" aparece em produto recém-importado e o
      selo "menor preço em X dias" aparece quando for o caso
- [ ] `next.config.js`: se as imagens da Shopee vierem de um subdomínio
      diferente dos já cadastrados, adicionar em `remotePatterns`
- [ ] `/melhores-da-semana` e `/sitemap.xml` abrindo sem erro

## Terceira leva (analytics, segurança, jurídico, feedback)

- [ ] Rodar a migração nova (`0004_feedback.sql`) no banco
- [ ] Criar conta grátis no Google Analytics (analytics.google.com),
      pegar o ID de medição (G-XXXXXXXXXX) e configurar
      `NEXT_PUBLIC_GA_ID`
- [ ] Criar conta grátis no Microsoft Clarity (clarity.microsoft.com),
      pegar o Project ID e configurar `NEXT_PUBLIC_CLARITY_ID`
- [ ] Criar conta grátis no Sentry (sentry.io), criar um projeto Next.js,
      pegar o DSN e configurar `NEXT_PUBLIC_SENTRY_DSN`
- [ ] Configurar `NEXT_PUBLIC_SITE_URL` com o domínio real
- [ ] Rodar `npm test` e conferir que os 16 testes automatizados passam
- [ ] Testar o botão "Dar feedback" no rodapé (enviar uma mensagem de
      teste e conferir que aparece na tabela `feedback` do Supabase)
- [ ] Ler a página `/privacidade` inteira de novo — agora tem seção de
      termos de uso e aviso de menor de idade novos
- [ ] Conferir `/robots.txt` abrindo sem erro
- [ ] Ler `GUIA-LIMITES-SUPABASE.md` e checar o uso atual em
      Settings → Usage no painel do Supabase
- [ ] Se possível, considerar registro de marca ("Drop Secreto") no INPI
      e providenciar CNPJ/e-mail de contato real — itens fora do que dá
      pra resolver em código

## Antes de divulgar em escala

- [ ] Conferir os limites do plano gratuito do Supabase (linhas de banco,
      invocações de function, banda) — se o lançamento viralizar, é melhor
      saber esse teto antes
- [ ] Preencher o e-mail de contato real em `/privacidade` (está com
      placeholder)
