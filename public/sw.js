// Service worker mínimo — existe só pra habilitar o "instalar app" no
// celular/desktop. Não guarda cache agressivo de propósito, porque preço e
// desconto mudam o tempo todo e uma versão em cache velha seria pior que NOSONAR
// nenhuma.
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // CORREÇÃO: só intercepta pedidos pro próprio domínio do site. Pedidos
  // pra outros domínios (Google Analytics, Microsoft Clarity, Sentry etc.)
  // passam direto pelo navegador, sem passar pelo service worker.
  //
  // Motivo: quando o service worker "recaptura" um pedido de terceiro e
  // refaz ele via fetch() de dentro de si mesmo, o navegador passa a
  // avaliar isso pela regra connect-src da Content-Security-Policy, em vez
  // da regra script-src (que é a que normalmente vale pra um <script src>
  // comum). Isso bloqueava os scripts de analytics mesmo já estando
  // liberados no script-src — e como cada ferramenta usa vários
  // subdomínios variáveis (ex.: scripts.clarity.ms, c.clarity.ms), virava
  // um jogo de gato e rato tentando liberar um por um. Não interceptando
  // terceiros, esse problema simplesmente não existe mais.
  if (url.origin !== self.location.origin) {
    return;
  }

  // Passthrough puro pro que é do próprio site: sempre busca da rede, sem
  // nenhum fallback de cache (não guardamos nada em cache, de propósito).
  event.respondWith(fetch(event.request));
});
