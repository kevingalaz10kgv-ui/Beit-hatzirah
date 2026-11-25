/* BEIT HATZIRAH — Estudio de imágenes de versículos.
   1) Se pinta el fondo (ilustración generada por la app: cielos, montañas, desierto, olivos, mar, pergamino).
   2) Se compone el texto bíblico con tipografía real (nunca dentro de la ilustración), sin cambiar ninguna palabra.
   Formatos: 1:1, 4:5 y 9:16. Idioma: español, hebreo o ambos. */
(function () {
  'use strict';
  const EXT = window.BH_EXT;
  let B = null;
  const prevInit = EXT.init;
  EXT.init = api => { if (prevInit) prevInit(api); B = api; };
  const esc = s => B.esc(s);
  const HEF = '"BH Hebrew", "Noto Serif Hebrew", serif', ESF = '"BH Serif", Georgia, serif';
  /* Fondos oficiales: la imagen se usa tal cual (sin recortes ni cambios). text = zona del texto y avoid = zona del logo,
     en coordenadas de la imagen original. Para sumar un fondo nuevo basta con agregar otra entrada. */
  const FONDOS = [
    { id: 'jerusalen', name: 'Jerusalén (oficial)', src: 'img/fondos/jerusalen.png', w: 1024, h: 1536, text: { x: 84, y: 392, w: 856, h: 660 }, avoid: { x: 650, y: 30, w: 350, h: 350 }, logo: true }
  ];
  const FONDO = id => FONDOS.find(f => 'f-' + f.id === id);
  const TPL = FONDOS.map(f => ['f-' + f.id, f.name]).concat([['min', 'Minimalista'], ['insp', 'Inspiración bíblica'], ['heb', 'Hebreo original'], ['perg', 'Pergamino'], ['cine', 'Cinematográfico'], ['mod', 'Moderno']]);
  const FMT = [['1:1', 'Cuadrado 1:1', 1080], ['4:5', 'Vertical 4:5', 1350], ['9:16', 'Historia 9:16', 1920], ['2:3', 'Original 2:3', 1620]];
  const SCN = [['amanecer', 'Amanecer'], ['desierto', 'Desierto'], ['montanas', 'Montañas'], ['olivos', 'Olivos'], ['mar', 'Mar de Galilea'], ['noche', 'Cielo estrellado']];
  let ST = { id: null, tpl: 'f-jerusalen', fmt: '2:3', lang: 'both', tr: true, scn: 'amanecer', seed: 7 };

  /* ---------- Transliteración (reglas de Beit Hatzirah: ו = V, ח/כ = J, צ = TZ) ---------- */
  const CONS = { 'א': '', 'ב': 'v', 'ג': 'g', 'ד': 'd', 'ה': 'h', 'ו': 'v', 'ז': 'z', 'ח': 'j', 'ט': 't', 'י': 'y', 'כ': 'j', 'ך': 'j', 'ל': 'l', 'מ': 'm', 'ם': 'm', 'נ': 'n', 'ן': 'n', 'ס': 's', 'ע': '', 'פ': 'f', 'ף': 'f', 'צ': 'tz', 'ץ': 'tz', 'ק': 'k', 'ר': 'r', 'ש': 'sh', 'ת': 't' };
  const HARD = { 'ב': 'b', 'כ': 'k', 'ך': 'k', 'פ': 'p', 'ף': 'p' };
  const VOW = { '\u05B7': 'a', '\u05B8': 'a', '\u05B5': 'e', '\u05B6': 'e', '\u05B4': 'i', '\u05B9': 'o', '\u05BA': 'o', '\u05BB': 'u', '\u05B1': 'e', '\u05B2': 'a', '\u05B3': 'o', '\u05C7': 'o' };
  const NAME = /^([והבלמכש]?)[\u05B0-\u05C7]*י[\u05B0-\u05C7]*ה[\u05B0-\u05C7]*ו[\u05B0-\u05C7]*ה[\u05B0-\u05C7]*$/;
  function trWord(w) {
    const nm = w.match(NAME);
    if (nm) { const pre = nm[1] ? trWord(w.slice(0, w.indexOf('י'))) : ''; return pre + 'YAH'; }
    if (w.replace(/[^\u05D0-\u05EA]/g, '') === 'יה' && w.includes('\u05BC')) return 'YAH';   // יָהּ, forma breve del Nombre
    const cl = []; for (const ch of w) { if (/[\u05D0-\u05EA]/.test(ch)) cl.push({ l: ch, m: '' }); else if (cl.length && /[\u05B0-\u05C7]/.test(ch)) cl[cl.length - 1].m += ch; }
    let out = ''; let prevShva = false, prevVow = '';
    cl.forEach((c, i) => {
      const last = i === cl.length - 1; const dg = c.m.includes('\u05BC');
      const vk = [...c.m].find(x => VOW[x]); let v = vk ? VOW[vk] : '';
      const shva = c.m.includes('\u05B0');
      if (c.l === 'ו' && !vk && dg && !shva) { out += 'u'; prevVow = 'u'; prevShva = false; return; }                // shuruk
      if (c.l === 'ו' && (c.m.includes('\u05B9') || c.m.includes('\u05BA')) && i > 0 && !cl[i - 1].m.match(/[\u05B4-\u05BB\u05B0-\u05B3]/)) { out += 'o'; prevVow = 'o'; prevShva = false; return; } // holam male
      if (c.l === 'י' && !c.m && i > 0) { if (prevVow === 'e' && cl[i - 1].m.includes('\u05B5')) out += 'i'; prevShva = false; return; }   // yod como letra de vocal
      if (c.l === 'ה' && last && !c.m) return;                                                            // he final muda
      let k = CONS[c.l]; if (dg && HARD[c.l]) k = HARD[c.l]; if (c.l === 'ש' && c.m.includes('\u05C2')) k = 's';
      if (shva) { const nx = cl[i + 1]; const same = nx && (CONS[nx.l] === CONS[c.l]); v = (i === 0 || prevShva || same || (dg && i > 0)) && !last ? 'e' : ''; }
      if (last && c.m.includes('\u05B7') && /[חעה]/.test(c.l)) { out += 'a' + k; prevVow = 'a'; return; }  // pátaj furtivo: רוּחַ «rúaj»
      if (k === 'g' && /^[ei]/.test(v)) k = 'gu';
      out += k + v; prevShva = shva && !v; prevVow = v;
    });
    return out;
  }
  function translit(he) {
    const t = he.replace(/[\u0591-\u05AF\u05BD\u05C0\u05C3׀]/g, '').trim();
    const words = t.split(/(\s+|\u05BE)/).filter(Boolean);
    let s = words.map(w => w === '\u05BE' ? '-' : /^\s+$/.test(w) ? ' ' : trWord(w)).join('').replace(/\bkal-/g, 'kol-').replace(/-YAH\b/g, 'YAH').replace(/\s+/g, ' ').trim();
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  EXT.translit = translit;

  /* ---------- Utilidades de dibujo ---------- */
  let rnd;
  const seeded = seed => { let x = seed * 9301 + 49297; return () => { x = (x * 9301 + 49297) % 233280; return x / 233280; }; };
  const grad = (x, y0, y1, stops) => { const g = x.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
  function sky(x, W, H, stops) { x.fillStyle = grad(x, 0, H, stops); x.fillRect(0, 0, W, H); }
  function glow(x, cx, cy, r, c) { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, c); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(cx - r, cy - r, 2 * r, 2 * r); }
  function ridge(x, W, H, base, amp, color, rough) {
    x.beginPath(); x.moveTo(0, H); const ph = rnd() * 10, ph2 = rnd() * 10;
    for (let i = 0; i <= W; i += 6) { const t = i / W; const y = base - amp * (0.55 * Math.sin(t * 3.1 + ph) + 0.3 * Math.sin(t * 7.3 + ph2) + (rough || 0.12) * Math.sin(t * 23 + ph * 2)); x.lineTo(i, y); }
    x.lineTo(W, H); x.closePath(); x.fillStyle = color; x.fill();
  }
  function dunes(x, W, H, base, colors) { colors.forEach((c, k) => { x.beginPath(); x.moveTo(0, H); const y0 = base + k * H * 0.06, ph = rnd() * 6; for (let i = 0; i <= W; i += 8) { const t = i / W; x.lineTo(i, y0 - 40 * Math.sin(t * 2.2 + ph) - 18 * Math.sin(t * 5 + ph * 1.7)); } x.lineTo(W, H); x.closePath(); x.fillStyle = c; x.fill(); }); }
  function olive(x, bx, by, s, c) {
    // tronco retorcido
    x.strokeStyle = '#3B3424'; x.lineCap = 'round';
    [[0, 9], [6, 6]].forEach(([dx, lw]) => { x.lineWidth = lw * s; x.beginPath(); x.moveTo(bx + dx * s, by); x.bezierCurveTo(bx - 18 * s + dx * s, by - 50 * s, bx + 22 * s, by - 80 * s, bx + 2 * s, by - 120 * s); x.stroke(); });
    x.lineWidth = 5 * s; x.beginPath(); x.moveTo(bx + 4 * s, by - 80 * s); x.quadraticCurveTo(bx - 36 * s, by - 100 * s, bx - 64 * s, by - 116 * s); x.stroke();
    x.beginPath(); x.moveTo(bx + 4 * s, by - 96 * s); x.quadraticCurveTo(bx + 40 * s, by - 112 * s, bx + 62 * s, by - 128 * s); x.stroke();
    // copa: muchas hojas pequeñas en tonos verde plateado
    const tones = ['#4F5A34', '#66744A', '#7F8C63', '#A3AE86'];
    for (let k = 0; k < 170; k++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()); const cx = bx + Math.cos(a) * d * 120 * s, cy = by - 150 * s + Math.sin(a) * d * 58 * s;
      x.fillStyle = tones[Math.min(3, Math.floor(rnd() * 3 + (Math.sin(a) < -0.3 ? 1 : 0)))]; x.globalAlpha = 0.85;
      x.beginPath(); x.ellipse(cx, cy, 10 * s, 4 * s, rnd() * Math.PI, 0, Math.PI * 2); x.fill();
    }
    x.globalAlpha = 1;
  }
  function stars(x, W, H, n, maxY) { for (let k = 0; k < n; k++) { const r = rnd() * 1.8 + 0.3; x.fillStyle = 'rgba(255,255,255,' + (0.3 + rnd() * 0.7) + ')'; x.beginPath(); x.arc(rnd() * W, rnd() * maxY, r, 0, Math.PI * 2); x.fill(); } }
  function rays(x, cx, cy, W, H, c) { x.save(); x.globalCompositeOperation = 'screen'; for (let k = 0; k < 9; k++) { const a = -Math.PI / 2 + (k - 4) * 0.16 + rnd() * 0.05; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a - 0.03) * H * 1.6, cy + Math.sin(a - 0.03) * H * 1.6); x.lineTo(cx + Math.cos(a + 0.03) * H * 1.6, cy + Math.sin(a + 0.03) * H * 1.6); x.closePath(); x.fillStyle = c; x.fill(); } x.restore(); }
  function vignette(x, W, H, a) { const g = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,' + a + ')'); x.fillStyle = g; x.fillRect(0, 0, W, H); }
  function grain(x, W, H, a) { const n = 2600 * (H / 1080); x.fillStyle = 'rgba(0,0,0,' + a + ')'; for (let k = 0; k < n; k++) x.fillRect(rnd() * W, rnd() * H, 1.4, 1.4); x.fillStyle = 'rgba(255,255,255,' + a + ')'; for (let k = 0; k < n; k++) x.fillRect(rnd() * W, rnd() * H, 1.4, 1.4); }
  function scene(x, W, H, scn, dramatic) {
    const hz = H * (dramatic ? 0.66 : 0.62);
    if (scn === 'noche') { sky(x, W, H, [[0, '#060B1E'], [0.6, '#1B2850'], [1, '#2C2346']]); stars(x, W, H, 420, hz); glow(x, W * 0.78, H * 0.16, 180, 'rgba(246,241,231,.35)'); x.fillStyle = '#F6F1E7'; x.beginPath(); x.arc(W * 0.78, H * 0.16, 38, 0, 7); x.fill(); ridge(x, W, H, hz + 40, 70, '#141A33'); ridge(x, W, H, hz + 120, 50, '#0B0F21'); return; }
    if (scn === 'desierto') { sky(x, W, H, [[0, '#F2C38B'], [0.45, '#F7D9A8'], [1, '#E8B77A']]); glow(x, W * 0.5, hz - 40, 380, 'rgba(255,236,190,.85)'); dunes(x, W, H, hz, ['#D99A5B', '#C98447', '#B06F36', '#8E5528']); return; }
    if (scn === 'montanas') { sky(x, W, H, [[0, '#2E4A6B'], [0.5, '#8FA9C2'], [1, '#E7D3B0']]); glow(x, W * 0.3, hz - 120, 300, 'rgba(255,230,180,.6)'); ridge(x, W, H, hz - 80, 160, '#6E7E95', 0.25); ridge(x, W, H, hz, 120, '#4D5B70', 0.2); ridge(x, W, H, hz + 110, 80, '#2F3A4A'); ridge(x, W, H, hz + 210, 50, '#1C232E'); return; }
    if (scn === 'olivos') { sky(x, W, H, [[0, '#F4D9A1'], [0.55, '#F8E7C4'], [1, '#C8B98A']]); glow(x, W * 0.7, hz - 60, 320, 'rgba(255,240,200,.8)'); ridge(x, W, H, hz + 30, 50, '#A9A06E'); ridge(x, W, H, hz + 140, 30, '#7F7A4E'); const k0 = W / 1080; olive(x, W * 0.62, H * 0.9, 0.7 * k0); olive(x, W * 0.4, H * 0.92, 0.6 * k0); olive(x, W * 0.14, H * 0.99, 1.25 * k0); olive(x, W * 0.88, H * 0.98, 1.05 * k0); return; }
    if (scn === 'mar') { sky(x, W, H, [[0, '#F3B48C'], [0.5, '#F6D2A8'], [1, '#F6D2A8']]); glow(x, W * 0.55, hz - 10, 260, 'rgba(255,225,170,.9)'); ridge(x, W, H, hz, 60, '#8C7C8E', 0.08); x.fillStyle = grad(x, hz, H, [[0, '#6F8FA8'], [1, '#2C4560']]); x.fillRect(0, hz, W, H - hz); for (let k = 0; k < 70; k++) { x.fillStyle = 'rgba(255,230,180,' + (0.15 + rnd() * 0.35) + ')'; const yy = hz + 10 + rnd() * (H - hz) * 0.6; x.fillRect(W * 0.55 - 120 + rnd() * 240 * (1 + (yy - hz) / H), yy, 20 + rnd() * 60, 2); } return; }
    // amanecer
    sky(x, W, H, [[0, '#2B3A67'], [0.35, '#B46A73'], [0.62, '#F2B279'], [1, '#F6D9A6']]); glow(x, W * 0.5, hz + 10, 340, 'rgba(255,214,150,.9)'); x.fillStyle = '#FFE2B0'; x.beginPath(); x.arc(W * 0.5, hz + 10, 54, 0, 7); x.fill();
    if (dramatic) rays(x, W * 0.5, hz, W, H, 'rgba(255,220,170,.10)');
    ridge(x, W, H, hz + 30, 90, '#7A4F5B'); ridge(x, W, H, hz + 120, 60, '#4E3442'); ridge(x, W, H, hz + 210, 40, '#2D1F2B');
  }
  function parchment(x, W, H) {
    x.fillStyle = '#E9D7AE'; x.fillRect(0, 0, W, H);
    for (let k = 0; k < 90; k++) { const cx = rnd() * W, cy = rnd() * H, r = 60 + rnd() * 260; const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, 'rgba(160,120,60,' + (0.02 + rnd() * 0.05) + ')'); g.addColorStop(1, 'rgba(160,120,60,0)'); x.fillStyle = g; x.fillRect(cx - r, cy - r, 2 * r, 2 * r); }
    const g = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.72); g.addColorStop(0, 'rgba(90,55,20,0)'); g.addColorStop(1, 'rgba(90,55,20,.45)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    grain(x, W, H, 0.05);
    // varas del rollo
    [42, H - 42].forEach(y => { const gg = x.createLinearGradient(0, y - 20, 0, y + 20); gg.addColorStop(0, '#6B4423'); gg.addColorStop(0.5, '#A8743F'); gg.addColorStop(1, '#4A2E15'); x.fillStyle = gg; x.fillRect(30, y - 16, W - 60, 32); x.fillStyle = '#C6A15B'; [30, W - 30].forEach(cx => { x.beginPath(); x.arc(cx, y, 22, 0, 7); x.fill(); }); });
    x.strokeStyle = 'rgba(110,70,30,.55)'; x.lineWidth = 2; x.strokeRect(80, 100, W - 160, H - 200); x.strokeRect(92, 112, W - 184, H - 224);
  }
  function modern(x, W, H) {
    const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#111111'); g.addColorStop(0.55, '#252525'); g.addColorStop(1, '#3A2E1A'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.globalAlpha = 0.9; glow(x, W * 0.95, H * 0.05, W * 0.7, 'rgba(198,161,91,.35)'); glow(x, W * 0.05, H * 0.95, W * 0.6, 'rgba(228,201,137,.18)'); x.globalAlpha = 1;
    x.strokeStyle = 'rgba(228,201,137,.25)'; x.lineWidth = 2; for (let k = 0; k < 4; k++) { x.beginPath(); x.arc(W * 0.88, H * 0.12, 120 + k * 70, 0, 7); x.stroke(); }
    x.fillStyle = '#C6A15B'; x.fillRect(80, 120, 120, 8);
  }

  /* ---------- Composición del texto ---------- */
  function wrap(x, text, maxW) { const words = text.split(/\s+/); const lines = []; let line = ''; for (const w of words) { const t = line ? line + ' ' + w : w; if (x.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; } if (line) lines.push(line); return lines; }
  function block(x, text, font, size, maxW, dir) { x.font = font.replace('{s}', size); x.direction = dir || 'ltr'; const l = wrap(x, text, maxW); x.direction = 'ltr'; return l; }
  async function draw(cv, data) {
    const F = FONDO(ST.tpl); if (F) return drawFondo(cv, data, F);
    if (ST.fmt === '2:3') ST.fmt = '4:5';
    const W = 1080, H = FMT.find(f => f[0] === ST.fmt)[2]; cv.width = W; cv.height = H; const x = cv.getContext('2d');
    rnd = seeded(ST.seed + (ST.scn.length * 13));
    const T = ST.tpl; const dark = T === 'insp' || T === 'cine' || T === 'heb' || T === 'mod' || (T === 'min' && ST.seed % 2 === 0);
    // 1) fondo
    if (T === 'min') { x.fillStyle = dark ? '#111111' : '#F6F1E7'; x.fillRect(0, 0, W, H); x.strokeStyle = '#C6A15B'; x.lineWidth = 3; x.strokeRect(54, 54, W - 108, H - 108); }
    else if (T === 'insp') { scene(x, W, H, ST.scn, false); x.fillStyle = grad(x, 0, H, [[0, 'rgba(0,0,0,.15)'], [0.5, 'rgba(0,0,0,.35)'], [1, 'rgba(0,0,0,.55)']]); x.fillRect(0, 0, W, H); }
    else if (T === 'cine') { scene(x, W, H, ST.scn, true); vignette(x, W, H, 0.75); x.fillStyle = 'rgba(0,0,0,.28)'; x.fillRect(0, 0, W, H); grain(x, W, H, 0.04); x.fillStyle = '#000'; x.fillRect(0, 0, W, H * 0.045); x.fillRect(0, H * 0.955, W, H * 0.045); }
    else if (T === 'heb') { x.fillStyle = '#111111'; x.fillRect(0, 0, W, H); glow(x, W / 2, H * 0.42, W * 0.75, 'rgba(198,161,91,.22)'); grain(x, W, H, 0.03); }
    else if (T === 'perg') parchment(x, W, H);
    else modern(x, W, H);
    // 2) texto
    const ink = T === 'perg' ? '#3B2A16' : dark ? '#F6F1E7' : '#111111', gold = T === 'perg' ? '#7A5422' : dark ? '#E4C989' : '#8A6A2E';
    const showHe = (ST.lang === 'he' || ST.lang === 'both' || T === 'heb') && data.he; const showEs = ST.lang !== 'he' || !data.he;
    const showTr = T === 'heb' && ST.tr && data.tr;
    const pad = T === 'perg' ? 150 : 110, maxW = W - pad * 2;
    const topY = T === 'perg' ? 170 : T === 'cine' ? H * 0.1 : 150, botY = H - (T === 'perg' ? 300 : 280);
    let hs = T === 'heb' ? 96 : 76, es = 64, ts = 40; let he = [], esL = [], trL = [], total = 0;
    for (let it = 0; it < 40; it++) {
      he = showHe ? block(x, data.he, '700 {s}px ' + HEF, hs, maxW, 'rtl') : [];
      trL = showTr ? block(x, data.tr, 'italic 400 {s}px ' + ESF, ts, maxW) : [];
      esL = showEs ? block(x, data.es, (T === 'heb' || T === 'mod' ? '400' : 'italic 400') + ' {s}px ' + ESF, es, maxW) : [];
      total = he.length * hs * 1.75 + trL.length * ts * 1.45 + esL.length * es * 1.45 + (he.length && (esL.length || trL.length) ? 50 : 0) + (trL.length && esL.length ? 30 : 0);
      if (total <= botY - topY - 120 || es <= 26) break;
      hs *= 0.94; es *= 0.94; ts *= 0.94;
    }
    const overflow = total > botY - topY - 120;
    let y = topY + Math.max(40, (botY - topY - 120 - total) / 2) + 40;
    if (T === 'insp' || T === 'cine') { const cy = y + total / 2 + 40, g = x.createRadialGradient(W / 2, cy, 0, W / 2, cy, Math.max(W * 0.62, total)); g.addColorStop(0, 'rgba(0,0,0,.42)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H); }
    x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    if (T === 'mod' || T === 'min') { x.fillStyle = gold; x.font = '400 160px ' + ESF; x.globalAlpha = 0.35; x.fillText('“', W / 2, y - 10); x.globalAlpha = 1; y += 30; }
    x.shadowColor = (T === 'insp' || T === 'cine') ? 'rgba(0,0,0,.55)' : 'transparent'; x.shadowBlur = 14;
    if (he.length) { x.fillStyle = T === 'heb' ? gold : ink; x.font = '700 ' + hs + 'px ' + HEF; x.direction = 'rtl'; he.forEach(l => { y += hs * 1.35; x.fillText(l, W / 2, y); y += hs * 0.4; }); x.direction = 'ltr'; }
    if (trL.length) { y += 34; x.fillStyle = gold; x.font = 'italic 400 ' + ts + 'px ' + ESF; trL.forEach(l => { y += ts * 1.45; x.fillText(l, W / 2, y); }); }
    if (esL.length) { y += he.length || trL.length ? 46 : 0; x.fillStyle = ink; x.font = (T === 'heb' || T === 'mod' ? '400 ' : 'italic 400 ') + es + 'px ' + ESF; esL.forEach(l => { y += es * 1.45; x.fillText(l, W / 2, y); }); }
    x.shadowColor = 'transparent';
    // referencia
    y += 64; x.fillStyle = gold; x.fillRect(W / 2 - 50, y - 26, 100, 3); x.font = '600 38px ' + ESF; x.fillText(data.ref, W / 2, y + 26);
    if (showEs && data.ver) { x.font = '400 24px ' + ESF; x.globalAlpha = 0.75; x.fillText(data.ver, W / 2, y + 62); x.globalAlpha = 1; }
    // 3) identidad: logo y firma
    const lg = await logo(); const lh = 108, lw = lg ? lh * lg.naturalWidth / lg.naturalHeight : 0; const fy = H - (T === 'perg' ? 210 : T === 'cine' ? H * 0.045 + 140 : 150);
    if (lg) x.drawImage(lg, W / 2 - lw / 2, fy, lw, lh);
    x.font = '600 24px ' + ESF; x.fillStyle = T === 'perg' ? '#5A3E1C' : dark ? 'rgba(246,241,231,.85)' : '#252525'; x.fillText('BEIT HATZIRAH  ·  בית הצרעה', W / 2, fy + lh + 34);
    return overflow;
  }
  const IMG = {};
  function loadImg(src) { return IMG[src] || (IMG[src] = new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; })); }
  function fondoSrc(f) { const E = window.__BH_EMBED; return (E && E.fondos && E.fondos[f.id]) || f.src; }
  /* Plantilla con fondo oficial: la imagen se dibuja completa y sin recortes, a su resolución original.
     En formatos de otra proporción, el espacio sobrante se completa con la misma imagen difuminada (sin objetos nuevos). */
  async function drawFondo(cv, data, f) {
    const img = await loadImg(fondoSrc(f)); if (!img) return false;
    const iw = f.w, ih = f.h; const ratio = { '1:1': 1, '4:5': 4 / 5, '9:16': 9 / 16, '2:3': 2 / 3 }[ST.fmt] || 2 / 3;
    let W, H; if (ratio >= iw / ih) { H = ih; W = Math.round(ih * ratio); } else { W = iw; H = Math.round(iw / ratio); }
    cv.width = W; cv.height = H; const x = cv.getContext('2d');
    const ox = Math.round((W - iw) / 2), oy = Math.round((H - ih) / 2);
    if (ox > 0 || oy > 0) {
      const sc = Math.max(W / iw, H / ih); x.save(); x.filter = 'blur(28px) brightness(.5) saturate(.9)';
      x.drawImage(img, (W - iw * sc) / 2 - 40, (H - ih * sc) / 2 - 40, iw * sc + 80, ih * sc + 80); x.restore();
      x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(0, 0, W, H);
    }
    x.drawImage(img, ox, oy, iw, ih);            // la imagen original, intacta
    if (ox > 0 || oy > 0) { x.save(); x.shadowColor = 'rgba(0,0,0,.5)'; x.shadowBlur = 30; x.strokeStyle = 'rgba(0,0,0,0)'; x.strokeRect(ox, oy, iw, ih); x.restore(); }
    // zona del texto (coordenadas de la imagen) y escala tipográfica relativa al ancho de la imagen
    const k = iw / 1080; const tz = { x: ox + f.text.x, y: oy + f.text.y, w: f.text.w, h: f.text.h };
    const showHe = (ST.lang === 'he' || ST.lang === 'both') && data.he; const showEs = ST.lang !== 'he' || !data.he;
    let hs = 74 * k, es = 62 * k; let he = [], esL = [], total = 0; const maxW = tz.w - 60 * k;
    const MIN_ES = 30 * k; let room = tz.h;
    for (let it = 0; it < 60; it++) {
      he = showHe ? block(x, data.he, '700 {s}px ' + HEF, hs, maxW, 'rtl') : [];
      esL = showEs ? block(x, data.es, 'italic 400 {s}px ' + ESF, es, maxW) : [];
      total = he.length * hs * 1.7 + esL.length * es * 1.42 + (he.length && esL.length ? 40 * k : 0) + 118 * k;
      if (total <= room) break;
      if (es <= MIN_ES) { room = Math.min(H - tz.y - 60 * k, room + 40 * k); if (room >= H - tz.y - 60 * k) break; continue; }   // versículos largos: se amplía la zona hacia abajo antes de seguir reduciendo
      hs *= 0.95; es *= 0.95;
    }
    const overflow = total > H - tz.y - 40 * k;
    const top = tz.y + Math.max(0, (Math.min(room, tz.h) - total) / 2);
    // velo suave para dar contraste; se aparta del logo con una transición gradual (el logo queda intacto)
    const cy = top + total / 2, ry = total / 2 + 70 * k, rx = tz.w / 2 + 90 * k;
    const vc = document.createElement('canvas'); vc.width = W; vc.height = H; const v = vc.getContext('2d');
    v.save(); v.translate(W / 2, cy); v.scale(rx / ry, 1); const g = v.createRadialGradient(0, 0, 0, 0, 0, ry * 1.15);
    g.addColorStop(0, 'rgba(10,8,6,.62)'); g.addColorStop(.62, 'rgba(10,8,6,.42)'); g.addColorStop(1, 'rgba(10,8,6,0)'); v.fillStyle = g; v.beginPath(); v.arc(0, 0, ry * 1.15, 0, Math.PI * 2); v.fill(); v.restore();
    if (f.avoid) {
      const lx = ox + f.avoid.x + f.avoid.w / 2, ly = oy + f.avoid.y + f.avoid.h / 2, r0 = Math.max(f.avoid.w, f.avoid.h) / 2;
      const e = v.createRadialGradient(lx, ly, r0 * 1.1, lx, ly, r0 * 1.75); e.addColorStop(0, 'rgba(0,0,0,1)'); e.addColorStop(1, 'rgba(0,0,0,0)');
      v.globalCompositeOperation = 'destination-out'; v.fillStyle = e; v.fillRect(0, 0, W, H); v.globalCompositeOperation = 'source-over';
    }
    x.drawImage(vc, 0, 0);
    let y = top; x.textAlign = 'center'; x.shadowColor = 'rgba(0,0,0,.65)'; x.shadowBlur = 16 * k; x.shadowOffsetY = 2 * k;
    if (he.length) { x.fillStyle = '#F6E7BE'; x.font = '700 ' + hs + 'px ' + HEF; x.direction = 'rtl'; he.forEach(l => { y += hs * 1.3; x.fillText(l, W / 2, y); y += hs * 0.4; }); x.direction = 'ltr'; }
    if (esL.length) { y += he.length ? 40 * k : 0; x.fillStyle = '#FFFFFF'; x.font = 'italic 400 ' + es + 'px ' + ESF; esL.forEach(l => { y += es * 1.42; x.fillText(l, W / 2, y); }); }
    y += 56 * k; x.shadowBlur = 0; x.shadowOffsetY = 0; x.fillStyle = '#E4C989'; x.fillRect(W / 2 - 46 * k, y - 22 * k, 92 * k, 3 * k);
    x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 10 * k; x.font = '600 ' + Math.round(38 * k) + 'px ' + ESF; x.fillText(data.ref, W / 2, y + 26 * k);
    if (showEs && data.ver) { x.font = '400 ' + Math.round(24 * k) + 'px ' + ESF; x.globalAlpha = .85; x.fillText(data.ver, W / 2, y + 60 * k); x.globalAlpha = 1; }
    x.shadowColor = 'transparent';
    return overflow;
  }
  let LG = null;
  function logo() { return new Promise(res => { if (LG) return res(LG); const i = new Image(); i.onload = () => { LG = i; res(i); }; i.onerror = () => res(null); i.src = window.BH_LOGO; }); }

  /* ---------- Pantalla del estudio ---------- */
  async function getData(id) {
    const [b, c, v] = id.split('-'); const d = await B.getBookV(b); const cell = d.c[+c - 1][+v - 1];
    const heRaw = (cell[1] && cell[1] !== '^') ? cell[1].replace(/[\u0591-\u05AF\u05BD\u05C0]/g, '').replace(/\s*׀\s*/g, ' ').trim() : '';
    const nt = B.BY[b].nt;
    return { he: heRaw, tr: heRaw && !nt ? translit(heRaw) : '', es: B.es(cell[0] || ''), ref: B.bookName(b) + ' ' + c + ':' + v, ver: B.verShort ? B.verShort() : '', nt };
  }
  async function vImagen(p) {
    const id = p.slice(1).join('-'); if (!id) return B.go('inicio'); if (ST.id !== id) { ST.id = id; ST.seed = 7; }
    const data = await getData(id);
    if (!data.he && ST.lang === 'he') ST.lang = 'es';
    const chips = (list, key) => list.map(([k, l]) => '<button class="chip' + (ST[key] === k ? ' on' : '') + '" data-act="im-set" data-k="' + key + '" data-v="' + k + '" aria-pressed="' + (ST[key] === k) + '">' + esc(l) + '</button>').join('');
    B.view().innerHTML = B.top('Imagen del versículo', { back: 'leer-' + id.split('-').slice(0, 2).join('-') }) + '<div class="wrap im">' +
      '<div class="im-stage"><canvas id="im-cv" aria-label="Vista previa de la imagen"></canvas></div><p id="im-warn" class="notice" hidden></p>' +
      '<div class="im-panel"><h3>Plantillas destacadas</h3><div class="im-feat">' + FONDOS.map(f => '<button class="im-ft' + (ST.tpl === 'f-' + f.id ? ' on' : '') + '" data-act="im-set" data-k="tpl" data-v="f-' + f.id + '" aria-pressed="' + (ST.tpl === 'f-' + f.id) + '"><img src="' + fondoSrc(f) + '" alt="" loading="lazy"><span>' + esc(f.name) + '</span></button>').join('') + '</div>' +
      '<h3>Otros estilos</h3><div class="chips">' + chips(TPL.filter(t => !FONDO(t[0])), 'tpl') + '</div>' +
      (ST.tpl === 'insp' || ST.tpl === 'cine' ? '<h3>Paisaje</h3><div class="chips">' + chips(SCN, 'scn') + '</div>' : '') +
      '<h3>Formato</h3><div class="chips">' + chips(FMT.filter(f => f[0] !== '2:3' || FONDO(ST.tpl)).map(f => [f[0], f[1]]), 'fmt') + '</div>' +
      (data.he && ST.tpl !== 'heb' ? '<h3>Idioma</h3><div class="chips">' + chips([['es', 'Español'], ['he', 'Hebreo'], ['both', 'Ambos']], 'lang') + '</div>' : '') +
      (ST.tpl === 'heb' && data.tr ? '<label class="im-check"><input type="checkbox" data-act="im-tr"' + (ST.tr ? ' checked' : '') + '> Incluir transliteración</label>' : '') +
      (ST.tpl !== 'heb' && ST.tpl !== 'perg' && !FONDO(ST.tpl) ? '<button class="btn" data-act="im-seed">🎨 Otra variación</button>' : '') +
      '<p class="im-note">' + (data.nt && data.he ? 'El hebreo del Brit Hadashá es la traducción de Delitzsch (sin vocales). ' : '') + (ST.tpl === 'heb' && data.tr ? 'La transliteración se genera automáticamente según las reglas de Beit Hatzirah (ו = v, ח = j): revísala antes de compartir. ' : '') + (FONDO(ST.tpl) ? 'Fondo oficial de Beit Hatzirah: se usa completo, sin recortes ni cambios; en los formatos de otra proporción, el espacio sobrante se completa con la misma imagen difuminada. ' : 'Los fondos de estos estilos son ilustraciones generadas por la app. ') + 'El texto bíblico no se modifica; los nombres siguen la configuración de la app (YAH, Yahshúa, Elohim).</p></div>' +
      '<div class="btns im-actions"><button class="btn solid" data-act="im-share">Compartir</button><button class="btn" data-act="im-save">Descargar</button></div></div>';
    if (document.fonts) { try { await Promise.all(['700 60px "BH Hebrew"', '400 40px "BH Serif"', 'italic 400 40px "BH Serif"', '600 30px "BH Serif"'].map(f => document.fonts.load(f, f.includes('Hebrew') ? 'אבג' : 'Abc'))); } catch (e) { } }
    const over = await draw(document.getElementById('im-cv'), data);
    const w = document.getElementById('im-warn'); if (over) { w.hidden = false; w.textContent = 'Este versículo es muy largo para este formato. Prueba el formato «Historia 9:16» o muestra un solo idioma.'; }
  }
  function blob() { return new Promise(r => document.getElementById('im-cv').toBlob(r, 'image/png')); }
  const fname = () => 'beit-hatzirah-' + ST.id + '.png';
  Object.assign(EXT.act, {
    'im-set': el => { ST[el.dataset.k] = el.dataset.v; if (el.dataset.k === 'tpl' && el.dataset.v === 'heb') ST.tr = true; vImagen(['imagen'].concat(ST.id.split('-'))); },
    'im-seed': () => { ST.seed++; vImagen(['imagen'].concat(ST.id.split('-'))); },
    'im-tr': el => { ST.tr = el.checked; vImagen(['imagen'].concat(ST.id.split('-'))); },
    'im-share': async () => { const b = await blob(); const f = new File([b], fname(), { type: 'image/png' }); if (navigator.canShare && navigator.canShare({ files: [f] })) { try { await navigator.share({ files: [f], title: 'Beit Hatzirah' }); } catch (e) { } } else { save(b); B.toast('Tu navegador no permite compartir imágenes: se descargó'); } },
    'im-save': async () => save(await blob())
  });
  function save(b) { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = fname(); document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
  EXT.routes.imagen = vImagen; EXT.tabs.imagen = '';
})();
