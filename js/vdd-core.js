/* BEIT HATZIRAH — Versículo del día: lógica compartida por la app y el service worker.
   Decide qué contenido corresponde a cada fecha, en este orden:
   1) programación del administrador, 2) fiestas de la Torá, 3) Januká, Purim y Rosh Jodesh, 4) Shabat,
   5) rotación diaria sin repeticiones (filtrada por los temas del usuario, si los eligió). */
(function (g) {
  'use strict';
  const pad = n => String(n).padStart(2, '0');
  const key = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const inRange = (k, r) => Array.isArray(r) ? (k >= r[0] && k <= r[1]) : k === r;
  const prev = k => { const d = new Date(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10)); d.setDate(d.getDate() - 1); return key(d); };
  // devuelve { id, primero } si la fecha cae en una fiesta
  function moedOf(k, cal, extra) {
    const y = k.slice(0, 4); const M = (cal && cal.moedim && cal.moedim[y]) || {}; const X = (extra && extra[y]) || {};
    for (const id of ['yomKippur', 'yomTeruah', 'sheminiAtzeret', 'shavuot', 'bikurim', 'pesaj']) if (M[id] && inRange(k, M[id])) return { id, primero: true };
    for (const id of ['sukkot', 'matzot']) if (M[id] && inRange(k, M[id])) return { id, primero: Array.isArray(M[id]) ? k === M[id][0] : true };
    const yP = String(+y - 1), XP = (extra && extra[yP]) || {};
    const jan = (X.januka || []).concat(XP.januka || []); if (jan.includes(k)) return { id: 'januka', primero: !jan.includes(prev(k)) };
    if (X.purim === k) return { id: 'purim', primero: true };
    const rj = (X.roshJodesh || []).concat(XP.roshJodesh || []); if (rj.includes(k)) return { id: 'roshJodesh', primero: !rj.includes(prev(k)) };
    return null;
  }
  // tipo de día sin contar la programación: 'fiesta' (primer día), 'shabat' o 'diario'
  function kind(k, cal, extra) { const m = moedOf(k, cal, extra); if (m && m.primero) return 'fiesta'; const d = new Date(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10)); return d.getDay() === 6 ? 'shabat' : 'diario'; }
  const cache = {};
  function pick(date, data, cal, extra, prefs) {
    const k = typeof date === 'string' ? date : key(date); prefs = prefs || {};
    const E = data.entradas; const byId = id => E.find(e => e.id === id); const ini = data.inicio || '2026-01-01';
    if (data.programa && data.programa[k] && byId(data.programa[k])) return Object.assign({ motivo: 'programado', fecha: k }, byId(data.programa[k]));
    const m = moedOf(k, cal, extra); const kd = kind(k, cal, extra);
    if (kd === 'fiesta' && byId(m.id)) return Object.assign({ motivo: 'fiesta', fecha: k }, byId(m.id));
    // contar los días anteriores del mismo tipo desde el inicio (rotación exacta, sin repeticiones)
    const ck = ini + '|' + (prefs.temas || []).join(','); const C = cache[ck] = cache[ck] || { k: ini, n: { shabat: 0, diario: 0 } };
    if (k < C.k) { C.k = ini; C.n = { shabat: 0, diario: 0 }; }
    let d = new Date(+C.k.slice(0, 4), +C.k.slice(5, 7) - 1, +C.k.slice(8, 10)); let kk = C.k;
    while (kk < k) { const t = kind(kk, cal, extra); if (t !== 'fiesta' && !(data.programa && data.programa[kk])) C.n[t]++; d.setDate(d.getDate() + 1); kk = key(d); }
    C.k = k; const n = C.n[kd === 'shabat' ? 'shabat' : 'diario'];
    if (kd === 'shabat') { const S = E.filter(e => e.tipo === 'shabat'); if (S.length) return Object.assign({ motivo: 'shabat', fecha: k, durante: m && m.id }, S[n % S.length]); }
    let L = E.filter(e => e.tipo === 'diario'); if (prefs.temas && prefs.temas.length) { const f = L.filter(e => prefs.temas.includes(e.tema)); if (f.length >= 7) L = f; }
    return Object.assign({ motivo: 'diario', fecha: k, durante: m && m.id }, L[n % L.length]);
  }
  function notif(e, prefs) {
    const modo = (prefs && prefs.modo) || 'versiculo';
    return { title: '☀️ Tu encuentro diario con la Palabra', body: modo === 'recordatorio' ? 'Hoy dedica unos minutos a escuchar, meditar y acercarte a YAH. Tu versículo del día te está esperando.' : (e.refLabel + ' · ' + e.tema + '. Dedica unos minutos a meditar y acercarte a YAH.') };
  }
  g.BH_VDD = { key, pick, notif, moedOf, kind };
})(typeof self !== 'undefined' ? self : this);
