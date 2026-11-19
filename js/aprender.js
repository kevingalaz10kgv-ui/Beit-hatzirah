/* BEIT HATZIRAH — Yo aprendo hebreo con la Torá (אֲנִי לוֹמֵד עִבְרִית עִם הַתּוֹרָה)
   Mapa de mundos, 12 juegos, XP, niveles, rachas, corazones, monedas, insignias,
   repetición espaciada, audio y conexión con la parashá. Todo se guarda en el teléfono. */
(function () {
  'use strict';
  const EXT = window.BH_EXT = { routes: {}, act: {}, tabs: {} };
  let B = null;
  EXT.init = api => { B = api; loadVoices(); };
  const esc = s => B.esc(s);
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const DAY = 864e5;
  const todayKey = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  const dayDiff = (a, b) => Math.round((new Date(b.split('-').join('/')) - new Date(a.split('-').join('/'))) / DAY);

  /* ---------- Datos ---------- */
  let DATA = null; const ITEMS = {}; const UNITS = []; const UNIT = {};
  async function data() {
    if (DATA) return DATA;
    DATA = await B.getJSON('aprender.json');
    DATA.worlds.forEach(w => w.units.forEach(u => {
      u.world = w; UNITS.push(u); UNIT[u.id] = u;
      u.items.forEach(it => { if (!ITEMS[it.id]) ITEMS[it.id] = Object.assign({ kind: u.type, w: w.id }, it); });
    }));
    return DATA;
  }

  /* ---------- Estado del estudiante (local) ---------- */
  const fresh = () => ({ lvl: null, units: {}, srs: {}, xp: 0, coins: 0, streak: { n: 0, last: null }, freeze: 0, badges: {}, st: { ok: 0, tot: 0, lessons: 0, reviews: 0, speed: 0, perfect: 0, parasha: 0 }, last: null });
  const S = () => Object.assign(fresh(), B.Store.get('learn', {}) || {});
  const save = s => B.Store.set('learn', s);
  const levelOf = xp => Math.floor(Math.sqrt(xp / 40)) + 1;
  const xpFor = l => 40 * (l - 1) * (l - 1);
  const START = { abs: 'w1', alef: 'w2', leer: 'w3', inter: 'w5', gram: 'w11' };
  const LVLS = [['abs', 'Soy principiante absoluto'], ['alef', 'Conozco el Alef Bet'], ['leer', 'Puedo leer hebreo'], ['inter', 'Tengo conocimientos intermedios'], ['gram', 'Quiero estudiar gramática avanzada']];
  function unlocked(s, u) {
    const i = UNITS.indexOf(u); if (i === 0) return true;
    const start = UNIT[UNITS.find(x => x.world.id === START[s.lvl || 'abs']).id];
    if (i <= UNITS.indexOf(start)) return true;
    const prev = UNITS[i - 1]; return !!(s.units[prev.id] && s.units[prev.id].passed);
  }
  const nextUnit = s => UNITS.find(u => unlocked(s, u) && !(s.units[u.id] && s.units[u.id].passed)) || UNITS[UNITS.length - 1];

  /* ---------- Repetición espaciada (cajas de Leitner) ---------- */
  const INTERVAL = [0, 1, 3, 7, 14, 30, 60];
  function srsUpdate(s, id, ok) {
    const r = s.srs[id] || { b: 0, due: 0, err: 0, ok: 0 };
    if (ok) { r.b = Math.min(6, r.b + 1); r.ok++; r.due = Date.now() + INTERVAL[r.b] * DAY; }
    else { r.b = 0; r.err++; r.due = Date.now() + 10 * 60 * 1000; }
    s.srs[id] = r;
  }
  const dueItems = s => Object.keys(s.srs).filter(id => ITEMS[id] && s.srs[id].due <= Date.now()).sort((a, b) => (s.srs[b].err - s.srs[a].err) || (s.srs[a].due - s.srs[b].due));

  /* ---------- Insignias ---------- */
  const BADGES = {
    first: ['🌱', 'Primer paso', 'Completa tu primera lección'],
    perfect: ['💎', 'Sin errores', 'Termina una lección sin equivocarte'],
    alefbet: ['א', 'Alef Bet', 'Aprueba todo el Mundo 1'],
    nikud: ['ָ', 'Maestro del nikud', 'Aprueba todo el Mundo 2'],
    bereshit: ['📖', 'Bereshit 1:1', 'Aprueba la lectura de Bereshit 1:1'],
    r3: ['🔥', 'Racha de 3 días', 'Estudia 3 días seguidos'],
    r7: ['🔥', 'Racha de 7 días', 'Estudia 7 días seguidos'],
    r30: ['🏆', 'Racha de 30 días', 'Estudia 30 días seguidos'],
    xp500: ['⭐', '500 XP', 'Reúne 500 puntos de experiencia'],
    xp2000: ['🌟', '2000 XP', 'Reúne 2000 puntos de experiencia'],
    repaso: ['🔁', 'Constante', 'Completa 10 repasos'],
    rapido: ['⚡', 'Veloz', 'Logra 15 aciertos en el contrarreloj'],
    parasha: ['📜', 'Hebreo de la parashá', 'Practica el vocabulario de la parashá']
  };
  function award(s, id) { if (s.badges[id]) return; s.badges[id] = Date.now(); setTimeout(() => B.toast('Insignia: ' + BADGES[id][1] + ' ' + BADGES[id][0]), 600); }
  function checkBadges(s) {
    if (s.st.lessons >= 1) award(s, 'first');
    const worldDone = w => DATA.worlds.find(x => x.id === w).units.every(u => s.units[u.id] && s.units[u.id].passed);
    if (worldDone('w1')) award(s, 'alefbet');
    if (worldDone('w2')) award(s, 'nikud');
    if (s.units.w10u1 && s.units.w10u1.passed) award(s, 'bereshit');
    if (s.streak.n >= 3) award(s, 'r3'); if (s.streak.n >= 7) award(s, 'r7'); if (s.streak.n >= 30) award(s, 'r30');
    if (s.xp >= 500) award(s, 'xp500'); if (s.xp >= 2000) award(s, 'xp2000');
    if (s.st.reviews >= 10) award(s, 'repaso');
    if (s.st.speed >= 15) award(s, 'rapido');
    if (s.st.parasha >= 1) award(s, 'parasha');
  }
  function touchStreak(s) {
    const t = todayKey(); const last = s.streak.last;
    if (last === t) return;
    if (!last) s.streak.n = 1;
    else {
      const d = dayDiff(last, t);
      if (d === 1) s.streak.n++;
      else if (d === 2 && s.freeze > 0) { s.freeze--; s.streak.n++; B.toast('Tu protector de racha salvó tu racha 🛡️'); }
      else s.streak.n = 1;
    }
    s.streak.last = t;
  }

  /* ---------- Audio (voz del dispositivo) ---------- */
  let voice = null;
  function loadVoices() {
    if (!('speechSynthesis' in window)) return;
    const pick = () => { const vs = speechSynthesis.getVoices(); voice = vs.find(v => /^(he|iw)/i.test(v.lang)) || null; };
    pick(); speechSynthesis.onvoiceschanged = pick;
  }
  const hasVoice = () => !!voice;
  function speak(text, slow) {
    if (!('speechSynthesis' in window)) { B.toast('Este navegador no tiene voz'); return; }
    if (!voice) { B.toast('Tu teléfono no tiene una voz en hebreo instalada'); return; }
    const u = new SpeechSynthesisUtterance(text.replace(/יְהוָה/g, 'אֲדֹנָי').replace(/־/g, ' '));
    u.lang = voice.lang; u.voice = voice; u.rate = slow ? 0.55 : 0.85;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  }
  const sayText = it => it.kind === 'letters' || it.kind === 'vowels' ? (it.name || it.he) : it.he;
  const audioBtns = it => '<span class="lx-audio"><button class="lx-sound" data-act="lx-say" data-id="' + it.id + '" aria-label="Escuchar">🔊</button><button class="lx-sound" data-act="lx-say" data-slow="1" data-id="' + it.id + '" aria-label="Escuchar lento">🐢</button></span>';
  EXT.act['lx-say'] = el => { const it = ITEMS[el.dataset.id]; if (it) speak(sayText(it), !!el.dataset.slow); };

  /* ---------- Sonido de acierto/error ---------- */
  let actx = null;
  function beep(ok) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain(); o.connect(g); g.connect(actx.destination);
      o.frequency.value = ok ? 880 : 220; g.gain.setValueAtTime(0.08, actx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + 0.25);
      o.start(); o.stop(actx.currentTime + 0.26);
    } catch (e) { }
  }

  /* ---------- Utilidades de juego ---------- */
  const clusters = h => h.match(/[\u05D0-\u05EA][\u0591-\u05C7]*|[^\s\u05D0-\u05EA]/g) || [];
  const plain = h => h.replace(/[\u0591-\u05C7]/g, '');
  const isGlyph = it => it.kind === 'letters' || it.kind === 'vowels' || it.kind === 'read';
  function pool(it, n, key) {
    key = key || 'es';
    const same = UNITS.find(u => u.items.some(x => x.id === it.id));
    let cands = (same ? same.items : []).concat(...(same ? same.world.units.map(u => u.items) : []));
    if (cands.length < 8) cands = cands.concat(Object.values(ITEMS).filter(x => x.kind === it.kind));
    const seen = new Set([it[key], it.he]); const out = [];
    for (const c of shuffle(cands)) { if (seen.has(c[key]) || seen.has(c.he) || !c[key]) continue; seen.add(c[key]); seen.add(c.he); out.push(ITEMS[c.id] || c); if (out.length >= n) break; }
    if (it.kind === 'letters' && UNITS.some(u => u.sim)) { // letras parecidas: usar el grupo como distractor
      const g = (UNIT.w1u8.sim || []).find(gr => gr.includes(it.id));
      if (g) g.filter(id => id !== it.id).forEach(id => { if (!out.some(o => o.id === id)) out.unshift(ITEMS[id]); });
      return out.slice(0, n);
    }
    return out;
  }
  function typesFor(it, unit) {
    switch (it.kind) {
      case 'letters': return ['letter', 'sound', 'letterRev', 'pairs', 'memory', 'listen', 'error'];
      case 'vowels': return ['letter', 'sound', 'letterRev', 'pairs', 'listen'];
      case 'read': return ['sound', 'letterRev', 'pairs', 'listen'].concat(clusters(it.he).length >= 2 ? ['missing'] : []);
      case 'words': return ['he2es', 'es2he', 'pairs', 'memory', 'error', 'listen'].concat(it.em ? ['img2he', 'he2img', 'img2he'] : []).concat(clusters(it.he).length >= 2 && clusters(it.he).length <= 7 ? ['build', 'missing'] : []);
      case 'phrases': return ['translate', 'es2he', 'order', 'listen', 'error'];
      case 'reading': return ['he2es', 'es2he', 'pairs', 'listen', 'missing'];
      case 'grammar': return ['he2es', 'es2he', 'pairs', 'error', 'memory'];
      case 'analysis': return ['he2es', 'es2he', 'pairs'];
      default: return ['he2es', 'es2he'];
    }
  }
  function makeEx(it, unit, avoid) {
    let types = typesFor(it, unit);
    if (!hasVoice()) types = types.filter(t => t !== 'listen');
    if (avoid) types = types.filter(t => !avoid.includes(t)) .concat(types.length ? [] : ['he2es']);
    const t = rnd(types.length ? types : ['he2es']);
    return { t, it };
  }

  /* ---------- Sesión ---------- */
  let SES = null;
  function startSession(opt) {
    const s = S();
    SES = Object.assign({ q: [], i: 0, ok: 0, tot: 0, hearts: opt.mode === 'lesson' ? 5 : 99, start: Date.now(), wrongIds: new Set(), xp: 0, coins: 0, requeue: 0 }, opt);
    const items = opt.items;
    if (opt.mode === 'lesson') {
      items.forEach((it, k) => { SES.q.push({ t: 'intro', it }); if (k % 2 === 1) { SES.q.push(makeEx(items[k - 1])); SES.q.push(makeEx(it)); } });
      const n = Math.max(6, 12 - Math.ceil(items.length / 2) * 2);
      for (let k = 0; k < n; k++) SES.q.push(makeEx(items[k % items.length]));
      if (opt.unit && opt.unit.verse) SES.q.push({ t: 'orderVerse', it: items[0] });
    } else if (opt.mode === 'exam') {
      const base = shuffle(items); for (let k = 0; k < 10; k++) SES.q.push(makeEx(base[k % base.length]));
      if (opt.unit && opt.unit.verse) SES.q.push({ t: 'orderVerse', it: items[0] });
    } else if (opt.mode === 'speed') {
      SES.deadline = Date.now() + 60000; SES.q = shuffle(items).slice(0, 60).map(it => ({ t: 'he2es', it }));
    } else if (opt.mode === 'placement') {
      SES.q = opt.q;
    } else {
      items.forEach(it => SES.q.push(makeEx(it)));
      if (opt.mode === 'parasha') { SES.q = items.map(it => ({ t: 'intro', it })).concat(shuffle(items).map(it => makeEx(it)), shuffle(items).map(it => makeEx(it, null, ['pairs', 'memory']))); }
    }
    SES.total = SES.q.length;
    document.body.classList.add('in-lesson');
    renderEx();
  }
  function header() {
    const p = Math.min(100, Math.round(SES.i / SES.q.length * 100));
    const el = Math.floor((Date.now() - SES.start) / 1000);
    const time = SES.mode === 'speed' ? Math.max(0, Math.ceil((SES.deadline - Date.now()) / 1000)) + ' s' : Math.floor(el / 60) + ':' + String(el % 60).padStart(2, '0');
    return '<div class="lx-top"><button class="icon-btn" data-act="lx-quit" aria-label="Salir de la lección">✕</button>' +
      '<div class="lx-bar" role="progressbar" aria-valuenow="' + p + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + p + '%;background:' + SES.color + '"></i></div>' +
      (SES.mode === 'lesson' ? '<span class="lx-hearts" aria-label="Corazones">❤️ ' + SES.hearts + '</span>' : '') +
      '<span class="lx-time" id="lx-time" aria-label="Tiempo">⏱ ' + time + '</span></div>';
  }
  let tick = null;
  function startTick() {
    clearInterval(tick);
    tick = setInterval(() => {
      if (!SES || !document.getElementById('lx-time')) { clearInterval(tick); return; }
      const el = Math.floor((Date.now() - SES.start) / 1000);
      if (SES.mode === 'speed') {
        const left = Math.max(0, Math.ceil((SES.deadline - Date.now()) / 1000));
        document.getElementById('lx-time').textContent = '⏱ ' + left + ' s';
        if (left <= 0) { clearInterval(tick); finish(); }
      } else document.getElementById('lx-time').textContent = '⏱ ' + Math.floor(el / 60) + ':' + String(el % 60).padStart(2, '0');
    }, 500);
  }
  const he = (h, cls) => '<span class="he ' + (cls || '') + '" lang="he" dir="rtl">' + esc(h) + '</span>';
  function optBtns(opts, label) {
    return '<div class="lx-opts' + (opts.length > 3 ? ' grid' : '') + '">' + opts.map((o, k) => '<button class="lx-opt" data-act="lx-pick" data-k="' + k + '">' + label(o) + '</button>').join('') + '</div>';
  }
  function setChoice(ex, correct, opts) { ex.opts = opts; ex.correct = opts.indexOf(correct); }

  function renderEx() {
    if (!SES) return;
    if (SES.mode === 'speed' && Date.now() > SES.deadline) return finish();
    if (SES.i >= SES.q.length) return finish();
    const ex = SES.q[SES.i]; const it = ex.it; let body = '';
    const sub = it.tr ? '<span class="lx-tr">' + esc(it.tr) + '</span>' : '';
    switch (ex.t) {
      case 'intro': {
        const isG = isGlyph(it);
        body = '<p class="lx-kicker">Nueva ' + (it.kind === 'letters' ? 'letra' : it.kind === 'vowels' ? 'vocal' : it.kind === 'phrases' ? 'frase' : 'palabra') + '</p>' +
          '<div class="lx-card intro">' + (it.em ? '<div class="lx-emoji" aria-hidden="true">' + it.em + '</div>' : '') +
          he(it.he, isG ? 'lx-glyph' : (it.kind === 'phrases' ? 'lx-phrase' : 'lx-word')) +
          '<div class="lx-tr">' + esc(it.tr || '') + (it.name && it.kind !== 'read' ? ' · ' + he(it.name, 'lx-name') : '') + '</div>' +
          '<div class="lx-es">' + esc(it.kind === 'letters' ? 'Sonido: ' + it.es : it.kind === 'vowels' ? 'Sonido: ' + it.es : it.es) + '</div>' + audioBtns(it) +
          (it.ref ? '<a class="lx-ref" href="#' + B.refRoute(it.ref) + '" data-act="lx-ref">Aparece en ' + esc(B.refLabel(it.ref)) + '</a>' : '') + '</div>' +
          '<button class="btn solid lx-next" data-act="lx-next">Entendido</button>';
        if (hasVoice()) setTimeout(() => speak(sayText(it)), 250);
        break;
      }
      case 'letter': case 'sound': case 'he2es': case 'translate': {
        const key = ex.t === 'letter' ? 'tr' : 'es';
        const opts = shuffle([it].concat(pool(it, 3, key)));
        setChoice(ex, it, opts);
        const q = ex.t === 'letter' ? '¿Cómo se llama esta letra?' : ex.t === 'sound' ? (it.kind === 'read' ? '¿Cómo se lee?' : '¿Qué sonido tiene?') : ex.t === 'translate' ? '¿Qué significa esta frase?' : '¿Qué significa?';
        body = '<p class="lx-q">' + q + '</p><div class="lx-card">' + he(it.he, isGlyph(it) ? 'lx-glyph' : (it.kind === 'phrases' ? 'lx-phrase' : 'lx-word')) + (hasVoice() && !isGlyph(it) ? audioBtns(it) : '') + '</div>' +
          optBtns(opts, o => esc(o[key]));
        break;
      }
      case 'letterRev': case 'es2he': {
        const opts = shuffle([it].concat(pool(it, 3)));
        setChoice(ex, it, opts);
        const prompt = it.kind === 'letters' ? it.tr : it.kind === 'vowels' ? it.tr + ' (' + it.es + ')' : it.es;
        body = '<p class="lx-q">' + (isGlyph(it) ? 'Elige: ' : 'Elige en hebreo: ') + '<b>' + esc(prompt) + '</b></p>' + optBtns(opts, o => he(o.he, isGlyph(o) ? 'lx-glyph-s' : 'lx-opt-he'));
        break;
      }
      case 'img2he': {
        const opts = shuffle([it].concat(pool(it, 2)));
        setChoice(ex, it, opts);
        body = '<p class="lx-q">¿Qué palabra corresponde a la imagen?</p><div class="lx-card"><div class="lx-emoji big" role="img" aria-label="' + esc(it.es) + '">' + it.em + '</div></div>' +
          optBtns(opts, o => he(o.he, 'lx-opt-he') + '<small>' + esc(o.tr) + '</small>');
        break;
      }
      case 'he2img': {
        const ds = pool(it, 3).filter(o => o.em);
        const opts = shuffle([it].concat(ds).slice(0, 4));
        setChoice(ex, it, opts);
        body = '<p class="lx-q">Toca la imagen correcta</p><div class="lx-card">' + he(it.he, 'lx-word') + sub + (hasVoice() ? audioBtns(it) : '') + '</div>' +
          '<div class="lx-opts grid imgs">' + opts.map((o, k) => '<button class="lx-opt img" data-act="lx-pick" data-k="' + k + '" aria-label="' + esc(o.es) + '">' + o.em + '</button>').join('') + '</div>';
        break;
      }
      case 'listen': {
        const opts = shuffle([it].concat(pool(it, 3)));
        setChoice(ex, it, opts);
        body = '<p class="lx-q">Escucha y elige</p><div class="lx-card"><button class="lx-play" data-act="lx-say" data-id="' + it.id + '" aria-label="Escuchar">🔊</button><button class="lx-sound" data-act="lx-say" data-slow="1" data-id="' + it.id + '" aria-label="Escuchar lento">🐢 lento</button></div>' +
          optBtns(opts, o => he(o.he, isGlyph(o) ? 'lx-glyph-s' : 'lx-opt-he'));
        setTimeout(() => speak(sayText(it)), 300);
        break;
      }
      case 'missing': {
        const cl = clusters(it.he); const letterIdx = cl.map((c, k) => /[\u05D0-\u05EA]/.test(c) ? k : -1).filter(k => k >= 0);
        const k = rnd(letterIdx); const ans = cl[k];
        const others = shuffle(Object.values(ITEMS).flatMap(x => clusters(x.he)).filter(c => /[\u05D0-\u05EA]/.test(c) && plain(c) !== plain(ans))).filter((c, i, a) => a.indexOf(c) === i).slice(0, 3);
        const opts = shuffle([ans].concat(others));
        ex.opts = opts; ex.correct = opts.indexOf(ans);
        body = '<p class="lx-q">Completa: <b>' + esc(it.es) + '</b></p><div class="lx-card">' + he(cl.map((c, j) => j === k ? '◌' : c).join(''), 'lx-word') + sub + '</div>' +
          optBtns(opts, o => he(o, 'lx-glyph-s'));
        break;
      }
      case 'build': {
        const cl = clusters(it.he); ex.target = cl; ex.built = [];
        ex.tiles = shuffle(cl.map((c, k) => ({ c, k })));
        body = '<p class="lx-q">Forma la palabra: <b>' + esc(it.es) + '</b>' + (it.em ? ' ' + it.em : '') + '</p>' +
          '<div class="lx-slot he" dir="rtl" id="lx-slot" aria-live="polite"></div><p class="lx-hint">Toca o arrastra las letras en orden (de derecha a izquierda).</p>' +
          '<div class="lx-tiles" id="lx-tiles" dir="rtl">' + ex.tiles.map((t, j) => '<button class="lx-tile he" data-act="lx-tile" data-j="' + j + '">' + esc(t.c) + '</button>').join('') + '</div>';
        break;
      }
      case 'order': case 'orderVerse': {
        const unit = SES.unit;
        const words = ex.t === 'orderVerse' ? unit.verse : it.words;
        ex.target = words; ex.built = [];
        ex.tiles = shuffle(words.map((c, k) => ({ c, k })));
        const prompt = ex.t === 'orderVerse' ? 'Ordena ' + B.refLabel(unit.ref) : esc(it.es);
        body = '<p class="lx-q">' + (ex.t === 'orderVerse' ? '' : 'Ordena la frase: ') + '<b>' + prompt + '</b></p>' +
          '<div class="lx-slot he" dir="rtl" id="lx-slot" aria-live="polite"></div><p class="lx-hint">Toca o arrastra las palabras en orden (de derecha a izquierda).</p>' +
          '<div class="lx-tiles words" id="lx-tiles" dir="rtl">' + ex.tiles.map((t, j) => '<button class="lx-tile he" data-act="lx-tile" data-j="' + j + '">' + esc(t.c) + '</button>').join('') + '</div>';
        break;
      }
      case 'pairs': case 'memory': {
        const group = [it].concat(pool(it, ex.t === 'memory' ? 2 : 3));
        ex.group = group; ex.matched = 0; ex.sel = null; ex.miss = 0;
        const right = o => o.kind === 'letters' || o.kind === 'vowels' ? o.tr : (o.em && ex.t === 'memory' ? o.em : o.es);
        if (ex.t === 'pairs') {
          const L = shuffle(group), R = shuffle(group);
          body = '<p class="lx-q">Relaciona las parejas</p><div class="lx-pairs"><div>' + L.map(o => '<button class="lx-pc" data-act="lx-pair" data-side="h" data-id="' + o.id + '">' + he(o.he, isGlyph(o) ? 'lx-glyph-s' : 'lx-opt-he') + '</button>').join('') + '</div><div>' +
            R.map(o => '<button class="lx-pc" data-act="lx-pair" data-side="e" data-id="' + o.id + '">' + esc(right(o)) + '</button>').join('') + '</div></div>';
        } else {
          const cards = shuffle(group.flatMap(o => [{ id: o.id, side: 'h', f: he(o.he, isGlyph(o) ? 'lx-glyph-s' : 'lx-opt-he') }, { id: o.id, side: 'e', f: esc(right(o)) }]));
          body = '<p class="lx-q">Memoria: encuentra las parejas</p><div class="lx-mem">' + cards.map(c => '<button class="lx-mc" data-act="lx-mem" data-side="' + c.side + '" data-id="' + c.id + '" aria-label="Carta oculta"><span class="back">?</span><span class="face">' + c.f + '</span></button>').join('') + '</div>';
        }
        break;
      }
      case 'error': {
        const group = [it].concat(pool(it, 3)); const wrongIdx = Math.floor(Math.random() * group.length);
        const rightOf = o => o.kind === 'letters' ? o.tr : o.es;
        const shownR = group.map(rightOf);
        const swapWith = (wrongIdx + 1) % group.length;
        shownR[wrongIdx] = rightOf(group[swapWith]);
        ex.opts = group; ex.correct = wrongIdx; ex.isError = true;
        body = '<p class="lx-q">Detecta el error: ¿cuál pareja está mal?</p><div class="lx-opts">' + group.map((o, k) => '<button class="lx-opt row" data-act="lx-pick" data-k="' + k + '">' + he(o.he, isGlyph(o) ? 'lx-glyph-s' : 'lx-opt-he') + '<span>= ' + esc(shownR[k]) + '</span></button>').join('') + '</div>';
        ex.fix = he(group[wrongIdx].he, 'lx-opt-he') + ' = ' + esc(rightOf(group[wrongIdx]));
        break;
      }
    }
    B.view().innerHTML = '<div class="lx" style="--wc:' + SES.color + '">' + header() + '<div class="lx-body">' + body + '</div><div id="lx-fb"></div></div>';
    if (ex.t === 'build' || ex.t === 'order' || ex.t === 'orderVerse') enableDrag(ex);
    startTick();
  }

  /* ---------- Respuestas ---------- */
  function answer(ok, fixHTML) {
    const ex = SES.q[SES.i]; const s = S();
    if (ex.t !== 'intro' && ex.t !== 'orderVerse') srsUpdate(s, ex.it.id, ok);
    if (ex.t === 'orderVerse') (SES.unit.items || []).forEach(x => srsUpdate(s, x.id, ok));
    SES.tot++; s.st.tot++;
    if (ok) { SES.ok++; s.st.ok++; SES.xp += SES.mode === 'review' ? 5 : 10; SES.coins += 1; }
    else {
      SES.wrongIds.add(ex.it.id);
      if (SES.mode === 'lesson') SES.hearts--;
      if ((SES.mode === 'lesson' || SES.mode === 'review' || SES.mode === 'parasha') && SES.requeue < 4) { SES.q.push(makeEx(ex.it, null, [ex.t])); SES.requeue++; }
    }
    save(s); beep(ok);
    const fb = document.getElementById('lx-fb');
    document.querySelectorAll('.lx-opt,.lx-tile,.lx-pc,.lx-mc').forEach(b => b.disabled = true);
    if (ok) {
      fb.innerHTML = '<div class="lx-fb ok" role="status">¡Correcto! ✓</div>';
      setTimeout(next, SES.mode === 'speed' ? 250 : 750);
    } else {
      const it = ex.it;
      fb.innerHTML = '<div class="lx-fb bad" role="status"><b>Respuesta correcta:</b><div>' + (fixHTML || (he(it.he, 'lx-opt-he') + ' <span>' + esc(it.tr || '') + '</span> = ' + esc(it.kind === 'letters' ? it.tr + ' (' + it.es + ')' : it.es))) + '</div>' +
        (SES.mode === 'speed' ? '' : '<button class="btn solid" data-act="lx-next">Continuar</button>') + '</div>';
      if (SES.mode === 'speed') setTimeout(next, 900);
      if (SES.mode === 'lesson' && SES.hearts <= 0) { fb.innerHTML += ''; setTimeout(outOfHearts, 900); }
    }
  }
  function next() { if (!SES) return; SES.i++; renderEx(); }
  function outOfHearts() {
    const s = S();
    B.view().innerHTML = '<div class="lx" style="--wc:' + SES.color + '">' + header() + '<div class="lx-body center"><div class="lx-emoji big">💔</div><h2>Te quedaste sin corazones</h2><p class="muted">Repasa con calma: los errores también enseñan. Puedes seguir usando 10 monedas o repetir la lección gratis.</p>' +
      '<div class="btns" style="justify-content:center">' + (s.coins >= 10 ? '<button class="btn solid" data-act="lx-buyheart">Seguir (10 🪙, tienes ' + s.coins + ')</button>' : '') + '<button class="btn" data-act="lx-retry">Repetir la lección</button></div></div></div>';
  }
  EXT.act['lx-buyheart'] = () => { const s = S(); if (s.coins < 10) return; s.coins -= 10; save(s); SES.hearts = 2; next(); };
  EXT.act['lx-retry'] = () => { const o = SES; SES = null; startSession({ mode: o.mode, items: o.items, unit: o.unit, color: o.color, title: o.title }); };
  EXT.act['lx-next'] = () => next();
  EXT.act['lx-ref'] = () => { SES = null; document.body.classList.remove('in-lesson'); };
  EXT.act['lx-quit'] = () => {
    if (SES && SES.mode !== 'speed' && SES.i > 0 && !confirm('¿Salir de la lección? Lo que respondiste ya quedó guardado en tu repaso.')) return;
    const back = SES && SES.unit ? 'aprender' : 'aprender'; SES = null; clearInterval(tick); document.body.classList.remove('in-lesson'); B.go(back);
  };
  EXT.act['lx-pick'] = el => {
    const ex = SES.q[SES.i]; const k = +el.dataset.k; const ok = k === ex.correct;
    el.classList.add(ok ? 'right' : 'wrong');
    const btns = document.querySelectorAll('.lx-opt'); if (!ok && btns[ex.correct]) btns[ex.correct].classList.add(ex.isError ? 'wrong-pair' : 'right');
    answer(ok, ex.isError ? (ok ? null : 'La pareja equivocada era: ' + ex.fix) : null);
  };
  function placeTile(ex, j) {
    const tile = ex.tiles[j]; if (!tile || tile.used) return;
    tile.used = true; ex.built.push(j);
    const b = document.querySelector('.lx-tile[data-j="' + j + '"]'); if (b) b.classList.add('used');
    document.getElementById('lx-slot').innerHTML = ex.built.map(x => '<button class="lx-placed" data-act="lx-unplace" data-j="' + x + '">' + esc(ex.tiles[x].c) + '</button>').join(ex.t === 'build' ? '' : ' ');
    if (ex.built.length === ex.target.length) {
      const got = ex.built.map(x => ex.tiles[x].c); const ok = got.join('|') === ex.target.join('|');
      document.getElementById('lx-slot').classList.add(ok ? 'right' : 'wrong');
      const it = ex.it;
      answer(ok, ex.t === 'orderVerse' ? he(ex.target.join(' '), 'lx-opt-he') + ' <small>' + esc(B.refLabel(SES.unit.ref)) + '</small>' : ex.t === 'order' ? he(it.he, 'lx-opt-he') + ' = ' + esc(it.es) : null);
    }
  }
  EXT.act['lx-tile'] = el => { if (el._dragged) { el._dragged = false; return; } placeTile(SES.q[SES.i], +el.dataset.j); };
  EXT.act['lx-unplace'] = el => {
    const ex = SES.q[SES.i]; const j = +el.dataset.j; if (ex.built.length === ex.target.length) return;
    ex.built = ex.built.filter(x => x !== j); ex.tiles[j].used = false;
    const b = document.querySelector('.lx-tile[data-j="' + j + '"]'); if (b) b.classList.remove('used');
    document.getElementById('lx-slot').innerHTML = ex.built.map(x => '<button class="lx-placed" data-act="lx-unplace" data-j="' + x + '">' + esc(ex.tiles[x].c) + '</button>').join(ex.t === 'build' ? '' : ' ');
  };
  function enableDrag(ex) {
    const slot = document.getElementById('lx-slot');
    document.querySelectorAll('.lx-tile').forEach(t => {
      t.addEventListener('pointerdown', e => {
        if (t.classList.contains('used')) return;
        const sx = e.clientX, sy = e.clientY; let ghost = null;
        const move = ev => {
          if (!ghost && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 8) {
            ghost = t.cloneNode(true); ghost.classList.add('lx-ghost'); document.body.appendChild(ghost); t._dragged = true;
          }
          if (ghost) { ghost.style.left = ev.clientX + 'px'; ghost.style.top = ev.clientY + 'px'; const r = slot.getBoundingClientRect(); slot.classList.toggle('over', ev.clientX > r.left && ev.clientX < r.right && ev.clientY > r.top - 20 && ev.clientY < r.bottom + 20); }
        };
        const up = ev => {
          window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
          if (ghost) {
            ghost.remove(); slot.classList.remove('over');
            const r = slot.getBoundingClientRect();
            if (ev.clientX > r.left && ev.clientX < r.right && ev.clientY > r.top - 20 && ev.clientY < r.bottom + 20) placeTile(ex, +t.dataset.j);
            setTimeout(() => { t._dragged = false; }, 50);
          }
        };
        window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
      });
    });
  }
  EXT.act['lx-pair'] = el => {
    const ex = SES.q[SES.i]; if (el.classList.contains('done')) return;
    if (!ex.sel || ex.sel.dataset.side === el.dataset.side) { if (ex.sel) ex.sel.classList.remove('sel'); ex.sel = el; el.classList.add('sel'); return; }
    const a = ex.sel; ex.sel = null; a.classList.remove('sel');
    if (a.dataset.id === el.dataset.id) {
      a.classList.add('done'); el.classList.add('done'); ex.matched++; beep(true);
      if (ex.matched === ex.group.length) { const s = S(); ex.group.forEach(o => srsUpdate(s, o.id, !ex.missIds || !ex.missIds.has(o.id))); save(s); answer(ex.miss === 0); }
    } else {
      ex.miss++; (ex.missIds = ex.missIds || new Set()).add(a.dataset.id); beep(false);
      [a, el].forEach(x => { x.classList.add('wrong'); setTimeout(() => x.classList.remove('wrong'), 500); });
    }
  };
  EXT.act['lx-mem'] = el => {
    const ex = SES.q[SES.i]; if (el.classList.contains('open') || el.classList.contains('done') || ex.lock) return;
    el.classList.add('open');
    if (!ex.sel) { ex.sel = el; return; }
    const a = ex.sel; ex.sel = null;
    if (a.dataset.id === el.dataset.id && a.dataset.side !== el.dataset.side) {
      a.classList.add('done'); el.classList.add('done'); ex.matched++; beep(true);
      if (ex.matched === ex.group.length) answer(ex.miss <= ex.group.length);
    } else { ex.miss++; ex.lock = true; setTimeout(() => { a.classList.remove('open'); el.classList.remove('open'); ex.lock = false; }, 800); }
  };

  /* ---------- Fin de la sesión ---------- */
  function finish() {
    clearInterval(tick);
    const s = S(); const o = SES; if (!o) return;
    const pct = o.tot ? Math.round(o.ok / o.tot * 100) : 100;
    let msg = '', extra = '';
    if (o.mode === 'lesson') {
      s.st.lessons++; const u = s.units[o.unit.id] = s.units[o.unit.id] || {}; u.learned = true;
      if (o.wrongIds.size === 0) { s.st.perfect++; award(s, 'perfect'); o.xp += 20; }
      msg = 'Lección completada'; s.last = o.unit.id;
    } else if (o.mode === 'exam') {
      const u = s.units[o.unit.id] = s.units[o.unit.id] || {};
      u.best = Math.max(u.best || 0, pct);
      if (pct >= 80) { u.passed = true; u.learned = true; o.xp += 50; o.coins += 10; msg = '¡Examen aprobado!'; const nx = UNITS[UNITS.indexOf(o.unit) + 1]; if (nx) extra = '<p>Se desbloqueó: <b>' + esc(nx.name) + '</b></p>'; }
      else msg = 'Necesitas 80 % para aprobar';
    } else if (o.mode === 'review') { s.st.reviews++; msg = 'Repaso completado'; }
    else if (o.mode === 'speed') { s.st.speed = Math.max(s.st.speed, o.ok); msg = 'Contrarreloj: ' + o.ok + ' aciertos'; extra = '<p class="muted">Tu mejor marca: ' + s.st.speed + '</p>'; }
    else if (o.mode === 'parasha') { s.st.parasha++; msg = 'Vocabulario de la parashá practicado'; }
    else if (o.mode === 'placement') {
      const tiers = ['abs', 'alef', 'leer', 'inter', 'gram']; let lvl = 'abs';
      for (let k = 0; k < 4; k++) { const qs = o.q.filter(x => x.tier === k); const okk = qs.filter(x => x.ok).length; if (okk >= qs.length - 0) lvl = tiers[k + 1]; else break; }
      s.lvl = lvl; save(s); SES = null; document.body.classList.remove('in-lesson');
      B.view().innerHTML = '<div class="lx" style="--wc:#C6A15B"><div class="lx-body center"><div class="lx-emoji big">🎯</div><h2>Tu punto de partida</h2><p>' + esc(LVLS.find(x => x[0] === lvl)[1]) + '</p><p class="muted">Aciertos: ' + o.ok + ' de ' + o.tot + '. Puedes repasar cualquier unidad anterior cuando quieras.</p><a class="btn solid" href="#aprender">Ir al mapa</a></div></div>';
      return;
    }
    s.xp += o.xp; s.coins += o.coins; touchStreak(s); checkBadges(s); save(s);
    SES = null; document.body.classList.remove('in-lesson');
    const lv = levelOf(s.xp);
    const words = o.items ? o.items.filter(x => x.ref).slice(0, 4) : [];
    B.view().innerHTML = '<div class="lx" style="--wc:' + o.color + '"><div class="lx-body center">' +
      '<div class="lx-emoji big">' + (pct >= 80 ? '🎉' : '💪') + '</div><h2>' + esc(msg) + '</h2>' + extra +
      '<div class="lx-stats"><div><b>' + pct + '%</b><span>aciertos</span></div><div><b>+' + o.xp + '</b><span>XP</span></div><div><b>+' + o.coins + '</b><span>monedas</span></div><div><b>🔥 ' + s.streak.n + '</b><span>racha</span></div></div>' +
      '<p class="muted">Nivel ' + lv + '. Tiempo: ' + Math.round((Date.now() - o.start) / 1000) + ' s</p>' +
      (words.length ? '<div class="lx-torah"><p><b>En la Torá</b></p>' + words.map(w => '<a href="#' + B.refRoute(w.ref) + '">' + he(w.he, 'lx-opt-he') + ' ' + esc(B.refLabel(w.ref)) + '</a>').join('') + '</div>' : '') +
      '<div class="btns" style="justify-content:center">' +
      (o.mode === 'lesson' ? '<a class="btn solid" href="#leccion-' + o.unit.id + '-e">Hacer el examen</a>' : '') +
      (o.mode === 'exam' && pct < 80 ? '<a class="btn solid" href="#leccion-' + o.unit.id + '-l">Repetir la lección</a>' : '') +
      '<a class="btn' + (o.mode === 'lesson' ? '' : ' solid') + '" href="#aprender">Volver al mapa</a></div></div></div>';
  }

  /* ============ PANTALLAS ============ */
  function stats(s) {
    const lv = levelOf(s.xp); const due = dueItems(s).length;
    return '<div class="lx-chips"><span title="Racha">🔥 ' + s.streak.n + '</span><span title="Nivel">⭐ Nivel ' + lv + '</span><span title="Monedas">🪙 ' + s.coins + '</span><a href="#mis-palabras" title="Por repasar">🔁 ' + due + '</a></div>';
  }
  async function vAprender() {
    await data(); const s = S();
    if (!s.lvl) return vNivel();
    const nx = nextUnit(s); const due = dueItems(s).length;
    let map = '';
    DATA.worlds.forEach(w => {
      const done = w.units.filter(u => s.units[u.id] && s.units[u.id].passed).length;
      map += '<section class="lx-world" style="--wc:' + w.color + '"><div class="lx-wh"><span class="lx-wicon" aria-hidden="true">' + esc(w.icon) + '</span><div><b>Mundo ' + w.n + ': ' + esc(w.name) + '</b><span>' + done + ' de ' + w.units.length + ' unidades</span></div>' + he(w.he, 'lx-whe') + '</div><div class="lx-path">';
      w.units.forEach((u, k) => {
        const st = s.units[u.id] || {}; const open = unlocked(s, u);
        const cls = st.passed ? 'passed' : st.learned ? 'learned' : open ? 'open' : 'locked';
        map += '<button class="lx-node ' + cls + (u === nx ? ' current' : '') + '" style="--off:' + ([0, 40, 60, 40, 0, -40, -60, -40][k % 8]) + 'px" data-act="lx-unit" data-u="' + u.id + '" aria-label="' + esc(u.name) + (open ? '' : ' (bloqueada)') + '"><span class="dot">' + (st.passed ? '★' : open ? (k + 1) : '🔒') + '</span><span class="lbl">' + esc(u.name) + '</span></button>';
      });
      map += '</div></section>';
    });
    B.view().innerHTML = B.top('Aprender hebreo', { right: '<a class="icon-btn" href="#perfil-hebreo" aria-label="Mi perfil">👤</a>' }) +
      '<div class="wrap lx-home"><div class="lx-hero"><p class="he" lang="he">אֲנִי לוֹמֵד עִבְרִית עִם הַתּוֹרָה</p><h2>Yo aprendo hebreo con la Torá</h2>' + stats(s) + '</div>' +
      '<div class="lx-actions"><button class="lx-big" data-act="lx-unit" data-u="' + nx.id + '" style="--wc:' + nx.world.color + '"><span>Continuar</span><b>' + esc(nx.name) + '</b><small>Mundo ' + nx.world.n + '. 3 a 5 minutos</small></button>' +
      '<div class="lx-mini"><a href="#repaso" class="' + (due ? 'hot' : '') + '">🔁<b>Repasar</b><span>' + due + ' por repasar</span></a><a href="#parasha-hebreo">📜<b>Hebreo de la parashá</b><span>Vocabulario de esta semana</span></a><a href="#contrarreloj">⚡<b>Contrarreloj</b><span>60 segundos</span></a><a href="#mis-palabras">🗂️<b>Mis palabras</b><span>Dominio y próximo repaso</span></a></div></div>' +
      (hasVoice() ? '' : '<p class="notice">Este teléfono no tiene una voz en hebreo instalada, así que los ejercicios de escuchar están ocultos. En iPhone: Ajustes → Accesibilidad → Contenido leído → Voces → Hebreo. En Android: Ajustes → Texto a voz → instala el idioma hebreo.</p>') +
      map + '<p class="muted" style="font-size:.82rem;margin:20px 0">Las palabras se presentan en hebreo bíblico, con vocales. La voz es sintética, del propio teléfono, y usa la pronunciación israelí moderna; no es una grabación del hebreo antiguo.</p></div>';
  }
  EXT.act['lx-unit'] = async el => {
    await data(); const s = S(); const u = UNIT[el.dataset.u]; const st = s.units[u.id] || {};
    if (!unlocked(s, u)) { B.sheet('<h4>' + esc(u.name) + '</h4><p>🔒 Aprueba el examen de la unidad anterior para desbloquear esta unidad.</p>'); return; }
    B.sheet('<div style="--wc:' + u.world.color + '"><p class="muted" style="margin:0">Mundo ' + u.world.n + ': ' + esc(u.world.name) + '</p><h4 style="font-size:1.2rem;margin:4px 0 8px">' + esc(u.name) + '</h4>' +
      (u.intro ? '<p style="font-size:.95rem">' + esc(u.intro) + '</p>' : '') +
      '<div class="lx-preview">' + u.items.slice(0, 8).map(it => he(it.he, isGlyph(it) ? 'lx-glyph-s' : 'lx-opt-he')).join('') + '</div>' +
      '<p class="muted" style="font-size:.88rem">' + (st.passed ? 'Aprobada ★ (mejor nota ' + (st.best || 0) + '%)' : st.learned ? 'Lección hecha. Falta el examen.' : 'Unidad nueva') + '</p>' +
      '<a class="act" href="#leccion-' + u.id + '-l">▶️ <span><b>Lección</b><br><span class="muted" style="font-size:.86rem">3 a 5 minutos, con presentación de cada elemento</span></span></a>' +
      '<a class="act" href="#leccion-' + u.id + '-e">📝 <span><b>Examen</b><br><span class="muted" style="font-size:.86rem">Aprueba con 80 % para desbloquear la siguiente unidad</span></span></a></div>');
  };
  async function vLeccion(parts) {
    await data(); const u = UNIT[parts[1]]; if (!u) return B.go('aprender');
    const s = S(); if (!unlocked(s, u)) return B.go('aprender');
    const items = u.items.map(it => ITEMS[it.id]);
    startSession({ mode: parts[2] === 'e' ? 'exam' : 'lesson', items, unit: u, color: u.world.color, title: u.name });
  }
  async function vRepaso() {
    await data(); const s = S(); const ids = dueItems(s).slice(0, 12);
    if (!ids.length) {
      B.view().innerHTML = B.top('Repasar', { back: 'aprender' }) + '<div class="wrap empty"><div class="lx-emoji big">✅</div><p>No tienes palabras pendientes de repaso. Las palabras que estudies volverán aquí cuando toque repasarlas, y las que te cuesten aparecerán antes.</p><a class="btn" href="#aprender">Volver al mapa</a></div>';
      return;
    }
    startSession({ mode: 'review', items: ids.map(id => ITEMS[id]), color: '#C6A15B', title: 'Repaso' });
  }
  async function vContrarreloj() {
    await data(); const s = S();
    const known = Object.keys(s.srs).map(id => ITEMS[id]).filter(x => x && !isGlyph(x) && x.kind !== 'phrases');
    const items = known.length >= 8 ? known : UNITS.filter(u => u.type === 'words').slice(0, 4).flatMap(u => u.items.map(i => ITEMS[i.id]));
    B.view().innerHTML = B.top('Contrarreloj', { back: 'aprender' }) + '<div class="wrap center" style="padding-top:40px"><div class="lx-emoji big">⚡</div><h2>Desafío contrarreloj</h2><p>Responde todas las preguntas que puedas en 60 segundos.</p><p class="muted">Tu mejor marca: ' + s.st.speed + ' aciertos.' + (known.length < 8 ? ' Como todavía has estudiado pocas palabras, se usan las del Mundo 3 y 4.' : '') + '</p><button class="btn solid" data-act="lx-speed">Comenzar</button></div>';
    EXT._speedItems = items;
  }
  EXT.act['lx-speed'] = () => startSession({ mode: 'speed', items: EXT._speedItems, color: '#F2A541', title: 'Contrarreloj' });

  /* ----- Nivel inicial y prueba ----- */
  async function vNivel() {
    await data(); const s = S();
    B.view().innerHTML = B.top('Aprender hebreo', { back: 'aprender' }) + '<div class="wrap"><div class="lx-hero"><p class="he" lang="he">אֲנִי לוֹמֵד עִבְרִית עִם הַתּוֹרָה</p><h2>¿Cuánto hebreo sabes?</h2><p class="muted">Elige tu punto de partida. Siempre podrás repasar las unidades anteriores.</p></div><div class="rows">' +
      LVLS.map(([k, l]) => '<button class="row" data-act="lx-setlvl" data-l="' + k + '"><span class="t"><b>' + esc(l) + '</b><span>Empiezas en el Mundo ' + START[k].slice(1) + ': ' + esc(DATA.worlds.find(w => w.id === START[k]).name) + '</span></span>' + (s.lvl === k ? '<span class="pill ok">Actual</span>' : '') + '</button>').join('') +
      '</div><div class="btns" style="margin-top:20px"><a class="btn solid" href="#prueba-nivel">Hacer la prueba de nivel (2 minutos)</a></div></div>';
  }
  EXT.act['lx-setlvl'] = el => { const s = S(); s.lvl = el.dataset.l; save(s); B.go('aprender'); };
  async function vPrueba() {
    await data();
    const pick = (w, n) => shuffle(DATA.worlds.find(x => x.id === w).units.flatMap(u => u.items.map(i => ITEMS[i.id]))).slice(0, n);
    const q = [].concat(
      pick('w1', 3).map(it => ({ t: 'letter', it, tier: 0 })),
      pick('w2', 3).map(it => ({ t: it.kind === 'vowels' ? 'sound' : 'sound', it, tier: 1 })),
      pick('w4', 3).map(it => ({ t: 'he2es', it, tier: 2 })),
      pick('w11', 3).map(it => ({ t: 'he2es', it, tier: 3 })));
    startSession({ mode: 'placement', q, items: [], color: '#C6A15B', title: 'Prueba de nivel' });
  }
  const _answer = answer;
  answer = function (ok, fix) { if (SES && SES.mode === 'placement') SES.q[SES.i].ok = ok; return _answer(ok, fix); };

  /* ----- Mis palabras por repasar ----- */
  async function vMisPalabras() {
    await data(); const s = S();
    const ids = Object.keys(s.srs).filter(id => ITEMS[id]).sort((a, b) => s.srs[a].due - s.srs[b].due);
    const when = t => { const d = Math.round((t - Date.now()) / DAY); return t <= Date.now() ? 'ahora' : d <= 0 ? 'hoy' : d === 1 ? 'mañana' : 'en ' + d + ' días'; };
    B.view().innerHTML = B.top('Mis palabras por repasar', { back: 'aprender' }) + '<div class="wrap">' +
      (ids.length ? '<div class="btns" style="margin:16px 0"><a class="btn solid" href="#repaso">Repasar ahora (' + dueItems(s).length + ')</a></div>' +
        ids.map(id => { const it = ITEMS[id], r = s.srs[id]; return '<div class="word lx-wordrow"><span class="he" lang="he">' + esc(it.he) + '</span><b>' + esc(it.tr || '') + '</b><span>' + esc(it.kind === 'letters' ? 'Sonido: ' + it.es : it.es) + '</span>' +
          '<span class="muted" style="font-size:.85rem">Dominio <span class="lx-dom" aria-label="' + r.b + ' de 6">' + '●'.repeat(r.b) + '○'.repeat(6 - r.b) + '</span> · Próximo repaso: ' + when(r.due) + (r.err ? ' · ' + r.err + ' errores' : '') + '</span>' +
          '<div class="actions">' + audioBtns(it) + (it.ref ? '<a href="#' + B.refRoute(it.ref) + '">' + esc(B.refLabel(it.ref)) + '</a>' : '') + '</div></div>'; }).join('')
        : '<div class="empty"><p>Todavía no has estudiado palabras. Empieza una lección y aparecerán aquí.</p><a class="btn" href="#aprender">Ir al mapa</a></div>') + '</div>';
  }

  /* ----- Perfil ----- */
  async function vPerfil() {
    await data(); const s = S(); const lv = levelOf(s.xp); const a = xpFor(lv), b = xpFor(lv + 1);
    const words = Object.keys(s.srs).filter(id => ITEMS[id] && !isGlyph(ITEMS[id]) && s.srs[id].b >= 1).length;
    const letters = Object.keys(s.srs).filter(id => ITEMS[id] && ITEMS[id].kind === 'letters' && s.srs[id].b >= 3).length;
    const passed = Object.values(s.units).filter(u => u.passed).length;
    const acc = s.st.tot ? Math.round(s.st.ok / s.st.tot * 100) : 0;
    const cont = s.last && UNIT[s.last] ? UNIT[s.last] : nextUnit(s);
    B.view().innerHTML = B.top('Mi perfil de aprendizaje', { back: 'aprender' }) + '<div class="wrap">' +
      '<div class="lx-hero"><div class="lx-level">' + lv + '</div><h2>Nivel ' + lv + '</h2><div class="progress"><i style="width:' + Math.round((s.xp - a) / (b - a) * 100) + '%"></i></div><p class="muted" style="margin:0">' + s.xp + ' XP. Faltan ' + (b - s.xp) + ' XP para el nivel ' + (lv + 1) + '.</p></div>' +
      '<div class="lx-stats wide"><div><b>🔥 ' + s.streak.n + '</b><span>días seguidos</span></div><div><b>' + passed + '/' + UNITS.length + '</b><span>unidades</span></div><div><b>' + words + '</b><span>palabras aprendidas</span></div><div><b>' + letters + '/27</b><span>letras dominadas</span></div><div><b>' + acc + '%</b><span>aciertos</span></div><div><b>' + dueItems(s).length + '</b><span>por repasar</span></div><div><b>🪙 ' + s.coins + '</b><span>monedas</span></div><div><b>⚡ ' + s.st.speed + '</b><span>récord contrarreloj</span></div></div>' +
      '<div class="btns"><a class="btn solid" href="#leccion-' + cont.id + '-l">Continuar: ' + esc(cont.name) + '</a><a class="btn" href="#mis-palabras">Mis palabras</a></div>' +
      '<div class="group-title"><h3>Insignias</h3></div><div class="lx-badges">' + Object.entries(BADGES).map(([k, [ic, n, d]]) => '<div class="lx-badge' + (s.badges[k] ? ' got' : '') + '" title="' + esc(d) + '"><span>' + esc(ic) + '</span><b>' + esc(n) + '</b><small>' + esc(d) + '</small></div>').join('') + '</div>' +
      '<div class="group-title"><h3>Protector de racha</h3></div><div class="opt"><span class="t">Tienes ' + s.freeze + ' 🛡️<span>Si un día no estudias, se usa automáticamente para mantener tu racha. Cuesta 50 monedas.</span></span><button class="btn" data-act="lx-freeze"' + (s.coins < 50 ? ' disabled' : '') + '>Obtener</button></div>' +
      '<div class="group-title"><h3>Sobre la pronunciación</h3></div><p style="font-size:.95rem">Las transliteraciones siguen la pronunciación académica sefardí-israelí, la más usada hoy. Existen otras tradiciones (ashkenazí, yemenita, sefardí oriental) que pronuncian distinto algunas vocales y letras, como ת sin punto o la ע. La voz de la app es sintética, del teléfono, y no es una grabación del hebreo antiguo.</p>' +
      '<div class="opt"><span class="t">Punto de partida<span>' + esc((LVLS.find(x => x[0] === s.lvl) || LVLS[0])[1]) + '</span></span><a class="btn" href="#nivel-hebreo">Cambiar</a></div>' +
      '<div class="opt"><span class="t">Reiniciar el aprendizaje<span>Borra XP, unidades, insignias y repasos de este teléfono</span></span><button class="btn" data-act="lx-reset">Reiniciar</button></div></div>';
  }
  EXT.act['lx-freeze'] = () => { const s = S(); if (s.coins < 50) return; s.coins -= 50; s.freeze++; save(s); B.toast('Protector de racha obtenido 🛡️'); vPerfil(); };
  EXT.act['lx-reset'] = () => { if (!confirm('¿Reiniciar todo tu progreso de aprendizaje?')) return; B.Store.set('learn', fresh()); B.go('aprender'); };

  /* ----- Hebreo de la parashá ----- */
  const PREF = /^[והבלמכש]{1,2}/;
  const normV = x => x.replace(/[\u05BC\u0591-\u05AF\u05BD]/g, '').replace(/([\u05D0-\u05EA])([\u05B0-\u05C7]+)/g, (m, l, mk) => l + mk.split('').sort().join(''));
  async function vParashaHebreo() {
    await data();
    B.view().innerHTML = B.top('Hebreo de la parashá', { back: 'aprender' }) + '<div class="loading">Buscando las palabras en la parashá…</div>';
    const w = await B.weekInfo(); if (!w) return;
    const p = w.list[0]; const d = await B.getBook(p.lec.b);
    const s = B.parseCV(p.lec.s), e = B.parseCV(p.lec.e);
    const counts = {}; const first = {};
    const lemmas = {}; Object.values(ITEMS).filter(x => x.kind === 'words').forEach(x => { lemmas[plain(x.he).replace(/[ךםןףץ]$/, m => m)] = x; });
    for (let c = s.c; c <= e.c; c++) {
      const ch = d.c[c - 1]; const v0 = c === s.c ? s.v : 1; const v1 = c === e.c ? e.v : ch.length;
      for (let v = v0; v <= v1; v++) {
        const h = ch[v - 1][1] || '';
        const raw = h.replace(/[\u0591-\u05AF\u05BD\u05C0\u05C3\u034F\u05BC]/g, '').split(/[\s\u05BE]+/);
        raw.forEach(rt => {
          const t = plain(rt); if (!t) return;
          const cands = [[t, rt]]; const m = t.match(PREF);
          if (m) { const pv = rt.match(/^([\u05D0-\u05EA][\u05B0-\u05BB\u05C1\u05C2]*){1,2}/); cands.push([t.slice(1), rt.replace(/^[\u05D0-\u05EA][\u05B0-\u05BB\u05C1\u05C2]*/, '')]); if (m[0].length > 1) cands.push([t.slice(2), rt.replace(/^([\u05D0-\u05EA][\u05B0-\u05BB\u05C1\u05C2]*){2}/, '')]); }
          for (const [c2, v2] of cands) {
            const it = lemmas[c2]; if (!it) continue;
            // palabras de 1 o 2 letras: se exige la misma vocalización (distingue שֵׁם «nombre» de שָׁם «allí»)
            // y solo los prefijos ו y ה (evita contar לבן «Laván» como בן «hijo»)
            if (c2.length <= 2) { if (normV(v2) !== normV(it.he)) continue; if (c2 !== t && !/^[וה]{1,2}$/.test(t.slice(0, t.length - c2.length))) continue; }
            counts[it.id] = (counts[it.id] || 0) + 1; first[it.id] = first[it.id] || (p.lec.b + ' ' + c + ':' + v); break;
          }
        });
      }
    }
    const ids = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    EXT._parashaItems = ids.slice(0, 10).map(id => ITEMS[id]);
    B.view().innerHTML = B.top('Hebreo de la parashá', { back: 'aprender' }) + '<div class="wrap">' +
      '<div class="lx-hero"><p class="he" lang="he" style="font-size:2.4rem">' + esc(p.he) + '</p><h2>' + esc(p.tr) + '</h2><p class="muted" style="margin:0">' + esc(p.sig) + '. ' + esc(B.fmtRange(p.lec)) + '</p></div>' +
      (ids.length ? '<p>Estas palabras del vocabulario de Beit Hatzirah aparecen en la parashá de esta semana:</p>' +
        ids.map(id => { const it = ITEMS[id]; return '<div class="word"><span class="he" lang="he">' + esc(it.he) + '</span><b>' + esc(it.tr) + ' ' + (it.em || '') + '</b><span>' + esc(it.es) + '</span><span class="muted" style="font-size:.85rem">Aparece ' + counts[id] + (counts[id] === 1 ? ' vez' : ' veces') + '</span><div class="actions">' + audioBtns(it) + '<a href="#' + B.refRoute(first[id]) + '">Ver ' + esc(B.refLabel(first[id])) + '</a></div></div>'; }).join('') +
        '<div class="btns" style="margin:20px 0"><button class="btn solid" data-act="lx-parasha">Practicar estas palabras</button></div>'
        : '<div class="empty"><p>Ninguna palabra del vocabulario actual aparece en esta parashá. A medida que se agreguen mundos, habrá más coincidencias.</p></div>') +
      '<p class="muted" style="font-size:.82rem">La búsqueda reconoce cada palabra también con prefijos (ו ה ב ל מ כ ש). Las formas verbales conjugadas todavía no se detectan.</p></div>';
  }
  EXT.act['lx-parasha'] = () => { if (EXT._parashaItems && EXT._parashaItems.length) startSession({ mode: 'parasha', items: EXT._parashaItems, color: '#B8892F', title: 'Hebreo de la parashá' }); };

  /* ---------- Registro de rutas ---------- */
  Object.assign(EXT.routes, {
    'aprender': vAprender, 'leccion': vLeccion, 'repaso': vRepaso, 'contrarreloj': vContrarreloj,
    'nivel-hebreo': vNivel, 'prueba-nivel': vPrueba, 'mis-palabras': vMisPalabras, 'perfil-hebreo': vPerfil, 'parasha-hebreo': vParashaHebreo
  });
  ['aprender', 'leccion', 'repaso', 'contrarreloj', 'nivel-hebreo', 'prueba-nivel', 'mis-palabras', 'perfil-hebreo', 'parasha-hebreo'].forEach(r => { EXT.tabs[r] = 'aprender'; });
  EXT.leave = () => { if (SES) { SES = null; clearInterval(tick); } document.body.classList.remove('in-lesson'); };
})();
