/* BEIT HATZIRAH — TEFILOT (תְּפִלּוֹת): Sidur digital.
   Cada tefilá indica su fuente y su estado: texto bíblico (Códice de Leningrado), texto en dominio
   público (CC0) o transcripción del nusaj tradicional pendiente de verificar con un sidur impreso. */
(function () {
  'use strict';
  const EXT = window.BH_EXT;
  let B = null;
  const prevInit = EXT.init;
  EXT.init = api => { if (prevInit) prevInit(api); B = api; };
  const esc = s => B.esc(s);
  const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[ʼ'’]/g, '');
  const plain = h => (h || '').replace(/[^\u05D0-\u05EA\s]/g, '');

  let D = null;
  async function data() { if (!D) D = await B.getJSON('tefilot.json'); return D; }
  const ST = () => Object.assign({ fav: [], learned: [], uses: {}, hist: [], notes: {}, show: { he: true, tr: true, es: true }, scale: 1, comfy: false }, B.Store.get('tefilot', {}) || {});
  const save = s => B.Store.set('tefilot', s);
  const ESTADO = {
    biblico: ['✓ Texto bíblico', 'Texto del Códice de Leningrado tomado de la Biblia de la app. Las frases litúrgicas añadidas se indican.', 'ok'],
    cc0: ['Dominio público', 'Texto de una fuente en dominio público (CC0), con erratas evidentes corregidas.', 'cc0'],
    transcripcion: ['Por verificar', 'Transcripción del nusaj tradicional preparada por Beit Hatzirah. Verifícala con un sidur impreso antes de usarla en público.', 'warn']
  };
  const badge = t => { const e = t.verificado && t.estado !== 'biblico' ? ['✓ Verificada por Beit Hatzirah', '', 'ok'] : ESTADO[t.estado]; return '<span class="tf-badge tf-' + e[2] + '" title="' + esc(e[1]) + '">' + esc(e[0]) + '</span>'; };

  /* ---------- Audio (voz del dispositivo) ---------- */
  const SS = window.speechSynthesis || null;
  const AU = { id: null, i: 0, playing: false, slow: false, repeat: false, lang: 'he', tok: 0 };
  function voice(l) {
    if (!SS) return null; const vs = SS.getVoices().filter(v => l === 'he' ? /^(he|iw)/i.test(v.lang) : /^es/i.test(v.lang)); if (!vs.length) return null;
    const p = B.Store.get('audio', {}) || {}; const want = l === 'he' ? p.vHe : p.vEs;
    return vs.find(v => v.name === want) || (l === 'he' && vs.find(v => /avri|asaf/i.test(v.name))) || vs.find(v => /premium|enhanced|mejorad|natural/i.test(v.name)) || vs[0];
  }
  const heSpeech = h => h.replace(/[\u0591-\u05AF\u05BD\u05C0]/g, '').replace(/יְיָ|יְהֹוָה|יְהוָה|יהוה/g, 'אֲדֹנָי').replace(/לַיְיָ/g, 'לַאדֹנָי').replace(/\u05BE/g, ' ').replace(/[()]/g, '');
  async function partText(t, i) { const p = t.partes[i]; if (AU.lang === 'he') return heSpeech(p.he); return p.es || await refES(p.ref); }
  async function refES(ref) { const [b, cv] = ref.split(' '); const [c, v] = cv.split(':').map(Number); const d = await B.getBookV(b); return B.es((d.c[c - 1][v - 1] || [''])[0]); }
  async function speakPart() {
    if (!AU.playing) return; const t = D.tefilot.find(x => x.id === AU.id); if (!t || AU.i >= t.partes.length) { stopAudio(); return; }
    const v = voice(AU.lang); if (!v) { B.toast(AU.lang === 'he' ? 'Este dispositivo no tiene una voz en hebreo instalada' : 'No hay voz en español'); stopAudio(); return; }
    markPart(AU.i); const tok = ++AU.tok;
    const u = new SpeechSynthesisUtterance(await partText(t, AU.i)); u.voice = v; u.lang = v.lang; u.rate = AU.slow ? 0.6 : 0.9;
    u.onend = () => { if (tok !== AU.tok) return; if (!AU.repeat) AU.i++; speakPart(); };
    u.onerror = e => { if (tok !== AU.tok || /interrupted|canceled/.test(e.error)) return; stopAudio(); };
    SS.cancel(); SS.speak(u);
  }
  function stopAudio() { AU.playing = false; AU.tok++; if (SS) SS.cancel(); markPart(-1); playerUI(); }
  function markPart(i) { document.querySelectorAll('.tf-p.on').forEach(e => e.classList.remove('on')); const el = document.getElementById('tfp' + i); if (el) { el.classList.add('on'); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }
  function playerUI() {
    const b = document.getElementById('tf-play'); if (b) b.textContent = AU.playing ? '❚❚ Pausar' : '▶ Escuchar';
    document.querySelectorAll('[data-act="tf-slow"]').forEach(x => x.setAttribute('aria-pressed', AU.slow));
    document.querySelectorAll('[data-act="tf-rep"]').forEach(x => x.setAttribute('aria-pressed', AU.repeat));
    document.querySelectorAll('[data-act="tf-alang"]').forEach(x => x.setAttribute('aria-pressed', x.dataset.l === AU.lang));
  }

  /* ---------- Pantallas ---------- */
  const top = (t, back) => B.top(t, { back: back || 'tefilot' });
  async function vHome() {
    await data(); const s = ST();
    const by = id => D.tefilot.find(t => t.id === id);
    const used = Object.entries(s.uses).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => by(id)).filter(Boolean);
    const row = t => '<a class="row" href="#tefilot-t-' + t.id + '"><span class="t"><b>' + esc(t.es) + '</b><span>' + esc(t.momento) + '</span></span><span class="he" lang="he">' + esc(t.he) + '</span></a>';
    B.view().innerHTML = top('Tefilot', 'menu') + '<div class="wrap tf">' +
      '<div class="tf-hero"><img class="sec-logo" src="' + B.LOGO + '" alt=""><p class="he" lang="he">תְּפִלּוֹת</p><h2>TEFILOT</h2><p>Oraciones y bendiciones hebreas</p></div>' +
      '<div class="field">' + B.ic('search') + '<input type="search" id="tfq" placeholder="Buscar: Netilat Yadáyim, Shabat, mañana, pan…" aria-label="Buscar una tefilá" autocomplete="off"></div><div id="tfres"></div>' +
      '<div class="tf-cats">' + D.cats.map(c => { const n = D.tefilot.filter(t => t.cat === c.id).length; return '<a class="tf-cat" href="#tefilot-c-' + c.id + '"><span class="tf-ci">' + c.ic + '</span><b>' + esc(c.es) + '</b><span class="he" lang="he">' + esc(c.he) + '</span><small>' + (n ? n + ' tefilot' : 'Próxima etapa') + '</small></a>'; }).join('') +
      '<a class="tf-cat" href="#tefilot-guia"><span class="tf-ci">🍎</span><b>¿Qué bendición digo?</b><span class="he" lang="he">מַה מְּבָרְכִים</span><small>Guía de alimentos</small></a></div>' +
      (s.fav.length ? '<div class="group-title"><h3>★ Favoritas</h3></div><div class="rows">' + s.fav.map(by).filter(Boolean).map(row).join('') + '</div>' : '') +
      (used.length ? '<div class="group-title"><h3>Las más usadas</h3></div><div class="rows">' + used.map(row).join('') + '</div>' : '') +
      (s.hist.length ? '<div class="group-title"><h3>Leídas recientemente</h3></div><div class="rows">' + s.hist.slice(0, 5).map(by).filter(Boolean).map(row).join('') + '</div>' : '') +
      '<div class="tf-legend"><b>Sobre los textos</b>' + Object.values(ESTADO).map(e => '<p><span class="tf-badge tf-' + e[2] + '">' + esc(e[0]) + '</span> ' + esc(e[1]) + '</p>').join('') + '</div></div>';
  }
  document.addEventListener('input', e => {
    if (e.target.id !== 'tfq') return; const out = document.getElementById('tfres'); const q = e.target.value.trim(); if (!out) return;
    if (q.length < 2) { out.innerHTML = ''; return; }
    // búsqueda tolerante a las distintas transliteraciones (ch/kh/j, y, h, letras dobles)
    const loose = x => norm(x).replace(/ch|kh/g, 'j').replace(/[yh]/g, '').replace(/(.)\1/g, '$1');
    const nq = loose(q), hq = plain(q).replace(/\s+/g, ' ').trim();
    const catName = id => (D.cats.find(c => c.id === id) || {}).es || '';
    const hits = D.tefilot.filter(t => loose([t.es, t.momento, t.tags.join(' '), catName(t.cat), t.explic].join(' ')).includes(nq) || (hq && (plain(t.he).includes(hq) || t.partes.some(p => plain(p.he).includes(hq)))) || t.partes.some(p => loose(p.tr + ' ' + (p.es || '')).includes(nq)));
    hits.sort((a, b) => (loose(b.es).includes(nq) ? 1 : 0) - (loose(a.es).includes(nq) ? 1 : 0));
    out.innerHTML = hits.length ? '<div class="rows">' + hits.slice(0, 20).map(t => '<a class="row" href="#tefilot-t-' + t.id + '"><span class="t"><b>' + esc(t.es) + '</b><span>' + esc(catName(t.cat)) + ' · ' + esc(t.momento) + '</span></span><span class="he" lang="he">' + esc(t.he) + '</span></a>').join('') + '</div>' : '<p class="muted">No se encontró ninguna tefilá.</p>';
  });
  async function vCat(id) {
    await data(); const c = D.cats.find(x => x.id === id); if (!c) return B.go('tefilot');
    const ts = D.tefilot.filter(t => t.cat === id); const s = ST();
    B.view().innerHTML = top(esc(c.es)) + '<div class="wrap tf"><div class="tf-hero small"><span class="tf-ci">' + c.ic + '</span><p class="he" lang="he">' + esc(c.he) + '</p><h2>' + esc(c.es) + '</h2></div>' +
      (ts.length ? '<div class="rows">' + ts.map(t => '<a class="row" href="#tefilot-t-' + t.id + '"><span class="t"><b>' + esc(t.es) + '</b><span>' + esc(t.momento) + '</span></span>' + (s.learned.includes(t.id) ? '<span class="done">' + B.ic('check', ' width="18" height="18"') + '</span>' : '') + '<span class="he" lang="he">' + esc(t.he) + '</span></a>').join('') + '</div>'
        : '<div class="empty"><p>Esta categoría se incorporará en la próxima etapa: oraciones por la familia, los hijos, el matrimonio, la salud, la protección y la sabiduría. Las composiciones devocionales de Beit Hatzirah se identificarán claramente como tales, para no confundirlas con las tefilot tradicionales.</p><a class="btn" href="#tefilot-c-especiales">Ver momentos especiales</a></div>') +
      (id === 'alimentos' ? '<div class="btns" style="margin:16px 0"><a class="btn solid" href="#tefilot-guia">🍎 ¿Qué bendición digo?</a></div>' : '') + '</div>';
  }
  async function vGuia() {
    await data();
    B.view().innerHTML = top('¿Qué bendición digo?', 'tefilot-c-alimentos') + '<div class="wrap tf study"><p style="margin-top:16px">Antes de comer o beber se dice una bendición según el tipo de alimento; después, la bendición final que corresponde.</p>' +
      '<div class="tf-guide">' + D.guia.map(g => { const t = D.tefilot.find(x => x.id === g.id); return '<a class="tf-gi" href="#tefilot-t-' + g.id + '"><div><b>' + esc(g.n) + '</b><span class="he" lang="he">' + esc(t ? t.he : '') + '</span></div><p>' + esc(g.ej) + '</p><small>Después: ' + esc(g.despues) + '</small></a>'; }).join('') + '</div>' +
      '<h2>Reglas generales</h2><ul><li>Si se come pan en la comida, Hamotzí cubre todo lo que se come con él, y al final se dice Birkat HaMazón.</li><li>La bendición final se dice después de comer al menos el volumen de una aceituna (kezáyit) en un tiempo breve.</li><li>Cuando hay varios alimentos, existe un orden de prioridad entre las bendiciones; las costumbres y opiniones varían.</li></ul>' +
      '<p class="tf-note">Esta guía es orientativa. Para casos dudosos (alimentos mezclados, productos procesados), consulta a tu autoridad rabínica.</p></div>';
  }
  async function vTef(id) {
    await data(); const t = D.tefilot.find(x => x.id === id); if (!t) return B.go('tefilot');
    const s = ST(); s.uses[id] = (s.uses[id] || 0) + 1; s.hist = [id].concat(s.hist.filter(x => x !== id)).slice(0, 30); save(s);
    if (AU.id !== id) { stopAudio(); AU.id = id; AU.i = 0; }
    const fav = s.fav.includes(id), learned = s.learned.includes(id), note = s.notes[id];
    const cat = D.cats.find(c => c.id === t.cat);
    const parts = [];
    for (let i = 0; i < t.partes.length; i++) {
      const p = t.partes[i]; const es = p.es || await refES(p.ref);
      parts.push('<div class="tf-p" id="tfp' + i + '" data-act="tf-part" data-i="' + i + '">' +
        (s.show.he ? '<p class="he tf-he" lang="he" dir="rtl">' + words(p.he) + '</p>' : '') +
        (s.show.tr ? '<p class="tf-tr" lang="es">' + esc(p.tr) + '</p>' : '') +
        (s.show.es ? '<p class="tf-es" lang="es">' + B.es(es || '', true) + '</p>' : '') +
        (p.ref ? '<p class="tf-ref"><a href="#leer-' + p.ref.replace(' ', '-').replace(':', '-') + '">' + esc(B.refLabel(p.ref)) + '</a></p>' : (t.estado === 'biblico' ? '<p class="tf-ref">Texto litúrgico</p>' : '')) + '</div>');
    }
    B.view().innerHTML = top(esc(t.es), 'tefilot-c-' + t.cat) + '<div class="wrap tf' + (s.comfy ? ' comfy' : '') + '" style="--tfs:' + s.scale + '">' +
      '<div class="tf-head"><p class="he tf-name" lang="he">' + esc(t.he) + '</p><h1>' + esc(t.es) + '</h1><p class="muted" style="margin:0">' + esc(cat ? cat.es : '') + '</p>' + badge(t) + '</div>' +
      '<dl class="meta"><dt>Cuándo</dt><dd>' + esc(t.momento) + '</dd><dt>Fuente</dt><dd>' + esc(t.fuente) + '</dd></dl>' +
      '<p>' + esc(t.explic) + '</p>' + (t.instr ? '<div class="tf-instr"><b>Instrucciones</b><p>' + esc(t.instr) + '</p></div>' : '') +
      '<div class="tf-tools"><div class="chips">' + [['he', 'Hebreo'], ['tr', 'Transliteración'], ['es', 'Traducción']].map(([k, l]) => '<button class="chip' + (s.show[k] ? ' on' : '') + '" data-act="tf-show" data-k="' + k + '" aria-pressed="' + s.show[k] + '">' + l + '</button>').join('') + '</div>' +
      '<div class="tf-row"><button class="btn" data-act="tf-size" data-d="-1" aria-label="Letra más pequeña">A−</button><button class="btn" data-act="tf-size" data-d="1" aria-label="Letra más grande">A+</button><button class="btn" data-act="tf-comfy" aria-pressed="' + s.comfy + '">📖 Lectura cómoda</button><button class="btn" data-act="tf-words" aria-pressed="false">🔍 Estudiar palabras</button></div></div>' +
      '<div class="tf-player"><button id="tf-play" class="btn solid" data-act="tf-play">▶ Escuchar</button><button class="btn" data-act="tf-slow" aria-pressed="' + AU.slow + '">🐢 Lento</button><button class="btn" data-act="tf-rep" aria-pressed="' + AU.repeat + '">🔂 Repetir párrafo</button><span class="seg three tf-al"><button data-act="tf-alang" data-l="he" aria-pressed="' + (AU.lang === 'he') + '">Hebreo</button><button data-act="tf-alang" data-l="es" aria-pressed="' + (AU.lang === 'es') + '">Español</button></span>' +
      '<p class="tf-note">Voz sintética del dispositivo (pronunciación israelí moderna). No es una grabación verificada de la pronunciación tradicional. Toca un párrafo para escucharlo desde allí.</p></div>' +
      '<div class="tf-text">' + parts.join('') + '</div>' +
      '<div class="btns tf-actions"><button class="btn" data-act="tf-fav">' + (fav ? '★ Favorita' : '☆ Favorita') + '</button><button class="btn" data-act="tf-learn">' + (learned ? '✓ Aprendida' : 'Marcar como aprendida') + '</button><button class="btn" data-act="tf-copy">📋 Copiar</button><button class="btn" data-act="tf-wa">WhatsApp</button><button class="btn" data-act="tf-note">📝 ' + (note ? 'Editar nota' : 'Agregar nota') + '</button></div>' +
      (note ? '<div class="v-note"><span class="v-note-l">Mi nota</span>' + esc(note).replace(/\n/g, '<br>') + '</div>' : '') +
      '</div>';
    playerUI();
  }
  const words = h => esc(h).replace(/[\u05D0-\u05EA][\u05B0-\u05C7\u05D0-\u05EA]*/g, w => '<span class="tf-w">' + w + '</span>');

  /* ---------- Estudiar palabras: búsqueda en el léxico ---------- */
  const PREF = ['וּ', 'וְ', 'וַ', 'הַ', 'הָ', 'בְּ', 'בַּ', 'לְ', 'לַ', 'מִ', 'מֵ', 'כְּ', 'שֶׁ'];
  async function lookup(w) {
    const LX = await B.getJSON('lexico.json'); const c = plain(w).replace(/[ךםןףץ]$/, m => m);
    const cands = [c]; for (let k = 1; k <= 2; k++) if (c.length - k >= 2 && /^[והבלמכש]+$/.test(c.slice(0, k))) cands.push(c.slice(k));
    const FIN = { 'כ': 'ך', 'מ': 'ם', 'נ': 'ן', 'פ': 'ף', 'צ': 'ץ' };
    const withFinal = x => x.slice(0, -1) + (FIN[x.slice(-1)] || x.slice(-1));
    const hits = [];
    for (const k of Object.keys(LX)) { const L = LX[k]; const lc = plain(L[0]); const i = cands.findIndex(x => x === lc || withFinal(x) === lc); if (i >= 0) hits.push([k, L, i]); }
    // primero la palabra completa (menos prefijos quitados), después las que tienen significado en español y las más frecuentes
    hits.sort((a, b) => a[2] - b[2] || (b[1][3] ? 1 : 0) - (a[1][3] ? 1 : 0) || b[1][5] - a[1][5]);
    return hits.slice(0, 4);
  }

  /* ---------- Acciones ---------- */
  Object.assign(EXT.act, {
    'tf-show': el => { const s = ST(); const k = el.dataset.k; s.show[k] = !s.show[k]; if (!s.show.he && !s.show.tr && !s.show.es) s.show.he = true; save(s); vTef(AU.id); },
    'tf-size': el => { const s = ST(); s.scale = Math.max(0.8, Math.min(1.8, +(s.scale + 0.1 * +el.dataset.d).toFixed(2))); save(s); const w = document.querySelector('.tf'); if (w) w.style.setProperty('--tfs', s.scale); },
    'tf-comfy': el => { const s = ST(); s.comfy = !s.comfy; save(s); document.querySelector('.tf').classList.toggle('comfy', s.comfy); el.setAttribute('aria-pressed', s.comfy); },
    'tf-words': el => { const on = el.getAttribute('aria-pressed') !== 'true'; el.setAttribute('aria-pressed', on); document.querySelector('.tf-text').classList.toggle('study-words', on); B.toast(on ? 'Toca una palabra hebrea para ver su significado' : 'Modo de estudio desactivado'); },
    'tf-play': () => { if (AU.playing) { stopAudio(); return; } AU.playing = true; playerUI(); speakPart(); },
    'tf-slow': () => { AU.slow = !AU.slow; playerUI(); if (AU.playing) speakPart(); },
    'tf-rep': () => { AU.repeat = !AU.repeat; playerUI(); },
    'tf-alang': el => { AU.lang = el.dataset.l; playerUI(); if (AU.playing) speakPart(); },
    'tf-part': async (el, e) => {
      const w = e && e.target.closest('.tf-w');
      if (w && document.querySelector('.tf-text.study-words')) {
        const hits = await lookup(w.textContent);
        B.sheet('<h4 class="he" lang="he" style="font-size:2rem;text-align:right">' + esc(w.textContent) + '</h4>' + (hits.length ? hits.map(([k, L]) => '<div class="wa-seg"><span class="he" lang="he">' + esc(L[0]) + '</span><div><b>' + esc(L[3] || L[4] || '') + (L[3] ? '' : ' <span class="muted">(léxico de Strong, en inglés)</span>') + '</b><span>' + esc(L[1]) + ' · aparece ' + L[5] + ' veces en el Tanaj</span><span class="wa-acts"><a href="#' + (L[2] === 'v' ? 'pealim-' : 'lema-') + k + '" data-act="close-sheet-nav">' + (L[2] === 'v' ? 'Conjugaciones en PEALIM' : 'Ficha de la palabra') + '</a>' + (L[3] ? '<button data-act="w-save" data-k="' + k + '" data-ref="">Guardar para repasar</button>' : '') + '</span></div></div>').join('') + '<p class="tf-note">Coincidencia por las letras de la palabra (sin prefijos). En las oraciones, una misma forma puede tener otro significado: tómalo como orientación.</p>' : '<p class="muted">No se encontró esta palabra en el léxico bíblico. Puede ser una forma propia del hebreo litúrgico.</p>'));
        return;
      }
      AU.i = +el.dataset.i; AU.playing = true; playerUI(); speakPart();
    },
    'tf-fav': el => { const s = ST(); const id = AU.id; s.fav = s.fav.includes(id) ? s.fav.filter(x => x !== id) : [id].concat(s.fav); save(s); el.textContent = s.fav.includes(id) ? '★ Favorita' : '☆ Favorita'; },
    'tf-learn': el => { const s = ST(); const id = AU.id; s.learned = s.learned.includes(id) ? s.learned.filter(x => x !== id) : [id].concat(s.learned); save(s); el.textContent = s.learned.includes(id) ? '✓ Aprendida' : 'Marcar como aprendida'; },
    'tf-copy': () => B.sheet('<h4>Copiar</h4><button class="act" data-act="tf-cp" data-k="he">Copiar el hebreo</button><button class="act" data-act="tf-cp" data-k="tr">Copiar la transliteración</button><button class="act" data-act="tf-cp" data-k="es">Copiar la traducción</button><button class="act" data-act="tf-cp" data-k="all">Copiar todo</button>'),
    'tf-cp': async el => { const txt = await textOf(el.dataset.k); try { await navigator.clipboard.writeText(txt); B.toast('Copiado'); } catch (e) { B.toast('No se pudo copiar'); } B.closeSheet(); },
    'tf-wa': async () => { window.open('https://wa.me/?text=' + encodeURIComponent(await textOf('all')), '_blank', 'noopener'); },
    'tf-note': () => { const s = ST(); B.sheet('<h4>Mi nota</h4><textarea class="note-ta" id="tf-nt" rows="6">' + esc(s.notes[AU.id] || '') + '</textarea><div class="btns"><button class="btn solid" data-act="tf-nsave">Guardar</button></div>'); },
    'tf-nsave': () => { const s = ST(); const v = document.getElementById('tf-nt').value.trim(); if (v) s.notes[AU.id] = v; else delete s.notes[AU.id]; save(s); B.closeSheet(); vTef(AU.id); }
  });
  async function textOf(k) {
    const t = D.tefilot.find(x => x.id === AU.id); const out = [t.es + ' — ' + t.he];
    for (const p of t.partes) { const es = p.es || await refES(p.ref); out.push([k === 'he' || k === 'all' ? p.he : '', k === 'tr' || k === 'all' ? p.tr : '', k === 'es' || k === 'all' ? es : ''].filter(Boolean).join('\n')); }
    return out.join('\n\n') + '\n\nBeit Hatzirah — בית הצרעה';
  }

  Object.assign(EXT.routes, { tefilot: p => { if (p[1] === 'c') return vCat(p[2]); if (p[1] === 't') return vTef(p.slice(2).join('-')); if (p[1] === 'guia') return vGuia(); return vHome(); } });
  EXT.tabs.tefilot = '';
  const prevLeave = EXT.leave; EXT.leave = () => { if (prevLeave) prevLeave(); if (!/^#tefilot-t-/.test(location.hash) && AU.playing) stopAudio(); };
})();
