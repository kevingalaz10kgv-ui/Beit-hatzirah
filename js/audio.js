/* BEIT HATZIRAH — AUDIO LIBRO (ספר שמע)
   Lectura en voz alta de las Escrituras en hebreo y español, versículo por versículo,
   con el texto sincronizado. Usa grabaciones reales cuando existen (data/audio/indice.json)
   y, si no, la voz del propio dispositivo (síntesis de voz), siempre a partir del texto. */
(function () {
  'use strict';
  const EXT = window.BH_EXT;
  let B = null;
  const prevInit = EXT.init;
  EXT.init = api => { if (prevInit) prevInit(api); B = api; loadVoices(); };
  const esc = s => B.esc(s);
  const SS = 'speechSynthesis' in window ? window.speechSynthesis : null;

  /* ---------- Preferencias ---------- */
  const DEF = { lang: 'es', text: 'ambos', rate: 1, vol: 1, repeat: 'none', single: false, auto: true, vHe: '', vEs: '' };
  const prefs = () => Object.assign({}, DEF, B.Store.get('audio', {}) || {});
  const setPref = (k, v) => { const p = prefs(); p[k] = v; B.Store.set('audio', p); };

  /* ---------- Voces del dispositivo ---------- */
  let VOICES = [];
  function loadVoices() {
    if (!SS) return;
    const pick = () => { VOICES = SS.getVoices(); const el = document.getElementById('au-voicewarn'); if (el) renderWarn(); };
    pick(); SS.addEventListener ? SS.addEventListener('voiceschanged', pick) : (SS.onvoiceschanged = pick);
  }
  const QUALITY = /premium|enhanced|mejorad|natural|neural|google|siri/i;
  function voicesFor(l) { return VOICES.filter(v => l === 'he' ? /^(he|iw)/i.test(v.lang) : /^es/i.test(v.lang)); }
  // Voces hebreas masculinas conocidas (nativas de Israel): Avri y Asaf (Microsoft)
  const MALE_HE = /avri|asaf/i;
  const isMale = v => /^(he|iw)/i.test(v.lang) && MALE_HE.test(v.name);
  function voiceFor(l) {
    const list = voicesFor(l); if (!list.length) return null;
    const want = prefs()[l === 'he' ? 'vHe' : 'vEs'];
    return list.find(v => v.name === want) || (l === 'he' && (list.find(v => isMale(v) && QUALITY.test(v.name)) || list.find(isMale))) || list.find(v => QUALITY.test(v.name) && v.localService) || list.find(v => QUALITY.test(v.name)) || list.find(v => v.localService) || list[0];
  }

  /* ---------- Grabaciones reales (opcional) ---------- */
  let REC = null;
  async function recordings() { if (REC) return REC; try { REC = await B.getJSON('audio/indice.json'); } catch (e) { REC = {}; } return REC; }
  const recFor = (lang, b, c) => REC && REC[lang] && REC[lang][b + '-' + c];

  /* ---------- Texto que se lee ---------- */
  const TEAM = /[\u0591-\u05AF\u05BD\u05C0\u034F]/g;
  function hebSpeech(h) {
    return h.replace(TEAM, '')
      // el Nombre (י־ה־ו־ה, con o sin prefijo) se lee «Adonay»; con las vocales de Elohim (jirik final), «Elohim»
      .replace(/י[\u05B0-\u05C7]*ה[\u05B0-\u05C7]*ו[\u05B0-\u05C7]*ה[\u05B0-\u05C7]*/g, m => /\u05B4/.test(m) ? 'אֱלֹהִים' : 'אֲדֹנָי')
      .replace(/\u05BE/g, ' ').replace(/\u05C3/g, '.').replace(/\s+/g, ' ').trim();
  }
  const esSpeech = t => B.es(t).replace(/ʼ/g, '').replace(/\s+/g, ' ').trim();
  function chunks(text) {
    const parts = text.split(/(?<=[.;:!?׃])\s+/); const out = []; let cur = '';
    for (const p of parts) { if ((cur + ' ' + p).length > 220 && cur) { out.push(cur); cur = p; } else cur = cur ? cur + ' ' + p : p; }
    if (cur) out.push(cur);
    return out.flatMap(c => c.length <= 260 ? [c] : c.match(/.{1,240}(\s|$)/g).map(x => x.trim()));
  }

  /* ---------- Estado del reproductor ---------- */
  const P = { b: null, c: 1, d: null, v: 0, ci: 0, segs: null, playing: false, tok: 0, mode: 'tts', audio: null, cps: { es: 14, he: 11 }, start: 0, chunkStart: 0, bChar: 0 };
  function verseSegs(i) {
    const cell = P.d.c[P.c - 1][i]; if (!cell) return [];
    const L = prefs().lang; const out = [];
    const heTxt = cell[1] && cell[1] !== '^' ? hebSpeech(cell[1]) : '';
    const esTxt = cell[0] && cell[0] !== '^' ? esSpeech(cell[0]) : '';
    if ((L === 'he' || L === 'both') && heTxt) chunks(heTxt).forEach(t => out.push({ l: 'he', t }));
    if ((L === 'es' || L === 'both') && esTxt) chunks(esTxt).forEach(t => out.push({ l: 'es', t }));
    return out;
  }
  function chapterChars() {
    const L = prefs().lang; const ch = P.d.c[P.c - 1];
    return ch.map(cell => ((L !== 'es' && cell[1] && cell[1] !== '^') ? hebSpeech(cell[1]).length : 0) + ((L !== 'he' && cell[0] && cell[0] !== '^') ? esSpeech(cell[0]).length : 0));
  }
  const fmt = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  /* ---------- Motor de voz (TTS) ---------- */
  function langAvailable(l) { return l === 'both' ? !!(voiceFor('he') && voiceFor('es')) : !!voiceFor(l); }
  function speakChunk() {
    if (!P.playing) return;
    if (!P.segs) { P.segs = verseSegs(P.v); P.ci = 0; markVerse(); }
    if (!P.segs.length) return verseDone();
    if (P.ci >= P.segs.length) return verseDone();
    const seg = P.segs[P.ci]; const tok = ++P.tok; const pr = prefs();
    const u = new SpeechSynthesisUtterance(seg.t);
    const voice = voiceFor(seg.l); if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = seg.l === 'he' ? 'he-IL' : 'es-ES';
    u.rate = pr.rate * (seg.l === 'he' ? 0.92 : 0.95); u.volume = pr.vol; u.pitch = 1;
    P.chunkStart = Date.now(); P.bChar = 0;
    u.onboundary = e => { if (tok === P.tok && e.charIndex) { P.bChar = e.charIndex; } };
    u.onend = () => {
      if (tok !== P.tok) return;
      const secs = (Date.now() - P.chunkStart) / 1000;
      if (secs > 0.8) P.cps[seg.l] = P.cps[seg.l] * 0.7 + (seg.t.length / secs * 1 / pr.rate) * 0.3;
      P.ci++; speakChunk();
    };
    u.onerror = e => { if (tok !== P.tok) return; if (e.error === 'interrupted' || e.error === 'canceled') return; B.toast('La voz del dispositivo se detuvo: ' + e.error); stop(); };
    SS.speak(u);
  }
  function verseDone() {
    const pr = prefs(); const n = P.d.c[P.c - 1].length;
    P.segs = null;
    if (pr.repeat === 'verse') return speakChunk();
    if (pr.single) { stop(); return; }
    if (P.v < n - 1) { P.v++; return speakChunk(); }
    if (pr.repeat === 'chapter') { P.v = 0; return speakChunk(); }
    if (pr.auto) return nextChapter(true);
    stop(); B.toast('Fin del capítulo');
  }

  /* ---------- Motor de grabaciones reales ---------- */
  function recVerseAt(t, rec) { let i = 0; while (i + 1 < rec.t.length && rec.t[i + 1] <= t + 0.05) i++; return i; }
  function setupRecording(rec) {
    if (P.audio) { P.audio.pause(); P.audio = null; }
    const a = new Audio(rec.src); a.preload = 'metadata'; a.playbackRate = prefs().rate; a.volume = prefs().vol;
    a.addEventListener('timeupdate', () => {
      if (P.audio !== a) return; const pr = prefs(); const i = recVerseAt(a.currentTime, rec);
      const end = rec.t[P.v + 1] !== undefined ? rec.t[P.v + 1] : a.duration;
      if ((pr.repeat === 'verse' || pr.single) && a.currentTime >= end - 0.05) { if (pr.repeat === 'verse') a.currentTime = rec.t[P.v]; else { a.pause(); P.playing = false; renderPlayer(); } return; }
      if (i !== P.v) { P.v = i; markVerse(); }
      updateProgress();
    });
    a.addEventListener('ended', () => { if (P.audio !== a) return; const pr = prefs(); if (pr.repeat === 'chapter') { a.currentTime = 0; a.play(); } else if (pr.auto) nextChapter(true); else { P.playing = false; renderPlayer(); } });
    a.addEventListener('loadedmetadata', updateProgress);
    P.audio = a;
  }

  /* ---------- Grabaciones por pasuq (un archivo por versículo) ---------- */
  function vrec() { const pr = prefs(); const r = pr.lang !== 'both' && recFor(pr.lang, P.b, P.c); return r && r.v ? r : null; }
  function playVerseFile(i) {
    const rec = vrec(); if (!rec) return;
    const n = P.d.c[P.c - 1].length; P.v = i; markVerse();
    const item = rec.v[i];
    if (!item) return afterVerseFile();
    if (P.audio) { P.audio.onended = null; P.audio.pause(); }
    const a = new Audio(item.s); a.playbackRate = prefs().rate; a.volume = prefs().vol; P.audio = a;
    a.onended = () => { if (P.audio === a) afterVerseFile(); };
    a.ontimeupdate = () => { if (P.audio === a) updateProgress(); };
    a.play().then(() => { P.playing = true; renderPlayer(); }).catch(() => { B.toast('No se pudo reproducir el audio de este pasuq'); stop(); });
    saveLast();
  }
  function afterVerseFile() {
    const pr = prefs(); const n = P.d.c[P.c - 1].length;
    if (pr.repeat === 'verse') return playVerseFile(P.v);
    if (pr.single) { P.playing = false; renderPlayer(); return; }
    if (P.v < n - 1) return playVerseFile(P.v + 1);
    if (pr.repeat === 'chapter') return playVerseFile(0);
    if (pr.auto) return nextChapter(true);
    P.playing = false; renderPlayer();
  }

  /* ---------- Controles ---------- */
  async function play(fromVerse) {
    const pr = prefs();
    if (typeof fromVerse === 'number') { P.v = fromVerse; P.segs = null; }
    const rec = pr.lang !== 'both' && recFor(pr.lang, P.b, P.c);
    if (rec && rec.v) {
      P.mode = 'vrec'; if (SS) SS.cancel(); P.tok++;
      const i = typeof fromVerse === 'number' ? fromVerse : P.v;
      if (P.audio && P.audio.onended && i === P.v && P.audio.currentTime > 0 && !P.audio.ended) { P.audio.play(); P.playing = true; renderPlayer(); return; }
      playVerseFile(i); P.playing = true; renderPlayer(); return;
    }
    if (rec) {
      P.mode = 'rec'; if (!P.audio || P.audio.src.indexOf(rec.src) < 0) setupRecording(rec);
      if (typeof fromVerse === 'number') P.audio.currentTime = rec.t[fromVerse] || 0;
      try { await P.audio.play(); P.playing = true; } catch (e) { B.toast('No se pudo reproducir la grabación'); P.playing = false; }
      markVerse(); renderPlayer(); saveLast(); return;
    }
    P.mode = 'tts';
    if (!SS) { B.toast('Este navegador no permite la lectura en voz alta'); return; }
    if (!langAvailable(pr.lang)) { renderWarn(); B.toast(pr.lang === 'es' ? 'No hay voz en español en este dispositivo' : 'No hay voz en hebreo en este dispositivo'); return; }
    P.tok++; SS.cancel();
    P.playing = true; P.segs = null; P.ci = 0; P.start = Date.now();
    renderPlayer(); speakChunk(); saveLast();
  }
  function pause() {
    if ((P.mode === 'rec' || P.mode === 'vrec') && P.audio) { P.audio.pause(); P.playing = false; renderPlayer(); saveLast(); return; }
    P.playing = false; P.tok++; if (SS) SS.cancel(); P.ci = 0; P.segs = null; renderPlayer(); saveLast();
  }
  function stop() { P.playing = false; P.tok++; if (SS) SS.cancel(); if (P.audio) P.audio.pause(); P.segs = null; renderPlayer(); saveLast(); }
  function seekVerse(i, autoplay) {
    const n = P.d.c[P.c - 1].length; i = Math.max(0, Math.min(n - 1, i));
    const was = P.playing || autoplay;
    if (P.mode === 'vrec' && vrec()) { if (was) playVerseFile(i); else { if (P.audio) { P.audio.onended = null; P.audio.pause(); P.audio = null; } P.v = i; markVerse(); renderPlayer(); } return; }
    if (P.mode === 'rec' && P.audio) { const rec = recFor(prefs().lang, P.b, P.c); P.v = i; P.audio.currentTime = rec.t[i] || 0; if (was) P.audio.play(); markVerse(); renderPlayer(); return; }
    P.tok++; if (SS) SS.cancel(); P.v = i; P.segs = null; P.ci = 0; markVerse();
    if (was) { P.playing = true; renderPlayer(); speakChunk(); } else renderPlayer();
    saveLast();
  }
  function saveLast() { if (P.b) B.Store.set('audio:last', { b: P.b, c: P.c, v: P.v + 1, l: prefs().lang, t: Date.now() }); }
  async function nextChapter(autoplay) {
    const bk = B.BY[P.b]; const i = B.BOOKS.indexOf(bk);
    let b = P.b, c = P.c + 1;
    if (c > bk.ch) { if (i >= B.BOOKS.length - 1) { stop(); return; } b = B.BOOKS[i + 1].c; c = 1; }
    await openChapter(b, c, 1, autoplay);
  }
  async function prevChapter() {
    const bk = B.BY[P.b]; const i = B.BOOKS.indexOf(bk);
    let b = P.b, c = P.c - 1;
    if (c < 1) { if (i <= 0) return; b = B.BOOKS[i - 1].c; c = B.BOOKS[i - 1].ch; }
    await openChapter(b, c, 1, false);
  }
  async function openChapter(b, c, v, autoplay) {
    stop(); if (P.audio) { P.audio.pause(); P.audio = null; }
    history.replaceState(null, '', '#audio-' + b + '-' + c + (v > 1 ? '-' + v : ''));
    await render(b, c, v);
    if (autoplay) play(v - 1);
  }

  /* ---------- Interfaz ---------- */
  function markVerse() {
    document.querySelectorAll('.au-v.on').forEach(e => e.classList.remove('on'));
    const el = document.getElementById('au-v' + (P.v + 1));
    if (el) { el.classList.add('on'); if (P.playing) el.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }
    updateProgress();
  }
  function updateProgress() {
    const bar = document.getElementById('au-bar'); if (!bar || !P.d) return;
    let done, total, exact = false;
    const vr = vrec();
    if (vr && vr.v.every(x => !x || x.d)) { const ds = vr.v.map(x => x ? x.d : 0); total = ds.reduce((a, b) => a + b, 0); done = ds.slice(0, P.v).reduce((a, b) => a + b, 0) + (P.mode === 'vrec' && P.audio ? P.audio.currentTime || 0 : 0); exact = true; }
    else if (P.mode === 'rec' && P.audio && isFinite(P.audio.duration)) { done = P.audio.currentTime; total = P.audio.duration; exact = true; }
    else {
      const chars = chapterChars(); const L = prefs().lang; const cps = (L === 'he' ? P.cps.he : L === 'es' ? P.cps.es : (P.cps.he + P.cps.es) / 2) * prefs().rate;
      const before = chars.slice(0, P.v).reduce((a, b) => a + b, 0);
      let inVerse = 0; if (P.segs) { for (let k = 0; k < P.ci; k++) inVerse += P.segs[k].t.length + 1; inVerse += P.bChar; }
      total = chars.reduce((a, b) => a + b, 0) / cps; done = (before + inVerse) / cps;
    }
    bar.style.width = Math.min(100, done / Math.max(1, total) * 100) + '%';
    const t = document.getElementById('au-time'); if (t) t.textContent = (exact ? '' : '≈ ') + fmt(done) + ' / ' + (exact ? '' : '≈ ') + fmt(total);
    const vn = document.getElementById('au-vn'); if (vn) vn.textContent = B.bookName(P.b) + ' ' + P.c + ':' + (P.v + 1);
  }
  setInterval(() => { if (P.playing) updateProgress(); }, 500);

  function renderWarn() {
    const el = document.getElementById('au-voicewarn'); if (!el) return;
    const pr = prefs(); const rec = pr.lang !== 'both' && recFor(pr.lang, P.b, P.c);
    const miss = [];
    if (!rec && (pr.lang === 'he' || pr.lang === 'both') && !voiceFor('he')) miss.push('he');
    if (!rec && (pr.lang === 'es' || pr.lang === 'both') && !voiceFor('es')) miss.push('es');
    el.innerHTML = !SS && !rec ? '<p class="notice">Este navegador no permite la lectura en voz alta. Prueba con Safari en iPhone o Chrome en Android.</p>' :
      miss.length ? '<p class="notice"><b>' + (miss.includes('he') ? 'Este dispositivo no tiene una voz en hebreo instalada' : 'Este dispositivo no tiene una voz en español instalada') + '.</b> No se reproducirá nada en ese idioma hasta instalarla. iPhone: Ajustes → Accesibilidad → Contenido leído → Voces → ' + (miss.includes('he') ? 'Hebreo' : 'Español') + '. Android: Ajustes → Sistema → Idioma → Texto a voz → instalar datos de voz.</p>' : '';
  }
  function renderPlayer() {
    const pr = prefs(); const btn = document.getElementById('au-play');
    if (btn) { btn.innerHTML = P.playing ? '❚❚' : '▶'; btn.setAttribute('aria-label', P.playing ? 'Pausar' : 'Reproducir'); }
    document.querySelectorAll('[data-act="au-rate"]').forEach(b => b.setAttribute('aria-pressed', +b.dataset.r === pr.rate));
    const rp = document.getElementById('au-rep'); if (rp) { rp.textContent = { none: '🔁 Sin repetir', verse: '🔂 Repetir pasuq', chapter: '🔁 Repetir capítulo' }[pr.repeat]; rp.setAttribute('aria-pressed', pr.repeat !== 'none'); }
    const sg = document.getElementById('au-single'); if (sg) { sg.textContent = pr.single ? '◉ Solo este pasuq' : '◎ Capítulo completo'; }
    const src = document.getElementById('au-src');
    if (src) { const rec = pr.lang !== 'both' && recFor(pr.lang, P.b, P.c); src.textContent = rec ? (rec.voz || 'Grabación') : 'Voz del dispositivo' + (pr.lang !== 'es' && voiceFor('he') ? ' · ' + voiceFor('he').name : pr.lang === 'es' && voiceFor('es') ? ' · ' + voiceFor('es').name : ''); }
    updateProgress();
  }

  async function render(b, c, v) {
    await recordings();
    const bk = B.BY[b]; if (!bk) return B.go('audio');
    c = Math.max(1, Math.min(bk.ch, c));
    P.b = b; P.c = c; P.v = Math.max(0, (v || 1) - 1); P.segs = null;
    B.view().innerHTML = B.top('Audio libro', { back: 'inicio' }) + '<div class="loading">Preparando el capítulo…</div>';
    P.d = await B.getBookV(b);
    const pr = prefs(); const ch = P.d.c[c - 1]; const favs = new Set((B.Store.get('favs', []) || []).map(f => f.id));
    const showHe = pr.text !== 'es' && !(bk.nt && false), showEs = pr.text !== 'he';
    const books = B.BOOKS.filter(x => x.nt === bk.nt);
    const verses = ch.map((cell, i) => {
      if (!cell[0] && !(cell[1] && cell[1] !== '^')) return '';
      const id = b + '-' + c + '-' + (i + 1);
      return '<article class="au-v" id="au-v' + (i + 1) + '" data-act="au-verse" data-i="' + i + '" tabindex="0">' +
        '<div class="au-vh"><span class="au-n">' + (i + 1) + '</span><button class="au-fav" data-act="au-fav" data-id="' + id + '" aria-label="Favorito" aria-pressed="' + favs.has(id) + '">' + (favs.has(id) ? '★' : '☆') + '</button></div>' +
        (showHe && cell[1] && cell[1] !== '^' ? '<p class="he au-he" lang="he" dir="rtl">' + esc(B.heb(cell[1])) + '</p>' : '') +
        (showEs && cell[0] && cell[0] !== '^' ? '<p class="au-es" lang="es">' + B.es(cell[0], true) + '</p>' : '') + '</article>';
    }).join('');
    B.view().innerHTML = B.top('Audio libro', { back: 'inicio', right: '<button class="icon-btn" data-act="au-voices" aria-label="Voces">🗣️</button>' }) +
      '<div class="wrap au">' +
      '<div class="au-head"><img class="sec-logo" src="' + B.LOGO + '" alt=""><p class="he" lang="he">ספר שמע</p><div class="seg" role="group" aria-label="División"><button data-act="au-div" data-nt="0" aria-pressed="' + !bk.nt + '">Tanaj</button><button data-act="au-div" data-nt="1" aria-pressed="' + !!bk.nt + '">Brit Hadashá</button></div>' +
      '<div class="au-sel"><label><span>Libro</span><select data-act="au-book" aria-label="Libro">' + books.map(x => '<option value="' + x.c + '"' + (x.c === b ? ' selected' : '') + '>' + esc(x.tr) + (x.tr !== x.es ? ' (' + esc(x.es) + ')' : '') + '</option>').join('') + '</select></label>' +
      '<label><span>Capítulo</span><select data-act="au-ch" aria-label="Capítulo">' + Array.from({ length: bk.ch }, (_, k) => '<option' + (k + 1 === c ? ' selected' : '') + '>' + (k + 1) + '</option>').join('') + '</select></label>' +
      '<label><span>Pasuq</span><select data-act="au-vsel" aria-label="Versículo">' + ch.map((_, k) => '<option value="' + k + '"' + (k === P.v ? ' selected' : '') + '>' + (k + 1) + '</option>').join('') + '</select></label></div>' +
      '<div class="au-langs"><span>Escuchar en</span><div class="seg three" role="group" aria-label="Idioma de lectura">' +
      [['es', 'Español'], ['he', 'עִבְרִית'], ['both', 'Ambos']].map(([k, l]) => '<button data-act="au-lang" data-l="' + k + '" aria-pressed="' + (pr.lang === k) + '"' + (k === 'he' ? ' lang="he"' : '') + '>' + l + '</button>').join('') + '</div>' +
      '<span>Mostrar texto</span><div class="seg three" role="group" aria-label="Texto visible">' + [['ambos', 'Ambos'], ['he', 'Hebreo'], ['es', 'Español']].map(([k, l]) => '<button data-act="au-text" data-t="' + k + '" aria-pressed="' + (pr.text === k) + '">' + l + '</button>').join('') + '</div></div>' +
      '<div id="au-voicewarn"></div>' +
      (pr.lang !== 'es' && !(pr.lang === 'he' && recFor('he', b, c)) ? '<p class="au-note">' + (bk.nt ? 'El hebreo del Brit Hadashá no tiene vocales; la voz lo lee tal como está escrito. ' : '') + 'La lectura en hebreo usa la voz del dispositivo con la pronunciación israelí moderna, a partir del texto hebreo con nikud. No es la lectura cantada con te’amim. El Nombre יהוה se lee «Adonay».</p>' : '') +
      '</div>' +
      '<h2 class="au-title">' + esc(bk.tr) + ' ' + c + '</h2>' +
      '<div class="au-verses">' + verses + '</div>' +
      '<nav class="pager"><a href="#" data-act="au-prevch"><small>Anterior</small>Capítulo anterior</a><a class="next" href="#" data-act="au-nextch"><small>Siguiente</small>Capítulo siguiente</a></nav>' +
      '</div>' +
      '<div class="au-player" role="region" aria-label="Reproductor">' +
      '<div class="au-prog" data-act="au-seek" role="slider" aria-label="Progreso del capítulo" tabindex="0"><i id="au-bar"></i></div>' +
      '<div class="au-row1"><span id="au-vn"></span><span id="au-time"></span></div>' +
      '<div class="au-ctrls"><button data-act="au-prev" aria-label="Versículo anterior">⏮</button><button id="au-play" class="au-main" data-act="au-toggle" aria-label="Reproducir">▶</button><button data-act="au-next" aria-label="Versículo siguiente">⏭</button></div>' +
      '<div class="au-row2"><div class="au-rates" role="group" aria-label="Velocidad">' + [0.75, 1, 1.25, 1.5].map(r => '<button data-act="au-rate" data-r="' + r + '">' + r + 'x</button>').join('') + '</div>' +
      '<label class="au-vol"><span aria-hidden="true">🔊</span><input type="range" min="0" max="1" step="0.1" value="' + pr.vol + '" data-act="au-vol" aria-label="Volumen de la voz"></label></div>' +
      '<div class="au-row3"><button id="au-rep" data-act="au-repeat"></button><button id="au-single" data-act="au-single"></button></div>' +
      '<p class="au-src" id="au-src"></p></div>';
    document.body.classList.add('au-on');
    renderWarn(); markVerse(); renderPlayer();
    const el = document.getElementById('au-v' + (P.v + 1)); if (el && P.v > 0) el.scrollIntoView({ block: 'center' });
  }

  async function vAudio(parts) {
    if (parts && parts[1] && B.BY[parts[1]]) return render(parts[1], +parts[2] || 1, +parts[3] || 1);
    const last = B.Store.get('audio:last', null);
    if (last && B.BY[last.b]) return render(last.b, last.c, last.v);
    return render('GEN', 1, 1);
  }

  /* ---------- Acciones ---------- */
  Object.assign(EXT.act, {
    'au-toggle': () => P.playing ? pause() : play(P.v),
    'au-prev': () => seekVerse(P.v - 1),
    'au-next': () => seekVerse(P.v + 1),
    'au-verse': (el, e) => { if (e && e.target.closest('.au-fav')) return; const i = +el.dataset.i; if (P.playing && i === P.v) return pause(); play(i); },
    'au-fav': (el) => {
      const id = el.dataset.id; let f = B.Store.get('favs', []) || []; const has = f.some(x => x.id === id);
      f = has ? f.filter(x => x.id !== id) : [{ id, type: 'v', t: Date.now() }].concat(f); B.Store.set('favs', f);
      el.textContent = has ? '☆' : '★'; el.setAttribute('aria-pressed', !has); B.toast(has ? 'Quitado de favoritos' : 'Guardado en favoritos');
    },
    'au-rate': el => { setPref('rate', +el.dataset.r); if (P.audio) P.audio.playbackRate = +el.dataset.r; renderPlayer(); if (P.playing && P.mode === 'tts') seekVerse(P.v, true); },
    'au-repeat': () => { const order = ['none', 'verse', 'chapter']; setPref('repeat', order[(order.indexOf(prefs().repeat) + 1) % 3]); renderPlayer(); },
    'au-single': () => { setPref('single', !prefs().single); renderPlayer(); },
    'au-lang': el => { const was = P.playing; stop(); if (P.audio) { P.audio.pause(); P.audio = null; } setPref('lang', el.dataset.l); render(P.b, P.c, P.v + 1).then(() => { if (was) play(P.v); }); },
    'au-text': el => { setPref('text', el.dataset.t); const was = P.playing; const v = P.v; if (was) pause(); render(P.b, P.c, v + 1).then(() => { if (was) play(v); }); },
    'au-div': el => { const nt = el.dataset.nt === '1'; const b = B.BOOKS.find(x => x.nt === nt); openChapter(b.c, 1, 1, false); },
    'au-prevch': () => prevChapter(),
    'au-nextch': () => nextChapter(false),
    'au-seek': (el, e) => {
      const r = el.getBoundingClientRect(); const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      if (P.mode === 'rec' && P.audio && isFinite(P.audio.duration)) { P.audio.currentTime = x * P.audio.duration; return; }
      const chars = chapterChars(); const tot = chars.reduce((a, b) => a + b, 0); let acc = 0, i = 0;
      for (; i < chars.length; i++) { acc += chars[i]; if (acc / tot >= x) break; }
      seekVerse(i, P.playing);
    },
    'au-voices': () => {
      const row = (l, label) => { const list = voicesFor(l); const cur = voiceFor(l); return '<h4>' + label + '</h4>' + (list.length ? list.map(v => '<button class="act" data-act="au-setvoice" data-l="' + l + '" data-n="' + esc(v.name) + '">' + (cur && cur.name === v.name ? '✓ ' : '') + esc(v.name) + ' <span class="muted" style="font-size:.8rem">' + esc(v.lang) + (isMale(v) ? ', voz masculina' : '') + (v.localService ? '' : ', requiere internet') + '</span></button>').join('') : '<p class="muted">No hay voces instaladas para este idioma.</p>'); };
      B.sheet(row('es', 'Voz en español') + row('he', 'Voz en hebreo') + (voicesFor('he').length && !voicesFor('he').some(isMale) ? '<p class="notice" style="font-size:.85rem">Este dispositivo no tiene una voz hebrea masculina identificada. Puedes probar cada voz con el botón y elegir la que prefieras.</p>' : '') + '<p class="muted" style="font-size:.85rem;margin-top:10px">Las voces dependen del teléfono. Las marcadas como «mejorada», «premium» o «natural» suenan mejor; en iPhone se descargan en Ajustes → Accesibilidad → Contenido leído → Voces.</p>');
    },
    'au-setvoice': el => {
      setPref(el.dataset.l === 'he' ? 'vHe' : 'vEs', el.dataset.n); B.closeSheet(); renderPlayer();
      if (SS) { SS.cancel(); const u = new SpeechSynthesisUtterance(el.dataset.l === 'he' ? 'בְּרֵאשִׁית בָּרָא אֱלֹהִים' : 'En el principio creó Elohim los cielos y la tierra.'); const v = voiceFor(el.dataset.l); if (v) { u.voice = v; u.lang = v.lang; } SS.speak(u); }
    }
  });
  document.addEventListener('change', e => {
    const a = e.target.dataset && e.target.dataset.act;
    if (a === 'au-book') openChapter(e.target.value, 1, 1, false);
    if (a === 'au-ch') openChapter(P.b, +e.target.value, 1, false);
    if (a === 'au-vsel') { seekVerse(+e.target.value, P.playing); }
  });
  document.addEventListener('input', e => { if (e.target.dataset && e.target.dataset.act === 'au-vol') { setPref('vol', +e.target.value); if (P.audio) P.audio.volume = +e.target.value; } });
  document.addEventListener('visibilitychange', () => { if (document.hidden && P.playing && P.mode === 'tts' && /iPhone|iPad/.test(navigator.userAgent)) { /* iOS detiene la voz en segundo plano */ } });

  const prevLeave = EXT.leave;
  EXT.leave = () => { if (prevLeave) prevLeave(); if (!/^#audio/.test(location.hash)) { if (P.playing) stop(); document.body.classList.remove('au-on'); } };
  EXT.routes.audio = vAudio; EXT.tabs.audio = 'audio';
})();
