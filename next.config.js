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
          // Impede o navegador de "adivinhar" o tipo de um arquivo servido
          // com Content-Type errado.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Não manda a URL completa de origem pra terceiros ao clicar num
          // link externo (ex.: pro link de afiliado da Shopee).
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Desliga recursos do navegador que o site não usa e que, se mal
          // configurados por engano no futuro, virariam risco de privacidade.
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // Content-Security-Policy: só permite carregar script/estilo/
          // imagem/conexão dos domínios que o site de fato usa (analytics,
          // monitoramento de erro e imagens da Shopee inclusos). Se um
          // domínio novo for adicionado depois (outro analytics, por
          // exemplo), precisa entrar aqui também, senão o navegador bloqueia.
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.clarity.ms https://*.ingest.sentry.io https://*.ingest.us.sentry.io",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co https://www.google-analytics.com https://www.clarity.ms https://*.ingest.sentry.io https://*.ingest.us.sentry.io",
              "frame-ancestors 'self'",
            ].join('; '),
          },
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
