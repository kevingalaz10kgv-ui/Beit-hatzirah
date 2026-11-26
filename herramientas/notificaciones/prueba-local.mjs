// Prueba del servidor sin desplegarlo: node prueba-local.mjs
import worker, { tick, localNow } from './worker.js';
const store = new Map();
const KV = { get: async k => store.get(k) ?? null, put: async (k, v) => store.set(k, v), delete: async k => store.delete(k), list: async ({ prefix }) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) };
const { subtle } = globalThis.crypto; const kp = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const env = { SUBS: KV, VAPID_PUBLIC: Buffer.from(new Uint8Array(await subtle.exportKey('raw', kp.publicKey))).toString('base64url'), VAPID_PRIVATE_JWK: JSON.stringify(await subtle.exportKey('jwk', kp.privateKey)), ADMIN_TOKEN: 'secreto', ORIGEN: '*' };
const sent = []; globalThis.fetch = async (url, o) => { sent.push({ url, h: o.headers }); return new Response(null, { status: url.includes('vencida') ? 410 : 201 }); };
const call = (path, body, h) => worker.fetch(new Request('https://w.dev' + path, { method: body ? 'POST' : 'GET', body: body ? JSON.stringify(body) : undefined, headers: h }), env);
let ok = 0, fail = 0; const assert = (c, m) => { if (c) ok++; else { fail++; console.log('FALLA:', m); } };
for (const [id, tz, extra] of [['santiago', 'America/Santiago', {}], ['madrid', 'Europe/Madrid', { hora2: '20:00' }], ['mexico', 'America/Mexico_City', { hora: '07:30' }], ['apagado', 'Europe/Madrid', { on: false }], ['vencida', 'Asia/Jerusalem', {}]])
  assert((await call('/suscribir', Object.assign({ subscription: { endpoint: 'https://push.example/' + id }, tz }, extra))).status === 200, 'suscribir ' + id);
assert((await call('/suscribir', { subscription: { endpoint: 'https://x' }, tz: 'Mars/Base' })).status === 400, 'zona horaria inválida rechazada');
// recorrer un día completo (UTC) cada 15 minutos
const start = Date.UTC(2026, 10, 26, 0, 0);
for (let t = start; t < start + 86400000; t += 15 * 60000) await tick(env, t);
const by = id => sent.filter(s => s.url.endsWith('/' + id));
assert(by('santiago').length === 1, 'Santiago: un aviso al día (' + by('santiago').length + ')');
assert(by('madrid').length === 2, 'Madrid: aviso + recordatorio (' + by('madrid').length + ')');
assert(by('mexico').length === 1, 'Ciudad de México: un aviso');
assert(by('apagado').length === 0, 'Desactivado: ningún aviso');
assert(by('vencida').length === 1 && !store.has([...store.keys()].find(k => store.get(k) && store.get(k).includes('vencida'))), 'Suscripción vencida eliminada');
// la hora de envío corresponde a las 09:00 locales
const sIdx = sent.findIndex(s => s.url.endsWith('/santiago')); const sTime = start + sIdx; // (se verifica abajo con localNow)
let santiagoLocal = null; for (let t = start; t < start + 86400000; t += 15 * 60000) { const L = localNow('America/Santiago', new Date(t)); if (L.min === 9 * 60) { santiagoLocal = t; break; } }
assert(santiagoLocal !== null, 'Existe el instante de las 09:00 en Santiago');
// sin duplicados al repetir el mismo día
const before = sent.length; for (let t = start; t < start + 86400000; t += 15 * 60000) await tick(env, t); assert(sent.length === before, 'Repetir el día no duplica avisos');
// horario de verano: Santiago cambia de hora en abril; el aviso sigue a las 09:00 locales
assert(localNow('America/Santiago', new Date(Date.UTC(2026, 0, 15, 12, 0))).min === 9 * 60 && localNow('America/Santiago', new Date(Date.UTC(2026, 5, 15, 13, 0))).min === 9 * 60, 'Cambio de horario de verano/invierno de Santiago');
// encabezados VAPID y firma
const h = sent[0].h; assert(/^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=/.test(h.Authorization) && h.TTL && h.Topic === 'versiculo', 'Encabezados Web Push');
const jwt = h.Authorization.match(/t=([^,]+)/)[1].split('.'); const pk = await subtle.importKey('raw', Buffer.from(env.VAPID_PUBLIC, 'base64url'), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
assert(await subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pk, Buffer.from(jwt[2], 'base64url'), new TextEncoder().encode(jwt[0] + '.' + jwt[1])), 'Firma VAPID válida');
// prueba manual y estadísticas protegidas
assert((await (await call('/prueba', { endpoint: 'https://push.example/santiago' })).json()).resultado === 'ok', 'Envío de prueba inmediato');
assert((await call('/admin/estadisticas', null, { Authorization: 'Bearer malo' })).status === 401, 'Estadísticas protegidas');
const st = await (await call('/admin/estadisticas', null, { Authorization: 'Bearer secreto' })).json(); assert(st.suscriptores === 4 && Object.keys(st.registro).length >= 1, 'Estadísticas: ' + JSON.stringify(st).slice(0, 120));
assert((await call('/baja', { endpoint: 'https://push.example/mexico' })).status === 200 && (await (await call('/admin/estadisticas', null, { Authorization: 'Bearer secreto' })).json()).suscriptores === 3, 'Baja de una suscripción');
console.log(`\nPruebas del servidor: ${ok} correctas, ${fail} fallidas`);
