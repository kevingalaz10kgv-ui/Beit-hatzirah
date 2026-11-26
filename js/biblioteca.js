/* BEIT HATZIRAH — Biblioteca central del Moreh.
   Registros estructurados (conceptos, temas, mundo bíblico, gramática) con fuente, fecha y confiabilidad;
   catálogo de fuentes y licencias; diccionario español-hebreo; estudio completo de una palabra;
   mapa de conexiones; panel local para ampliar la biblioteca; evaluación del Moreh. */
(function () {
  'use strict';
  const EXT = window.BH_EXT;
  let B = null;
  const prevInit = EXT.init;
  EXT.init = api => { if (prevInit) prevInit(api); B = api; };
  const esc = s => B.esc(s);
  const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[¿?¡!.,;:«»"()]/g, ' ').replace(/\s+/g, ' ').trim();
  const plain = h => (h || '').replace(/[^\u05D0-\u05EA]/g, '');
  const rootStr = r => ((r || '').match(/[\u05D0-\u05EA][\u05C1\u05C2]?/g) || []).join('־');
  const TYPES = { texto: 'Texto bíblico', trad: 'Traducción', ling: 'Análisis lingüístico', hist: 'Investigación histórica', trad2: 'Tradición interpretativa', ense: 'Enseñanza de Beit Hatzirah', interp: 'Interpretación', ext: 'Conocimiento general externo' };
  const CATTYPE = { conceptos: 'ling', gramatica: 'ling', teologia: 'ense', personajes: 'ense', culto: 'ense', historia: 'hist', arqueologia: 'hist', geografia: 'hist', cultura: 'hist' };

  /* ---------- Datos ---------- */
  let BIB = null, LX = null, PAR = null, RA = null, LEM = null, PI = null;
  async function data() {
    if (!BIB) [BIB, LX, PAR, RA, LEM, PI] = await Promise.all(['biblioteca.json', 'lexico.json', 'parashiot.json', 'raices.json', 'lemas.json', 'pealim/indice.json'].map(n => B.getJSON(n)));
    BIB.local = (B.Store.get('biblioteca:local', []) || []).map(r => Object.assign({}, r, { local: true }));
    return BIB;
  }
  const all = () => BIB.registros.concat(BIB.local || []);
  const rec = id => all().find(r => r.id === id);
  const refLink = r => '<a class="ref-chip" href="#' + B.refRoute(r) + '">' + esc(B.refLabel(r)) + '</a>';
  async function verseHTML(r) {
    const m = r.match(/^(\w+) (\d+):(\d+)/); if (!m || !B.BY[m[1]]) return '';
    const d = await B.getBookV(m[1]); const cell = (d.c[+m[2] - 1] || [])[+m[3] - 1]; if (!cell) return '';
    return (cell[1] && cell[1] !== '^' && !B.BY[m[1]].nt ? '<p class="he mc-he" lang="he" dir="rtl">' + esc(B.heb(cell[1]).replace(/[\u0591-\u05AF]/g, '')) + '</p>' : '') + '<p class="mc-v">' + esc(B.es(cell[0] || '')) + ' ' + refLink(r) + '</p>';
  }
  const word = k => '<a class="row" href="#dic-' + k + '"><span class="t"><b>' + esc(LX[k][3] || LX[k][4]) + '</b><span>' + esc(EXT.translit ? EXT.translit(LX[k][0]) : LX[k][1]) + ' · ' + LX[k][5] + ' veces</span></span><span class="he" lang="he">' + esc(LX[k][0]) + '</span></a>';
  const blk = (type, html) => '<section class="bb-blk t-' + type + '"><span class="mc-type">' + TYPES[type] + '</span>' + html + '</section>';
  const fuente = f => '<details class="bb-src"><summary>Fuente y confiabilidad</summary><p><b>Autor:</b> ' + esc(f.autor || '—') + '<br><b>Fecha:</b> ' + esc(f.fecha || '—') + '<br><b>Licencia:</b> ' + esc(f.licencia || '—') + '<br><b>Confiabilidad:</b> ' + esc(f.confiabilidad || '—') + (f.origen ? '<br><b>Origen:</b> ' + esc(f.origen) : '') + '</p></details>';

  /* ---------- Inicio de la biblioteca ---------- */
  async function vHome() {
    await data(); const cnt = c => all().filter(r => r.cat === c).length;
    B.view().innerHTML = B.top('Biblioteca del Moreh', { back: 'menu' }) + '<div class="wrap bb">' +
      '<div class="bb-hero">' + (EXT.moreh ? EXT.moreh.fig('teach', '', 'entusiasmado', { wasp: 'rest' }) : '') + '<div><p class="he" lang="he">סִפְרִיַּת הַמּוֹרֶה</p><h2>Biblioteca del Moreh</h2><p>El conocimiento con que el Moreh responde: ' + all().length + ' registros propios, más la Biblia, el diccionario de ' + Object.keys(LX).length.toLocaleString('es') + ' palabras, ' + Object.keys(RA).length.toLocaleString('es') + ' raíces, ' + PI.length.toLocaleString('es') + ' verbos y las 54 parashiot.</p></div></div>' +
      '<div class="field">' + B.ic('search') + '<input type="search" id="bbq" placeholder="Buscar en la biblioteca" aria-label="Buscar en la biblioteca" autocomplete="off"></div><div id="bbres"></div>' +
      '<div class="bb-cats">' + BIB.cats.map(c => { const n = cnt(c.id); const href = c.ruta && !n ? '#' + c.ruta : '#bibcat-' + c.id; return '<a class="bb-cat" href="' + href + '"><b>' + esc(c.t) + '</b><small>' + (n ? n + ' registros' : c.ruta ? 'Módulo de la app' : 'En preparación') + '</small></a>'; }).join('') + '</div>' +
      '<h3 class="h-sec" style="margin-top:16px">Estudiemos juntos: clases completas</h3><div class="chips">' + Object.entries(CLASES).map(([k, c]) => '<a class="chip" href="#clase-' + k + '">' + esc(c[0]) + '</a>').join('') + '</div>' +
      '<div class="btns" style="margin:16px 0"><a class="btn solid" href="#ruta">Ruta de aprendizaje (36 pasos)</a><a class="btn" href="#informe-moreh">Informe del conocimiento</a><a class="btn" href="#propios">Nombres propios</a><a class="btn" href="#fundamentales">Palabras fundamentales</a><a class="btn" href="#analizador">Analizador de formas</a><a class="btn" href="#estado-moreh">Estado del conocimiento</a><a class="btn" href="#fuentes">Fuentes y licencias</a><a class="btn" href="#dices">Diccionario español-hebreo</a><a class="btn" href="#biblioteca-admin">Ampliar la biblioteca</a><a class="btn" href="#moreh-evaluacion">Evaluación del Moreh</a></div></div>';
  }
  document.addEventListener('input', e => {
    if (e.target.id !== 'bbq') return; const q = norm(e.target.value); const out = document.getElementById('bbres'); if (!out) return;
    if (q.length < 2) { out.innerHTML = ''; return; }
    const hits = all().filter(r => norm(r.t + ' ' + (r.directa || '') + ' ' + (r.sencillo || '') + ' ' + (r.profundo || []).join(' ')).includes(q)).slice(0, 15);
    out.innerHTML = hits.length ? '<div class="rows">' + hits.map(r => '<a class="row" href="#bib-' + r.id + '"><span class="t"><b>' + esc(r.t) + '</b><span>' + esc(catName(r.cat)) + '</span></span></a>').join('') + '</div>' : '<p class="muted">Sin resultados en la biblioteca. Prueba en la búsqueda global o pregúntale al Moreh.</p>';
  });
  const catName = id => ((BIB.cats.find(c => c.id === id) || {}).t || id);
  async function vCat(p) {
    await data(); const id = p.slice(1).join('-'); const c = BIB.cats.find(x => x.id === id); const rs = all().filter(r => r.cat === id);
    B.view().innerHTML = B.top(esc(c ? c.t : 'Biblioteca'), { back: 'biblioteca' }) + '<div class="wrap bb">' + (c && c.ruta ? '<p><a class="btn" href="#' + c.ruta + '">Abrir el módulo de la app</a></p>' : '') +
      (rs.length ? '<div class="rows">' + rs.map(r => '<a class="row" href="#bib-' + r.id + '"><span class="t"><b>' + esc(r.t) + '</b><span>' + esc((r.directa || '').slice(0, 90)) + '</span></span>' + (r.he ? '<span class="he" lang="he">' + esc(r.he) + '</span>' : '') + '</a>').join('') + '</div>' : '<p class="muted">Todavía no hay registros propios en esta categoría.</p>') + '</div>';
  }

  /* ---------- Un registro: método de respuesta del Moreh ---------- */
  async function vRec(p) {
    await data(); const r = rec(p.slice(1).join('-')); if (!r) return B.go('biblioteca');
    const t = CATTYPE[r.cat] || 'ense'; let refs = ''; for (const x of r.refs.slice(0, 6)) refs += await verseHTML(x);
    const rel = (r.rel || []).map(x => x.startsWith('p:') ? (PAR.find(q => +q.n === +x.slice(2)) ? '<a class="chip" href="#parasha-' + x.slice(2) + '">Parashá ' + esc(PAR.find(q => +q.n === +x.slice(2)).tr) + '</a>' : '') : rec(x) ? '<a class="chip" href="#bib-' + x + '">' + esc(rec(x).t) + '</a>' : '').join('');
    const pars = (r.parashot || []).slice(0, 4).map(n => { const q = PAR.find(x => +x.n === +n); return q ? '<a class="chip" href="#parasha-' + n + '">' + esc(q.tr) + '</a>' : ''; }).join('');
    B.view().innerHTML = B.top(esc(r.t), { back: 'bibcat-' + r.cat }) + '<div class="wrap bb study">' +
      '<p class="bs-kicker">' + esc(catName(r.cat)) + (r.local ? ' · <span class="mc-tag">borrador local</span>' : '') + '</p><h1 class="bs-title">' + esc(r.t) + '</h1>' + (r.he ? '<p class="he dc-word" lang="he">' + esc(r.he) + '</p>' : '') +
      blk(t, '<h4>1. Respuesta directa</h4><p>' + esc(r.directa) + '</p>') +
      (r.sencillo && r.sencillo !== r.directa ? blk(t, '<h4>2. Explicación sencilla</h4><p>' + esc(r.sencillo) + '</p>') : '') +
      ((r.profundo || []).length ? blk(r.cat === 'conceptos' ? 'texto' : t, '<h4>3. Desarrollo</h4>' + r.profundo.map(x => '<p>' + esc(x) + '</p>').join('')) : '') +
      (r.ejemplo ? blk('ling', '<h4>Ejemplo</h4><p class="he mc-he" lang="he" dir="rtl">' + esc(r.ejemplo[0]) + '</p><p><i>' + esc(r.ejemplo[1]) + '</i> — «' + esc(r.ejemplo[2]) + '»</p>') : '') +
      ((r.palabras || []).length || r.primera ? blk('ling', '<h4>4. Palabras hebreas</h4>' + (r.palabras || []).filter(k => LX[k]).map(word).join('') + (r.primera ? '<p>Primera aparición: ' + refLink(r.primera) + (r.freq ? ' · ' + r.freq + ' apariciones' : '') + (r.raiz ? ' · raíz <a href="#raiz-' + encodeURIComponent(plain(r.raiz)) + '" class="he" lang="he">' + esc(rootStr(r.raiz)) + '</a>' : '') + '</p>' : '')) : '') +
      (refs ? blk('trad', '<h4>5. Referencias de las Escrituras</h4>' + refs) : '') +
      (pars || rel ? '<h4 class="bb-h">6. Relación con parashiot y otras enseñanzas</h4><div class="chips">' + pars + rel + '</div>' : '') +
      (r.interp ? blk('trad2', '<h4>7. Interpretación</h4><p>' + esc(r.interp) + '</p>') : '') +
      '<div class="btns" style="margin:16px 0"><button class="btn solid" data-act="bb-ask" data-q="' + esc('explícame ' + r.t.replace(/\s*\(.*\)/, '')) + '">Preguntarle al Moreh</button><button class="btn" data-act="bb-ask" data-q="hazme preguntas">Hazme preguntas</button></div>' +
      fuente(r.fuente || {}) + '</div>';
  }

  /* ---------- Fuentes y licencias ---------- */
  async function vFuentes() {
    await data();
    B.view().innerHTML = B.top('Fuentes y licencias', { back: 'biblioteca' }) + '<div class="wrap bb"><p style="margin-top:14px">Cada dato que usa el Moreh proviene de una de estas fuentes. Las redacciones de Beit Hatzirah están señaladas y pendientes de revisión por la dirección de contenido.</p>' +
      BIB.fuentes.map(f => '<div class="bb-fuente"><b>' + esc(f.nombre) + '</b><p>' + esc(f.uso) + '</p><small>' + esc(f.autor) + ' · versión ' + esc(f.version) + ' · ' + esc(f.licencia) + ' · Confiabilidad: ' + esc(f.confiabilidad) + '</small></div>').join('') + '</div>';
  }

  /* ---------- Diccionario español-hebreo ---------- */
  async function vDicEs() {
    await data();
    B.view().innerHTML = B.top('Español-hebreo', { back: 'diccionario' }) + '<div class="wrap bb"><p style="margin-top:14px">Una palabra española puede tener varios equivalentes hebreos según el contexto. Escribe una palabra o elige una de las fichas preparadas.</p>' +
      '<div class="field">' + B.ic('search') + '<input type="search" id="esq" placeholder="Por ejemplo: amor, justicia, paz" aria-label="Palabra en español" autocomplete="off"></div><div id="esres"></div>' +
      '<div class="chips" style="margin-top:12px">' + Object.keys(BIB.eshe).map(w => '<button class="chip" data-act="es-pick" data-w="' + w + '">' + esc(w) + '</button>').join('') + '</div></div>';
  }
  function esSearch(q) {
    const out = document.getElementById('esres'); if (!out) return; const n = norm(q); if (n.length < 2) { out.innerHTML = ''; return; }
    const cur = BIB.eshe[n] || BIB.eshe[n.replace(/s$/, '')];
    const auto = Object.keys(LX).filter(k => LX[k][3] && norm(LX[k][3]).split(/[ ,;()]+/).includes(n) && !(cur || []).some(x => x[0] === k)).sort((a, b) => LX[b][5] - LX[a][5]).slice(0, 12);
    out.innerHTML = (cur ? '<h3 class="h-sec" style="margin-top:14px">Equivalentes según el contexto</h3><div class="rows">' + cur.map(([k, m]) => '<a class="row" href="#dic-' + k + '"><span class="t"><b>' + esc(m) + '</b><span>' + esc(EXT.translit ? EXT.translit(LX[k][0]) : '') + ' · ' + LX[k][5] + ' veces</span></span><span class="he" lang="he">' + esc(LX[k][0]) + '</span></a>').join('') + '</div>' : '') +
      (auto.length ? '<h3 class="h-sec" style="margin-top:14px">' + (cur ? 'Otras palabras' : 'Palabras hebreas') + ' con «' + esc(q) + '» en su significado</h3><div class="rows">' + auto.map(word).join('') + '</div>' : '') +
      (!cur && !auto.length ? '<p class="muted">No hay palabras con ese significado en el diccionario en español. Prueba con un sinónimo.</p>' : '');
  }
  document.addEventListener('input', e => { if (e.target.id === 'esq') esSearch(e.target.value); });

  /* ---------- Estudio completo de una palabra y mapa de conexiones ---------- */
  async function connections(k) {
    const L = LX[k]; const fam = L[7] ? (RA[L[7]] || []) : []; const verb = fam.find(x => LX[x][2] === 'v' && PI.some(v => v.id === x));
    const refs = LEM[k] || (L[6] ? [L[6]] : []); const pcount = {};
    refs.forEach(r => { const m = r.match(/^(\w+) (\d+)/); const p = PAR.find(q => q.lec.b === m[1] && +q.lec.s.split(':')[0] <= +m[2] && +m[2] <= +q.lec.e.split(':')[0]); if (p) pcount[p.n] = (pcount[p.n] || 0) + 1; });
    const pars = Object.entries(pcount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => PAR.find(q => +q.n === +x[0]));
    const recs = all().filter(r => (r.palabras || []).includes(k) || (r.he && plain(r.he) === plain(L[0]))).slice(0, 4);
    const gram = L[2] === 'v' ? 'g-binyanim' : /^n-[mf]/.test(L[2]) ? 'g-genero-numero' : /^a/.test(L[2]) ? 'g-adjetivo' : /^prep/.test(L[2]) ? 'g-prefijos' : null;
    return { L, fam, verb, refs, pars, recs, gram };
  }
  function mapHTML(k, c) {
    const node = (t, v, href) => '<a class="cx-n" href="' + (href || '#') + '"><small>' + t + '</small><b>' + v + '</b></a>';
    const L = c.L; const parts = [node('Palabra', '<span class="he" lang="he">' + esc(L[0]) + '</span>', '#dic-' + k)];
    if (L[7]) parts.push(node('Raíz', '<span class="he" lang="he">' + esc(rootStr(L[7])) + '</span>', '#raiz-' + encodeURIComponent(plain(L[7]))));
    if (c.verb) parts.push(node('Verbo', '<span class="he" lang="he">' + esc(LX[c.verb][0]) + '</span>', '#pealim-' + c.verb), node('Conjugación', 'Tablas', '#pealim-' + c.verb));
    if (c.gram) parts.push(node('Gramática', esc((rec(c.gram) || {}).t || ''), '#bib-' + c.gram));
    parts.push(node('Apariciones', L[5] + ' veces', '#concordancia-' + k));
    c.pars.slice(0, 1).forEach(p => parts.push(node('Parashá', esc(p.tr), '#parasha-' + p.n)));
    c.recs.slice(0, 1).forEach(r => parts.push(node('Estudio', esc(r.t), '#bib-' + r.id)));
    return '<div class="cx-map">' + parts.join('<span class="cx-a" aria-hidden="true">→</span>') + '</div>';
  }
  async function vEstudioPalabra(p) {
    await data(); const k = p[1]; const L = LX[k]; if (!L) return B.go('diccionario');
    const c = await connections(k); let ex = ''; for (const r of c.refs.slice(0, 4)) ex += await verseHTML(r);
    const tr = EXT.translit ? EXT.translit(L[0]) : L[1]; const conc = all().find(r => r.cat === 'conceptos' && r.he && plain(r.he) === plain(L[0]));
    B.view().innerHTML = B.top('Estudio de una palabra', { back: 'dic-' + k }) + '<div class="wrap bb study">' +
      '<div class="bb-hero">' + (EXT.moreh ? EXT.moreh.fig('point', '', 'explicativo', { wasp: 'curious', spot: 'front' }) : '') + '<div><p class="he dc-word" lang="he">' + esc(L[0]) + '</p><h2>' + esc(tr) + '</h2></div></div>' +
      blk('ling', '<h4>1. Respuesta directa</h4><p><b>' + esc(L[3] || L[4]) + '</b>' + (L[3] ? '' : ' <span class="muted">(léxico de Strong, en inglés)</span>') + '.</p>') +
      blk('ling', '<h4>2. Explicación sencilla</h4><p>Se pronuncia «' + esc(tr) + '». Es ' + esc(posName(L[2])) + (L[7] ? ' de la raíz ' + esc(rootStr(L[7])) : '') + ' y aparece ' + L[5] + ' veces en el Tanaj.</p>') +
      (conc ? blk('ense', '<h4>3. Desarrollo</h4><p>' + esc(conc.sencillo) + '</p>' + (conc.profundo || []).map(x => '<p>' + esc(x) + '</p>').join('')) : '') +
      blk('ling', '<h4>4. Análisis hebreo</h4>' + (c.fam.length > 1 ? '<p>Familia de la raíz:</p><div class="rows">' + c.fam.filter(x => x !== k).slice(0, 6).map(word).join('') + '</div>' : '<p>No se registra familia de palabras en el índice BDB.</p>') + (EXT.gematria ? '<p>Valor numérico: ' + EXT.gematria(L[0]).std + '.</p>' : '')) +
      blk('texto', '<h4>5. Contexto bíblico</h4><p>Primera aparición: ' + (L[6] ? refLink(L[6]) : '—') + '.</p>' + (L[6] ? await verseHTML(L[6]) : '')) +
      (ex ? blk('trad', '<h4>6. Referencias de las Escrituras</h4>' + ex) : '') +
      (c.pars.length ? '<h4 class="bb-h">7. Parashiot donde más aparece</h4><div class="chips">' + c.pars.map(p => '<a class="chip" href="#parasha-' + p.n + '">' + esc(p.tr) + '</a>').join('') + '</div>' : '') +
      (conc && conc.interp ? blk('trad2', '<h4>8. Interpretaciones</h4><p>' + esc(conc.interp) + '</p>') : '') +
      '<h4 class="bb-h">9. Mapa de conexiones</h4>' + mapHTML(k, c) +
      '<h4 class="bb-h">10. Para seguir estudiando</h4><div class="btns"><a class="btn" href="#concordancia-' + k + '">Todas las apariciones</a>' + (c.verb ? '<a class="btn" href="#pealim-' + c.verb + '">Conjugaciones</a>' : '') + c.recs.map(r => '<a class="btn" href="#bib-' + r.id + '">' + esc(r.t) + '</a>').join('') + '<button class="btn solid" data-act="bb-ask" data-q="hazme preguntas">Hazme preguntas</button></div>' +
      '<p class="mo-note">Fuentes: léxico de Strong, índice BDB, análisis morfológico del Open Scriptures Hebrew Bible y significados en español de Beit Hatzirah.</p></div>';
  }
  const POS = { v: 'un verbo', 'n-m': 'un sustantivo masculino', 'n-f': 'un sustantivo femenino', a: 'un adjetivo', prep: 'una preposición', conj: 'una conjunción', adv: 'un adverbio' };
  const posName = p => POS[p] || (p && p.startsWith('n-pr') ? 'un nombre propio' : p && p.startsWith('n') ? 'un sustantivo' : 'una palabra');

  /* ---------- Panel local para ampliar la biblioteca ---------- */
  function vAdmin() {
    const L = B.Store.get('biblioteca:local', []) || [];
    B.view().innerHTML = B.top('Ampliar la biblioteca', { back: 'biblioteca' }) + '<div class="wrap bb"><div class="notice">Este panel guarda los registros <b>solo en este dispositivo</b>. Para que todos los usuarios los reciban, expórtalos y agrégalos al proyecto (archivo <code>data/biblioteca.json</code>) en la próxima publicación.</div>' +
      '<h3 class="h-sec" style="margin-top:16px">Registros locales (' + L.length + ')</h3><div class="rows">' + (L.map((r, i) => '<div class="row"><span class="t"><b>' + esc(r.t) + '</b><span>' + esc(catName(r.cat)) + '</span></span><button class="btn" data-act="ad-edit" data-i="' + i + '">Editar</button><button class="btn" data-act="ad-del" data-i="' + i + '">Borrar</button></div>').join('') || '<p class="muted">Todavía no hay registros locales.</p>') + '</div>' +
      '<h3 class="h-sec" style="margin-top:16px">Nuevo registro</h3><form id="ad-f" class="bb-form" onsubmit="return false">' +
      '<label>Identificador<input name="id" required placeholder="por ejemplo: tema-sucot"></label>' +
      '<label>Categoría<select name="cat">' + BIB.cats.map(c => '<option value="' + c.id + '">' + esc(c.t) + '</option>').join('') + '</select></label>' +
      '<label>Título<input name="t" required></label><label>Hebreo (opcional)<input name="he" dir="rtl" lang="he"></label>' +
      '<label>Respuesta directa<textarea name="directa" rows="2" required></textarea></label><label>Explicación sencilla<textarea name="sencillo" rows="3"></textarea></label>' +
      '<label>Desarrollo (un párrafo por línea)<textarea name="profundo" rows="5"></textarea></label>' +
      '<label>Referencias (por ejemplo: GEN 1:1, PSA 23:1)<input name="refs"></label><label>Palabras hebreas (números de Strong, por ejemplo: 7965, 2617)<input name="palabras"></label>' +
      '<label>Fuente / autor<input name="autor" value="Beit Hatzirah"></label><label>Confiabilidad<input name="confiabilidad" value="Pendiente de revisión"></label>' +
      '<div class="btns"><button class="btn solid" data-act="ad-save">Validar y guardar</button></div><div id="ad-msg"></div></form>' +
      '<div class="btns" style="margin:18px 0"><button class="btn" data-act="ad-export">Exportar registros locales (JSON)</button><label class="btn">Importar JSON<input type="file" id="ad-imp" accept=".json,application/json" hidden></label></div></div>';
    document.getElementById('ad-imp').addEventListener('change', async e => { const f = e.target.files[0]; if (!f) return; try { const arr = JSON.parse(await f.text()); const list = Array.isArray(arr) ? arr : arr.registros || []; const cur = B.Store.get('biblioteca:local', []) || []; let n = 0; for (const r of list) { const v = await validate(r); if (!v.length) { const i = cur.findIndex(x => x.id === r.id); if (i >= 0) cur[i] = r; else cur.push(r); n++; } } B.Store.set('biblioteca:local', cur); B.toast(n + ' registros importados'); BIB = null; vAdmin(); } catch (x) { B.toast('El archivo no es un JSON válido'); } });
  }
  async function validate(r) {
    await data(); const errs = [];
    if (!r.id || !/^[a-z0-9-]+$/.test(r.id)) errs.push('El identificador solo puede tener letras minúsculas, números y guiones.');
    if (!r.t) errs.push('Falta el título.'); if (!r.directa) errs.push('Falta la respuesta directa.');
    if (BIB.registros.some(x => x.id === r.id)) errs.push('Ese identificador ya existe en la biblioteca publicada.');
    for (const x of r.refs || []) { const m = x.match(/^(\w+) (\d+)(?::(\d+))?/); if (!m || !B.BY[m[1]]) { errs.push('Referencia no válida: ' + x); continue; } const d = await B.getBookV(m[1]); const ch = d.c[+m[2] - 1]; if (!ch || (m[3] && !ch[+m[3] - 1])) errs.push('La referencia no existe: ' + x); }
    for (const k of r.palabras || []) if (!LX[k]) errs.push('No existe la palabra Strong ' + k + '.');
    return errs;
  }

  /* ---------- Evaluación del Moreh ---------- */
  const TESTS = [
    ['Fácil', 'Búsqueda de palabras', '¿Qué significa shalom?', a => /paz/.test(a) && /שָׁלוֹם/.test(a)],
    ['Fácil', 'Búsqueda de palabras', '¿Qué significa אהבה?', a => /amor/i.test(a)],
    ['Fácil', 'Raíces', '¿Cuál es la raíz de שָׁמַר?', a => /ש־?ׁ?־?מ־ר|שׁ־מ־ר|ש־מ־ר/.test(a)],
    ['Fácil', 'Referencias bíblicas', 'Juan 3:16', a => /Elohim amó|amó tanto/.test(a)],
    ['Fácil', 'Parashiot', '¿Qué significa Bereshit?', a => /principio/i.test(a)],
    ['Fácil', 'Gematría', '¿Cuál es la gematría de שלום?', a => /376/.test(a)],
    ['Fácil', 'Español-hebreo', '¿Cómo se dice amor en hebreo?', a => /אַהֲבָה/.test(a) && /חֶסֶד/.test(a)],
    ['Fácil', 'Tefilot', '¿Cómo es la bendición del pan?', a => /הַמּוֹצִיא|Hamotz/i.test(a)],
    ['Intermedio', 'Raíces', '¿Cuál es la raíz de קֹדֶשׁ?', a => /ק־ד־ש/.test(a)],
    ['Intermedio', 'Búsqueda de palabras', '¿Dónde aparece por primera vez אוֹר?', a => /Bereshit 1:3/.test(a)],
    ['Intermedio', 'Traducciones', '¿Qué diferencia hay entre jésed y emuná?', a => /חֶסֶד/.test(a) && /אֱמוּנָה/.test(a)],
    ['Intermedio', 'Parashiot', '¿Qué enseña la parashá Noaj?', a => /Noaj|Nóaj/.test(a) && /Haftará|haftará/.test(a)],
    ['Intermedio', 'Referencias bíblicas', '¿Qué referencias cruzadas existen para Isaías 53:5?', a => /Kefá|Pedro|Romanos|Mattityahu|Isaías|Yeshayahu/.test(a)],
    ['Intermedio', 'Gramática', '¿Qué es el estado constructo?', a => /smijut|constructo/i.test(a)],
    ['Intermedio', 'Gramática', '¿Qué son los binyanim?', a => /Qal/.test(a) && /Hifil/.test(a)],
    ['Intermedio', 'Conceptos', '¿Qué significa tzedaká?', a => /justicia/i.test(a)],
    ['Intermedio', 'Estudios', '¿Qué dice el Tanaj sobre el Mashíaj?', a => /Miqueas|Mijá|Belén|Isaías|Yeshayahu/.test(a)],
    ['Intermedio', 'Verbos', 'Explícame el verbo בָּרָא', a => /crear/i.test(a)],
    ['Avanzado', 'Relaciones entre módulos', 'Muéstrame las conexiones de shalom', a => /Raíz/.test(a) && /Apariciones/.test(a)],
    ['Avanzado', 'Historia', '¿Cómo funcionaba la agricultura en el antiguo Israel?', a => /siete especies|lluvia/i.test(a)],
    ['Avanzado', 'Arqueología', '¿Qué es la estela de Tel Dan?', a => /casa de David/i.test(a)],
    ['Avanzado', 'Gramática', '¿Qué es la vav consecutiva?', a => /vayiqtol/i.test(a)],
    ['Avanzado', 'Conceptos', '¿Qué significa justicia en hebreo?', a => /צֶדֶק|צְדָקָה/.test(a) && /מִשְׁפָּט/.test(a)],
    ['Avanzado', 'Parashiot', '¿Cuál es el contexto de Génesis 12?', a => /Lej Lej|Lej-Lej/i.test(a)],
    ['Intermedio', 'Español-hebreo', '¿Cómo se dice fe en hebreo?', a => /אֱמוּנָה/.test(a)],
    ['Intermedio', 'Verbos', 'Explícame el verbo שָׁמַר', a => /guardar/i.test(a) && /Qal/.test(a)],
    ['Intermedio', 'Agente', 'Abre la ficha de jésed', a => /חֶסֶד/.test(a)],
    ['Intermedio', 'Agente', 'Recomiéndame una lección', a => /curso|parashá/i.test(a)],
    ['Intermedio', 'Agente', 'Guarda la palabra shalom', a => /¿Agrego/.test(a)],
    ['Avanzado', 'Agente', 'Moreh, quiero estudiar el significado de la palabra Shalom', a => /paz/.test(a) && /Estudio completo/.test(a)],
    ['Avanzado', 'Conceptos', '¿Qué es el Mishkán?', a => /tabernáculo/i.test(a)],
    ['Avanzado', 'Verbos', 'Explícame el verbo נָתַן', a => /Primera נ/.test(a)],
    ['Intermedio', 'Análisis morfológico', 'Analiza la forma וַיֹּאמֶר', a => /Qal/.test(a) && /vayiqtol/.test(a) && /él/.test(a)],
    ['Avanzado', 'Análisis morfológico', '¿De qué raíz viene וְאָהַבְתָּ?', a => /א־ה־ב/.test(a) && /veqatal/.test(a)],
    ['Avanzado', 'Análisis morfológico', 'Analiza שְׁמָרֵנִי', a => /imperativo/.test(a) && /a mí/.test(a)],
    ['Intermedio', 'Binyanim', '¿Qué es el binyán Nifal?', a => /pasivo|reflexivo/i.test(a)],
    ['Intermedio', 'Binyanim', 'Explícame el Hitpael', a => /reflexivo|recíproco/i.test(a)],
    ['Intermedio', 'Torá', '¿Cuántos capítulos tiene Bereshit?', a => /50 capítulos/.test(a)],
    ['Intermedio', 'Historia', '¿Qué pasó con el reino de Israel del norte?', a => /722/.test(a)],
    ['Avanzado', 'Historia', '¿Cuándo fue el Éxodo?', a => /XV|XIII/.test(a) && /debate/i.test(a)],
    ['Intermedio', 'Arqueología', '¿Qué se encontró en Cesarea?', a => /Pilato/.test(a)],
    ['Intermedio', 'Geografía', '¿Qué era Moav?', a => /Rut/.test(a)],
    ['Intermedio', 'Cultura', '¿Qué eran los sacrificios en la Torá?', a => /olá/i.test(a)],
    ['Intermedio', 'Fiestas', '¿Qué es Januká?', a => /164/.test(a) && /no está mandada/i.test(a)],
    ['Avanzado', 'Fiestas', '¿Qué es Yom Kipur?', a => /Tradición|tradición/.test(a)],
    ['Avanzado', 'Gramática', '¿Qué diferencia hay entre hebreo bíblico y hebreo moderno?', a => /vav consecutiva/i.test(a)],
    ['Prueba A', 'Alfabeto', '¿Qué es la letra Kaf?', a => /ך/.test(a) && /20/.test(a)],
    ['Prueba B', 'Nikud', '¿Qué es el qamatz qatán?', a => /kol/i.test(a)],
    ['Prueba C', 'Diccionario', '¿Qué significa שלום?', a => /paz/.test(a)],
    ['Prueba C', 'Diccionario', '¿Qué significa שָׁלוֹם?', a => /paz/.test(a)],
    ['Prueba D', 'Raíz', '¿Cuál es la raíz de שמר?', a => /ש־?ׁ?־?מ־ר|שׁ־מ־ר/.test(a) && /guardia|custodia/.test(a)],
    ['Prueba E', 'Verbo', 'Analiza la forma וַיִּקְרָא', a => /Qal/.test(a) && /vayiqtol/.test(a) && /llamar/.test(a)],
    ['Prueba F', 'Partícula', '¿Qué es אֵת?', a => /complemento directo/.test(a) && /interpretación/.test(a)],
    ['Prueba G', 'Versículo', 'Analiza Bereshit 1:1 palabra por palabra', a => /רֵאשִׁית|ראשית/.test(a) && /Qal/.test(a)],
    ['Prueba H', 'Comparación', '¿Qué diferencia hay entre jésed y rajamim?', a => /pacto/.test(a) && /compasi/.test(a)],
    ['Prueba I', 'Conjugación', 'Muéstrame el paradigma de אמר', a => /documentadas/.test(a) && /Primera א/.test(a)],
    ['Prueba J', 'Poesía', 'Analiza el Salmo 1', a => /inclusio/i.test(a) && /paralelismo/i.test(a)],
    ['Prueba K', 'Crítica textual', '¿Qué variantes hay en Deuteronomio 32:8?', a => /Qumrán/.test(a)],
    ['Prueba L', 'Capítulo completo', 'Estudia el capítulo Génesis 1', a => /Vocabulario/.test(a) && /binyán/.test(a) && /Estructura/.test(a)],
    ['Avanzado', 'Reconocer lo que no sabe', '¿Qué es la astronomía?', a => /no encontr|no tengo|conocimiento general/i.test(a)],
    ['Avanzado', 'Reconocer lo que no sabe', '¿Cuál es la capital de Australia?', a => /no encontr|no tengo|conocimiento general/i.test(a)],
    ['Avanzado', 'Reconocer lo que no sabe', '¿Quién ganó el mundial de fútbol de 1978?', a => /no encontr|no tengo|conocimiento general/i.test(a)]
  ];
  async function vEval() {
    B.view().innerHTML = B.top('Evaluación del Moreh', { back: 'biblioteca' }) + '<div class="wrap bb"><p style="margin-top:14px">Esta prueba hace ' + TESTS.length + ' preguntas al Moreh y comprueba que cada respuesta contenga los datos correctos y respaldados, no solo que «suene bien». Incluye preguntas que el Moreh debe reconocer que no puede responder.</p><button class="btn solid" data-act="ev-run">Ejecutar la evaluación</button><div id="ev-out"></div></div>';
  }
  async function runEval() {
    const out = document.getElementById('ev-out'); out.innerHTML = '<div class="loading">Evaluando…</div>'; const res = [];
    for (const [lvl, area, q, ok] of TESTS) { let a = null, txt = ''; try { a = await EXT.morehChat.respond(q); const d = document.createElement('div'); d.innerHTML = (a.title || '') + ' ' + (a.blocks || []).map(b => b.html).join(' ') + ' ' + (a.sources || []).map(s => s[0]).join(' '); txt = d.textContent; } catch (e) { txt = 'ERROR ' + e.message; } res.push([lvl, area, q, ok(txt), txt.slice(0, 160)]); }
    const pass = res.filter(r => r[3]).length; window.__evalResult = { pass, total: res.length, res }; B.Store.set('moreh:eval', { pass, total: res.length, fecha: new Date().toLocaleDateString('es') });
    out.innerHTML = '<h3>Resultado: ' + pass + ' de ' + res.length + ' correctas</h3>' + ['Fácil', 'Intermedio', 'Avanzado', 'Prueba A', 'Prueba B', 'Prueba C', 'Prueba D', 'Prueba E', 'Prueba F', 'Prueba G', 'Prueba H', 'Prueba I', 'Prueba J', 'Prueba K', 'Prueba L'].map(l => '<h4 class="bb-h">' + l + '</h4>' + res.filter(r => r[0] === l).map(r => '<div class="ev-r ' + (r[3] ? 'ok' : 'bad') + '"><b>' + (r[3] ? '✓' : '✗') + ' ' + esc(r[1]) + ':</b> ' + esc(r[2]) + '<small>' + esc(r[4]) + '…</small></div>').join('')).join('');
  }

  /* ---------- Palabras fundamentales ---------- */
  async function vFund() {
    await data();
    B.view().innerHTML = B.top('Palabras fundamentales', { back: 'biblioteca' }) + '<div class="wrap bb"><p style="margin-top:14px">La colección básica del hebreo bíblico, organizada por temas. Cada palabra abre su ficha completa en el diccionario.</p>' +
      (BIB.fundamentales || []).map(([cat, items]) => '<h3 class="h-sec" style="margin-top:16px">' + esc(cat) + '</h3><div class="rows">' + items.map(([k, nota]) => word(k).replace('</span></span>', (nota ? ' · ' + esc(nota) : '') + '</span></span>')).join('') + '</div>').join('') + '</div>';
  }

  /* ---------- Clases: «Estudiemos juntos» por temas ---------- */
  const CLASES = {
    hebreo: ['Hebreo desde cero', ['g-alefbet', 'g-finales', 'g-nikud', 'g-shva', 'g-daguesh', 'g-begadkefat', 'g-guturales', 'g-articulo', 'g-prefijos', 'g-genero-numero', 'g-pronombres', 'g-oracion-nominal']],
    binyanim: ['Los siete binyanim', ['g-binyanim', 'b-qal', 'b-nifal', 'b-piel', 'b-pual', 'b-hifil', 'b-hofal', 'b-hitpael']],
    conjugar: ['Aprender a conjugar', ['g-aspectos', 'g-personas', 'g-vav-consecutiva', 'g-binyanim', 'g-verbos-debiles']],
    gramatica: ['Gramática intermedia', ['g-constructo', 'g-sufijos', 'g-adjetivo', 'g-et', 'g-posesion', 'g-negacion', 'g-interrogativas', 'g-mishkal', 'g-dual', 'g-subordinadas', 'g-discursivas', 'g-ketiv-qere', 'g-biblico-moderno']],
    historia: ['Historia del antiguo Israel', ['h-cercano-oriente', 'h-patriarcas', 'h-egipto', 'h-exodo', 'h-desierto', 'h-canaan', 'h-jueces', 'h-monarquia', 'h-israel-norte', 'h-juda', 'h-babilonia', 'h-persia', 'h-helenistico', 'h-roma', 'h-posterior']],
    profetas: ['El contexto histórico de los profetas', ['profetas', 'h-monarquia', 'h-israel-norte', 'h-juda', 'exilio', 'h-babilonia', 'h-persia', 'restauracion']],
    bereshit: ['Estudiemos Bereshit', ['libro-gen', 'creacion', 'adam-java', 'noaj', 'avraham', 'yitzjak', 'yaakov', 'yosef']],
    tora: ['Los cinco libros de la Torá', ['libro-gen', 'libro-exo', 'libro-lev', 'libro-num', 'libro-deu']],
    fiestas: ['Las fiestas bíblicas', ['moed-shabat', 'moed-pesaj', 'moed-matzot', 'moed-bikurim', 'moed-shavuot', 'moed-yomTeruah', 'moed-yomKippur', 'moed-sukkot', 'moed-sheminiAtzeret', 'moed-januka', 'moed-purim']],
    arqueologia: ['Arqueología bíblica', ['sitio-jerusalen-arq', 'sitio-meguido', 'sitio-lajish', 'sitio-shomron', 'sitio-qumran', 'sitio-cesarea', 'rollos-mar-muerto', 'estela-tel-dan', 'inscripcion-siloe']]
  };
  let CL = null;
  async function vClase(p) {
    await data(); const id = p[1]; const C = CLASES[id]; if (!C) return B.go('biblioteca');
    if (!CL || CL.id !== id) { const recs = C[1].map(rec).filter(Boolean); const sh = a => a.map(x => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
      const qs = sh(recs).slice(0, 4).map(r => ({ q: '¿Qué afirmación corresponde a «' + r.t.replace(/\s*\(.*\)/, '') + '»?', ok: r.directa, opts: sh([r.directa].concat(sh(recs.filter(x => x !== r)).slice(0, 2).map(x => x.directa))) }));
      CL = { id, recs, i: 0, qs, ans: {} }; }
    const n = CL.recs.length + 1; const last = CL.i >= CL.recs.length;
    const r = CL.recs[CL.i]; let refs = ''; if (r) for (const x of r.refs.slice(0, 2)) refs += await verseHTML(x);
    const body = last ? '<h4>Comprobemos lo aprendido</h4>' + CL.qs.map((q, qi) => '<div class="st-q"><p><b>' + esc(q.q) + '</b></p><div class="mc-opts">' + q.opts.map((o, j) => { const st = CL.ans[qi]; const cls = st === undefined ? '' : o === q.ok ? ' ok' : st === j ? ' bad' : ''; return '<button class="btn' + cls + '" data-act="cl-ans" data-q="' + qi + '" data-j="' + j + '"' + (st !== undefined ? ' disabled' : '') + '>' + esc(o) + '</button>'; }).join('') + '</div></div>').join('') + (Object.keys(CL.ans).length === CL.qs.length ? '<p class="st-fb">Resultado: ' + CL.qs.filter((q, i) => q.opts[CL.ans[i]] === q.ok).length + ' de ' + CL.qs.length + '.</p>' : '')
      : '<h4>' + esc(r.t) + '</h4>' + (r.he ? '<p class="he mc-big" lang="he">' + esc(r.he) + '</p>' : '') + '<p>' + esc(r.directa) + '</p>' + (r.sencillo !== r.directa ? '<p>' + esc(r.sencillo) + '</p>' : '') + (r.profundo || []).map(x => '<p>' + esc(x) + '</p>').join('') + (r.ejemplo ? '<p class="he mc-he" lang="he" dir="rtl">' + esc(r.ejemplo[0]) + '</p><p><i>' + esc(r.ejemplo[1]) + '</i> — «' + esc(r.ejemplo[2]) + '»</p>' : '') + refs + '<p><a href="#bib-' + r.id + '">Abrir en la biblioteca</a></p>';
    B.view().innerHTML = B.top('Estudiemos juntos', { back: 'biblioteca' }) + '<div class="wrap mo-learnv"><div class="mo-stage">' + (EXT.moreh ? EXT.moreh.fig(last ? 'idle' : CL.i % 2 ? 'explain' : 'teach', '', last ? 'atento' : CL.i % 3 === 2 ? 'reflexivo' : 'explicativo', { wasp: r && (r.he || r.ejemplo) ? 'curious' : 'rest' }) : '') + '<div class="mo-board"><small>' + esc(C[0]) + ' · ' + (CL.i + 1) + ' de ' + n + '</small>' + body + '</div></div>' +
      '<div class="mo-steps"><button class="btn" data-act="cl-step" data-d="-1"' + (CL.i ? '' : ' disabled') + '>Anterior</button><div class="mo-dots">' + Array.from({ length: n }, (_, k) => '<i' + (k === CL.i ? ' class="on"' : '') + '></i>').join('') + '</div><button class="btn solid" data-act="cl-step" data-d="1"' + (CL.i < n - 1 ? '' : ' disabled') + '>Siguiente</button></div></div>';
  }
  /* ---------- Estado real del conocimiento del Moreh ---------- */
  async function vEstado() {
    await data(); const L = Object.values(LX); const toks = L.reduce((s, v) => s + v[5], 0); const es = L.filter(v => v[3]); const cov = es.reduce((s, v) => s + v[5], 0) / toks * 100;
    const byCat = {}; all().forEach(r => { byCat[r.cat] = (byCat[r.cat] || 0) + 1; }); const ev = B.Store.get('moreh:eval', null);
    const row = (a, b) => '<tr><th>' + a + '</th><td>' + b + '</td></tr>';
    B.view().innerHTML = B.top('Estado del conocimiento', { back: 'biblioteca' }) + '<div class="wrap bb"><p style="margin-top:14px">Datos calculados en este momento sobre los archivos de la app. El conocimiento <b>no está completo</b>: aquí se ve el avance real.</p>' +
      '<div class="lab-tbl"><table>' + row('Palabras del texto hebreo (corpus)', '306.774') + row('Lemas en el diccionario', L.length.toLocaleString('es')) + row('Lemas con significado en español', es.length.toLocaleString('es') + ' (' + cov.toFixed(1) + ' % de las apariciones)') + row('Familias de raíces (índice BDB)', Object.keys(RA).length.toLocaleString('es')) + row('Lemas verbales con tablas (PEALIM)', PI.length.toLocaleString('es') + ' de 1.614 lemas verbales del léxico') + row('Formas distintas indexadas (analizador)', '53.915 (todas las del texto hebreo)') + row('Palabras verbales del corpus', '74.101') + row('Registros de la Biblioteca del Moreh', all().length) + '</table></div>' +
      '<h3 class="h-sec" style="margin-top:16px">Biblioteca por categoría</h3><div class="lab-tbl"><table>' + Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([c, n]) => row(esc(catName(c)), n)).join('') + '</table></div>' +
      '<h3 class="h-sec" style="margin-top:16px">Evaluación</h3><p>' + (ev ? 'Última evaluación: <b>' + ev.pass + ' de ' + ev.total + '</b> (' + esc(ev.fecha) + ').' : 'Todavía no se ejecutó la evaluación en este dispositivo.') + ' <a href="#moreh-evaluacion">Ejecutar</a></p>' +
      '<h3 class="h-sec" style="margin-top:16px">Limitaciones actuales</h3><ul class="bb-list"><li>' + (L.length - es.length).toLocaleString('es') + ' lemas (sobre todo poco frecuentes y nombres propios) tienen solo la definición de Strong en inglés.</li><li>Sinónimos, antónimos, singular/plural y estado constructo no están registrados palabra por palabra; se ven en las formas reales del analizador.</li><li>El paradigma generado por reglas cubre los verbos regulares; los débiles muestran solo sus formas documentadas.</li><li>No hay mapas interactivos todavía.</li><li>El conocimiento general fuera de la biblioteca requiere el servidor opcional de IA.</li><li>No hay diccionario de hebreo moderno; el vocabulario moderno se señala solo en explicaciones puntuales.</li><li>Las redacciones de Beit Hatzirah están pendientes de revisión por la dirección de contenido.</li></ul></div>';
  }

  /* ---------- Acciones y rutas ---------- */
  Object.assign(EXT.act, {
    'bb-ask': el => { const q = el.dataset.q; B.go('moreh'); setTimeout(() => { const i = document.getElementById('mc-q'); if (i) { i.value = q; const s = document.querySelector('[data-act=mc-send]'); if (s) s.click(); } }, 700); },
    'es-pick': el => { const i = document.getElementById('esq'); i.value = el.dataset.w; esSearch(el.dataset.w); },
    'ad-save': async () => {
      const f = document.getElementById('ad-f'); const v = n => (f.elements[n].value || '').trim();
      const r = { id: v('id'), cat: v('cat'), t: v('t'), he: v('he') || undefined, directa: v('directa'), sencillo: v('sencillo') || v('directa'), profundo: v('profundo').split('\n').map(x => x.trim()).filter(Boolean), refs: v('refs').split(',').map(x => x.trim()).filter(Boolean), palabras: v('palabras').split(',').map(x => x.trim()).filter(Boolean), parashot: [], fuente: { autor: v('autor'), fecha: new Date().toISOString().slice(0, 10), confiabilidad: v('confiabilidad'), licencia: 'Borrador local' } };
      const errs = await validate(r); const msg = document.getElementById('ad-msg');
      if (errs.length) { msg.innerHTML = '<div class="notice">' + errs.map(esc).join('<br>') + '</div>'; return; }
      const L = B.Store.get('biblioteca:local', []) || []; const i = L.findIndex(x => x.id === r.id); if (i >= 0) L[i] = r; else L.push(r); B.Store.set('biblioteca:local', L); BIB = null; B.toast('Registro guardado en este dispositivo'); vAdmin();
    },
    'ad-edit': el => { const r = (B.Store.get('biblioteca:local', []) || [])[+el.dataset.i]; const f = document.getElementById('ad-f'); if (!r || !f) return; const set = (n, v) => { if (f.elements[n]) f.elements[n].value = v || ''; }; set('id', r.id); set('cat', r.cat); set('t', r.t); set('he', r.he); set('directa', r.directa); set('sencillo', r.sencillo); set('profundo', (r.profundo || []).join('\n')); set('refs', (r.refs || []).join(', ')); set('palabras', (r.palabras || []).join(', ')); set('autor', (r.fuente || {}).autor); set('confiabilidad', (r.fuente || {}).confiabilidad); f.scrollIntoView({ behavior: 'smooth' }); },
    'ad-del': el => { if (!confirm('¿Borrar este registro local?')) return; const L = B.Store.get('biblioteca:local', []) || []; L.splice(+el.dataset.i, 1); B.Store.set('biblioteca:local', L); BIB = null; vAdmin(); },
    'ad-export': () => { const L = B.Store.get('biblioteca:local', []) || []; const b = new Blob([JSON.stringify({ registros: L }, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'biblioteca-local.json'; document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 1000); },
    'ev-run': () => runEval(),
    'cl-step': el => { CL.i = Math.max(0, Math.min(CL.recs.length, CL.i + +el.dataset.d)); vClase(['clase', CL.id]); window.scrollTo({ top: 0, behavior: 'smooth' }); },
    'cl-ans': el => { CL.ans[+el.dataset.q] = +el.dataset.j; const q = CL.qs[+el.dataset.q]; vClase(['clase', CL.id]); const st = document.querySelector('.mo-stage'); if (st && EXT.moreh) EXT.moreh.expr(st, q.opts[+el.dataset.j] === q.ok ? 'celebracion' : 'comprensivo'); if (Object.keys(CL.ans).length === CL.qs.length) { const c = B.Store.get('clases', {}) || {}; c[CL.id] = Date.now(); B.Store.set('clases', c); } }
  });
  Object.assign(EXT.routes, { fundamentales: vFund, clase: vClase, 'estado-moreh': vEstado, biblioteca: vHome, bibcat: vCat, bib: vRec, fuentes: vFuentes, dices: vDicEs, 'biblioteca-admin': vAdmin, estudio: p => p[1] === 'palabra' ? vEstudioPalabra(['x', p[2]]) : B.go('estudios'), 'moreh-evaluacion': vEval });
  ['fundamentales', 'clase', 'estado-moreh', 'biblioteca', 'bibcat', 'bib', 'fuentes', 'dices', 'biblioteca-admin', 'estudio', 'moreh-evaluacion'].forEach(r => { EXT.tabs[r] = ''; });
  EXT.biblioteca = { data, all: () => all(), rec: id => rec(id), connections, mapHTML, eshe: () => BIB && BIB.eshe };
})();
