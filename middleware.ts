import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ============================================================
// Gera um nonce novo a cada requisição e monta a Content-Security-Policy
// aqui (em vez de em next.config.js) porque um nonce só funciona se for
// único por requisição — um valor fixo no next.config.js seria a mesma
// string sempre, o que anula a proteção (quem quisesse burlar só
// precisaria descobrir esse valor uma vez).
//
// Antes, script-src usava 'unsafe-inline' pra permitir os snippets
// inline do GA/Clarity em components/Analytics.tsx. Com o nonce, esses
// <Script> passam a declarar nonce={nonce} (ver Analytics.tsx e
// app/layout.tsx) e o navegador só executa scripts inline que carreguem
// o nonce certo — bloqueia qualquer outro script inline injetado (ex.:
// por uma falha de XSS futura), mesmo que 'unsafe-inline' não esteja
// mais na lista.
//
// style-src continua com 'unsafe-inline' de propósito: o Next.js/Tailwind
// e o Framer Motion aplicam estilo inline em vários pontos, e o risco de
// injeção via CSS é bem menor que via script — não vale o esforço de
// nonce pra estilo agora.
// ============================================================

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://www.googletagmanager.com https://www.clarity.ms https://*.clarity.ms https://c.bing.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com https://www.clarity.ms https://*.clarity.ms https://c.bing.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io",
    "frame-ancestors 'self'",
  ].join('; ');

  // Repassa o nonce pro Server Component ler via headers() (next/headers)
  // e passar pro Analytics — é assim que o valor chega até o <Script>.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    // Roda em toda rota, exceto assets estáticos do Next e o service
    // worker/manifest (esses não renderizam HTML, não precisam de CSP
    // por nonce e não ganham nada rodando o middleware em cima deles).
    '/((?!_next/static|_next/image|favicon|icon-|apple-touch-icon|manifest.json|sw.js).*)',
  ],
};
