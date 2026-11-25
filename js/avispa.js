/* BEIT HATZIRAH — La avispa (צִרְעָה): mascota de acompañamiento del curso de hebreo.
   Ilustración vectorial propia (SVG) con animaciones CSS ligeras. Se puede desactivar en Configuración
   y respeta la preferencia del sistema de reducir el movimiento. */
(function () {
  'use strict';
  const EXT = window.BH_EXT;
  let B = null;
  const prevInit = EXT.init;
  EXT.init = api => { if (prevInit) prevInit(api); B = api; };

  const SVG = '<svg class="wsp-svg" viewBox="0 0 140 120" aria-hidden="true">' +
    '<defs>' +
    '<linearGradient id="wspBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFDF6E"/><stop offset="1" stop-color="#EBA91E"/></linearGradient>' +
    '<linearGradient id="wspWing" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".92"/><stop offset="1" stop-color="#D3E7F3" stop-opacity=".55"/></linearGradient>' +
    '<radialGradient id="wspHead" cx=".42" cy=".35" r=".75"><stop offset="0" stop-color="#FFE68F"/><stop offset="1" stop-color="#F0B32A"/></radialGradient>' +
    '<clipPath id="wspAbd"><path d="M64 70 C58 56 36 54 22 66 C14 73 10 80 12 84 C24 92 52 88 64 76 Z"/></clipPath>' +
    '</defs>' +
    // alas largas y estrechas (detrás)
    '<g class="wsp-wing wsp-wing-b"><path d="M78 56 C68 30 44 18 33 22 C25 27 46 46 78 60 Z" fill="url(#wspWing)" stroke="#A3BCCB" stroke-width="1.1"/><path d="M74 55 C62 40 48 30 37 26" fill="none" stroke="#BCD0DC" stroke-width=".8"/></g>' +
    '<g class="wsp-wing wsp-wing-f"><path d="M84 54 C86 24 104 8 113 13 C121 20 104 40 84 58 Z" fill="url(#wspWing)" stroke="#A3BCCB" stroke-width="1.1"/><path d="M87 51 C93 35 103 22 110 16" fill="none" stroke="#BCD0DC" stroke-width=".8"/></g>' +
    // patas amarillas (visibles en fondo claro y oscuro)
    '<g stroke="#2B2118" stroke-width="4.4" stroke-linecap="round" fill="none"><path d="M74 72 L68 86 L64 90"/><path d="M84 74 L84 90 L80 94"/></g>' +
    '<g stroke="#F2B630" stroke-width="2.4" stroke-linecap="round" fill="none"><path d="M74 72 L68 86 L64 90"/><path d="M84 74 L84 90 L80 94"/></g>' +
    '<g class="wsp-arm"><path d="M92 70 Q100 78 106 74" stroke="#2B2118" stroke-width="4.4" stroke-linecap="round" fill="none"/><path d="M92 70 Q100 78 106 74" stroke="#F2B630" stroke-width="2.4" stroke-linecap="round" fill="none"/></g>' +
    // aguijón pequeño y redondeado
    '<path d="M14 82 L6 85.5 L14 87 Z" fill="#2B2118" stroke="#2B2118" stroke-width="2" stroke-linejoin="round"/>' +
    // abdomen alargado con franjas
    '<path d="M64 70 C58 56 36 54 22 66 C14 73 10 80 12 84 C24 92 52 88 64 76 Z" fill="url(#wspBody)"/>' +
    '<g clip-path="url(#wspAbd)" fill="#2B2118"><path d="M52 52 l7 0 l-6 40 l-7 0 Z"/><path d="M39 52 l7 0 l-6 40 l-7 0 Z"/><path d="M26 54 l7 0 l-6 40 l-7 0 Z"/><path d="M8 60 l10 0 l-6 34 l-10 0 Z"/></g>' +
    '<path d="M64 70 C58 56 36 54 22 66 C14 73 10 80 12 84 C24 92 52 88 64 76 Z" fill="none" stroke="#2B2118" stroke-width="2.2" stroke-linejoin="round"/>' +
    '<path d="M50 62 C42 59 32 61 26 66" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".45"/>' +
    // cintura fina (pecíolo) y tórax
    '<ellipse cx="67" cy="72" rx="4.5" ry="3.2" fill="#2B2118"/>' +
    '<ellipse cx="81" cy="66" rx="13" ry="11.5" fill="#2B2118"/>' +
    '<path d="M74 60 Q81 56 88 60" fill="none" stroke="#F2B630" stroke-width="2.6" stroke-linecap="round"/>' +
    // cabeza
    '<g class="wsp-head">' +
    '<path d="M100 36 Q98 22 90 16" fill="none" stroke="#2B2118" stroke-width="2.2" stroke-linecap="round"/><circle cx="89.5" cy="15" r="3.3" fill="#C6A15B" stroke="#2B2118" stroke-width="1.4"/>' +
    '<path d="M110 37 Q114 24 122 19" fill="none" stroke="#2B2118" stroke-width="2.2" stroke-linecap="round"/><circle cx="122.5" cy="18.5" r="3.3" fill="#C6A15B" stroke="#2B2118" stroke-width="1.4"/>' +
    '<circle cx="104" cy="56" r="20" fill="url(#wspHead)" stroke="#2B2118" stroke-width="2.2"/>' +
    '<path d="M86 48 Q104 32 122 48 Q113 41 104 41 Q95 41 86 48 Z" fill="#2B2118"/>' +
    '<g class="wsp-eyes"><ellipse cx="97" cy="55" rx="5.8" ry="6.8" fill="#fff" stroke="#2B2118" stroke-width="1.4"/><ellipse cx="112" cy="55" rx="5.8" ry="6.8" fill="#fff" stroke="#2B2118" stroke-width="1.4"/>' +
    '<circle class="wsp-pupil" cx="99" cy="56.5" r="3.4" fill="#2B2118"/><circle class="wsp-pupil" cx="114" cy="56.5" r="3.4" fill="#2B2118"/>' +
    '<circle cx="100.2" cy="55" r="1.2" fill="#fff"/><circle cx="115.2" cy="55" r="1.2" fill="#fff"/></g>' +
    '<ellipse cx="91" cy="65" rx="3.4" ry="2.1" fill="#F28C8C" opacity=".55"/><ellipse cx="118" cy="65" rx="3.4" ry="2.1" fill="#F28C8C" opacity=".55"/>' +
    '<path class="wsp-mouth" d="M100 66 Q105 71 110 66" fill="none" stroke="#2B2118" stroke-width="2" stroke-linecap="round"/>' +
    '</g></svg>';

  // rostro pequeño de la avispa para los mensajes dentro de la lección
  const FACE = '<svg viewBox="80 30 50 50" width="26" height="26"><circle cx="104" cy="56" r="20" fill="#F7C548" stroke="#2B2118" stroke-width="2.4"/><path d="M86 48 Q104 32 122 48 Q113 41 104 41 Q95 41 86 48 Z" fill="#2B2118"/><ellipse cx="97" cy="55" rx="5.8" ry="6.8" fill="#fff" stroke="#2B2118" stroke-width="1.4"/><ellipse cx="112" cy="55" rx="5.8" ry="6.8" fill="#fff" stroke="#2B2118" stroke-width="1.4"/><circle cx="99" cy="56.5" r="3.4" fill="#2B2118"/><circle cx="114" cy="56.5" r="3.4" fill="#2B2118"/><path d="M100 66 Q105 71 110 66" fill="none" stroke="#2B2118" stroke-width="2" stroke-linecap="round"/></svg>';
  const TIPS = [
    'El hebreo se lee de derecha a izquierda.',
    'Con el punto (daguesh), בּ suena «b», כּ suena «k» y פּ suena «p». Sin el punto: ב «v», כ «j», פ «f».',
    'La שׁ (Shin) lleva el punto a la derecha y suena «sh»; la שׂ (Sin) lo lleva a la izquierda y suena «s».',
    'Cinco letras cambian de forma al final de la palabra: ך ם ן ף ץ.',
    'La א (Álef) y la ע (Áyin) no tienen sonido propio: sostienen la vocal que las acompaña.',
    'La ח (Jet) suena como la «j» española; la ה (He) es una «h» aspirada y suave.',
    'La ו (Vav) suena «v». Con un punto encima, וֹ, se lee «o»; con un punto al lado, וּ, se lee «u».',
    'La ו (Vav) al comienzo de una palabra suele significar «y»: וְאוֹר «y luz».',
    'Muchas palabras nacen de una raíz de tres letras: ש־מ־ר «guardar» da שָׁמַר «guardó» y מִשְׁמֶרֶת «guardia».',
    'El shvá (ְ) al comienzo de una palabra se pronuncia como una «e» breve: בְּרֵאשִׁית «Bereshit».',
    'Para escribir bien una letra, empieza por el trazo de arriba y luego baja.',
    'Repasa un poco cada día: la constancia vale más que una sesión larga.',
    'Escucha la palabra y repítela en voz alta: así se graba mejor.',
    'הַ al comienzo de una palabra significa «el» o «la»: הָאָרֶץ «la tierra».'];
  const MSG = {
    home: ['¡Shalom! (¡Paz!) Hoy aprenderemos algo nuevo.', '¡Shalom! ¿Seguimos aprendiendo hebreo con la Torá?', '¡Bienvenido! Cada letra te acerca a leer la Torá en su idioma.'],
    lesson: ['¡Vamos! Tú puedes.', '¡Comencemos! Lee con calma.', 'Presta atención a cada letra.'],
    letter: ['¡Muy bien! Estás aprendiendo una nueva letra.', 'Mira bien su forma y escucha su sonido.', 'Esta letra aparece en la Torá. ¡Descúbrela!'],
    ok: ['¡Correcto!', '¡Yofí! (¡Qué bien!)', '¡Muy bien!', '¡Exacto!', '¡Excelente!'],
    bad: ['¡Casi! Inténtalo una vez más.', 'No pasa nada: así se aprende.', '¡Ánimo! Mira la respuesta y sigue.', '¡Jazak! (¡Sé fuerte!) Lo lograrás.'],
    streak: ['¡Racha de {n} respuestas seguidas!', '¡{n} aciertos seguidos! ¡Kol hakavod! (¡Muy bien hecho!)'],
    done: ['¡Kol hakavod! (¡Muy bien hecho!) Has completado esta lección.', '¡Lección completada! ¡Todá! (¡Gracias!) por estudiar hoy.'],
    level: ['¡Vamos por el siguiente nivel!', '¡Subiste de nivel! ¡Kol hakavod! (¡Muy bien hecho!)'],
    unit: ['¡Unidad aprobada! ¡Vamos por la siguiente!', '¡Examen aprobado! ¡Kol hakavod! (¡Muy bien hecho!)']
  };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const on = () => { const p = B && B.Store.get('avispa', null); return !p || p.on !== false; };
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  let el = null, bubbleT = null, actT = null, place = 'home';
  function mount() {
    if (el) return el;
    el = document.createElement('div'); el.className = 'wsp'; el.setAttribute('role', 'button'); el.tabIndex = 0;
    el.setAttribute('aria-label', 'Avispa de Beit Hatzirah: toca para un consejo');
    el.innerHTML = '<div class="wsp-bubble" role="status" aria-live="polite"></div><div class="wsp-fly">' + SVG + '</div>';
    el.addEventListener('click', () => tap()); el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(); } });
    document.body.appendChild(el); return el;
  }
  function act(cls, ms) {
    if (!el) return; el.classList.remove('a-ok', 'a-bad', 'a-buzz', 'a-party', 'a-point', 'a-tap');
    void el.offsetWidth; el.classList.add(cls); clearTimeout(actT); actT = setTimeout(() => el && el.classList.remove(cls), ms || 1200);
  }
    function inLesson() { return el && el.parentNode && el.parentNode.classList && el.parentNode.classList.contains('lx-wsp-slot'); }
  function attach() { if (!el || place !== 'lesson') return; const slot = document.querySelector('.lx-wsp-slot'); if (slot && el.parentNode !== slot) slot.appendChild(el); }
  function say(text, ms) {
    if (!el) return;
    if (inLesson()) {   // en la lección el mensaje va dentro de la tarjeta o de la barra de respuesta, sin tapar el contenido
      setTimeout(() => { const host = document.querySelector('#lx-fb .lx-fb') || document.querySelector('.lx-card.intro'); if (!host) return; const old = host.querySelector('.wsp-line'); if (old) old.remove(); host.insertAdjacentHTML('beforeend', '<div class="wsp-line"><span class="wsp-face" aria-hidden="true">' + FACE + '</span><span>' + B.esc(text) + '</span></div>'); }, 40);
      return;
    } const b = el.querySelector('.wsp-bubble'); b.textContent = text; el.classList.add('talk');
    clearTimeout(bubbleT); bubbleT = setTimeout(() => el && el.classList.remove('talk'), ms || 3800);
  }
  function show(where, msg) {
    if (!on()) { hide(); return; }
    mount(); place = where; el.dataset.place = where; el.classList.remove('gone');
    if (where === 'lesson') attach(); else if (el.parentNode !== document.body) document.body.appendChild(el);
    if (!el.classList.contains('in')) { el.classList.add('in', reduced() ? 'still' : 'arrive'); setTimeout(() => el && el.classList.remove('arrive'), 1400); }
    if (msg) setTimeout(() => say(msg), reduced() ? 0 : 900);
  }
  function hide() { if (el) { el.classList.add('gone'); el.classList.remove('in', 'talk'); } }
  function tap() { act('a-tap', 900); say(pick(TIPS), 5200); }
  let lastTip = 0;
  const W = {
    show, hide, say,
    home: () => show('home', pick(MSG.home)),
    lesson: () => show('lesson'), attach,
    letter: it => { if (!el || !on()) return; act('a-point', 1300); if (Date.now() - lastTip > 20000) { lastTip = Date.now(); say(it && it.kind === 'letters' ? pick(MSG.letter) : pick(TIPS), 4200); } },
    buzz: () => { if (el && on()) act('a-buzz', 1000); },
    ok: combo => { if (!el || !on()) return; act('a-ok', 1100); if (combo && (combo === 3 || combo === 5 || combo % 10 === 0)) say(pick(MSG.streak).replace('{n}', combo), 3200); },
    bad: () => { if (!el || !on()) return; act('a-bad', 1300); say(pick(MSG.bad), 3000); },
    done: () => { show('done'); act('a-party', 1800); say(pick(MSG.done), 4500); },
    level: () => { show('done'); act('a-party', 2200); say(pick(MSG.level), 4500); },
    unit: () => { show('done'); act('a-party', 2200); say(pick(MSG.unit), 4500); },
    enabled: on
  };
  EXT.wasp = W;
  const obs = new MutationObserver(() => { if (place === 'lesson') attach(); });
  document.addEventListener('DOMContentLoaded', () => { const m = document.querySelector('main') || document.body; obs.observe(m, { childList: true }); });
  if (document.readyState !== 'loading') { const m = document.querySelector('main') || document.body; obs.observe(m, { childList: true }); }
  EXT.act['wsp-toggle'] = () => { const p = B.Store.get('avispa', {}) || {}; p.on = !on(); B.Store.set('avispa', p); if (!p.on) hide(); B.toast(p.on ? 'La avispa te acompañará en el curso' : 'Avispa desactivada'); if (EXT.refreshSettings) EXT.refreshSettings(); };
  const LEARN = /^#(aprender|leccion|repaso|contrarreloj|nivel|prueba|mis-palabras|perfil-hebreo|vocabparasha|trazar)/;
  const prevLeave = EXT.leave;
  EXT.leave = () => { if (prevLeave) prevLeave(); if (!LEARN.test(location.hash)) hide(); };
})();
