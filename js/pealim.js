/* BEIT HATZIRAH — PEALIM (פְּעָלִים): buscador y analizador de verbos hebreos bíblicos.
   Las conjugaciones son las formas que realmente aparecen en el Tanaj, según el análisis
   morfológico del Open Scriptures Hebrew Bible (CC BY 4.0). No se generan formas. */
(function () {
  'use strict';
  const EXT = window.BH_EXT;
  let B = null;
  const prevInit = EXT.init;
  EXT.init = api => { if (prevInit) prevInit(api); B = api; };
  const esc = s => B.esc(s);
  const he = (h, cls) => '<span class="he ' + (cls || '') + '" lang="he" dir="rtl">' + esc(h) + '</span>';
  const plain = h => (h || '').replace(/[^\u05D0-\u05EA]/g, '');
  const FIN = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
  const unfinal = h => plain(h).replace(/[ךםןףץ]/g, c => FIN[c]);
  const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[ʼʻ'’`·\-\s]/g, '');

  /* ---------- Datos ---------- */
  let IDX = null, BYID = {}; const SHARD = {};
  async function indice() {
    if (IDX) return IDX;
    IDX = await B.getJSON('pealim/indice.json'); IDX.forEach(v => { BYID[v.id] = v; v._k = norm(v.tr) + ' ' + norm(v.es || v.en || ''); v._r = unfinal(v.he); });
    return IDX;
  }
  async function para(id) { const i = +id % 8; if (!SHARD[i]) SHARD[i] = await B.getJSON('pealim/p' + i + '.json'); return SHARD[i][id]; }
  let FORMIDX = null;
  async function formIndex() {
    if (FORMIDX) return FORMIDX;
    await indice(); const shards = await Promise.all([0, 1, 2, 3, 4, 5, 6, 7].map(i => SHARD[i] ? SHARD[i] : B.getJSON('pealim/p' + i + '.json').then(x => (SHARD[i] = x))));
    FORMIDX = new Map();
    shards.forEach(sh => Object.entries(sh).forEach(([id, d]) => Object.values(d.f).forEach(cell => cell.forEach(([f]) => { const k = unfinal(f); if (!FORMIDX.has(k)) FORMIDX.set(k, new Set()); FORMIDX.get(k).add(id); }))));
    return FORMIDX;
  }
  const st = () => B.Store.get('pealim', { fav: [], learned: [] }) || { fav: [], learned: [] };
  const save = s => B.Store.set('pealim', s);

  /* ---------- Nombres de binyanim, tiempos y personas ---------- */
  const BIN = [
    ['q', 'Pa’al (Qal)', 'פָּעַל', 'פָּעַל', 'La forma básica y la más frecuente: acción simple, activa. Ejemplos: אָמַר «dijo», הָלַךְ «fue».', 'En la Biblia existió además un «Qal pasivo» que luego desapareció; algunas de sus formas se leen hoy como Pual o Hofal. En el hebreo moderno el Pa’al sigue siendo el binyan más común.'],
    ['N', 'Nif’al', 'נִפְעַל', 'נִפְעַל', 'Por lo general es el pasivo o reflexivo del Qal («fue hecho», «se hizo»). También expresa acciones recíprocas y algunos verbos activos, como נִלְחַם «combatió».', 'En el hebreo moderno se usa sobre todo como pasivo o para cambios de estado. En la Biblia es más variado: muchos verbos solo aparecen en Nif’al con sentido activo.'],
    ['p', 'Pi’el', 'פִּעֵל', 'פִּעֵל', 'Suele expresar una acción intensiva o que produce un estado (factitivo). También forma verbos a partir de sustantivos. Ejemplos: דִּבֵּר «habló», קִדֵּשׁ «santificó».', 'En la Biblia muchos verbos usan el Pi’el con un sentido propio, no siempre «intensivo». En el hebreo moderno es muy productivo para crear verbos nuevos.'],
    ['P', 'Pu’al', 'פֻּעַל', 'פֻּעַל', 'Pasivo del Pi’el («fue santificado»). Es poco frecuente y aparece sobre todo en participios.', 'Se usa en los dos períodos, con frecuencia baja; en el hebreo moderno es algo más común en participios y adjetivos.'],
    ['h', 'Hif’il', 'הִפְעִיל', 'הִפְעִיל', 'Causativo: hacer que alguien realice la acción. Ejemplos: הוֹצִיא «hizo salir», הִגִּיד «anunció».', 'Causativo en ambos períodos. En la Biblia algunos verbos con sentido no causativo solo existen en Hif’il, como הִשְׁכִּים «madrugó».'],
    ['H', 'Huf’al (Hofal)', 'הֻפְעַל', 'הֻפְעַל', 'Pasivo del Hif’il («fue hecho salir»). Es el menos frecuente de los siete en la Biblia.', 'En ambos períodos es poco común.'],
    ['t', 'Hitpa’el', 'הִתְפַּעֵל', 'הִתְפַּעֵל', 'Reflexivo o recíproco («se santificó»), y a veces una acción repetida. Ejemplos: הִתְפַּלֵּל «oró», הִתְהַלֵּךְ «anduvo».', 'En el hebreo moderno también expresa cambios de estado y a veces pasivo. En la Biblia la forma הִשְׁתַּחֲוָה «se postró» tiene un patrón propio (Hishtafel).']
  ];
  const BINNAME = Object.fromEntries(BIN.map(b => [b[0], b[1]]));
  const binName = k => BINNAME[k] || (B.STEM[k] || k);
  const TENSES = [['p', 'Pasado (perfecto, qatal)'], ['w', 'Pasado narrativo (wayyiqtol: «y dijo»)'], ['i', 'Futuro / imperfecto (yiqtol)'], ['q', 'Perfecto con vav (weqatal: «y dirá»)'], ['v', 'Imperativo'], ['h', 'Cohortativo («que yo…»)'], ['j', 'Yusivo («que él…»)'], ['c', 'Infinitivo constructo'], ['a', 'Infinitivo absoluto'], ['r', 'Participio activo (presente)'], ['s', 'Participio pasivo']];
  const PERSONS = ['3ms', '3fs', '2ms', '2fs', '1cs', '3mp', '3fp', '3cp', '2mp', '2fp', '1cp'];
  const PARTS = ['msa', 'fsa', 'mpa', 'fpa', 'msc', 'fsc', 'mpc', 'fpc'];
  const PARTLBL = { msa: 'masc. sing.', fsa: 'fem. sing.', mpa: 'masc. plural', fpa: 'fem. plural', msc: 'masc. sing. constructo', fsc: 'fem. sing. constructo', mpc: 'masc. plural constructo', fpc: 'fem. plural constructo' };
  function label(key) {
    const s = key[0], t = key[1], r = key.slice(2);
    const tn = (TENSES.find(x => x[0] === t) || [t, B.VTYPE[t] || t])[1];
    let p = '';
    if (t === 'r' || t === 's') p = PARTLBL[r] || r; else if (r) p = B.PRON[r.slice(0, 3)] || r;
    return binName(s) + ', ' + tn.replace(/ \(.*\)/, '') + (p ? ', ' + p : '');
  }

  /* ---------- Pantalla principal y buscador ---------- */
  let Q = '';
  async function vPealim(parts) {
    if (parts && parts[1]) return vVerbo(parts[1]);
    await indice(); const s = st();
    const due = Object.entries(B.Store.get('learn', {}).srs || {}).filter(([k, r]) => k.startsWith('vf-') && r.err > 0);
    const errVerbs = [...new Set(due.map(([k]) => k.split('-')[1]))];
    const list = (ids, empty) => ids.length ? '<div class="rows">' + ids.map(id => BYID[id]).filter(Boolean).map(rowHTML).join('') + '</div>' : '<p class="muted" style="font-size:.9rem">' + empty + '</p>';
    B.view().innerHTML = B.top('PEALIM', { back: 'menu' }) + '<div class="wrap">' +
      '<div class="lx-hero"><p class="he" lang="he" style="font-size:2.4rem">פְּעָלִים</p><h2>Buscador y analizador de verbos hebreos</h2><p class="muted" style="margin:0">' + IDX.length + ' verbos del Tanaj con todas sus formas atestiguadas</p></div>' +
      '<div class="field">' + B.ic('search') + '<input type="search" id="pq" data-act="pq" placeholder="Hebreo, transliteración, español o raíz" value="' + esc(Q) + '" aria-label="Buscar verbo" autocomplete="off"></div>' +
      '<div id="presults"></div>' +
      '<div id="phome"' + (Q ? ' hidden' : '') + '>' +
      '<div class="rows"><a class="row" href="#binyanim"><span class="t"><b>Los siete binyanim</b><span>Patrones verbales, ejemplos bíblicos y diferencias con el hebreo moderno</span></span><span class="he">בִּנְיָנִים</span></a></div>' +
      '<div class="group-title"><h3>★ Mis verbos favoritos</h3></div>' + list(s.fav, 'Toca ★ en la ficha de un verbo para guardarlo aquí.') +
      '<div class="group-title"><h3>✓ Verbos aprendidos</h3></div>' + list(s.learned, 'Marca un verbo como aprendido o aprueba su práctica con 80 %.') +
      '<div class="group-title"><h3>🔁 Verbos con errores para repasar</h3></div>' + list(errVerbs, 'Aquí aparecen los verbos en los que te equivocaste al practicar.') +
      '<div class="group-title"><h3>Los más frecuentes en la Biblia</h3></div><div class="rows">' + IDX.slice(0, 30).map(rowHTML).join('') + '</div></div>' +
      '<p class="muted" style="font-size:.8rem;margin:20px 0">Los 250 verbos más frecuentes tienen su significado en español; para los demás se muestra por ahora la definición en inglés del léxico de Strong. Formas y análisis: Open Scriptures Hebrew Bible (CC BY 4.0).</p></div>';
    if (Q) search(Q);
  }
  const rowHTML = v => '<a class="row" href="#pealim-' + v.id + '"><span class="t"><b>' + esc(v.tr) + '</b><span>' + esc(v.es || v.en || '') + (v.es ? '' : ' (inglés)') + ' · ' + v.n + ' veces</span></span><span class="he" lang="he">' + esc(v.he) + '</span></a>';
  async function search(q) {
    Q = q; const out = document.getElementById('presults'); const home = document.getElementById('phome'); if (!out) return;
    if (home) home.hidden = !!q.trim();
    if (!q.trim()) { out.innerHTML = ''; return; }
    await indice(); let res = [];
    if (/[\u05D0-\u05EA]/.test(q)) {
      const k = unfinal(q);
      const byRoot = IDX.filter(v => v._r === k);
      res = byRoot.concat(IDX.filter(v => !byRoot.includes(v) && v._r.includes(k)));
      out.innerHTML = '<p class="muted">Buscando también entre las formas conjugadas…</p>' + '<div class="rows">' + res.slice(0, 30).map(rowHTML).join('') + '</div>';
      const FI = await formIndex(); if (Q !== q) return;
      const fromForms = [...(FI.get(k) || [])].map(id => BYID[id]).filter(v => v && !res.includes(v));
      res = byRoot.concat(fromForms, res.filter(v => !byRoot.includes(v)));
      out.innerHTML = (fromForms.length ? '<p class="muted" style="font-size:.88rem">«' + esc(q) + '» es una forma conjugada de:</p>' : '') + (res.length ? '<div class="rows">' + res.slice(0, 40).map(rowHTML).join('') + '</div>' : '<p class="muted">No se encontró ningún verbo con esas letras.</p>');
      return;
    }
    const nq = norm(q);
    res = IDX.filter(v => v._k.includes(nq)).sort((a, b) => (norm(b.tr).startsWith(nq) - norm(a.tr).startsWith(nq)) || (b.n - a.n));
    out.innerHTML = res.length ? '<div class="rows">' + res.slice(0, 40).map(rowHTML).join('') + '</div>' : '<p class="muted">Sin resultados. Prueba con otra palabra, con la raíz en letras hebreas o con la transliteración.</p>';
  }
  let pt;
  document.addEventListener('input', e => { if (e.target.id === 'pq') { clearTimeout(pt); const q = e.target.value; pt = setTimeout(() => search(q), 180); } });

  /* ---------- Ficha del verbo ---------- */
  async function vVerbo(id) {
    await indice(); const v = BYID[id]; if (!v) return B.go('pealim');
    B.view().innerHTML = B.top(esc(v.tr), { back: 'pealim' }) + '<div class="loading">Cargando las conjugaciones…</div>';
    const d = await para(id); const s = st(); const fav = s.fav.includes(id), learned = s.learned.includes(id);
    const stems = v.st.split('');
    const counts = {}; Object.entries(d.f).forEach(([k, c]) => counts[k[0]] = (counts[k[0]] || 0) + c.reduce((a, x) => a + x[1], 0));
    const LX = await B.getJSON('lexico.json');
    const related = Object.entries(LX).filter(([k, L]) => k !== id && unfinal(L[0]) === v._r).slice(0, 12);
    const tables = stems.map((sk, i) => '<section class="pl-bin" id="bin-' + sk + '"' + (i ? ' hidden' : '') + '>' + tableHTML(d, sk) + '</section>').join('');
    B.view().innerHTML = B.top(esc(v.tr), { back: 'pealim', right: '<button class="icon-btn" data-act="pl-fav" data-id="' + id + '" aria-pressed="' + fav + '" aria-label="Favorito">' + (fav ? '★' : '☆') + '</button>' }) +
      '<div class="wrap pl">' +
      '<div class="pl-head"><p class="he pl-lex" lang="he">' + esc(v.he) + '</p><h2>' + esc(v.tr) + '</h2>' +
      '<p class="pl-es">' + (v.es ? esc(v.es) : esc(v.en || '') + ' <span class="muted">(léxico de Strong, en inglés; significado en español pendiente)</span>') + '</p>' +
      '<div class="pl-root"><span>Raíz (shóresh)</span>' + v.r.split('־').map(l => '<b class="he" lang="he">' + esc(l) + '</b>').join('') + '</div>' +
      '<p class="muted" style="margin:6px 0 0">Aparece ' + v.n + ' veces en el Tanaj · Binyanim: ' + stems.map(binName).join(', ') + '</p>' +
      '<div class="btns" style="justify-content:center"><button class="btn" data-act="pl-say" data-h="' + esc(v.he) + '">🔊 Escuchar</button><button class="btn solid" data-act="pl-practice" data-id="' + id + '">🎮 Practicar conjugaciones</button><button class="btn" data-act="pl-learned" data-id="' + id + '">' + (learned ? '✓ Aprendido' : 'Marcar como aprendido') + '</button></div></div>' +
      '<div class="pl-tabs" role="tablist">' + stems.map((sk, i) => '<button role="tab" data-act="pl-tab" data-s="' + sk + '" aria-selected="' + !i + '">' + esc(binName(sk)) + ' <small>' + (counts[sk] || 0) + '</small></button>').join('') + '</div>' +
      tables +
      '<p class="notice" style="font-size:.88rem">Solo se muestran las formas que aparecen en la Biblia hebrea, sin sufijos pronominales. «—» significa que esa forma no está atestiguada en el Tanaj (no que no exista en el hebreo). Toca una forma para abrir su primer versículo.</p>' +
      '<div class="group-title"><h3>Hebreo bíblico y moderno</h3></div><p style="font-size:.95rem">La Biblia usa un sistema de aspecto: <b>qatal</b> (acción completa), <b>yiqtol</b> (incompleta o futura), y en los relatos <b>wayyiqtol</b> («y dijo») para el pasado y <b>weqatal</b> («y dirá») para el futuro o las instrucciones. El hebreo moderno tiene tres tiempos: pasado (formas qatal), presente (el participio) y futuro (formas yiqtol), y ya no usa wayyiqtol ni weqatal.</p>' +
      (related.length ? '<div class="group-title"><h3>Palabras con las mismas letras</h3></div><div class="rows">' + related.map(([k, L]) => '<a class="row" href="#lema-' + k + '"><span class="t"><b>' + esc(L[1]) + '</b><span>' + esc(L[3] || L[4] || '') + (L[3] ? '' : ' (inglés)') + '</span></span><span class="he" lang="he">' + esc(L[0]) + '</span></a>').join('') + '</div>' : '') +
      '<div class="group-title"><h3>Ejemplos en la Biblia</h3></div><div id="pl-ex"><div class="loading">Cargando versículos…</div></div>' +
      '<p class="muted" style="font-size:.8rem">Formas y análisis: Open Scriptures Hebrew Bible (CC BY 4.0).</p></div>';
    examples(d.refs, v);
  }
  async function examples(refs, v) {
    const box = document.getElementById('pl-ex'); if (!box) return;
    let html = '';
    for (const r of refs.slice(0, 8)) {
      const [b, cv] = r.split(' '); const [c, vv] = cv.split(':').map(Number);
      try { const d = await B.getBookV(b); const cell = d.c[c - 1][vv - 1]; if (!cell) continue;
        html += '<a class="result" href="#leer-' + b + '-' + c + '-' + vv + '"><b>' + esc(B.bookName(b) + ' ' + cv) + '</b>' + (cell[1] ? '<p class="he" lang="he">' + esc(B.heb(cell[1])) + '</p>' : '') + '<p>' + esc(cell[0]) + '</p></a>';
      } catch (e) { }
    }
    html += refs.length > 8 ? '<p class="muted" style="margin-top:12px">Más apariciones: ' + refs.slice(8, 80).map(r => { const [b, cv] = r.split(' '); const [c, vv] = cv.split(':'); return '<a href="#leer-' + b + '-' + c + '-' + vv + '">' + esc(B.bookName(b) + ' ' + cv) + '</a>'; }).join(', ') + (v.n > 80 ? '…' : '') + '</p>' : '';
    box.innerHTML = html;
  }
  function cellHTML(d, key) {
    const c = d.f[key];
    if (!c) return '<td class="pl-none">—</td>';
    const [f, n, ref] = c[0]; const [b, cv] = (ref || ' ').split(' '); const [cc, vv] = (cv || ':').split(':');
    return '<td><a href="' + (ref ? '#leer-' + b + '-' + cc + '-' + vv : '#') + '" title="' + esc(label(key) + ' — ' + n + ' veces') + '">' + he(f, 'pl-form') + '<small>' + n + '×</small></a>' + (c.length > 1 ? '<span class="pl-alt">' + c.slice(1).map(x => he(x[0])).join(' ') + '</span>' : '') + '</td>';
  }
  function tableHTML(d, sk) {
    let html = '';
    for (const [t, name] of TENSES) {
      const keys = Object.keys(d.f).filter(k => k[0] === sk && k[1] === t);
      if (!keys.length) continue;
      html += '<h3 class="pl-tense">' + esc(name) + '</h3>';
      if (t === 'c' || t === 'a') { html += '<table class="pl-t"><tr><th>Forma</th>' + cellHTML(d, sk + t) + '</tr></table>'; continue; }
      if (t === 'r' || t === 's') {
        const rows = PARTS.filter(p => d.f[sk + t + p]);
        html += '<table class="pl-t">' + rows.map(p => '<tr><th>' + esc(PARTLBL[p]) + '</th>' + cellHTML(d, sk + t + p) + '</tr>').join('') + '</table>'; continue;
      }
      const rows = PERSONS.filter(p => d.f[sk + t + p] || ['3ms', '3fs', '2ms', '1cs', '3mp'].includes(p) && (t === 'p' || t === 'i' || t === 'w'));
      html += '<table class="pl-t">' + rows.map(p => '<tr><th>' + esc(B.PRON[p] || p) + '<small>' + p + '</small></th>' + cellHTML(d, sk + t + p) + '</tr>').join('') + '</table>';
    }
    return html || '<p class="muted">Sin formas sin sufijo en este binyan.</p>';
  }

  /* ---------- Los siete binyanim ---------- */
  async function vBinyanim() {
    B.view().innerHTML = B.top('Los siete binyanim', { back: 'pealim' }) + '<div class="loading">Buscando ejemplos en la Biblia…</div>';
    await indice(); const cnt = await B.getJSON('pealim/binyanim.json');
    await Promise.all([0, 1, 2, 3, 4, 5, 6, 7].map(async i => { if (!SHARD[i]) SHARD[i] = await B.getJSON('pealim/p' + i + '.json'); }));
    const total = Object.values(cnt).reduce((a, b) => a + b, 0);
    const ex = sk => IDX.filter(v => v.es).map(v => { const d = SHARD[+v.id % 8][v.id]; const c = d && d.f[sk + 'p3ms']; return c ? [v, c[0]] : null; }).filter(Boolean).slice(0, 4);
    B.view().innerHTML = B.top('Los siete binyanim', { back: 'pealim' }) + '<div class="wrap study">' +
      '<div class="lx-hero"><p class="he" lang="he" style="font-size:2.4rem">בִּנְיָנִים</p><h2>Los patrones del verbo hebreo</h2></div>' +
      '<p>Casi todos los verbos hebreos se forman sobre una raíz de tres consonantes. Esa raíz se combina con siete patrones principales, los <b>binyanim</b> («construcciones»), que cambian el sentido: simple, pasivo, intensivo, causativo, reflexivo… Los nombres de los binyanim vienen del verbo modelo פ־ע־ל «hacer».</p>' +
      BIN.map(([k, name, heName, pat, desc, diff]) => {
        const n = cnt[k] || 0; const e = ex(k);
        return '<div class="pl-bcard"><div class="pl-bhead"><div><b>' + esc(name) + '</b><span>' + Math.round(n / total * 1000) / 10 + ' % de las formas verbales de la Biblia</span></div>' + he(heName, 'pl-bhe') + '</div>' +
          '<p>' + esc(desc) + '</p>' +
          (e.length ? '<p class="muted" style="margin:0 0 4px;font-size:.88rem">Ejemplos en pasado, 3.ª persona masc. sing. (él…), tomados del texto:</p><div class="pl-bex">' + e.map(([v, c]) => '<a href="#pealim-' + v.id + '">' + he(c[0], 'pl-form') + '<span>' + esc(v.es.split(',')[0]) + '</span></a>').join('') + '</div>' : '') +
          '<p class="pl-diff"><b>Bíblico y moderno:</b> ' + esc(diff) + '</p></div>';
      }).join('') +
      '<p class="muted" style="font-size:.85rem">Hay además patrones poco frecuentes en la Biblia (Polel, Hitpolel, Pilpel, Qal pasivo, Hishtafel, entre otros), que la app muestra en la ficha de cada verbo cuando aparecen. Porcentajes calculados sobre las formas sin sufijo del Open Scriptures Hebrew Bible.</p></div>';
  }

  /* ---------- Ficha de una palabra (lema) ---------- */
  const POS = { v: 'verbo', 'n-m': 'sustantivo masculino', 'n-f': 'sustantivo femenino', n: 'sustantivo o número', a: 'adjetivo', adv: 'adverbio', prep: 'preposición', conj: 'conjunción', prt: 'partícula', p: 'pronombre', d: 'demostrativo', i: 'interrogativo', r: 'relativo', inj: 'interjección' };
  async function vLema(parts) {
    const id = parts[1]; const LX = await B.getJSON('lexico.json'); const L = LX[id]; if (!L) return B.go('pealim');
    const R = await B.getJSON('lemas.json'); const refs = R[id] || [];
    const isVerb = L[2] === 'v';
    const related = Object.entries(LX).filter(([k, x]) => k !== id && unfinal(x[0]) === unfinal(L[0])).slice(0, 12);
    B.view().innerHTML = B.top(esc(L[1]), { back: 'biblia' }) + '<div class="wrap pl">' +
      '<div class="pl-head"><p class="he pl-lex" lang="he">' + esc(L[0]) + '</p><h2>' + esc(L[1]) + '</h2>' +
      '<p class="pl-es">' + (L[3] ? esc(L[3]) : esc(L[4]) + ' <span class="muted">(léxico de Strong, en inglés)</span>') + '</p>' +
      '<p class="muted" style="margin:0">' + esc(POS[L[2]] || (L[2].startsWith('n-pr') ? 'nombre propio' : L[2])) + ' · aparece ' + L[5] + ' veces · letras: ' + esc(plain(L[0]).split('').join('־')) + '</p>' +
      '<div class="btns" style="justify-content:center">' + (isVerb ? '<a class="btn solid" href="#pealim-' + id + '">Ver conjugaciones</a>' : '') + (L[3] ? '<button class="btn" data-act="pl-saveword" data-k="' + id + '">Guardar para repasar</button>' : '') + '</div></div>' +
      (related.length ? '<div class="group-title"><h3>Palabras con las mismas letras</h3></div><div class="rows">' + related.map(([k, x]) => '<a class="row" href="#' + (x[2] === 'v' ? 'pealim-' : 'lema-') + k + '"><span class="t"><b>' + esc(x[1]) + '</b><span>' + esc(x[3] || x[4] || '') + '</span></span><span class="he" lang="he">' + esc(x[0]) + '</span></a>').join('') + '</div>' : '') +
      (refs.length ? '<div class="group-title"><h3>Dónde aparece</h3></div><p>' + refs.map(r => { const [b, cv] = r.split(' '); const [c, v] = cv.split(':'); return '<a href="#leer-' + b + '-' + c + '-' + v + '">' + esc(B.bookName(b) + ' ' + cv) + '</a>'; }).join(', ') + (L[5] > refs.length ? '…' : '') + '</p>' : '') +
      '</div>';
  }

  /* ---------- Acciones ---------- */
  EXT.act['pl-tab'] = el => {
    document.querySelectorAll('.pl-tabs [role=tab]').forEach(b => b.setAttribute('aria-selected', b === el));
    document.querySelectorAll('.pl-bin').forEach(s => { s.hidden = s.id !== 'bin-' + el.dataset.s; });
  };
  EXT.act['pl-fav'] = el => { const s = st(); const id = el.dataset.id; s.fav = s.fav.includes(id) ? s.fav.filter(x => x !== id) : [id].concat(s.fav); save(s); const on = s.fav.includes(id); el.textContent = on ? '★' : '☆'; el.setAttribute('aria-pressed', on); B.toast(on ? 'Agregado a favoritos' : 'Quitado de favoritos'); };
  EXT.act['pl-learned'] = el => { const s = st(); const id = el.dataset.id; s.learned = s.learned.includes(id) ? s.learned.filter(x => x !== id) : [id].concat(s.learned); save(s); el.textContent = s.learned.includes(id) ? '✓ Aprendido' : 'Marcar como aprendido'; };
  EXT.act['pl-say'] = el => { if (EXT.speak) EXT.speak(el.dataset.h); };
  EXT.act['pl-saveword'] = async el => { const LX = await B.getJSON('lexico.json'); const L = LX[el.dataset.k]; if (L && EXT.saveWord) { EXT.saveWord({ id: 'lx-' + el.dataset.k, he: L[0], tr: L[1], es: L[3] }); el.textContent = 'Guardada ✓'; el.disabled = true; } };
  EXT.act['pl-practice'] = async el => {
    const id = el.dataset.id; await indice(); const v = BYID[id]; const d = await para(id);
    const keys = Object.keys(d.f).filter(k => k[1] !== 'a').sort((a, b) => d.f[b][0][1] - d.f[a][0][1]);
    const seen = new Set(); const items = [];
    for (const k of keys) { const f = d.f[k][0][0]; const lab = label(k); if (seen.has(f) || seen.has(lab)) continue; seen.add(f); seen.add(lab); items.push({ id: 'vf-' + id + '-' + k, he: f, tr: '', es: lab, kind: 'conj', ref: d.f[k][0][2] }); if (items.length >= 10) break; }
    if (items.length < 4) { B.toast('Este verbo tiene muy pocas formas para practicar'); return; }
    EXT.practice(items, 'Conjugaciones de ' + v.tr, '#9C6ADE', pct => { if (pct >= 80) { const s = st(); if (!s.learned.includes(id)) { s.learned.unshift(id); save(s); } } });
  };

  Object.assign(EXT.routes, { pealim: vPealim, binyanim: vBinyanim, lema: vLema });
  ['pealim', 'binyanim', 'lema'].forEach(r => { EXT.tabs[r] = ''; });
})();
