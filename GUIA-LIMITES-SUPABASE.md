# Limites do plano gratuito do Supabase (2026)

Não tenho acesso à sua conta, então não consigo checar o uso real —
mas aqui vai o que o plano gratuito permite hoje e onde ver o seu uso
atual.

## O que o plano grátis permite (2026)

- **500 MB** de banco de dados (Postgres)
- **1 GB** de armazenamento de arquivo
- **5 GB** de tráfego de saída (egress) por mês
- **50.000** usuários ativos mensais (não é o seu caso hoje, já que o
  site não usa login — praticamente não vai bater nesse limite)
- **500.000** invocações de Edge Function por mês
- **200** conexões simultâneas de Realtime
- **2** projetos ativos ao mesmo tempo

## O que mais importa pro Drop Secreto especificamente

1. **Pausa automática por inatividade.** Se o projeto passar **7 dias
   sem nenhuma chamada de API**, o Supabase pausa ele sozinho — o site
   fica fora do ar até alguém reativar manualmente pela Dashboard. Como
   o Drop Secreto já tem funções rodando em cron (importação, cálculo de
   score, atualização de preço), isso tende a manter o projeto "vivo"
   sozinho — mas vale confirmar que o cron está mesmo configurado e
   rodando com essa frequência.
2. **Tráfego de saída (5 GB/mês)** é o mais fácil de estourar se o
   site viralizar, porque toda imagem de produto servida conta nisso.
   Se posível, prefira imagem vindo direto da CDN da Shopee (como já é
   o caso) — imagem servida pelo Supabase Storage consome muito mais
   rápido essa cota.
3. **Sem backup automático** no plano grátis — se quiser essa segurança,
   é configuração manual à parte (ex.: rotina exportando o banco
   periodicamente).

## Onde ver o uso real da sua conta

Dashboard do Supabase → selecionar o projeto → **Settings → Usage** —
mostra o consumo atual de cada item acima, atualizado quase em tempo
real.

## Quando vale considerar o plano pago (US$ 25/mês)

Se o site aproximar de qualquer um desses números, ou se a pausa
automática de 7 dias virar um risco real (por exemplo, período de baixo
tráfego entre campanhas de marketing), o plano Pro remove a pausa
automática e aumenta as cotas.
