importScripts('js/vdd-core.js');
/* Service Worker de Beit Hatzirah: funcionamiento sin conexión */
const VERSION = 'bh-0.18.0';
const LIBROS = 'bh-libros-3'; // cambia este nombre cuando se actualicen los textos bíblicos
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css', 'js/books.js', 'js/aprender.js', 'js/pealim.js', 'js/audio.js', 'js/besora.js', 'js/tefilot.js', 'js/diccionario.js', 'js/avispa-arte.js', 'js/moreh.js', 'js/moreh-chat.js', 'js/biblioteca.js', 'js/analizador.js', 'js/academia.js', 'js/vdd-core.js', 'js/versiculo.js', 'data/versiculo.json', 'data/calendario-extra.json', 'data/biblioteca.json', 'img/moreh/body.webp', 'img/moreh/head.webp', 'img/moreh/arm.webp', 'img/moreh/avatar.webp', 'js/imagen.js', 'js/app.js',
  'img/logo.webp', 'img/logo-sm.webp', 'img/logo.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png',
  'fonts/noto-serif-hebrew-hebrew-700-normal.woff2', 'fonts/spectral-latin-400-normal.woff2', 'fonts/spectral-latin-400-italic.woff2',
  'fonts/spectral-latin-600-normal.woff2', 'fonts/spectral-latin-ext-400-normal.woff2',
  'data/parashiot.json', 'data/calendario.json', 'data/mensajes.json', 'data/moedim.json', 'data/vocabulario.json', 'data/estudios.json', 'data/aprender.json', 'data/besora.json', 'data/tefilot.json', 'data/diccionario.json', 'data/raices.json'
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

/* ===== Versículo del día: notificaciones ===== */
const VDD_CACHE = 'bh-vdd';
async function vddPrefs() { try { const r = await (await caches.open(VDD_CACHE)).match('/__vdd_prefs'); return r ? await r.json() : {}; } catch (e) { return {}; } }
async function vddSave(p) { const c = await caches.open(VDD_CACHE); await c.put('/__vdd_prefs', new Response(JSON.stringify(p), { headers: { 'Content-Type': 'application/json' } })); }
async function vddJSON(u) { const r = (await caches.match(u)) || await fetch(u); return r.json(); }
async function vddShow(opts) {
  opts = opts || {}; const p = await vddPrefs(); if (p.on === false && !opts.prueba) return;
  const hoy = self.BH_VDD.key(new Date());
  let e = null; try { const [V, C, X] = await Promise.all(['data/versiculo.json', 'data/calendario.json', 'data/calendario-extra.json'].map(vddJSON)); e = self.BH_VDD.pick(hoy, V, C, X, p); } catch (x) { }
  const n = e ? self.BH_VDD.notif(e, p) : { title: '☀️ Tu encuentro diario con la Palabra', body: 'Tu versículo del día te está esperando.' };
  if (opts.recordatorio) n.body = 'Aún estás a tiempo de dedicar unos minutos a la Palabra hoy.';
  // una sola notificación por día: la etiqueta reemplaza a cualquier aviso anterior del mismo día
  await self.registration.showNotification(n.title, { body: n.body, tag: 'vdd-' + hoy + (opts.recordatorio ? '-r' : ''), renotify: !!opts.prueba, icon: 'icons/icon-192.png', badge: 'icons/favicon-32.png', data: { url: './#versiculo-' + hoy }, lang: 'es' });
  p.ultimo = hoy; await vddSave(p);
}
self.addEventListener('push', e => { let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { } e.waitUntil(vddShow({ prueba: !!d.prueba, recordatorio: d.tipo === 'recordatorio' })); });
self.addEventListener('notificationclick', e => {
  e.notification.close(); const url = (e.notification.data && e.notification.data.url) || './#versiculo-hoy';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => { for (const c of list) { if ('focus' in c) { c.navigate ? c.navigate(url) : c.postMessage({ type: 'vdd-open', url }); return c.focus(); } } return self.clients.openWindow(url); }));
});
// respaldo sin servidor (Chrome en Android con la app instalada): comprobación periódica
self.addEventListener('periodicsync', e => { if (e.tag !== 'vdd') return; e.waitUntil(vddPrefs().then(p => { const now = new Date(); const [h, m] = (p.hora || '09:00').split(':').map(Number); if (p.on !== false && p.ultimo !== self.BH_VDD.key(now) && now.getHours() * 60 + now.getMinutes() >= h * 60 + m) return vddShow(); })); });
self.addEventListener('message', e => { const d = e.data || {}; if (d.type === 'vdd-prefs') e.waitUntil(vddPrefs().then(p => vddSave(Object.assign(p, d.prefs)))); if (d.type === 'vdd-test') e.waitUntil(vddShow({ prueba: true })); });
