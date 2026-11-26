/* BEIT HATZIRAH — El Moreh: guía oficial de la aplicación.
   La ilustración original se usa tal cual, separada en tres capas (cuerpo, cabeza y brazo que señala)
   para animarla con movimientos pequeños y naturales, sin redibujar el rostro ni la vestimenta.
   El Moreh responde con el contenido de Beit Hatzirah (no es una inteligencia artificial). */
(function () {
  'use strict';
  const EXT = window.BH_EXT;
  let B = null;
  const esc = s => B.esc(s);
  const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[¿?¡!.,;:«»"]/g, ' ').replace(/\s+/g, ' ').trim();
  const plain = h => (h || '').replace(/[^\u05D0-\u05EA]/g, '');

  /* ---------- Recursos gráficos ---------- */
  const SRC = n => { const E = window.__BH_EMBED; return (E && E.moreh && E.moreh[n]) || 'img/moreh/' + n + '.webp'; };
  /* Rasgos faciales (cejas, ojos y boca) dibujados sobre la misma ilustración; posiciones en la imagen original de 874 × 1600 */
  const FEAT = { 'b-raised': [262, 124, 208, 58], 'b-furrow': [262, 124, 208, 58], 'b-concern': [262, 124, 208, 58], 'b-think': [262, 124, 208, 58], 'm-closed': [298, 254, 132, 66], 'm-neutral': [298, 254, 132, 66], 'm-serious': [298, 254, 132, 66], 'm-think': [298, 254, 132, 66], 'm-o': [298, 254, 132, 66], 'm-talk1': [298, 254, 132, 66], 'm-talk2': [298, 254, 132, 66], 'm-talk3': [298, 254, 132, 66], 'e-right': [276, 174, 176, 50], 'e-upright': [276, 174, 176, 50], 'e-left': [276, 174, 176, 50], 'e-down': [276, 174, 176, 50], 'e-blink': [276, 174, 176, 50], 'e-half': [276, 174, 176, 50] };
  function feats(ox, oy, w, h) { return Object.entries(FEAT).map(([n, [x, y, fw, fh]]) => '<img class="mx x-' + n + '" src="' + SRC(n) + '" alt="" style="left:' + ((x - ox) / w * 100).toFixed(3) + '%;top:' + ((y - oy) / h * 100).toFixed(3) + '%;width:' + (fw / w * 100).toFixed(3) + '%;height:' + (fh / h * 100).toFixed(3) + '%">').join(''); }
  const WSTATE = { hover: 'hover', enter: 'fly', point: 'curious', orbit: 'celebrate', perch: 'rest', land: 'rest', fly: 'fly', rest: 'rest', curious: 'curious', attn: 'attn', excited: 'excited' };
  const WASP = (mode, cls, spot) => '<span class="mo-wasp ' + (cls || '') + '" data-ws="' + (WSTATE[mode] || 'hover') + '" data-spot="' + (spot || (mode === 'enter' ? 'away' : 'shoulder')) + '" aria-hidden="true"><span class="mo-wbody">' + (window.BH_WASP_ART ? window.BH_WASP_ART('main') : '') + '</span></span>';
  function fig(pose, cls, expr, opt) {   // figura completa animable, con la avispa a su lado
    opt = opt || {};
    return '<span class="mo-team' + (opt.nowasp ? ' solo' : '') + '"><span class="mo-fig ' + (pose ? 'p-' + pose : '') + ' ' + (cls || '') + '" data-expr="' + (expr || EXPR_OF[pose] || 'sonriente') + '" aria-hidden="true"><span class="mo-flip"><img class="mo-arm" src="' + SRC('arm') + '" alt=""><span class="mo-headg"><img class="mo-head" src="' + SRC('head') + '" alt="">' + feats(0, 0, 874, 1600) + '</span><img class="mo-body" src="' + SRC('body') + '" alt=""></span></span>' + (opt.nowasp ? '' : WASP(opt.wasp || 'rest', '', opt.wasp === 'enter' ? 'away' : opt.spot)) + '</span>';
  }
  const avatar = (size, cls, expr, wasp) => '<span class="mo-av ' + (cls || '') + '" data-expr="' + (expr || 'sonriente') + '" style="--ms:' + (size || 40) + 'px" aria-hidden="true"><span class="mo-avc"><img src="' + SRC('avatar') + '" alt="">' + feats(170, 0, 340, 340) + '</span>' + (wasp ? WASP('perch', 'mini') : '') + '</span>';
  const EXPR_OF = { idle: 'sonriente', nod: 'atento', teach: 'entusiasmado', point: 'entusiasmado', explain: 'explicativo', welcome: 'sonriente', reflect: 'reflexivo', celebrate: 'celebracion', walk: 'sonriente', enter: 'sonriente', leave: 'sonriente' };
  /* Expresiones: sonriente, serio, pensativo, sorprendido, entusiasmado, atento, reflexivo, comprensivo, celebracion, explicativo */
  function expr(el, e) { if (!el) return; el.querySelectorAll('.mo-fig,.mo-av').forEach(f => f.dataset.expr = e); if (el.matches && el.matches('.mo-fig,.mo-av')) el.dataset.expr = e; }
  /* Boca sincronizada con la voz: alterna formas mientras suena (y se reinicia con cada palabra) */
  const talkers = new Map();
  function talk(el, on) {
    if (!el) return; const t = talkers.get(el); if (t) { clearInterval(t); talkers.delete(el); }
    el.querySelectorAll('.mo-fig,.mo-av').forEach(f => f.removeAttribute('data-talk'));
    if (!on) return; let k = 0; const seq = [1, 2, 3, 2, 1, 0, 2, 3, 1, 0];
    const iv = setInterval(() => { k = (k + 1) % seq.length; el.querySelectorAll('.mo-fig,.mo-av').forEach(f => f.dataset.talk = seq[k]); }, 115); talkers.set(el, iv);
  }

  /* ---------- Preferencias ---------- */
  const DEF = { on: true, anim: true, mode: 'guia', freq: 'normal', sound: true, tour: false };
  const P = () => Object.assign({}, DEF, (B && B.Store.get('moreh', {})) || {});
  const setP = (k, v) => { const p = P(); p[k] = v; B.Store.set('moreh', p); apply(); };
  let hiddenSession = false;
  const active = () => P().on && !hiddenSession;
  function apply() {
    const p = P(); const r = document.documentElement;
    r.classList.toggle('mo-still', !p.anim); r.classList.toggle('mo-off', !active());
    const av = SRC('avatar'); r.style.setProperty('--moreh-av', 'url("' + (av.startsWith('data:') ? av : new URL(av, location.href).href) + '")');
  }
  EXT.sounds = () => !B || P().sound;

  /* ---------- Mensajes por contexto (rotan para no repetirse) ---------- */
  const CTX = {
    inicio: { m: ['Shalom (paz). Bienvenido a Beit Hatzirah. ¿Por dónde quieres comenzar hoy?', 'Shalom. Te recomiendo revisar la parashá de esta semana.', 'Hoy es un buen día para aprender una nueva palabra hebrea.'], q: [['Hacer el recorrido guiado', 'tour'], ['Parashá de esta semana', 'aprende:parasha'], ['Mi camino de aprendizaje', 'go:camino']] },
    biblia: { m: ['Toca un versículo para analizar sus palabras hebreas, compararlo con otras versiones o crear una imagen.', 'Puedo ayudarte a leer un versículo en hebreo, palabra por palabra.'], q: [['Ayúdame a leer este versículo', 'aprende:leer'], ['¿Cómo comparo versiones?', 'ask:comparar versiones'], ['Explícame qué es una raíz hebrea', 'aprende:raiz']] },
    aprender: { m: ['Shalom. Hoy vamos a aprender una nueva letra del alfabeto hebreo.', 'Un poco cada día: así se aprende el hebreo de la Torá.', 'Si una letra te cuesta, repítela en voz alta mientras la escuchas.'], q: [['Enséñame el alfabeto hebreo', 'aprende:alfabeto'], ['Explícame qué es una raíz', 'aprende:raiz'], ['Mi camino de aprendizaje', 'go:camino']] },
    diccionario: { m: ['¿Quieres que exploremos juntos la raíz de esta palabra?', 'En el diccionario puedes buscar en hebreo, en español, por raíz o por número.', 'Mira la primera aparición de una palabra: ayuda a entender su sentido.'], q: [['Quiero aprender a usar el diccionario', 'aprende:diccionario'], ['Explícame qué es una raíz hebrea', 'aprende:raiz'], ['Ver las raíces más frecuentes', 'go:dicraices']] },
    gematria: { m: ['Seleccionemos una palabra hebrea y descubramos el valor de sus letras.', 'Recuerda: la gematría invita a reflexionar, pero no es una prueba de doctrina.'], q: [['Explícame cómo funciona la gematría', 'aprende:gematria'], ['Calcular «Shalom»', 'gem:שלום']] },
    estudios: { m: ['Te puedo ayudar a encontrar otros pasajes relacionados con este tema.', 'Lee primero el pasaje completo: el contexto da el sentido.'], q: [['Explícame esta parashá', 'aprende:parasha'], ['Ver todas las parashiot', 'go:parashiot'], ['Buscar un tema', 'go:buscar-todo']] },
    audio: { m: ['¿Prefieres escuchar el capítulo completo o seleccionar un pasuq?', 'Toca cualquier versículo para comenzar la lectura desde allí.'], q: [['Capítulo completo', 'ask:escuchar capitulo completo'], ['Escuchar un solo pasuq', 'ask:escuchar un pasuq']] },
    tefilot: { m: ['Puedo ayudarte a encontrar una oración. Usa el buscador o elige una categoría.', 'En cada tefilá puedes mostrar u ocultar el hebreo, la transliteración y el español.'], q: [['¿Cómo leo una tefilá?', 'aprende:tefilot'], ['Bendiciones de alimentos', 'go:tefilot-c-alimentos'], ['Tefilot de Shabat', 'go:tefilot-c-shabat']] },
    besora: { m: ['Aquí encontrarás argumentos con sus referencias bíblicas, explicados con respeto.', 'Elige el perfil de la persona con quien vas a conversar.'], q: [['Profecías del Mashíaj', 'go:besora-profecias'], ['Preguntas difíciles', 'go:besora-faq'], ['Practicar una conversación', 'go:besora-sim']] },
    imagen: { m: ['Elige una plantilla y un formato; luego toca «Compartir».', 'La plantilla Jerusalén es el fondo oficial de Beit Hatzirah.'], q: [['¿Cómo creo una imagen?', 'ask:crear imagen de un versiculo']] },
    otro: { m: ['Estoy aquí para ayudarte. Escribe tu pregunta o elige una opción.'], q: [['Hacer el recorrido guiado', 'tour'], ['Mi camino de aprendizaje', 'go:camino']] }
  };
  function ctxOf(h) {
    h = (h || location.hash).replace(/^#/, '');
    if (!h || h === 'inicio') return 'inicio';
    if (/^(biblia|libro|leer|buscar$|lectura)/.test(h)) return 'biblia';
    if (/^(aprender|leccion|repaso|contrarreloj|nivel|prueba|mis-palabras|perfil-hebreo|vocabparasha|parasha-hebreo)/.test(h)) return 'aprender';
    if (/^(diccionario|dic|raiz|concordancia|flashcards|vocabulario|pealim)/.test(h)) return 'diccionario';
    if (/^gematria/.test(h)) return 'gematria';
    if (/^(estudios|parasha|parashiot|calendario)/.test(h)) return 'estudios';
    if (/^audio/.test(h)) return 'audio';
    if (/^tefilot/.test(h)) return 'tefilot';
    if (/^besora/.test(h)) return 'besora';
    if (/^imagen/.test(h)) return 'imagen';
    return 'otro';
  }
  const lastIdx = {};
  function msgFor(c) { const L = CTX[c].m; let i = (lastIdx[c] === undefined ? Math.floor(Math.random() * L.length) : (lastIdx[c] + 1) % L.length); lastIdx[c] = i; return L[i]; }

  /* ---------- Consejos integrados en las páginas ---------- */
  const TIPS = {
    hebreo: ['El hebreo se lee de derecha a izquierda.', 'Con el punto (daguesh), בּ suena «b», כּ suena «k» y פּ suena «p». Sin el punto: ב «v», כ «j», פ «f».', 'La שׁ (Shin) lleva el punto a la derecha y suena «sh»; la שׂ (Sin) lo lleva a la izquierda y suena «s».', 'Cinco letras cambian de forma al final de la palabra: ך ם ן ף ץ.', 'La ו (Vav) suena «v». Con un punto encima, וֹ, se lee «o»; con un punto al lado, וּ, se lee «u».', 'El shvá (ְ) al comienzo de una palabra se pronuncia como una «e» breve: בְּרֵאשִׁית «Bereshit».'],
    diccionario: ['La mayoría de las palabras hebreas nacen de una raíz de tres consonantes: conocerla abre toda su familia.', 'הַ al comienzo de una palabra es el artículo «el, la»; וְ es «y»; בְּ es «en»; לְ es «a, para».', 'Las terminaciones ־ִים y ־וֹת suelen indicar plural.', 'La primera aparición de una palabra en la Torá ayuda a entender su sentido básico.'],
    estudio: ['Lee el pasaje completo antes de estudiar sus detalles: el contexto da el sentido.', 'Distingue lo que el texto dice de lo que interpretamos sobre él.', 'Anota tus preguntas: el estudio de la Torá avanza preguntando.', 'Compara el pasaje con otros textos que tratan el mismo tema: toca un versículo y abre «Referencias cruzadas».'],
    audio: ['¿Prefieres escuchar el capítulo completo o seleccionar un pasuq? Con «Capítulo completo» / «Solo este pasuq» eliges el modo, y tocando un versículo empiezas desde allí.'],
    tefilot: ['Puedo ayudarte a encontrar una oración: usa el buscador o los filtros de mañana, tarde y noche. Dentro de cada tefilá puedes mostrar u ocultar el hebreo, la transliteración y el español.'],
    besora: ['Elige el perfil de la persona con quien vas a conversar. Cada tema trae las referencias bíblicas, las distintas interpretaciones y una forma respetuosa de responder.'],
    imagen: ['Elige una plantilla (la destacada es Jerusalén), el formato y el idioma. El versículo se coloca sobre el fondo sin cambiar ninguna palabra; luego toca «Compartir» o «Descargar».'],
    gematria: ['Seleccionemos una palabra hebrea y descubramos el valor de sus letras. Las coincidencias invitan a reflexionar, pero no prueban una doctrina.']
  };
  const seeded = (a, seed) => a[Math.abs([...String(seed)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)) % a.length];
  function tip(kind, seed, label, actions) {
    if (!B || !active()) return '';
    const t = seed === undefined ? TIPS[kind][Math.floor(Math.random() * TIPS[kind].length)] : seeded(TIPS[kind], seed);
    return '<aside class="mo-tip">' + avatar(46, 'mo-nod', kind === 'estudio' ? 'reflexivo' : kind === 'gematria' ? 'sorprendido' : 'atento', true) + '<div><small>' + esc(label || 'El Moreh') + '</small><p>' + esc(t) + '</p>' + (actions || '') + '</div></aside>';
  }
  function inline(mode, size, variant, cls) {   // presencia integrada; se adapta al tamaño disponible
    if (!B || !active()) return '';
    if (variant === 'badge') return avatar(size || 72, 'mo-badge');
    if ((size || 44) >= 80) return '<span class="mo-inline ' + (cls || '') + '" style="--mh:' + size * 2 + 'px">' + fig(mode === 'hover' ? 'idle' : 'teach') + '</span>';
    return avatar(size || 44, 'mo-' + (mode === 'still' ? 'still' : 'idle') + ' ' + (cls || ''), mode === 'land' ? 'sorprendido' : 'sonriente', size >= 40);
  }

  /* ---------- Los Compañeros: coreografía del Moreh y la avispa ---------- */
  // Lugares de la avispa, en % de la figura del Moreh (874 × 1600): hombro, mano que señala, junto a la cabeza, al frente, lejos
  const SPOT = { shoulder: [65.5, 22.5], hand: [95, 26.3], head: [62, 4], front: [108, 32], near: [96, 11], low: [104, 46], left: [-12, 20], away: [165, -22] };
  const motionOn = () => P().anim && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  function wEl(t) { return t && t.querySelector(':scope > .mo-wasp'); }
  function fEl(t) { return t && t.querySelector(':scope > .mo-fig'); }
  function wState(t, st) { const w = wEl(t); if (w) w.dataset.ws = st; }
  function wplace(t, spot) { const w = wEl(t); if (!w) return; const [x, y] = SPOT[spot] || SPOT.shoulder; w.style.left = x + '%'; w.style.top = y + '%'; w.dataset.spot = spot; }
  function flyTo(t, spot, dur, lift) {
    const w = wEl(t); if (!w) return; const from = SPOT[w.dataset.spot] || SPOT.shoulder; const to = SPOT[spot] || SPOT.shoulder;
    if (!motionOn()) return wplace(t, spot);
    w.dataset.face = to[0] < from[0] ? 'l' : 'r'; wState(t, 'fly');
    const mid = [(from[0] + to[0]) / 2, Math.min(from[1], to[1]) - (lift === undefined ? 12 : lift)];
    try { w.animate([{ left: from[0] + '%', top: from[1] + '%' }, { left: mid[0] + '%', top: mid[1] + '%', offset: .5 }, { left: to[0] + '%', top: to[1] + '%' }], { duration: dur || 900, easing: 'cubic-bezier(.45,.05,.3,1)' }); } catch (e) { }
    wplace(t, spot); setTimeout(() => { w.dataset.face = 'r'; }, (dur || 900));
  }
  function orbit(t, dur) {
    const w = wEl(t); if (!w || !motionOn()) return; wState(t, 'celebrate'); const cx = 50, cy = 36, rx = 72, ry = 30; const k = [];
    for (let i = 0; i <= 16; i++) { const a = -Math.PI / 2 + i / 16 * Math.PI * 2; k.push({ left: (cx + rx * Math.cos(a)) + '%', top: (cy + ry * Math.sin(a)) + '%' }); }
    const s0 = SPOT[w.dataset.spot] || SPOT.shoulder; k.unshift({ left: s0[0] + '%', top: s0[1] + '%' });
    try { w.animate(k, { duration: dur || 1800, easing: 'ease-in-out' }); } catch (e) { }
  }
  function look(t, dir) { const f = fEl(t); if (f) { if (dir) f.dataset.look = dir; else f.removeAttribute('data-look'); } }
  function tilt(t, on) { const f = fEl(t); if (f) f.classList.toggle('tilt-r', !!on); }
  function pose(t, p, e) { const f = fEl(t); if (!f) return; f.className = f.className.replace(/\bp-\S+/g, '').trim() + ' p-' + p; if (e) f.dataset.expr = e; }
  function run(t, steps) {
    if (!t) return; (t._tm || []).forEach(clearTimeout); t._tm = [];
    if (!motionOn()) { wplace(t, 'shoulder'); wState(t, 'rest'); return; }
    steps.forEach(([ms, fn]) => t._tm.push(setTimeout(() => { try { fn(); } catch (e) { } }, ms)));
  }
  const SCENES = {
    bienvenida: t => run(t, [[0, () => { wplace(t, 'away'); pose(t, 'welcome', 'sonriente'); look(t, null); }], [350, () => flyTo(t, 'front', 950, 16)], [1300, () => { look(t, 'right'); tilt(t, true); wState(t, 'excited'); }], [2100, () => flyTo(t, 'shoulder', 700, 8)], [2850, () => { wState(t, 'rest'); look(t, null); tilt(t, false); pose(t, 'welcome', 'sonriente'); }], [3700, () => wState(t, 'attn')], [4600, () => { wState(t, 'rest'); pose(t, 'idle', 'sonriente'); }]]),
    ensenanza: t => run(t, [[0, () => pose(t, 'explain', 'entusiasmado')], [300, () => flyTo(t, 'front', 800, 10)], [1100, () => { wState(t, 'curious'); look(t, 'right'); pose(t, 'point', 'entusiasmado'); }], [3200, () => { look(t, null); flyTo(t, 'hand', 700, 6); }], [3950, () => { wState(t, 'rest'); pose(t, 'idle', 'sonriente'); }]]),
    descubrimiento: t => run(t, [[0, () => pose(t, 'idle', 'sorprendido')], [150, () => flyTo(t, 'front', 420, 4)], [600, () => { wState(t, 'curious'); look(t, 'right'); tilt(t, true); }], [2300, () => { pose(t, 'point', 'entusiasmado'); }], [3600, () => { tilt(t, false); look(t, null); flyTo(t, 'shoulder', 800); }], [4450, () => { wState(t, 'rest'); pose(t, 'idle', 'sonriente'); }]]),
    celebracion: t => run(t, [[0, () => { pose(t, 'celebrate', 'celebracion'); look(t, null); }], [200, () => orbit(t, 1800)], [2050, () => { wplace(t, 'hand'); wState(t, 'excited'); look(t, 'upright'); tilt(t, true); }], [2900, () => { pose(t, 'nod', 'sonriente'); wState(t, 'rest'); }], [3700, () => { look(t, null); tilt(t, false); pose(t, 'idle', 'sonriente'); }]]),
    complicidad: t => run(t, [[0, () => pose(t, 'reflect', 'pensativo')], [500, () => flyTo(t, 'near', 700, 6)], [1250, () => wState(t, 'attn')], [1700, () => { look(t, 'upright'); tilt(t, true); pose(t, 'idle', 'sonriente'); }], [2600, () => { look(t, null); tilt(t, false); pose(t, 'explain', 'explicativo'); flyTo(t, 'shoulder', 700, 4); }], [3400, () => wState(t, 'rest')]]),
    despedida: t => run(t, [[0, () => { pose(t, 'welcome', 'sonriente'); look(t, null); flyTo(t, 'hand', 600, 6); }], [650, () => wState(t, 'excited')], [1300, () => wState(t, 'rest')]]),
    tocarMoreh: t => run(t, [[0, () => { const w = wEl(t); look(t, w && (SPOT[w.dataset.spot] || [0, 50])[1] < 15 ? 'upright' : 'right'); tilt(t, true); pose(t, 'nod', 'sonriente'); wState(t, 'attn'); }], [1300, () => { look(t, null); tilt(t, false); pose(t, 'idle', 'sonriente'); wState(t, 'rest'); }]]),
    tocarAvispa: t => run(t, [[0, () => wState(t, 'excited')], [250, () => { const w = wEl(t); flyTo(t, w && w.dataset.spot === 'shoulder' ? 'hand' : 'shoulder', 650, 10); }], [400, () => { look(t, 'right'); pose(t, 'idle', 'sonriente'); }], [1100, () => { wState(t, 'rest'); look(t, null); }]]),
    juntos: t => run(t, [[0, () => pose(t, 'celebrate', 'celebracion')], [100, () => orbit(t, 1500)], [1650, () => { wplace(t, 'shoulder'); wState(t, 'excited'); look(t, 'right'); tilt(t, true); }], [2500, () => { look(t, null); tilt(t, false); pose(t, 'welcome', 'sonriente'); wState(t, 'rest'); }]]),
    calma: t => run(t, [[0, () => { wplace(t, 'shoulder'); wState(t, 'rest'); pose(t, 'idle', 'sonriente'); }]]),
    presentacion: t => run(t, [[0, () => { wplace(t, 'away'); pose(t, 'enter', 'sonriente'); }], [400, () => flyTo(t, 'front', 900, 14)], [1300, () => orbit(t, 1300)], [2650, () => { wplace(t, 'hand'); wState(t, 'rest'); pose(t, 'point', 'entusiasmado'); look(t, 'right'); }], [4000, () => { look(t, null); pose(t, 'idle', 'sonriente'); }]])
  };
  const LINES = { tocar: ['Parece que mi compañera quiere mostrarte algo nuevo.', 'Ella siempre llega primero a las letras.', 'Somos un buen equipo: yo explico y ella encuentra.'], juntos: ['¡Muy bien! Hoy hemos aprendido algo juntos.', '¡Kol hakavod! (Muy bien hecho.) Seguimos juntos.'] };
  let lastScene = [];
  function scene(t, name) { if (!t || !SCENES[name]) return; t._ts = Date.now(); lastScene = [name].concat(lastScene).slice(0, 3); SCENES[name](t); }
  function pickScene(c) {
    const opts = { inicio: ['bienvenida', 'complicidad', 'presentacion'], diccionario: ['descubrimiento', 'complicidad'], gematria: ['descubrimiento', 'ensenanza'], aprender: ['ensenanza', 'bienvenida'], besora: ['complicidad', 'ensenanza'], imagen: ['bienvenida'], otro: ['bienvenida', 'complicidad'] }[c] || ['calma'];
    const fresh = opts.filter(o => !lastScene.includes(o)); const L = fresh.length ? fresh : opts; return L[Math.floor(Math.random() * L.length)];
  }
  const QUIET = /^#(leer|lectura|biblia|tefilot-t|audio|buscar$)/;
  function animateNew() {
    document.querySelectorAll('.mo-team:not([data-anim])').forEach(t => {
      t.dataset.anim = '1'; const w = wEl(t); if (!w) return; wplace(t, w.dataset.spot || 'shoulder');
      const want = t.dataset.scene || (QUIET.test(location.hash) ? 'calma' : t.closest('.mo-present') ? 'presentacion' : t.closest('.mo-celebrate') ? 'celebracion' : t.closest('.mc-head') ? 'bienvenida' : t.closest('.mo-stage') ? 'ensenanza' : w.dataset.spot === 'away' ? 'bienvenida' : 'calma');
      setTimeout(() => scene(t, want), 60);
    });
  }
  new MutationObserver(ms => { if (ms.some(m => m.addedNodes.length)) animateNew(); }).observe(document.documentElement, { childList: true, subtree: true });
  let tapT = 0, tapTeam = null;
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('.mo-team'); if (!t || e.target.closest('a,button')) return;
    const now = Date.now(); if (tapTeam === t && now - tapT < 500) { scene(t, 'juntos'); if (Math.random() < .5) { const m = LINES.juntos[Math.floor(Math.random() * 2)]; if (document.querySelector('.lx-hero-say')) say(m); else B.toast(m); } tapT = 0; return; }
    tapT = now; tapTeam = t; scene(t, e.target.closest('.mo-wasp') ? 'tocarAvispa' : 'tocarMoreh');
    if (Math.random() < .34) { const m = LINES.tocar[Math.floor(Math.random() * LINES.tocar.length)]; if (document.querySelector('.lx-hero-say')) say(m); else B.toast(m); }
  });
  setInterval(() => {
    if (!B || !active() || !motionOn() || document.hidden || QUIET.test(location.hash) || P().freq === 'baja') return;
    if (Math.random() > (P().freq === 'alta' ? .6 : .35)) return;
    const ts = [...document.querySelectorAll('.mo-team')].filter(t => { const r = t.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.width > 40 && Date.now() - (t._ts || 0) > 6000; });
    const t = ts[Math.floor(Math.random() * ts.length)]; if (!t) return;
    scene(t, ['tocarMoreh', 'tocarAvispa', 'complicidad', 'descubrimiento'][Math.floor(Math.random() * 4)]);
  }, 14000);

  /* ---------- Los Compañeros presentan ---------- */
  function presenter(o) {
    if (!B || !active()) return '';
    return '<section class="mo-present" role="region" aria-label="Los Compañeros de Beit Hatzirah"><div class="mo-pteam">' + fig('enter', '', 'sonriente', { wasp: 'enter' }) + '</div><div class="mo-ptext"><small>Los Compañeros de Beit Hatzirah presentan</small><b>' + esc(o.title) + '</b><p>' + esc(o.text) + '</p>' + (o.cta ? (o.cta[1].startsWith('act:') ? '<button class="btn solid" data-act="' + o.cta[1].slice(4) + '">' + esc(o.cta[0]) + '</button>' : '<a class="btn solid" href="#' + o.cta[1] + '">' + esc(o.cta[0]) + '</a>') : '') + (o.close ? '<button class="mo-px" data-act="mo-pclose" data-k="' + esc(o.close) + '" aria-label="Cerrar">✕</button>' : '') + '</div></section>';
  }

  /* ---------- Escena: el Moreh entra, señala, habla y se retira ---------- */
  let sceneEl = null, sceneT = null;
  function stage() {
    if (sceneEl) return sceneEl;
    sceneEl = document.createElement('div'); sceneEl.className = 'mo-scene'; sceneEl.setAttribute('role', 'dialog'); sceneEl.setAttribute('aria-live', 'polite');
    sceneEl.innerHTML = '<div class="mo-actor">' + fig('idle', '', 'sonriente', { wasp: 'enter' }) + '</div><div class="mo-card"><button class="mo-x" data-act="mo-dismiss" aria-label="Cerrar">✕</button><p class="mo-say"></p><div class="mo-acts"></div></div>';
    document.body.appendChild(sceneEl); return sceneEl;
  }
  function setPose(p, e) { const f = stage().querySelector('.mo-fig'); f.className = 'mo-fig p-' + p; f.dataset.expr = e || EXPR_OF[p] || 'sonriente'; }
  function appear(text, acts, opt) {
    if (!active()) return; opt = opt || {};
    const s = stage(); clearTimeout(sceneT);
    s.querySelector('.mo-say').textContent = text;
    s.querySelector('.mo-acts').innerHTML = (acts || []).map(([l, a]) => '<button class="btn' + (a.startsWith('!') ? ' solid' : '') + '" data-act="mo-do" data-a="' + esc(a.replace(/^!/, '')) + '">' + esc(l) + '</button>').join('');
    s.dataset.size = opt.big ? 'big' : 'small';
    s.classList.remove('out'); void s.offsetWidth; s.classList.add('in');
    setPose(opt.pose || 'enter'); setTimeout(() => setPose(opt.after || 'explain', opt.expr), 1300); setTimeout(() => setPose('idle', opt.expr), 4200);
    const fg = s.querySelector('.mo-actor'); talk(fg, true); setTimeout(() => talk(fg, false), Math.min(4200, 900 + text.length * 45));
    const tm = s.querySelector('.mo-team'); if (tm) { tm.dataset.anim = '1'; scene(tm, opt.scene || pickScene(ctxOf())); }
    if (!opt.stay) sceneT = setTimeout(retire, opt.ms || 7500);
    setTimeout(() => { const off = e => { if (!sceneEl || sceneEl.contains(e.target)) return; retire(); window.removeEventListener('scroll', off, true); document.removeEventListener('pointerdown', off, true); }; window.addEventListener('scroll', off, { capture: true, passive: true }); document.addEventListener('pointerdown', off, true); }, 600);
  }
  function retire() {
    if (!sceneEl || !sceneEl.classList.contains('in')) return; const tm = sceneEl.querySelector('.mo-team');
    const out = () => { setPose('leave'); sceneEl.classList.add('out'); sceneEl.classList.remove('in'); };
    if (tm && motionOn()) { scene(tm, 'despedida'); setTimeout(out, 1100); } else out();
  }

  /* ---------- Celebraciones ---------- */
  function chime() {
    if (!P().sound) return;
    try { const C = new (window.AudioContext || window.webkitAudioContext)(); [523.25, 659.25, 783.99].forEach((f, i) => { const o = C.createOscillator(), g = C.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0, C.currentTime + i * 0.12); g.gain.linearRampToValueAtTime(0.07, C.currentTime + i * 0.12 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, C.currentTime + i * 0.12 + 0.6); o.connect(g); g.connect(C.destination); o.start(C.currentTime + i * 0.12); o.stop(C.currentTime + i * 0.12 + 0.7); }); } catch (e) { }
  }
  function celebrate(text) {
    if (!B) return;
    if (!active()) { B.toast(text); return; }
    const c = document.createElement('div'); c.className = 'mo-celebrate'; c.setAttribute('role', 'status');
    c.innerHTML = '<span class="mo-cfig">' + fig('celebrate', '', 'celebracion', { wasp: 'orbit' }) + '</span><p>' + esc(text) + '</p>';
    document.body.appendChild(c); chime(); const tm = c.querySelector('.mo-team'); if (tm) { tm.dataset.anim = '1'; scene(tm, 'celebracion'); } setTimeout(() => c.classList.add('out'), 4000); setTimeout(() => c.remove(), 4600);
  }

  /* ---------- Guía del curso de hebreo (compatibilidad con las llamadas del curso) ---------- */
  let place = 'home', guide = null;
  let gav = null;
  function guideEl() { if (guide) return guide; guide = document.createElement('span'); guide.className = 'mo-guide'; guide.innerHTML = fig('idle', '', 'sonriente', { wasp: 'enter' }); guide.addEventListener('click', () => openPanel()); return guide; }
  function avEl() { if (gav) return gav; gav = document.createElement('span'); gav.className = 'mo-guide mo-gav'; gav.innerHTML = avatar(36, '', 'atento', true); gav.addEventListener('click', () => B.toast(seeded(TIPS.hebreo, Date.now()))); return gav; }
  function attach() {
    if (!active()) return false; const lesson = place === 'lesson'; const slot = document.querySelector(lesson ? '.lx-wsp-slot' : '.lx-hero-slot'); const el = lesson ? avEl() : guideEl();
    if (slot && el.parentNode !== slot) { slot.innerHTML = ''; slot.appendChild(el); if (!lesson) { gpose('enter'); setTimeout(() => gpose('idle'), 1400); } }
    return !!slot;
  }
  function gpose(p, e) {
    const ex = e || EXPR_OF[p] || 'sonriente';
    if (place === 'lesson' && gav) { gav.className = 'mo-guide mo-gav a-' + p; expr(gav, ex); clearTimeout(gpose.t); gpose.t = setTimeout(() => { gav.className = 'mo-guide mo-gav'; expr(gav, 'atento'); }, 1800); return; }
    if (guide) { guide.querySelector('.mo-fig').className = 'mo-fig p-' + p; expr(guide, ex); }
  }
  function say(text) {
    if (!active()) return;
    if (place === 'lesson' && document.querySelector('.lx-wsp-slot')) {
      setTimeout(() => { const host = document.querySelector('#lx-fb .lx-fb') || document.querySelector('.lx-card.intro'); if (!host) return; const old = host.querySelector('.mo-line'); if (old) old.remove(); host.insertAdjacentHTML('beforeend', '<div class="mo-line">' + avatar(34, '', /intenta|aprende|preocup|fuerte/i.test(text) ? 'comprensivo' : 'sonriente', true) + '<span>' + esc(text) + '</span></div>'); }, 40);
      return;
    }
    const sp = document.querySelector('.lx-hero-say'); if (sp) { sp.textContent = text; sp.classList.add('on'); clearTimeout(say.t); say.t = setTimeout(() => sp.classList.remove('on'), 6500); }
  }
  function show(where, msg) { place = where; attach(); if (msg) setTimeout(() => say(msg), 900); }
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const M = {
    letter: ['Observa su forma y escucha su sonido.', 'Una nueva letra: mírala con atención.', 'Esta letra aparece en la Torá: búscala en el ejemplo.'],
    bad: ['Inténtalo una vez más.', 'Así también se aprende: mira la respuesta y continúa.', 'No te preocupes: con práctica lo lograrás.'],
    streak: ['{n} respuestas correctas seguidas. Muy bien.', '{n} aciertos seguidos. ¡Kol hakavod! (Muy bien hecho.)'],
    done: ['¡Excelente trabajo! Has completado esta lección.', '¡Kol hakavod! (Muy bien hecho.) Hoy aprendiste nuevas palabras en hebreo.'],
    level: ['Has alcanzado un nuevo nivel. ¡Kol hakavod! (Muy bien hecho.)', '¡Muy bien! Sigamos avanzando en el estudio de la Torá.'],
    unit: ['Unidad aprobada. ¡Kol hakavod! (Muy bien hecho.)', 'Examen aprobado. La siguiente unidad te espera.']
  };
  let lastTip = 0;
  const API = {
    inline, tip, celebrate, show, say, attach, art: v => avatar(v === 'badge' ? 84 : 48, v === 'badge' ? 'mo-badge' : ''), enabled: () => P().anim,
    hide: () => { }, home: () => show('home', msgFor('aprender')), lesson: () => show('lesson'),
    letter: it => { gpose('teach'); setTimeout(() => gpose('idle'), 1800); if (Date.now() - lastTip > 20000) { lastTip = Date.now(); say(it && it.kind === 'letters' ? pick(M.letter) : seeded(TIPS.hebreo, Date.now())); } },
    buzz: () => { gpose('nod'); setTimeout(() => gpose('idle'), 1200); },
    ok: combo => { if (guide && guide.isConnected) scene(guide.querySelector('.mo-team'), 'tocarAvispa'); gpose('nod', 'sonriente'); setTimeout(() => gpose('idle'), 1100); if (combo && (combo === 3 || combo === 5 || combo % 10 === 0)) say(pick(M.streak).replace('{n}', combo)); },
    bad: it => {
      gpose('reflect', 'comprensivo'); setTimeout(() => gpose('idle', 'comprensivo'), 1600);
      let why = ''; if (it && it.he) why = it.kind === 'letters' || /^l-/.test(it.id || '') ? ' Esta es ' + it.tr + ' (' + it.he + '): ' + (it.es || '') + '.' : it.es ? ' «' + it.he + '»' + (it.tr ? ' (' + it.tr + ')' : '') + ' significa «' + it.es + '».' : '';
      say(pick(M.bad) + why);
    },
    done: () => { show('done'); if (guide) setTimeout(() => scene(guide.querySelector('.mo-team'), 'celebracion'), 500); gpose('celebrate'); setTimeout(() => gpose('idle'), 2200); say(pick(M.done)); },
    level: () => { show('done'); celebrate(pick(M.level)); },
    unit: () => { show('done'); celebrate(pick(M.unit)); },
    badge: name => celebrate('Nueva insignia: ' + name + '. ¡Kol hakavod! (Muy bien hecho.)'),
    open: () => openPanel(), appear, retire, tour: () => startTour()
  };
  EXT.moreh = API;

  /* ---------- Panel del asistente ---------- */
  function openPanel(c) {
    if (!B) return; c = c || ctxOf(); const p = CTX[c];
    B.sheet('<div class="mo-panel"><div class="mo-ph">' + avatar(56, 'mo-nod') + '<div><b>Moreh de Beit Hatzirah</b><span>Tu guía en la aplicación</span></div></div>' +
      '<p class="mo-greet">' + esc(msgFor(c)) + '</p>' +
      '<div class="mo-chips">' + p.q.map(([l, a]) => '<button class="chip" data-act="mo-do" data-a="' + esc(a) + '">' + esc(l) + '</button>').join('') + '</div>' +
      '<form class="mo-ask" data-act="mo-ask-form" onsubmit="return false"><input id="mo-q" type="text" placeholder="Escribe tu pregunta (por ejemplo: ¿qué es una raíz?)" aria-label="Pregunta para el Moreh" autocomplete="off"><button class="btn solid" data-act="mo-ask">Preguntar</button></form>' +
      '<div id="mo-ans" aria-live="polite"></div>' +
      '<h4 class="mo-h">Aprende con el Moreh</h4><div class="mo-learn">' + LESSONS.map(l => '<button data-act="mo-do" data-a="aprende:' + l.id + '"><b>' + esc(l.t) + '</b><span>' + esc(l.d) + '</span></button>').join('') + '</div>' +
      '<div class="mo-foot"><button class="btn" data-act="mo-do" data-a="tour">Recorrido guiado</button><button class="btn" data-act="mo-do" data-a="go:camino">Mi camino de aprendizaje</button><button class="btn" data-act="mo-do" data-a="go:ajustes">Ayuda y configuración</button><button class="btn" data-act="mo-hide">Ocultar por ahora</button></div>' +
      '<p class="mo-note">El Moreh responde con el contenido de Beit Hatzirah y te lleva a cada sección. No es una inteligencia artificial: no inventa respuestas.</p></div>');
  }
  function doAction(a) {
    if (a === 'tour') { B.closeSheet(); retire(); return startTour(); }
    const [k, ...r] = a.split(':'); const v = r.join(':');
    if (k === 'go') { B.closeSheet(); retire(); return B.go(v); }
    if (k === 'aprende') { B.closeSheet(); retire(); return B.go('aprende-' + v); }
    if (k === 'gem') { B.closeSheet(); B.go('gematria'); setTimeout(() => { const i = document.getElementById('gq'); if (i) { i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); } }, 500); return; }
    if (k === 'ask') { if (!document.getElementById('mo-ans')) openPanel(); setTimeout(() => answer(v), 50); }
  }

  /* ---------- Respuestas con el contenido de la app ---------- */
  const HELP = {
    comparar: 'Toca un versículo en la Biblia y elige «Comparar versiones»: verás el hebreo y las cuatro traducciones españolas, con los nombres de Beit Hatzirah (YAH, Yahshúa, Elohim).',
    capitulo: 'En el Audio libro elige libro y capítulo, deja «Capítulo completo» y toca ▶. La lectura avanza sola y resalta cada pasuq.',
    pasuq: 'En el Audio libro toca el botón «Capítulo completo» para cambiarlo a «Solo este pasuq», y luego toca el versículo que quieres escuchar. Con «Repetir pasuq» lo escuchas varias veces.',
    imagen: 'En la Biblia toca un versículo y elige «Imagen para compartir». Elige una plantilla (la destacada es Jerusalén), el formato (1:1, 4:5, 9:16 u original) y el idioma, y toca «Compartir» o «Descargar».',
    tefilot: 'En Tefilot elige una categoría o usa el buscador. Dentro de cada oración, los botones «Hebreo», «Transliteración» y «Traducción» muestran u ocultan cada parte; A− y A+ cambian el tamaño de la letra.',
    audio: 'El Audio libro lee las Escrituras en hebreo y en español con la voz de tu teléfono, resaltando cada pasuq.',
    besora: 'En Besorá elige con quién vas a conversar: judío, evangélico, Testigo de Jehová, católico o ateo. Cada tema trae los textos, las distintas interpretaciones y una respuesta respetuosa.',
    ajustes: 'En Configuración → «El Moreh» puedes desactivarme, quitar las animaciones, elegir modo guía o discreto, la frecuencia de mis apariciones y los efectos sonoros.'
  };
  const INTENTS = [
    [/alfabeto|alef ?bet|abecedario|letras? hebre/, 'aprende:alfabeto'], [/raiz|raices|shoresh/, 'aprende:raiz'], [/leer (este |un )?versiculo|ayudame a leer|leer en hebreo|palabra por palabra/, 'aprende:leer'],
    [/gematr|valor numerico/, 'aprende:gematria'], [/(usar|utilizar|funciona) (el )?diccionario/, 'aprende:diccionario'], [/parash/, 'aprende:parasha'],
    [/recorrido|tour|guia de la app/, 'tour'], [/progreso|camino|avance|insignia|logro/, 'go:camino'],
    [/compar/, 'help:comparar'], [/capitulo completo/, 'help:capitulo'], [/(un|solo|un solo) pasuq|un versiculo/, 'help:pasuq'], [/imagen|compartir/, 'help:imagen'],
    [/tefil|oracion|bendicion|rezar/, 'help:tefilot'], [/audio|escuchar/, 'help:audio'], [/besora|evangel|apologet|testigo|catolic|ateo/, 'help:besora'], [/configur|ajuste|ocultar|desactivar|sonido/, 'help:ajustes']
  ];
  async function answer(q) {
    const out = document.getElementById('mo-ans'); if (!out) return; const n = norm(q); if (!n) return;
    const box = html => { out.innerHTML = '<div class="mo-a">' + avatar(36) + '<div>' + html + '</div></div>'; };
    const ref = findRef(q); if (ref) return box('<p>Te llevo a <a href="#' + ref.route + '" data-act="close-sheet-nav">' + esc(ref.label) + '</a>. Allí puedes tocar el versículo para analizar sus palabras hebreas.</p>');
    for (const [rx, a] of INTENTS) if (rx.test(n)) {
      if (a.startsWith('help:')) { const k = a.slice(5); let extra = ''; if (k === 'tefilot' || k === 'besora') { const r = (await searchAll(q, n)).slice(0, 5); if (r.length) extra = '<div class="rows">' + r.map(([h, t, s]) => '<a class="row" href="' + h + '" data-act="close-sheet-nav"><span class="t"><b>' + esc(t) + '</b><span>' + esc(s) + '</span></span></a>').join('') + '</div>'; } return box('<p>' + esc(HELP[k]) + '</p>' + extra); }
      const l = LESSONS.find(x => 'aprende:' + x.id === a);
      return box('<p>' + (l ? 'Con gusto. Preparé una explicación paso a paso: «' + esc(l.t) + '».' : a === 'tour' ? 'Te muestro la aplicación paso a paso.' : 'Aquí está tu camino de aprendizaje.') + '</p><button class="btn solid" data-act="mo-do" data-a="' + a + '">Comenzar</button>');
    }
    // búsqueda en el contenido de Beit Hatzirah
    const res = await searchAll(q, n);
    if (res.length) return box('<p>Esto encontré en Beit Hatzirah:</p><div class="rows">' + res.slice(0, 6).map(([h, t, s]) => '<a class="row" href="' + h + '" data-act="close-sheet-nav"><span class="t"><b>' + esc(t) + '</b>' + (s ? '<span>' + esc(s) + '</span>' : '') + '</span></a>').join('') + '</div>');
    box('<p>No encontré una respuesta en el contenido de Beit Hatzirah para esa pregunta. Prueba con otras palabras, o usa la búsqueda global.</p><a class="btn" href="#buscar-todo" data-act="close-sheet-nav">Búsqueda global</a>');
  }
  function findRef(q) {
    const m = q.match(/([1-3]?\s?[A-Za-zÁÉÍÓÚáéíóúñÑ]+)\s+(\d{1,3})(?::(\d{1,3}))?/); if (!m) return null;
    const name = norm(m[1]).replace(/\s/g, ''); const b = B.BOOKS.find(x => [x.tr, x.es].concat(x.al || []).some(a => norm(a).replace(/\s/g, '') === name)); if (!b) return null;
    const c = +m[2], v = m[3] ? +m[3] : null; if (c > b.ch) return null;
    return { route: 'leer-' + b.c + '-' + c + (v ? '-' + v : ''), label: b.tr + ' ' + c + (v ? ':' + v : '') };
  }
  async function searchAll(q, n) {
    const out = []; const words = n.split(' ').filter(w => w.length > 2 && !/^(que|como|cual|para|una|los|las|del|por|significa|quiero|saber|sobre|donde|esta|este|explica|explicame)$/.test(w));
    if (!words.length) return out; const has = t => words.every(w => norm(t).includes(w));
    try { const T = await B.getJSON('tefilot.json'); T.tefilot.forEach(t => { if (has(t.es + ' ' + t.tags.join(' ') + ' ' + t.momento)) out.push(['#tefilot-t-' + t.id, t.es, 'Tefilá']); }); } catch (e) { }
    try { const S = await B.getJSON('besora.json'); S.temas.forEach(t => { if (has(t.t + ' ' + t.b)) out.push(['#besora-tema-' + t.id, t.t, 'Besorá']); }); S.faq.forEach((f, i) => { if (has(f.q)) out.push(['#besora-faq-' + i, f.q, 'Pregunta difícil']); }); } catch (e) { }
    try { const Pa = await B.getJSON('parashiot.json'); Pa.forEach(p => { if (has(p.tr + ' ' + p.sig)) out.push(['#parasha-' + p.n, p.tr + ' — ' + p.sig, 'Parashá']); }); } catch (e) { }
    try { const L = await B.getJSON('lexico.json'); const hits = Object.keys(L).filter(k => L[k][3] && words.some(w => norm(L[k][3]).split(/[ ,;()]+/).includes(w))).sort((a, b) => L[b][5] - L[a][5]).slice(0, 4); hits.forEach(k => out.push(['#dic-' + k, L[k][0] + ' — ' + L[k][3], 'Diccionario'])); } catch (e) { }
    return out;
  }

  /* ---------- Aprende con el Moreh: explicaciones paso a paso ---------- */
  const LESSONS = [
    { id: 'alfabeto', t: 'Enséñame el alfabeto hebreo', d: 'Las 22 letras, una por una' },
    { id: 'raiz', t: 'Explícame qué es una raíz hebrea', d: 'Con un ejemplo real del Tanaj' },
    { id: 'leer', t: 'Ayúdame a leer este versículo', d: 'Palabra por palabra, con su significado' },
    { id: 'gematria', t: 'Explícame cómo funciona la gematría', d: 'Valores, cálculo y prudencia' },
    { id: 'diccionario', t: 'Quiero aprender a usar el diccionario', d: 'Buscar, raíces y concordancia' },
    { id: 'parasha', t: 'Explícame esta parashá', d: 'La lectura de esta semana' },
    { id: 'tefilot', t: '¿Cómo leo una tefilá?', d: 'Hebreo, transliteración y español' }];
  let LS = { id: null, steps: [], i: 0 };
  async function buildSteps(id) {
    const S = [];
    if (id === 'alfabeto') {
      const A = await B.getJSON('aprender.json'); const lets = A.worlds.filter(w => w.id === 'm1' || w.id === 'm2').flatMap(w => w.units.flatMap(u => u.items)).filter(it => /^l-/.test(it.id) && it.he.length === 1 && !/[ךםןףץ]/.test(it.he));
      const seen = new Set(); const L = lets.filter(it => !seen.has(it.he) && seen.add(it.he));
      S.push({ pose: 'welcome', h: '', t: 'Shalom (paz). El alef-bet tiene 22 letras. Todas son consonantes: las vocales se indican con pequeños signos (nikud). Se lee de derecha a izquierda. Vamos a verlas una por una.' });
      L.forEach((it, k) => S.push({ pose: k % 2 ? 'explain' : 'teach', big: it.he, say: it.name || it.he, t: (k + 1) + ' de ' + L.length + ': ' + it.tr + '. Sonido: ' + it.es + '. ' + (it.snd || '') + (EXT.gematria ? ' Valor numérico: ' + EXT.gematria(it.he).std + '.' : ''), ex: it.ex }));
      S.push({ pose: 'celebrate', t: '¡Kol hakavod! (Muy bien hecho.) Recorriste las 22 letras. Para aprenderlas de verdad, practícalas en el curso «Yo aprendo hebreo con la Torá».', link: ['aprender', 'Ir al curso'] });
    } else if (id === 'raiz') {
      const R = await B.getJSON('raices.json'); const L = await B.getJSON('lexico.json'); const key = Object.keys(R).find(k => plain(k) === 'שמר'); const famAll = (R[key] || []).filter(k => L[k]); const fam = famAll.filter(k => L[k][3]).concat(famAll.filter(k => !L[k][3])).slice(0, 5);
      S.push({ pose: 'teach', t: 'Casi todas las palabras hebreas nacen de una raíz (shóresh): normalmente tres consonantes que llevan una idea básica.' });
      S.push({ pose: 'explain', big: 'ש־מ־ר', t: 'Por ejemplo, la raíz ש־מ־ר (sh-m-r) tiene la idea de «guardar, cuidar». Con distintas vocales y prefijos forma varias palabras:' , list: fam.map(k => [L[k][0], L[k][3] || (L[k][4] + ' (léxico de Strong, en inglés)'), k]) });
      S.push({ pose: 'explain', t: 'Por eso, al leer una palabra, conviene buscar sus tres letras principales y quitar prefijos como וְ «y», הַ «el», בְּ «en» o לְ «a».' });
      S.push({ pose: 'nod', t: 'En el diccionario puedes explorar 1.472 raíces del Tanaj, según el índice Brown-Driver-Briggs.', link: ['dicraices', 'Explorar las raíces'] });
    } else if (id === 'leer') {
      let b = 'GEN', c = 1, v = 1; const m = (LS.from || '').match(/^#leer-(\w+)-(\d+)-(\d+)/); if (m && !B.BY[m[1]].nt) { b = m[1]; c = +m[2]; v = +m[3]; }
      const d = await B.getBookV(b); const cell = d.c[c - 1][v - 1]; const ref = b + ' ' + c + ':' + v;
      let H2E = {}; try { H2E = await B.getJSON('h2e.json'); } catch (e) { }
      const hk = Object.keys(H2E).find(k => H2E[k] === c + ':' + v && k.startsWith(b + ' ')); const hcv = hk ? hk.split(' ')[1] : c + ':' + v;
      const MO = await B.getJSON('morph/' + b + '.json'); const L = await B.getJSON('lexico.json'); const words = MO[hcv] || [];
      S.push({ pose: 'teach', t: 'Leamos juntos ' + B.refLabel(ref) + '. Primero el texto completo; luego lo recorremos palabra por palabra.', big: B.heb(cell[1] || '').replace(/[\u0591-\u05AF]/g, ''), small: true, es: B.es(cell[0] || '') });
      words.forEach((w, k) => { const lem = w[1].split('/').filter(x => /^\d/.test(x)).map(x => x.replace(/\D/g, '').split(' ')[0]).pop(); const Lx = lem && L[lem]; S.push({ pose: k % 2 ? 'explain' : 'teach', big: w[0].replace(/\//g, ''), say: w[0].replace(/\//g, ''), t: (k + 1) + ' de ' + words.length + ': ' + (EXT.translit ? EXT.translit(w[0].replace(/\//g, '')) + ' — ' : '') + (Lx ? (Lx[3] || (/^n-pr/.test(Lx[2]) ? 'nombre propio: ' + Lx[1] : Lx[4] + ' (léxico de Strong, en inglés)')) : 'partícula o forma gramatical') + (w[0].includes('/') ? '. Tiene prefijo: ' + w[0].split('/')[0] : '') + '.', dic: lem }); });
      S.push({ pose: 'celebrate', t: 'Muy bien. Toca cualquier versículo en la Biblia y elige «Analizar las palabras hebreas» para estudiarlo así.', link: ['leer-' + b + '-' + c + '-' + v, 'Abrir el versículo'] });
    } else if (id === 'gematria') {
      const g = EXT.gematria ? EXT.gematria('שלום') : null;
      S.push({ pose: 'teach', t: 'En hebreo cada letra tiene un valor numérico: de א (1) a ט (9), de י (10) a צ (90) y de ק (100) a ת (400).' });
      if (g) S.push({ pose: 'explain', big: 'שָׁלוֹם', t: 'Para calcular una palabra se suman sus letras. שלום: ' + g.rows.map(r => r.ch + ' = ' + r.std).join(' + ') + ' = ' + g.std + '.' });
      S.push({ pose: 'reflect', t: 'Existen varios métodos: el estándar (Mispar Hejrejí), el que da 500 a 900 a las letras finales (Gadol), el reducido (Katán) y el ordinal (Sidurí). La calculadora los muestra todos.' });
      S.push({ pose: 'nod', t: 'Importante: la gematría es una herramienta tradicional de estudio. Las coincidencias invitan a reflexionar, pero no prueban una doctrina.', link: ['gematria', 'Abrir la calculadora'] });
    } else if (id === 'diccionario') {
      S.push({ pose: 'teach', t: 'El diccionario tiene las 8.638 palabras del Tanaj. Puedes buscar en hebreo, en español, por transliteración, por raíz o por un número (gematría).' });
      S.push({ pose: 'explain', t: 'Cada ficha muestra el significado, la categoría, la raíz, la familia de palabras, la frecuencia, la primera aparición y ejemplos en las Escrituras.' });
      S.push({ pose: 'explain', t: '«Concordancia» muestra todos los versículos donde aparece la palabra; «Guardar para repasar» la agrega a tus palabras del curso.' });
      S.push({ pose: 'nod', t: 'También hay nombres divinos, un diccionario temático, expresiones idiomáticas y flashcards.', link: ['diccionario', 'Abrir el diccionario'] });
    } else if (id === 'parasha') {
      const w = await B.weekInfo(); const Pa = await B.getJSON('parashiot.json'); const p = w && w.list && w.list[0] ? Pa.find(x => x.n === w.list[0].n || +x.n === +w.list[0].n) : Pa[0];
      S.push({ pose: 'welcome', big: p.he, small: true, t: 'La parashá de esta semana es ' + p.tr + ' («' + p.sig + '»).' });
      S.push({ pose: 'explain', t: p.res });
      S.push({ pose: 'teach', t: 'Te recomiendo leer primero el texto completo, y después estudiar sus temas y su vocabulario hebreo.', link: ['parasha-' + p.n, 'Estudiar la parashá'] });
    } else if (id === 'tefilot') {
      S.push({ pose: 'teach', t: 'Cada tefilá muestra el hebreo con nikud, la transliteración y la traducción. Arriba ves su fuente y si el texto es bíblico, de dominio público, por verificar o una composición devocional.' });
      S.push({ pose: 'explain', t: 'Los botones «Hebreo», «Transliteración» y «Traducción» muestran u ocultan cada parte. A− y A+ cambian el tamaño, y «Lectura cómoda» deja solo el texto.' });
      S.push({ pose: 'nod', t: 'Con «Escuchar» la oración se lee párrafo por párrafo; puedes ir más lento o repetir un párrafo.', link: ['tefilot', 'Abrir Tefilot'] });
    }
    return S;
  }
  async function vAprende(p) {
    const id = p.slice(1).join('-'); const l = LESSONS.find(x => x.id === id); if (!l) return B.go('inicio');
    if (LS.id !== id) { LS = { id, steps: [], i: 0, from: LS.from }; B.view().innerHTML = B.top('Aprende con el Moreh', { back: 'inicio' }) + '<div class="loading">Preparando la explicación…</div>'; LS.steps = await buildSteps(id); }
    renderStep(l);
  }
  function renderStep(l) {
    const s = LS.steps[LS.i]; const n = LS.steps.length;
    setTimeout(() => { const st = document.querySelector('.mo-stage'); if (st) { talk(st, true); setTimeout(() => talk(st, false), Math.min(5000, 800 + (s.t || '').length * 40)); } }, 300);
    B.view().innerHTML = B.top('Aprende con el Moreh', { back: 'inicio' }) + '<div class="wrap mo-learnv">' +
      '<div class="mo-stage">' + fig(s.pose || 'teach', '', s.expr, { nowasp: !!s.big }) + '<div class="mo-board">' + (s.big ? WASP('land', 'mo-letter-wasp') : '') + '<small>' + esc(l.t) + ' · ' + (LS.i + 1) + ' de ' + n + '</small>' +
      (s.big ? '<p class="he mo-big' + (s.small ? ' sm' : '') + '" lang="he" dir="rtl">' + esc(s.big) + '</p>' : '') +
      (s.es ? '<p class="mo-es">' + esc(s.es) + '</p>' : '') +
      '<p class="mo-text">' + esc(s.t) + '</p>' +
      (s.list ? '<div class="rows">' + s.list.map(([h, e, k]) => '<a class="row" href="#dic-' + k + '"><span class="t"><b>' + esc(e) + '</b></span><span class="he" lang="he">' + esc(h) + '</span></a>').join('') + '</div>' : '') +
      (s.ex ? '<p class="mo-ex">Ejemplo en la Torá: <span class="he" lang="he">' + esc(s.ex.he) + '</span> ' + esc(s.ex.tr) + ' = ' + esc(s.ex.es) + ' · <a href="#' + B.refRoute(s.ex.ref) + '">' + esc(B.refLabel(s.ex.ref)) + '</a></p>' : '') +
      '<div class="btns">' + (s.say ? '<button class="btn" data-act="mo-say" data-h="' + esc(s.say) + '">🔊 Escuchar</button>' : '') + (s.dic ? '<a class="btn" href="#dic-' + s.dic + '">Diccionario</a>' : '') + (s.link ? '<a class="btn solid" href="#' + s.link[0] + '">' + esc(s.link[1]) + '</a>' : '') + '</div></div></div>' +
      '<div class="mo-steps"><button class="btn" data-act="mo-step" data-d="-1"' + (LS.i ? '' : ' disabled') + '>Anterior</button><div class="mo-dots">' + Array.from({ length: Math.min(n, 30) }, (_, k) => '<i' + (k === Math.min(LS.i, 29) ? ' class="on"' : '') + '></i>').join('') + '</div><button class="btn solid" data-act="mo-step" data-d="1"' + (LS.i < n - 1 ? '' : ' disabled') + '>Siguiente</button></div>' +
      '<p class="mo-note">Explicación preparada con el contenido de Beit Hatzirah: letras del curso, léxico bíblico, raíces BDB y texto hebreo del Códice de Leningrado.</p></div>';
  }

  /* ---------- Recorrido guiado ---------- */
  const TOUR = [
    ['.hero2', 'Shalom (paz). Soy el Moreh de Beit Hatzirah y te acompañaré en tu estudio. Te muestro la aplicación en unos pasos.'],
    ['.mod[href="#biblia"]', 'Aquí está la Biblia: el Tanaj en hebreo y el Brit Hadashá, con cuatro traducciones al español.'],
    ['.mod[href="#aprender"]', 'En «Yo aprendo hebreo con la Torá» aprenderás las letras, las vocales y las palabras de la Torá, paso a paso.'],
    ['.mod[href="#diccionario"]', 'El diccionario reúne las palabras del Tanaj con sus raíces, su significado y su primera aparición.'],
    ['.mod[href="#tefilot"]', 'En Tefilot encontrarás las oraciones y bendiciones, en hebreo, transliteración y español.'],
    ['.mod[href="#audio"]', 'El Audio libro lee las Escrituras en hebreo y en español, resaltando cada pasuq.'],
    ['.mod[href="#gematria"]', 'Con la gematría calculas el valor numérico de las palabras hebreas.'],
    ['.mod[href="#estudios"]', 'Aquí están los estudios; y en Parashiot, las 54 porciones semanales de la Torá.'],
    ['.top .mo-hdr', 'Cuando me necesites, toca mi rostro arriba a la derecha: te ayudaré según la sección en la que estés.']];
  let TI = -1, tourEl = null;
  function startTour() {
    if (!B) return; if (location.hash && location.hash !== '#inicio') { B.go('inicio'); setTimeout(startTour, 700); return; }
    retire(); TI = 0; if (!tourEl) { tourEl = document.createElement('div'); tourEl.className = 'mo-tour'; document.body.appendChild(tourEl); }
    tourEl.innerHTML = '<div class="mo-spot"></div>' + WASP('hover', 'mo-twasp') + '<div class="mo-tcard" role="dialog" aria-live="polite"><div class="mo-tactor">' + fig('enter', '', 'sonriente', { nowasp: true }) + '</div><p></p><div class="btns"><button class="btn" data-act="mo-tour" data-d="end">Omitir</button><button class="btn" data-act="mo-tour" data-d="-1">Anterior</button><button class="btn solid" data-act="mo-tour" data-d="1">Siguiente</button></div><small></small></div>';
    tourEl.classList.add('on'); tourStep();
  }
  function tourStep() {
    const [sel, txt] = TOUR[TI]; const t = document.querySelector(sel);
    if (!t) { if (TI < TOUR.length - 1) { TI++; return tourStep(); } return endTour(); }
    t.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setTimeout(() => {
      const r = t.getBoundingClientRect(); const pad = 8; const spot = tourEl.querySelector('.mo-spot');
      Object.assign(spot.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
      const vw = innerWidth, vh = innerHeight; const card = tourEl.querySelector('.mo-tcard'); const actor = tourEl.querySelector('.mo-tactor');
      card.querySelector('p').textContent = txt; card.querySelector('small').textContent = (TI + 1) + ' de ' + TOUR.length;
      card.querySelector('[data-d="-1"]').disabled = TI === 0; card.querySelector('[data-d="1"]').textContent = TI === TOUR.length - 1 ? 'Terminar' : 'Siguiente';
      const below = r.top + r.height / 2 < vh / 2; card.style.top = below ? Math.min(vh - 220, r.bottom + 16) + 'px' : ''; card.style.bottom = below ? '' : (vh - r.top + 16) + 'px';
      // la tarjeta (con el Moreh) se desplaza junto al elemento; el Moreh camina y lo señala
      const toLeft = r.left + r.width / 2 < vw / 2; card.classList.toggle('flip', toLeft);
      const wsp = tourEl.querySelector('.mo-twasp'); Object.assign(wsp.style, { left: Math.min(vw - 60, Math.max(4, r.right - 34)) + 'px', top: Math.max(60, r.top - 30) + 'px' });
      expr(actor, TI === 0 ? 'sonriente' : TI === TOUR.length - 1 ? 'sonriente' : 'entusiasmado'); talk(actor, true); setTimeout(() => talk(actor, false), 2200);
      actor.querySelector('.mo-fig').className = 'mo-fig p-walk' + (toLeft ? ' mirror' : '');
      setTimeout(() => { actor.querySelector('.mo-fig').className = 'mo-fig p-point' + (toLeft ? ' mirror' : ''); }, 900);
    }, 380);
  }
  function endTour() { if (tourEl) { tourEl.classList.remove('on'); tourEl.innerHTML = ''; } TI = -1; setP('tour', true); }

  /* ---------- Mi camino de aprendizaje ---------- */
  function progress() {
    const S = B.Store; const L = S.get('learn', {}) || {}; const srs = L.srs || {};
    const letters = Object.keys(srs).filter(k => /^l-/.test(k) && (srs[k].b || 0) >= 2).length;
    const dic = (S.get('dic', {}) || {}).seen || []; const tf = Object.keys((S.get('tefilot', {}) || {}).uses || {});
    const bs = Object.keys((S.get('besora', {}) || {}).read || {}); const par = Object.keys(S.get('studied', {}) || {});
    const heard = Object.keys(S.get('audio:heard', {}) || {});
    return { letters, lessons: (L.st || {}).lessons || 0, words: dic.length, studies: bs.length + par.length, chapters: heard.length, tefilot: tf.length, xp: L.xp || 0, badges: Object.keys(L.badges || {}).length };
  }
  const GOALS = [['letters', 22, 'Las 22 letras', 'Reconociste las 22 letras del alef-bet'], ['lessons', 1, 'Primera lección', 'Completaste tu primera lección'], ['lessons', 10, '10 lecciones', 'Completaste 10 lecciones'], ['lessons', 50, '50 lecciones', 'Completaste 50 lecciones'],
    ['words', 10, '10 palabras', 'Consultaste 10 palabras en el diccionario'], ['words', 50, '50 palabras', 'Consultaste 50 palabras'], ['words', 150, '150 palabras', 'Consultaste 150 palabras'],
    ['studies', 5, '5 estudios', 'Leíste 5 estudios o parashiot'], ['studies', 20, '20 estudios', 'Leíste 20 estudios o parashiot'],
    ['chapters', 1, 'Primer capítulo escuchado', 'Escuchaste tu primer capítulo'], ['chapters', 10, '10 capítulos', 'Escuchaste 10 capítulos'], ['chapters', 50, '50 capítulos', 'Escuchaste 50 capítulos'],
    ['tefilot', 5, '5 tefilot', 'Leíste 5 tefilot distintas'], ['tefilot', 20, '20 tefilot', 'Leíste 20 tefilot distintas']];
  function checkGoals() {
    if (!B) return; const pr = progress(); const got = B.Store.get('camino', {}) || {}; let nw = null;
    GOALS.forEach(([k, n, t, d]) => { const id = k + n; if (!got[id] && pr[k] >= n) { got[id] = Date.now(); nw = d; } });
    if (nw) { B.Store.set('camino', got); setTimeout(() => celebrate(nw + '. ¡Kol hakavod! (Muy bien hecho.)'), 900); }
  }
  function vCamino() {
    const pr = progress(); const got = B.Store.get('camino', {}) || {};
    const card = (n, l, h, i) => '<div class="mo-stat"><span>' + B.ic(i) + '</span><b>' + n + '</b><small>' + l + '</small>' + (h ? '<a href="#' + h + '">Continuar</a>' : '') + '</div>';
    B.view().innerHTML = B.top('Mi camino de aprendizaje', { back: 'inicio' }) + '<div class="wrap mo-camino">' +
      '<div class="mo-chero">' + fig('welcome', '', pr.lessons || pr.words ? 'celebracion' : 'sonriente') + '<div><h2>Mi camino de aprendizaje</h2><p>' + esc(pr.lessons || pr.words || pr.chapters ? '¡Muy bien! Sigamos avanzando en el estudio de la Torá.' : 'Shalom (paz). Cada paso cuenta: comencemos hoy.') + '</p></div></div>' +
      '<div class="mo-stats">' + card(pr.letters + '/22', 'letras hebreas', 'aprender', 'alef') + card(pr.lessons, 'lecciones completadas', 'aprender', 'check') + card(pr.words, 'palabras consultadas', 'diccionario', 'dict') + card(pr.studies, 'estudios realizados', 'parashiot', 'study') + card(pr.chapters, 'capítulos escuchados', 'audio', 'play') + card(pr.tefilot, 'tefilot leídas', 'tefilot', 'pray') + card(pr.xp, 'puntos de experiencia', 'perfil-hebreo', 'star') + card(pr.badges, 'insignias del curso', 'perfil-hebreo', 'mark') + '</div>' +
      '<h3 class="h-sec" style="margin-top:22px">Reconocimientos</h3><div class="mo-goals">' + GOALS.map(([k, n, t, d]) => { const ok = !!got[k + n] || pr[k] >= n; return '<div class="mo-goal' + (ok ? ' ok' : '') + '">' + avatar(44, ok ? '' : 'mo-dim') + '<div><b>' + esc(t) + '</b><small>' + esc(ok ? d : 'Progreso: ' + Math.min(pr[k], n) + ' de ' + n) + '</small></div></div>'; }).join('') + '</div></div>';
    checkGoals();
  }

  /* ---------- Apariciones según el contexto ---------- */
  const seen = {};
  function onRoute() {
    if (!B || !active() || TI >= 0) return; checkGoals();
    const p = P(); const c = ctxOf(); if (p.mode !== 'guia' || c === 'otro' || c === 'aprender' || /^#(leccion|repaso|contrarreloj|prueba|aprende-|imagen|camino)/.test(location.hash)) return;
    const today = new Date().toDateString(); const key = c + '|' + today; const log = B.Store.get('moreh:log', {}) || {};
    const limit = p.freq === 'alta' ? 0 : p.freq === 'baja' ? 7 * 86400000 : 86400000;
    if (seen[c] || (log[c] && Date.now() - log[c] < limit)) return;
    seen[c] = 1; log[c] = Date.now(); B.Store.set('moreh:log', log);
    if (c === 'inicio' && !p.tour) return setTimeout(() => appear('Shalom (paz). Soy el Moreh de Beit Hatzirah. ¿Quieres que te muestre la aplicación?', [['Ahora no', 'dismiss-tour'], ['Comenzar recorrido', '!tour']], { big: true, pose: 'enter', after: 'welcome', stay: true }), 900);
    setTimeout(() => appear(msgFor(c), CTX[c].q.slice(0, 2), { big: c === 'inicio', after: c === 'inicio' ? 'welcome' : 'point' }), 700);
  }

  /* ---------- Acciones ---------- */
  Object.assign(EXT.act, {
    'moreh-open': () => { if (EXT.morehChat) { B.closeSheet && B.closeSheet(); B.go('moreh'); } else openPanel(); },
    'mo-do': el => { const a = el.dataset.a; if (a === 'dismiss-tour') { setP('tour', true); return retire(); } retire(); doAction(a); },
    'mo-dismiss': () => retire(),
    'mo-ask': () => { const i = document.getElementById('mo-q'); if (i && i.value.trim()) answer(i.value); },
    'mo-hide': () => { hiddenSession = true; apply(); B.closeSheet(); retire(); B.toast('El Moreh se ocultó hasta que vuelvas a abrir la app. Puedes llamarlo desde Configuración.'); B.route && B.route(); },
    'mo-show': () => { hiddenSession = false; setP('on', true); B.toast('El Moreh está de vuelta'); if (EXT.refreshSettings) EXT.refreshSettings(); },
    'mo-step': el => { LS.i = Math.max(0, Math.min(LS.steps.length - 1, LS.i + +el.dataset.d)); renderStep(LESSONS.find(x => x.id === LS.id)); window.scrollTo({ top: 0, behavior: 'smooth' }); },
    'mo-say': el => { if (EXT.speak) EXT.speak(el.dataset.h); },
    'mo-tour': el => { const d = el.dataset.d; if (d === 'end' || (d === '1' && TI === TOUR.length - 1)) return endTour(); TI = Math.max(0, TI + +d); tourStep(); },
    'mo-set': el => { const k = el.dataset.k; let v = el.dataset.v; if (v === 'toggle') v = !P()[k]; setP(k, v); if (k === 'on' && v) hiddenSession = false; if (EXT.refreshSettings) EXT.refreshSettings(); },
    'mo-tourstart': () => startTour(),
    'mo-pclose': el => { const k = el.dataset.k; const d = B.Store.get('moreh:pres', {}) || {}; d[k] = 1; B.Store.set('moreh:pres', d); const sec = el.closest('.mo-present'); if (sec) sec.remove(); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target && e.target.id === 'mo-q') { e.preventDefault(); answer(e.target.value); } });
  // panel de configuración (lo usa la pantalla de Configuración)
  API.settingsHTML = sw => {
    const p = P(); const seg = (k, opts) => '<div class="seg three mo-seg">' + opts.map(([v, l]) => '<button data-act="mo-set" data-k="' + k + '" data-v="' + v + '" aria-pressed="' + (p[k] === v) + '">' + l + '</button>').join('') + '</div>';
    return '<div class="group-title"><h3>El Moreh</h3></div>' +
      '<div class="opt"><span class="t">Asistente activado<span>El Moreh te acompaña y te orienta en cada sección</span></span>' + sw(p.on && !hiddenSession, 'mo-set" data-k="on" data-v="toggle', 'Asistente activado') + '</div>' +
      '<div class="opt"><span class="t">Animaciones<span>Al desactivarlas, el Moreh aparece quieto</span></span>' + sw(p.anim, 'mo-set" data-k="anim" data-v="toggle', 'Animaciones del Moreh') + '</div>' +
      '<div class="opt col"><span class="t">Modo<span>Guía: aparece al entrar en las secciones. Discreto: solo cuando lo llamas.</span></span>' + seg('mode', [['guia', 'Guía'], ['discreto', 'Discreto']]) + '</div>' +
      '<div class="opt col"><span class="t">Frecuencia de apariciones</span>' + seg('freq', [['baja', 'Baja'], ['normal', 'Normal'], ['alta', 'Alta']]) + '</div>' +
      '<div class="opt"><span class="t">Efectos sonoros<span>Sonidos de acierto, error y celebración</span></span>' + sw(p.sound, 'mo-set" data-k="sound" data-v="toggle', 'Efectos sonoros') + '</div>' +
      '<div class="btns" style="margin:10px 0 18px"><button class="btn" data-act="mo-tourstart">Iniciar el recorrido guiado</button><button class="btn" data-act="moreh-open">Pedir ayuda al Moreh</button><a class="btn" href="#camino">Mi camino de aprendizaje</a></div>';
  };
  API.headerBtn = () => active() ? '<button class="icon-btn mo-hdr" data-act="moreh-open" aria-label="Conversar con el Moreh">' + avatar(30, '', 'sonriente', true) + '</button>' : '';
  Object.assign(API, { fig, avatar, expr, talk, WASP, ctxOf, CTX, msgFor, LESSONS, active, P, scene, presenter, presSeen: k => !!((B.Store.get('moreh:pres', {}) || {})[k]) });

  const prevInit = EXT.init;
  EXT.init = api => { if (prevInit) prevInit(api); B = api; apply(); };
  Object.assign(EXT.routes, { camino: vCamino, aprende: vAprende });
  EXT.tabs.camino = ''; EXT.tabs.aprende = '';
  const prevLeave = EXT.leave;
  EXT.leave = () => { if (prevLeave) prevLeave(); if (!/^#aprende-/.test(location.hash)) LS.from = location.hash; retire(); setTimeout(onRoute, 50); };
})();
