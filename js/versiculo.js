/* BEIT HATZIRAH — El Versículo del día: conexión diaria con la Torá.
   Pantalla diaria, «Mi momento con YAH» (privado, en el dispositivo), historial y calendario, configuración
   «Mi encuentro diario con YAH», bienvenida, notificaciones (Web Push con servidor propio; respaldo local)
   y panel de administración del contenido. */
(function () {
  'use strict';
  const EXT = window.BH_EXT;
  let B = null;
  const prevInit = EXT.init;
  EXT.init = api => { if (prevInit) prevInit(api); B = api; setTimeout(syncSW, 1500); setTimeout(inAppReminder, 3000); };
  const esc = s => B.esc(s); const V = () => window.BH_VDD;
  const DEF = { on: true, hora: '09:00', hora2: '', modo: 'versiculo', temas: [], bienvenida: false };
  const P = () => Object.assign({}, DEF, B.Store.get('vdd', {}) || {});
  const setP = o => { B.Store.set('vdd', Object.assign(P(), o)); syncSW(); };
  const DIARIO = () => B.Store.get('vdd:diario', {}) || {};
  let DATA = null;
  async function data() { if (!DATA) { const [d, c, x, cfg] = await Promise.all(['versiculo.json', 'calendario.json', 'calendario-extra.json', 'notificaciones.json'].map(n => B.getJSON(n).catch(() => null))); DATA = { d, c, x, cfg: cfg || {} }; const loc = B.Store.get('vdd:admin', null); if (loc) { d.entradas = mergeEntries(d.entradas, loc.entradas || []); d.programa = Object.assign({}, d.programa, loc.programa || {}); } } return DATA; }
  const mergeEntries = (a, b) => a.filter(x => !b.some(y => y.id === x.id)).concat(b);
  const todayKey = () => V().key(new Date());
  async function entryFor(k) { const D = await data(); return V().pick(k, D.d, D.c, D.x, P()); }
  const FMT = k => { const d = new Date(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10)); let he = ''; try { he = new Intl.DateTimeFormat('es-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric' }).format(d); } catch (e) { } const cap = x => x.charAt(0).toUpperCase() + x.slice(1); return { es: cap(d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })), he: he.replace(/ AM$/, '') }; };
  const FIESTA = { roshJodesh: 'Rosh Jodesh', pesaj: 'Pésaj', matzot: 'Jag HaMatzot', bikurim: 'Bikurim', shavuot: 'Shavuot', yomTeruah: 'Yom Teruá', yomKippur: 'Yom Kipur', sukkot: 'Sukot', sheminiAtzeret: 'Sheminí Atzéret', januka: 'Januká', purim: 'Purim' };

  /* ---------- Pantalla del día ---------- */
  async function vDia(p) {
    let k = p.slice(1).join('-'); if (!k || k === 'hoy' || !/^\d{4}-\d\d-\d\d$/.test(k)) k = todayKey();
    if (!P().bienvenida && k === todayKey()) return vBienvenida();
    B.view().innerHTML = B.top('Versículo del día', { back: 'inicio' }) + '<div class="loading">Preparando tu encuentro con la Palabra…</div>';
    const e = await entryFor(k); const D = await data(); const [b, cv] = e.ref.split(' '); const [c, v] = cv.split(':').map(Number);
    const bk = await B.getBookV(b); const cell = bk.c[c - 1][v - 1]; const nt = B.BY[b].nt;
    const he = cell[1] && cell[1] !== '^' ? B.heb(cell[1]).replace(/[\u0591-\u05AF]/g, '') : ''; const es = B.es(cell[0] || '');
    const LX = await B.getJSON('lexico.json'); const L = LX[e.lema];
    const f = FMT(k); const di = DIARIO()[k] || {}; const fav = (B.Store.get('vdd:fav', []) || []).includes(e.id);
    const badge = e.motivo === 'fiesta' ? FIESTA[e.id] : e.motivo === 'shabat' ? 'Shabat' : e.durante ? FIESTA[e.durante] : '';
    B.view().innerHTML = B.top('Versículo del día', { back: 'inicio', right: '<a class="icon-btn" href="#versiculo-historial" aria-label="Historial">' + B.ic('mark') + '</a>' }) +
      '<div class="vdd"><section class="vdd-hero"><img class="vdd-logo" src="' + B.LOGO + '" alt="Beit Hatzirah"><p class="vdd-date">' + esc(f.es) + (f.he ? '<br><span>' + esc(f.he) + '</span>' : '') + '</p>' + (badge ? '<p class="vdd-badge">' + esc(badge) + '</p>' : '') +
      (he ? '<p class="he vdd-he" lang="he" dir="rtl">' + esc(he) + '</p>' + (nt ? '<p class="vdd-small">Traducción hebrea de Delitzsch</p>' : '<p class="vdd-tr">' + esc(EXT.translit ? EXT.translit(he) : '') + '</p>') : '') +
      '<blockquote class="vdd-es">' + esc(es) + '</blockquote><p class="vdd-ref">' + esc(e.refLabel) + ' · <span>' + esc(e.tema) + '</span></p>' +
      '<div class="vdd-tools"><button class="btn" data-act="vdd-say" data-t="' + esc(es) + '">🔊 Escuchar</button>' + (he && !nt ? '<button class="btn" data-act="mo-say" data-h="' + esc(he) + '">🔊 En hebreo</button>' : '') + '<button class="btn" data-act="vdd-fav" data-id="' + e.id + '" aria-pressed="' + fav + '">' + (fav ? '★ Favorito' : '☆ Favorito') + '</button><a class="btn" href="#imagen-' + b + '-' + c + '-' + v + '">Compartir</a></div></section>' +
      '<div class="wrap"><button class="btn solid vdd-cta" data-act="vdd-momento" data-k="' + k + '">Comenzar mi momento de meditación</button>' +
      '<section class="vdd-blk t-ctx"><span class="mc-type">Contexto del pasaje</span><p>' + esc(e.contexto) + '</p>' + (e.origen ? '<p class="vdd-small">' + esc(e.origen) + '</p>' : '') + '</section>' +
      (L ? '<section class="vdd-blk t-ling"><span class="mc-type">Palabra hebrea</span><p><a href="#dic-' + e.lema + '"><b class="he" lang="he">' + esc(L[0]) + '</b></a> (' + esc(EXT.translit ? EXT.translit(L[0]) : L[1]) + '): <b>' + esc(L[3] || L[4]) + '</b>' + (L[7] ? '. Raíz ' + esc((L[7].match(/[\u05D0-\u05EA][\u05C1\u05C2]?/g) || []).join('־')) : '') + '. Aparece ' + L[5] + ' veces en el Tanaj.</p></section>' : '') +
      '<section class="vdd-blk t-ense"><span class="mc-type">Reflexión del día · aplicación devocional</span><p>' + esc(e.reflexion) + '</p></section>' +
      '<section class="vdd-blk vdd-q"><span class="mc-type">Pregunta para meditar</span><p>' + esc(e.pregunta) + '</p></section>' +
      '<section class="vdd-blk vdd-or"><span class="mc-type">Oración guiada</span><p><i>' + esc(e.oracion) + '</i></p><p class="vdd-small">También puedes orar con tus propias palabras.</p></section>' +
      '<label class="vdd-check"><input type="checkbox" data-act="vdd-medite" data-k="' + k + '"' + (di.medite ? ' checked' : '') + '> Hoy medité en la Palabra</label>' +
      '<div class="vdd-links"><a class="row" href="#leer-' + b + '-' + c + '-' + v + '"><span class="t"><b>Leer el capítulo completo</b><span>' + esc(B.bookName(b)) + ' ' + c + '</span></span></a>' + (!nt ? '<a class="row" href="#interlineal-' + b + '-' + c + '-' + v + '"><span class="t"><b>Análisis palabra por palabra</b><span>Hebreo, raíces y gramática</span></span></a>' : '') + '<button class="row" data-act="bb-ask" data-q="' + esc(nt ? e.refLabel : 'Analiza ' + e.refLabel + ' palabra por palabra') + '"><span class="t"><b>Estudiar con el Moreh</b><span>Pregúntale sobre este pasaje</span></span></button>' + (L ? '<a class="row" href="#estudio-palabra-' + e.lema + '"><span class="t"><b>Estudio de la palabra ' + esc(L[0]) + '</b><span>Diccionario, raíz y apariciones</span></span></a>' : '') + '<a class="row" href="#tefilot"><span class="t"><b>Tefilot</b><span>Oraciones y bendiciones</span></span></a></div>' +
      (di.reflexion || di.oracion || di.gratitud || di.peticion ? '<section class="vdd-blk vdd-mine"><span class="mc-type">Mi momento con YAH (privado)</span>' + [['reflexion', 'Mi reflexión'], ['oracion', 'Mi oración'], ['gratitud', 'Agradezco'], ['peticion', 'Mi petición']].filter(([q]) => di[q]).map(([q, l]) => '<p><b>' + l + ':</b> ' + esc(di[q]) + '</p>').join('') + '</section>' : '') +
      '<div class="btns" style="margin:16px 0"><a class="btn" href="#versiculo-historial">Historial y calendario</a><a class="btn" href="#ajustes">Mi encuentro diario con YAH</a></div></div></div>';
    const H = B.Store.get('vdd:hist', {}) || {}; if (!H[k]) { H[k] = e.id; B.Store.set('vdd:hist', H); }
  }

  /* ---------- Mi momento con YAH (privado) ---------- */
  let MM = null;
  async function vMomento(p) {
    const k = p.slice(2).join('-') || todayKey(); const e = await entryFor(k); const [b, cv] = e.ref.split(' '); const [c, v] = cv.split(':').map(Number);
    const es = B.es((await B.getBookV(b)).c[c - 1][v - 1][0] || ''); if (!MM || MM.k !== k) MM = { k, i: 0 }; const di = DIARIO()[k] || {};
    const steps = [
      ['Lee despacio', '<blockquote class="vdd-es">' + esc(es) + '</blockquote><p class="vdd-ref">' + esc(e.refLabel) + '</p><p class="vdd-small">Léelo dos o tres veces, sin prisa. Si quieres, en voz alta.</p><button class="btn" data-act="vdd-say" data-t="' + esc(es) + '">🔊 Escuchar</button>'],
      ['Reflexiona', '<p>' + esc(e.reflexion) + '</p><p class="vdd-q2">' + esc(e.pregunta) + '</p>'],
      ['Escribe', '<label class="vdd-f">Mi reflexión<textarea id="mm-reflexion" rows="3">' + esc(di.reflexion || '') + '</textarea></label><label class="vdd-f">Agradezco a YAH por…<textarea id="mm-gratitud" rows="2">' + esc(di.gratitud || '') + '</textarea></label><label class="vdd-f">Mi petición o intención<textarea id="mm-peticion" rows="2">' + esc(di.peticion || '') + '</textarea></label>'],
      ['Ora', '<p><i>' + esc(e.oracion) + '</i></p><label class="vdd-f">Mi oración (tefilá), con mis propias palabras<textarea id="mm-oracion" rows="4">' + esc(di.oracion || '') + '</textarea></label>'],
      ['Shalom', '<p>Gracias por dedicar este tiempo a la Palabra. Que las Escrituras acompañen tu caminar hoy.</p><p class="vdd-small">Lo que escribiste se guarda solo en este dispositivo y es privado: no se envía a ningún servidor ni se comparte.</p>']];
    const s = steps[MM.i];
    B.view().innerHTML = B.top('Mi momento con YAH', { back: 'versiculo-' + k }) + '<div class="wrap vdd-mm"><div class="mo-dots" style="justify-content:center;margin:14px 0">' + steps.map((_, i) => '<i' + (i === MM.i ? ' class="on"' : '') + '></i>').join('') + '</div><h2>' + esc(s[0]) + '</h2>' + s[1] +
      '<div class="mo-steps"><button class="btn" data-act="mm-step" data-d="-1"' + (MM.i ? '' : ' disabled') + '>Anterior</button>' + (MM.i < steps.length - 1 ? '<button class="btn solid" data-act="mm-step" data-d="1">Siguiente</button>' : '<button class="btn solid" data-act="mm-fin">Hoy medité en la Palabra</button>') + '</div></div>';
  }
  function saveMM() { const k = MM.k; const D = DIARIO(); const cur = D[k] || {}; ['reflexion', 'gratitud', 'peticion', 'oracion'].forEach(q => { const el = document.getElementById('mm-' + q); if (el) cur[q] = el.value.trim(); }); cur.t = Date.now(); D[k] = cur; B.Store.set('vdd:diario', D); }

  /* ---------- Historial y calendario ---------- */
  let CAL = null;
  async function vHistorial() {
    const now = new Date(); if (!CAL) CAL = { y: now.getFullYear(), m: now.getMonth() }; const D = DIARIO(); const H = B.Store.get('vdd:hist', {}) || {}; const favs = B.Store.get('vdd:fav', []) || []; const dd = await data();
    const first = new Date(CAL.y, CAL.m, 1); const days = new Date(CAL.y, CAL.m + 1, 0).getDate(); const off = (first.getDay() + 6) % 7; const tk = todayKey();
    let cells = ''; for (let i = 0; i < off; i++) cells += '<span></span>';
    for (let d = 1; d <= days; d++) { const k = V().key(new Date(CAL.y, CAL.m, d)); const fut = k > tk; cells += fut ? '<span class="vc-d fut">' + d + '</span>' : '<a class="vc-d' + (D[k] && D[k].medite ? ' med' : '') + (H[k] ? ' vis' : '') + (k === tk ? ' hoy' : '') + '" href="#versiculo-' + k + '">' + d + '</a>'; }
    const meditados = Object.values(D).filter(x => x.medite).length;
    const list = Object.keys(H).sort().reverse().slice(0, 30);
    B.view().innerHTML = B.top('Mis encuentros con la Palabra', { back: 'versiculo-hoy' }) + '<div class="wrap vdd-hist">' +
      '<div class="vc-head"><button class="icon-btn" data-act="vc-m" data-d="-1" aria-label="Mes anterior">‹</button><b>' + esc((x => x.charAt(0).toUpperCase() + x.slice(1))(first.toLocaleDateString('es', { month: 'long', year: 'numeric' }))) + '</b><button class="icon-btn" data-act="vc-m" data-d="1" aria-label="Mes siguiente">›</button></div>' +
      '<div class="vc-grid">' + ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(x => '<span class="vc-w">' + x + '</span>').join('') + cells + '</div>' +
      '<p class="vdd-small">● días en que marcaste «Hoy medité en la Palabra» (' + meditados + ' en total). No es una competencia: cada encuentro cuenta.</p>' +
      (favs.length ? '<h3 class="h-sec" style="margin-top:16px">Mis versículos favoritos</h3><div class="rows">' + favs.map(id => dd.d.entradas.find(e => e.id === id)).filter(Boolean).map(e => '<a class="row" href="#leer-' + e.ref.replace(' ', '-').replace(':', '-') + '"><span class="t"><b>' + esc(e.refLabel) + '</b><span>' + esc(e.tema) + '</span></span></a>').join('') + '</div>' : '') +
      '<h3 class="h-sec" style="margin-top:16px">Versículos recibidos</h3><div class="rows">' + (list.map(k => { const e = dd.d.entradas.find(x => x.id === H[k]); return e ? '<a class="row" href="#versiculo-' + k + '"><span class="t"><b>' + esc(e.refLabel) + '</b><span>' + esc(FMT(k).es) + (D[k] && (D[k].reflexion || D[k].oracion) ? ' · con mi reflexión' : '') + '</span></span></a>' : ''; }).join('') || '<p class="muted">Todavía no hay versículos en tu historial.</p>') + '</div></div>';
  }

  /* ---------- Bienvenida (sin pedir permisos de forma invasiva) ---------- */
  function vBienvenida() {
    B.view().innerHTML = B.top('Versículo del día', { back: 'inicio' }) + '<div class="wrap vdd-welcome"><img class="vdd-logo" src="' + B.LOGO + '" alt="Beit Hatzirah">' + (EXT.moreh ? '<div class="vdd-team">' + EXT.moreh.fig('welcome', '', 'sonriente', { wasp: 'enter' }) + '</div>' : '') +
      '<h2>Mi encuentro diario con YAH</h2><p class="vdd-lead">«Cada mañana es una nueva oportunidad para acercarnos a la Palabra. Dedica unos minutos a meditar, agradecer y elevar tu oración. Que las Escrituras acompañen tu caminar cada día».</p>' +
      '<p>Cada día encontrarás un versículo con su texto hebreo, su contexto, una reflexión, una pregunta para meditar y una oración. Si lo deseas, puedes recibir un aviso a las <b>09:00</b> (puedes cambiar la hora cuando quieras).</p>' +
      '<div class="btns"><button class="btn solid" data-act="vdd-activar">Recibir mi versículo cada mañana</button><button class="btn" data-act="vdd-sin">Ahora no, ver el versículo</button></div>' +
      '<p class="vdd-small">El teléfono te pedirá permiso para mostrar notificaciones. Puedes desactivarlas en cualquier momento en Configuración → Mi encuentro diario con YAH.</p></div>';
  }

  /* ---------- Notificaciones ---------- */
  async function swReg() { if (!('serviceWorker' in navigator)) return null; try { return await navigator.serviceWorker.ready; } catch (e) { return null; } }
  async function syncSW() { if (!B) return; const r = await swReg(); if (r && r.active) r.active.postMessage({ type: 'vdd-prefs', prefs: (({ on, hora, modo, temas }) => ({ on, hora, modo, temas }))(P()) }); if (P().on && P().suscrito) subscribe(true); }
  const u8 = b => { const s = atob(b.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b.length + 3) % 4)); return Uint8Array.from(s, c => c.charCodeAt(0)); };
  async function subscribe(silent) {
    const D = await data(); const cfg = D.cfg || {}; const r = await swReg(); const out = { push: false, periodic: false, motivo: '' };
    if (!r) { out.motivo = 'Este navegador no admite notificaciones de la app.'; return out; }
    if (cfg.servidor && cfg.vapid && 'PushManager' in window) {
      try { let s = await r.pushManager.getSubscription(); if (!s) s = await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: u8(cfg.vapid) });
        const p = P(); const res = await fetch(cfg.servidor.replace(/\/$/, '') + '/suscribir', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: s.toJSON(), tz: Intl.DateTimeFormat().resolvedOptions().timeZone, hora: p.hora, hora2: p.hora2 || null, modo: p.modo, on: p.on }) });
        out.push = res.ok; if (!res.ok) out.motivo = 'El servidor no respondió correctamente.'; B.Store.set('vdd', Object.assign(P(), { suscrito: true }));
      } catch (e) { out.motivo = 'No se pudo registrar en el servidor de avisos (' + e.message + ').'; }
    } else out.motivo = 'El servidor de avisos de Beit Hatzirah todavía no está configurado.';
    if ('periodicSync' in r) { try { await r.periodicSync.register('vdd', { minInterval: 6 * 3600 * 1000 }); out.periodic = true; } catch (e) { } }
    return out;
  }
  async function unsubscribe() { const D = await data(); const r = await swReg(); if (!r) return; const s = r.pushManager && await r.pushManager.getSubscription(); if (s && D.cfg.servidor) { try { await fetch(D.cfg.servidor.replace(/\/$/, '') + '/baja', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: s.endpoint }) }); } catch (e) { } } if (s) await s.unsubscribe(); if ('periodicSync' in r) { try { await r.periodicSync.unregister('vdd'); } catch (e) { } } B.Store.set('vdd', Object.assign(P(), { suscrito: false })); }
  // si se abre la app después de la hora y no se vio el versículo de hoy, se muestra un aviso discreto
  async function inAppReminder() {
    const p = P(); if (!p.on || !p.bienvenida) return; const H = B.Store.get('vdd:hist', {}) || {}; const k = todayKey(); if (H[k] || /^#versiculo/.test(location.hash)) return;
    const now = new Date(); const [h, m] = p.hora.split(':').map(Number); if (now.getHours() * 60 + now.getMinutes() < h * 60 + m) return;
    const e = await entryFor(k); const el = document.createElement('a'); el.className = 'vdd-toast'; el.href = '#versiculo-hoy'; el.innerHTML = '<b>☀️ Tu versículo del día</b><span>' + esc(e.refLabel) + ' · ' + esc(e.tema) + '</span>'; document.body.appendChild(el); setTimeout(() => el.classList.add('on'), 50); el.addEventListener('click', () => el.remove()); setTimeout(() => el.remove(), 12000);
  }
  // configuración (la pantalla de Configuración la incluye)
  EXT.vddSettings = sw => { const p = P(); const TEMAS = [...new Set(((DATA && DATA.d) ? DATA.d.entradas : []).filter(e => e.tipo === 'diario').map(e => e.tema))]; const perm = 'Notification' in window ? Notification.permission : 'no disponible';
    return '<div class="group-title"><h3>Mi encuentro diario con YAH</h3></div>' +
      '<div class="opt"><span class="t">Aviso diario del versículo<span>Permiso del teléfono: ' + ({ granted: 'concedido', denied: 'bloqueado (cámbialo en los ajustes del teléfono)', default: 'sin pedir' }[perm] || perm) + '</span></span>' + sw(p.on, 'vdd-on', 'Aviso diario del versículo') + '</div>' +
      '<div class="opt"><span class="t">Hora del aviso<span>Hora local de tu teléfono (predeterminada: 09:00)</span></span><input type="time" id="vdd-hora" value="' + p.hora + '" data-act="vdd-hora"></div>' +
      '<div class="opt col"><span class="t">Contenido del aviso</span><div class="seg three mo-seg"><button data-act="vdd-modo" data-v="versiculo" aria-pressed="' + (p.modo === 'versiculo') + '">Con el versículo</button><button data-act="vdd-modo" data-v="recordatorio" aria-pressed="' + (p.modo === 'recordatorio') + '">Solo recordatorio</button></div></div>' +
      '<div class="opt"><span class="t">Recordatorio adicional<span>Opcional, por si aún no meditaste (vacío = sin recordatorio)</span></span><input type="time" id="vdd-hora2" value="' + (p.hora2 || '') + '" data-act="vdd-hora2"></div>' +
      '<div class="opt col"><span class="t">Temas de interés<span>Personalizan los días ordinarios (Shabat y fiestas siguen el calendario)</span></span><div class="chips">' + TEMAS.map(t => '<button class="chip" data-act="vdd-tema" data-t="' + esc(t) + '" aria-pressed="' + p.temas.includes(t) + '">' + esc(t) + '</button>').join('') + '</div></div>' +
      '<div class="btns" style="margin:10px 0 18px"><button class="btn" data-act="vdd-test">Probar la notificación ahora</button><a class="btn" href="#versiculo-admin">Administración del contenido</a><button class="btn" data-act="vdd-test-srv">Probar desde el servidor</button><a class="btn" href="#versiculo-hoy">Ver el versículo de hoy</a></div>'; };

  /* ---------- Panel de administración del contenido ---------- */
  let ADM = { y: new Date().getFullYear(), m: new Date().getMonth(), edit: null };
  async function vAdmin() {
    const D = await data(); const loc = B.Store.get('vdd:admin', { entradas: [], programa: {} }) || { entradas: [], programa: {} };
    const first = new Date(ADM.y, ADM.m, 1); const days = new Date(ADM.y, ADM.m + 1, 0).getDate(); let rows = '';
    for (let d = 1; d <= days; d++) { const k = V().key(new Date(ADM.y, ADM.m, d)); const e = V().pick(k, D.d, D.c, D.x, {}); rows += '<tr><td>' + k.slice(8) + ' ' + ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'][new Date(ADM.y, ADM.m, d).getDay()] + '</td><td>' + esc(e.refLabel) + '</td><td>' + esc(e.motivo === 'fiesta' ? FIESTA[e.id] : e.motivo) + (e.durante ? ' (' + FIESTA[e.durante] + ')' : '') + '</td><td><select data-act="adm-prog" data-k="' + k + '"><option value="">automático</option>' + D.d.entradas.map(x => '<option value="' + x.id + '"' + (D.d.programa[k] === x.id ? ' selected' : '') + '>' + esc(x.refLabel) + '</option>').join('') + '</select></td></tr>'; }
    const ed = ADM.edit ? D.d.entradas.find(x => x.id === ADM.edit) || {} : {};
    B.view().innerHTML = B.top('Administración del versículo', { back: 'ajustes' }) + '<div class="wrap bb">' +
      '<div class="notice">Los cambios se guardan en este dispositivo. Para publicarlos para todos, usa «Exportar» y reemplaza <code>data/versiculo.json</code> en el proyecto. Contenido actual: ' + D.d.entradas.length + ' entradas (' + D.d.entradas.filter(e => e.tipo === 'diario').length + ' ordinarias, ' + D.d.entradas.filter(e => e.tipo === 'shabat').length + ' de Shabat, ' + D.d.entradas.filter(e => e.tipo === 'fiesta').length + ' de fiestas).</div>' +
      '<h3 class="h-sec" style="margin-top:16px">Calendario de publicación</h3><div class="vc-head"><button class="icon-btn" data-act="adm-m" data-d="-1">‹</button><b>' + esc((x => x.charAt(0).toUpperCase() + x.slice(1))(first.toLocaleDateString('es', { month: 'long', year: 'numeric' }))) + '</b><button class="icon-btn" data-act="adm-m" data-d="1">›</button></div>' +
      '<div class="lab-tbl"><table><tr><th>Día</th><th>Versículo</th><th>Motivo</th><th>Programar</th></tr>' + rows + '</table></div>' +
      '<h3 class="h-sec" style="margin-top:16px">' + (ADM.edit ? 'Editar «' + esc(ed.refLabel || '') + '»' : 'Nueva entrada') + '</h3><form id="adm-f" class="bb-form" onsubmit="return false">' +
      '<label>Identificador<input name="id" value="' + esc(ed.id || '') + '" required></label><label>Referencia (por ejemplo, PSA 23:1)<input name="ref" value="' + esc(ed.ref || '') + '" required></label><label>Tema<input name="tema" value="' + esc(ed.tema || '') + '"></label>' +
      '<label>Tipo<select name="tipo">' + [['diario', 'Día ordinario'], ['shabat', 'Shabat'], ['fiesta', 'Fiesta (el identificador debe ser el de la fiesta)']].map(([v, l]) => '<option value="' + v + '"' + (ed.tipo === v ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></label>' +
      '<label>Palabra hebrea (número de Strong presente en el versículo)<input name="lema" value="' + esc(ed.lema || '') + '"></label><label>Contexto<textarea name="contexto" rows="2">' + esc(ed.contexto || '') + '</textarea></label><label>Reflexión<textarea name="reflexion" rows="4">' + esc(ed.reflexion || '') + '</textarea></label><label>Pregunta<textarea name="pregunta" rows="2">' + esc(ed.pregunta || '') + '</textarea></label><label>Oración guiada<textarea name="oracion" rows="3">' + esc(ed.oracion || '') + '</textarea></label>' +
      '<div class="btns"><button class="btn solid" data-act="adm-save">Validar y guardar</button><button class="btn" data-act="adm-prev">Vista previa</button></div><div id="adm-msg"></div></form>' +
      '<h3 class="h-sec" style="margin-top:16px">Entradas</h3><div class="rows">' + D.d.entradas.map(e => '<div class="row"><span class="t"><b>' + esc(e.refLabel) + '</b><span>' + esc(e.tema) + ' · ' + e.tipo + (loc.entradas.some(x => x.id === e.id) ? ' · editada en este dispositivo' : '') + '</span></span><button class="btn" data-act="adm-edit" data-id="' + e.id + '">Editar</button></div>').join('') + '</div>' +
      '<div class="btns" style="margin:16px 0"><button class="btn solid" data-act="adm-export">Exportar versiculo.json</button></div>' +
      '<h3 class="h-sec">Estadísticas de notificaciones</h3><p class="vdd-small">Requiere el servidor de avisos y la clave de administración.</p><div class="lab-in"><input id="adm-tok" type="password" placeholder="Clave de administración"><button class="btn" data-act="adm-stats">Consultar</button></div><div id="adm-st"></div></div>';
  }
  async function validateEntry(r) {
    const errs = []; if (!/^[a-zA-Z0-9-]+$/.test(r.id || '')) errs.push('Identificador no válido.');
    const m = (r.ref || '').match(/^(\w+) (\d+):(\d+)$/); if (!m || !B.BY[m[1]]) { errs.push('Referencia no válida.'); return errs; }
    const bk = await B.getBookV(m[1]); if (!bk.c[+m[2] - 1] || !bk.c[+m[2] - 1][+m[3] - 1]) errs.push('El versículo no existe.');
    if (r.lema) { const LX = await B.getJSON('lexico.json'); if (!LX[r.lema]) errs.push('No existe la palabra Strong ' + r.lema + '.'); else if (!B.BY[m[1]].nt) { const MO = await B.getJSON('morph/' + m[1] + '.json'); const H = await B.getJSON('h2e.json'); const hk = Object.keys(H).find(k => k.startsWith(m[1] + ' ') && H[k] === m[2] + ':' + m[3]); const ws = MO[hk ? hk.split(' ')[1] : m[2] + ':' + m[3]] || []; if (!ws.some(w => (w[1].match(/\d+/g) || []).includes(r.lema))) errs.push('La palabra ' + LX[r.lema][0] + ' no aparece en ese versículo.'); } }
    if (!r.reflexion || r.reflexion.length < 80) errs.push('La reflexión es demasiado breve.');
    return errs;
  }

  /* ---------- Acciones y rutas ---------- */
  const say = t => { const S = window.speechSynthesis; if (!S) return; const vs = S.getVoices().filter(v => /^es/i.test(v.lang)); if (!vs.length) return B.toast('No hay una voz en español en este dispositivo'); S.cancel(); const u = new SpeechSynthesisUtterance(t); u.voice = vs[0]; u.lang = vs[0].lang; u.rate = .95; S.speak(u); };
  Object.assign(EXT.act, {
    'vdd-say': el => say(el.dataset.t),
    'vdd-fav': el => { const F = B.Store.get('vdd:fav', []) || []; const id = el.dataset.id; const on = !F.includes(id); B.Store.set('vdd:fav', on ? F.concat(id) : F.filter(x => x !== id)); el.setAttribute('aria-pressed', on); el.textContent = on ? '★ Favorito' : '☆ Favorito'; B.toast(on ? 'Guardado en tus favoritos' : 'Quitado de favoritos'); },
    'vdd-medite': el => { const D = DIARIO(); const k = el.dataset.k; D[k] = Object.assign(D[k] || {}, { medite: el.checked, t: Date.now() }); B.Store.set('vdd:diario', D); if (el.checked && EXT.moreh) EXT.moreh.celebrate('Hoy meditaste en la Palabra. Que te acompañe todo el día.'); },
    'vdd-momento': el => { MM = null; B.go('versiculo-momento-' + el.dataset.k); },
    'mm-step': el => { saveMM(); MM.i += +el.dataset.d; vMomento(['versiculo', 'momento', MM.k]); window.scrollTo({ top: 0 }); },
    'mm-fin': () => { saveMM(); const D = DIARIO(); D[MM.k] = Object.assign(D[MM.k] || {}, { medite: true }); B.Store.set('vdd:diario', D); if (EXT.moreh) EXT.moreh.celebrate('Gracias por tu momento con YAH. Shalom.'); B.go('versiculo-' + MM.k); },
    'vc-m': el => { CAL.m += +el.dataset.d; if (CAL.m < 0) { CAL.m = 11; CAL.y--; } if (CAL.m > 11) { CAL.m = 0; CAL.y++; } vHistorial(); },
    'vdd-activar': async () => { setP({ bienvenida: true, on: true }); if (!('Notification' in window)) { B.toast('Este navegador no permite notificaciones; encontrarás el versículo cada día en el inicio.'); return B.go('versiculo-hoy'); }
      const perm = await Notification.requestPermission(); if (perm !== 'granted') { B.toast('No se concedió el permiso. Encontrarás el versículo cada día en el inicio.'); return B.go('versiculo-hoy'); }
      const r = await subscribe(); B.toast(r.push ? 'Listo: recibirás tu versículo cada mañana a las ' + P().hora : r.periodic ? 'Listo. Mientras se configura el servidor, el teléfono revisará el versículo periódicamente.' : 'Permiso concedido. ' + (r.motivo || '')); B.go('versiculo-hoy'); },
    'vdd-sin': () => { setP({ bienvenida: true }); B.go('versiculo-hoy'); },
    'vdd-on': async () => { const on = !P().on; setP({ on }); if (on) { if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission(); await subscribe(); } else await unsubscribe(); B.toast(on ? 'Aviso diario activado' : 'Aviso diario desactivado: no recibirás más notificaciones'); if (EXT.refreshSettings) EXT.refreshSettings(); },
    'vdd-modo': el => { setP({ modo: el.dataset.v }); if (EXT.refreshSettings) EXT.refreshSettings(); },
    'vdd-tema': el => { const T = P().temas; const t = el.dataset.t; setP({ temas: T.includes(t) ? T.filter(x => x !== t) : T.concat(t) }); if (EXT.refreshSettings) EXT.refreshSettings(); },
    'vdd-test': async () => { if (!('Notification' in window)) return B.toast('Este navegador no permite notificaciones'); if (Notification.permission !== 'granted' && (await Notification.requestPermission()) !== 'granted') return B.toast('Primero concede el permiso de notificaciones'); const r = await swReg(); if (r && r.active) { r.active.postMessage({ type: 'vdd-test' }); B.toast('Notificación de prueba enviada'); } else B.toast('El servicio de la app aún no está activo; abre la app instalada e inténtalo de nuevo.'); },
    'vdd-test-srv': async () => { const D = await data(); if (!D.cfg.servidor) return B.toast('El servidor de avisos todavía no está configurado (ver herramientas/notificaciones/GUIA.md).'); const r = await swReg(); const s = r && r.pushManager && await r.pushManager.getSubscription(); if (!s) return B.toast('Este dispositivo no está suscrito: activa el aviso diario.'); try { const res = await (await fetch(D.cfg.servidor.replace(/\/$/, '') + '/prueba', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: s.endpoint }) })).json(); B.toast(res.resultado === 'ok' ? 'El servidor envió el aviso de prueba' : 'Resultado: ' + (res.resultado || res.error)); } catch (e) { B.toast('No se pudo contactar al servidor'); } },
    'adm-m': el => { ADM.m += +el.dataset.d; if (ADM.m < 0) { ADM.m = 11; ADM.y--; } if (ADM.m > 11) { ADM.m = 0; ADM.y++; } vAdmin(); },
    'adm-edit': el => { ADM.edit = el.dataset.id; vAdmin().then(() => document.getElementById('adm-f').scrollIntoView({ behavior: 'smooth' })); },
    'adm-save': async () => { const f = document.getElementById('adm-f'); const r = {}; ['id', 'ref', 'tema', 'tipo', 'lema', 'contexto', 'reflexion', 'pregunta', 'oracion'].forEach(n => r[n] = f.elements[n].value.trim()); const errs = await validateEntry(r); const msg = document.getElementById('adm-msg'); if (errs.length) { msg.innerHTML = '<div class="notice">' + errs.map(esc).join('<br>') + '</div>'; return; } r.refLabel = B.bookName(r.ref.split(' ')[0]) + ' ' + r.ref.split(' ')[1]; const loc = B.Store.get('vdd:admin', { entradas: [], programa: {} }) || { entradas: [], programa: {} }; loc.entradas = mergeEntries(loc.entradas, [r]); B.Store.set('vdd:admin', loc); DATA = null; ADM.edit = r.id; B.toast('Entrada guardada en este dispositivo'); vAdmin(); },
    'adm-prog': el => { const loc = B.Store.get('vdd:admin', { entradas: [], programa: {} }) || { entradas: [], programa: {} }; if (el.value) loc.programa[el.dataset.k] = el.value; else delete loc.programa[el.dataset.k]; B.Store.set('vdd:admin', loc); DATA = null; B.toast(el.value ? 'Programado para el ' + el.dataset.k : 'Vuelve a la selección automática'); },
    'adm-prev': async () => { const f = document.getElementById('adm-f'); const r = { refLabel: f.elements.ref.value, tema: f.elements.tema.value }; const n = V().notif(Object.assign({ refLabel: r.refLabel, tema: r.tema }), P()); document.getElementById('adm-msg').innerHTML = '<div class="vdd-notif"><small>Vista previa de la notificación</small><b>' + esc(n.title) + '</b><span>' + esc(n.body) + '</span></div><p class="vdd-small">La pantalla diaria se ve como en «Versículo del día»; guarda la entrada y prográmala para revisarla en su fecha.</p>'; },
    'adm-export': async () => { const D = await data(); const out = { v: 1, inicio: D.d.inicio, entradas: D.d.entradas, programa: D.d.programa }; const b = new Blob([JSON.stringify(out)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'versiculo.json'; document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 1000); },
    'adm-stats': async () => { const D = await data(); const out = document.getElementById('adm-st'); if (!D.cfg.servidor) { out.innerHTML = '<p class="muted">El servidor de avisos todavía no está configurado.</p>'; return; } try { const r = await fetch(D.cfg.servidor.replace(/\/$/, '') + '/admin/estadisticas', { headers: { Authorization: 'Bearer ' + document.getElementById('adm-tok').value } }); const j = await r.json(); out.innerHTML = r.ok ? '<p>Suscriptores: <b>' + j.suscriptores + '</b> (activos: ' + j.activas + ')</p><div class="lab-tbl"><table><tr><th>Fecha</th><th>Enviados</th><th>Recordatorios</th><th>Errores</th><th>Eliminadas</th></tr>' + Object.entries(j.registro).sort().reverse().map(([d, x]) => '<tr><td>' + d + '</td><td>' + (x.enviadas || 0) + '</td><td>' + (x.recordatorios || 0) + '</td><td>' + (x.errores || 0) + '</td><td>' + (x.eliminadas || 0) + '</td></tr>').join('') + '</table></div>' : '<p class="muted">' + esc(j.error || 'Error') + '</p>'; } catch (e) { out.innerHTML = '<p class="muted">No se pudo contactar al servidor.</p>'; } }
  });
  document.addEventListener('change', e => { if (e.target.id === 'vdd-hora' && e.target.value) { setP({ hora: e.target.value }); B.toast('Hora del aviso: ' + e.target.value); } if (e.target.id === 'vdd-hora2') { setP({ hora2: e.target.value }); B.toast(e.target.value ? 'Recordatorio adicional: ' + e.target.value : 'Sin recordatorio adicional'); } if (e.target.dataset && e.target.dataset.act === 'adm-prog') EXT.act['adm-prog'](e.target); });
  if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.type === 'vdd-open') location.hash = e.data.url.split('#')[1] || 'versiculo-hoy'; });
  EXT.vddHome = async () => { try { const e = await entryFor(todayKey()); const [b, cv] = e.ref.split(' '); const [c, v] = cv.split(':').map(Number); const es = B.es((await B.getBookV(b)).c[c - 1][v - 1][0] || ''); return '<a class="vdd-card" href="#versiculo-hoy"><small>☀️ Versículo del día · ' + esc(e.tema) + '</small><blockquote>' + esc(es.length > 160 ? es.slice(0, 157) + '…' : es) + '</blockquote><b>' + esc(e.refLabel) + '</b><span>Comenzar mi momento de meditación →</span></a>'; } catch (x) { return ''; } };
  new MutationObserver(() => { const h = document.getElementById('home-vdd'); if (h && !h.dataset.done && EXT.vddHome) { h.dataset.done = '1'; EXT.vddHome().then(x => { h.innerHTML = x; }); } }).observe(document.documentElement, { childList: true, subtree: true });
  Object.assign(EXT.routes, { versiculo: p => (p[1] === 'momento' ? vMomento(p) : vDia(p)), 'versiculo-historial': vHistorial, 'versiculo-admin': vAdmin });
  ['versiculo', 'versiculo-historial', 'versiculo-admin'].forEach(r => { EXT.tabs[r] = ''; });
})();
