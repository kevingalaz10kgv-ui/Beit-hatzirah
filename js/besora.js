/* BEIT HATZIRAH — BESORÁ (בְּשׂוֹרָה): La Buena Noticia desde las Escrituras.
   Formación para dialogar con respeto: temas por perfil, profecías, fiestas, raíces hebreas,
   Alef-Tav, preguntas difíciles, simulador y evangelización rápida.
   Todos los versículos se muestran desde el texto bíblico de la app; ninguno se escribe a mano. */
(function () {
  'use strict';
  const EXT = window.BH_EXT;
  let B = null;
  const prevInit = EXT.init;
  EXT.init = api => { if (prevInit) prevInit(api); B = api; };
  const esc = s => B.esc(s);
  const he = (h, cls) => '<span class="he ' + (cls || '') + '" lang="he" dir="rtl">' + esc(h) + '</span>';
  const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  let D = null;
  async function data() { if (!D) D = await B.getJSON('besora.json'); return D; }
  const ST = () => Object.assign({ fav: [], read: {}, hist: [] }, B.Store.get('besora', {}) || {});
  const saveST = s => B.Store.set('besora', s);
  function visit(id, title) { const s = ST(); s.read[id] = Date.now(); s.hist = [{ id, t: title, ts: Date.now() }].concat(s.hist.filter(h => h.id !== id)).slice(0, 40); saveST(s); }

  const PERFILES = [
    ['judio', 'Un judío tradicional o secular', '✡️', 'Desde el Tanaj, sin imponer el Brit Hadashá como autoridad compartida.'],
    ['evangelico', 'Un evangélico', '✝️', 'Shabat, fiestas, Torá, gracia y el olivo de Israel.'],
    ['tj', 'Un Testigo de Jehová', '📘', 'La identidad de Yahshúa: Juan 1:1, «Yo soy», Colosenses 1 y Hebreos 1.'],
    ['catolico', 'Un católico', '⛪', 'Mediación, intercesión, imágenes, salvación y tradición.'],
    ['ateo', 'Una persona atea o agnóstica', '🔭', 'Creador, sufrimiento, sentido de la vida e historia.']];
  const PNAME = Object.fromEntries(PERFILES.map(p => [p[0], p[1]]));
  const TIPOS = { explicito: ['Cumplimiento explícito', 'El texto apostólico afirma expresamente que se cumplió.'], mesianica: ['Interpretación mesiánica', 'Lectura del Mashíaj que el texto no afirma explícitamente; puede tener apoyo en fuentes antiguas.'], tipologia: ['Tipología', 'Un patrón o figura de la historia de Israel que se repite en el Mashíaj.'], parcial: ['Cumplimiento parcial', 'Una parte ya se cumplió; otra se espera.'], futuro: ['Expectativa futura', 'Se espera su cumplimiento en el Reino.'] };

  /* ---------- Versículos desde el texto de la app ---------- */
  function parseRef(r) { const m = r.match(/^(\w+) (\d+)(?::(\d+))?(?:-(?:(\d+):)?(\d+))?$/); if (!m) return null; const c = +m[2]; return { b: m[1], c, v: m[3] ? +m[3] : null, c2: m[4] ? +m[4] : c, v2: m[5] ? +m[5] : (m[3] ? +m[3] : null) }; }
  const refName = r => { const p = parseRef(r); if (!p) return r; return B.bookName(p.b) + ' ' + p.c + (p.v ? ':' + p.v : '') + (p.v2 && (p.v2 !== p.v || p.c2 !== p.c) ? '–' + (p.c2 !== p.c ? p.c2 + ':' : '') + p.v2 : ''); };
  const refLink = r => { const p = parseRef(r); return p ? '<a href="#leer-' + p.b + '-' + p.c + (p.v ? '-' + p.v : '') + '">' + esc(refName(r)) + '</a>' : esc(r); };
  async function versesHTML(refs, opt) {
    opt = opt || {}; let html = '';
    for (const r of refs) {
      const p = parseRef(r); if (!p) continue;
      if (!p.v) { html += '<div class="bs-ref"><b>' + refLink(r) + '</b><p class="muted">Capítulo completo: ábrelo para leerlo.</p></div>'; continue; }
      let d; try { d = await B.getBookV(p.b); } catch (e) { continue; }
      const list = [];
      for (let c = p.c; c <= p.c2; c++) { const ch = d.c[c - 1] || []; const a = c === p.c ? p.v : 1, z = c === p.c2 ? p.v2 : ch.length; for (let v = a; v <= z; v++) if (ch[v - 1]) list.push([c, v, ch[v - 1]]); }
      const max = opt.max || 6; const shown = list.slice(0, max);
      html += '<div class="bs-ref"><b>' + refLink(r) + '</b>' + shown.map(([c, v, cell]) =>
        (cell[1] && cell[1] !== '^' && !B.BY[p.b].nt ? '<p class="he bs-vh" lang="he" dir="rtl">' + mark(esc(B.heb(cell[1])), opt.markEt) + ' <small class="bs-vn">' + v + '</small></p>' : '') +
        '<p class="bs-vs"><small class="bs-vn">' + (shown.length > 1 || list.length > 1 ? (c !== p.c ? c + ':' : '') + v + ' ' : '') + '</small>' + B.es(cell[0] || '', true) + '</p>').join('') +
        (list.length > max ? '<a class="bs-more" href="#leer-' + p.b + '-' + p.c + '-' + p.v + '">Leer el pasaje completo (' + list.length + ' versículos)</a>' : '') + '</div>';
    }
    return html;
  }
  // Resalta la partícula אֵת (también con vav y con maqaf), con o sin signos de cantilación
  const mark = (h, on) => on ? h.replace(/[^\s\u05BE]+/g, w => { const c = w.replace(/[^\u05D0-\u05EA]/g, ''); return (c === 'את' || c === 'ואת') && /[\u05B5\u05B6]/.test(w) ? '<mark class="bs-et">' + w + '</mark>' : w; }) : h;

  /* ---------- Voz en español ---------- */
  function speakES(text) {
    const S = window.speechSynthesis; if (!S) { B.toast('Este navegador no permite la lectura en voz alta'); return; }
    if (S.speaking) { S.cancel(); B.toast('Lectura detenida'); return; }
    const vs = S.getVoices().filter(v => /^es/i.test(v.lang)); if (!vs.length) { B.toast('Este dispositivo no tiene una voz en español instalada'); return; }
    const want = (B.Store.get('audio', {}) || {}).vEs; const v = vs.find(x => x.name === want) || vs.find(x => /premium|enhanced|mejorad|natural|google/i.test(x.name)) || vs[0];
    const parts = text.replace(/[\u0590-\u05FF]+[\u0590-\u05FF\s־]*/g, ' ').replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/);
    let chunk = ''; const chunks = []; parts.forEach(p => { if ((chunk + ' ' + p).length > 220) { chunks.push(chunk); chunk = p; } else chunk = chunk ? chunk + ' ' + p : p; }); if (chunk) chunks.push(chunk);
    chunks.forEach(c => { const u = new SpeechSynthesisUtterance(B.es(c)); u.voice = v; u.lang = v.lang; u.rate = 0.95; S.speak(u); });
    B.toast('Escuchando… toca de nuevo para detener');
  }

  /* ---------- Pantallas ---------- */
  const top = (t, back) => B.top(t, { back: back || 'besora' });
  async function vHome() {
    await data(); const s = ST(); const total = D.temas.length + D.faq.length; const read = D.temas.filter(t => s.read[t.id]).length + D.faq.filter((f, i) => s.read['faq-' + i]).length;
    const cards = [['perfiles', 'user', '¿Con quién voy a conversar?', 'Cinco perfiles, ' + D.temas.length + ' temas'], ['profecias', 'scroll', 'Profecías del Mashíaj', D.profecias.length + ' profecías en dos columnas'], ['fiestas', 'cal', 'Shabat y fiestas bíblicas', 'Levítico 23 y su relación con el Mashíaj'], ['raices', 'tree', 'Raíces hebreas', D.raices.length + ' conceptos clave'], ['aleftav', 'את', 'Misterios: el Alef-Tav', 'Gramática y lectura simbólica'], ['faq', 'help', 'Preguntas difíciles', D.faq.length + ' respuestas bíblicas'], ['sim', 'mask', 'Simulador de conversaciones', D.sim.length + ' escenarios con evaluación'], ['rapida', 'bolt', 'Evangelización rápida', 'Una respuesta preparada en segundos']];
    B.view().innerHTML = top('Besorá', 'menu') + '<div class="wrap bs">' +
      '<div class="bs-hero"><img class="sec-logo" src="' + B.LOGO + '" alt=""><p class="he" lang="he">בְּשׂוֹרָה</p><h2>Besorá</h2><p>La Buena Noticia desde las Escrituras</p>' +
      '<div class="progress"><i style="width:' + Math.round(read / total * 100) + '%"></i></div><small>' + read + ' de ' + total + ' estudios leídos</small></div>' +
      (EXT.moreh ? EXT.moreh.tip('besora', 1) : '') + '<div class="field">' + B.ic('search') + '<input type="search" id="bsq" placeholder="Buscar un tema, versículo o pregunta" aria-label="Buscar en Besorá" autocomplete="off"></div><div id="bsres"></div>' +
      '<div class="bs-cards">' + cards.map(([k, i, t, sub]) => '<a class="bs-card" href="#besora-' + k + '"><span class="bs-ci' + (k === 'aleftav' ? ' he' : '') + '"' + (k === 'aleftav' ? ' lang="he"' : '') + '>' + i + '</span><b>' + t + '</b><small>' + sub + '</small></a>').join('') + '</div>' +
      (s.fav.length ? '<div class="group-title"><h3>★ Favoritos</h3></div><div class="rows">' + s.fav.map(id => itemRow(id)).join('') + '</div>' : '') +
      (s.hist.length ? '<div class="group-title"><h3>Historial de estudios</h3></div><div class="rows">' + s.hist.slice(0, 8).map(h => itemRow(h.id, h.ts)).join('') + '</div>' : '') +
      '<p class="bs-note">Cada estudio distingue el significado del texto, su contexto y las distintas interpretaciones. Los versículos se muestran desde el texto bíblico de la app. Las referencias a fuentes judías (Targum, Talmud, Rashi) se citan por su nombre para que puedas consultarlas.</p></div>';
  }
  function itemRow(id, ts) {
    let t = '', href = '';
    const tm = D.temas.find(x => x.id === id); if (tm) { t = tm.t; href = 'besora-tema-' + id; }
    else if (id.startsWith('faq-')) { const f = D.faq[+id.slice(4)]; if (f) { t = f.q; href = 'besora-' + id; } }
    else if (id === 'aleftav') { t = 'El misterio del Alef-Tav'; href = 'besora-aleftav'; }
    if (!t) return '';
    return '<a class="row" href="#' + href + '"><span class="t"><b>' + esc(t) + '</b>' + (ts ? '<span>' + esc(new Date(ts).toLocaleDateString('es')) + '</span>' : '') + '</span></a>';
  }
  document.addEventListener('input', e => {
    if (e.target.id !== 'bsq') return; const q = norm(e.target.value.trim()); const out = document.getElementById('bsres'); if (!out) return;
    if (q.length < 2) { out.innerHTML = ''; return; }
    const hits = [];
    D.temas.forEach(t => { if (norm(t.t + ' ' + t.b + ' ' + t.d.join(' ') + ' ' + t.refs.map(refName).join(' ')).includes(q)) hits.push(['besora-tema-' + t.id, t.t, PNAME[t.perfil]]); });
    D.faq.forEach((f, i) => { if (norm(f.q + ' ' + f.b).includes(q)) hits.push(['besora-faq-' + i, f.q, 'Pregunta difícil']); });
    D.profecias.forEach(p => { if (norm(p.t + ' ' + p.ctx + ' ' + refName(p.ta) + ' ' + refName(p.ap)).includes(q)) hits.push(['besora-profecias', p.t, 'Profecía: ' + refName(p.ta)]); });
    D.raices.forEach(r => { if (norm(r.tr + ' ' + r.es).includes(q)) hits.push(['besora-raices', r.tr + ' — ' + r.es, 'Raíces hebreas']); });
    out.innerHTML = hits.length ? '<div class="rows">' + hits.slice(0, 20).map(([h, t, s]) => '<a class="row" href="#' + h + '"><span class="t"><b>' + esc(t) + '</b><span>' + esc(s) + '</span></span></a>').join('') + '</div>' : '<p class="muted">Sin resultados.</p>';
  });

  async function vPerfiles(parts) {
    await data(); const s = ST();
    if (parts[2]) {
      const p = PERFILES.find(x => x[0] === parts[2]); if (!p) return B.go('besora-perfiles');
      const ts = D.temas.filter(t => t.perfil === p[0]);
      B.view().innerHTML = top(esc(p[1]), 'besora-perfiles') + '<div class="wrap bs"><div class="bs-hero small"><span class="bs-pi">' + B.ic('user') + '</span><h2>' + esc(p[1]) + '</h2><p>' + esc(p[3]) + '</p></div>' +
        (p[0] === 'judio' ? '<p class="notice">Con una persona judía, el Tanaj es la autoridad compartida. Presenta las interpretaciones mesiánicas como tales y reconoce las lecturas judías tradicionales: el respeto abre puertas.</p>' : '') +
        '<div class="rows">' + ts.map((t, i) => '<a class="row" href="#besora-tema-' + t.id + '"><span class="num">' + (i + 1) + '</span><span class="t"><b>' + esc(t.t) + '</b><span>' + esc(t.refs.slice(0, 3).map(refName).join(' · ')) + '</span></span>' + (s.read[t.id] ? '<span class="done">' + B.ic('check', ' width="18" height="18"') + '</span>' : '') + '</a>').join('') + '</div>' +
        '<div class="btns" style="margin:20px 0"><a class="btn" href="#besora-sim-' + p[0] + '">🎭 Practicar en el simulador</a><a class="btn" href="#besora-rapida">⚡ Respuesta rápida</a></div></div>';
      return;
    }
    B.view().innerHTML = top('¿Con quién voy a conversar?') + '<div class="wrap bs"><p style="margin-top:18px">Elige el perfil de la persona. Cada tema incluye el texto bíblico, palabras hebreas, las distintas interpretaciones, objeciones frecuentes y una forma respetuosa de responder.</p><div class="bs-cards">' +
      PERFILES.map(([k, n, i, d]) => { const ts = D.temas.filter(t => t.perfil === k); const rd = ts.filter(t => s.read[t.id]).length; return '<a class="bs-card" href="#besora-perfiles-' + k + '"><span class="bs-ci">' + B.ic('user') + '</span><b>' + esc(n) + '</b><small>' + esc(d) + '</small><small class="bs-prog">' + rd + ' de ' + ts.length + ' leídos</small></a>'; }).join('') + '</div></div>';
  }

  async function vTema(parts) {
    await data(); const id = parts.slice(2).join('-'); const t = D.temas.find(x => x.id === id); if (!t) return B.go('besora');
    visit(id, t.t); const fav = ST().fav.includes(id);
    B.view().innerHTML = top(esc(PNAME[t.perfil] || 'Besorá'), 'besora-perfiles-' + t.perfil) + '<div class="wrap bs study">' +
      '<p class="bs-kicker">' + esc(PNAME[t.perfil]) + '</p><h1 class="bs-title">' + esc(t.t) + '</h1>' +
      '<div class="bs-brief"><span>Respuesta breve</span><p>' + esc(t.b) + '</p></div>' +
      '<div class="btns"><button class="btn" data-act="bs-fav" data-id="' + id + '" aria-pressed="' + fav + '">' + (fav ? '★ Guardado' : '☆ Guardar') + '</button><button class="btn" data-act="bs-listen" data-id="' + id + '">🔊 Escuchar</button><a class="btn" href="#besora-sim-' + t.perfil + '">🎭 Practicar</a></div>' +
      '<h2>Desarrollo bíblico</h2>' + t.d.map(p => '<p>' + esc(p) + '</p>').join('') +
      '<h2>Los textos</h2><div id="bs-verses"><div class="loading">Cargando versículos…</div></div>' +
      (t.heb.length ? '<h2>Palabras hebreas</h2><div class="bs-heb">' + t.heb.map(([h, tr, es, nota]) => '<div><p class="he" lang="he">' + esc(h) + '</p><b>' + esc(tr) + '</b><span>' + esc(es) + '</span>' + (nota ? '<small>' + esc(nota) + '</small>' : '') + '<button class="bs-say" data-act="bs-sayhe" data-h="' + esc(h) + '" aria-label="Escuchar en hebreo">🔊</button></div>').join('') + '</div>' : '') +
      (t.pos.length ? '<h2>Interpretaciones</h2><p class="muted" style="font-size:.88rem">Se presentan con honestidad, con los textos en que se apoya cada una.</p>' + t.pos.map(p => '<div class="bs-pos"><b>' + esc(p.q) + '</b><p>' + esc(p.e) + '</p>' + (p.refs.length ? '<small>Textos: ' + p.refs.map(refLink).join(', ') + '</small>' : '') + '</div>').join('') : '') +
      (t.obj.length ? '<h2>Preguntas que pueden surgir</h2>' + t.obj.map(([q, a]) => '<details class="bs-obj"><summary>' + esc(q) + '</summary><p>' + esc(a) + '</p></details>').join('') : '') +
      '<h2>Cómo responder con respeto</h2><div class="bs-resp"><p>' + esc(t.r) + '</p><button class="btn" data-act="bs-copy" data-t="' + esc(t.r) + '">Copiar</button></div>' +
      (t.q.length ? '<h2>Preguntas para continuar la conversación</h2><ul>' + t.q.map(q => '<li>' + esc(q) + '</li>').join('') + '</ul>' : '') +
      '</div>';
    document.getElementById('bs-verses').innerHTML = await versesHTML(t.refs);
  }

  async function vProfecias(parts) {
    await data(); const f = parts[2] || '';
    const groups = [...new Set(D.profecias.map(p => p.tema))];
    let html = '';
    for (const g of groups) {
      const ps = D.profecias.filter(p => p.tema === g && (!f || p.tipo === f)); if (!ps.length) continue;
      html += '<div class="group-title"><h3>' + esc(g) + '</h3></div>';
      for (const p of ps) html += '<article class="bs-prof"><div class="bs-ph"><b>' + esc(p.t) + '</b><span class="bs-tipo t-' + p.tipo + '">' + esc(TIPOS[p.tipo][0]) + '</span></div><div class="bs-cols"><div><h4>Tanaj</h4><div data-ref="' + p.ta + '"></div><p>' + esc(p.ctx) + '</p></div><div><h4>Escrituras apostólicas</h4><div data-ref="' + p.ap + '"></div><p>' + esc(p.rel) + '</p></div></div></article>';
    }
    B.view().innerHTML = top('Profecías del Mashíaj') + '<div class="wrap bs"><p style="margin-top:16px">Cada profecía muestra el texto del Tanaj y el de las Escrituras apostólicas. El indicador distingue lo que el texto afirma de lo que es interpretación:</p>' +
      '<div class="bs-legend">' + Object.entries(TIPOS).map(([k, [n, d]]) => '<a class="bs-tipo t-' + k + (f === k ? ' on' : '') + '" href="#besora-profecias' + (f === k ? '' : '-' + k) + '" title="' + esc(d) + '">' + esc(n) + '</a>').join('') + '</div>' +
      '<details class="bs-obj"><summary>¿Qué significa cada indicador?</summary>' + Object.values(TIPOS).map(([n, d]) => '<p><b>' + esc(n) + ':</b> ' + esc(d) + '</p>').join('') + '</details>' + html + '</div>';
    for (const el of document.querySelectorAll('[data-ref]')) el.innerHTML = await versesHTML([el.dataset.ref], { max: 3 });
  }

  async function vFiestas() {
    await data(); const MO = await B.getJSON('moedim.json');
    let html = '';
    for (const m of MO) {
      if (m.id === 'shabat') continue; const f = D.fiestas[m.id]; if (!f) continue;
      html += '<details class="moed bs-fiesta"><summary><span class="t"><b>' + esc(m.tr) + '</b><span>' + esc(m.sig) + ' · ' + esc(m.fecha) + '</span></span>' + he(m.he) + '</summary><div class="body study">' +
        '<p><b>Mandato en la Torá:</b> ' + m.refs.map(r => refLink(r.replace(/^(\w+) (\d+)$/, '$1 $2'))).join(', ') + '</p><p><b>Significado histórico:</b> ' + esc(m.explicacion) + '</p><p><b>Cómo se celebra:</b> ' + esc(m.contexto) + '</p><p><b>Significado espiritual:</b> ' + esc(m.ensenanza) + '</p>' +
        '<div class="bs-pos"><b>Relación con Yahshúa (interpretación mesiánica)</b><p>' + esc(f.sig) + ' ' + esc(f.rel) + '</p><small>Textos: ' + f.refs.map(refLink).join(', ') + '</small></div></div></details>';
    }
    B.view().innerHTML = top('Las fiestas de Adonay') + '<div class="wrap bs study"><div class="bs-hero small"><p class="he" lang="he">מוֹעֲדֵי יְהוָה</p><h2>Shabat y fiestas bíblicas</h2><p>Levítico 23</p></div>' +
      '<div class="rows"><a class="row" href="#besora-tema-e-shabat"><span class="t"><b>El Shabat</b><span>Por qué guardarlo y los argumentos sobre el domingo</span></span>' + he('שַׁבָּת') + '</a><a class="row" href="#besora-tema-e-fiestas"><span class="t"><b>¿Fueron abolidas las fiestas?</b><span>Argumentos a favor y en contra</span></span></a><a class="row" href="#calendario"><span class="t"><b>Fechas de este año</b><span>Calendario bíblico</span></span></a></div>' +
      '<div style="margin-top:14px">' + html + '</div>' +
      '<h2>¿Por qué un creyente en Yahshúa debería estudiar y valorar las fiestas bíblicas?</h2><ul>' + D.fiestasPorQue.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>';
  }

  async function vRaices() {
    await data();
    let html = '';
    for (const r of D.raices) {
      html += '<details class="bs-raiz"><summary>' + he(r.he, 'bs-rhe') + '<span><b>' + esc(r.tr) + '</b><small>' + esc(r.es) + '</small></span></summary><div class="body study">' +
        '<p><b>Pronunciación:</b> ' + esc(r.pr) + ' <button class="bs-say" data-act="bs-sayhe" data-h="' + esc(r.he) + '" aria-label="Escuchar">🔊</button></p>' +
        '<p><b>Raíz:</b> ' + esc(r.raiz) + '</p>' + (r.primera ? '<p><b>Primera aparición en el Tanaj:</b> ' + refLink(r.primera) + '</p>' : '') +
        '<p><b>Pasajes:</b> ' + r.refs.map(refLink).join(', ') + '</p><p><b>Aplicación espiritual:</b> ' + esc(r.apl) + '</p><p><b>Relación con el mensaje del Mashíaj:</b> ' + esc(r.rel) + '</p>' + (r.nota ? '<p class="bs-nota">' + esc(r.nota) + '</p>' : '') + '</div></details>';
    }
    B.view().innerHTML = top('Raíces hebreas') + '<div class="wrap bs"><div class="bs-hero small"><h2>¿Por qué volver a las raíces hebreas?</h2><p>Las Escrituras fueron escritas por judíos, en hebreo y en el contexto de Israel. Conocer sus palabras clave evita malentendidos y muestra la unidad entre el Tanaj y las Escrituras apostólicas.</p></div>' + html +
      '<p class="bs-note">La primera aparición se calcula sobre el análisis palabra por palabra del texto hebreo.</p></div>';
  }

  async function vAlefTav() {
    await data(); const a = D.aleftav; visit('aleftav', 'El misterio del Alef-Tav'); const fav = ST().fav.includes('aleftav');
    B.view().innerHTML = top('El misterio del Alef-Tav') + '<div class="wrap bs study"><div class="bs-hero small"><p class="he bs-at" lang="he">אֵת</p><h2>Alef-Tav</h2><p>' + he('א') + ' primera letra · ' + he('ת') + ' última letra</p></div>' +
      '<div class="bs-brief"><span>En pocas palabras</span><p>' + esc(a.b) + '</p></div>' +
      '<div class="btns"><button class="btn" data-act="bs-fav" data-id="aleftav">' + (fav ? '★ Guardado' : '☆ Guardar') + '</button><button class="btn" data-act="bs-listen" data-id="aleftav">🔊 Escuchar</button></div>' +
      a.secciones.map(([t, p]) => '<h2>' + esc(t) + '</h2><p>' + esc(p) + '</p>').join('') +
      '<div class="bs-distinguish"><div><b>Significado gramatical</b><p>Marca del complemento directo definido. No se traduce.</p></div><div><b>Lectura simbólica</b><p>Alef y Tav, principio y fin: una meditación sobre el Mashíaj. No es una traducción ni una prueba.</p></div></div>' +
      '<h2>Los textos</h2><p class="muted" style="font-size:.88rem">La partícula אֵת aparece resaltada en el texto hebreo.</p><div id="bs-verses"><div class="loading">Cargando versículos…</div></div></div>';
    document.getElementById('bs-verses').innerHTML = await versesHTML(a.refs, { markEt: true });
  }

  async function vFaq(parts) {
    await data();
    if (parts[2] !== undefined && parts[2] !== '') {
      const i = +parts[2]; const f = D.faq[i]; if (!f) return B.go('besora-faq');
      visit('faq-' + i, f.q); const fav = ST().fav.includes('faq-' + i);
      B.view().innerHTML = top('Preguntas difíciles', 'besora-faq') + '<div class="wrap bs study"><h1 class="bs-title">' + esc(f.q) + '</h1>' +
        '<div class="bs-brief"><span>1. Respuesta breve</span><p>' + esc(f.b) + '</p></div>' +
        '<div class="btns"><button class="btn" data-act="bs-fav" data-id="faq-' + i + '">' + (fav ? '★ Guardado' : '☆ Guardar') + '</button><button class="btn" data-act="bs-listen" data-id="faq-' + i + '">🔊 Escuchar</button>' + (f.tema ? '<a class="btn solid" href="#besora-tema-' + f.tema + '">Estudio completo</a>' : '') + '</div>' +
        (f.d ? '<h2>2. Desarrollo bíblico</h2><p>' + esc(f.d) + '</p>' : '') +
        '<h2>3. Pasajes del Tanaj</h2><div id="bs-rt"></div><h2>4. Pasajes de las Escrituras apostólicas</h2><div id="bs-ra"></div>' +
        (f.con.length ? '<h2>5. Conceptos hebreos</h2><ul>' + f.con.map(c => '<li>' + esc(c) + '</li>').join('') + '</ul>' : '') +
        (f.obj ? '<h2>6. Posible objeción</h2><p>' + esc(f.obj) + '</p>' : '') +
        (f.resp ? '<h2>7. Cómo responder con respeto</h2><div class="bs-resp"><p>' + esc(f.resp) + '</p></div>' : '') + '</div>';
      document.getElementById('bs-rt').innerHTML = await versesHTML(f.rt, { max: 3 });
      document.getElementById('bs-ra').innerHTML = await versesHTML(f.ra, { max: 3 });
      return;
    }
    const s = ST();
    B.view().innerHTML = top('Preguntas difíciles') + '<div class="wrap bs"><p style="margin-top:16px">Respuestas bíblicas a las preguntas que más se escuchan. Cada una tiene una respuesta breve, el desarrollo, los pasajes, las posibles objeciones y cómo responder con respeto.</p><div class="rows">' +
      D.faq.map((f, i) => '<a class="row" href="#besora-faq-' + i + '"><span class="num">' + (i + 1) + '</span><span class="t"><b>' + esc(f.q) + '</b></span>' + (s.read['faq-' + i] ? '<span class="done">' + B.ic('check', ' width="18" height="18"') + '</span>' : '') + '</a>').join('') + '</div></div>';
  }

  /* ---------- Simulador ---------- */
  async function vSim(parts) {
    await data();
    const perfil = parts[2] || ''; const sid = parts.slice(3).join('-');
    if (perfil && sid) return vEscenario(D.sim.find(x => x.id === sid));
    const list = D.sim.filter(x => !perfil || x.perfil === perfil);
    const hist = (B.Store.get('besora:sim', []) || []);
    B.view().innerHTML = top('Simulador de conversaciones') + '<div class="wrap bs"><p style="margin-top:16px">Practica antes de una conversación real. La persona dice algo; tú estudias los textos, escribes tu respuesta y recibes una evaluación orientativa.</p>' +
      '<div class="chips">' + [['', 'Todos']].concat(PERFILES.map(p => [p[0], p[1].replace(/^(Un|Una) /, '')])).map(([k, n]) => '<a class="chip' + (perfil === k ? ' on' : '') + '" href="#besora-sim' + (k ? '-' + k : '') + '">' + esc(n) + '</a>').join('') + '</div>' +
      ['Principiante', 'Intermedio', 'Avanzado'].map(n => { const ls = list.filter(x => x.nivel === n); return ls.length ? '<div class="group-title"><h3>' + n + '</h3></div><div class="rows">' + ls.map(x => { const h = hist.filter(a => a.id === x.id); const best = h.length ? Math.max(...h.map(a => a.score)) : null; return '<a class="row" href="#besora-sim-' + x.perfil + '-' + x.id + '"><span class="t"><b>' + esc(x.frase) + '</b><span>' + esc(PNAME[x.perfil]) + (best != null ? ' · mejor resultado ' + best + '/30' : '') + '</span></span></a>'; }).join('') + '</div>' : ''; }).join('') + '</div>';
  }
  let CUR = null;
  async function vEscenario(x) {
    if (!x) return B.go('besora-sim'); CUR = x;
    B.view().innerHTML = top('Simulador', 'besora-sim-' + x.perfil) + '<div class="wrap bs">' +
      '<p class="bs-kicker">' + esc(PNAME[x.perfil]) + ' · ' + esc(x.nivel) + '</p>' +
      '<div class="bs-bubble"><span>La persona dice:</span><p>' + esc(x.frase) + '</p></div>' +
      '<div class="bs-pos"><b>Qué está afirmando</b><p>' + esc(x.afirma) + '</p></div>' +
      '<details class="bs-obj"><summary>Textos que suele usar para defender su postura</summary><div data-refs="' + x.usan.join('|') + '"></div></details>' +
      '<details class="bs-obj" open><summary>Textos que permiten examinarla</summary><div data-refs="' + x.exam.join('|') + '"></div></details>' +
      '<div class="bs-pos"><b>Una pregunta para continuar la conversación</b><p>' + esc(x.preg) + '</p></div>' +
      '<h2 style="font-size:1.15rem;margin:22px 0 6px">Tu respuesta</h2><p class="muted" style="font-size:.88rem;margin:0 0 6px">Escribe con tus palabras lo que le dirías. Incluye referencias (por ejemplo «Juan 1:3») y, si puedes, palabras hebreas.</p>' +
      '<textarea class="note-ta" id="bs-ans" rows="7" placeholder="Escribe tu respuesta…"></textarea>' +
      '<div class="btns"><button class="btn solid" data-act="bs-eval">Evaluar mi respuesta</button><button class="btn" data-act="bs-model">Ver una respuesta modelo</button><a class="btn" href="#besora-tema-' + x.tema + '">Estudio completo</a></div><div id="bs-evalout"></div></div>';
    for (const el of document.querySelectorAll('[data-refs]')) el.innerHTML = await versesHTML(el.dataset.refs.split('|'), { max: 3 });
  }
  /* Evaluación orientativa: revisa referencias, contexto, términos hebreos, claridad y tono. */
  function findRefs(text) {
    const found = []; const t = ' ' + text + ' ';
    B.BOOKS.forEach(b => {
      const names = [...new Set([b.tr, b.es].concat(b.al).map(norm))].filter(n => n.length >= 2).sort((a, z) => z.length - a.length);
      names.forEach(n => {
        const rx = new RegExp('(^|[^\\p{L}])(' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*') + ')\\.?\\s*(\\d{1,3})(?::(\\d{1,3}))?', 'giu');
        let m; while ((m = rx.exec(norm(t))) !== null) found.push(b.c + ' ' + m[3] + (m[4] ? ':' + m[4] : ''));
      });
    });
    return [...new Set(found)];
  }
  const BAD = ['mentira', 'mentiroso', 'herej', 'secta', 'tonto', 'ignorante', 'estupid', 'idiota', 'blasfem', 'engañad', 'condenad', 'falso profeta', 'diabolic', 'satanic', 'ridicul', 'absurdo'];
  const GOOD = ['entiendo', 'respeto', 'comprendo', 'reconozco', 'tienes razon', 'me gustaria', 'podemos', 'juntos', 'que piensas', 'como lo entiendes', 'te parece'];
  function evaluate(txt, x) {
    const n = norm(txt); const words = n.split(/\s+/).filter(Boolean).length;
    const refs = findRefs(txt);
    const key = r => { const p = parseRef(r); return p ? p.b + ' ' + p.c : r; };
    const expected = new Set(x.exam.concat(x.usan).map(key));
    const rel = refs.filter(r => expected.has(r.split(':')[0]));
    const bib = Math.min(5, 1 + rel.length * 2 + (refs.length > rel.length ? 1 : 0));
    const ctxHits = x.ctx.filter(k => n.includes(norm(k)));
    const ctx = Math.min(5, 1 + ctxHits.length * 1.5 + (/contexto|capitulo|versiculo|original/.test(n) ? 1 : 0));
    const hebHits = x.terms.filter(k => n.includes(norm(k)));
    const hebre = Math.min(5, 1 + hebHits.length * 2 + (/[\u05D0-\u05EA]/.test(txt) ? 1 : 0));
    const sentences = txt.split(/[.!?]+/).filter(s => s.trim()).length || 1; const avg = words / sentences;
    const clar = words < 15 ? 1 : words < 35 ? 3 : words > 320 ? 3 : avg > 40 ? 3 : 5;
    const bad = BAD.filter(k => n.includes(k)); const good = GOOD.filter(k => n.includes(k));
    const resp = Math.max(1, Math.min(5, 3 + (good.length ? 1 : 0) + (txt.includes('?') ? 1 : 0) - bad.length * 2));
    const fid = Math.round((bib + ctx) / 2 * 10) / 10;
    return { rows: [
      ['Fidelidad bíblica', Math.round(fid), rel.length ? 'Usas textos pertinentes al tema.' : 'Apóyate en los textos sugeridos para examinar la postura.'],
      ['Uso de referencias', bib, refs.length ? 'Referencias detectadas: ' + refs.map(r => { const [b, cv] = r.split(' '); return B.bookName(b) + ' ' + cv; }).join(', ') + '.' : 'No se detectaron referencias. Escríbelas como «Juan 1:3».'],
      ['Comprensión del contexto', Math.round(ctx), ctxHits.length ? 'Mencionas: ' + ctxHits.join(', ') + '.' : 'Explica el contexto del pasaje (quién habla, a quién y por qué).'],
      ['Términos hebreos', Math.round(hebre), hebHits.length ? 'Usas: ' + hebHits.join(', ') + '.' : 'Puedes incluir términos como: ' + x.terms.slice(0, 3).join(', ') + '.'],
      ['Claridad', clar, words < 35 ? 'La respuesta es muy breve; desarrolla un poco más.' : words > 320 ? 'Es larga; en una conversación conviene ser más breve.' : 'Extensión adecuada.'],
      ['Respeto y diálogo', resp, bad.length ? 'Evita expresiones como: ' + bad.join(', ') + '.' : (txt.includes('?') ? 'Bien: invitas al diálogo con una pregunta.' : 'Termina con una pregunta para seguir conversando.')]], words };
  }
  EXT.act['bs-eval'] = () => {
    const x = CUR; const txt = (document.getElementById('bs-ans').value || '').trim(); if (!txt) { B.toast('Primero escribe tu respuesta'); return; }
    const r = evaluate(txt, x); const score = r.rows.reduce((a, b) => a + b[1], 0);
    const h = B.Store.get('besora:sim', []) || []; h.unshift({ id: x.id, score, ts: Date.now() }); B.Store.set('besora:sim', h.slice(0, 100));
    document.getElementById('bs-evalout').innerHTML = '<div class="bs-eval"><h3>Evaluación orientativa: ' + score + ' / 30</h3>' + r.rows.map(([n, s, c]) => '<div class="bs-er"><div><b>' + esc(n) + '</b><span class="bs-stars" aria-label="' + s + ' de 5">' + '★'.repeat(s) + '☆'.repeat(5 - s) + '</span></div><p>' + esc(c) + '</p></div>').join('') +
      '<p class="bs-note">La evaluación es automática: revisa si citas los textos adecuados, si mencionas el contexto, si usas términos hebreos, la extensión y el tono. No juzga la verdad teológica de tu respuesta; para eso compárala con la respuesta modelo y con tu maestro.</p></div>';
    document.getElementById('bs-evalout').scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  EXT.act['bs-model'] = () => { const x = CUR; const out = document.getElementById('bs-evalout'); out.innerHTML = '<div class="bs-resp"><b>Una respuesta modelo</b><p>' + esc(x.modelo) + '</p><button class="btn" data-act="bs-copy" data-t="' + esc(x.modelo) + '">Copiar</button></div>' + out.innerHTML; };

  /* ---------- Evangelización rápida ---------- */
  let RP = { p: 'judio', t: '' };
  async function vRapida() {
    await data(); const ts = D.temas.filter(t => t.perfil === RP.p); if (!ts.find(t => t.id === RP.t)) RP.t = ts[0].id;
    const t = D.temas.find(x => x.id === RP.t);
    B.view().innerHTML = top('Evangelización rápida') + '<div class="wrap bs"><p style="margin-top:16px">Para una conversación real: elige la persona y la pregunta, y prepara tu respuesta en segundos.</p>' +
      '<div class="bs-rsel"><label><span>Persona</span><select data-act="bs-rp">' + PERFILES.map(p => '<option value="' + p[0] + '"' + (p[0] === RP.p ? ' selected' : '') + '>' + esc(p[1]) + '</option>').join('') + '</select></label>' +
      '<label><span>Pregunta o tema</span><select data-act="bs-rt">' + ts.map(x => '<option value="' + x.id + '"' + (x.id === RP.t ? ' selected' : '') + '>' + esc(x.t) + '</option>').join('') + '</select></label></div>' +
      '<article class="bs-quick"><h2>' + esc(t.t) + '</h2>' +
      '<div class="bs-brief"><span>1. Explicación breve</span><p>' + esc(t.b) + '</p></div>' +
      '<h3>2 y 3. Texto hebreo y traducción</h3><div id="bs-qv"><div class="loading">Cargando…</div></div>' +
      '<h3>4. Contexto</h3><p>' + esc(t.d[0]) + '</p>' +
      (t.pos.length ? '<h3>5 y 6. Interpretaciones</h3>' + t.pos.map(p => '<div class="bs-pos"><b>' + esc(p.q) + '</b><p>' + esc(p.e) + '</p></div>').join('') : '') +
      '<h3>7. Relación con Yahshúa</h3><p>' + esc(t.d[t.d.length - 1]) + '</p>' +
      '<h3>8. Una respuesta respetuosa</h3><div class="bs-resp"><p>' + esc(t.r) + '</p></div>' +
      '<div class="btns"><button class="btn solid" data-act="bs-listen" data-id="' + t.id + '" data-quick="1">🔊 Escuchar la explicación</button><button class="btn" data-act="bs-copy" data-t="' + esc(t.r) + '">Copiar respuesta</button><a class="btn" href="#besora-tema-' + t.id + '">Estudio completo</a></div></article></div>';
    document.getElementById('bs-qv').innerHTML = await versesHTML(t.refs.slice(0, 2), { max: 3 });
  }
  document.addEventListener('change', e => {
    const a = e.target.dataset && e.target.dataset.act;
    if (a === 'bs-rp') { RP.p = e.target.value; RP.t = ''; vRapida(); }
    if (a === 'bs-rt') { RP.t = e.target.value; vRapida(); }
  });

  /* ---------- Acciones comunes ---------- */
  EXT.act['bs-fav'] = el => { const s = ST(); const id = el.dataset.id; const has = s.fav.includes(id); s.fav = has ? s.fav.filter(x => x !== id) : [id].concat(s.fav); saveST(s); el.textContent = has ? '☆ Guardar' : '★ Guardado'; B.toast(has ? 'Quitado de favoritos' : 'Guardado en favoritos'); };
  EXT.act['bs-copy'] = async el => { try { await navigator.clipboard.writeText(el.dataset.t); B.toast('Copiado'); } catch (e) { B.toast('No se pudo copiar'); } };
  EXT.act['bs-sayhe'] = el => { if (EXT.speak) EXT.speak(el.dataset.h); };
  EXT.act['bs-listen'] = async el => {
    await data(); const id = el.dataset.id; let text = '';
    const t = D.temas.find(x => x.id === id);
    if (t) text = el.dataset.quick ? [t.t, t.b, t.d[0], t.r].join('. ') : [t.t, 'Respuesta breve.', t.b, 'Desarrollo.', ...t.d, 'Cómo responder.', t.r].join(' ');
    else if (id === 'aleftav') text = ['El misterio del Alef-Tav.', D.aleftav.b, ...D.aleftav.secciones.map(s => s[0] + '. ' + s[1])].join(' ');
    else if (id.startsWith('faq-')) { const f = D.faq[+id.slice(4)]; text = [f.q, f.b, f.d, f.resp].join(' '); }
    speakES(text);
  };

  Object.assign(EXT.routes, {
    besora: p => { const k = p[1]; if (!k) return vHome(); if (k === 'perfiles') return vPerfiles(p); if (k === 'tema') return vTema(p); if (k === 'profecias') return vProfecias(p); if (k === 'fiestas') return vFiestas(); if (k === 'raices') return vRaices(); if (k === 'aleftav') return vAlefTav(); if (k === 'faq') return vFaq(p); if (k === 'sim') return vSim(p); if (k === 'rapida') return vRapida(); return vHome(); }
  });
  EXT.tabs.besora = '';
})();
