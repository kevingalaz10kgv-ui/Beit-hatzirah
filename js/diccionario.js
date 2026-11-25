/* BEIT HATZIRAH — Diccionario bíblico, raíces, nombres divinos, hebreo y griego, temas,
   expresiones, concordancia, flashcards, gematría y búsqueda global.
   Fuentes: léxico de Strong (dominio público), índice de raíces Brown-Driver-Briggs (Open Scriptures),
   análisis morfológico del Open Scriptures Hebrew Bible (CC BY 4.0). */
(function () {
  'use strict';
  const EXT = window.BH_EXT;
  let B = null;
  const prevInit = EXT.init;
  EXT.init = api => { if (prevInit) prevInit(api); B = api; };
  const esc = s => B.esc(s);
  const he = (h, cls) => '<span class="he ' + (cls || '') + '" lang="he" dir="rtl">' + esc(h) + '</span>';
  const plain = h => (h || '').replace(/[^\u05D0-\u05EA]/g, '');
  const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[ʼʾʿ'’·\-]/g, '');
  const loose = s => norm(s).replace(/ch|kh/g, 'j').replace(/[yh]/g, '').replace(/(.)\1/g, '$1');

  /* ---------- Gematría ---------- */
  const LET = 'אבגדהוזחטיכלמנסעפצקרשת'.split('');
  const VAL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300, 400];
  const FIN = { 'ך': ['כ', 500], 'ם': ['מ', 600], 'ן': ['נ', 700], 'ף': ['פ', 800], 'ץ': ['צ', 900] };
  const NAMES = ['Álef', 'Bet', 'Guímel', 'Dálet', 'He', 'Vav', 'Záyin', 'Jet', 'Tet', 'Yod', 'Kaf', 'Lámed', 'Mem', 'Nun', 'Sámej', 'Áyin', 'Pe', 'Tsadi', 'Kof', 'Resh', 'Shin', 'Tav'];
  function letterVals(ch) {
    const fin = FIN[ch]; const base = fin ? fin[0] : ch; const i = LET.indexOf(base); if (i < 0) return null;
    const std = VAL[i]; return { ch, base, name: NAMES[i] + (fin ? ' final' : ''), std, gadol: fin ? fin[1] : std, katan: ((std - 1) % 9) + 1, siduri: i + 1 };
  }
  function gematria(word) {
    const rows = plain(word).split('').map(letterVals).filter(Boolean);
    const sum = k => rows.reduce((a, r) => a + r[k], 0);
    return { rows, std: sum('std'), gadol: sum('gadol'), katan: sum('katan'), siduri: sum('siduri'), reducido: digitalRoot(sum('std')) };
  }
  function digitalRoot(n) { while (n > 9) n = String(n).split('').reduce((a, d) => a + +d, 0); return n; }
  EXT.gematria = w => gematria(w);

  /* ---------- Datos ---------- */
  let LX = null, RA = null, DD = null, REFS = null, PI = null;
  async function data() {
    if (!LX) [LX, RA, DD, REFS, PI] = await Promise.all([B.getJSON('lexico.json'), B.getJSON('raices.json'), B.getJSON('diccionario.json'), B.getJSON('lemas.json'), B.getJSON('pealim/indice.json')]);
  }
  const ST = () => Object.assign({ fav: [], hist: [] }, B.Store.get('dic', {}) || {});
  const save = s => B.Store.set('dic', s);
  const POS = { v: 'verbo', 'n-m': 'sustantivo masculino', 'n-f': 'sustantivo femenino', 'n-m-f': 'sustantivo masculino o femenino', n: 'sustantivo', a: 'adjetivo', adv: 'adverbio', prep: 'preposición', conj: 'conjunción', prt: 'partícula', p: 'pronombre', d: 'demostrativo', i: 'interrogativo', r: 'relativo', inj: 'interjección', 'n-pr-m': 'nombre propio de persona (masculino)', 'n-pr-f': 'nombre propio de persona (femenino)', 'n-pr-loc': 'nombre de lugar', 'n-pr': 'nombre propio', 'a-m': 'adjetivo masculino', 'a-f': 'adjetivo femenino' };
  const posName = p => POS[p] || (p && p.startsWith('n-pr') ? 'nombre propio' : (p || '—'));
  const gloss = L => L[3] ? esc(L[3]) : esc(L[4] || '') + ' <span class="muted">(léxico de Strong, en inglés)</span>';
  // Transliteración sencilla a partir de la del léxico de Strong (ʼ, ʻ, signos de vocal larga, ch → j, ç → s, q → k, ts → tz)
  const simple = x => (x || '').replace(/[ʼʻ'’]/g, '').replace(/ôw/g, 'o').replace(/ûw/g, 'u').replace(/[âàä]/g, 'a').replace(/[êèë]/g, 'e').replace(/[îì]/g, 'i').replace(/[ôò]/g, 'o').replace(/[ûù]/g, 'u').replace(/ă/g, 'a').replace(/ĕ/g, 'e').replace(/ŏ/g, 'o').replace(/ch/g, 'j').replace(/Ch/g, 'J').replace(/ç/g, 's').replace(/q/g, 'k').replace(/Q/g, 'K').replace(/ts/g, 'tz').replace(/Ts/g, 'Tz').replace(/(.)\1/g, '$1').replace(/^(.)/, m => m);
  const trOf = k => { const v = PI && PI.find(x => x.id === k); return v ? v.tr : simple(LX[k][1]); };
  const row = (k, sub) => { const L = LX[k]; return '<a class="row" href="#dic-' + k + '"><span class="t"><b>' + esc(trOf(k)) + '</b><span>' + (L[3] ? esc(L[3]) : esc((L[4] || '').slice(0, 60)) + ' (inglés)') + (sub ? ' · ' + sub : '') + '</span></span>' + he(L[0]) + '</a>'; };

  /* ---------- Inicio del diccionario ---------- */
  async function vHome() {
    await data(); const s = ST();
    const tiles = [['dicletras', 'א', 'Hebreo-español', Object.keys(LX).length.toLocaleString('es') + ' palabras del Tanaj'], ['dicraices', 'שׁרשׁ', 'Raíces (shóresh)', Object.keys(RA).length.toLocaleString('es') + ' familias de palabras'], ['dicnombres', 'יָהּ', 'Nombres divinos', DD.nombres.length + ' nombres y títulos'], ['dicgriego', 'λόγος', 'Hebreo y griego', DD.hegr.length + ' términos comparados'], ['dictemas', '@dict', 'Diccionario temático', Object.keys(DD.temas).length + ' categorías'], ['dicexpr', '@chat', 'Expresiones idiomáticas', DD.idiom.length + ' expresiones'], ['gematria', '18', 'Gematría', 'Calculadora y conexiones'], ['flashcards', '@cards', 'Flashcards', 'Practica tus favoritas']];
    B.view().innerHTML = B.top('Diccionario bíblico', { back: 'menu' }) + '<div class="wrap dc">' +
      '<div class="dc-hero"><img class="sec-logo" src="' + B.LOGO + '" alt=""><p class="he" lang="he">מִלּוֹן</p><h2>Diccionario bíblico</h2><p class="muted">Hebreo bíblico, raíces, nombres divinos y griego del Brit Hadashá</p></div>' +
      '<div class="field">' + B.ic('search') + '<input type="search" id="dcq" placeholder="Palabra en hebreo o español, transliteración, raíz o número" aria-label="Buscar en el diccionario" autocomplete="off"></div><div id="dcres"></div>' +
      '<div class="dc-tiles">' + tiles.map(([r, i, t, sub]) => '<a class="dc-tile" href="#' + r + '"><span class="dc-ti' + (/[\u0590-\u05FF\u0370-\u03FF]/.test(i) ? ' he' : '') + '"' + (/[\u0590-\u05FF]/.test(i) ? ' lang="he"' : '') + '>' + (i[0] === '@' ? B.ic(i.slice(1)) : esc(i)) + '</span><b>' + esc(t) + '</b><small>' + esc(sub) + '</small></a>').join('') + '</div>' +
      (s.fav.length ? '<div class="group-title"><h3>★ Favoritas</h3></div><div class="rows">' + s.fav.filter(k => LX[k]).map(k => row(k)).join('') + '</div>' : '') +
      (s.hist.length ? '<div class="group-title"><h3>Historial</h3></div><div class="rows">' + s.hist.filter(k => LX[k]).slice(0, 8).map(k => row(k)).join('') + '</div>' : '') +
      '<div class="rows" style="margin-top:16px"><a class="row" href="#vocabulario"><span class="t"><b>Vocabulario del curso y glosario de Beit Hatzirah</b><span>Las palabras del curso «Yo aprendo hebreo», con su pronunciación</span></span></a></div>' +
      '<p class="dc-note">Significados en español redactados por Beit Hatzirah para las palabras más frecuentes; para las demás se muestra el léxico de Strong (en inglés). Raíces según el índice Brown-Driver-Briggs del Open Scriptures Hebrew Lexicon (CC BY 4.0). Primera aparición y concordancia calculadas sobre el texto hebreo.</p></div>';
  }
  function search(q) {
    q = q.trim(); if (!q) return [];
    if (/^\d+$/.test(q)) { const n = +q; return Object.keys(LX).filter(k => gematria(LX[k][0]).std === n).sort((a, b) => LX[b][5] - LX[a][5]).slice(0, 40).map(k => [k, 'gematría ' + n]); }
    if (/[\u05D0-\u05EA]/.test(q)) {
      const c = plain(q).replace(/[ךםןףץ]/g, x => FIN[x][0]); const un = h => plain(h).replace(/[ךםןףץ]/g, x => FIN[x][0]);
      const exact = [], root = [], part = [];
      for (const k in LX) { const w = un(LX[k][0]); if (w === c) exact.push(k); else if (LX[k][7] && un(LX[k][7]) === c) root.push(k); else if (w.includes(c)) part.push(k); }
      const by = a => a.sort((x, y) => LX[y][5] - LX[x][5]);
      return by(exact).map(k => [k, '']).concat(by(root).map(k => [k, 'misma raíz']), by(part).slice(0, 30).map(k => [k, '']));
    }
    const nq = loose(q); const res = [];
    for (const k in LX) { const L = LX[k]; const es = loose(L[3] || ''), tr = loose(trOf(k)), en = loose(L[4] || ''); const sc = (es.split(/[ ,;()]+/).includes(nq) ? 4 : es.includes(nq) ? 3 : 0) + (tr === nq ? 4 : tr.startsWith(nq) ? 2 : 0) + (!L[3] && en.includes(nq) ? 1 : 0); if (sc) res.push([k, sc]); }
    return res.sort((a, b) => b[1] - a[1] || LX[b[0]][5] - LX[a[0]][5]).slice(0, 40).map(([k]) => [k, '']);
  }
  let qt;
  document.addEventListener('input', e => {
    if (e.target.id !== 'dcq') return; clearTimeout(qt); const q = e.target.value;
    qt = setTimeout(() => { const out = document.getElementById('dcres'); if (!out) return; if (q.trim().length < 2 && !/^\d+$/.test(q.trim())) { out.innerHTML = ''; return; } const r = search(q); out.innerHTML = r.length ? '<div class="rows">' + r.map(([k, sub]) => row(k, sub)).join('') + '</div>' : '<p class="muted">Sin resultados.</p>'; }, 200);
  });

  /* ---------- Ficha de una palabra ---------- */
  async function vEntry(k) {
    await data(); const L = LX[k]; if (!L) return B.go('diccionario');
    const s = ST(); s.hist = [k].concat(s.hist.filter(x => x !== k)).slice(0, 40); save(s);
    const fam = (L[7] && RA[L[7]] || []).filter(x => x !== k);
    const g = gematria(L[0]); const refs = REFS[k] || (L[6] ? [L[6]] : []);
    const concepts = await notesFor(k, L);
    const fav = s.fav.includes(k);
    B.view().innerHTML = B.top(esc(trOf(k)), { back: 'diccionario', right: '<button class="icon-btn" data-act="dc-fav" data-k="' + k + '" aria-label="Favorita">' + (fav ? '★' : '☆') + '</button>' }) + '<div class="wrap dc study">' +
      '<div class="dc-head"><p class="he dc-word" lang="he">' + esc(L[0]) + '</p><h1>' + esc(trOf(k)) + '</h1><p class="dc-gloss">' + gloss(L) + '</p>' +
      '<div class="btns" style="justify-content:center"><button class="btn" data-act="dc-say" data-h="' + esc(L[0]) + '">🔊 Pronunciación</button>' + (L[2] === 'v' ? '<a class="btn" href="#pealim-' + k + '">Conjugaciones (PEALIM)</a>' : '') + '<a class="btn" href="#concordancia-' + k + '">Concordancia</a>' + (L[3] ? '<button class="btn" data-act="dc-save" data-k="' + k + '">Guardar para repasar</button>' : '') + '</div></div>' +
      '<dl class="meta dc-meta"><dt>Categoría</dt><dd>' + esc(posName(L[2])) + '</dd>' +
      (/^n-[mf]/.test(L[2]) ? '<dt>Género y número</dt><dd>' + (L[2].startsWith('n-f') ? 'femenino' : 'masculino') + ', forma de diccionario (singular)</dd>' : '') +
      '<dt>Raíz (shóresh)</dt><dd>' + (L[7] ? '<a href="#raiz-' + encodeURIComponent(plain(L[7])) + '" class="he" lang="he">' + esc(L[7].split('').join('־')) + '</a>' : '<span class="muted">sin raíz registrada en el índice BDB</span>') + '</dd>' +
      '<dt>Frecuencia</dt><dd>' + L[5].toLocaleString('es') + ' veces en el Tanaj</dd>' +
      '<dt>Primera aparición</dt><dd>' + (L[6] ? '<a href="#' + B.refRoute(L[6]) + '">' + esc(B.refLabel(L[6])) + '</a>' : '—') + '</dd>' +
      '<dt>Gematría</dt><dd><a href="#gematria" data-act="dc-gem" data-w="' + esc(plain(L[0])) + '">' + g.std + '</a> <span class="muted">(estándar) · ' + g.katan + ' (reducida) · ' + g.siduri + ' (ordinal)</span></dd>' +
      '<dt>Strong</dt><dd>H' + k + '</dd></dl>' +
      (concepts ? '<h2>Explicación</h2>' + concepts : '') +
      (fam.length ? '<h2>Familia de palabras</h2><div class="rows">' + fam.slice(0, 14).map(x => row(x)).join('') + '</div>' : '') +
      '<h2>Ejemplos en las Escrituras</h2><div id="dc-ex"><div class="loading">Cargando versículos…</div></div>' +
      '</div>';
    document.getElementById('dc-ex').innerHTML = await examples(refs.slice(0, 4)) + (refs.length > 4 ? '<p class="muted" style="font-size:.9rem">Más: ' + refs.slice(4, 40).map(r => '<a href="#' + B.refRoute(r) + '">' + esc(B.refLabel(r)) + '</a>').join(', ') + '</p>' : '') + '<p><a class="btn" href="#concordancia-' + k + '">Ver todas las apariciones</a></p>';
  }
  async function notesFor(k, L) {
    const out = []; const c = plain(L[0]);
    try { const BS = await B.getJSON('besora.json'); BS.raices.forEach(r => { if (plain(r.he) === c) out.push('<p><b>' + esc(r.tr) + ':</b> ' + esc(r.es) + '. ' + esc(r.apl) + ' ' + esc(r.rel) + (r.nota ? ' <span class="muted">' + esc(r.nota) + '</span>' : '') + '</p>'); }); } catch (e) { }
    DD.nombres.forEach(n => { if (plain(n.he) === c) out.push('<p><b>' + esc(n.tr) + ':</b> ' + esc(n.exp) + '</p>'); });
    DD.hegr.forEach(x => { if (x.he.split(' / ').some(h => plain(h) === c)) out.push('<p><b>En griego:</b> ' + '<span lang="el">' + esc(x.gr) + '</span> (' + esc(x.grt) + '). ' + esc(x.exp) + '</p>'); });
    try { const V = await B.getJSON('vocabulario.json'); V.forEach(v => { if (plain(v.he) === c && v.nota) out.push('<p>' + esc(v.nota) + '</p>'); }); } catch (e) { }
    return out.join('');
  }
  async function examples(refs) {
    let h = '';
    for (const r of refs) {
      const m = r.match(/^(\w+) (\d+):(\d+)/); if (!m) continue; const d = await B.getBookV(m[1]); const cell = (d.c[+m[2] - 1] || [])[+m[3] - 1]; if (!cell) continue;
      h += '<a class="result" href="#leer-' + m[1] + '-' + m[2] + '-' + m[3] + '"><b>' + esc(B.refLabel(r)) + '</b>' + (cell[1] && cell[1] !== '^' ? '<p class="he" lang="he">' + esc(B.heb(cell[1])) + '</p>' : '') + '<p>' + B.es(cell[0] || '', true) + '</p></a>';
    }
    return h;
  }

  /* ---------- Listas ---------- */
  async function vLetras(p) {
    await data(); const i = p[1] ? +p[1] : 0; const L0 = LET[i];
    const ks = Object.keys(LX).filter(k => plain(LX[k][0])[0] === L0 && !LX[k][2].startsWith('n-pr')).sort((a, b) => LX[b][5] - LX[a][5]);
    B.view().innerHTML = B.top('Hebreo-español', { back: 'diccionario' }) + '<div class="wrap dc"><div class="dc-abc" dir="rtl">' + LET.map((l, j) => '<a href="#dicletras-' + j + '" class="he' + (j === i ? ' on' : '') + '" lang="he">' + l + '</a>').join('') + '</div>' +
      '<p class="muted" style="margin:10px 0">' + ks.length + ' palabras que empiezan con ' + he(L0) + ', de la más frecuente a la menos frecuente (sin nombres propios).</p><div class="rows">' + ks.slice(0, 300).map(k => row(k, LX[k][5] + ' veces')).join('') + '</div>' + (ks.length > 300 ? '<p class="muted">Usa el buscador para encontrar las demás.</p>' : '') + '</div>';
  }
  async function vRaices(p) {
    await data();
    if (p[0] === 'raiz') {
      const r = decodeURIComponent(p.slice(1).join('-')); const key = Object.keys(RA).find(x => plain(x) === r); const ks = key ? RA[key] : [];
      B.view().innerHTML = B.top('Raíz ' + esc(r.split('').join('־')), { back: 'dicraices' }) + '<div class="wrap dc"><div class="dc-head"><p class="he dc-word" lang="he">' + esc(r.split('').join('־')) + '</p><p class="muted">' + ks.length + ' palabras de esta raíz en el Tanaj (según el índice Brown-Driver-Briggs)</p></div>' +
        '<div class="rows">' + ks.map(k => row(k, posName(LX[k][2]) + ' · ' + LX[k][5] + ' veces')).join('') + '</div>' +
        (ks.some(k => LX[k][2] === 'v') ? '<p><a class="btn" href="#pealim-' + ks.find(k => LX[k][2] === 'v') + '">Ver las conjugaciones del verbo</a></p>' : '') + '</div>';
      return;
    }
    const top = Object.entries(RA).map(([r, ks]) => [r, ks, ks.reduce((a, k) => a + LX[k][5], 0)]).sort((a, b) => b[2] - a[2]);
    B.view().innerHTML = B.top('Raíces hebreas', { back: 'diccionario' }) + '<div class="wrap dc"><p style="margin-top:16px">La mayoría de las palabras hebreas se forman sobre una raíz de tres consonantes. Escribe una raíz para ver su familia de palabras, o elige una de las más frecuentes.</p>' +
      '<div class="field">' + B.ic('search') + '<input id="rq" placeholder="Escribe una raíz (ej.: קדש)" aria-label="Buscar raíz" dir="auto" lang="he"></div><div class="dc-kbd" id="rkbd">' + kbd('rq') + '</div><div id="rres"></div>' +
      '<div class="group-title"><h3>Las raíces más frecuentes</h3></div><div class="dc-roots">' + top.slice(0, 120).map(([r, ks, n]) => '<a href="#raiz-' + encodeURIComponent(plain(r)) + '"><span class="he" lang="he">' + esc(r.split('').join('־')) + '</span><small>' + ks.length + ' palabras</small></a>').join('') + '</div></div>';
  }
  const kbd = target => LET.concat(['ך', 'ם', 'ן', 'ף', 'ץ']).map(l => '<button class="he" lang="he" data-act="dc-key" data-t="' + target + '" data-l="' + l + '">' + l + '</button>').join('') + '<button data-act="dc-key" data-t="' + target + '" data-l="⌫" aria-label="Borrar">⌫</button>';
  document.addEventListener('input', e => {
    if (e.target.id === 'rq') rootSearch(e.target.value);
    if (e.target.id === 'gq') gemCalc();
  });
  function rootSearch(v) {
    const c = plain(v); const out = document.getElementById('rres'); if (!out) return; if (c.length < 2) { out.innerHTML = ''; return; }
    const hits = Object.keys(RA).filter(r => plain(r).includes(c)).slice(0, 30);
    out.innerHTML = hits.length ? '<div class="dc-roots">' + hits.map(r => '<a href="#raiz-' + encodeURIComponent(plain(r)) + '"><span class="he" lang="he">' + esc(r.split('').join('־')) + '</span><small>' + RA[r].length + ' palabras</small></a>').join('') + '</div>' : '<p class="muted">No se encontró esa raíz.</p>';
  }
  async function vNombres() {
    await data();
    B.view().innerHTML = B.top('Nombres divinos', { back: 'diccionario' }) + '<div class="wrap dc study"><div class="dc-head"><p class="he dc-word" lang="he">שְׁמוֹת הָאֱלֹהִים</p><h1>Nombres y títulos divinos</h1></div>' +
      '<p>En las Escrituras, el Creador se revela con su Nombre y con títulos que expresan su carácter. En el texto hebreo se conserva siempre la escritura original; en español, Beit Hatzirah presenta el Nombre como <b>YAH</b>.</p>' +
      DD.nombres.map((n, i) => '<details class="dc-name"' + (i < 2 ? ' open' : '') + '><summary>' + he(n.he, 'dc-nh') + '<span><b>' + esc(n.tr) + '</b><small>' + esc(n.sig) + '</small></span></summary><div class="body"><p>' + esc(n.exp) + '</p><p class="muted">Textos: ' + n.refs.map(r => '<a href="#' + B.refRoute(r) + '">' + esc(B.refLabel(r)) + '</a>').join(', ') + '</p></div></details>').join('') + '</div>';
  }
  async function vGriego() {
    await data();
    B.view().innerHTML = B.top('Hebreo y griego', { back: 'diccionario' }) + '<div class="wrap dc study"><div class="dc-head"><h1>Del Tanaj al Brit Hadashá</h1><p class="muted">Cómo se expresan en griego los grandes términos hebreos</p></div>' +
      '<p>Los escritos apostólicos se escribieron en griego, pero sus autores pensaban con las categorías del Tanaj. Muchas palabras griegas llegan a través de la Septuaginta, la traducción griega del Tanaj hecha por judíos antes de Yahshúa. Comparar ambos idiomas ayuda a no perder el sentido hebreo.</p>' +
      DD.hegr.map(x => '<article class="dc-gr"><div class="dc-grh"><div>' + he(x.he, 'dc-nh') + '<small>' + esc(x.tr) + '</small></div><span>→</span><div><b lang="el">' + esc(x.gr) + '</b><small>' + esc(x.grt) + '</small></div></div><p><b>' + esc(x.sig) + '.</b> ' + esc(x.exp) + '</p><p class="muted" style="font-size:.88rem">Tanaj: ' + x.rt.map(r => '<a href="#' + B.refRoute(r) + '">' + esc(B.refLabel(r)) + '</a>').join(', ') + ' · Brit Hadashá: ' + x.ra.map(r => '<a href="#' + B.refRoute(r) + '">' + esc(B.refLabel(r)) + '</a>').join(', ') + '</p></article>').join('') + '</div>';
  }
  async function vTemas(p) {
    await data(); const cats = Object.keys(DD.temas);
    const i = p[1] !== undefined ? +p[1] : -1;
    if (i >= 0 && cats[i]) {
      B.view().innerHTML = B.top(esc(cats[i]), { back: 'dictemas' }) + '<div class="wrap dc"><div class="rows" style="margin-top:12px">' + DD.temas[cats[i]].map(k => row(k)).join('') + '</div></div>'; return;
    }
    const extra = [['Fiestas bíblicas (estudio)', '#besora-fiestas'], ['Profecías del Mashíaj', '#besora-profecias'], ['Verbos hebreos (PEALIM)', '#pealim'], ['Nombres divinos', '#dicnombres'], ['Expresiones idiomáticas', '#dicexpr'], ['Lugares y personajes', '#dictemas-lp']];
    if (p[1] === 'lp') {
      const ks = Object.keys(LX).filter(k => LX[k][2].startsWith('n-pr')).sort((a, b) => LX[b][5] - LX[a][5]).slice(0, 150);
      B.view().innerHTML = B.top('Lugares y personajes', { back: 'dictemas' }) + '<div class="wrap dc"><p class="muted" style="margin-top:12px">Los 150 nombres propios más frecuentes del Tanaj. Transliteración del léxico de Strong.</p><div class="rows">' + ks.map(k => '<a class="row" href="#dic-' + k + '"><span class="t"><b>' + esc(simple(LX[k][1])) + '</b><span>' + esc(posName(LX[k][2])) + ' · ' + LX[k][5] + ' veces</span></span>' + he(LX[k][0]) + '</a>').join('') + '</div></div>';
      return;
    }
    B.view().innerHTML = B.top('Diccionario temático', { back: 'diccionario' }) + '<div class="wrap dc"><div class="rows" style="margin-top:12px">' + cats.map((c, j) => '<a class="row" href="#dictemas-' + j + '"><span class="t"><b>' + esc(c) + '</b><span>' + DD.temas[c].length + ' palabras</span></span></a>').join('') + extra.map(([t, h]) => '<a class="row" href="' + h + '"><span class="t"><b>' + esc(t) + '</b></span></a>').join('') + '</div></div>';
  }
  async function vExpr() {
    await data();
    B.view().innerHTML = B.top('Expresiones idiomáticas', { back: 'diccionario' }) + '<div class="wrap dc study"><p style="margin-top:16px">El hebreo bíblico usa imágenes concretas para ideas abstractas. Traducirlas palabra por palabra puede ocultar su sentido.</p>' +
      DD.idiom.map(x => '<div class="dc-idiom">' + he(x.he, 'dc-nh') + '<b>' + esc(x.tr) + '</b><p>' + esc(x.es) + '</p><a href="#' + B.refRoute(x.ref) + '">' + esc(B.refLabel(x.ref)) + '</a></div>').join('') + '</div>';
  }

  /* ---------- Concordancia ---------- */
  async function vConc(p) {
    await data(); const k = p[1]; const L = LX[k]; if (!L) return B.go('diccionario');
    B.view().innerHTML = B.top('Concordancia', { back: 'dic-' + k }) + '<div class="wrap dc"><div class="dc-head"><p class="he dc-word" lang="he">' + esc(L[0]) + '</p><p>' + gloss(L) + '</p></div><p id="cc-st" class="muted">Buscando en el texto hebreo…</p><div id="cc-out"></div></div>';
    const books = B.BOOKS.filter(b => !b.nt); const hits = []; let n = 0;
    for (const b of books) {
      const st = document.getElementById('cc-st'); if (!st) return; st.textContent = 'Buscando en ' + b.tr + '… ' + hits.length + ' versículos';
      let M; try { M = await B.getJSON('morph/' + b.c + '.json'); } catch (e) { continue; }
      const H2E = await B.getJSON('h2e.json');
      for (const cv of Object.keys(M)) { const ws = M[cv]; let c = 0; ws.forEach(w => w[1].split('/').forEach(l => { if (/^\d/.test(l) && l.replace(/\D/g, '').split(' ')[0] === k) c++; })); if (c) { n += c; hits.push(b.c + ' ' + (H2E[b.c + ' ' + cv] || cv)); } }
    }
    const st = document.getElementById('cc-st'); if (!st) return;
    st.textContent = n + ' apariciones en ' + hits.length + ' versículos.';
    document.getElementById('cc-out').innerHTML = await examples(hits.slice(0, 12)) + (hits.length > 12 ? '<div class="dc-refs">' + hits.slice(12, 1500).map(r => '<a href="#' + B.refRoute(r) + '">' + esc(B.refLabel(r)) + '</a>').join('') + '</div>' : '');
  }

  /* ---------- Flashcards ---------- */
  let FC = { list: [], i: 0, flip: false };
  async function vFlash(p) {
    await data(); const s = ST();
    let src = s.fav.filter(k => LX[k]); let label = 'tus favoritas';
    if (!src.length) { src = Object.keys(LX).filter(k => LX[k][3] && !LX[k][2].startsWith('n-pr')).sort((a, b) => LX[b][5] - LX[a][5]).slice(0, 60); label = 'las 60 palabras más frecuentes con significado en español'; }
    FC = { list: src.sort(() => Math.random() - .5), i: 0, flip: false, label };
    renderFC();
  }
  function renderFC() {
    const k = FC.list[FC.i]; const L = LX[k];
    B.view().innerHTML = B.top('Flashcards', { back: 'diccionario' }) + '<div class="wrap dc"><p class="muted" style="margin:14px 0 6px">Practicando ' + esc(FC.label) + ' · ' + (FC.i + 1) + ' de ' + FC.list.length + '</p>' +
      '<button class="dc-card' + (FC.flip ? ' flip' : '') + '" data-act="dc-flip" aria-label="Voltear tarjeta"><span class="front">' + he(L[0], 'dc-word') + '<small>Toca para ver el significado</small></span><span class="back">' + he(L[0], 'dc-nh') + '<b>' + esc(trOf(k)) + '</b><span>' + (L[3] ? esc(L[3]) : esc(L[4])) + '</span></span></button>' +
      '<div class="btns" style="justify-content:center"><button class="btn" data-act="dc-say" data-h="' + esc(L[0]) + '">🔊</button><button class="btn" data-act="dc-fcnext" data-r="0">Repasar luego</button><button class="btn solid" data-act="dc-fcnext" data-r="1">La sé</button></div>' +
      '<p class="dc-note">«Repasar luego» la agrega a «Mis palabras por repasar» del curso de hebreo.</p></div>';
  }

  /* ---------- Gematría ---------- */
  async function vGem() {
    await data();
    const ex = [['חי', 'Jai', 'vida'], ['אהבה', 'Ahavá', 'amor'], ['אחד', 'Ejad', 'uno'], ['דוד', 'David', ''], ['שלום', 'Shalom', 'paz']];
    B.view().innerHTML = B.top('Gematría', { back: 'diccionario' }) + '<div class="wrap dc study"><div class="dc-head"><p class="he dc-word" lang="he">גִּימַטְרִיָּה</p><h1>Gematría</h1><p class="muted">El valor numérico de las letras hebreas</p></div>' +
      '<div class="notice"><b>Importante.</b> La gematría es una herramienta tradicional de interpretación y estudio. Las coincidencias numéricas pueden invitar a la reflexión, pero no son una prueba de doctrina ni una demostración de profecías.</div>' +
      '<div class="field"><input id="gq" dir="rtl" lang="he" placeholder="Escribe una palabra hebrea" aria-label="Palabra hebrea" value="שלום" style="font-family:var(--hebrew);font-weight:700;font-size:1.4rem"></div><div class="dc-kbd">' + kbd('gq') + '</div>' +
      '<div id="gout"></div>' +
      '<h2>Ejemplos</h2><div class="dc-ex">' + ex.map(([w, t, s]) => '<button class="dc-exb" data-act="dc-gem" data-w="' + w + '">' + he(w) + '<b>' + gematria(w).std + '</b><small>' + t + (s ? ' (' + s + ')' : '') + '</small></button>').join('') + '</div>' +
      '<h2>Los métodos</h2><ul><li><b>Mispar Hejrejí (estándar):</b> cada letra tiene su valor (א=1 … י=10 … ק=100 … ת=400). Las letras finales valen lo mismo que las normales.</li><li><b>Mispar Gadol:</b> igual al estándar, pero las letras finales valen 500 a 900 (ך=500, ם=600, ן=700, ף=800, ץ=900).</li><li><b>Mispar Katán (reducido):</b> se quitan los ceros de cada letra (י=1, ק=1, ש=3).</li><li><b>Mispar Sidurí (ordinal):</b> la posición de la letra en el alef-bet (א=1 … ת=22).</li><li><b>Reducción a un dígito:</b> se suman las cifras del total hasta obtener un número de 1 a 9.</li></ul>' +
      '<h2>Valores de las letras</h2><div class="dc-gtable">' + LET.map((l, i) => '<div>' + he(l, 'dc-gl') + '<b>' + VAL[i] + '</b><small>' + NAMES[i] + '</small></div>').join('') + Object.entries(FIN).map(([f, [b, v]]) => '<div>' + he(f, 'dc-gl') + '<b>' + v + '</b><small>final (gadol)</small></div>').join('') + '</div></div>';
    gemCalc();
  }
  function gemCalc() {
    const inp = document.getElementById('gq'); const out = document.getElementById('gout'); if (!inp || !out) return;
    const g = gematria(inp.value); if (!g.rows.length) { out.innerHTML = '<p class="muted">Escribe letras hebreas.</p>'; return; }
    const eq = Object.keys(LX).filter(k => gematria(LX[k][0]).std === g.std && plain(LX[k][0]) !== plain(inp.value)).sort((a, b) => (LX[b][3] ? 1 : 0) - (LX[a][3] ? 1 : 0) || LX[b][5] - LX[a][5]).slice(0, 16);
    out.innerHTML = '<div class="dc-gres"><div class="dc-gbig"><span>' + g.std + '</span><small>Mispar Hejrejí</small></div><div class="dc-gm"><div><b>' + g.gadol + '</b><small>Gadol</small></div><div><b>' + g.katan + '</b><small>Katán</small></div><div><b>' + g.siduri + '</b><small>Sidurí</small></div><div><b>' + g.reducido + '</b><small>Reducción</small></div></div></div>' +
      '<div class="dc-break" dir="rtl">' + g.rows.map(r => '<div>' + he(r.ch, 'dc-gl') + '<b>' + r.std + '</b><small>' + esc(r.name) + '</small></div>').join('<span>+</span>') + '</div>' +
      '<h3 style="margin-top:18px">Palabras del Tanaj con el mismo valor (' + g.std + ')</h3>' + (eq.length ? '<div class="rows">' + eq.map(k => row(k)).join('') + '</div>' : '<p class="muted">No hay otras palabras del léxico con este valor.</p>') +
      '<p class="dc-note">Las coincidencias se buscan entre las formas de diccionario del léxico bíblico. Son una herramienta de estudio, no una interpretación.</p>';
  }

  /* ---------- Búsqueda global ---------- */
  async function vGlobal() {
    B.view().innerHTML = B.top('Buscar en Beit Hatzirah', { back: 'inicio' }) + '<div class="wrap dc"><div class="field">' + B.ic('search') + '<input type="search" id="gsq" placeholder="Buscar en toda la app: palabra, tema, oración, versículo…" aria-label="Búsqueda global" autocomplete="off"></div><div id="gsres"><p class="muted">Busca a la vez en la Biblia, el diccionario, las tefilot, Besorá, las parashiot, el curso de hebreo, PEALIM y el calendario.</p></div></div>';
    setTimeout(() => { const i = document.getElementById('gsq'); if (i) i.focus(); }, 50);
  }
  let gst;
  document.addEventListener('input', e => { if (e.target.id === 'gsq') { clearTimeout(gst); const q = e.target.value; gst = setTimeout(() => globalSearch(q), 250); } });
  async function globalSearch(q) {
    const out = document.getElementById('gsres'); if (!out) return; q = q.trim(); if (q.length < 2) { out.innerHTML = ''; return; }
    await data(); const nq = loose(q); const groups = [];
    const add = (name, items) => { if (items.length) groups.push([name, items.slice(0, 6)]); };
    const T = await B.getJSON('tefilot.json').catch(() => null), BS = await B.getJSON('besora.json').catch(() => null), P = await B.getJSON('parashiot.json'), A = await B.getJSON('aprender.json'), MO = await B.getJSON('moedim.json');
    add('Diccionario', search(q).slice(0, 6).map(([k]) => ['#dic-' + k, trOf(k) + ' — ' + (LX[k][3] || LX[k][4]), LX[k][0]]));
    if (T) add('Tefilot', T.tefilot.filter(t => loose(t.es + ' ' + t.momento + ' ' + t.tags.join(' ')).includes(nq)).map(t => ['#tefilot-t-' + t.id, t.es, t.he]));
    if (BS) add('Besorá', BS.temas.filter(t => loose(t.t + ' ' + t.b).includes(nq)).map(t => ['#besora-tema-' + t.id, t.t, '']).concat(BS.faq.map((f, i) => [f, i]).filter(([f]) => loose(f.q).includes(nq)).map(([f, i]) => ['#besora-faq-' + i, f.q, ''])));
    add('Parashiot', P.filter(p => loose(p.tr + ' ' + p.sig + ' ' + p.res).includes(nq)).map(p => ['#parasha-' + p.n, p.tr + ' — ' + p.sig, p.he]));
    add('Curso de hebreo', A.worlds.flatMap(w => w.units.flatMap(u => u.items.filter(it => loose((it.tr || '') + ' ' + it.es).includes(nq)).map(it => ['#leccion-' + u.id + '-f', (it.tr || '') + ' — ' + it.es + ' (' + u.name + ')', it.he]))));
    if (PI) add('PEALIM', PI.filter(v => loose(v.tr + ' ' + (v.es || '')).includes(nq)).map(v => ['#pealim-' + v.id, v.tr + ' — ' + (v.es || v.en), v.he]));
    add('Calendario', MO.filter(m => loose(m.tr + ' ' + m.sig + ' ' + m.explicacion).includes(nq)).map(m => ['#calendario', m.tr + ' — ' + m.sig, m.he]));
    out.innerHTML = '<a class="row" href="#buscar" data-act="gs-bible" data-q="' + esc(q) + '"><span class="t"><b>Buscar «' + esc(q) + '» en la Biblia</b><span>Todos los versículos de la traducción elegida, o en hebreo</span></span></a>' +
      (groups.length ? groups.map(([n, items]) => '<div class="group-title"><h3>' + esc(n) + '</h3></div><div class="rows">' + items.map(([h, t, w]) => '<a class="row" href="' + h + '"><span class="t"><b>' + esc(t) + '</b></span>' + (w ? he(w) : '') + '</a>').join('') + '</div>').join('') : '<p class="muted" style="margin-top:12px">No hay resultados en los demás módulos.</p>');
  }

  /* ---------- Acciones ---------- */
  Object.assign(EXT.act, {
    'dc-fav': el => { const s = ST(); const k = el.dataset.k; s.fav = s.fav.includes(k) ? s.fav.filter(x => x !== k) : [k].concat(s.fav); save(s); el.textContent = s.fav.includes(k) ? '★' : '☆'; B.toast(s.fav.includes(k) ? 'Agregada a favoritas' : 'Quitada de favoritas'); },
    'dc-say': el => { if (EXT.speak) EXT.speak(el.dataset.h); },
    'dc-save': el => { const L = LX[el.dataset.k]; if (EXT.saveWord) EXT.saveWord({ id: 'lx-' + el.dataset.k, he: L[0], tr: trOf(el.dataset.k), es: L[3] }); el.textContent = 'Guardada ✓'; el.disabled = true; },
    'dc-key': el => { const i = document.getElementById(el.dataset.t); if (!i) return; i.value = el.dataset.l === '⌫' ? i.value.slice(0, -1) : i.value + el.dataset.l; i.dispatchEvent(new Event('input', { bubbles: true })); },
    'dc-gem': el => { if (!document.getElementById('gq')) { B.go('gematria'); setTimeout(() => { const i = document.getElementById('gq'); if (i) { i.value = el.dataset.w; gemCalc(); } }, 400); return; } document.getElementById('gq').value = el.dataset.w; gemCalc(); window.scrollTo({ top: 0, behavior: 'smooth' }); },
    'dc-flip': () => { FC.flip = !FC.flip; document.querySelector('.dc-card').classList.toggle('flip', FC.flip); },
    'dc-fcnext': el => { const k = FC.list[FC.i]; if (el.dataset.r === '0' && LX[k][3] && EXT.saveWord) EXT.saveWord({ id: 'lx-' + k, he: LX[k][0], tr: trOf(k), es: LX[k][3] }); FC.i = (FC.i + 1) % FC.list.length; FC.flip = false; renderFC(); },
    'gs-bible': el => { if (B.setSearch) B.setSearch(el.dataset.q); }
  });
  Object.assign(EXT.routes, {
    diccionario: () => vHome(), dic: p => vEntry(p[1]), dicletras: vLetras, dicraices: vRaices, raiz: vRaices, dicnombres: vNombres, dicgriego: vGriego, dictemas: vTemas, dicexpr: vExpr,
    concordancia: vConc, flashcards: vFlash, gematria: vGem, 'buscar-todo': vGlobal
  });
  ['diccionario', 'dic', 'dicletras', 'dicraices', 'raiz', 'dicnombres', 'dicgriego', 'dictemas', 'dicexpr', 'concordancia', 'flashcards', 'gematria', 'buscar-todo'].forEach(r => { EXT.tabs[r] = ''; });
})();
