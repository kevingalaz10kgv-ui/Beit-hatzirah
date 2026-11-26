/* Servidor de notificaciones del Versículo del día — Beit Hatzirah (Cloudflare Workers + KV + Cron).
   - POST /suscribir   { subscription, tz, hora, hora2, modo, on }  → guarda o actualiza la suscripción
   - POST /baja        { endpoint }                                 → elimina la suscripción
   - POST /prueba      { endpoint }                                 → envía un aviso de prueba ahora
   - GET  /vapid                                                    → clave pública VAPID
   - GET  /admin/estadisticas  (Authorization: Bearer ADMIN_TOKEN)  → suscriptores y registro de envíos
   - Tarea programada cada 15 minutos: envía el aviso a quien, en su zona horaria, llegó a su hora preferida
     (09:00 por defecto) y todavía no lo recibió ese día. Las suscripciones vencidas (404/410) se eliminan.
   Los avisos se envían sin contenido cifrado (Web Push sin carga útil): el service worker de la app arma la
   notificación con el versículo del día, así el texto siempre coincide con la pantalla.
   Variables: VAPID_PUBLIC (texto), VAPID_PRIVATE_JWK (secreto, JSON), ADMIN_TOKEN (secreto),
   CONTACTO (correo), ORIGEN (dominio de la app). Espacio KV: SUBS. */
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const enc = s => new TextEncoder().encode(s);
async function sha(s) { return b64u(await crypto.subtle.digest('SHA-256', enc(s))).slice(0, 32); }
function localNow(tz, now) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  const p = Object.fromEntries(f.formatToParts(now).map(x => [x.type, x.value]));
  return { fecha: p.year + '-' + p.month + '-' + p.day, min: (+p.hour % 24) * 60 + +p.minute };
}
async function vapidJWT(env, endpoint, now) {
  const aud = new URL(endpoint).origin; const exp = Math.floor(now / 1000) + 12 * 3600;
  const head = b64u(enc(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))), body = b64u(enc(JSON.stringify({ aud, exp, sub: 'mailto:' + (env.CONTACTO || 'admin@example.com') })));
  const key = await crypto.subtle.importKey('jwk', JSON.parse(env.VAPID_PRIVATE_JWK), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc(head + '.' + body));
  return head + '.' + body + '.' + b64u(sig);
}
async function sendPush(env, sub, now) {
  const jwt = await vapidJWT(env, sub.endpoint, now);
  return fetch(sub.endpoint, { method: 'POST', headers: { TTL: '43200', Urgency: 'normal', Topic: 'versiculo', Authorization: 'vapid t=' + jwt + ', k=' + env.VAPID_PUBLIC, 'Content-Length': '0' } });
}
async function log(env, fecha, campo, n) { const k = 'log:' + fecha; const L = JSON.parse((await env.SUBS.get(k)) || '{}'); L[campo] = (L[campo] || 0) + (n || 1); await env.SUBS.put(k, JSON.stringify(L), { expirationTtl: 400 * 86400 }); }
async function deliver(env, key, sub, now, campo) {
  const r = await sendPush(env, sub, now); const fecha = localNow('UTC', new Date(now)).fecha;
  if (r.status === 404 || r.status === 410) { await env.SUBS.delete(key); await log(env, fecha, 'eliminadas'); return 'eliminada'; }
  if (!r.ok) { sub.fallos = (sub.fallos || 0) + 1; await env.SUBS.put(key, JSON.stringify(sub)); await log(env, fecha, 'errores'); return 'error'; }
  sub.fallos = 0; await log(env, fecha, campo); return 'ok';
}
async function tick(env, now) {
  let cursor; const res = { revisadas: 0, enviadas: 0 };
  do {
    const page = await env.SUBS.list({ prefix: 'sub:', cursor }); cursor = page.list_complete ? null : page.cursor;
    for (const { name } of page.keys) {
      const sub = JSON.parse((await env.SUBS.get(name)) || 'null'); if (!sub || sub.on === false) continue; res.revisadas++;
      const L = localNow(sub.tz, new Date(now)); const due = h => { const [hh, mm] = (h || '').split(':').map(Number); const t = hh * 60 + mm; return !isNaN(t) && L.min >= t && L.min < t + 15; };
      let changed = false;
      if (due(sub.hora || '09:00') && sub.ultimo !== L.fecha) { const r = await deliver(env, name, sub, now, 'enviadas'); if (r === 'eliminada') continue; if (r === 'ok') { sub.ultimo = L.fecha; res.enviadas++; } changed = true; }
      if (sub.hora2 && due(sub.hora2) && sub.ultimo2 !== L.fecha) { const r = await deliver(env, name, sub, now, 'recordatorios'); if (r === 'eliminada') continue; if (r === 'ok') sub.ultimo2 = L.fecha; changed = true; }
      if (changed) await env.SUBS.put(name, JSON.stringify(sub));
    }
  } while (cursor);
  return res;
}
const json = (o, s, origin) => new Response(JSON.stringify(o), { status: s || 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' } });
export default {
  async fetch(req, env) {
    const origin = env.ORIGEN || '*'; const u = new URL(req.url);
    if (req.method === 'OPTIONS') return json({}, 204, origin);
    try {
      if (u.pathname === '/vapid') return json({ clave: env.VAPID_PUBLIC }, 200, origin);
      if (u.pathname === '/suscribir' && req.method === 'POST') {
        const b = await req.json(); const s = b.subscription; if (!s || !s.endpoint || !/^https:\/\//.test(s.endpoint)) return json({ error: 'suscripción no válida' }, 400, origin);
        try { new Intl.DateTimeFormat('en', { timeZone: b.tz }); } catch (e) { return json({ error: 'zona horaria no válida' }, 400, origin); }
        const key = 'sub:' + await sha(s.endpoint); const old = JSON.parse((await env.SUBS.get(key)) || '{}');
        const sub = { endpoint: s.endpoint, tz: b.tz, hora: /^\d\d:\d\d$/.test(b.hora) ? b.hora : '09:00', hora2: /^\d\d:\d\d$/.test(b.hora2 || '') ? b.hora2 : null, modo: b.modo === 'recordatorio' ? 'recordatorio' : 'versiculo', on: b.on !== false, ultimo: old.ultimo || null, ultimo2: old.ultimo2 || null, alta: old.alta || Date.now(), act: Date.now() };
        await env.SUBS.put(key, JSON.stringify(sub)); return json({ ok: true }, 200, origin);
      }
      if (u.pathname === '/baja' && req.method === 'POST') { const b = await req.json(); await env.SUBS.delete('sub:' + await sha(b.endpoint || '')); return json({ ok: true }, 200, origin); }
      if (u.pathname === '/prueba' && req.method === 'POST') { const b = await req.json(); const key = 'sub:' + await sha(b.endpoint || ''); const sub = JSON.parse((await env.SUBS.get(key)) || 'null'); if (!sub) return json({ error: 'Este dispositivo no está suscrito' }, 404, origin); const r = await deliver(env, key, sub, Date.now(), 'pruebas'); return json({ resultado: r }, 200, origin); }
      if (u.pathname === '/admin/estadisticas') {
        if (req.headers.get('Authorization') !== 'Bearer ' + env.ADMIN_TOKEN) return json({ error: 'no autorizado' }, 401, origin);
        let cursor, subs = 0, activas = 0; const tz = {}; do { const p = await env.SUBS.list({ prefix: 'sub:', cursor }); cursor = p.list_complete ? null : p.cursor; for (const { name } of p.keys) { const s = JSON.parse(await env.SUBS.get(name)); subs++; if (s.on !== false) activas++; tz[s.tz] = (tz[s.tz] || 0) + 1; } } while (cursor);
        const logs = {}; const lp = await env.SUBS.list({ prefix: 'log:' }); for (const { name } of lp.keys.slice(-30)) logs[name.slice(4)] = JSON.parse(await env.SUBS.get(name));
        return json({ suscriptores: subs, activas, zonas: tz, registro: logs }, 200, origin);
      }
      return json({ error: 'ruta no encontrada' }, 404, origin);
    } catch (e) { return json({ error: e.message }, 500, origin); }
  },
  async scheduled(event, env, ctx) { ctx.waitUntil(tick(env, event.scheduledTime || Date.now())); }
};
export { tick, localNow, vapidJWT };
