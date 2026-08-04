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
  // Passthrough puro: sempre busca da rede, sem nenhum fallback.
  //
  // CORREÇÃO: antes tinha um .catch(() => caches.match(event.request))
  // aqui. Como esse service worker nunca guarda nada em cache (é de
  // propósito, ver comentário acima), esse "plano B" sempre devolvia
  // undefined em vez de uma resposta de verdade — e isso quebrava a
  // navegação inteira (ex.: clicar em "Comprar na loja", ou entrar em
  // qualquer página de produto), fazendo o navegador simplesmente
  // desistir e voltar pra página anterior. Sem esse fallback quebrado,
  // se a rede falhar de verdade o navegador mostra o próprio aviso
  // padrão de "sem conexão" — bem melhor do que travar a navegação.
  event.respondWith(fetch(event.request));
});
