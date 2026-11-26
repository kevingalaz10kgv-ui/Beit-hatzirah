/* BEIT HATZIRAH — Academia del hebreo bíblico.
   - Ficha del diccionario: flexión documentada (todas las formas reales del lema) y distribución por libros.
   - Búsqueda: una forma flexionada lleva a su lema.
   - Nombres propios: personas y lugares del léxico.
   - Análisis interlineal de un capítulo: cada palabra con su lema, forma y función; vocabulario, verbos por
     binyán, raíces, hápax, repeticiones y división poética por atnaj.
   - Ruta de aprendizaje de 36 pasos, seguimiento del alumno e informe del conocimiento. */
(function () {
  'use strict';
  const EXT = window.BH_EXT;
  let B = null;
  const prevInit = EXT.init;
  EXT.init = api => { if (prevInit) prevInit(api); B = api; };
  const esc = s => B.esc(s);
  const rootStr = r => ((r || '').match(/[\u05D0-\u05EA][\u05C1\u05C2]?/g) || []).join('־');
  const lemNum = l => (l.split('/').map(x => x.replace(/[^\d]/g, '')).filter(Boolean).pop() || '');
  let LX = null, H2E = null, BOOKS = null;
  async function base() { if (!LX) [LX, H2E] = await Promise.all([B.getJSON('lexico.json'), B.getJSON('h2e.json')]); BOOKS = B.BOOKS; }
  const tr = h => EXT.translit ? EXT.translit(h) : '';

  /* ---------- Diccionario: flexión documentada y distribución ---------- */
  async function fillFlex(el) {
    await base(); const k = el.dataset.k; if (!k) return; el.dataset.done = '1';
    let F = null, D = null; try { [F, D] = await Promise.all([B.getJSON('indices/flex/f' + (+k % 16) + '.json'), B.getJSON('indices/distribucion.json')]); } catch (e) { el.innerHTML = '<p class="muted">La flexión documentada y la distribución por libros están disponibles en la app publicada.</p>'; return; }
    const forms = (F[k] || []); const dist = (D[k] || []);
    const total = dist.reduce((s, x) => s + x[1], 0); const max = Math.max(1, ...dist.map(x => x[1]));
    el.innerHTML = '<h3 class="h-sec" style="margin-top:18px">Flexión documentada</h3><p class="muted" style="margin:4px 0">Las formas reales de esta palabra en el texto hebreo (hasta 40, de la más frecuente a la menos frecuente).</p>' +
      '<div class="lab-tbl"><table><tr><th>Forma</th><th>Análisis</th><th>Veces</th><th>Primera</th></tr>' + forms.map(([f, code, n, ref]) => '<tr><td class="he" lang="he"><a href="#analizador-' + encodeURIComponent(f) + '">' + esc(f) + '</a></td><td>' + esc((EXT.decodeMorph ? EXT.decodeMorph(code) : []).map(s => s.txt).join(' + ')) + '</td><td>' + n + '</td><td><a href="#' + B.refRoute(ref) + '">' + esc(B.refLabel(ref)) + '</a></td></tr>').join('') + '</table></div>' +
      '<h3 class="h-sec" style="margin-top:18px">Distribución por libros</h3><p class="muted" style="margin:4px 0">' + total + ' apariciones en ' + dist.length + ' libros.</p><div class="dist">' + dist.map(([bi, n]) => { const b = BOOKS[bi]; return '<a class="dist-r" href="#concordancia-' + k + '"><span>' + esc(b.tr) + '</span><i style="--w:' + (n / max * 100).toFixed(1) + '%"></i><b>' + n + '</b></a>'; }).join('') + '</div>';
  }
  // una forma flexionada en el buscador lleva a su lema
  EXT.formaHint = async (q, out) => {
    if (!EXT.analizar || !/[\u05D0-\u05EA]/.test(q) || q.trim().length < 2) return; const R = await EXT.analizar(q); if (!R.forms || !R.forms.length || !document.body.contains(out)) return;
    await base(); const seen = new Set(); const rows = [];
    R.forms.forEach(F => F.an.forEach(a => { if (a.lemma && LX[a.lemma] && !seen.has(a.lemma)) { seen.add(a.lemma); rows.push('<a class="row" href="#dic-' + a.lemma + '"><span class="t"><b>' + esc(F.form) + ' → ' + esc(LX[a.lemma][3] || LX[a.lemma][4]) + '</b><span>' + esc(a.segs.map(s => s.txt).join(' + ')) + '</span></span><span class="he" lang="he">' + esc(LX[a.lemma][0]) + '</span></a>'); } }));
    if (rows.length) out.insertAdjacentHTML('afterbegin', '<h3 class="h-sec" style="margin:10px 0 4px">Forma flexionada en el texto</h3><div class="rows">' + rows.slice(0, 4).join('') + '</div>');
  };

  /* ---------- Nombres propios ---------- */
  async function vPropios(p) {
    await base(); const tab = p[1] || 'personas';
    const isT = v => tab === 'personas' ? /^n-pr-[mf]$/.test(v[2]) : tab === 'lugares' ? /^n-pr-loc/.test(v[2]) : /^n-pr/.test(v[2]) && !/^n-pr-[mf]$/.test(v[2]) && !/^n-pr-loc/.test(v[2]);
    const ks = Object.keys(LX).filter(k => isT(LX[k])).sort((a, b) => LX[b][5] - LX[a][5]);
    B.view().innerHTML = B.top('Nombres propios', { back: 'diccionario' }) + '<div class="wrap bb"><div class="seg three" style="margin-top:12px">' + [['personas', 'Personas'], ['lugares', 'Lugares'], ['otros', 'Pueblos y otros']].map(([k, l]) => '<a href="#propios-' + k + '" aria-pressed="' + (k === tab) + '">' + l + '</a>').join('') + '</div>' +
      '<p class="muted">' + ks.length.toLocaleString('es') + ' nombres del Tanaj, ordenados por frecuencia. Toca un nombre para ver su ficha, sus apariciones y su primera mención.</p><div class="field">' + B.ic('search') + '<input id="np-q" type="search" placeholder="Buscar un nombre (hebreo o transliteración)" autocomplete="off"></div><div class="rows" id="np-l">' + rowsHTML(ks.slice(0, 120)) + '</div></div>';
    document.getElementById('np-q').addEventListener('input', e => { const q = e.target.value.trim().toLowerCase(); const c = q.replace(/[^\u05D0-\u05EA]/g, ''); const f = !q ? ks.slice(0, 120) : ks.filter(k => (c && LX[k][0].replace(/[^\u05D0-\u05EA]/g, '').startsWith(c)) || (!c && (LX[k][1] || '').toLowerCase().includes(q))).slice(0, 120); document.getElementById('np-l').innerHTML = rowsHTML(f); });
  }
  const rowsHTML = ks => ks.map(k => '<a class="row" href="#dic-' + k + '"><span class="t"><b>' + esc(LX[k][1]) + '</b><span>' + LX[k][5] + ' veces' + (LX[k][6] ? ' · primera: ' + esc(B.refLabel(LX[k][6])) : '') + '</span></span><span class="he" lang="he">' + esc(LX[k][0]) + '</span></a>').join('');

  /* ---------- Análisis interlineal de un capítulo ---------- */
  async function chapterData(b, c) {
    await base(); const MO = await B.getJSON('morph/' + b + '.json'); const d = await B.getBookV(b); const nv = (d.c[c - 1] || []).length;
    const e2h = {}; Object.entries(H2E).forEach(([hk, es]) => { if (hk.startsWith(b + ' ')) e2h[es] = hk.split(' ')[1]; });
    const verses = [];
    for (let v = 1; v <= nv; v++) { const hk = e2h[c + ':' + v] || c + ':' + v; verses.push({ v, hk, words: MO[hk] || [], es: B.es(d.c[c - 1][v - 1][0] || ''), heT: (d.c[c - 1][v - 1][1] || '') }); }
    return { b, c, verses };
  }
  function chapterStats(C) {
    const lem = {}, bin = {}, roots = {}; let words = 0; const seq = [];
    C.verses.forEach(V => V.words.forEach(w => { words++; const k = lemNum(w[1]); const code = w[2] || ''; seq.push([w[0].replace(/[\u0591-\u05AF\u05BD\u05C0\/]/g, ''), V.v]);
      if (k) { lem[k] = (lem[k] || 0) + 1; const L = LX[k]; if (L && L[7]) roots[L[7]] = (roots[L[7]] || 0) + 1; }
      const vm = code.match(/V([a-zA-Z])/); if (vm) { const segs = EXT.decodeMorph ? EXT.decodeMorph(code) : []; const vb = segs.find(s => s.kind === 'verbo'); if (vb) bin[vb.binyan] = (bin[vb.binyan] || 0) + 1; } }));
    const hapax = Object.keys(lem).filter(k => LX[k] && LX[k][5] === 1);
    // repeticiones: secuencias de 3 palabras que se repiten en el capítulo (posibles marcadores literarios)
    const gr = {}; for (let i = 0; i + 2 < seq.length; i++) { const g = seq[i][0] + ' ' + seq[i + 1][0] + ' ' + seq[i + 2][0]; (gr[g] = gr[g] || []).push(seq[i][1]); }
    const reps = Object.entries(gr).filter(([, vs]) => vs.length >= 3).sort((a, b) => b[1].length - a[1].length).slice(0, 6);
    return { words, lem, bin, roots, hapax, reps };
  }
  const POETIC = ['PSA', 'PRO', 'JOB', 'SNG', 'LAM'];
  async function vInter(p) {
    await base(); const b = p[1], c = +p[2] || 1, focus = +p[3] || 0; if (!B.BY[b] || B.BY[b].nt) return B.go('biblia');
    B.view().innerHTML = B.top('Análisis de ' + esc(B.bookName(b)) + ' ' + c, { back: 'leer-' + b + '-' + c }) + '<div class="loading">Analizando el capítulo…</div>';
    const C = await chapterData(b, c); const S = chapterStats(C); const poet = POETIC.includes(b);
    const topL = Object.entries(S.lem).filter(([k]) => LX[k] && LX[k][3] && !/^(prep|conj|prt|d|art)/.test(LX[k][2])).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const par = (await B.getJSON('parashiot.json')).find(x => x.lec.b === b && +x.lec.s.split(':')[0] <= c && c <= +x.lec.e.split(':')[0]);
    const verseHTML = V => {
      let cola = ''; if (poet && /\u0591/.test(V.heT)) { const ws = V.heT.split(' '); const i = ws.findIndex(w => /\u0591/.test(w)); cola = '<div class="il-cola"><p class="he" lang="he" dir="rtl">' + esc(ws.slice(0, i + 1).join(' ').replace(/[\u0591-\u05AF]/g, '')) + '</p><p class="he" lang="he" dir="rtl">' + esc(ws.slice(i + 1).join(' ').replace(/[\u0591-\u05AF]/g, '')) + '</p></div>'; }
      return '<div class="il-v" id="v' + V.v + '"><div class="il-n">' + V.v + '</div>' + cola + '<div class="il-ws" dir="rtl">' + V.words.map((w, i) => { const k = lemNum(w[1]); const L = LX[k]; const f = w[0].replace(/\//g, ''); return '<button class="il-w" data-act="il-word" data-v="' + V.v + '" data-i="' + i + '"><span class="he" lang="he">' + esc(f) + '</span><small>' + esc(tr(f)) + '</small><em>' + esc(L ? (L[3] || L[4] || '').split(/[,;]/)[0] : '') + '</em></button>'; }).join('') + '</div><p class="il-es">' + esc(V.es) + '</p></div>';
    };
    B.view().innerHTML = B.top('Análisis de ' + esc(B.bookName(b)) + ' ' + c, { back: 'leer-' + b + '-' + c }) + '<div class="wrap il">' +
      '<section class="il-sum"><h3 class="h-sec">Vocabulario y estructura</h3><p>' + C.verses.length + ' versículos, ' + S.words.toLocaleString('es') + ' palabras, ' + Object.keys(S.lem).length + ' lemas distintos' + (par ? ', parashá <a href="#parasha-' + par.n + '">' + esc(par.tr) + '</a>' : '') + '.</p>' +
      '<p><b>Palabras con significado más frecuentes:</b> ' + topL.map(([k, n]) => '<a href="#dic-' + k + '"><span class="he" lang="he">' + esc(LX[k][0]) + '</span> «' + esc(LX[k][3]) + '» (' + n + ')</a>').join(', ') + '.</p>' +
      '<p><b>Verbos por binyán:</b> ' + Object.entries(S.bin).sort((a, b) => b[1] - a[1]).map(([k, n]) => esc(k) + ' ' + n).join(', ') + '.</p>' +
      '<p><b>Raíces más presentes:</b> ' + Object.entries(S.roots).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([r, n]) => '<a class="he" lang="he" href="#raiz-' + encodeURIComponent(r.replace(/[^\u05D0-\u05EA]/g, '')) + '">' + esc(rootStr(r)) + '</a> (' + n + ')').join(', ') + '.</p>' +
      (S.hapax.length ? '<p><b>Palabras que aparecen una sola vez en todo el Tanaj (hápax):</b> ' + S.hapax.map(k => '<a href="#dic-' + k + '"><span class="he" lang="he">' + esc(LX[k][0]) + '</span></a>').join(', ') + '.</p>' : '') +
      (S.reps.length ? '<p><b>Repeticiones (posibles marcadores literarios):</b> ' + S.reps.map(([g, vs]) => '<span class="he" lang="he">' + esc(g) + '</span> (' + vs.length + ' veces: v. ' + [...new Set(vs)].join(', ') + ')').join('; ') + '.</p>' : '') +
      (poet ? '<p class="muted">Libro poético: cada versículo se muestra en sus dos miembros, divididos por el acento atnaj, para observar el paralelismo.</p>' : '') +
      '<p class="mo-note">Datos: análisis morfológico del Open Scriptures Hebrew Bible (CC BY 4.0) y léxico de Beit Hatzirah. Toca una palabra para ver su análisis.</p></section>' +
      C.verses.map(verseHTML).join('') + '<div class="btns" style="margin:16px 0">' + (c > 1 ? '<a class="btn" href="#interlineal-' + b + '-' + (c - 1) + '">Capítulo anterior</a>' : '') + (c < B.BY[b].ch ? '<a class="btn" href="#interlineal-' + b + '-' + (c + 1) + '">Capítulo siguiente</a>' : '') + '</div></div>';
    CUR = C; if (focus) { const el = document.getElementById('v' + focus); if (el) el.scrollIntoView({ block: 'start' }); }
  }
  let CUR = null;
  EXT.chapterAnalysis = async (b, c) => { const C = await chapterData(b, c); return { C, S: chapterStats(C) }; };

  /* ---------- Ruta de aprendizaje (36 pasos) ---------- */
  const RUTA = [['Introducción', 'aprender'], ['Alfabeto', 'bibcat-alefbet'], ['Formas finales', 'bib-g-finales'], ['Escritura', 'aprende-alfabeto'], ['Vocales', 'bibcat-nikud'], ['Nikud', 'bib-g-nikud'], ['Sílabas y shvá', 'bib-g-shva'], ['Lectura', 'aprende-leer'], ['Pronunciación', 'bib-g-begadkefat'], ['Vocabulario básico', 'fundamentales'], ['Sustantivos', 'bib-g-genero-numero'], ['Adjetivos', 'bib-g-adjetivo'], ['Género y número', 'bib-g-dual'], ['Pronombres', 'bib-g-pronombres'], ['Artículo', 'bib-g-articulo'], ['Preposiciones', 'bib-g-prefijos'], ['Partículas', 'bib-g-et'], ['Estado constructo', 'bib-g-constructo'], ['Raíces', 'aprende-raiz'], ['Verbos', 'bib-g-aspectos'], ['Binyanim', 'clase-binyanim'], ['Conjugaciones', 'laboratorio'], ['Verbos débiles', 'bib-g-verbos-debiles'], ['Morfología', 'analizador'], ['Sintaxis', 'clase-gramatica'], ['Semántica', 'bibcat-semantica'], ['Hebreo bíblico intermedio', 'bib-g-subordinadas'], ['Hebreo bíblico avanzado', 'bib-g-discursivas'], ['Texto masorético', 'bibcat-masoretico'], ['Poesía', 'bibcat-poesia'], ['Profecía', 'clase-profetas'], ['Crítica textual', 'bibcat-critica'], ['Filología semítica', 'bibcat-semiticas'], ['Traducción palabra por palabra', 'interlineal-GEN-1'], ['Análisis de la Torá', 'clase-tora'], ['Investigación', 'biblioteca']];
  function vRuta() {
    const seen = B.Store.get('ruta:visto', {}) || {}; const done = RUTA.filter(r => seen[r[1]]).length;
    B.view().innerHTML = B.top('Ruta de aprendizaje', { back: 'aprender' }) + '<div class="wrap bb"><p style="margin-top:14px">De la primera letra a la investigación: 36 pasos que conectan el curso, la biblioteca y las herramientas del Moreh. Un paso se marca al visitarlo.</p>' +
      '<div class="ruta-bar"><i style="--w:' + (done / RUTA.length * 100).toFixed(1) + '%"></i></div><p class="muted">' + done + ' de ' + RUTA.length + ' pasos visitados.</p>' +
      '<ol class="ruta">' + RUTA.map(([t, r], i) => '<li class="' + (seen[r] ? 'ok' : '') + '"><a href="#' + r + '"><span>' + (i + 1) + '</span>' + esc(t) + '</a></li>').join('') + '</ol>' +
      (done === RUTA.length ? '<div class="cert"><p class="he" lang="he">בֵּית הַצִּרְעָה</p><b>Constancia interna de Beit Hatzirah</b><p>Has recorrido la ruta completa de aprendizaje del hebreo bíblico. Esta constancia es un reconocimiento interno de la aplicación; no es un título académico oficial.</p></div>' : '') + '</div>';
  }
  // registro de pasos visitados y del tiempo de estudio
  let tStart = Date.now(), tRoute = '';
  const STUDY = /^#(aprender|leccion|repaso|aprende-|clase-|bib-|bibcat-|analizador|laboratorio|interlineal|dic|raiz|pealim|estudiemos|fundamentales)/;
  function track() {
    const h = location.hash; const now = Date.now();
    if (tRoute && STUDY.test(tRoute)) { const m = Math.min(30, (now - tStart) / 60000); const T = B.Store.get('tiempo', {}) || {}; const d = new Date().toISOString().slice(0, 10); T[d] = (T[d] || 0) + m; B.Store.set('tiempo', T); }
    tStart = now; tRoute = h; const r = h.slice(1); if (RUTA.some(x => x[1] === r)) { const s = B.Store.get('ruta:visto', {}) || {}; if (!s[r]) { s[r] = Date.now(); B.Store.set('ruta:visto', s); } }
  }
  EXT.studyTime = () => { const T = B.Store.get('tiempo', {}) || {}; const tot = Object.values(T).reduce((s, x) => s + x, 0); const d = new Date().toISOString().slice(0, 10); return { total: Math.round(tot), hoy: Math.round(T[d] || 0) }; };
  EXT.frequentErrors = async () => { const s = B.Store.get('learn', {}) || {}; const A = await B.getJSON('aprender.json'); const items = A.worlds.flatMap(w => w.units.flatMap(u => u.items)); return Object.entries(s.srs || {}).filter(([, v]) => (v.err || 0) > 0).sort((a, b) => b[1].err - a[1].err).slice(0, 6).map(([id, v]) => { const it = items.find(x => x.id === id); return it ? { he: it.he, es: it.es, tr: it.tr, err: v.err } : null; }).filter(Boolean); };

  /* ---------- Informe del conocimiento ---------- */
  async function vInforme() {
    await base(); B.view().innerHTML = B.top('Informe del conocimiento', { back: 'estado-moreh' }) + '<div class="loading">Calculando…</div>';
    const BIB = await B.getJSON('biblioteca.json'); const PI = await B.getJSON('pealim/indice.json'); const RA = await B.getJSON('raices.json'); let COV = null; try { COV = await B.getJSON('indices/cobertura.json'); } catch (e) { }
    const L = Object.values(LX); const cnt = f => L.filter(v => f(v[2])).length;
    const nouns = cnt(p => /^n-[mf]/.test(p) || p === 'n'), props = cnt(p => /^n-pr/.test(p)), adjs = cnt(p => /^a/.test(p)), verbs = cnt(p => p === 'v'), parts = cnt(p => /^(prt|prep|conj|adv|inj)/.test(p)), prons = cnt(p => /^p(?!r)/.test(p));
    const refs = BIB.registros.reduce((s, r) => s + (r.refs || []).length, 0); const strongRoots = PI.filter(v => { const c = v.r.replace(/[^\u05D0-\u05EA]/g, ''); return c.length === 3 && !/[אהחער]/.test(c[0] + c[1]) && !/[אהחע]/.test(c[2]) && !'נוי'.includes(c[0]) && !'וי'.includes(c[1]) && c[1] !== c[2]; }).length;
    const row = (a, b) => '<tr><th>' + a + '</th><td>' + b + '</td></tr>'; const pct = x => (x[1] / x[0] * 100).toFixed(1) + ' %';
    B.view().innerHTML = B.top('Informe del conocimiento', { back: 'estado-moreh' }) + '<div class="wrap bb"><p style="margin-top:14px">Cifras calculadas en este momento con los datos de la app. <b>El diccionario y la biblioteca no están completos</b>; este informe muestra el avance real.</p><div class="lab-tbl"><table>' +
      row('Lemas', L.length.toLocaleString('es')) + row('Formas flexionadas distintas (todas las del texto)', '53.915') + row('Familias de raíces', Object.keys(RA).length.toLocaleString('es')) + row('Verbos (lemas verbales)', verbs.toLocaleString('es') + ', con tablas: ' + PI.length.toLocaleString('es')) + row('Paradigmas', PI.length.toLocaleString('es') + ' tablas documentadas; paradigma regular generable para ' + strongRoots + ' raíces fuertes × 7 binyanim') +
      row('Sustantivos comunes', nouns.toLocaleString('es')) + row('Nombres propios', props.toLocaleString('es')) + row('Adjetivos', adjs.toLocaleString('es')) + row('Partículas, preposiciones, conjunciones, adverbios e interjecciones', parts) + row('Pronombres', prons) + row('Expresiones', BIB.registros.filter(r => r.cat === 'expresiones').length + ' en la biblioteca + 10 expresiones idiomáticas del diccionario') +
      row('Referencias bíblicas en la biblioteca', refs.toLocaleString('es') + ' (más 18.805 versículos con referencias cruzadas)') + row('Entradas con nikud', L.length.toLocaleString('es') + ' (todos los lemas)') + row('Entradas con pronunciación', L.length.toLocaleString('es') + ' (transliteración de Beit Hatzirah y voz del teléfono; sin grabaciones humanas)') + row('Entradas con fuente', L.length.toLocaleString('es') + ' lemas + ' + BIB.registros.length + ' registros') +
      row('Lemas con significado en español', L.filter(v => v[3]).length.toLocaleString('es')) + row('Cobertura de formas verbales', '100 % de las 74.101 palabras verbales tienen análisis morfológico') + '</table></div>' +
      (COV ? '<h3 class="h-sec" style="margin-top:16px">Cobertura en español por libro</h3><div class="dist">' + Object.entries(COV.libros).map(([b, x]) => '<div class="dist-r"><span>' + esc(B.bookName(b)) + '</span><i style="--w:' + pct(x) + '"></i><b>' + pct(x) + '</b></div>').join('') + '</div>' +
        '<h3 class="h-sec" style="margin-top:16px">Cobertura en español por parashá</h3><div class="dist">' + (await B.getJSON('parashiot.json')).map(p => { const x = COV.parashot[p.n]; return x ? '<a class="dist-r" href="#parasha-' + p.n + '"><span>' + esc(p.tr) + '</span><i style="--w:' + pct(x) + '"></i><b>' + pct(x) + '</b></a>' : ''; }).join('') + '</div>' : '<p class="muted">La cobertura por libro y parashá está disponible en la app publicada.</p>') +
      '<h3 class="h-sec" style="margin-top:16px">Fuentes integradas</h3><p>' + BIB.fuentes.map(f => esc(f.nombre) + ' (' + esc(f.licencia) + ')').join('; ') + '.</p>' +
      '<h3 class="h-sec" style="margin-top:16px">Limitaciones y pendientes</h3><ul class="bb-list"><li>Significados en español: ' + (L.length - L.filter(v => v[3]).length).toLocaleString('es') + ' lemas solo tienen la definición inglesa de Strong.</li><li>Sinónimos, antónimos y campos semánticos: solo en las comparaciones y conceptos de la biblioteca, no en cada ficha.</li><li>HALOT, Gesenius, Joüon-Muraoka y la Biblia Hebraica crítica no se integran: tienen derechos de autor.</li><li>Pronunciación: voz del teléfono; no hay grabaciones humanas ni animación del trazado de cada letra.</li><li>Variantes textuales: solo las documentadas en la biblioteca; no hay aparato crítico completo.</li><li>Diccionario de hebreo moderno: no incorporado.</li><li>Mapas interactivos: pendientes.</li><li>Las redacciones de Beit Hatzirah están pendientes de revisión.</li></ul></div>';
  }

  /* ---------- Acciones y rutas ---------- */
  Object.assign(EXT.act, {
    'il-word': async el => {
      const V = CUR.verses.find(x => x.v === +el.dataset.v); const w = V.words[+el.dataset.i]; const k = lemNum(w[1]); const L = LX[k]; const segs = EXT.decodeMorph ? EXT.decodeMorph(w[2]) : []; const f = w[0].replace(/\//g, ''); const vb = segs.find(s => s.kind === 'verbo'); const obj = segs.find(s => s.obj);
      B.sheet('<div class="il-sheet"><p class="he an-he" lang="he" dir="rtl">' + esc(f) + '</p><p class="muted" style="text-align:center">' + esc(tr(f)) + '</p><div class="an-segs">' + segs.map(s => '<span class="an-seg k-' + (s.kind || 'x') + '">' + esc(s.txt) + '</span>').join('') + '</div>' +
        (L ? '<p>Lema: <a href="#dic-' + k + '" data-act="close-sheet-nav"><b class="he" lang="he">' + esc(L[0]) + '</b></a> — ' + esc(L[3] || L[4]) + (L[7] ? ' · raíz <span class="he" lang="he">' + esc(rootStr(L[7])) + '</span>' : '') + ' · ' + L[5] + ' apariciones.</p>' : '') +
        (vb ? '<p><b>' + esc(vb.binyan) + ', ' + esc(vb.forma) + '</b>: ' + esc(vb.formaInfo) + '. ' + (vb.persona ? 'Realiza la acción: <b>' + esc(vb.persona) + '</b>. ' : '') + (obj ? 'Se dirige: <b>' + esc(obj.obj) + '</b>.' : '') + '</p>' : '') +
        '<div class="btns"><button class="btn" data-act="mo-say" data-h="' + esc(f) + '">🔊 Escuchar</button>' + (L ? '<a class="btn" href="#concordancia-' + k + '" data-act="close-sheet-nav">Otras apariciones</a>' + (L[7] ? '<a class="btn" href="#raiz-' + encodeURIComponent(L[7].replace(/[^\u05D0-\u05EA]/g, '')) + '" data-act="close-sheet-nav">Familia de la raíz</a>' : '') + '<button class="btn" data-act="dc-save" data-k="' + k + '">Guardar para estudiar</button>' : '') + '</div></div>');
    }
  });
  Object.assign(EXT.routes, { propios: vPropios, interlineal: vInter, ruta: vRuta, 'informe-moreh': vInforme });
  ['propios', 'interlineal', 'ruta', 'informe-moreh'].forEach(r => { EXT.tabs[r] = ''; });
  new MutationObserver(() => { document.querySelectorAll('#dc-flex:not([data-done])').forEach(fillFlex); }).observe(document.documentElement, { childList: true, subtree: true });
  const prevLeave = EXT.leave;
  EXT.leave = () => { if (prevLeave) prevLeave(); if (B) track(); };
})();
