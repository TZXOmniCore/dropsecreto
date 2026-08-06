const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.shopee.com.br' },
      { protocol: 'https', hostname: 'cf.shopee.com.br' },
      { protocol: 'https', hostname: 'placehold.co' },
    ],
  },

  // Cabeçalhos de segurança — aplicados em toda página. Não depende de
  // nenhuma conta/serviço externo, funciona assim que for publicado.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Impede o site de ser carregado dentro de um <iframe> em outro
          // domínio (proteção contra clickjacking).
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Força HTTPS em toda visita futura (inclusive digitando http://
          // na barra de endereço) por 2 anos, e em todos os subdomínios.
          // A Vercel já redireciona http->https por padrão; isso reforça
          // no próprio navegador, sem depender desse redirect a cada visita.
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
          // Impede o navegador de "adivinhar" o tipo de um arquivo servido
          // com Content-Type errado.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Não manda a URL completa de origem pra terceiros ao clicar num
          // link externo (ex.: pro link de afiliado da Shopee).
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Desliga recursos do navegador que o site não usa e que, se mal
          // configurados por engano no futuro, virariam risco de privacidade.
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // Content-Security-Policy NÃO fica aqui de propósito — ela agora é
          // montada em middleware.ts, porque precisa de um nonce diferente
          // a cada requisição (um valor fixo aqui seria sempre a mesma
          // string, o que anula a proteção do nonce). Ver middleware.ts.
        ],
      },
    ];
  },
};

// Só embrulha com o Sentry se o DSN estiver configurado — sem isso, o
// build continua 100% normal, sem tentar subir sourcemap pra conta
// nenhuma (que exigiria SENTRY_AUTH_TOKEN/org/project configurados).
module.exports = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: true,
      widenClientFileUpload: true,
      hideSourceMaps: true,
      disableLogger: true,
    })
  : nextConfig;
