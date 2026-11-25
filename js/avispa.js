/* BEIT HATZIRAH — La avispa: presencia por contexto.
   - Guía (curso de hebreo): acompaña, señala, celebra y orienta.
   - Compañía discreta (diccionario, estudios, gematría): integrada en la página, nunca encima del contenido.
   - Segundo plano (audio, tefilot): pequeña y quieta; en el audio solo mueve las alas mientras suena.
   - Logros: breve vuelo circular de celebración.
   Animaciones: vuelo, estacionario, aterrizaje, observación, celebración, enseñanza y espera.
   Se pueden desactivar en Configuración (la avispa sigue visible, sin movimiento). */
(function () {
  'use strict';
  const EXT = window.BH_EXT;
  let B = null;
  const ART = (v, c) => window.BH_WASP_ART(v, c);
  const prevInit = EXT.init;
  EXT.init = api => {
    if (prevInit) prevInit(api); B = api; applyMotion();
    try { document.documentElement.style.setProperty('--wasp-load', 'url("data:image/svg+xml;charset=utf-8,' + encodeURIComponent(ART('simple').replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')) + '")'); } catch (e) { }
  };
  const motion = () => { const p = B && B.Store.get('avispa', null); return !p || p.on !== false; };
  function applyMotion() { document.documentElement.classList.toggle('wsp-still', !motion()); }

  /* ---------- Mensajes y consejos ---------- */
  const TIPS = {
    hebreo: ['El hebreo se lee de derecha a izquierda.',
      'Con el punto (daguesh), בּ suena «b», כּ suena «k» y פּ suena «p». Sin el punto: ב «v», כ «j», פ «f».',
      'La שׁ (Shin) lleva el punto a la derecha y suena «sh»; la שׂ (Sin) lo lleva a la izquierda y suena «s».',
      'Cinco letras cambian de forma al final de la palabra: ך ם ן ף ץ.',
      'La א (Álef) y la ע (Áyin) no tienen sonido propio: sostienen la vocal que las acompaña.',
      'La ח (Jet) suena como la «j» española; la ה (He) es una «h» aspirada y suave.',
      'La ו (Vav) suena «v». Con un punto encima, וֹ, se lee «o»; con un punto al lado, וּ, se lee «u».',
      'El shvá (ְ) al comienzo de una palabra se pronuncia como una «e» breve: בְּרֵאשִׁית «Bereshit».',
      'Repasa un poco cada día: la constancia vale más que una sesión larga.',
      'Escucha la palabra y repítela en voz alta: así se graba mejor.'],
    diccionario: ['La mayoría de las palabras hebreas nacen de una raíz de tres consonantes: conocerla abre toda su familia.',
      'הַ al comienzo de una palabra es el artículo «el, la»; וְ es «y»; בְּ es «en»; לְ es «a, para».',
      'Las terminaciones ־ִים y ־וֹת suelen indicar plural (masculino y femenino).',
      'Una misma raíz puede dar un verbo, un sustantivo y un adjetivo: ק־ד־שׁ da קָדוֹשׁ «santo» y קֹדֶשׁ «santidad».',
      'La primera aparición de una palabra en la Torá ayuda a entender su sentido básico.',
      'Mira cuántas veces aparece una palabra: las más frecuentes son la base del vocabulario bíblico.'],
    estudio: ['Lee el pasaje completo antes de estudiar sus detalles: el contexto da el sentido.',
      'Distingue lo que el texto dice de lo que interpretamos sobre él.',
      'Anota tus preguntas: el estudio de la Torá avanza preguntando.',
      'Compara el pasaje con otros textos de las Escrituras que tratan el mismo tema.',
      'La Torá no es solamente para ser estudiada; es para ser vivida.'],
    gematria: ['Cada letra hebrea tiene un valor numérico: א = 1, י = 10, ק = 100.',
      'Las coincidencias numéricas invitan a reflexionar, pero no prueban una doctrina.']
  };
  const MSG = {
    home: ['¡Shalom! (Paz.) Hoy aprenderemos algo nuevo.', '¡Shalom! Continuemos aprendiendo hebreo con la Torá.', 'Cada letra te acerca a leer la Torá en su idioma.'],
    letter: ['Observa su forma y escucha su sonido.', 'Una nueva letra: mírala con atención.', 'Esta letra aparece en la Torá: búscala en el ejemplo.'],
    bad: ['Inténtalo una vez más.', 'Así también se aprende: mira la respuesta y continúa.', '¡Jazak! (Sé fuerte.) Lo lograrás.'],
    streak: ['{n} respuestas correctas seguidas.', '{n} aciertos seguidos. ¡Kol hakavod! (Muy bien hecho.)'],
    done: ['¡Kol hakavod! (Muy bien hecho.) Has completado esta lección.', 'Lección completada. ¡Todá! (Gracias) por estudiar hoy.'],
    level: ['Has alcanzado un nuevo nivel. ¡Kol hakavod! (Muy bien hecho.)', 'Nuevo nivel alcanzado. Vamos por el siguiente.'],
    unit: ['Unidad aprobada. ¡Kol hakavod! (Muy bien hecho.)', 'Examen aprobado. La siguiente unidad te espera.']
  };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const seeded = (a, seed) => a[Math.abs([...String(seed)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)) % a.length];

  /* ---------- Presencia integrada en la página ---------- */
  // mode: hover (estacionario) | wait (espera) | land (aterrizaje) | observe (observación) | still (sin movimiento)
  function inline(mode, size, variant, cls) {
    size = size || 44;
    return '<span class="wsp-i m-' + (mode || 'wait') + ' ' + (cls || '') + '" style="--ws:' + size + 'px" aria-hidden="true">' + ART(variant || (size < 40 ? 'simple' : 'main')) + '</span>';
  }
  function tip(kind, seed, label) {
    if (!B) return '';
    const t = seed === undefined ? pick(TIPS[kind]) : seeded(TIPS[kind], seed);
    return '<aside class="wsp-tip">' + inline('observe', 46, 'simple') + '<div><small>' + (label || 'Consejo') + '</small><p>' + B.esc(t) + '</p></div></aside>';
  }

  /* ---------- Guía del curso de hebreo ---------- */
  let el = null, bubbleT = null, actT = null, place = 'home';
  function mount() {
    if (el) return el;
    el = document.createElement('div'); el.className = 'wsp'; el.setAttribute('role', 'button'); el.tabIndex = 0;
    el.setAttribute('aria-label', 'Avispa de Beit Hatzirah: toca para un consejo');
    el.innerHTML = '<div class="wsp-bubble" role="status" aria-live="polite"></div><div class="wsp-fly">' + ART('main') + '</div>';
    el.addEventListener('click', () => tap()); el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(); } });
    return el;
  }
  function act(cls, ms) {
    if (!el) return; el.classList.remove('a-ok', 'a-bad', 'a-buzz', 'a-party', 'a-point', 'a-tap');
    void el.offsetWidth; el.classList.add(cls); clearTimeout(actT); actT = setTimeout(() => el && el.classList.remove(cls), ms || 1400);
  }
  function inLesson() { return el && el.parentNode && el.parentNode.classList && el.parentNode.classList.contains('lx-wsp-slot'); }
  function inDock() { return el && el.parentNode && el.parentNode.classList && el.parentNode.classList.contains('lx-hero-slot'); }
  // la avispa se posa en un lugar reservado de la página (encabezado de la lección, del curso o del resultado)
  function attach() {
    if (!el) return; const sel = place === 'lesson' ? '.lx-wsp-slot' : '.lx-hero-slot'; const slot = document.querySelector(sel);
    if (slot) { if (el.parentNode !== slot) { slot.appendChild(el); if (place !== 'lesson') { el.classList.remove('arrive'); void el.offsetWidth; el.classList.add('arrive'); } } return true; }
    return false;
  }
  function say(text, ms) {
    if (!el) return;
    if (inLesson()) {   // en la lección el mensaje va dentro de la tarjeta o de la barra de respuesta, sin tapar el contenido
      setTimeout(() => { const host = document.querySelector('#lx-fb .lx-fb') || document.querySelector('.lx-card.intro'); if (!host) return; const old = host.querySelector('.wsp-line'); if (old) old.remove(); host.insertAdjacentHTML('beforeend', '<div class="wsp-line">' + inline('still', 34, 'simple') + '<span>' + B.esc(text) + '</span></div>'); }, 40);
      return;
    }
    if (inDock()) { const sp = document.querySelector('.lx-hero-say'); if (sp) { sp.textContent = text; sp.classList.add('on'); clearTimeout(bubbleT); bubbleT = setTimeout(() => sp.classList.remove('on'), ms || 6000); } return; }
    const b = el.querySelector('.wsp-bubble'); b.textContent = text; el.classList.add('talk');
    clearTimeout(bubbleT); bubbleT = setTimeout(() => el && el.classList.remove('talk'), ms || 4200);
  }
  function show(where, msg) {
    mount(); place = where; el.dataset.place = where; el.classList.remove('gone');
    if (!attach() && el.parentNode !== document.body) document.body.appendChild(el);
    if (!el.classList.contains('in')) { el.classList.add('in', 'arrive'); setTimeout(() => el && el.classList.remove('arrive'), 1700); }
    if (msg) setTimeout(() => say(msg), motion() ? 1200 : 0);
  }
  function hide() { if (el) { el.classList.add('gone'); el.classList.remove('in', 'talk'); } }
  function tap() { act('a-tap', 1100); say(pick(TIPS.hebreo), 5600); }
  let lastTip = 0;

  /* ---------- Celebración de logros ---------- */
  function celebrate(text) {
    if (!B) return;
    const c = document.createElement('div'); c.className = 'wsp-celebrate'; c.setAttribute('role', 'status');
    c.innerHTML = '<span class="wsp-orbit">' + ART('main') + '</span><p>' + B.esc(text) + '</p>';
    document.body.appendChild(c); setTimeout(() => c.classList.add('out'), 2800); setTimeout(() => c.remove(), 3400);
  }

  const W = {
    show, hide, say, attach, inline, tip, celebrate, art: ART, motion,
    home: () => show('home', pick(MSG.home)),
    lesson: () => show('lesson'),
    letter: it => { if (!el) return; act('a-point', 1600); if (Date.now() - lastTip > 20000) { lastTip = Date.now(); say(it && it.kind === 'letters' ? pick(MSG.letter) : pick(TIPS.hebreo), 4500); } },
    buzz: () => { if (el) act('a-buzz', 1300); },
    ok: combo => { if (!el) return; act('a-ok', 1000); if (combo && (combo === 3 || combo === 5 || combo % 10 === 0)) say(pick(MSG.streak).replace('{n}', combo), 3200); },
    bad: () => { if (!el) return; act('a-bad', 1400); say(pick(MSG.bad), 3200); },
    done: () => { show('done'); act('a-party', 2000); say(pick(MSG.done), 4800); },
    level: () => { show('done'); celebrate(pick(MSG.level)); },
    unit: () => { show('done'); celebrate(pick(MSG.unit)); },
    badge: name => celebrate('Nueva insignia: ' + name),
    enabled: motion
  };
  EXT.wasp = W;
  EXT.act['wsp-toggle'] = () => { const p = B.Store.get('avispa', {}) || {}; p.on = !motion(); B.Store.set('avispa', p); applyMotion(); B.toast(p.on ? 'Animaciones de la avispa activadas' : 'La avispa queda quieta, sin animaciones'); if (EXT.refreshSettings) EXT.refreshSettings(); };
  const obs = new MutationObserver(() => { if (el && !el.classList.contains('gone')) attach(); });
  const startObs = () => { const m = document.querySelector('main') || document.body; obs.observe(m, { childList: true }); };
  if (document.readyState !== 'loading') startObs(); else document.addEventListener('DOMContentLoaded', startObs);
  const LEARN = /^#(aprender|leccion|repaso|contrarreloj|nivel|prueba|mis-palabras|perfil-hebreo|vocabparasha|trazar)/;
  const prevLeave = EXT.leave;
  EXT.leave = () => { if (prevLeave) prevLeave(); if (!LEARN.test(location.hash)) hide(); };
})();
