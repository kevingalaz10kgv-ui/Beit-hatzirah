/* BEIT HATZIRAH — Sistema verbal: analizador de formas, laboratorio de conjugación y comparador de verbos.
   El analizador usa el índice de las 53.915 formas del texto hebreo (análisis morfológico del Open Scriptures
   Hebrew Bible). El laboratorio distingue formas documentadas en el Tanaj de formas generadas por reglas. */
(function () {
  'use strict';
  const EXT = window.BH_EXT;
  let B = null;
  const prevInit = EXT.init;
  EXT.init = api => { if (prevInit) prevInit(api); B = api; };
  const esc = s => B.esc(s);
  const FIN = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
  const cons = h => (h || '').replace(/[^\u05D0-\u05EA]/g, '').replace(/[ךםןףץ]/g, c => FIN[c]);
  const clean = h => (h || '').replace(/[\u0591-\u05AF\u05BD\u05C0\/]/g, '').trim();
  const rootStr = r => ((r || '').match(/[\u05D0-\u05EA][\u05C1\u05C2]?/g) || []).join('־');
  let LX = null, PI = null;
  async function base() { if (!LX) [LX, PI] = await Promise.all([B.getJSON('lexico.json'), B.getJSON('pealim/indice.json')]); }
  const SH = {}; async function verbData(id) { const i = +id % 8; if (!SH[i]) SH[i] = await B.getJSON('pealim/p' + i + '.json'); return SH[i][id] || {}; }

  /* ---------- Decodificador de la morfología (códigos del Open Scriptures Hebrew Bible) ---------- */
  const STEM = { q: 'Qal', N: 'Nifal', p: 'Piel', P: 'Pual', h: 'Hifil', H: 'Hofal', t: 'Hitpael', o: 'Polel', O: 'Polal', r: 'Hitpolel', m: 'Poel', M: 'Poal', k: 'Palel', K: 'Pulal', Q: 'Qal pasivo', l: 'Pilpel', L: 'Polpal', f: 'Hitpalpel', D: 'Nitpael', j: 'Pealal', i: 'Pilel', u: 'Hotpaal', c: 'Tifil', v: 'Hishtafel', w: 'Nitpalel', y: 'Nitpoel', z: 'Hitpoel' };
  const ASTEM = { q: 'Peal', Q: 'Peil', u: 'Hitpeel', p: 'Pael', P: 'Itpaal', M: 'Hitpaal', a: 'Afel', h: 'Hafel', s: 'Safel', e: 'Shafel', H: 'Hofal', i: 'Itpeel', t: 'Hishtafel', v: 'Ishtafel', w: 'Hitafel', o: 'Polel', z: 'Itpoel', r: 'Hitpolel', f: 'Hitpalpel', b: 'Hefal', c: 'Tifel', m: 'Poel', l: 'Palpel', L: 'Itpalpel', O: 'Itpolel', G: 'Itafal' };
  const VTYPE = { p: ['qatal', 'perfecto: acción vista como completa'], q: ['veqatal', 'perfecto consecutivo: suele continuar una secuencia futura, habitual o de mandato'], i: ['yiqtol', 'imperfecto: acción incompleta, futura, habitual o modal'], w: ['vayiqtol', 'imperfecto consecutivo: forma típica de la narración del pasado'], h: ['cohortativo', 'deseo o exhortación en primera persona'], j: ['yusivo', 'deseo o mandato en tercera persona'], v: ['imperativo', 'mandato'], r: ['participio activo', 'acción en curso o característica del sujeto'], s: ['participio pasivo', 'resultado o estado'], a: ['infinitivo absoluto', 'refuerza la acción o funciona como mandato'], c: ['infinitivo constructo', 'funciona como sustantivo verbal; a menudo con preposición'] };
  const PERS = { '1cs': 'yo', '2ms': 'tú (masculino)', '2fs': 'tú (femenino)', '3ms': 'él', '3fs': 'ella', '1cp': 'nosotros', '2mp': 'vosotros', '2fp': 'vosotras', '3mp': 'ellos', '3fp': 'ellas', '3cp': 'ellos/ellas', '2cp': 'vosotros/vosotras', '1cs ': 'yo' };
  const OBJ = { '1cs': 'a mí / me', '2ms': 'a ti (m.) / te', '2fs': 'a ti (f.) / te', '3ms': 'a él / lo', '3fs': 'a ella / la', '1cp': 'a nosotros / nos', '2mp': 'a vosotros / os', '2fp': 'a vosotras / os', '3mp': 'a ellos / los', '3fp': 'a ellas / las' };
  const POSS = { '1cs': 'mi', '2ms': 'tu (m.)', '2fs': 'tu (f.)', '3ms': 'su (de él)', '3fs': 'su (de ella)', '1cp': 'nuestro', '2mp': 'vuestro (m.)', '2fp': 'vuestro (f.)', '3mp': 'su (de ellos)', '3fp': 'su (de ellas)' };
  const GEN = { m: 'masculino', f: 'femenino', c: 'común', b: 'ambos géneros' }, NUM = { s: 'singular', p: 'plural', d: 'dual' }, ST = { a: 'absoluto', c: 'constructo', d: 'determinado' };
  const PART = { a: 'partícula afirmativa', d: 'artículo «el, la»', e: 'partícula exhortativa', i: 'partícula interrogativa', j: 'interjección', m: 'partícula demostrativa', n: 'negación', o: 'marcador del complemento directo (אֵת)', r: 'partícula relativa' };
  function decode(code) {
    if (!code) return []; const aram = code[0] === 'A'; const segs = code.slice(1).split('/'); let prevVerb = false;
    return segs.map(sg => {
      const t = sg[0], r = sg.slice(1); const o = { raw: sg };
      if (t === 'V') { const st = (aram ? ASTEM : STEM)[r[0]] || r[0]; const ty = VTYPE[r[1]] || [r[1], '']; o.kind = 'verbo'; o.binyan = st; o.forma = ty[0]; o.formaInfo = ty[1];
        if ('rs'.includes(r[1])) { o.gen = GEN[r[2]]; o.num = NUM[r[3]]; o.estado = ST[r[4]]; o.txt = 'Verbo ' + st + ', ' + ty[0] + ', ' + [o.gen, o.num].filter(Boolean).join(' '); }
        else if ('ac'.includes(r[1])) o.txt = 'Verbo ' + st + ', ' + ty[0];
        else { const pgn = r.slice(2, 5); o.persona = PERS[pgn] || pgn; o.txt = 'Verbo ' + st + ', ' + ty[0] + ', ' + (pgn[0] ? pgn[0] + '.ª persona ' : '') + [GEN[pgn[1]], NUM[pgn[2]]].filter(Boolean).join(' '); }
        prevVerb = true; return o; }
      if (t === 'N') { o.kind = 'sustantivo'; const ty = { c: 'común', g: 'gentilicio', p: 'propio' }[r[0]]; o.txt = 'Sustantivo ' + (ty || '') + (r[0] === 'p' ? '' : ', ' + [GEN[r[1]], NUM[r[2]], ST[r[3]] ? 'estado ' + ST[r[3]] : ''].filter(Boolean).join(', ')); prevVerb = false; return o; }
      if (t === 'A') { o.kind = 'adjetivo'; const ty = { a: 'adjetivo', c: 'número cardinal', g: 'gentilicio', o: 'número ordinal' }[r[0]]; o.txt = (ty || 'Adjetivo') + ', ' + [GEN[r[1]], NUM[r[2]], ST[r[3]] ? 'estado ' + ST[r[3]] : ''].filter(Boolean).join(', '); prevVerb = false; return o; }
      if (t === 'S') { o.kind = 'sufijo'; if (r[0] === 'p') { const pgn = r.slice(1, 4).replace('c', 'c'); o.txt = prevVerb ? 'Sufijo pronominal de complemento: ' + (OBJ[pgn] || pgn) : 'Sufijo posesivo: ' + (POSS[pgn] || pgn); o.obj = prevVerb ? OBJ[pgn] : null; } else o.txt = { d: 'He direccional («hacia»)', h: 'He paragógica', n: 'Nun paragógica' }[r[0]] || 'Sufijo'; return o; }
      if (t === 'P') { o.kind = 'pronombre'; o.txt = ({ d: 'Pronombre demostrativo', f: 'Pronombre indefinido', i: 'Pronombre interrogativo', p: 'Pronombre personal', r: 'Pronombre relativo' }[r[0]] || 'Pronombre') + (r.length > 1 ? ' (' + (PERS[r.slice(1, 4)] || r.slice(1)) + ')' : ''); prevVerb = false; return o; }
      if (t === 'C') { o.kind = 'conjunción'; o.txt = 'Conjunción (וְ «y»)'; return o; }
      if (t === 'R') { o.kind = 'preposición'; o.txt = r === 'd' ? 'Preposición con artículo' : 'Preposición'; return o; }
      if (t === 'T') { o.kind = 'partícula'; o.txt = (PART[r[0]] || 'Partícula'); o.txt = o.txt[0].toUpperCase() + o.txt.slice(1); return o; }
      if (t === 'D') { o.kind = 'adverbio'; o.txt = 'Adverbio'; return o; }
      o.txt = sg; return o;
    });
  }
  const lemNum = l => (l.split('/').map(x => x.replace(/[^\d]/g, '')).filter(Boolean).pop() || '');

  /* ---------- Analizador de formas ---------- */
  async function analyze(input) {
    await base(); const f = clean(input); const c = cons(f); if (!c) return { forms: [], q: input };
    let shard; try { shard = await B.getJSON('formas/' + c.charCodeAt(0).toString(16) + '.json'); } catch (e) { return { error: 'El índice de formas no está disponible en esta versión (en la vista previa por su tamaño). Funciona en la app publicada.', forms: [] }; }
    const hasN = /[\u05B0-\u05C7]/.test(f);
    let keys = hasN && shard[f] ? [f] : Object.keys(shard).filter(k => cons(k) === c);
    keys = keys.sort((a, b) => shard[b].reduce((s, x) => s + x[2], 0) - shard[a].reduce((s, x) => s + x[2], 0)).slice(0, 6);
    return { q: input, forms: keys.map(k => ({ form: k, an: shard[k].slice(0, 4).map(([lem, code, n, ref, raw]) => ({ lem, lemma: lemNum(lem), code, n, ref, raw, segs: decode(code) })) })) };
  }
  EXT.analizar = analyze; EXT.decodeMorph = decode;
  function anHTML(R) {
    if (R.error) return '<div class="notice">' + esc(R.error) + '</div>';
    if (!R.forms.length) return '<p class="muted">Esa forma no aparece en el texto hebreo del Tanaj. Revisa la escritura o prueba sin vocales.</p>';
    return R.forms.map(F => '<div class="an-form"><p class="he an-he" lang="he" dir="rtl">' + esc(F.form) + '</p>' + F.an.map(a => {
      const L = LX[a.lemma]; const v = PI.find(x => x.id === a.lemma); const verb = a.segs.find(s => s.kind === 'verbo'); const obj = a.segs.find(s => s.obj);
      return '<div class="an-an"><div class="an-segs">' + a.segs.map(s => '<span class="an-seg k-' + (s.kind || 'x') + '">' + esc(s.txt) + '</span>').join('') + '</div>' +
        (L ? '<p>Lema: <a href="#dic-' + a.lemma + '"><b class="he" lang="he">' + esc(L[0]) + '</b></a> — ' + esc(L[3] || L[4]) + (L[7] ? ' · raíz <a class="he" lang="he" href="#raiz-' + encodeURIComponent(cons(L[7])) + '">' + esc(rootStr(L[7])) + '</a>' : '') + '</p>' : '') +
        (verb ? '<p class="an-verb"><b>' + esc(verb.binyan) + ' · ' + esc(verb.forma) + '</b>: ' + esc(verb.formaInfo) + '. ' + (verb.persona ? 'Quién realiza la acción: <b>' + esc(verb.persona) + '</b>. ' : '') + (obj ? 'A quién se dirige: <b>' + esc(obj.obj) + '</b>.' : '') + '</p>' : '') +
        '<p class="muted">' + a.n + (a.n === 1 ? ' vez' : ' veces') + ' en el Tanaj · primera: <a href="#' + B.refRoute(a.ref) + '">' + esc(B.refLabel(a.ref)) + '</a>' + (v ? ' · <a href="#pealim-' + v.id + '">Conjugaciones</a>' : '') + '</p></div>';
    }).join('') + '</div>').join('');
  }
  async function vAnalizador(p) {
    await base(); const q = decodeURIComponent((p || []).slice(1).join('-') || '');
    B.view().innerHTML = B.top('Analizador de formas', { back: 'pealim' }) + '<div class="wrap an"><p style="margin-top:14px">Escribe una palabra tal como aparece en un versículo (con o sin vocales). El Moreh identifica su lema, raíz, binyán, forma verbal, persona y sufijos, con datos del análisis morfológico del texto hebreo.</p>' +
      '<div class="field"><input id="an-q" type="search" dir="rtl" lang="he" placeholder="וַיֹּאמֶר" value="' + esc(q) + '" aria-label="Forma hebrea"></div><div class="chips">' + ['וַיֹּאמֶר', 'בְּרֵאשִׁית', 'וְאָהַבְתָּ', 'שְׁמָרֵנִי', 'יִשְׁמְרֶךָ', 'הִתְהַלֶּךְ', 'נִקְרָא'].map(x => '<button class="chip he" lang="he" data-act="an-ex" data-f="' + x + '">' + x + '</button>').join('') + '</div><div id="an-out"></div>' +
      '<p class="mo-note">Fuente: Open Scriptures Hebrew Bible (morfología, CC BY 4.0) sobre el Westminster Leningrad Codex. 53.915 formas indexadas.</p></div>';
    if (q) run(q);
  }
  async function run(q) { const out = document.getElementById('an-out'); if (!out) return; out.innerHTML = '<div class="loading">Analizando…</div>'; out.innerHTML = anHTML(await analyze(q)); }
  let anT = null; document.addEventListener('input', e => { if (e.target.id === 'an-q') { clearTimeout(anT); anT = setTimeout(() => run(e.target.value), 350); } });

  /* ---------- Laboratorio de conjugación ---------- */
  // Paradigma regular (verbo fuerte) con las radicales 1, 2, 3. Fuente: paradigma tradicional de קָטַל.
  const PERS10 = ['3ms', '3fs', '2ms', '2fs', '1cs', '3cp', '2mp', '2fp', '1cp'], PERSY = ['3ms', '3fs', '2ms', '2fs', '1cs', '3mp', '3fp', '2mp', '2fp', '1cp'];
  const T = {
    q: { qatal: ['1ָ2ַ3', '1ָ2ְ3ָה', '1ָ2ַ3ְתָּ', '1ָ2ַ3ְתְּ', '1ָ2ַ3ְתִּי', '1ָ2ְ3וּ', '1ְ2ַ3ְתֶּם', '1ְ2ַ3ְתֶּן', '1ָ2ַ3ְנוּ'], yiqtol: ['יִ1ְ!2ֹ3', 'תִּ1ְ!2ֹ3', 'תִּ1ְ!2ֹ3', 'תִּ1ְ!2ְ3ִי', 'אֶ1ְ!2ֹ3', 'יִ1ְ!2ְ3וּ', 'תִּ1ְ!2ֹ3ְנָה', 'תִּ1ְ!2ְ3וּ', 'תִּ1ְ!2ֹ3ְנָה', 'נִ1ְ!2ֹ3'], imp: ['1ְ2ֹ3', '1ִ2ְ3ִי', '1ִ2ְ3וּ', '1ְ2ֹ3ְנָה'], part: ['1ֹ2ֵ3', '1ֹ2ֶ3ֶת', '1ֹ2ְ3ִים', '1ֹ2ְ3וֹת'], inf: ['1ְ2ֹ3', '1ָ2וֹ3'] },
    N: { qatal: ['נִ1ְ!2ַ3', 'נִ1ְ!2ְ3ָה', 'נִ1ְ!2ַ3ְתָּ', 'נִ1ְ!2ַ3ְתְּ', 'נִ1ְ!2ַ3ְתִּי', 'נִ1ְ!2ְ3וּ', 'נִ1ְ!2ַ3ְתֶּם', 'נִ1ְ!2ַ3ְתֶּן', 'נִ1ְ!2ַ3ְנוּ'], yiqtol: ['יִ1ּ*ָ2ֵ3', 'תִּ1ּ*ָ2ֵ3', 'תִּ1ּ*ָ2ֵ3', 'תִּ1ּ*ָ2ְ3ִי', 'אֶ1ּ*ָ2ֵ3', 'יִ1ּ*ָ2ְ3וּ', 'תִּ1ּ*ָ2ַ3ְנָה', 'תִּ1ּ*ָ2ְ3וּ', 'תִּ1ּ*ָ2ַ3ְנָה', 'נִ1ּ*ָ2ֵ3'], imp: ['הִ1ּ*ָ2ֵ3', 'הִ1ּ*ָ2ְ3ִי', 'הִ1ּ*ָ2ְ3וּ', 'הִ1ּ*ָ2ַ3ְנָה'], part: ['נִ1ְ!2ָ3', 'נִ1ְ!2ֶ3ֶת', 'נִ1ְ!2ָ3ִים', 'נִ1ְ!2ָ3וֹת'], inf: ['הִ1ּ*ָ2ֵ3', 'נִ1ְ!2ֹ3'] },
    p: { qatal: ['1ִ2ּ*ֵ3', '1ִ2ּ*ְ3ָה', '1ִ2ּ*ַ3ְתָּ', '1ִ2ּ*ַ3ְתְּ', '1ִ2ּ*ַ3ְתִּי', '1ִ2ּ*ְ3וּ', '1ִ2ּ*ַ3ְתֶּם', '1ִ2ּ*ַ3ְתֶּן', '1ִ2ּ*ַ3ְנוּ'], yiqtol: ['יְ1ַ2ּ*ֵ3', 'תְּ1ַ2ּ*ֵ3', 'תְּ1ַ2ּ*ֵ3', 'תְּ1ַ2ּ*ְ3ִי', 'אֲ1ַ2ּ*ֵ3', 'יְ1ַ2ּ*ְ3וּ', 'תְּ1ַ2ּ*ֵ3ְנָה', 'תְּ1ַ2ּ*ְ3וּ', 'תְּ1ַ2ּ*ֵ3ְנָה', 'נְ1ַ2ּ*ֵ3'], imp: ['1ַ2ּ*ֵ3', '1ַ2ּ*ְ3ִי', '1ַ2ּ*ְ3וּ', '1ַ2ּ*ֵ3ְנָה'], part: ['מְ1ַ2ּ*ֵ3', 'מְ1ַ2ּ*ֶ3ֶת', 'מְ1ַ2ּ*ְ3ִים', 'מְ1ַ2ּ*ְ3וֹת'], inf: ['1ַ2ּ*ֵ3'] },
    P: { qatal: ['1ֻ2ּ*ַ3', '1ֻ2ּ*ְ3ָה', '1ֻ2ּ*ַ3ְתָּ', '1ֻ2ּ*ַ3ְתְּ', '1ֻ2ּ*ַ3ְתִּי', '1ֻ2ּ*ְ3וּ', '1ֻ2ּ*ַ3ְתֶּם', '1ֻ2ּ*ַ3ְתֶּן', '1ֻ2ּ*ַ3ְנוּ'], yiqtol: ['יְ1ֻ2ּ*ַ3', 'תְּ1ֻ2ּ*ַ3', 'תְּ1ֻ2ּ*ַ3', 'תְּ1ֻ2ּ*ְ3ִי', 'אֲ1ֻ2ּ*ַ3', 'יְ1ֻ2ּ*ְ3וּ', 'תְּ1ֻ2ּ*ַ3ְנָה', 'תְּ1ֻ2ּ*ְ3וּ', 'תְּ1ֻ2ּ*ַ3ְנָה', 'נְ1ֻ2ּ*ַ3'], imp: [], part: ['מְ1ֻ2ּ*ָ3', 'מְ1ֻ2ּ*ֶ3ֶת', 'מְ1ֻ2ּ*ָ3ִים', 'מְ1ֻ2ּ*ָ3וֹת'], inf: [] },
    h: { qatal: ['הִ1ְ!2ִי3', 'הִ1ְ!2ִי3ָה', 'הִ1ְ!2ַ3ְתָּ', 'הִ1ְ!2ַ3ְתְּ', 'הִ1ְ!2ַ3ְתִּי', 'הִ1ְ!2ִי3וּ', 'הִ1ְ!2ַ3ְתֶּם', 'הִ1ְ!2ַ3ְתֶּן', 'הִ1ְ!2ַ3ְנוּ'], yiqtol: ['יַ1ְ!2ִי3', 'תַּ1ְ!2ִי3', 'תַּ1ְ!2ִי3', 'תַּ1ְ!2ִי3ִי', 'אַ1ְ!2ִי3', 'יַ1ְ!2ִי3וּ', 'תַּ1ְ!2ֵ3ְנָה', 'תַּ1ְ!2ִי3וּ', 'תַּ1ְ!2ֵ3ְנָה', 'נַ1ְ!2ִי3'], imp: ['הַ1ְ!2ֵ3', 'הַ1ְ!2ִי3ִי', 'הַ1ְ!2ִי3וּ', 'הַ1ְ!2ֵ3ְנָה'], part: ['מַ1ְ!2ִי3', 'מַ1ְ!2ֶ3ֶת', 'מַ1ְ!2ִי3ִים', 'מַ1ְ!2ִי3וֹת'], inf: ['הַ1ְ!2ִי3', 'הַ1ְ!2ֵ3'] },
    H: { qatal: ['הָ1ְ!2ַ3', 'הָ1ְ!2ְ3ָה', 'הָ1ְ!2ַ3ְתָּ', 'הָ1ְ!2ַ3ְתְּ', 'הָ1ְ!2ַ3ְתִּי', 'הָ1ְ!2ְ3וּ', 'הָ1ְ!2ַ3ְתֶּם', 'הָ1ְ!2ַ3ְתֶּן', 'הָ1ְ!2ַ3ְנוּ'], yiqtol: ['יָ1ְ!2ַ3', 'תָּ1ְ!2ַ3', 'תָּ1ְ!2ַ3', 'תָּ1ְ!2ְ3ִי', 'אָ1ְ!2ַ3', 'יָ1ְ!2ְ3וּ', 'תָּ1ְ!2ַ3ְנָה', 'תָּ1ְ!2ְ3וּ', 'תָּ1ְ!2ַ3ְנָה', 'נָ1ְ!2ַ3'], imp: [], part: ['מָ1ְ!2ָ3', 'מָ1ְ!2ֶ3ֶת', 'מָ1ְ!2ָ3ִים', 'מָ1ְ!2ָ3וֹת'], inf: ['הָ1ְ!2ַ3'] },
    t: { qatal: ['הִתְ!1ַ2ּ*ֵ3', 'הִתְ!1ַ2ּ*ְ3ָה', 'הִתְ!1ַ2ּ*ַ3ְתָּ', 'הִתְ!1ַ2ּ*ַ3ְתְּ', 'הִתְ!1ַ2ּ*ַ3ְתִּי', 'הִתְ!1ַ2ּ*ְ3וּ', 'הִתְ!1ַ2ּ*ַ3ְתֶּם', 'הִתְ!1ַ2ּ*ַ3ְתֶּן', 'הִתְ!1ַ2ּ*ַ3ְנוּ'], yiqtol: ['יִתְ!1ַ2ּ*ֵ3', 'תִּתְ!1ַ2ּ*ֵ3', 'תִּתְ!1ַ2ּ*ֵ3', 'תִּתְ!1ַ2ּ*ְ3ִי', 'אֶתְ!1ַ2ּ*ֵ3', 'יִתְ!1ַ2ּ*ְ3וּ', 'תִּתְ!1ַ2ּ*ֵ3ְנָה', 'תִּתְ!1ַ2ּ*ְ3וּ', 'תִּתְ!1ַ2ּ*ֵ3ְנָה', 'נִתְ!1ַ2ּ*ֵ3'], imp: ['הִתְ!1ַ2ּ*ֵ3', 'הִתְ!1ַ2ּ*ְ3ִי', 'הִתְ!1ַ2ּ*ְ3וּ', 'הִתְ!1ַ2ּ*ֵ3ְנָה'], part: ['מִתְ!1ַ2ּ*ֵ3', 'מִתְ!1ַ2ּ*ֶ3ֶת', 'מִתְ!1ַ2ּ*ְ3ִים', 'מִתְ!1ַ2ּ*ְ3וֹת'], inf: ['הִתְ!1ַ2ּ*ֵ3'] }
  };
  const BNAME = { q: 'Qal', N: 'Nifal', p: 'Piel', P: 'Pual', h: 'Hifil', H: 'Hofal', t: 'Hitpael' };
  const BGDKFT = 'בגדכפת', FINAL = { 'כ': 'ך', 'מ': 'ם', 'נ': 'ן', 'פ': 'ף', 'צ': 'ץ' };
  // Genera una forma a partir de una plantilla: 1,2,3 = radicales; «ּ*» = daguesh fuerte.
  function gen(tpl, R) {
    let out = '', lene = false;
    for (let i = 0; i < tpl.length; i++) {
      const ch = tpl[i]; const k = '123'.indexOf(ch);
      if (ch === '!') { lene = true; continue; }
      if (k < 0) { if (ch === '*') continue; out += ch; continue; }
      const L = R[k]; const strong = tpl[i + 1] === 'ּ'; const atStart = !out.length;
      out += L; if (!strong && BGDKFT.includes(L.replace(/[\u05C1\u05C2]/g, '')) && (atStart || lene)) out += 'ּ';
      lene = false;
    }
    return out.replace(/([כמנפצ])([\u05B0-\u05C7]*)$/, (m, l, v) => FINAL[l] + (l === 'כ' && !v ? 'ְ' : v));
  }
  function strongRoot(r) {
    const L = cons(r).split(''); if (L.length !== 3) return 'La raíz debe tener tres consonantes para generar el paradigma regular.';
    if ('אהחער'.includes(L[0]) || 'אהחער'.includes(L[1]) || 'אהחע'.includes(L[2])) return 'Tiene letras guturales o ר: la vocalización cambia y el paradigma regular no se aplica directamente.';
    if (L[0] === 'נ' || L[0] === 'י' || L[0] === 'ו') return 'Es una raíz débil de primera radical (' + L[0] + '): sus formas no siguen el paradigma regular.';
    if (L[1] === 'ו' || L[1] === 'י') return 'Es una raíz «hueca» (segunda ו/י).';
    if (L[2] === 'ה' || L[2] === 'א') return 'Es una raíz de tercera ' + L[2] + '.';
    if (L[1] === L[2]) return 'Es una raíz geminada.';
    return null;
  }
  async function vLab(p) {
    await base(); const q = decodeURIComponent((p || []).slice(1).join('-') || '');
    B.view().innerHTML = B.top('Laboratorio de conjugación', { back: 'pealim' }) + '<div class="wrap an"><p style="margin-top:14px">Escribe una raíz de tres letras y elige un binyán. Verás las formas <b>documentadas en el Tanaj</b> (con su referencia) y, si la raíz es regular, el paradigma <b>generado por reglas</b>, marcado como tal: una forma generada no es una cita bíblica.</p>' +
      '<div class="lab-in"><input id="lab-r" dir="rtl" lang="he" placeholder="שׁמר" value="' + esc(q) + '" aria-label="Raíz"><select id="lab-b" aria-label="Binyán">' + Object.entries(BNAME).map(([k, v]) => '<option value="' + k + '">' + v + '</option>').join('') + '</select><button class="btn solid" data-act="lab-go">Conjugar</button></div>' +
      '<div class="chips">' + ['שׁמר', 'כתב', 'זכר', 'קדשׁ', 'פקד', 'לבשׁ'].map(x => '<button class="chip he" lang="he" data-act="lab-ex" data-r="' + x + '">' + x + '</button>').join('') + '</div><div id="lab-out"></div>' +
      '<p class="mo-note">Paradigma regular de referencia: verbo fuerte (קָטַל). Las raíces guturales, débiles y geminadas solo muestran sus formas documentadas. Formas documentadas: análisis morfológico del Open Scriptures Hebrew Bible.</p></div>';
    if (q) labRun();
  }
  async function labRun() {
    const out = document.getElementById('lab-out'); const r = document.getElementById('lab-r').value; const bk = document.getElementById('lab-b').value; const c = cons(r);
    if (c.length < 2) { out.innerHTML = '<p class="muted">Escribe una raíz.</p>'; return; }
    out.innerHTML = '<div class="loading">Buscando…</div>';
    const verbs = PI.filter(v => cons(v.r) === c); let doc = {}; const docSet = new Set();
    for (const v of verbs) { try { const F = (await verbData(v.id)).f || {}; Object.entries(F).filter(([code]) => code[0] === bk).forEach(([code, list]) => { (doc[code] = doc[code] || []).push(...list.map(x => [x[0], x[1], x[2], v])); list.forEach(x => docSet.add(clean(x[0]))); }); } catch (e) { } }
    let why = strongRoot(c); const src = verbs[0] ? verbs[0].r : r; const R = (src.replace(/[^\u05D0-\u05EA\u05C1\u05C2]/g, '').match(/[\u05D0-\u05EA][\u05C1\u05C2]?/g) || []).map(l => l === 'ש' ? 'שׁ' : l).map(l => l.replace(/[ךםןףץ]/, x => FIN[x]));
    if (!why && bk === 't' && 'סצזש'.includes(c[0])) why = 'En el Hitpael, cuando la primera radical es una sibilante (ס, צ, ז, ש), la ת del prefijo cambia de lugar (metátesis): הִשְׁתַּמֵּר.';
    let html = '<h3 class="h-sec" style="margin-top:14px">' + esc(BNAME[bk]) + ' de ' + esc(c.split('').join('־')) + '</h3>';
    html += verbs.length ? '<p>Verbo' + (verbs.length > 1 ? 's' : '') + ' de esta raíz: ' + verbs.map(v => '<a href="#pealim-' + v.id + '"><b class="he" lang="he">' + esc(v.he) + '</b> «' + esc(v.es || '') + '»</a>').join(', ') + '.</p>' : '<p class="muted">No hay verbos de esta raíz en el Tanaj.</p>';
    const codes = Object.keys(doc).sort();
    html += '<h4 class="bb-h">Formas documentadas en el Tanaj</h4>' + (codes.length ? '<div class="lab-tbl"><table><tr><th>Forma</th><th>Análisis</th><th>Veces</th><th>Primera</th></tr>' + codes.map(code => doc[code].slice(0, 2).map(x => '<tr><td class="he" lang="he">' + esc(x[0]) + '</td><td>' + esc((decode('HV' + code)[0] || {}).txt || code) + '</td><td>' + x[1] + '</td><td><a href="#' + B.refRoute(x[2]) + '">' + esc(B.refLabel(x[2])) + '</a></td></tr>').join('')).join('') + '</table></div>' : '<p class="muted">Esta raíz no tiene formas documentadas en el binyán ' + esc(BNAME[bk]) + '.</p>');
    if (why) html += '<div class="notice">No se genera el paradigma regular: ' + esc(why) + ' <a href="#bib-g-verbos-debiles">Ver los verbos débiles</a></div>';
    else {
      const t = T[bk]; const row = (lbl, f) => { const g = gen(f, R); const d = docSet.has(g); return '<tr><td>' + lbl + '</td><td class="he" lang="he">' + esc(g) + '</td><td>' + esc(EXT.translit ? EXT.translit(g) : '') + '</td><td>' + (d ? '<span class="lab-ok">documentada</span>' : '<span class="lab-gen">generada por reglas</span>') + '</td></tr>'; };
      const P2 = { '3ms': 'él', '3fs': 'ella', '2ms': 'tú (m.)', '2fs': 'tú (f.)', '1cs': 'yo', '3cp': 'ellos/ellas', '3mp': 'ellos', '3fp': 'ellas', '2mp': 'vosotros', '2fp': 'vosotras', '1cp': 'nosotros' };
      html += '<h4 class="bb-h">Paradigma regular</h4><div class="lab-tbl"><table><tr><th></th><th>Forma</th><th>Transliteración</th><th>Estado</th></tr>' +
        '<tr><th colspan="4">Qatal (perfecto)</th></tr>' + t.qatal.map((f, i) => row(P2[PERS10[i]], f)).join('') +
        '<tr><th colspan="4">Yiqtol (imperfecto)</th></tr>' + t.yiqtol.map((f, i) => row(P2[PERSY[i]], f)).join('') +
        (t.imp.length ? '<tr><th colspan="4">Imperativo</th></tr>' + t.imp.map((f, i) => row(['tú (m.)', 'tú (f.)', 'vosotros', 'vosotras'][i], f)).join('') : '') +
        (t.part.length ? '<tr><th colspan="4">Participio</th></tr>' + t.part.map((f, i) => row(['m. sing.', 'f. sing.', 'm. pl.', 'f. pl.'][i], f)).join('') : '') +
        (t.inf.length ? '<tr><th colspan="4">Infinitivo</th></tr>' + t.inf.map((f, i) => row(['constructo', 'absoluto'][i], f)).join('') : '') + '</table></div>';
    }
    out.innerHTML = html;
  }

  /* ---------- Comparador de verbos ---------- */
  let CMP = [];
  async function vComparar() {
    await base();
    B.view().innerHTML = B.top('Comparar verbos', { back: 'pealim' }) + '<div class="wrap an"><p style="margin-top:14px">Elige dos o tres verbos para comparar su raíz, significado, binyanim, clase, frecuencia y uso bíblico.</p><div class="field">' + B.ic('search') + '<input id="cmp-q" type="search" placeholder="Buscar verbo (hebreo, transliteración o español)" autocomplete="off"></div><div id="cmp-s"></div><div id="cmp-t"></div></div>';
    cmpTable();
  }
  const BN = { q: 'Qal', N: 'Nifal', p: 'Piel', P: 'Pual', h: 'Hifil', H: 'Hofal', t: 'Hitpael' };
  async function cmpTable() {
    const out = document.getElementById('cmp-t'); if (!out) return; const sug = CMP.length < 3 ? '<div class="chips">' + [['8104', 'שָׁמַר'], ['5341', 'נָצַר'], ['2142', 'זָכַר'], ['7200', 'רָאָה'], ['2372', 'חָזָה']].filter(x => !CMP.includes(x[0])).map(([k, h]) => '<button class="chip he" lang="he" data-act="cmp-add" data-k="' + k + '">' + h + '</button>').join('') + '</div>' : ''; if (!CMP.length) { out.innerHTML = sug; return; }
    const rows = [];
    for (const id of CMP) { const v = PI.find(x => x.id === id); const L = LX[id]; let ex = ''; try { const F = (await verbData(id)).f || {}; const cnt = {}; Object.entries(F).forEach(([c, l]) => { cnt[c[0]] = (cnt[c[0]] || 0) + l.reduce((s, x) => s + x[1], 0); }); ex = Object.entries(cnt).sort((a, b) => b[1] - a[1]).map(([b, n]) => (BN[b] || b) + ' ' + n).join(', '); } catch (e) { }
      const cls = EXT.verbClass ? EXT.verbClass(v.r).map(x => x[0]).join(', ') || 'Regular' : '';
      rows.push([v, L, ex, cls]); }
    out.innerHTML = '<div class="lab-tbl"><table><tr><th></th>' + rows.map(([v]) => '<th><a class="he" lang="he" href="#pealim-' + v.id + '">' + esc(v.he) + '</a><br><button class="mc-tool" data-act="cmp-del" data-k="' + v.id + '">quitar</button></th>').join('') + '</tr>' +
      [['Raíz', r => '<span class="he" lang="he">' + esc(r[0].r) + '</span>'], ['Significado', r => esc(r[0].es || r[1][4])], ['Binyanim (apariciones registradas)', r => esc(r[2])], ['Clase', r => esc(r[3])], ['Frecuencia', r => r[0].n], ['Primera aparición', r => r[1][6] ? '<a href="#' + B.refRoute(r[1][6]) + '">' + esc(B.refLabel(r[1][6])) + '</a>' : '—']].map(([lbl, f]) => '<tr><th>' + lbl + '</th>' + rows.map(r => '<td>' + f(r) + '</td>').join('') + '</tr>').join('') + '</table></div>' + sug;
  }
  document.addEventListener('input', e => {
    if (e.target.id !== 'cmp-q') return; const q = e.target.value.trim(); const out = document.getElementById('cmp-s'); if (!q) { out.innerHTML = ''; return; }
    const n = q.toLowerCase(); const he = cons(q);
    const hits = PI.filter(v => (he && cons(v.he) === he) || (v.tr && v.tr.toLowerCase().startsWith(n)) || (v.es && v.es.toLowerCase().split(/[ ,;]+/).includes(n))).slice(0, 8);
    out.innerHTML = '<div class="rows">' + hits.map(v => '<button class="row" data-act="cmp-add" data-k="' + v.id + '"><span class="t"><b>' + esc(v.es || '') + '</b><span>' + esc(v.tr) + '</span></span><span class="he" lang="he">' + esc(v.he) + '</span></button>').join('') + '</div>';
  });

  Object.assign(EXT.act, {
    'an-ex': el => { const i = document.getElementById('an-q'); i.value = el.dataset.f; run(el.dataset.f); },
    'lab-go': () => labRun(), 'lab-ex': el => { document.getElementById('lab-r').value = el.dataset.r; labRun(); },
    'cmp-add': el => { if (!CMP.includes(el.dataset.k)) CMP = CMP.concat(el.dataset.k).slice(-3); const s = document.getElementById('cmp-s'); if (s) s.innerHTML = ''; const q = document.getElementById('cmp-q'); if (q) q.value = ''; cmpTable(); },
    'cmp-del': el => { CMP = CMP.filter(x => x !== el.dataset.k); cmpTable(); }
  });
  Object.assign(EXT.routes, { analizador: vAnalizador, laboratorio: vLab, comparar: p => p[1] === 'verbos' ? vComparar() : B.go('pealim') });
  ['analizador', 'laboratorio', 'comparar'].forEach(r => { EXT.tabs[r] = ''; });
  EXT.labGen = (root, bk) => { const R = cons(root).split('').map(l => l === 'ש' ? 'שׁ' : l); return T[bk] ? T[bk].qatal.map(t => gen(t, R)) : []; };
})();
