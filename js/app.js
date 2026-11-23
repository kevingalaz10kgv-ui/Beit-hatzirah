/* BEIT HATZIRAH — בית הצרעה
   Aplicación principal (JavaScript sin dependencias). */
(function () {
  'use strict';
  const VERSION = '0.4.0';
  const EMBED = window.__BH_EMBED || null;
  const LOGO = (EMBED && EMBED.logo) || 'img/logo.jpg';
  const BOOKS = window.BH_BOOKS;
  const BY = Object.fromEntries(BOOKS.map(b => [b.c, b]));
  const $ = (s, el = document) => el.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- Almacenamiento local ---------- */
  const mem = {};
  const Store = {
    get(k, d) { try { const v = localStorage.getItem('bh:' + k); return v == null ? (k in mem ? mem[k] : d) : JSON.parse(v); } catch (e) { return k in mem ? mem[k] : d; } },
    set(k, v) { mem[k] = v; try { localStorage.setItem('bh:' + k, JSON.stringify(v)); } catch (e) { /* almacenamiento no disponible */ } }
  };
  const DEF = { theme: 'auto', scale: 1, view: 'ambos', teamim: true, nombres: true, orto: true, cal: 'diaspora', haft: 'ash', ver: 'pdt' };
  const VERS = {
    pdt: { name: 'Palabra de Dios para ti', short: 'PDT', src: 'Palabra de Dios para ti © 2020 Asociación Bíblica Latinoamericana, licencia CC BY-SA 4.0' },
    blm: { name: 'Biblia Libre para el Mundo', short: 'BLM', src: 'Biblia Libre para el Mundo, de David Williams y Michael Paul Johnson, dominio público (CC0); borrador en revisión' },
    rv: { name: 'Reina-Valera 1909', short: 'RV1909', src: 'Reina-Valera 1909, dominio público' }
  };
  const prefs = Object.assign({}, DEF, Store.get('prefs', {}));
  if (!VERS[prefs.ver]) prefs.ver = 'pdt';
  const savePrefs = () => { Store.set('prefs', prefs); applyPrefs(); };
  function applyPrefs() {
    const r = document.documentElement;
    if (prefs.theme === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', prefs.theme);
    r.style.setProperty('--scale', prefs.scale);
  }
  applyPrefs();

  /* ---------- Datos ---------- */
  const cache = {};
  async function gunzipB64(b64) {
    const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    if (!('DecompressionStream' in window)) throw new Error('Este navegador no puede abrir los textos. Actualiza Safari o Chrome.');
    const ds = new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'));
    return await new Response(ds).text();
  }
  async function getJSON(name) {
    if (cache[name]) return cache[name];
    let p;
    if (EMBED && EMBED.json[name]) p = Promise.resolve(EMBED.json[name]);
    else if (EMBED && EMBED.gz && EMBED.gz[name]) p = gunzipB64(EMBED.gz[name]).then(JSON.parse);
    else p = fetch('data/' + name).then(r => { if (!r.ok) throw new Error('No se pudo cargar ' + name); return r.json(); });
    cache[name] = p;
    try { return await p; } catch (e) { delete cache[name]; throw e; }
  }
  async function getBook(code) {
    const k = 'b/' + code;
    if (cache[k]) return cache[k];
    let p;
    if (EMBED && EMBED.books[code]) p = gunzipB64(EMBED.books[code]).then(JSON.parse);
    else p = fetch('data/b/' + code + '.json').then(r => { if (!r.ok) throw new Error('Sin conexión: este libro aún no está guardado en el teléfono.'); return r.json(); });
    cache[k] = p;
    try { return await p; } catch (e) { delete cache[k]; throw e; }
  }

  async function getEs(ver, code) {
    const k = 'es/' + ver + '/' + code;
    if (cache[k]) return cache[k];
    let p;
    if (EMBED && EMBED.books[ver + '/' + code]) p = gunzipB64(EMBED.books[ver + '/' + code]).then(JSON.parse);
    else p = fetch('data/es/' + ver + '/' + code + '.json').then(r => { if (!r.ok) throw new Error('Sin conexión: esta traducción aún no está guardada en el teléfono.'); return r.json(); });
    cache[k] = p;
    try { return await p; } catch (e) { delete cache[k]; throw e; }
  }
  /* Libro con el español de la traducción elegida: celdas [español, hebreo, numeración hebrea, nota] */
  async function getBookV(code) {
    const ver = prefs.ver; const k = 'v/' + ver + '/' + code;
    if (cache[k]) return cache[k];
    const p = (async () => {
      const base = await getBook(code);
      if (ver === 'rv') return Object.assign({ es: null }, base);
      const e = await getEs(ver, code);
      const c = base.c.map((ch, ci) => ch.map((cell, vi) => {
        const t = (e.c[ci] || [])[vi] || '';
        const n = e.n && e.n[(ci + 1) + ':' + (vi + 1)];
        return [t, cell[1] || '', cell[2] || '', t === '^' ? 'unido' : n === 'inc' ? 'inc' : (!t && cell[0] ? 'falta' : '')];
      }));
      return { c, t: base.t, es: e.t || null };
    })();
    cache[k] = p;
    try { return await p; } catch (e) { delete cache[k]; throw e; }
  }

  /* ---------- Texto: hebreo y español ---------- */
  const TEAMIM = /[\u0591-\u05AF\u05C0]/g;
  const heb = h => prefs.teamim ? h : h.replace(TEAMIM, '').replace(/\s{2,}/g, ' ');
  const hebPlain = h => h.replace(/\u05BE/g, ' ').replace(/[\u0591-\u05C7\u034F\u05C3]/g, '').replace(/\s+/g, ' ').trim();
  const L = '\\p{L}';
  const NB = '(^|[^' + L + 'ʼ])';
  const NE = '(?=[^' + L + ']|$)';
  const NOMBRE_DIVINO = new RegExp(NB + '(?:(el|del|al) )?((?:Señor|ʼAdonay) (?:Jehová|Yahvé|YAVÉ|Yavé))' + NE, 'gu');
  const ART_ADONAY = new RegExp(NB + '(el|del|al) (ʼAdonay|Jehová|Yahvé|YAVÉ|Yavé)' + NE, 'gu');
  const NOMBRES = [
    ['Jesucristo', 'Yahshua HaMashíaj'], ['Jesús', 'Yahshua'], ['Cristos', 'Mashíaj'], ['Cristo', 'Mashíaj'],
    ['Espíritu Santo', 'Ruaj HaKodesh'],
    ['Jehová', 'Adonay'], ['Yahvé', 'Adonay'], ['YAVÉ', 'Adonay'], ['Yavé', 'Adonay'],
    ['ʼElohim', 'Elohim'], ['ʼAdonay', 'Adonay'], ['ʼEL', 'El'], ['ʼEl', 'El'], ['Dios', 'Elohim']
  ].map(([a, b]) => [new RegExp(NB + '(' + a + ')' + NE, 'gu'), b]);
  const ORTO = [['á', 'a'], ['Á', 'A'], ['é', 'e'], ['É', 'E'], ['ó', 'o'], ['Ó', 'O'], ['fué', 'fue'], ['Fué', 'Fue'], ['fuí', 'fui'], ['dió', 'dio'], ['Dió', 'Dio'], ['vió', 'vio'], ['Vió', 'Vio'], ['ví', 'vi'], ['Ví', 'Vi']]
    .map(([a, b]) => [new RegExp('(^|[^' + L + '])' + a + '(?=[^' + L + ']|$)', 'gu'), b]);
  /* Español: ortografía (RV1909) y nombres hebreos. Las adaptaciones se marcan con fichas
     para no volver a reemplazar dentro de un nombre ya adaptado. */
  function es(s, html) {
    let t = s || '';
    if (prefs.orto && prefs.ver === 'rv') ORTO.forEach(([re, b]) => { t = t.replace(re, '$1' + b); });
    const marks = [];
    const tok = (orig, b) => { marks.push([orig, b]); return '\uE000' + (marks.length - 1) + '\uE001'; };
    if (prefs.nombres) {
      t = t.replace(NOMBRE_DIVINO, (m, pre, art, orig) => pre + (art === 'del' ? 'de ' : art === 'al' ? 'a ' : '') + tok(orig, 'Adonay Elohim'));
      t = t.replace(ART_ADONAY, (m, pre, art, orig) => pre + (art === 'del' ? 'de ' : art === 'al' ? 'a ' : '') + tok(orig, 'Adonay'));
      NOMBRES.forEach(([re, b]) => { t = t.replace(re, (m, pre, orig) => pre + tok(orig, b)); });
    }
    if (html) t = esc(t);
    return t.replace(/\uE000(\d+)\uE001/g, (m, i) => {
      const [orig, b] = marks[+i];
      return html ? '<span class="adapt" title="' + esc(VERS[prefs.ver].short + ': ' + orig) + '">' + b + '</span>' : b;
    });
  }
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const isHeb = s => /[\u05D0-\u05EA]/.test(s);

  /* ---------- Referencias ---------- */
  const bookName = c => BY[c].tr;
  function parseCV(s) { const [c, v] = s.split(':').map(Number); return { c, v }; }
  function fmtRange(r) {
    const a = r.s, b = r.e; const same = a.split(':')[0] === b.split(':')[0];
    let t = bookName(r.b) + ' ' + a + '–' + (same ? b.split(':')[1] : b);
    if (r.hs && (r.hs !== r.s || r.he !== r.e)) t += ' (hebreo ' + r.hs + '–' + r.he + ')';
    return t;
  }
  function parseRef(q) {
    const m = q.trim().match(/^(\d?\s*[^\d:]+?)\s*(\d+)?(?:[:.,\s]+(\d+))?$/u);
    if (!m) return null;
    const key = norm(m[1]).replace(/[\s.]/g, '');
    if (!key) return null;
    let b = BOOKS.find(x => x.al.includes(key)) || BOOKS.find(x => x.al.some(a => a.startsWith(key) && key.length >= 3));
    if (!b) return null;
    const c = m[2] ? Math.min(Math.max(1, +m[2]), b.ch) : 1;
    return { b: b.c, c, v: m[3] ? +m[3] : null };
  }
  const refRoute = s => { const m = s.match(/^(\w+) (\d+)(?::(\d+))?/); return m ? 'leer-' + m[1] + '-' + m[2] + (m[3] ? '-' + m[3] : '') : 'biblia'; };
  const refLabel = s => { const m = s.match(/^(\w+) (.*)$/); return m ? bookName(m[1]) + ' ' + m[2].replace('-', '–') : s; };

  /* ---------- Fechas ---------- */
  const pad = n => String(n).padStart(2, '0');
  const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const fromISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const fmtDate = (d, o) => d.toLocaleDateString('es', o || { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  function hebDate(d) { try { return new Intl.DateTimeFormat('es-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric' }).format(d).replace(/\s*(AM|a\. ?m\.)$/i, ''); } catch (e) { return ''; } }
  function nextShabbat(from) { const d = new Date(from || Date.now()); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7)); return d; }
  const CHAG = { 'Pesach': 'Pésaj', 'Pesach I': 'Pésaj (primer día)', 'Pesach VII': 'Pésaj (séptimo día)', 'Pesach VIII': 'Pésaj (octavo día, diáspora)', 'Pesach Shabbat Chol ha-Moed': 'Shabat Jol HaMoed Pésaj', 'Shavuot': 'Shavuot', 'Rosh Hashana': 'Yom Teruá (Rosh Hashaná)', 'Yom Kippur': 'Yom Kipur', 'Sukkot': 'Sukot', 'Sukkot Shabbat Chol ha-Moed': 'Shabat Jol HaMoed Sukot', 'Shmini Atzeret': 'Sheminí Atzéret' };

  async function weekInfo(date) {
    const [P, C] = await Promise.all([getJSON('parashiot.json'), getJSON('calendario.json')]);
    const sch = C.sch[prefs.cal] || C.sch.diaspora;
    let d = nextShabbat(date); const first = new Date(d);
    for (let i = 0; i < 6; i++) {
      const e = sch[iso(d)];
      if (e && Array.isArray(e)) return { date: d, list: e.map(id => P.find(p => p.id === id)).filter(Boolean), chag: i > 0 ? (sch[iso(first)] || {}).chag : null, shabbat: first };
      d.setDate(d.getDate() + 7);
    }
    return null;
  }

  /* ---------- Iconos ---------- */
  const I = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
    book: '<path d="M12 6.5C10 5 7 4.5 3 5v14c4-.5 7 0 9 1.5 2-1.5 5-2 9-1.5V5c-4-.5-7 0-9 1.5Z"/><path d="M12 6.5v14"/>',
    scroll: '<rect x="3" y="3" width="4" height="18" rx="2"/><rect x="17" y="3" width="4" height="18" rx="2"/><path d="M7 6h10M7 18h10"/><path d="M10 10h4M10 14h4"/>',
    study: '<path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4Z"/><path d="M8 9h8M8 13h6"/>',
    saved: '<path d="M6 3h12v18l-6-4-6 4Z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/>',
    wa: '<path d="M4 20l1.3-4A8 8 0 1 1 8 18.8Z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 1c-1-.5-2-1.5-2.5-2.5l1-1-1-2Z"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9Z"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-8 9"/>',
    text: '<path d="M4 7V5h16v2M12 5v14M9 19h6"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    chev: '<path d="m9 5 7 7-7 7"/>',
    day: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    alef: '<path d="M6 4l12 16M14 4c0 4 4 4 4 8M10 20c0-4-4-4-4-8"/>',
    hist: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
    mark: '<path d="M7 3h10v18l-5-3.5L7 21Z"/><path d="M10 8h4"/>',
    bilingual: '<path d="M4 6h9M4 12h6M4 18h9"/><path d="M20 6h-3M20 12h-5M20 18h-3"/>'
  };
  const ic = (n, extra) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' + (extra || '') + '>' + I[n] + '</svg>';

  /* ---------- Interfaz común ---------- */
  const view = () => $('#view');
  function top(title, opts = {}) {
    const back = opts.back ? '<button class="icon-btn" data-act="back" data-fallback="' + opts.back + '" aria-label="Volver">' + ic('back') + '</button>' : '';
    const right = (opts.right || '');
    return '<header class="top"><div class="wrap">' + back + '<h1>' + title + '</h1>' + right + '</div></header>';
  }
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2200); }
  function sheet(html) {
    closeSheet();
    const b = document.createElement('div'); b.className = 'sheet-back'; b.dataset.act = 'close-sheet';
    const s = document.createElement('div'); s.className = 'sheet'; s.setAttribute('role', 'dialog'); s.setAttribute('aria-modal', 'true');
    s.innerHTML = '<div class="wrap"><div class="grab"></div>' + html + '</div>';
    document.body.append(b, s);
    requestAnimationFrame(() => { b.classList.add('open'); s.classList.add('open'); });
    const f = s.querySelector('button,a'); if (f) f.focus({ preventScroll: true });
  }
  function closeSheet() { document.querySelectorAll('.sheet,.sheet-back').forEach(e => e.remove()); }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); toast('Copiado'); }
    catch (e) { const ta = document.createElement('textarea'); ta.value = text; document.body.append(ta); ta.select(); try { document.execCommand('copy'); toast('Copiado'); } catch (_) { toast('No se pudo copiar'); } ta.remove(); }
  }
  async function share(text, title) {
    if (navigator.share) { try { await navigator.share({ title: title || 'Beit Hatzirah', text }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
    shareWA(text);
  }
  function shareWA(text) { window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener'); }
  const SIGN = '\n\nBeit Hatzirah — בית הצרעה';
  const textCredit = () => '(' + VERS[prefs.ver].name + (prefs.nombres ? ', con nombres hebreos' : '') + ')';

  /* ---------- Favoritos, historial, guardados ---------- */
  const favs = () => Store.get('favs', []);
  const isFav = id => favs().some(f => f.id === id);
  function toggleFav(item) {
    let f = favs(); const has = f.some(x => x.id === item.id);
    f = has ? f.filter(x => x.id !== item.id) : [Object.assign({ t: Date.now() }, item)].concat(f);
    Store.set('favs', f); toast(has ? 'Quitado de guardados' : 'Guardado'); return !has;
  }
  function pushHistory(b, c) {
    const h = Store.get('hist', []).filter(x => !(x.b === b && x.c === c));
    h.unshift({ b, c, t: Date.now() }); Store.set('hist', h.slice(0, 60)); Store.set('last', { b, c, t: Date.now() });
    const r = Store.get('readch', {}); r[b + c] = 1; Store.set('readch', r);
  }

  /* ---------- Colores y notas personales ---------- */
  const COLORS = [['celeste', 'Celeste'], ['verde', 'Verde'], ['amarillo', 'Amarillo'], ['naranjo', 'Naranjo'], ['rosado', 'Rosado'], ['morado', 'Morado'], ['rojo', 'Rojo']];
  const HL = () => Store.get('hl', {}) || {};
  const NOTES = () => Store.get('notes', {}) || {};
  const noteHTML = n => '<div class="v-note" lang="es"><span class="v-note-l">Mi nota</span>' + esc(n.t).replace(/\n/g, '<br>') + '</div>';
  const refOfId = id => { const [b, c, v] = id.split('-'); return bookName(b) + ' ' + c + ':' + v; };
  const idOrder = id => { const [b, c, v] = id.split('-'); return BOOKS.findIndex(x => x.c === b) * 1e6 + (+c) * 1e3 + (+v); };
  function refreshVerse(id) {
    const el = document.querySelector('[data-v="' + id + '"]'); if (!el) return;
    verseData(id).then(({ b, c, v, cell }) => { const tmp = document.createElement('div'); tmp.innerHTML = verseHTML(b, c, v, cell, { anchor: el.id.slice(1) }); const n = tmp.firstElementChild; if (n) el.replaceWith(n); });
  }
  function noteSheet(id) {
    const n = NOTES()[id];
    sheet('<h4>Mi nota: ' + esc(refOfId(id)) + '</h4><p class="muted" style="font-size:.85rem;margin:0 0 8px">Tu nota se guarda solo en este teléfono y no modifica el texto bíblico.</p>' +
      '<textarea class="note-ta" id="note-ta" rows="7" placeholder="Escribe tu reflexión, enseñanza o comentario…">' + esc(n ? n.t : '') + '</textarea>' +
      '<div class="btns"><button class="btn solid" data-act="note-save" data-id="' + id + '">Guardar nota</button>' + (n ? '<button class="btn" data-act="note-del" data-id="' + id + '">Eliminar</button>' : '') + '</div>');
    setTimeout(() => { const t = document.getElementById('note-ta'); if (t) t.focus(); }, 250);
  }

  /* ---------- Análisis morfológico (Open Scriptures Hebrew Bible) ---------- */
  const STEM = { q: 'Qal', N: 'Nifal', p: 'Piel', P: 'Pual', h: 'Hifil', H: 'Hofal', t: 'Hitpael', o: 'Polel', O: 'Polal', r: 'Hitpolel', m: 'Poel', M: 'Poal', k: 'Palel', K: 'Pulal', Q: 'Qal pasivo', l: 'Pilpel', L: 'Polpal', f: 'Hitpalpel', D: 'Nitpael', j: 'Pealal', i: 'Pilel', u: 'Hotpaal', c: 'Tifil', v: 'Hishtafel', w: 'Nitpalel', y: 'Nitpoel', z: 'Hitpoel' };
  const VTYPE = { p: 'pasado (perfecto, qatal)', q: 'perfecto con vav (weqatal)', i: 'futuro / imperfecto (yiqtol)', w: 'pasado narrativo (wayyiqtol)', h: 'cohortativo', j: 'yusivo', v: 'imperativo', r: 'participio activo', s: 'participio pasivo', a: 'infinitivo absoluto', c: 'infinitivo constructo' };
  const PER = { 1: '1.ª', 2: '2.ª', 3: '3.ª' }, GEN = { m: 'masc.', f: 'fem.', c: 'común', b: 'masc./fem.' }, NUM = { s: 'sing.', p: 'plural', d: 'dual' }, STATE = { a: '', c: 'constructo', d: 'determinado' };
  const PRON = { '3ms': 'él', '3fs': 'ella', '2ms': 'tú (m.)', '2fs': 'tú (f.)', '1cs': 'yo', '3mp': 'ellos', '3fp': 'ellas', '3cp': 'ellos/ellas', '2mp': 'vosotros', '2fp': 'vosotras', '1cp': 'nosotros' };
  function pgn(x) { const k = x.slice(0, 3); return (PRON[k] ? PRON[k] + ' (' : '') + [PER[x[0]], GEN[x[1]], NUM[x[2]]].filter(Boolean).join(' ') + (PRON[k] ? ')' : ''); }
  function decodeSeg(m, lang) {
    if (!m) return '';
    const p = m[0], r = m.slice(1);
    if (p === 'V') {
      if (lang === 'A') return 'verbo (arameo)';
      const st = STEM[r[0]] || r[0], ty = r[1]; let t = 'verbo ' + st + ', ' + (VTYPE[ty] || ty);
      if (ty === 'r' || ty === 's') t += ', ' + [GEN[r[2]], NUM[r[3]], STATE[r[4]]].filter(Boolean).join(' ');
      else if (r.length >= 5) t += ', ' + pgn(r.slice(2));
      return t;
    }
    if (p === 'N') { if (r[0] === 'p') return 'nombre propio'; return (r[0] === 'g' ? 'gentilicio' : 'sustantivo') + ' ' + [GEN[r[1]], NUM[r[2]], STATE[r[3]]].filter(Boolean).join(' '); }
    if (p === 'A') return ({ a: 'adjetivo', c: 'número cardinal', g: 'gentilicio', o: 'número ordinal' }[r[0]] || 'adjetivo') + ' ' + [GEN[r[1]], NUM[r[2]], STATE[r[3]]].filter(Boolean).join(' ');
    if (p === 'C') return 'conjunción («y»)';
    if (p === 'D') return 'adverbio';
    if (p === 'R') return r[0] === 'd' ? 'preposición con artículo' : 'preposición';
    if (p === 'P') return ({ d: 'pronombre demostrativo', f: 'pronombre indefinido', i: 'pronombre interrogativo', p: 'pronombre personal', r: 'pronombre relativo' }[r[0]] || 'pronombre') + (r.length > 2 && /\d/.test(r[1]) ? ', ' + pgn(r.slice(1)) : '');
    if (p === 'S') return r[0] === 'p' ? 'sufijo pronominal, ' + pgn(r.slice(1)) : ({ d: 'he direccional («hacia»)', h: 'he paragógica', n: 'nun paragógica' }[r[0]] || 'sufijo');
    if (p === 'T') return ({ a: 'partícula de afirmación', d: 'artículo «el, la»', e: 'partícula de exhortación', i: 'partícula interrogativa', j: 'interjección', m: 'partícula demostrativa', n: 'negación', o: 'marca del objeto directo', r: 'partícula relativa' }[r[0]] || 'partícula');
    return m;
  }
  const PREFIX = { c: 'וְ «y»', d: 'הַ «el, la»', b: 'בְּ «en»', l: 'לְ «a, para»', k: 'כְּ «como»', m: 'מִ «de, desde»', i: 'הֲ interrogativa', s: 'שֶׁ «que»' };
  async function verseWords(id) {
    const [b, c, v] = id.split('-'); const d = await getBookV(b); const cell = d.c[c - 1][v - 1];
    const href = cell[2] && /^\d+:\d+/.test(cell[2]) ? cell[2].split('–')[0] : c + ':' + v;
    sheet('<h4>Palabras de ' + esc(refOfId(id)) + '</h4><div class="loading">Cargando el análisis…</div>');
    let M, LX; try { [M, LX] = await Promise.all([getJSON('morph/' + b + '.json'), getJSON('lexico.json')]); } catch (e) { sheet('<h4>Análisis</h4><p>' + esc(e.message) + '</p>'); return; }
    const words = M[href] || [];
    const rows = words.map(([text, lemma, morph], wi) => {
      const lang = morph[0]; const ms = morph.slice(1).split('/'); const ls = lemma.split('/'); const ts = text.split('/');
      const parts = ms.map((m, k) => {
        const lm = (ls[k] || '').split(' ')[0]; const seg = ts[k] || '';
        if (/^\d/.test(lm)) {
          const key = lm.replace(/\D/g, ''); const L = LX[key];
          const gl = L ? (L[3] || (L[4] ? L[4] + ' <span class="muted">(léxico de Strong, en inglés)</span>' : '')) : '';
          const verb = m[0] === 'V';
          return '<div class="wa-seg"><span class="he" lang="he">' + esc(seg) + '</span><div><b>' + (L ? '<span class="he" lang="he">' + esc(L[0]) + '</span> ' : '') + (L && L[3] ? esc(L[3]) : gl) + '</b><span>' + esc(decodeSeg(m, lang)) + (L && L[1] ? ' · ' + esc(L[1]) : '') + '</span>' +
            '<span class="wa-acts">' + (verb ? '<a href="#pealim-' + key + '" data-act="close-sheet-nav">Conjugaciones en PEALIM</a>' : '<a href="#lema-' + key + '" data-act="close-sheet-nav">Ficha de la palabra</a>') + (L && L[3] ? '<button data-act="w-save" data-k="' + key + '" data-ref="' + b + ' ' + c + ':' + v + '">Guardar para repasar</button>' : '') + '</span></div></div>';
        }
        return '<div class="wa-seg"><span class="he" lang="he">' + esc(seg) + '</span><div><span>' + esc(m[0] === 'S' ? decodeSeg(m, lang) : (PREFIX[lm] ? 'prefijo ' + PREFIX[lm] : decodeSeg(m, lang))) + '</span></div></div>';
      }).join('');
      return '<div class="wa-word"><p class="he wa-full" lang="he">' + esc(ts.join('')) + '</p>' + parts + '</div>';
    }).join('');
    sheet('<h4>Palabras de ' + esc(refOfId(id)) + '</h4><p class="muted" style="font-size:.84rem;margin:0 0 6px">Análisis de cada palabra del texto hebreo: prefijos, raíz léxica y forma gramatical.</p>' + (rows || '<p>No hay análisis disponible para este versículo.</p>'));
  }

  /* ---------- Versículos ---------- */
  function verseHTML(b, c, v, cell, opt = {}) {
    const id = b + '-' + c + '-' + v;
    const hasH = cell.length > 1 && cell[1];
    const isOT = !BY[b].nt;
    if (!cell[0] && !hasH && !cell[3]) return '';
    let h = '';
    if (hasH) h = '<p class="he vh" lang="he" dir="rtl">' + esc(heb(cell[1])) + '</p>';
    else if (cell[2] === '^' || isOT) h = '<p class="missing vh">En el texto hebreo este versículo está unido al versículo anterior.</p>';
    else h = '<p class="missing vh">Este versículo no figura en la fuente hebrea utilizada.</p>';
    const hn = cell[2] && cell[2] !== '^' ? ' <span class="hn">(hebreo ' + cell[2] + ')</span>' : '';
    const fav = isFav(id) ? '<span class="fav" aria-label="Guardado">★</span>' : '';
    const col = HL()[id]; const note = NOTES()[id];
    return '<article class="v' + (col ? ' hlc hlc-' + col : '') + '" id="v' + (opt.anchor || v) + '" data-v="' + id + '" tabindex="0">' + h +
      '<p class="ref">' + esc(bookName(b)) + ' ' + c + ':' + v + hn + fav + (note ? '<span class="note-ic" aria-label="Tiene nota">📝</span>' : '') + '</p>' +
      esHTML(cell) + (note ? noteHTML(note) : '') + '</article>';
  }
  function esHTML(cell) {
    const st = cell[3];
    if (st === 'unido') return '<p class="vs missing" lang="es">En esta traducción, este versículo está unido al anterior.</p>';
    if (st === 'falta') return '<p class="vs missing" lang="es">Este versículo no figura en esta traducción (' + esc(VERS[prefs.ver].short) + ').</p>';
    return '<p class="vs" lang="es">' + es(cell[0], true) + (st === 'inc' ? ' <span class="missing">[texto incompleto en el borrador de esta traducción]</span>' : '') + '</p>';
  }
  async function verseData(id) {
    const [b, c, v] = id.split('-'); const d = await getBookV(b);
    return { b, c: +c, v: +v, cell: d.c[c - 1][v - 1] };
  }
  async function verseText(id) {
    const { b, c, v, cell } = await verseData(id);
    const hasH = cell.length > 1 && cell[1];
    return (hasH ? heb(cell[1]) + '\n' : '') + bookName(b) + ' ' + c + ':' + v + '\n' + es(cell[0]) + '\n' + textCredit();
  }
  async function verseSheet(id) {
    const [b, c, v] = id.split('-');
    const col = HL()[id]; const note = NOTES()[id];
    sheet('<h4>' + esc(bookName(b)) + ' ' + c + ':' + v + '</h4>' +
      '<div class="swatches" role="group" aria-label="Destacar con color">' + COLORS.map(([k, n]) => '<button class="sw sw-' + k + (col === k ? ' on' : '') + '" data-act="v-color" data-id="' + id + '" data-c="' + k + '" aria-label="' + n + '" aria-pressed="' + (col === k) + '"></button>').join('') +
      (col ? '<button class="sw-clear" data-act="v-color" data-id="' + id + '" data-c="">Quitar</button>' : '') + '</div>' +
      '<button class="act" data-act="v-note" data-id="' + id + '">📝 ' + (note ? 'Editar mi nota' : 'Agregar nota') + '</button>' +
      (!BY[b].nt ? '<button class="act" data-act="v-words" data-id="' + id + '">' + ic('alef') + 'Analizar las palabras hebreas</button>' : '') +
      '<button class="act" data-act="v-copy" data-id="' + id + '">' + ic('copy') + 'Copiar versículo</button>' +
      '<button class="act" data-act="v-wa" data-id="' + id + '">' + ic('wa') + 'Compartir por WhatsApp</button>' +
      '<button class="act" data-act="v-share" data-id="' + id + '">' + ic('share') + 'Compartir…</button>' +
      '<button class="act" data-act="v-img" data-id="' + id + '">' + ic('image') + 'Crear imagen para compartir</button>' +
      '<button class="act" data-act="v-fav" data-id="' + id + '">' + ic('star') + (isFav(id) ? 'Quitar de guardados' : 'Guardar en favoritos') + '</button>');
  }

  /* ---------- Imagen para compartir ---------- */
  let logoImg;
  function loadLogo() { return new Promise(res => { if (logoImg) return res(logoImg); const i = new Image(); i.onload = () => { logoImg = i; res(i); }; i.onerror = () => res(null); i.src = LOGO; }); }
  function wrapLines(ctx, text, maxW) {
    const words = text.split(/\s+/); const lines = []; let line = '';
    for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
    if (line) lines.push(line); return lines;
  }
  async function shareImage({ he, es: esTxt, ref, title }) {
    try { await document.fonts.ready; } catch (e) { }
    const W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    x.fillStyle = '#111111'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#C6A15B'; x.fillRect(60, 60, 8, H - 120); x.fillRect(W - 68, 60, 8, H - 120);
    const lg = await loadLogo();
    if (lg) x.drawImage(lg, W / 2 - 90, 110, 180, 180);
    const HE_F = '700 54px "BH Hebrew", "Noto Serif Hebrew", serif';
    const esSize = esTxt.length < 140 ? 46 : esTxt.length < 260 ? 40 : 34; const ES_F = '400 ' + esSize + 'px "BH Serif", Georgia, serif'; const esLH = Math.round(esSize * 1.45);
    x.font = HE_F; x.direction = 'rtl'; const hl = he ? wrapLines(x, he.replace(TEAMIM, ''), W - 220).slice(0, 6) : []; x.direction = 'ltr';
    x.font = ES_F; let el = wrapLines(x, esTxt, W - 220);
    const top0 = 330, bottom0 = H - 170;
    const block = () => (title ? 80 : 0) + hl.length * 88 + (hl.length ? 30 : 0) + 70 + el.length * esLH;
    while (block() > bottom0 - top0 && el.length > 2) { el = el.slice(0, -1); el[el.length - 1] += '…'; }
    let y = top0 + Math.max(0, (bottom0 - top0 - block()) / 2);
    if (title) { x.fillStyle = '#E4C989'; x.font = '600 42px "BH Serif", Georgia, serif'; x.textAlign = 'center'; x.fillText(title, W / 2, y + 40); y += 80; }
    if (hl.length) { x.direction = 'rtl'; x.textAlign = 'right'; x.fillStyle = '#F6F1E7'; x.font = HE_F; hl.forEach(l => { x.fillText(l, W - 110, y + 60); y += 88; }); y += 30; x.direction = 'ltr'; }
    x.textAlign = 'center'; x.fillStyle = '#C6A15B'; x.font = '600 34px "BH Serif", Georgia, serif'; x.fillText(ref, W / 2, y + 36); y += 70;
    x.textAlign = 'left'; x.fillStyle = '#F6F1E7'; x.font = ES_F; el.forEach(l => { x.fillText(l, 110, y + esSize); y += esLH; });
    x.textAlign = 'center'; x.fillStyle = '#C6A15B'; x.font = '600 30px "BH Serif", Georgia, serif'; x.fillText('Beit Hatzirah', W / 2, H - 110);
    x.font = '700 30px "BH Hebrew", serif'; x.direction = 'rtl'; x.fillText('בית הצרעה', W / 2, H - 70);
    const url = cv.toDataURL('image/png');
    sheet('<h4>Imagen para compartir</h4><img class="share-img" src="' + url + '" alt="Imagen con el versículo ' + esc(ref) + '"><p class="muted" style="font-size:.9rem">En el teléfono, mantén presionada la imagen para guardarla o compartirla.</p><button class="act" data-act="img-share">' + ic('share') + 'Compartir imagen</button>');
    shareImage.last = cv;
  }
  async function shareCanvas() {
    const cv = shareImage.last; if (!cv) return;
    cv.toBlob(async blob => {
      const file = new File([blob], 'beit-hatzirah.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: 'Beit Hatzirah' }); } catch (e) { } }
      else toast('Mantén presionada la imagen para guardarla');
    });
  }

  /* ============ PANTALLAS ============ */

  /* ----- Inicio ----- */
  const FEATURED = ['PSA 119:160', 'ISA 40:8', 'PSA 19:7', 'DEU 6:5', 'JOS 1:8', 'PSA 1:1', 'PRO 3:5', 'PSA 27:1', 'ISA 41:10', 'PSA 121:2', 'LAM 3:22', 'NUM 6:24', 'DEU 31:6', 'PSA 34:8'];
  const dayIndex = d => Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5);
  async function vInicio() {
    const w = await weekInfo();
    const E = await getJSON('estudios.json');
    const today = new Date(); const fRef = FEATURED[dayIndex(today) % FEATURED.length];
    const [fb, fcv] = fRef.split(' '); const { c: fc, v: fv } = parseCV(fcv);
    const fd = (await getBookV(fb)).c[fc - 1][fv - 1];
    const M = await getJSON('mensajes.json'); const msg = M[dayIndex(today) % M.length];
    const last = Store.get('last', null);
    let parHTML = '';
    if (w) {
      const names = w.list.map(p => p.he).join(' – ');
      const tr = w.list.map(p => p.tr).join('–');
      const sig = w.list.map(p => p.sig).join(' / ');
      const chagNote = w.chag ? '<p class="sub">Este Shabat se lee la lectura de ' + esc(w.chag.map(c => CHAG[c] || c).join(', ')) + '. La siguiente parashá es:</p>' : '';
      parHTML = '<section class="section"><h3>Parashá de la semana</h3><div class="scroll">' +
        '<p class="kicker">Shabat ' + esc(fmtDate(w.date, { day: 'numeric', month: 'long' })) + '. ' + esc(hebDate(w.date)) + '</p>' + chagNote +
        '<p class="he parasha-name" lang="he">' + esc(names) + '</p>' +
        '<p class="title">' + esc(tr) + '</p><p class="sub">' + esc(sig) + '</p>' +
        '<p class="sub">' + w.list.map(p => esc(fmtRange(p.lec))).join('; ') + '</p>' +
        '<div class="btns"><a class="btn solid" href="#parasha-' + w.list[0].n + '">Estudiar</a><a class="btn" href="#lectura-' + w.list[0].n + '">Leer la parashá</a></div></div></section>';
    }
    const cont = last ? '<a class="row" href="#leer-' + last.b + '-' + last.c + '"><span class="t"><b>Continuar leyendo</b><span>' + esc(bookName(last.b)) + ' ' + last.c + '</span></span><span class="he">' + esc(BY[last.b].he) + '</span><span class="chev">' + ic('chev', ' width="18" height="18"') + '</span></a>' : '';
    view().innerHTML =
      '<header class="top"><div class="wrap"><div class="brand"><span>Beit Hatzirah</span></div>' +
      '<a class="icon-btn" href="#buscar" aria-label="Buscar">' + ic('search') + '</a>' +
      '<a class="icon-btn" href="#menu" aria-label="Menú">' + ic('menu') + '</a></div></header>' +
      '<div class="wrap">' +
      '<div class="hero"><img src="' + LOGO + '" alt="Logotipo de Beit Hatzirah" width="128" height="128"><div><p class="he" lang="he" style="margin:0">בית הצרעה</p><h2>Beit Hatzirah</h2></div></div>' +
      '<p class="welcome">Biblioteca digital para estudiar las Sagradas Escrituras en hebreo y español. Shalom, bienvenido.</p>' +
      parHTML +
      (cont ? '<section class="section"><div class="rows">' + cont + '</div></section>' : '') +
      '<section class="section"><a class="learn-card" href="#aprender"><span class="he" lang="he">אֲנִי לוֹמֵד עִבְרִית עִם הַתּוֹרָה</span><b>Yo aprendo hebreo con la Torá</b><span>Juegos de 3 a 5 minutos: letras, vocales, palabras y versículos reales. Gana XP y mantén tu racha.</span><span class="btn solid" style="align-self:flex-start">Empezar a jugar</span></a></section>' +
      '<section class="section"><h3>Mensaje diario</h3><a class="row" href="#mensaje" style="border-top:1px solid var(--line)"><span class="t"><b>' + esc(msg.titulo) + '</b><span>' + esc(refLabel(msg.ref)) + '</span></span><span class="he">דְּבַר הַיּוֹם</span></a></section>' +
      '<section class="section"><h3>Versículo destacado</h3><div class="verses" style="border-top:1px solid var(--line)">' + verseHTML(fb, fc, fv, fd) + '</div></section>' +
      '<section class="section"><h3>Las Escrituras</h3><div class="rows">' +
      '<a class="row" href="#biblia"><span class="t"><b>Tanaj</b><span>Torá, Neviim y Ketuvim en hebreo y español</span></span><span class="he">תַּנַ״ךְ</span></a>' +
      '<a class="row" href="#biblia-nt"><span class="t"><b>Brit Hadashá</b><span>Los 27 libros en hebreo y español</span></span><span class="he">בְּרִית חֲדָשָׁה</span></a>' +
      '<a class="row" href="#estudios"><span class="t"><b>Estudios</b><span>Parashiot y biblioteca de estudios</span></span><span class="he">לִמּוּד</span></a>' +
      '<a class="row" href="#aprender"><span class="t"><b>Aprender hebreo</b><span>Mapa de 12 mundos, desde el Alef Bet hasta Bereshit 1</span></span><span class="he">עִבְרִית</span></a></div></section>' +
      '<section class="section"><h3>Últimas publicaciones</h3><div class="rows">' +
      E.publicaciones.map(p => '<div class="row"><span class="t"><b>' + esc(p.titulo) + '</b><span>' + esc(fmtDate(fromISO(p.fecha), { day: 'numeric', month: 'long', year: 'numeric' })) + '. ' + esc(p.texto) + '</span></span></div>').join('') +
      '</div></section></div>';
  }

  /* ----- Biblia ----- */
  const SECS = { tora: ['Torá', 'תּוֹרָה'], neviim: ['Neviim', 'נְבִיאִים'], ketuvim: ['Ketuvim', 'כְּתוּבִים'], besorot: ['Besorot (Evangelios)', 'בְּשׂוֹרוֹת'], maasei: ['Maasei Hashlijim', 'מַעֲשֵׂי הַשְּׁלִיחִים'], igrot: ['Cartas', 'אִגְּרוֹת'], hitgalut: ['Hitgalut (Revelación)', 'הִתְגַּלּוּת'] };
  function vBiblia(nt) {
    const list = BOOKS.filter(b => b.nt === !!nt);
    let html = '', sec = '';
    list.forEach(b => {
      if (b.sec !== sec) { if (sec) html += '</div>'; sec = b.sec; html += '<div class="group-title"><h3>' + SECS[sec][0] + '</h3><span class="he" lang="he">' + SECS[sec][1] + '</span></div><div class="rows">'; }
      const alt = b.es !== b.tr ? '<span>' + esc(b.es) + ', ' + b.ch + ' capítulos</span>' : '<span>' + b.ch + ' capítulos</span>';
      html += '<a class="row" href="#libro-' + b.c + '"><span class="t"><b>' + esc(b.tr) + '</b>' + alt + '</span><span class="he" lang="he">' + esc(b.he) + '</span></a>';
    });
    html += '</div>';
    view().innerHTML = top('Biblia', { right: '<a class="icon-btn" href="#buscar" aria-label="Buscar">' + ic('search') + '</a>' }) +
      '<div class="wrap"><div class="seg" role="group" aria-label="División"><button data-go="biblia" aria-pressed="' + !nt + '">Tanaj</button><button data-go="biblia-nt" aria-pressed="' + !!nt + '">Brit Hadashá</button></div>' +

      html + '</div>';
  }
  function vLibro(code) {
    const b = BY[code]; if (!b) return vNotFound();
    const read = Store.get('readch', {});
    let g = ''; for (let i = 1; i <= b.ch; i++) g += '<a href="#leer-' + code + '-' + i + '"' + (read[code + i] ? ' class="read"' : '') + '>' + i + '</a>';
    view().innerHTML = top(esc(b.tr) + ' <small>' + esc(b.es) + '</small>', { back: b.nt ? 'biblia-nt' : 'biblia' }) +
      '<div class="wrap"><div class="reader-head"><p class="he" lang="he">' + esc(b.he) + '</p><h2>' + esc(b.tr) + '</h2><p class="muted" style="margin:0">' + esc(b.es) + ', ' + b.ch + ' capítulos</p></div>' +
      '<div class="chgrid">' + g + '</div></div>';
  }

  /* ----- Lector de capítulo ----- */
  async function torahContext(b, c) {
    if (BY[b].sec !== 'tora') return '';
    const P = await getJSON('parashiot.json');
    const hits = P.filter(p => p.lec.b === b && parseCV(p.lec.s).c <= c && parseCV(p.lec.e).c >= c);
    if (!hits.length) return '';
    return '<p class="context">Este capítulo forma parte de la parashá ' + hits.map(p => '<a href="#parasha-' + p.n + '">' + esc(p.tr) + '</a>').join(' y ') + '.</p>';
  }
  function readerTools(markId, label) {
    const m = Store.get('marks', []).some(x => x.id === markId);
    return '<button class="icon-btn" data-act="toggle-view" aria-label="Cambiar idioma visible">' + ic('bilingual') + '</button>' +
      '<button class="icon-btn" data-act="text-size" aria-label="Tamaño de letra">' + ic('text') + '</button>' +
      (markId ? '<button class="icon-btn" data-act="mark" data-id="' + markId + '" data-label="' + esc(label) + '" aria-pressed="' + m + '" aria-label="' + (m ? 'Quitar marcador' : 'Añadir marcador') + '">' + ic('mark', m ? ' fill="currentColor"' : '') + '</button>' : '');
  }
  const verBtn = () => '<button class="ver-btn" data-act="ver-sheet" aria-label="Elegir traducción al español">' + VERS[prefs.ver].short + '</button>';
  const VERDESC = {
    pdt: 'Traducción latinoamericana que conserva formas hebreas como ʼElohim y el Nombre (YAVÉ). Texto completo. © 2020 Asociación Bíblica Latinoamericana, CC BY-SA 4.0.',
    blm: 'Traducción moderna y literal, de dominio público. Distingue el Nombre (Yahvé). Es un borrador en revisión: faltan algunos versículos de Ezequiel.',
    rv: 'La traducción clásica de 1909, con lenguaje antiguo («crió», «haz de la tierra»).'
  };
  function verSheet() {
    sheet('<h4>Traducción al español</h4>' + Object.keys(VERS).map(k => '<button class="act" data-act="set-ver" data-v="' + k + '" aria-pressed="' + (prefs.ver === k) + '"><span style="width:22px;color:var(--accent)">' + (prefs.ver === k ? '✓' : '') + '</span><span><b>' + esc(VERS[k].name) + '</b><br><span class="muted" style="font-size:.86rem">' + esc(VERDESC[k]) + '</span></span></button>').join('') +
      '<p class="muted" style="font-size:.82rem;margin-top:10px">El hebreo es siempre el mismo. Con «Nombres hebreos» activado, los nombres se adaptan en todas las traducciones.</p>');
  }
  const viewClass = () => prefs.view === 'he' ? 'view-he' : prefs.view === 'es' ? 'view-es' : '';
  async function vLeer(code, c, vSel) {
    const b = BY[code]; if (!b) return vNotFound();
    c = Math.min(Math.max(1, c), b.ch);
    view().innerHTML = top(esc(b.tr) + ' ' + c, { back: 'libro-' + code }) + '<div class="loading">Abriendo ' + esc(b.tr) + '…</div>';
    let d; try { d = await getBookV(code); } catch (e) { view().innerHTML = top(esc(b.tr), { back: 'biblia' }) + '<div class="wrap empty"><p>' + esc(e.message) + '</p></div>'; return; }
    const ch = d.c[c - 1];
    const title = (d.t && d.t[c]) || (d.es && d.es[c]) ? '<div class="psalm-title">' + (d.t && d.t[c] ? '<p class="he vh" lang="he">' + esc(heb(d.t[c])) + '</p>' : '') + (d.es && d.es[c] ? '<p class="vs" lang="es" style="margin:0;font-style:italic">' + es(d.es[c], true) + '</p>' : '') + '<small>Título del salmo (versículo 1 en el texto hebreo)</small></div>' : '';
    const ctx = await torahContext(code, c);
    const ntNote = '';
    const prev = c > 1 ? { b: code, c: c - 1 } : (() => { const i = BOOKS.indexOf(b); return i > 0 ? { b: BOOKS[i - 1].c, c: BOOKS[i - 1].ch } : null; })();
    const next = c < b.ch ? { b: code, c: c + 1 } : (() => { const i = BOOKS.indexOf(b); return i < BOOKS.length - 1 ? { b: BOOKS[i + 1].c, c: 1 } : null; })();
    const pg = '<nav class="pager">' + (prev ? '<a href="#leer-' + prev.b + '-' + prev.c + '"><small>Anterior</small>' + esc(bookName(prev.b)) + ' ' + prev.c + '</a>' : '<span></span>') +
      (next ? '<a class="next" href="#leer-' + next.b + '-' + next.c + '"><small>Siguiente</small>' + esc(bookName(next.b)) + ' ' + next.c + '</a>' : '<span></span>') + '</nav>';
    view().innerHTML = top('<button data-act="chapters" data-b="' + code + '" style="font-weight:600">' + esc(b.tr) + ' ' + c + ' ▾</button>', { back: 'libro-' + code, right: verBtn() + readerTools(code + '-' + c, b.tr + ' ' + c) }) +
      '<div class="wrap ' + viewClass() + '">' +
      '<div class="reader-head"><p class="he" lang="he">' + esc(b.he) + '</p><h2>' + esc(b.tr) + ' ' + c + '</h2>' + ctx + '</div>' + ntNote + title +
      '<div class="verses">' + ch.map((cell, i) => verseHTML(code, c, i + 1, cell)).join('') + '</div>' + pg +
      '</div>';
    pushHistory(code, c);
    if (vSel) { const el = document.getElementById('v' + vSel); if (el) { el.classList.add('hl'); el.scrollIntoView({ block: 'center' }); } }
    else window.scrollTo(0, 0);
  }
  function chapterSheet(code) {
    const b = BY[code]; let g = '';
    for (let i = 1; i <= b.ch; i++) g += '<a href="#leer-' + code + '-' + i + '" data-act="close-sheet-nav">' + i + '</a>';
    sheet('<h4>' + esc(b.tr) + '</h4><div class="chgrid">' + g + '</div><a class="act" href="#biblia" data-act="close-sheet-nav">' + ic('book') + 'Ver todos los libros</a>');
  }

  /* ----- Lector de rangos (parashá / haftará) ----- */
  async function rangeHTML(r, aliyot) {
    const d = await getBookV(r.b);
    const s = parseCV(r.s), e = parseCV(r.e);
    const starts = {}; (aliyot || []).forEach((a, i) => { starts[a.s] = i + 1; });
    let html = '';
    for (let c = s.c; c <= e.c; c++) {
      const ch = d.c[c - 1]; const v0 = c === s.c ? s.v : 1; const v1 = c === e.c ? e.v : ch.length;
      if (c !== s.c) html += '<p class="chap-break">' + esc(bookName(r.b)) + ' ' + c + '</p>';
      if (v0 === 1 && d.t && d.t[c]) html += '<div class="psalm-title"><p class="he" lang="he">' + esc(heb(d.t[c])) + '</p></div>';
      for (let v = v0; v <= v1; v++) {
        const k = c + ':' + v;
        if (starts[k] && aliyot.length > 1) html += '<p class="aliyah">' + (starts[k] === 7 ? 'Séptima aliyá (Shevií)' : 'Aliyá ' + starts[k]) + '</p>';
        html += verseHTML(r.b, c, v, ch[v - 1], { anchor: c + '-' + v });
      }
    }
    return html;
  }
  async function vLectura(n, haft) {
    const P = await getJSON('parashiot.json'); const p = P[n - 1]; if (!p) return vNotFound();
    view().innerHTML = top(esc(p.tr), { back: 'parasha-' + n }) + '<div class="loading">Preparando la lectura…</div>';
    const ranges = haft ? ((prefs.haft === 'seph' && p.seph) ? p.seph : p.haft) : [p.lec];
    let body = '';
    for (const r of ranges) body += (ranges.length > 1 ? '<p class="aliyah">' + esc(fmtRange(r)) + '</p>' : '') + await rangeHTML(r, haft ? null : p.aliyot);
    view().innerHTML = top((haft ? 'Haftará de ' : '') + esc(p.tr), { back: 'parasha-' + n, right: verBtn() + readerTools() }) +
      '<div class="wrap ' + viewClass() + '"><div class="reader-head"><p class="he" lang="he">' + esc(p.he) + '</p><h2>' + (haft ? 'Haftará' : 'Lectura de la Torá') + '</h2>' +
      '<p class="context">' + ranges.map(r => esc(fmtRange(r))).join('; ') + (haft ? '. Costumbre: ' + (prefs.haft === 'seph' && p.seph ? 'sefaradí' : 'ashkenazí') + ' (se cambia en Configuración).' : '') + '</p></div>' +
      '<div class="verses">' + body + '</div>' +
      '<div class="btns" style="margin:24px 0"><a class="btn" href="#parasha-' + n + '">Volver al estudio</a>' + (haft ? '' : '<a class="btn" href="#haftara-' + n + '">Leer la haftará</a>') + '</div></div>';
    window.scrollTo(0, 0);
  }

  /* ----- Parashiot ----- */
  async function vParashiot() {
    const P = await getJSON('parashiot.json'); const w = await weekInfo();
    const cur = new Set(w ? w.list.map(p => p.n) : []);
    const done = Store.get('studied', {}); const nd = Object.keys(done).length;
    const groups = [['GEN', 'Bereshit', 'בְּרֵאשִׁית'], ['EXO', 'Shemot', 'שְׁמוֹת'], ['LEV', 'Vayikrá', 'וַיִּקְרָא'], ['NUM', 'Bamidbar', 'בְּמִדְבַּר'], ['DEU', 'Devarim', 'דְּבָרִים']];
    let html = '';
    for (const [code, name, he] of groups) {
      html += '<div class="group-title"><h3>' + name + '</h3><span class="he" lang="he">' + he + '</span></div><div class="rows">';
      P.filter(p => p.lec.b === code).forEach(p => {
        html += '<a class="row' + (cur.has(p.n) ? ' current' : '') + '" href="#parasha-' + p.n + '"><span class="num">' + p.n + '</span><span class="t"><b>' + esc(p.tr) + '</b><span>' + esc(p.sig) + (cur.has(p.n) ? '. Esta semana' : '') + '</span></span>' +
          (done[p.n] ? '<span class="done" aria-label="Estudiada">' + ic('check', ' width="18" height="18"') + '</span>' : '') + '<span class="he" lang="he">' + esc(p.he) + '</span></a>';
      });
      html += '</div>';
    }
    view().innerHTML = top('Parashiot') + '<div class="wrap">' +
      '<div class="reader-head"><p class="he" lang="he">פָּרָשׁוֹת הַשָּׁבוּעַ</p><h2>Las 54 parashiot</h2><p class="muted" style="margin:0">Ciclo anual de lectura de la Torá. Calendario: ' + (prefs.cal === 'israel' ? 'Israel' : 'diáspora') + '.</p></div>' +
      '<p style="margin:12px 0 0;font-size:.92rem">Tu progreso: ' + nd + ' de 54 estudiadas</p><div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="54" aria-valuenow="' + nd + '"><i style="width:' + (nd / 54 * 100) + '%"></i></div>' +
      html + '</div>';
  }
  async function vParasha(n) {
    const P = await getJSON('parashiot.json'); const p = P[n - 1]; if (!p) return vNotFound();
    const w = await weekInfo(); const isCur = w && w.list.some(x => x.n === n);
    const done = Store.get('studied', {})[n]; const saved = isFav('p-' + n);
    const haft = (prefs.haft === 'seph' && p.seph) ? p.seph : p.haft;
    const prev = P[n - 2], next = P[n];
    view().innerHTML = top(esc(p.tr), { back: 'parashiot', right: '<button class="icon-btn" data-act="p-share" data-n="' + n + '" aria-label="Compartir">' + ic('share') + '</button>' }) +
      '<div class="wrap study"><div class="reader-head"><p class="he parasha-name" lang="he">' + esc(p.he) + '</p><h2>' + esc(p.tr) + '</h2>' +
      '<p class="muted" style="margin:0">' + esc(p.sig) + '. Parashá ' + n + ' de 54' + (isCur ? '. Lectura de esta semana' : '') + '</p></div>' +
      '<dl class="meta"><dt>Libro</dt><dd>' + esc(BY[p.lec.b].tr) + ' (' + esc(BY[p.lec.b].es) + ')</dd>' +
      '<dt>Lectura</dt><dd><a href="#lectura-' + n + '">' + esc(fmtRange(p.lec)) + '</a></dd>' +
      '<dt>Haftará</dt><dd>' + haft.map(r => '<a href="#haftara-' + n + '">' + esc(fmtRange(r)) + '</a>').join('; ') + (p.seph ? '<br><span class="muted" style="font-size:.85rem">Costumbre ' + (prefs.haft === 'seph' ? 'sefaradí' : 'ashkenazí') + '</span>' : '') + '</dd></dl>' +
      '<div class="btns"><a class="btn solid" href="#lectura-' + n + '">' + ic('scroll') + 'Leer la parashá</a><a class="btn" href="#haftara-' + n + '">Haftará</a><a class="btn" href="#vocabparasha-' + n + '">' + ic('alef') + 'Hebreo de esta parashá</a></div>' +
      '<h2>Resumen</h2><p>' + esc(p.res) + '</p>' +
      '<h2>Personajes principales</h2><p>' + p.per.map(esc).join(', ') + '.</p>' +
      '<h2>Temas centrales</h2><ul>' + p.temas.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul>' +
      (p.aliyot.length ? '<h2>Las siete aliyot</h2><div class="rows">' + p.aliyot.map((a, i) => '<a class="row" href="#leer-' + a.b + '-' + parseCV(a.s).c + '-' + parseCV(a.s).v + '"><span class="num">' + (i + 1) + '</span><span class="t"><b>' + esc(fmtRange(a)) + '</b></span></a>').join('') + '</div>' : '') +
      '<p class="notice">El estudio completo de esta parashá (contexto histórico y cultural, palabras hebreas, conexiones con la Haftará y el Brit Hadashá, aplicación y preguntas) está en preparación para la Etapa 3.</p>' +
      '<div class="btns"><button class="btn' + (done ? ' solid' : '') + '" data-act="p-done" data-n="' + n + '">' + ic('check') + (done ? 'Estudiada' : 'Marcar como estudiada') + '</button>' +
      '<button class="btn" data-act="p-save" data-n="' + n + '">' + ic('star') + (saved ? 'Guardada' : 'Guardar') + '</button></div>' +
      '<nav class="pager">' + (prev ? '<a href="#parasha-' + prev.n + '"><small>Anterior</small>' + esc(prev.tr) + '</a>' : '<span></span>') + (next ? '<a class="next" href="#parasha-' + next.n + '"><small>Siguiente</small>' + esc(next.tr) + '</a>' : '<span></span>') + '</nav>' +
      '</div>';
    window.scrollTo(0, 0);
  }

  /* ----- Estudios ----- */
  async function vEstudios() {
    const E = await getJSON('estudios.json');
    view().innerHTML = top('Estudios', { back: 'menu' }) + '<div class="wrap">' +
      '<div class="reader-head"><p class="he" lang="he">בֵּית מִדְרָשׁ</p><h2>Biblioteca de estudios</h2></div>' +
      '<div class="group-title"><h3>Disponible ahora</h3></div><div class="rows">' +
      '<a class="row" href="#parashiot"><span class="t"><b>Estudios de las parashiot</b><span>54 porciones con resumen, personajes, temas y lectura bilingüe</span></span><span class="pill ok">Disponible</span></a>' +
      '<a class="row" href="#vocabulario"><span class="t"><b>Estudios de palabras hebreas</b><span>Vocabulario con referencias verificadas</span></span><span class="pill ok">Disponible</span></a>' +
      '<a class="row" href="#calendario"><span class="t"><b>Moedim</b><span>Tiempos señalados con referencias bíblicas</span></span><span class="pill ok">Disponible</span></a></div>' +
      '<div class="group-title"><h3>Categorías temáticas</h3></div>' +
      '<p class="muted" style="font-size:.92rem;margin:0 0 6px">Los estudios temáticos completos se incorporarán en la Etapa 4. Cada categoría mostrará sus estudios cuando estén publicados.</p><div class="rows">' +
      E.categorias.map(c => { const n = E.estudios.filter(s => s.cat === c).length; return '<div class="row"><span class="t"><b>' + esc(c) + '</b></span><span class="pill' + (n ? ' ok' : '') + '">' + (n ? n + ' estudios' : 'En preparación') + '</span></div>'; }).join('') +
      '</div></div>';
  }

  /* ----- Guardados ----- */
  async function vGuardados(tab) {
    tab = tab || 'versiculos';
    const f = favs(); const marks = Store.get('marks', []);
    const P = await getJSON('parashiot.json');
    const tabs = [['versiculos', 'Favoritos'], ['destacados', 'Destacados'], ['notas', 'Notas'], ['marcadores', 'Marcadores'], ['parashiot', 'Parashiot'], ['mensajes', 'Mensajes']];
    let body = '';
    if (tab === 'destacados') body = await destacadosHTML();
    else if (tab === 'notas') body = await notasHTML();
    else if (tab === 'versiculos') {
      const vs = f.filter(x => x.type === 'v');
      if (!vs.length) body = '<div class="empty"><p>Toca cualquier versículo mientras lees y elige «Guardar en favoritos».</p><a class="btn" href="#biblia">Abrir la Biblia</a></div>';
      else for (const x of vs) { const { b, c, v, cell } = await verseData(x.id); body += '<a class="result" href="#leer-' + b + '-' + c + '-' + v + '"><b>' + esc(bookName(b)) + ' ' + c + ':' + v + '</b>' + (cell[1] ? '<p class="he" lang="he">' + esc(heb(cell[1])) + '</p>' : '') + esHTML(cell) + '</a>'; }
    } else if (tab === 'marcadores') {
      body = marks.length ? '<div class="rows">' + marks.map(m => { const [b, c] = m.id.split('-'); return '<a class="row" href="#leer-' + b + '-' + c + '"><span class="t"><b>' + esc(m.label) + '</b><span>' + esc(fmtDate(new Date(m.t), { day: 'numeric', month: 'short', year: 'numeric' })) + '</span></span><span class="he">' + esc(BY[b].he) + '</span></a>'; }).join('') + '</div>'
        : '<div class="empty"><p>Usa el botón de marcador en la parte superior del lector para marcar un capítulo.</p></div>';
    } else if (tab === 'parashiot') {
      const ps = f.filter(x => x.type === 'p');
      body = ps.length ? '<div class="rows">' + ps.map(x => { const p = P[x.n - 1]; return '<a class="row" href="#parasha-' + p.n + '"><span class="num">' + p.n + '</span><span class="t"><b>' + esc(p.tr) + '</b><span>' + esc(p.sig) + '</span></span><span class="he">' + esc(p.he) + '</span></a>'; }).join('') + '</div>'
        : '<div class="empty"><p>Guarda una parashá desde su página de estudio.</p><a class="btn" href="#parashiot">Ver parashiot</a></div>';
    } else {
      const ms = f.filter(x => x.type === 'm'); const M = await getJSON('mensajes.json');
      body = ms.length ? '<div class="rows">' + ms.map(x => { const m = M[x.i]; return m ? '<a class="row" href="#mensaje-' + x.i + '"><span class="t"><b>' + esc(m.titulo) + '</b><span>' + esc(refLabel(m.ref)) + '</span></span></a>' : ''; }).join('') + '</div>'
        : '<div class="empty"><p>Guarda un mensaje diario para volver a leerlo.</p><a class="btn" href="#mensaje">Ver el mensaje de hoy</a></div>';
    }
    view().innerHTML = top('Guardados') + '<div class="wrap"><div class="seg tabs-scroll">' + tabs.map(([k, l]) => '<button data-go="guardados-' + k + '" aria-pressed="' + (k === tab) + '">' + l + '</button>').join('') + '</div>' + body + '</div>';
    const act = document.querySelector('.tabs-scroll [aria-pressed="true"]'); if (act) act.scrollIntoView({ inline: 'center', block: 'nearest' });
  }

  /* ----- Mis versículos destacados ----- */
  let hlFilter = '';
  async function destacadosHTML() {
    const H = HL(); const ids = Object.keys(H).sort((a, b) => idOrder(a) - idOrder(b));
    if (!ids.length) return '<div class="empty"><p>Toca un versículo mientras lees y elige un color para destacarlo.</p><a class="btn" href="#biblia">Abrir la Biblia</a></div>';
    const counts = {}; ids.forEach(id => counts[H[id]] = (counts[H[id]] || 0) + 1);
    let html = '<h2 class="sec-title">Mis versículos destacados</h2><div class="chips"><button class="chip' + (!hlFilter ? ' on' : '') + '" data-act="hl-filter" data-c="">Todos (' + ids.length + ')</button>' +
      COLORS.filter(([k]) => counts[k]).map(([k, n]) => '<button class="chip' + (hlFilter === k ? ' on' : '') + '" data-act="hl-filter" data-c="' + k + '"><i class="dot sw-' + k + '"></i>' + n + ' (' + counts[k] + ')</button>').join('') + '</div>';
    for (const [k, n] of COLORS) {
      if (hlFilter && hlFilter !== k) continue;
      const g = ids.filter(id => H[id] === k); if (!g.length) continue;
      html += '<div class="group-title"><h3><i class="dot sw-' + k + '"></i> ' + n + '</h3></div>';
      for (const id of g) { const { b, c, v, cell } = await verseData(id); html += '<a class="result hlc hlc-' + k + '" href="#leer-' + b + '-' + c + '-' + v + '"><b>' + esc(refOfId(id)) + '</b>' + (cell[1] ? '<p class="he" lang="he">' + esc(heb(cell[1])) + '</p>' : '') + '<p>' + es(cell[0], true) + '</p></a>'; }
    }
    return html;
  }
  /* ----- Mis notas bíblicas ----- */
  let noteQ = '', noteBook = '', noteSort = 'm';
  async function notasHTML() {
    const N = NOTES(); let ids = Object.keys(N);
    if (!ids.length) return '<div class="empty"><p>Toca un versículo y elige «Agregar nota» para escribir tu reflexión.</p><a class="btn" href="#biblia">Abrir la Biblia</a></div>';
    const books = [...new Set(ids.map(id => id.split('-')[0]))].sort((a, b) => BOOKS.findIndex(x => x.c === a) - BOOKS.findIndex(x => x.c === b));
    const nq = norm(noteQ);
    ids = ids.filter(id => (!noteBook || id.split('-')[0] === noteBook) && (!nq || norm(N[id].t + ' ' + refOfId(id)).includes(nq)));
    ids.sort((a, b) => noteSort === 'ref' ? idOrder(a) - idOrder(b) : noteSort === 'c' ? N[b].c - N[a].c : N[b].m - N[a].m);
    let html = '<h2 class="sec-title">Mis notas bíblicas</h2><div class="field">' + ic('search') + '<input type="search" data-act="note-q" placeholder="Buscar en mis notas o por referencia" value="' + esc(noteQ) + '" aria-label="Buscar notas"></div>' +
      '<div class="note-filters"><select data-act="note-book" aria-label="Filtrar por libro"><option value="">Todos los libros</option>' + books.map(b => '<option value="' + b + '"' + (b === noteBook ? ' selected' : '') + '>' + esc(bookName(b)) + '</option>').join('') + '</select>' +
      '<select data-act="note-sort" aria-label="Ordenar"><option value="m"' + (noteSort === 'm' ? ' selected' : '') + '>Última modificación</option><option value="c"' + (noteSort === 'c' ? ' selected' : '') + '>Fecha de creación</option><option value="ref"' + (noteSort === 'ref' ? ' selected' : '') + '>Orden bíblico</option></select></div>';
    if (!ids.length) html += '<p class="muted">Ninguna nota coincide.</p>';
    for (const id of ids) {
      const { b, c, v, cell } = await verseData(id); const n = N[id];
      html += '<div class="note-card"><a href="#leer-' + b + '-' + c + '-' + v + '"><b>' + esc(refOfId(id)) + '</b></a><p class="note-verse">' + es(cell[0], true) + '</p>' + noteHTML(n) +
        '<p class="muted note-date">Creada: ' + esc(new Date(n.c).toLocaleDateString('es')) + (n.m !== n.c ? '. Modificada: ' + esc(new Date(n.m).toLocaleDateString('es')) : '') + '</p><button class="btn" data-act="v-note" data-id="' + id + '">Editar</button></div>';
    }
    return html;
  }

  /* ----- Menú ----- */
  function vMenu() {
    const items = [['estudios', 'study', 'Estudios', 'בֵּית מִדְרָשׁ'], ['aprender', 'alef', 'Yo aprendo hebreo con la Torá', 'עִבְרִית'], ['pealim', 'text', 'PEALIM: verbos hebreos', 'פְּעָלִים'], ['guardados-destacados', 'star', 'Mis versículos destacados', ''], ['guardados-notas', 'copy', 'Mis notas bíblicas', ''], ['mensaje', 'day', 'Mensaje diario', 'דְּבַר הַיּוֹם'], ['calendario', 'cal', 'Calendario bíblico', 'לוּחַ'], ['vocabulario', 'alef', 'Diccionario hebreo', 'מִלּוֹן'], ['historial', 'hist', 'Historial de lectura', ''], ['acerca', 'info', 'Acerca de Beit Hatzirah', ''], ['ajustes', 'gear', 'Configuración', '']];
    view().innerHTML = top('Menú', { back: 'inicio' }) + '<div class="wrap"><div class="rows" style="margin-top:12px">' +
      items.map(([r, i, t, h]) => '<a class="row" href="#' + r + '"><span style="color:var(--accent)">' + ic(i, ' width="22" height="22"') + '</span><span class="t"><b>' + t + '</b></span>' + (h ? '<span class="he" lang="he">' + h + '</span>' : '') + '</a>').join('') +
      '</div><p class="muted center" style="font-size:.85rem;margin-top:24px">Versión ' + VERSION + '</p></div>';
  }

  /* ----- Mensaje diario ----- */
  async function vMensaje(idx) {
    const M = await getJSON('mensajes.json'); const today = new Date(); const di = dayIndex(today);
    const i = idx == null ? di % M.length : idx; const m = M[i]; if (!m) return vNotFound();
    const date = idx == null ? today : null;
    const [b, cv] = m.ref.split(' '); const { c, v } = parseCV(cv);
    const cell = (await getBookV(b)).c[c - 1][v - 1];
    const saved = isFav('m-' + i);
    let hist = ''; for (let k = 1; k <= 6; k++) { const j = (di - k) % M.length; const d = new Date(today); d.setDate(d.getDate() - k); hist += '<a class="row" href="#mensaje-' + ((j + M.length) % M.length) + '"><span class="t"><b>' + esc(M[(j + M.length) % M.length].titulo) + '</b><span>' + esc(fmtDate(d, { weekday: 'long', day: 'numeric', month: 'long' })) + '</span></span></a>'; }
    view().innerHTML = top('Mensaje diario', { back: 'inicio' }) + '<div class="wrap study daily">' +
      '<div class="reader-head"><p class="he" lang="he">דְּבַר הַיּוֹם</p>' + (date ? '<p class="date">' + esc(fmtDate(date)) + '<br>' + esc(hebDate(date)) + '</p>' : '') + '<h2>' + esc(m.titulo) + '</h2></div>' +
      (cell[1] ? '<p class="he big" lang="he">' + esc(heb(cell[1])) + '</p>' : '') +
      '<p class="v-ref" style="color:var(--accent);font-weight:600;margin:0 0 6px"><a href="#leer-' + b + '-' + c + '-' + v + '" style="color:inherit">' + esc(bookName(b)) + ' ' + c + ':' + v + '</a></p>' +
      '<blockquote lang="es">' + es(cell[0], true) + '</blockquote>' +
      '<h2>Reflexión</h2><p>' + esc(m.reflexion) + '</p><h2>Enseñanza práctica</h2><p>' + esc(m.ensenanza) + '</p><h2>Para meditar</h2><p><i>' + esc(m.pregunta) + '</i></p><p style="color:var(--accent)">' + esc(m.cierre) + '</p>' +
      '<p class="muted" style="font-size:.82rem">La reflexión, la enseñanza y la pregunta son comentario de Beit Hatzirah, no texto bíblico.</p>' +
      '<div class="btns"><button class="btn solid" data-act="m-wa" data-i="' + i + '">' + ic('wa') + 'WhatsApp</button><button class="btn" data-act="m-img" data-i="' + i + '">' + ic('image') + 'Imagen</button><button class="btn" data-act="m-copy" data-i="' + i + '">' + ic('copy') + 'Copiar</button><button class="btn" data-act="m-save" data-i="' + i + '">' + ic('star') + (saved ? 'Guardado' : 'Guardar') + '</button></div>' +
      '<div class="group-title"><h3>Mensajes anteriores</h3></div><div class="rows">' + hist + '</div></div>';
    window.scrollTo(0, 0);
  }
  async function messageText(i) {
    const M = await getJSON('mensajes.json'); const m = M[i]; const t = await verseText(m.ref.replace(' ', '-').replace(':', '-'));
    return m.titulo + '\n\n' + t + '\n\n' + m.reflexion + '\n\n' + m.pregunta + '\n\n' + m.cierre + SIGN;
  }

  /* ----- Calendario ----- */
  async function vCalendario(year) {
    const [C, MO] = await Promise.all([getJSON('calendario.json'), getJSON('moedim.json')]);
    const years = Object.keys(C.moedim).map(Number);
    const now = new Date(); year = year || (years.includes(now.getFullYear()) ? now.getFullYear() : years[0]);
    const Y = C.moedim[year]; const todayISO = iso(now);
    const diasp = prefs.cal !== 'israel';
    const sh = nextShabbat(); const w = await weekInfo();
    const dateOf = id => { const v = Y[id]; return Array.isArray(v) ? v : v ? [v] : []; };
    const fmtD = s => fmtDate(fromISO(s), { weekday: 'short', day: 'numeric', month: 'long' });
    const eve = s => { const d = fromISO(s); d.setDate(d.getDate() - 1); return fmtDate(d, { weekday: 'short', day: 'numeric', month: 'short' }); };
    const dates = {}; let nextId = null; let nextDate = '9999';
    MO.forEach(m => { if (m.id === 'shabat') return; const ds = dateOf(m.id); if (ds[0] && ds[0] >= todayISO && ds[0] < nextDate) { nextDate = ds[0]; nextId = m.id; } });
    const items = MO.map(m => {
      let when = '';
      if (m.id === 'shabat') when = 'Próximo: ' + fmtDate(sh, { weekday: 'long', day: 'numeric', month: 'long' }) + (w ? ' (' + w.list.map(p => p.tr).join('–') + ')' : '');
      else {
        const ds = dateOf(m.id);
        if (ds.length === 2) when = fmtD(ds[0]) + ' al ' + fmtD(ds[1]); else if (ds.length) when = fmtD(ds[0]);
        if (ds.length && m.id === 'pesaj') when += '. Esa noche, al comenzar el 15 de Nisán, se celebra el séder';
        else if (ds.length) when += '. Comienza al atardecer del ' + eve(ds[0]);
        if (m.id === 'bikurim') when = '16 de Nisán: ' + fmtD(Y.bikurim) + '. Domingo durante Matzot: ' + fmtD(Y.bikurimAlt);
        if (m.id === 'shavuot') when = '6 de Siván: ' + fmtD(Y.shavuot) + '. Según la cuenta desde el domingo: ' + fmtD(Y.omerAlt);
        if (diasp && ['pesaj', 'shavuot', 'sukkot', 'sheminiAtzeret', 'matzot'].includes(m.id)) when += '. En la diáspora se agrega un día festivo.';
      }
      const refs = m.refs.map(r => '<a href="#' + refRoute(r) + '">' + esc(refLabel(r)) + '</a>').join(', ');
      return '<details class="moed' + (m.id === nextId ? ' next' : '') + '"><summary><span class="t"><b>' + esc(m.tr) + '</b>' + (m.id === nextId ? ' <span class="pill ok">Próximo</span>' : '') + '<span>' + esc(when) + '</span></span><span class="he" lang="he">' + esc(m.he) + '</span></summary>' +
        '<div class="body study"><dl class="meta"><dt>Significado</dt><dd>' + esc(m.sig) + '</dd><dt>Fecha hebrea</dt><dd>' + esc(m.fecha) + '</dd><dt>Referencias</dt><dd>' + refs + '</dd></dl>' +
        '<p>' + esc(m.explicacion) + '</p><p>' + esc(m.contexto) + '</p><p><b>Enseñanza:</b> ' + esc(m.ensenanza) + '</p></div></details>';
    }).join('');
    view().innerHTML = top('Calendario bíblico', { back: 'menu' }) + '<div class="wrap">' +
      '<div class="reader-head"><p class="he" lang="he">מוֹעֲדֵי ה׳</p><h2>Moedim ' + year + '</h2><p class="muted" style="margin:0">Hoy: ' + esc(hebDate(now)) + '</p></div>' +
      '<div class="opt"><span class="t">Año</span><select data-act="cal-year" aria-label="Año">' + years.map(y => '<option' + (y === year ? ' selected' : '') + '>' + y + '</option>').join('') + '</select></div>' +
      '<div class="opt"><span class="t">Criterio<span>' + (diasp ? 'Diáspora' : 'Israel') + ' (cámbialo en Configuración)</span></span></div>' +
      '<div style="margin-top:8px">' + items + '</div>' +
      '<p class="notice">Las fechas son calculadas con el calendario hebreo fijo (tradicional). Las comunidades que siguen la observación de la luna nueva o del aviv pueden celebrar en fechas distintas. Cada fiesta comienza al atardecer del día anterior.</p></div>';
  }

  /* ----- Vocabulario ----- */
  async function vVocabulario(q) {
    const V0 = await getJSON('vocabulario.json');
    let A = null; try { A = await getJSON('aprender.json'); } catch (e) { }
    const CAT = { 'w-tov': 'adjetivo', 'w-kadosh': 'adjetivo', 'w-ejad': 'numeral' };
    const seen = new Set(V0.map(w => hebPlain(w.he)));
    const extra = [];
    if (A) A.worlds.forEach(wd => wd.units.forEach(u => { if (u.type !== 'words') return; u.items.forEach(it => {
      if (seen.has(hebPlain(it.he))) return; seen.add(hebPlain(it.he));
      const verb = wd.id === 'w7';
      extra.push({ he: it.he, tr: it.tr, es: it.es, pr: '', ref: it.ref, q: hebPlain(it.he), nota: '', cat: verb ? 'verbo' : (CAT[it.id] || 'sustantivo'), raiz: verb ? hebPlain(it.he).split('').join('־') : '', unit: u.id, uname: u.name });
    }); }));
    const V = V0.concat(extra);
    const nq = q ? norm(q) : '';
    const list = nq ? V.filter(w => norm(w.tr + ' ' + w.es).includes(nq) || hebPlain(w.he).includes(hebPlain(q))) : V;
    view().innerHTML = top('Diccionario hebreo', { back: 'menu' }) + '<div class="wrap">' +
      '<div class="field">' + ic('search') + '<input type="search" placeholder="Buscar palabra (español, transliteración o hebreo)" value="' + esc(q || '') + '" data-act="vocab-q" aria-label="Buscar palabra"></div>' +
      '<p class="muted" style="font-size:.88rem">' + V.length + ' palabras. Las del curso «Yo aprendo hebreo» se pueden practicar en su unidad.</p>' +
      list.map(w => '<div class="word"><span class="he" lang="he">' + esc(w.he) + '</span><b>' + esc(w.tr) + (w.pr ? ' <span class="muted" style="font-weight:400;font-size:.9rem">/' + esc(w.pr) + '/</span>' : '') + '</b><span>' + esc(w.es) + '</span><span class="muted" style="font-size:.88rem">' + (w.cat ? esc(w.cat) + (w.raiz ? ', raíz ' + esc(w.raiz) : '') + '. ' : '') + (w.nota ? esc(w.nota) : 'Aparece en ' + esc(refLabel(w.ref))) + '</span>' +
        '<div class="actions"><a href="#' + refRoute(w.ref) + '">Ver ' + esc(refLabel(w.ref)) + '</a><button data-act="vocab-search" data-q="' + esc(w.q) + '">Buscar en las Escrituras</button>' + (w.unit ? '<a href="#leccion-' + w.unit + '-l">Practicar</a>' : '') + '</div></div>').join('') +
      (list.length ? '' : '<div class="empty">No hay palabras que coincidan.</div>') +
      '<p class="muted" style="font-size:.82rem;margin-top:16px">La pronunciación es orientativa. La búsqueda en las Escrituras encuentra la forma escrita de la palabra (también con prefijos o sufijos).</p></div>';
  }

  /* ----- Historial ----- */
  function vHistorial() {
    const h = Store.get('hist', []);
    view().innerHTML = top('Historial de lectura', { back: 'menu' }) + '<div class="wrap">' +
      (h.length ? '<div class="rows" style="margin-top:12px">' + h.map(x => '<a class="row" href="#leer-' + x.b + '-' + x.c + '"><span class="t"><b>' + esc(bookName(x.b)) + ' ' + x.c + '</b><span>' + esc(new Date(x.t).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })) + '</span></span><span class="he">' + esc(BY[x.b].he) + '</span></a>').join('') + '</div>'
        : '<div class="empty"><p>Aquí aparecerán los capítulos que leas.</p><a class="btn" href="#biblia">Comenzar a leer</a></div>') + '</div>';
  }

  /* ----- Acerca ----- */
  function vAcerca() {
    view().innerHTML = top('Acerca de Beit Hatzirah', { back: 'menu' }) + '<div class="wrap study about">' +
      '<div class="about-name"><h2>ACERCA DE BEIT HATZIRAH</h2><p class="he" lang="he">בית הצרעה</p></div>' +
      '<div class="about-text">' +
      '<p>Beit Hatzirah es el Centro de Investigación Torática de la Kehilat Shivateinu Bayit, dirigido por el Ha’Roeh Eliyah ben Eleazar.</p>' +
      '<p>Nuestra misión es traer a la existencia el Reino en nuestras vidas, poniendo en ejecución y práctica toda la base torática. No buscamos que la Toráh sea solamente conocimiento, lectura o teoría, sino que se convierta en una realidad vivida: una forma de caminar, actuar, pensar y manifestar los principios del Reino en nuestra vida cotidiana.</p>' +
      '<p>Beit Hatzirah busca profundizar en la medida espiritual y en el nivel de obediencia, entrega y compromiso que alcanzaron hombres de las Escrituras como Yahoshua y Shimshon, comprendiendo sus caminos, sus acciones y las enseñanzas que podemos extraer de sus vidas.</p>' +
      '<p>Todo este proceso debe desarrollarse bajo un principio fundamental: la honra al liderazgo establecido. Reconocemos la importancia del orden, la autoridad espiritual, la instrucción y la honra hacia quienes han sido puestos para guiar y enseñar a la comunidad.</p>' +
      '<p>Este centro existe para investigar, estudiar, comprender y llevar a la práctica los fundamentos de la Toráh, procurando que cada enseñanza produzca una transformación real en nuestras vidas y en nuestra comunidad.</p>' +
      '<p class="about-quote">La Toráh no es solamente para ser estudiada; es para ser vivida y puesta en ejecución.</p>' +
      '<div class="about-sign"><b>Moreh Gabriel ben Eliyah</b><span>Proyecto y dirección de contenido — Beit Hatzirah</span></div>' +
      '</div></div>';
  }

  /* ----- Configuración ----- */
  function sw(on, act, label) { return '<button class="switch" role="switch" aria-checked="' + on + '" data-act="' + act + '" aria-label="' + label + '"></button>'; }
  function vAjustes() {
    const canInstall = !!deferredPrompt;
    const swOn = 'serviceWorker' in navigator && !EMBED && location.protocol !== 'file:';
    view().innerHTML = top('Configuración', { back: 'menu' }) + '<div class="wrap">' +
      '<div class="group-title"><h3>Lectura</h3></div>' +
      '<div class="opt"><span class="t">Tamaño de letra<span>' + Math.round(prefs.scale * 100) + '%</span></span><span class="size-ctl"><button data-act="size-" aria-label="Reducir">A−</button><button data-act="size+" aria-label="Aumentar">A+</button></span></div>' +
      '<div class="opt"><span class="t">Idioma visible<span>Hebreo y español, solo hebreo o solo español</span></span><select data-act="set-view"><option value="ambos"' + (prefs.view === 'ambos' ? ' selected' : '') + '>Ambos</option><option value="he"' + (prefs.view === 'he' ? ' selected' : '') + '>Hebreo</option><option value="es"' + (prefs.view === 'es' ? ' selected' : '') + '>Español</option></select></div>' +
      '<div class="opt"><span class="t">Signos de cantilación<span>Mostrar los te\'amim además de las vocales</span></span>' + sw(prefs.teamim, 'tg-teamim', 'Signos de cantilación') + '</div>' +
      '<div class="opt"><span class="t">Nombres hebreos<span>Adaptación de nombres sobre la Reina-Valera 1909</span></span>' + sw(prefs.nombres, 'tg-nombres', 'Nombres hebreos') + '</div>' +
      '<div class="opt"><span class="t">Traducción al español<span>' + esc(VERDESC[prefs.ver]) + '</span></span><select data-act="set-ver-sel">' + Object.keys(VERS).map(k => '<option value="' + k + '"' + (prefs.ver === k ? ' selected' : '') + '>' + esc(VERS[k].short) + '</option>').join('') + '</select></div>' +
      (prefs.ver === 'rv' ? '<div class="opt"><span class="t">Ortografía actualizada<span>Moderniza los acentos de 1909</span></span>' + sw(prefs.orto, 'tg-orto', 'Ortografía actualizada') + '</div>' : '') +
      '<div class="group-title"><h3>Apariencia</h3></div>' +
      '<div class="opt"><span class="t">Tema</span><select data-act="set-theme"><option value="auto"' + (prefs.theme === 'auto' ? ' selected' : '') + '>Según el teléfono</option><option value="dark"' + (prefs.theme === 'dark' ? ' selected' : '') + '>Oscuro</option><option value="light"' + (prefs.theme === 'light' ? ' selected' : '') + '>Claro</option></select></div>' +
      '<div class="group-title"><h3>Calendario</h3></div>' +
      '<div class="opt"><span class="t">Lecturas y fiestas<span>Israel y la diáspora a veces leen parashiot distintas</span></span><select data-act="set-cal"><option value="diaspora"' + (prefs.cal === 'diaspora' ? ' selected' : '') + '>Diáspora</option><option value="israel"' + (prefs.cal === 'israel' ? ' selected' : '') + '>Israel</option></select></div>' +
      '<div class="opt"><span class="t">Costumbre de la haftará</span><select data-act="set-haft"><option value="ash"' + (prefs.haft === 'ash' ? ' selected' : '') + '>Ashkenazí</option><option value="seph"' + (prefs.haft === 'seph' ? ' selected' : '') + '>Sefaradí</option></select></div>' +
      '<div class="group-title"><h3>Aplicación</h3></div>' +
      (canInstall ? '<div class="opt"><span class="t">Instalar Beit Hatzirah<span>Añade la app a tu pantalla de inicio</span></span><button class="btn solid" data-act="install">Instalar</button></div>' : '') +
      (swOn ? '<div class="opt"><span class="t">Leer sin conexión<span id="offline-status">Guarda los 66 libros, las tres traducciones, el análisis hebreo y PEALIM en este teléfono (unos 32 MB)</span></span><button class="btn" data-act="offline">Guardar</button></div>' : '') +
      '<details class="moed"><summary><span class="t"><b>Cómo instalar en Android</b></span></summary><div class="body"><p>Abre la app en Chrome, toca el menú ⋮ y elige «Instalar aplicación» o «Agregar a pantalla principal».</p></div></details>' +
      '<details class="moed"><summary><span class="t"><b>Cómo instalar en iPhone</b></span></summary><div class="body"><p>Abre la app en Safari, toca el botón Compartir y elige «Agregar a pantalla de inicio».</p></div></details>' +
      '<div class="opt"><span class="t">Borrar datos guardados<span>Favoritos, marcadores, historial y preferencias de este teléfono</span></span><button class="btn" data-act="reset">Borrar</button></div>' +
      '<p class="muted" style="font-size:.85rem;margin-top:16px">Tus datos se guardan solo en este teléfono. Beit Hatzirah no pide registro ni recopila información personal.</p></div>';
  }

  /* ----- Búsqueda ----- */
  let searchQ = '';
  let searchToken = 0;
  function vBuscar() {
    view().innerHTML = top('Buscar', { back: 'biblia' }) + '<div class="wrap">' +
      '<form class="field" data-act="search-form" role="search">' + ic('search') + '<input type="search" name="q" placeholder="Palabra, frase o referencia (Juan 3:16)" value="' + esc(searchQ) + '" aria-label="Buscar" enterkeyhint="search"></form>' +
      '<div id="results">' + (searchQ ? '' : '<p class="muted">Escribe una referencia como «Bereshit 1:1» o «Salmos 23», o palabras en español o en hebreo. En hebreo puedes escribir sin vocales.</p>') + '</div></div>';
    if (searchQ) runSearch(searchQ); else setTimeout(() => { const i = $('#view input'); if (i) i.focus(); }, 50);
  }
  const QMAP = [['yahshua', 'jesus'], ['mashiaj', 'cristo'], ['elohim', 'dios'], ['adonay', 'jehova'], ['ruaj hakodesh', 'espiritu santo']];
  async function runSearch(q) {
    const tok = ++searchToken; const out = $('#results'); if (!out) return;
    q = q.trim(); if (!q) { out.innerHTML = ''; return; }
    let html = '';
    const ref = isHeb(q) ? null : parseRef(q);
    if (ref) html += '<a class="row" href="#leer-' + ref.b + '-' + ref.c + (ref.v ? '-' + ref.v : '') + '" style="border-top:1px solid var(--line)"><span class="t"><b>Ir a ' + esc(bookName(ref.b)) + ' ' + ref.c + (ref.v ? ':' + ref.v : '') + '</b><span>' + esc(BY[ref.b].es) + '</span></span><span class="he">' + esc(BY[ref.b].he) + '</span></a>';
    out.innerHTML = html + '<p class="loading" id="sprog">Buscando…</p>';
    if (q.length < 3 && !isHeb(q)) { $('#sprog').textContent = 'Escribe al menos 3 letras para buscar palabras.'; return; }
    const H = isHeb(q); const hq = H ? hebPlain(q) : '';
    const nq = norm(q);
    const found = []; const MAX = 300;
    for (let i = 0; i < BOOKS.length && found.length < MAX; i++) {
      const b = BOOKS[i];
      const p = $('#sprog'); if (p) p.textContent = 'Buscando en ' + b.tr + '…';
      let d; try { d = await getBookV(b.c); } catch (e) { continue; }
      if (tok !== searchToken) return;
      d.c.forEach((ch, ci) => ch.forEach((cell, vi) => {
        if (found.length >= MAX) return;
        if (H ? (cell[1] && hebPlain(cell[1]).includes(hq)) : (cell[0] && norm(es(cell[0])).includes(nq))) found.push([b.c, ci + 1, vi + 1, cell]);
      }));
    }
    if (tok !== searchToken) return;
    const hlEs = t => { t = es(t); const n = norm(t); const i = n.indexOf(nq); if (i < 0) return esc(t); return esc(t.slice(0, i)) + '<mark>' + esc(t.slice(i, i + nq.length)) + '</mark>' + esc(t.slice(i + nq.length)); };
    html += '<p class="muted" style="margin:16px 0 4px">' + 'Traducción: ' + esc(VERS[prefs.ver].name) + '. ' + (found.length >= MAX ? 'Más de ' + MAX + ' resultados; se muestran los primeros ' + MAX + '.' : found.length + ' resultado' + (found.length === 1 ? '' : 's') + '.') + '</p>';
    html += found.map(([b, c, v, cell]) => '<a class="result" href="#leer-' + b + '-' + c + '-' + v + '"><b>' + esc(bookName(b)) + ' ' + c + ':' + v + '</b>' + (H ? '<p class="he" lang="he">' + esc(heb(cell[1])) + '</p>' : '') + '<p>' + (H ? es(cell[0], true) : hlEs(cell[0])) + '</p></a>').join('');
    out.innerHTML = html;
  }

  function vNotFound() { view().innerHTML = top('Beit Hatzirah', { back: 'inicio' }) + '<div class="wrap empty"><p>Esta sección no existe.</p><a class="btn" href="#inicio">Ir al inicio</a></div>'; }

  /* ============ ENRUTADOR ============ */
  const EXT = window.BH_EXT || { routes: {}, act: {}, tabs: {} };
  const TAB = Object.assign({ inicio: 'inicio', biblia: 'biblia', libro: 'biblia', leer: 'biblia', buscar: 'biblia', parashiot: 'parashiot', parasha: 'parashiot', lectura: 'parashiot', haftara: 'parashiot', guardados: 'guardados' }, EXT.tabs);
  let firstRender = true;
  async function route() {
    closeSheet();
    const h = (location.hash || '#inicio').slice(1);
    const parts = h.split('-'); const r = EXT.routes[h] ? h : parts[0];
    if (EXT.leave) EXT.leave();
    document.querySelectorAll('.tabbar a').forEach(a => a.setAttribute('aria-current', a.dataset.tab === (TAB[r] || '') ? 'page' : 'false'));
    try {
      switch (r) {
        case 'inicio': await vInicio(); break;
        case 'biblia': vBiblia(parts[1] === 'nt'); break;
        case 'libro': vLibro(parts[1]); break;
        case 'leer': await vLeer(parts[1], +parts[2] || 1, +parts[3] || null); break;
        case 'buscar': vBuscar(); break;
        case 'parashiot': await vParashiot(); break;
        case 'parasha': await vParasha(+parts[1]); break;
        case 'lectura': await vLectura(+parts[1], false); break;
        case 'haftara': await vLectura(+parts[1], true); break;
        case 'estudios': await vEstudios(); break;
        case 'guardados': await vGuardados(parts[1]); break;
        case 'menu': vMenu(); break;
        case 'mensaje': await vMensaje(parts[1] != null ? +parts[1] : null); break;
        case 'calendario': await vCalendario(+parts[1] || null); break;
        case 'vocabulario': await vVocabulario(''); break;
        case 'historial': vHistorial(); break;
        case 'acerca': vAcerca(); break;
        case 'ajustes': vAjustes(); break;
        default: if (EXT.routes[r]) await EXT.routes[r](parts); else vNotFound();
      }
    } catch (e) {
      console.error(e);
      view().innerHTML = top('Beit Hatzirah', { back: 'inicio' }) + '<div class="wrap empty"><p>No se pudo abrir esta sección: ' + esc(e.message) + '</p><a class="btn" href="#inicio">Ir al inicio</a></div>';
    }
    if (!['leer', 'buscar'].includes(r)) window.scrollTo(0, 0);
    if (r === 'aprender' && history.scrollRestoration) { /* el mapa empieza arriba */ }
    if (firstRender) { firstRender = false; hideSplash(); }
  }
  const go = r => { if (location.hash.slice(1) === r) route(); else location.hash = r; };

  /* ============ ACCIONES ============ */
  const ACT = {
    'back': el => go(el.dataset.fallback || 'inicio'),
    'close-sheet': () => closeSheet(),
    'close-sheet-nav': () => setTimeout(closeSheet, 0),
    'chapters': el => chapterSheet(el.dataset.b),
    'toggle-view': () => {
      const order = ['ambos', 'he', 'es']; prefs.view = order[(order.indexOf(prefs.view) + 1) % 3]; savePrefs();
      toast(prefs.view === 'ambos' ? 'Hebreo y español' : prefs.view === 'he' ? 'Solo hebreo' : 'Solo español'); route();
    },
    'text-size': () => sheet('<h4>Tamaño de letra</h4><div class="opt"><span class="t">' + Math.round(prefs.scale * 100) + '%</span><span class="size-ctl"><button data-act="size-">A−</button><button data-act="size+">A+</button></span></div>'),
    'size-': () => { prefs.scale = Math.max(.8, +(prefs.scale - .1).toFixed(2)); savePrefs(); refreshSize(); },
    'size+': () => { prefs.scale = Math.min(1.8, +(prefs.scale + .1).toFixed(2)); savePrefs(); refreshSize(); },
    'mark': el => {
      let m = Store.get('marks', []); const id = el.dataset.id; const has = m.some(x => x.id === id);
      m = has ? m.filter(x => x.id !== id) : [{ id, label: el.dataset.label, t: Date.now() }].concat(m);
      Store.set('marks', m); toast(has ? 'Marcador quitado' : 'Marcador añadido');
      el.setAttribute('aria-pressed', !has); el.innerHTML = ic('mark', !has ? ' fill="currentColor"' : '');
    },
    'v-copy': async el => { closeSheet(); copy(await verseText(el.dataset.id) + SIGN); },
    'v-wa': async el => { closeSheet(); shareWA(await verseText(el.dataset.id) + SIGN); },
    'v-share': async el => { closeSheet(); share(await verseText(el.dataset.id) + SIGN); },
    'v-fav': el => {
      const id = el.dataset.id; const now = toggleFav({ id, type: 'v' }); closeSheet();
      const art = document.querySelector('[data-v="' + id + '"] .ref');
      if (art) { const f = art.querySelector('.fav'); if (now && !f) art.insertAdjacentHTML('beforeend', '<span class="fav">★</span>'); if (!now && f) f.remove(); }
    },
    'v-img': async el => { const { b, c, v, cell } = await verseData(el.dataset.id); shareImage({ he: cell[1] || '', es: es(cell[0]), ref: bookName(b) + ' ' + c + ':' + v }); },
    'img-share': () => shareCanvas(),
    'v-color': el => {
      const H = HL(); const id = el.dataset.id; if (el.dataset.c) H[id] = el.dataset.c; else delete H[id];
      Store.set('hl', H); closeSheet(); toast(el.dataset.c ? 'Versículo destacado' : 'Resaltado quitado'); refreshVerse(id);
      if (location.hash.startsWith('#guardados')) route();
    },
    'v-note': el => noteSheet(el.dataset.id),
    'note-save': el => {
      const id = el.dataset.id; const t = (document.getElementById('note-ta').value || '').trim(); const N = NOTES();
      if (!t) { delete N[id]; } else { const now = Date.now(); N[id] = { t, c: N[id] ? N[id].c : now, m: now }; }
      Store.set('notes', N); closeSheet(); toast(t ? 'Nota guardada' : 'Nota eliminada'); refreshVerse(id);
      if (location.hash.startsWith('#guardados')) route();
    },
    'note-del': el => { if (!confirm('¿Eliminar esta nota?')) return; const N = NOTES(); delete N[el.dataset.id]; Store.set('notes', N); closeSheet(); toast('Nota eliminada'); refreshVerse(el.dataset.id); if (location.hash.startsWith('#guardados')) route(); },
    'v-words': el => verseWords(el.dataset.id),
    'w-save': async el => { const LX = await getJSON('lexico.json'); const L = LX[el.dataset.k]; if (!L || !EXT.saveWord) return; EXT.saveWord({ id: 'lx-' + el.dataset.k, he: L[0], tr: L[1], es: L[3], ref: el.dataset.ref }); el.textContent = 'Guardada ✓'; el.disabled = true; },
    'hl-filter': el => { hlFilter = el.dataset.c; route(); },
    'ver-sheet': () => verSheet(),
    'set-ver': el => { prefs.ver = el.dataset.v; savePrefs(); closeSheet(); toast(VERS[prefs.ver].name); route(); },
    'p-done': el => { const s = Store.get('studied', {}); const n = el.dataset.n; if (s[n]) delete s[n]; else s[n] = Date.now(); Store.set('studied', s); toast(s[n] ? 'Marcada como estudiada' : 'Marca quitada'); route(); },
    'p-save': el => { const n = +el.dataset.n; toggleFav({ id: 'p-' + n, type: 'p', n }); route(); },
    'p-share': async el => {
      const P = await getJSON('parashiot.json'); const p = P[el.dataset.n - 1];
      share('Parashá ' + p.tr + ' — ' + p.he + '\n' + p.sig + '\n\nLectura: ' + fmtRange(p.lec) + '\nHaftará: ' + p.haft.map(fmtRange).join('; ') + '\n\n' + p.res + SIGN, p.tr);
    },
    'm-wa': async el => shareWA(await messageText(+el.dataset.i)),
    'm-copy': async el => copy(await messageText(+el.dataset.i)),
    'm-save': el => { const i = +el.dataset.i; toggleFav({ id: 'm-' + i, type: 'm', i }); route(); },
    'm-img': async el => {
      const M = await getJSON('mensajes.json'); const m = M[+el.dataset.i]; const [b, cv] = m.ref.split(' '); const { c, v } = parseCV(cv);
      const cell = (await getBookV(b)).c[c - 1][v - 1]; shareImage({ he: cell[1] || '', es: es(cell[0]), ref: bookName(b) + ' ' + c + ':' + v, title: m.titulo });
    },
    'vocab-search': el => { searchQ = el.dataset.q; go('buscar'); },
    'tg-teamim': () => { prefs.teamim = !prefs.teamim; savePrefs(); vAjustes(); },
    'tg-nombres': () => { prefs.nombres = !prefs.nombres; savePrefs(); vAjustes(); },
    'tg-orto': () => { prefs.orto = !prefs.orto; savePrefs(); vAjustes(); },
    'install': async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; vAjustes(); },
    'offline': async el => {
      const st = $('#offline-status'); el.disabled = true; let n = 0;
      for (const b of BOOKS) { try { await Promise.all([fetch('data/b/' + b.c + '.json'), fetch('data/es/pdt/' + b.c + '.json'), fetch('data/es/blm/' + b.c + '.json')].concat(b.nt ? [] : [fetch('data/morph/' + b.c + '.json')])); n++; if (st) st.textContent = 'Guardando… ' + n + ' de 66 libros'; } catch (e) { } }
      try { await Promise.all(['lexico.json', 'lemas.json', 'h2e.json', 'pealim/indice.json', 'pealim/binyanim.json'].concat([0, 1, 2, 3, 4, 5, 6, 7].map(i => 'pealim/p' + i + '.json')).map(f => fetch('data/' + f))); } catch (e) { }
      if (st) st.textContent = n === 66 ? 'Listo: los 66 libros están disponibles sin conexión.' : 'Se guardaron ' + n + ' de 66 libros. Vuelve a intentarlo con conexión.';
      el.disabled = false;
    },
    'reset': () => { if (!confirm('¿Borrar favoritos, marcadores, historial y preferencias de este teléfono?')) return; ['prefs', 'favs', 'marks', 'hist', 'last', 'readch', 'studied'].forEach(k => { delete mem[k]; try { localStorage.removeItem('bh:' + k); } catch (e) { } }); Object.assign(prefs, DEF); applyPrefs(); toast('Datos borrados'); vAjustes(); }
  };
  function refreshSize() { const s = document.querySelector('.sheet .opt .t'); if (s) s.textContent = Math.round(prefs.scale * 100) + '%'; if (location.hash === '#ajustes') vAjustes(); }

  document.addEventListener('click', e => {
    const a = e.target.closest('[data-act],[data-go],.v');
    if (!a) return;
    if (a.dataset.go) { e.preventDefault(); go(a.dataset.go); return; }
    const fn = a.dataset.act && (ACT[a.dataset.act] || EXT.act[a.dataset.act]);
    if (fn) { if (a.tagName !== 'A') e.preventDefault(); fn(a, e); return; }
    if (a.classList.contains('v') && !e.target.closest('a')) verseSheet(a.dataset.v);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSheet();
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('v')) { e.preventDefault(); verseSheet(e.target.dataset.v); }
  });
  document.addEventListener('change', e => {
    const a = e.target.dataset.act;
    if (a === 'set-view') { prefs.view = e.target.value; savePrefs(); }
    if (a === 'set-theme') { prefs.theme = e.target.value; savePrefs(); }
    if (a === 'set-cal') { prefs.cal = e.target.value; savePrefs(); }
    if (a === 'set-haft') { prefs.haft = e.target.value; savePrefs(); }
    if (a === 'set-ver-sel') { prefs.ver = e.target.value; savePrefs(); vAjustes(); }
    if (a === 'cal-year') vCalendario(+e.target.value);
    if (a === 'note-book') { noteBook = e.target.value; route(); }
    if (a === 'note-sort') { noteSort = e.target.value; route(); }
  });
  let vt;
  document.addEventListener('input', e => {
    if (e.target.dataset.act === 'note-q') { clearTimeout(vt); const q = e.target.value; vt = setTimeout(async () => { noteQ = q; await route(); const i = document.querySelector('[data-act="note-q"]'); if (i) { i.focus(); i.setSelectionRange(q.length, q.length); } }, 300); return; }
    if (e.target.dataset.act === 'vocab-q') { clearTimeout(vt); const q = e.target.value; vt = setTimeout(async () => { await vVocabulario(q); const i = $('#view input'); if (i) { i.focus(); i.setSelectionRange(q.length, q.length); } }, 250); }
  });
  document.addEventListener('submit', e => {
    if (e.target.dataset.act === 'search-form') { e.preventDefault(); searchQ = e.target.q.value; const i = e.target.q; i.blur(); runSearch(searchQ); }
  });

  /* ============ ARRANQUE, PWA ============ */
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; });
  function hideSplash() {
    const s = $('#splash'); if (!s) return;
    const wait = Math.max(0, 900 - (performance.now() - (window.__bhStart || 0)));
    setTimeout(() => { s.classList.add('out'); setTimeout(() => s.remove(), 600); }, wait);
  }
  if ('serviceWorker' in navigator && !EMBED && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing; if (!nw) return;
        nw.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) toast('Nueva versión disponible: cierra y vuelve a abrir la app'); });
      });
    }).catch(() => { });
  }
  if (/[?&]test\b/.test(location.search)) window.__bh = { es, getBookV, prefs };
  if (EXT.init) EXT.init({ esc, ic, top, sheet, closeSheet, toast, Store, go, view, getJSON, getBook, getBookV, weekInfo, parseCV, bookName, fmtRange, refRoute, refLabel, decodeSeg, STEM, VTYPE, PRON, heb, hebPlain, norm, BOOKS, BY });
  window.addEventListener('hashchange', route);
  route();
})();
