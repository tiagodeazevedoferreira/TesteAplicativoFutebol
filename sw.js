const CACHE_NAME = 'jogos-futebol-cache-v1';
const urlsToCache = [
  '/',
  '/TesteAplicativoFutebol/index.html',
  '/TesteAplicativoFutebol/style.css',
  '/TesteAplicativoFutebol/script.js',
  '/TesteAplicativoFutebol/icon.png',
  '/TesteAplicativoFutebol/manifest.json'
];

// Evento de instalação: armazena os recursos no cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto, armazenando recursos');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Erro ao armazenar recursos no cache:', error);
      })
  );
  // Força o Service Worker a ativar imediatamente
  self.skipWaiting();
});

// Evento de ativação: limpa caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
    .then(() => {
      console.log('Cache antigo limpo, Service Worker ativado');
      return self.clients.claim();
    })
    .catch(error => {
      console.error('Erro ao ativar Service Worker:', error);
    })
  );
});

// Evento de busca: responde com cache ou busca na rede
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Retorna do cache se encontrado
        if (response) {
          console.log(`Servindo ${event.request.url} do cache`);
          return response;
        }
        // Caso contrário, busca na rede
        console.log(`Buscando ${event.request.url} na rede`);
        return fetch(event.request)
          .catch(error => {
            console.error(`Erro ao buscar ${event.request.url}:`, error);
            // Opcional: retorna uma página offline personalizada
            return caches.match('/TesteAplicativoFutebol/index.html');
          });
      })
  );
});