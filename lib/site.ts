// URL base do site, usada em: link de compartilhar, dados estruturados
// (schema.org) e sitemap.xml. Definir a variável de ambiente
// NEXT_PUBLIC_SITE_URL assim que o domínio for comprado — até lá, fica
// nesse placeholder (funciona local/em preview, só não é o link final
// de verdade pra mandar pra alguém).
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://dropsecreto.com.br').replace(
  /\/$/,
  ''
);
