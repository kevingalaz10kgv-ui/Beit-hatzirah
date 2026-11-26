/* BEIT HATZIRAH — Sistema gráfico del avispón amarillo de Beit Hatzirah (mismo personaje y anatomía; paleta amarilla, negra y dorada).
   Una sola anatomía, cuatro versiones: 'main' (detallada, metálica), 'simple' (espacios pequeños),
   'mono' (monocromática, usa currentColor) e 'badge' (para insignias y logros). */
(function () {
  'use strict';
  let uid = 0;
  // Anatomía común (vista de tres cuartos, mirando a la derecha). Coordenadas en un lienzo de 160 x 120.
  const P = {
    wingBack: 'M86 50 C76 32 60 16 42 10 C28 6 18 12 21 22 C24 32 48 42 86 54 Z',
    wingFront: 'M94 48 C96 28 108 12 124 6 C137 2 146 10 141 21 C136 33 116 44 96 54 Z',
    veinsBack: 'M84 52 C66 40 46 26 26 16 M72 45 C60 41 46 37 32 31 M62 36 C56 27 48 19 40 14 M50 32 C42 31 34 28 26 25 M68 42 L60 29 M56 37 L46 25',
    veinsFront: 'M96 51 C108 38 122 22 136 10 M102 45 C112 41 124 33 137 24 M104 36 C108 27 115 18 124 10 M112 41 C120 39 129 35 138 30 M108 32 L118 36 M114 25 L125 29',
    petiole: 'M80 64 C76 62 72 64 72 67 C72 70 76 72 80 70 Z',
    abd: 'M74 63 C66 53 46 52 30 59 C17 65 7 75 2 85 C12 90 32 89 48 83 C62 78 71 73 74 69 Z',
    bands: ['M62 50 C57 62 57 75 62 88', 'M48 50 C43 62 43 76 47 90', 'M34 54 C29 65 29 78 33 92', 'M21 61 C16 70 16 81 19 92'],
    thorax: 'M78 58 C80 48 92 44 102 47 C110 50 113 59 110 67 C106 75 94 78 85 75 C79 72 76 65 78 58 Z',
    head: 'M106 50 C110 42 121 40 127 45 C133 51 133 61 128 67 C123 73 113 73 108 69 C103 64 103 56 106 50 Z',
    eye: 'M114 45 C121 41 128 46 129 55 C129 63 124 69 118 68 C115 67 114 64 116 61 C118 58 117 54 114 51 C113 49 113 47 114 45 Z',
    mandible: 'M128 66 C132 69 132 73 128 75 M124 68 C125 72 123 75 120 75',
    antenna1: 'M116 43 C117 32 123 24 132 20 C136 18 140 19 142 21',
    antenna2: 'M121 44 C125 35 132 29 141 28 C145 28 148 29 150 31',
    legs: ['M84 72 L78 84 L72 94 L68 98', 'M94 75 L94 87 L90 98 L88 102', 'M104 70 L111 80 L117 90 L121 94'],
    stinger: 'M3 84 L-6 89 L4 88 Z'
  };
  function defs(id) {
    return '<defs>' +
      '<linearGradient id="m' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE680"/><stop offset=".35" stop-color="#FFD22E"/><stop offset=".72" stop-color="#E8A600"/><stop offset="1" stop-color="#A86F00"/></linearGradient>' +
      '<linearGradient id="d' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5A4A36"/><stop offset=".45" stop-color="#241C14"/><stop offset="1" stop-color="#0E0A07"/></linearGradient>' +
      '<linearGradient id="w' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".72"/><stop offset=".6" stop-color="#FFF1C9" stop-opacity=".42"/><stop offset="1" stop-color="#E9C46A" stop-opacity=".32"/></linearGradient>' +
      '<radialGradient id="e' + id + '" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#7A5A2A"/><stop offset=".35" stop-color="#2A1E12"/><stop offset="1" stop-color="#0A0705"/></radialGradient>' +
      '<pattern id="f' + id + '" width="3.2" height="3.2" patternUnits="userSpaceOnUse"><circle cx="1.6" cy="1.6" r=".75" fill="#FFFFFF" opacity=".10"/></pattern>' +
      '<filter id="s' + id + '" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="3" stdDeviation="2.4" flood-color="#000" flood-opacity=".35"/></filter>' +
      '</defs>';
  }
  function body(id, simple, mono) {
    const metal = mono ? 'currentColor' : 'url(#m' + id + ')', dark = mono ? 'currentColor' : 'url(#d' + id + ')', wing = mono ? 'none' : 'url(#w' + id + ')';
    const line = mono ? 'currentColor' : '#1A1510', vein = mono ? 'currentColor' : '#B08A3C';
    const mOp = mono ? ' fill-opacity=".85"' : '', dOp = mono ? ' fill-opacity="1"' : '';
    let s = '';
    // alas
    s += '<g class="wsp-wing wsp-wing-b"><path d="' + P.wingBack + '" fill="' + wing + '" stroke="' + vein + '" stroke-width="1.1"' + (mono ? ' stroke-opacity=".8"' : '') + '/>' + (simple ? '' : '<path d="' + P.veinsBack + '" fill="none" stroke="' + vein + '" stroke-width=".7" stroke-opacity=".8"/>') + '</g>';
    s += '<g class="wsp-wing wsp-wing-f"><path d="' + P.wingFront + '" fill="' + wing + '" stroke="' + vein + '" stroke-width="1.1"' + (mono ? ' stroke-opacity=".8"' : '') + '/>' + (simple ? '' : '<path d="' + P.veinsFront + '" fill="none" stroke="' + vein + '" stroke-width=".7" stroke-opacity=".8"/>') + '</g>';
    // patas
    s += '<g class="wsp-legs" fill="none" stroke-linecap="round" stroke-linejoin="round">' + P.legs.map((d, i) => '<path class="wsp-leg' + (i === 2 ? ' wsp-arm' : '') + '" d="' + d + '" stroke="' + (mono ? 'currentColor' : '#1A1510') + '" stroke-width="' + (simple ? 3 : 2.6) + '"/>' + (simple || mono ? '' : '<path d="' + d + '" stroke="#F2B705" stroke-width=".9" stroke-opacity=".7"/>')).join('') + '</g>';
    // abdomen liso y afilado, con bandas (recortadas a su silueta)
    s += '<path d="' + P.stinger + '" fill="' + dark + '"' + dOp + '/>';
    s += '<clipPath id="c' + id + '"><path d="' + P.abd + '"/></clipPath>';
    s += '<g class="wsp-abd"><path d="' + P.abd + '" fill="' + metal + '"' + mOp + '/>' +
      '<g clip-path="url(#c' + id + ')" fill="none" stroke="' + (mono ? 'currentColor' : 'url(#d' + id + ')') + '" stroke-width="' + (simple ? 8 : 7) + '"' + (mono ? ' stroke-opacity=".55"' : '') + '>' + P.bands.map(d => '<path d="' + d + '"/>').join('') + '</g>' +
      '<path d="' + P.abd + '" fill="none" stroke="' + line + '" stroke-width="1.3"/></g>';
    if (!simple && !mono) s += '<path d="M68 58 C56 54 42 55 30 61 C22 65 16 70 12 75" fill="none" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" opacity=".55"/>';
    s += '<path d="' + P.petiole + '" fill="' + dark + '"' + dOp + '/>';
    // tórax
    s += '<path d="' + P.thorax + '" fill="' + dark + '"' + dOp + ' stroke="' + line + '" stroke-width="1.2"/>';
    if (!simple && !mono) s += '<path d="M84 53 C90 48 99 48 105 52" fill="none" stroke="#E4C989" stroke-width="2.2" stroke-linecap="round" opacity=".7"/><path d="M85 66 C92 70 100 70 106 65" fill="none" stroke="#F2C94C" stroke-width="1" opacity=".5"/>' +
      '<g stroke="#D9A93A" stroke-width=".6" opacity=".5">' + Array.from({ length: 12 }, (_, k) => '<path d="M' + (82 + k * 2.3) + ' ' + (52 - (k % 3) * 0.8) + ' l-.8 -3.2"/>').join('') + '</g>';
    // cabeza
    s += '<g class="wsp-head">';
    s += '<path d="' + P.antenna1 + '" fill="none" stroke="' + (mono ? 'currentColor' : '#1A1510') + '" stroke-width="2" stroke-linecap="round"/><path d="' + P.antenna2 + '" fill="none" stroke="' + (mono ? 'currentColor' : '#1A1510') + '" stroke-width="2" stroke-linecap="round"/>';
    s += '<path d="' + P.head + '" fill="' + metal + '"' + mOp + ' stroke="' + line + '" stroke-width="1.2"/>';
    if (!mono) s += '<path d="M106 50 C110 42 121 40 127 45 C129 47 130 49 131 52 C123 47 114 46 106 50 Z" fill="' + dark + '"/>';
    s += '<circle cx="142" cy="21" r="2.4" fill="' + (mono ? 'currentColor' : '#C6A15B') + '"/><circle cx="150" cy="31" r="2.4" fill="' + (mono ? 'currentColor' : '#C6A15B') + '"/>';
    s += '<path class="wsp-eye" d="' + P.eye + '" fill="' + (mono ? 'currentColor' : 'url(#e' + id + ')') + '"/>';
    if (!simple && !mono) s += '<path d="' + P.eye + '" fill="url(#f' + id + ')"/><path d="M118 47 C122 45 126 47 127 51" fill="none" stroke="#FFFFFF" stroke-width="1.4" stroke-linecap="round" opacity=".55"/>';
    s += '<path d="' + P.mandible + '" fill="none" stroke="' + (mono ? 'currentColor' : '#1A1510') + '" stroke-width="2" stroke-linecap="round"/>';
    s += '</g>';
    return s;
  }
  /* Devuelve el SVG de la avispa. variant: 'main' | 'simple' | 'mono' | 'badge'. */
  function art(variant, cls) {
    const id = 'wa' + (++uid); variant = variant || 'main';
    const simple = variant === 'simple', mono = variant === 'mono';
    if (variant === 'badge') {
      return '<svg class="wsp-badge ' + (cls || '') + '" viewBox="0 0 120 120" aria-hidden="true">' + defs(id) +
        '<circle cx="60" cy="60" r="56" fill="url(#d' + id + ')"/><circle cx="60" cy="60" r="52" fill="none" stroke="url(#m' + id + ')" stroke-width="4"/><circle cx="60" cy="60" r="44" fill="none" stroke="url(#m' + id + ')" stroke-width="1.5" opacity=".8"/>' +
        '<g transform="translate(14 22) scale(.58)">' + body(id, false, false) + '</g></svg>';
    }
    return '<svg class="wsp-art ' + (cls || '') + '" viewBox="-8 -4 168 112" aria-hidden="true">' + defs(id) + '<g' + (mono ? '' : ' filter="url(#s' + id + ')"') + '>' + body(id, simple, mono) + '</g></svg>';
  }
  window.BH_WASP_ART = art;
})();
