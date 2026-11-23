/* Service Worker de Beit Hatzirah: funcionamiento sin conexión */
const VERSION = 'bh-0.7.0';
const LIBROS = 'bh-libros-3'; // cambia este nombre cuando se actualicen los textos bíblicos
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css', 'js/books.js', 'js/aprender.js', 'js/pealim.js', 'js/audio.js', 'js/besora.js', 'js/tefilot.js', 'js/app.js',
  'img/logo.jpg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png',
  'fonts/noto-serif-hebrew-hebrew-700-normal.woff2', 'fonts/spectral-latin-400-normal.woff2', 'fonts/spectral-latin-400-italic.woff2',
  'fonts/spectral-latin-600-normal.woff2', 'fonts/spectral-latin-ext-400-normal.woff2',
  'data/parashiot.json', 'data/calendario.json', 'data/mensajes.json', 'data/moedim.json', 'data/vocabulario.json', 'data/estudios.json', 'data/aprender.json', 'data/besora.json', 'data/tefilot.json'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== LIBROS).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // Libros bíblicos: primero la copia guardada, se conservan entre versiones
  if (/\/data\/(b|es|morph|pealim)\//.test(url.pathname) || /\/data\/(lexico|lemas|h2e)\.json$/.test(url.pathname)) {
    e.respondWith(caches.open(LIBROS).then(async c => {
      const hit = await c.match(e.request); if (hit) return hit;
      const res = await fetch(e.request); if (res.ok) c.put(e.request, res.clone()); return res;
    }));
    return;
  }
  // Contenido editable (mensajes, estudios): red primero, copia guardada si no hay conexión
  if (url.pathname.includes('/data/')) {
    e.respondWith(fetch(e.request).then(res => { const cp = res.clone(); caches.open(VERSION).then(c => c.put(e.request, cp)); return res; }).catch(() => caches.match(e.request)));
    return;
  }
  // Aplicación: copia guardada primero
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).catch(() => caches.match('index.html'))));
});
