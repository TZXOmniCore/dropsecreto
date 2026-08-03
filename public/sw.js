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
  // Passthrough: sempre busca da rede. Sem isso, alguns navegadores não
  // consideram o site "instalável".
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
