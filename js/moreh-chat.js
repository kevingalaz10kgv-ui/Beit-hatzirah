/* BEIT HATZIRAH — Conversación con el Moreh.
   Motor de consulta sobre el contenido real de la app (recuperación + composición):
   1) recibe la pregunta, 2) identifica tema y módulo, 3) busca en Biblia, diccionario, raíces, parashiot,
   moedim, Besorá, tefilot, gematría y curso, 4) recupera textos y referencias, 5) compone la respuesta
   distinguiendo texto bíblico, traducción, análisis lingüístico, contexto, interpretación y enseñanza de la app,
   6) muestra las fuentes y 7) permite abrirlas. No usa un modelo de lenguaje: no inventa nada. */
(function () {
  'use strict';
  const EXT = window.BH_EXT;
  let B = null;
  const prevInit = EXT.init;
  EXT.init = api => { if (prevInit) prevInit(api); B = api; };
  const esc = s => B.esc(s);
  const rootStr = r => ((r || '').match(/[\u05D0-\u05EA][\u05C1\u05C2]?/g) || []).join('־');
  const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[¿?¡!.,;:«»"()]/g, ' ').replace(/\s+/g, ' ').trim();
  const loose = s => norm(s).replace(/ch|kh/g, 'j').replace(/[yh'ʼ]/g, '').replace(/(.)\1/g, '$1');
  const plain = h => (h || '').replace(/[^\u05D0-\u05EA]/g, '').replace(/[ךםןףץ]/g, c => ({ 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' })[c]);
  const noTe = h => (h || '').replace(/[\u0591-\u05AF\u05BD\u05C0]/g, '');
  const M = () => EXT.moreh;

  /* ---------- Bases de contenido ---------- */
  let D = null;
  async function data() {
    if (D) return D; const g = n => B.getJSON(n).catch(() => null);
    const [LX, RA, LEM, PAR, MO, BS, TF, DIC, H2E, PI, AP] = await Promise.all(['lexico.json', 'raices.json', 'lemas.json', 'parashiot.json', 'moedim.json', 'besora.json', 'tefilot.json', 'diccionario.json', 'h2e.json', 'pealim/indice.json', 'aprender.json'].map(g));
    D = { LX, RA, LEM: LEM || {}, PAR, MO, BS, TF, DIC, H2E: H2E || {}, PI: PI || [], AP }; return D;
  }
  const TYPES = { texto: 'Texto bíblico', trad: 'Traducción', ling: 'Análisis lingüístico', ctx: 'Contexto', interp: 'Interpretación', ense: 'Enseñanza de Beit Hatzirah', dato: 'Dato de Beit Hatzirah' };
  const blk = (type, html) => ({ type, html });
  const refLink = r => '<a class="ref-chip" href="#' + B.refRoute(r) + '">' + esc(B.refLabel(r)) + '</a>';
  async function verse(r) {
    const m = r.match(/^(\w+) (\d+):(\d+)/); if (!m || !B.BY[m[1]]) return null;
    const d = await B.getBookV(m[1]); const cell = (d.c[+m[2] - 1] || [])[+m[3] - 1]; if (!cell) return null;
    return { he: cell[1] && cell[1] !== '^' ? noTe(B.heb(cell[1])) : '', es: B.es(cell[0] || ''), nt: B.BY[m[1]].nt };
  }
  async function verseBlock(r, withHe) {
    const v = await verse(r); if (!v) return '';
    return (withHe && v.he ? '<p class="he mc-he" lang="he" dir="rtl">' + esc(v.he) + '</p>' : '') + '<p class="mc-v">' + esc(v.es) + ' ' + refLink(r) + '</p>';
  }
  const rng = x => x.b + ' ' + x.s + (x.e && x.e !== x.s ? '-' + (x.e.split(':')[0] === x.s.split(':')[0] ? x.e.split(':')[1] : x.e) : '');
  const rngLabel = x => B.bookName(x.b) + ' ' + x.s + '–' + x.e;
  const trOf = k => { const v = D.PI.find(x => x.id === k); return v ? v.tr : D.LX[k][1]; };
  const pron = k => EXT.translit ? EXT.translit(D.LX[k][0]) : trOf(k);
  const gl = k => D.LX[k][3] || (D.LX[k][4] + ' (léxico de Strong, en inglés)');

  /* ---------- Reconocimiento de entidades ---------- */
  function findRef(q) {
    const m = q.match(/([1-3]?\s?[A-Za-zÁÉÍÓÚáéíóúñÑ]+)\s+(\d{1,3})(?::(\d{1,3}))?/g); if (!m) return null;
    for (const s of m) {
      const p = s.match(/([1-3]?\s?[A-Za-zÁÉÍÓÚáéíóúñÑ]+)\s+(\d{1,3})(?::(\d{1,3}))?/); const name = norm(p[1]).replace(/\s/g, '');
      const b = B.BOOKS.find(x => [x.tr, x.es].concat(x.al || []).some(a => norm(a).replace(/\s/g, '') === name)); if (!b) continue;
      const c = +p[2], v = p[3] ? +p[3] : null; if (c > b.ch) continue; return { b: b.c, c, v };
    }
    return null;
  }
  function findWords(q, onlyEs) {
    const out = []; const L = D.LX;
    const he = (q.match(/[\u05D0-\u05EA][\u05B0-\u05C7\u05D0-\u05EA]*/g) || []).map(plain);
    he.forEach(h => { const ks = Object.keys(L).filter(k => plain(L[k][0]) === h).sort((a, b) => L[b][5] - L[a][5]); if (ks[0]) out.push(ks[0]); else { for (const pre of ['ו', 'ה', 'ב', 'ל', 'מ', 'כ', 'ש']) if (h.startsWith(pre)) { const k2 = Object.keys(L).find(k => plain(L[k][0]) === h.slice(1)); if (k2) { out.push(k2); break; } } } });
    if (out.length) return out;
    const words = norm(q).split(' ').filter(w => w.length > 2 && !STOP.has(w));
    for (const w of words) {
      const lw = loose(w); let best = null, bs = 0;
      for (const k in L) {
        const r = L[k]; if (/^n-pr/.test(r[2]) && !/^[A-Z]/.test(w)) { if (loose(r[1]) !== lw) continue; }
        let sc = 0; if (r[3] && norm(r[3]).split(/[ ,;()]+/).includes(w)) sc = onlyEs ? 7 : 7; else if (!onlyEs && (loose(r[1]) === lw || loose(trOf(k)) === lw)) sc = 6;
        if (sc) { sc += Math.log10(r[5] + 1) / 2 + (r[3] ? 1 : 0); if (sc > bs) { bs = sc; best = k; } }
      }
      if (best && !out.includes(best)) out.push(best);
    }
    return out;
  }
  const STOP = new Set('que cual cuales como donde cuando quien significa significado palabra raiz raices pronuncia pronunciar aparece aparecen primera vez veces diferencia entre esta este estas estos para sobre acerca dice habla hablan explicame explica dime quiero saber puedes podrias moreh tanaj biblia torah tora hebreo hebrea version versiculo versiculos capitulo parasha parashat semana cuantas otros otras relacion tiene tienen hay existen existe mas sencilla sencillo forma manera simple enseñame ensename ayudame estudiar estudiemos juntos letras letra concepto tema temas encontramos encuentro referencias cruzadas contexto valor numerico gematria hazme preguntas vez primer primero aparecio usa usan dice decir significan'.split(' '));
  function findParasha(q) { const n = loose(q); return D.PAR.find(p => n.split(' ').includes(loose(p.tr)) || n.includes(loose(p.tr)) && loose(p.tr).length > 4) || null; }
  function findMoed(q) { const n = loose(q); return D.MO.find(m => n.includes(loose(m.tr)) || (m.id && n.includes(loose(m.id)))) || null; }
  function findTefila(q) {
    const n = norm(q); const qs = new Set(n.split(' ').filter(w => w.length > 2 && !['del', 'las', 'los', 'una', 'que', 'como'].includes(w))); let best = null, bs = 0;
    const food = /pan|comida|comer|alimento|fruta|vino|bebida/.test(n);
    (D.TF ? D.TF.tefilot : []).forEach(t => { let sc = n.includes(norm(t.es)) ? 5 : 0; const main = new Set(norm(t.es + ' ' + t.tags.join(' ')).split(' ')); const more = new Set(norm(t.momento + ' ' + t.explic).split(' ')); qs.forEach(w => { if (STOP.has(w)) return; if (main.has(w)) sc += 2; else if (more.has(w)) sc += 1; }); if (food && t.cat === 'alimentos') sc += 0.5; if (sc > bs) { bs = sc; best = t; } });
    return bs >= 2 ? best : null;
  }
  function findTopics(q) { const ws = norm(q).split(' ').filter(w => w.length > 3 && !STOP.has(w)); if (!ws.length || !D.BS) return []; return D.BS.temas.map(t => [t, ws.filter(w => norm(t.t + ' ' + t.b).includes(w)).length]).filter(x => x[1] >= Math.min(2, ws.length)).sort((a, b) => b[1] - a[1]).map(x => x[0]).slice(0, 3); }

  /* ---------- Respuestas ---------- */
  async function aMeaning(k, extra) {
    const L = D.LX[k]; const v1 = L[6] ? await verseBlock(L[6], true) : '';
    const fam = (L[7] && D.RA[L[7]] || []).filter(x => x !== k && D.LX[x][3]).slice(0, 4);
    const g = EXT.gematria ? EXT.gematria(L[0]).std : null;
    return { expr: 'explicativo', title: L[0] + ' — ' + trOf(k), blocks: (extra || []).concat([
      blk('ling', '<p><b class="he" lang="he">' + esc(L[0]) + '</b> se pronuncia <b>' + esc(pron(k)) + '</b> y significa <b>' + esc(gl(k)) + '</b>. ' + (L[7] ? 'Raíz: <b class="he" lang="he">' + esc(rootStr(L[7])) + '</b>. ' : '') + 'Aparece ' + L[5].toLocaleString('es') + ' veces en el Tanaj' + (g ? ' · gematría ' + g : '') + '.</p>'),
      L[6] ? blk('texto', '<p>Primera aparición:</p>' + v1) : null,
      fam.length ? blk('ling', '<p>Palabras de la misma raíz: ' + fam.map(x => '<a href="#dic-' + x + '"><span class="he" lang="he">' + esc(D.LX[x][0]) + '</span> «' + esc(D.LX[x][3]) + '»</a>').join(', ') + '.</p>') : null].filter(Boolean)),
      sources: [['Ficha en el diccionario', 'dic-' + k], ['Todas sus apariciones', 'concordancia-' + k]].concat(L[7] ? [['Su raíz', 'raiz-' + encodeURIComponent(plain(L[7]))]] : []),
      say: 'La palabra ' + pron(k) + ' significa ' + gl(k) + '.', hePron: L[0], follow: [['¿Cuál es su raíz?', 'raíz de ' + L[0]], ['¿Dónde aparece?', 'dónde aparece ' + L[0]], ['Hazme preguntas', 'hazme preguntas']], ctx: { word: k } };
  }
  async function aRoot(k) {
    const L = D.LX[k]; if (!L[7]) return { expr: 'comprensivo', blocks: [blk('dato', '<p>El índice de raíces (Brown-Driver-Briggs) que usa Beit Hatzirah no registra una raíz para <span class="he" lang="he">' + esc(L[0]) + '</span>. Puede ser un nombre propio, una palabra primitiva o una palabra de origen extranjero.</p>')], sources: [['Ficha en el diccionario', 'dic-' + k]], ctx: { word: k } };
    const fall = (D.RA[L[7]] || []).filter(x => x !== k); const fam = fall.filter(x => D.LX[x][3]).concat(fall.filter(x => !D.LX[x][3])).slice(0, 8);
    return { expr: 'entusiasmado', title: 'Raíz ' + rootStr(L[7]), blocks: [blk('ling', '<p>La raíz de <b class="he" lang="he">' + esc(L[0]) + '</b> es <b class="he" lang="he">' + esc(rootStr(L[7])) + '</b>, según el índice Brown-Driver-Briggs. De ella nacen ' + (D.RA[L[7]] || []).length + ' palabras en el Tanaj:</p><ul>' + fam.map(x => '<li><a href="#dic-' + x + '"><span class="he" lang="he">' + esc(D.LX[x][0]) + '</span></a> — ' + esc(gl(x)) + '</li>').join('') + '</ul>')],
      sources: [['Familia completa de la raíz', 'raiz-' + encodeURIComponent(plain(L[7]))], ['Ficha de la palabra', 'dic-' + k]], say: 'La raíz es ' + L[7].split('').join(', ') + '.', follow: [['¿Qué significa?', 'qué significa ' + L[0]], ['¿Cómo se pronuncia?', 'cómo se pronuncia ' + L[0]]], ctx: { word: k } };
  }
  async function aPron(k) { const L = D.LX[k]; return { expr: 'entusiasmado', blocks: [blk('ling', '<p><b class="he" lang="he">' + esc(L[0]) + '</b> se pronuncia <b>' + esc(pron(k)) + '</b> (transliteración de Beit Hatzirah: ו = v, ח y כ = j). Toca «Escuchar en hebreo» para oírla con la voz del teléfono.</p>')], sources: [['Ficha en el diccionario', 'dic-' + k]], hePron: L[0], ctx: { word: k } }; }
  async function aFirst(k) { const L = D.LX[k]; return { expr: 'sorprendido', blocks: [blk('ling', '<p><b class="he" lang="he">' + esc(L[0]) + '</b> aparece por primera vez en ' + refLink(L[6]) + ', según el análisis del texto hebreo.</p>'), blk('texto', await verseBlock(L[6], true))], sources: [['Abrir el versículo', B.refRoute(L[6])], ['Ficha en el diccionario', 'dic-' + k]], ctx: { word: k, ref: L[6] } }; }
  async function aOcc(k) {
    const L = D.LX[k]; const refs = (D.LEM[k] || []).slice(0, 5); let h = '';
    for (const r of refs) h += await verseBlock(r, false);
    return { expr: 'explicativo', blocks: [blk('dato', '<p><b class="he" lang="he">' + esc(L[0]) + '</b> aparece ' + L[5].toLocaleString('es') + ' veces en el Tanaj.' + (refs.length ? ' Algunos pasajes:' : ' La concordancia muestra todos los versículos.') + '</p>'), refs.length ? blk('trad', h) : null].filter(Boolean), sources: [['Concordancia completa', 'concordancia-' + k]], ctx: { word: k } };
  }
  async function aDiff(k1, k2) {
    const row = k => { const L = D.LX[k]; return '<td><b class="he" lang="he">' + esc(L[0]) + '</b><br>' + esc(pron(k)) + '</td><td>' + esc(gl(k)) + '</td><td>' + (L[7] ? '<span class="he" lang="he">' + esc(L[7]) + '</span>' : '—') + '</td><td>' + L[5] + '</td>'; };
    return { expr: 'serio', blocks: [blk('ling', '<div class="mc-tbl"><table><tr><th>Palabra</th><th>Significado</th><th>Raíz</th><th>Veces</th></tr><tr>' + row(k1) + '</tr><tr>' + row(k2) + '</tr></table></div><p>' + (D.LX[k1][7] && D.LX[k1][7] === D.LX[k2][7] ? 'Comparten la misma raíz, así que están emparentadas en su sentido básico.' : 'Tienen raíces distintas.') + ' Compara sus usos en la concordancia de cada una.</p>')], sources: [['Ficha de ' + D.LX[k1][0], 'dic-' + k1], ['Ficha de ' + D.LX[k2][0], 'dic-' + k2]] };
  }
  function parashaOf(b, c) { return D.PAR.find(p => p.lec.b === b && +p.lec.s.split(':')[0] <= c && c <= +p.lec.e.split(':')[0]); }
  async function aParasha(p, mode) {
    const per = (p.per || []).join(', '), tem = (p.temas || []).join('; ');
    if (mode === 'rel') {
      let xr = []; try { const X = await B.getJSON('xref/' + p.lec.b + '.json'); xr = (X[p.lec.s] || []).slice(0, 4); } catch (e) { }
      let h = ''; for (const r of xr) h += await verseBlock(r, false);
      return { expr: 'reflexivo', title: p.tr + ': pasajes relacionados', blocks: [blk('ctx', '<p>La haftará que la tradición lee con ' + esc(p.tr) + ' es ' + p.haft.map(x => refLink(rng(x))).join(', ') + (p.seph && p.seph.length && rng(p.seph[0]) !== rng(p.haft[0]) ? ' (sefaradí: ' + p.seph.map(x => refLink(rng(x))).join(', ') + ')' : '') + '. Se eligió por su relación temática con la porción.</p>'), xr.length ? blk('trad', '<p>Referencias cruzadas del primer versículo (' + refLink(p.lec.b + ' ' + p.lec.s) + '):</p>' + h) : null].filter(Boolean),
        sources: [['Estudio de la parashá', 'parasha-' + p.n]], follow: [['Estudiemos juntos ' + p.tr, 'quiero estudiar la parashá ' + p.tr]], ctx: { parasha: p.n } };
    }
    return { expr: 'reflexivo', title: 'Parashá ' + p.tr + ' (' + p.he + ')', blocks: [
      blk('ling', '<p><b class="he" lang="he">' + esc(p.he) + '</b> (' + esc(p.tr) + ') significa «' + esc(p.sig) + '».</p>'),
      blk('dato', '<p>Lectura: ' + refLink(rng(p.lec)) + '. Haftará: ' + p.haft.map(x => refLink(rng(x))).join(', ') + '.</p>'),
      blk('ense', '<p>' + esc(p.res) + '</p>' + (tem ? '<p><b>Temas:</b> ' + esc(tem) + '.</p>' : '') + (per ? '<p><b>Personajes:</b> ' + esc(per) + '.</p>' : ''))],
      sources: [['Estudio de la parashá', 'parasha-' + p.n], ['Leer la porción', 'lectura-' + p.n], ['Hebreo de la parashá', 'vocabparasha-' + p.n]], say: 'La parashá ' + p.tr + ' significa ' + p.sig + '. ' + p.res,
      follow: [['Estudiemos juntos', 'quiero estudiar la parashá ' + p.tr], ['Pasajes relacionados', 'qué relación tiene la parashá ' + p.tr + ' con otros pasajes'], ['Hazme preguntas', 'hazme preguntas sobre la parashá ' + p.tr]], ctx: { parasha: p.n } };
  }
  async function aChapter(r) {
    const p = parashaOf(r.b, r.c); const n = (await B.getBookV(r.b)).c[r.c - 1].length; const first = r.b + ' ' + r.c + ':1';
    let xr = []; try { const X = await B.getJSON('xref/' + r.b + '.json'); xr = (X[r.c + ':1'] || []).slice(0, 3); } catch (e) { }
    return { expr: 'reflexivo', title: 'Contexto de ' + B.bookName(r.b) + ' ' + r.c, blocks: [
      blk('dato', '<p>' + esc(B.bookName(r.b)) + ' ' + r.c + ' tiene ' + n + ' versículos.' + (p ? ' Forma parte de la parashá <a href="#parasha-' + p.n + '">' + esc(p.tr) + '</a> («' + esc(p.sig) + '»), que se lee en ' + refLink(rng(p.lec)) + '.' : '') + '</p>'),
      blk('texto', '<p>Comienza así:</p>' + await verseBlock(first, true)),
      p ? blk('ense', '<p>Resumen de la porción en Beit Hatzirah: ' + esc(p.res) + '</p>') : null,
      xr.length ? blk('ctx', '<p>Pasajes que se relacionan con su comienzo: ' + xr.map(refLink).join(', ') + ' (referencias cruzadas de OpenBible.info).</p>') : null].filter(Boolean),
      sources: [['Leer el capítulo', 'leer-' + r.b + '-' + r.c]].concat(p ? [['Estudio de la parashá', 'parasha-' + p.n]] : []), ctx: { ref: first, parasha: p && p.n } };
  }
  async function aVerse(r, mode) {
    const ref = r.b + ' ' + r.c + ':' + r.v; const v = await verse(ref); if (!v) return null;
    let xr = []; try { const X = await B.getJSON('xref/' + r.b + '.json'); xr = X[r.c + ':' + r.v] || []; } catch (e) { }
    if (mode === 'xref') { let h = ''; for (const x of xr.slice(0, 6)) h += await verseBlock(x, false); return { expr: 'explicativo', title: 'Referencias cruzadas de ' + B.refLabel(ref), blocks: [xr.length ? blk('trad', h) : blk('dato', '<p>No hay referencias cruzadas registradas para este versículo.</p>'), blk('dato', '<p class="mc-small">Fuente: OpenBible.info (CC BY). Son conexiones sugeridas para el estudio, no interpretaciones.</p>')], sources: [['Abrir el versículo', B.refRoute(ref)]], ctx: { ref } }; }
    const p = !v.nt ? parashaOf(r.b, r.c) : null;
    return { expr: 'explicativo', title: B.refLabel(ref), blocks: [v.he ? blk('texto', '<p class="he mc-he" lang="he" dir="rtl">' + esc(v.he) + '</p>' + (v.nt ? '<p class="mc-small">Traducción hebrea de Delitzsch (no es el texto original griego).</p>' : '')) : null, blk('trad', '<p class="mc-v">' + esc(v.es) + '</p>'), p ? blk('dato', '<p>Pertenece a la parashá <a href="#parasha-' + p.n + '">' + esc(p.tr) + '</a>.</p>') : null, xr.length ? blk('ctx', '<p>Referencias cruzadas: ' + xr.slice(0, 5).map(refLink).join(', ') + '.</p>') : null].filter(Boolean),
      sources: [['Abrir el versículo', B.refRoute(ref)], ['Crear una imagen', 'imagen-' + r.b + '-' + r.c + '-' + r.v]], say: v.es, follow: [['Leer palabra por palabra', 'ayúdame a leer este versículo'], ['Referencias cruzadas', 'referencias cruzadas de ' + B.refLabel(ref)]], ctx: { ref } };
  }
  async function aGem(word) {
    const g = EXT.gematria(word); if (!g.rows.length) return null;
    const eq = Object.keys(D.LX).filter(k => D.LX[k][3] && plain(D.LX[k][0]) !== plain(word) && EXT.gematria(D.LX[k][0]).std === g.std).slice(0, 5);
    return { expr: 'sorprendido', title: 'Gematría de ' + word, blocks: [blk('dato', '<p>' + g.rows.map(r => '<span class="he" lang="he">' + r.ch + '</span> = ' + r.std).join(' + ') + ' = <b>' + g.std + '</b> (Mispar Hejrejí). Gadol: ' + g.gadol + ' · Katán: ' + g.katan + ' · Sidurí: ' + g.siduri + '.</p>' + (eq.length ? '<p>Palabras del Tanaj con el mismo valor: ' + eq.map(k => '<a href="#dic-' + k + '"><span class="he" lang="he">' + esc(D.LX[k][0]) + '</span> «' + esc(D.LX[k][3]) + '»</a>').join(', ') + '.</p>' : '')), blk('interp', '<p>La gematría es una herramienta tradicional de estudio: las coincidencias invitan a reflexionar, pero no prueban una doctrina.</p>')], sources: [['Abrir la calculadora', 'gematria']] };
  }
  async function aMashiaj() {
    const P = D.BS.profecias; const T = { explicito: 'cumplimiento explícito', mesianica: 'interpretación mesiánica', tipologia: 'tipología', parcial: 'cumplimiento parcial', futuro: 'expectativa futura' };
    const pick = ['Linaje', 'Lugar de nacimiento', 'Sufrimiento', 'Exaltación', 'Su Reino futuro'].map(t => P.find(p => p.tema === t)).filter(Boolean);
    const con = D.BS.raices.find(r => r.tr === 'Mashíaj');
    return { expr: 'reflexivo', title: 'El Mashíaj en el Tanaj', blocks: [
      con ? blk('ling', '<p><b class="he" lang="he">מָשִׁיחַ</b> (Mashíaj) significa «' + esc(con.es) + '»; raíz ' + esc(con.raiz) + '. Primera aparición: ' + refLink(con.primera) + '.</p>') : null,
      blk('texto', '<p>Algunos pasajes del Tanaj que Beit Hatzirah estudia como profecías del Mashíaj:</p><ul>' + pick.map(p => '<li><b>' + esc(p.t) + '</b> — ' + refLink(p.ta) + ' <span class="mc-tag">' + esc(T[p.tipo]) + '</span></li>').join('') + '</ul>'),
      blk('interp', '<p>Cada profecía lleva un indicador que distingue lo que el texto afirma de lo que es interpretación. La tradición judía y la lectura mesiánica entienden varios de estos pasajes de manera distinta; Besorá presenta ambas con honestidad.</p>')].filter(Boolean),
      sources: [['Las 28 profecías del Mashíaj', 'besora-profecias'], ['Isaías 53 en Besorá', 'besora-tema-j-isaias53'], ['Mashíaj en el diccionario', 'dic-4899']], follow: [['¿Qué significa Isaías 53?', 'explícame el siervo sufriente de Isaías 53'], ['¿Quién es el Hijo del Hombre?', 'quién es el personaje de Daniel 7']] };
  }
  async function aTopic(t) {
    return { expr: 'reflexivo', title: t.t, blocks: [blk('ense', '<p>' + esc(t.b) + '</p>'), blk('interp', t.pos.map(p => '<p><b>' + esc(p.q) + ':</b> ' + esc(p.e) + '</p>').join('')), blk('texto', '<p>Textos: ' + t.refs.map(refLink).join(', ') + '</p>')], sources: [['Estudio completo en Besorá', 'besora-tema-' + t.id]], say: t.b, follow: [['Más sencillo', 'explícamelo más sencillo'], ['¿Qué referencias lo respaldan?', 'qué referencias bíblicas respaldan esta enseñanza']], ctx: { topic: t.id }, short: t.b };
  }
  async function aMoed(m) {
    const f = D.BS && D.BS.fiestas[m.id];
    return { expr: 'reflexivo', title: m.tr + ' (' + m.he + ')', blocks: [blk('ling', '<p><b class="he" lang="he">' + esc(m.he) + '</b>: «' + esc(m.sig) + '». Fecha: ' + esc(m.fecha) + '.</p>'), blk('texto', '<p>Mandato en la Torá: ' + m.refs.map(r => refLink(r.replace(/^(\w+ \d+)$/, '$1:1'))).join(', ') + '.</p>'), blk('ense', '<p>' + esc(m.explicacion) + ' ' + esc(m.ensenanza) + '</p>'), f ? blk('interp', '<p>Lectura mesiánica: ' + esc(f.rel) + '</p>') : null].filter(Boolean), sources: [['Calendario bíblico', 'calendario'], ['Las fiestas en Besorá', 'besora-fiestas']] };
  }
  async function aTefila(t) {
    const p = t.partes[0];
    return { expr: 'sonriente', title: t.es + ' — ' + t.he, blocks: [blk(t.estado === 'biblico' ? 'texto' : 'dato', (p.he ? '<p class="he mc-he" lang="he" dir="rtl">' + esc(p.he) + '</p>' : '') + (p.tr ? '<p><i>' + esc(p.tr) + '</i></p>' : '') + '<p>' + esc(p.es || '') + (t.partes.length > 1 ? ' …' : '') + '</p>'), blk('dato', '<p>' + esc(t.explic) + ' Cuándo: ' + esc(t.momento) + '. Fuente: ' + esc(t.fuente) + '.</p>')], sources: [['Abrir la tefilá completa', 'tefilot-t-' + t.id]], hePron: p.he };
  }
  async function aConcept(term) {
    const ks = findWords(term, true).slice(0, 2); const tops = findTopics(term);
    if (!ks.length && !tops.length) return null; const blocks = [];
    for (const k of ks) { const refs = (D.LEM[k] || [D.LX[k][6]]).filter(Boolean).slice(0, 4); let h = ''; for (const r of refs) h += await verseBlock(r, false); blocks.push(blk('ling', '<p>En hebreo, «' + esc(term) + '» se relaciona con <a href="#dic-' + k + '"><b class="he" lang="he">' + esc(D.LX[k][0]) + '</b></a> (' + esc(pron(k)) + ', «' + esc(gl(k)) + '»), que aparece ' + D.LX[k][5] + ' veces.</p>')); if (h) blocks.push(blk('trad', h)); }
    if (tops.length) blocks.push(blk('ense', '<p>Estudios de Beit Hatzirah sobre el tema: ' + tops.map(t => '<a href="#besora-tema-' + t.id + '">' + esc(t.t) + '</a>').join('; ') + '.</p>'));
    return { expr: 'explicativo', title: 'Sobre «' + term + '» en las Escrituras', blocks, sources: ks.map(k => ['Concordancia de ' + D.LX[k][0], 'concordancia-' + k]), ctx: { word: ks[0] } };
  }

  /* ---------- Biblioteca central ---------- */
  const CATT = { conceptos: 'ling', gramatica: 'ling', teologia: 'ense', personajes: 'ense', culto: 'ense', historia: 'hist', arqueologia: 'hist', geografia: 'hist', cultura: 'hist' };
  TYPES.hist = 'Investigación histórica'; TYPES.trad2 = 'Tradición interpretativa'; TYPES.ext = 'Conocimiento general (fuente externa)';
  const LSTOP = new Set('los las del de la el y en un una que con por siete antiguo antigua biblico biblica biblicos hebreo hebrea israel mundo letra vocal signo'.split(' '));
  async function libFind(q) {
    if (!EXT.biblioteca) return null; await EXT.biblioteca.data(); const n = norm(q); const qt = new Set(n.split(' ')); const RS = EXT.biblioteca.all();
    let best = null, bs = 0;
    for (const r of RS) {
      let sc = 0;
      const rhe = r.he || (r.t.match(/[\u05D0-\u05EA][\u05B0-\u05C7\u05D0-\u05EA]*/) || [])[0]; if (rhe && plain(q).length > 1 && plain(rhe).length > 1 && plain(q) === plain(rhe)) sc = 22; else if (rhe && plain(q).length > 1 && plain(rhe) && plain(q).includes(plain(rhe)) && plain(rhe).length > 2) sc = 20;
      const tr = r.tr ? norm(r.tr) : ''; const trHit = tr && tr.split(/[ /]+/).find(x => x.length > 2 && qt.has(x)); if (trHit) sc = Math.max(sc, 6 + trHit.length / 2);
      const toks = norm(r.t.replace(/\s*\([^)]*[\u05D0-\u05EA][^)]*\)/, '')).split(' ').filter(x => x.length > 2 && !LSTOP.has(x));
      const hit = toks.filter(x => qt.has(x) || qt.has(x.replace(/s$/, '')) || [...qt].some(y => y.length > 5 && (y.startsWith(x) || x.startsWith(y))));
      const when = /cuando|fecha|siglo|cronolog|epoca|ano /.test(n) && r.cron;
      if (toks.length && hit.length && (hit.length / toks.length >= .5 || hit.some(x => x.length >= 7) || when)) sc = Math.max(sc, hit.reduce((a, x) => a + x.length, 0) / toks.length + hit.length * 3 + (when ? 8 : 0));
      if (sc > bs) { bs = sc; best = r; }
    }
    return bs >= 5 ? best : null;
  }
  async function aRecord(r, level) {
    const t = CATT[r.cat] || 'ense'; let refs = ''; for (const x of r.refs.slice(0, level === 'deep' ? 6 : 3)) refs += await verseBlock(x, false);
    const words = (r.palabras || []).filter(k => D.LX[k]);
    const blocks = [blk(t, '<p>' + esc(r.directa) + '</p>' + (r.sencillo && r.sencillo !== r.directa ? '<p>' + esc(r.sencillo) + '</p>' : ''))];
    if (r.ejemplo) blocks.push(blk('ling', '<p class="he mc-he" lang="he" dir="rtl">' + esc(r.ejemplo[0]) + '</p><p><i>' + esc(r.ejemplo[1]) + '</i> — «' + esc(r.ejemplo[2]) + '»</p>'));
    if ((level === 'deep' || ['historia', 'arqueologia', 'fiestas', 'tora', 'verbos'].includes(r.cat)) && (r.profundo || []).length) blocks.push(blk(r.cat === 'conceptos' ? 'texto' : t, r.profundo.map(x => '<p>' + esc(x) + '</p>').join('')));
    if (words.length) blocks.push(blk('ling', '<p>Palabras hebreas: ' + words.map(k => '<a href="#dic-' + k + '"><span class="he" lang="he">' + esc(D.LX[k][0]) + '</span> «' + esc(gl(k)) + '»</a>').join(', ') + '.</p>'));
    if (refs) blocks.push(blk('trad', refs));
    if (r.interp) blocks.push(blk('trad2', '<p>' + esc(r.interp) + '</p>'));
    return { expr: r.cat === 'conceptos' ? 'reflexivo' : 'explicativo', title: r.t, blocks, sources: [['Abrir en la Biblioteca del Moreh', 'bib-' + r.id]].concat((r.parashot || []).slice(0, 1).map(n => ['Parashá ' + (D.PAR.find(x => +x.n === +n) || {}).tr, 'parasha-' + n])),
      say: r.directa + ' ' + (r.sencillo || ''), short: r.sencillo || r.directa, deep: r.id, refsAll: r.refs, words, ctx: { rec: r.id, word: words[0] || CH.ctx.word }, follow: [['Profundiza más', 'profundiza más'], ['Muéstrame las referencias', 'muéstrame las referencias'], ['Hazme preguntas', 'hazme preguntas']] };
  }
  async function aEsHe(w) {
    const E = EXT.biblioteca && (await EXT.biblioteca.data()).eshe || {}; const n = norm(w); const cur = E[n] || E[n.replace(/s$/, '')];
    const auto = Object.keys(D.LX).filter(k => D.LX[k][3] && norm(D.LX[k][3]).split(/[ ,;()]+/).includes(n) && !(cur || []).some(x => x[0] === k)).sort((a, b) => D.LX[b][5] - D.LX[a][5]).slice(0, 5);
    if (!cur && !auto.length) return null;
    return { expr: 'entusiasmado', title: '«' + w + '» en hebreo', blocks: [blk('ling', (cur ? '<p>En hebreo bíblico hay ' + (cur.length > 1 ? 'varios equivalentes, según el contexto' : 'un equivalente principal') + ':</p><ul>' + cur.map(([k, m]) => '<li><a href="#dic-' + k + '"><b class="he" lang="he">' + esc(D.LX[k][0]) + '</b></a> (' + esc(pron(k)) + ') — ' + esc(m) + '</li>').join('') + '</ul>' : '') + (auto.length ? '<p>' + (cur ? 'Otras palabras' : 'Palabras') + ' con ese significado: ' + auto.map(k => '<a href="#dic-' + k + '"><span class="he" lang="he">' + esc(D.LX[k][0]) + '</span> «' + esc(D.LX[k][3]) + '»</a>').join(', ') + '.</p>' : ''))],
      sources: [['Diccionario español-hebreo', 'dices']], ctx: { word: (cur ? cur[0][0] : auto[0]) }, hePron: D.LX[cur ? cur[0][0] : auto[0]][0] };
  }
  async function aVerb(k) {
    const v = D.PI.find(x => x.id === k); if (!v) return null; const cls = EXT.verbClass ? EXT.verbClass(v.r) : [];
    const BIN = { q: 'Qal', N: 'Nifal', p: 'Piel', P: 'Pual', h: 'Hifil', H: 'Hofal', t: 'Hitpael' };
    return { expr: 'explicativo', title: 'El verbo ' + v.he, blocks: [blk('ling', '<p><b class="he" lang="he">' + esc(v.he) + '</b> (' + esc(v.tr) + '): <b>' + esc(v.es || gl(k)) + '</b>. Raíz <span class="he" lang="he">' + esc(v.r) + '</span>; aparece ' + v.n + ' veces. Binyanim documentados en el Tanaj: ' + (v.st || '').split('').map(c => BIN[c]).filter(Boolean).join(', ') + '.</p>' + (cls.length ? '<p>Clase: ' + cls.map(c => '<b>' + esc(c[0]) + '</b> — ' + esc(c[1])).join(' ') + '</p>' : '<p>Es un verbo regular (fuerte).</p>'))],
      sources: [['Tablas de conjugación en PEALIM', 'pealim-' + k], ['Los siete binyanim', 'bib-g-binyanim']], ctx: { word: k }, hePron: v.he, follow: [['¿Qué son los binyanim?', '¿qué son los binyanim?'], ['Conexiones', 'muéstrame las conexiones de ' + v.he]] };
  }
  async function aConnections(k) {
    const c = await EXT.biblioteca.connections(k);
    return { expr: 'sorprendido', title: 'Conexiones de ' + D.LX[k][0], blocks: [blk('ling', '<p>Así se conecta esta palabra con los módulos de Beit Hatzirah (palabra → raíz → verbo → conjugación → gramática → apariciones → parashá → estudio):</p>' + EXT.biblioteca.mapHTML(k, c))], sources: [['Estudio completo de la palabra', 'estudio-palabra-' + k]], ctx: { word: k } };
  }
  /* Conocimiento general: solo con un servidor de IA configurado (opcional); si no, se dice con honestidad */
  async function aGeneral(q) {
    const url = (B.Store.get('moreh', {}) || {}).ia; const context = [];
    if (url) {
      try {
        const lib = await libFind(q); if (lib) context.push({ fuente: 'Biblioteca de Beit Hatzirah', titulo: lib.t, texto: lib.directa + ' ' + (lib.sencillo || '') });
        const ws = findWords(q, true).slice(0, 2); ws.forEach(k => context.push({ fuente: 'Diccionario de Beit Hatzirah', titulo: D.LX[k][0], texto: gl(k) + '; raíz ' + (D.LX[k][7] || '—') + '; primera aparición ' + (D.LX[k][6] || '—') }));
        const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pregunta: q, contexto: context }) });
        if (!r.ok) throw new Error('HTTP ' + r.status); const d = await r.json();
        return { expr: 'explicativo', blocks: [blk('ext', '<p>' + esc(d.respuesta || '').replace(/\n\n/g, '</p><p>') + '</p>' + '<p class="mc-small">Respuesta generada por el servidor de IA configurado' + (context.length ? ', con ' + context.length + ' datos de la biblioteca interna como contexto' : '') + '. Verifica la información importante.</p>')], sources: [] };
      } catch (e) { return { expr: 'comprensivo', blocks: [blk('dato', '<p>No pude comunicarme con el servidor de IA configurado (' + esc(e.message) + ').</p>')] }; }
    }
    return { expr: 'comprensivo', blocks: [blk('dato', '<p>Esa pregunta es de conocimiento general y no está en la biblioteca de Beit Hatzirah, así que no tengo una respuesta respaldada. No la voy a inventar.</p><p class="mc-small">Puedo responder preguntas generales si la administración configura el servidor de IA del Moreh (Configuración → El Moreh). Mientras tanto, puedo ayudarte con las Escrituras, el hebreo, las parashiot, las fiestas, la historia y la arqueología bíblica de la biblioteca.</p>')], sources: [['Biblioteca del Moreh', 'biblioteca']] };
  }

  async function aAnalyze(tok) {
    if (!EXT.analizar) return null; const R = await EXT.analizar(tok); if (R.error) return { expr: 'comprensivo', blocks: [blk('dato', '<p>' + esc(R.error) + '</p>')] }; if (!R.forms.length) return null;
    const F = R.forms[0]; const a = F.an[0]; const L = D.LX[a.lemma]; const verb = a.segs.find(x => x.kind === 'verbo'); const obj = a.segs.find(x => x.obj);
    const blocks = [blk('ling', '<p class="he mc-he" lang="he" dir="rtl">' + esc(F.form) + '</p><p>' + a.segs.map(x => '<b>' + esc(x.txt) + '</b>').join(' + ') + '.</p>' + (L ? '<p>Viene del lema <a href="#dic-' + a.lemma + '"><b class="he" lang="he">' + esc(L[0]) + '</b></a> «' + esc(gl(a.lemma)) + '»' + (L[7] ? ', raíz <b class="he" lang="he">' + esc(rootStr(L[7])) + '</b>' : '') + '.</p>' : '') +
      (verb ? '<p><b>' + esc(verb.binyan) + ', ' + esc(verb.forma) + '</b>: ' + esc(verb.formaInfo) + '. ' + (verb.persona ? 'Realiza la acción: <b>' + esc(verb.persona) + '</b>. ' : '') + (obj ? 'Se dirige: <b>' + esc(obj.obj) + '</b>.' : '') + '</p>' : '') + '<p>Esta forma aparece ' + a.n + (a.n === 1 ? ' vez' : ' veces') + '.</p>')];
    if (F.an.length > 1) blocks.push(blk('ling', '<p>Otros análisis posibles de la misma forma: ' + F.an.slice(1).map(x => esc(x.segs.map(y => y.txt).join(' + ')) + ' (' + x.n + ')').join('; ') + '.</p>'));
    blocks.push(blk('texto', '<p>Primera aparición:</p>' + await verseBlock(a.ref, true)));
    return { expr: 'sorprendido', title: 'Análisis de ' + F.form, blocks, sources: [['Analizador de formas', 'analizador-' + encodeURIComponent(F.form)]].concat(L ? [['Ficha del lema', 'dic-' + a.lemma]] : []).concat(D.PI.some(v => v.id === a.lemma) ? [['Conjugaciones', 'pealim-' + a.lemma]] : []), ctx: { word: L ? a.lemma : CH.ctx.word, ref: a.ref }, hePron: F.form };
  }

  /* ---------- Versículo palabra por palabra, capítulo, paradigma, variantes ---------- */
  async function aWordByWord(r) {
    const ref = r.b + ' ' + r.c + ':' + (r.v || 1); const { C } = await EXT.chapterAnalysis(r.b, r.c); const V = C.verses.find(x => x.v === (r.v || 1)); if (!V) return null;
    const rows = V.words.map(w => { const k = (w[1].split('/').map(x => x.replace(/[^\d]/g, '')).filter(Boolean).pop() || ''); const L = D.LX[k]; const segs = EXT.decodeMorph ? EXT.decodeMorph(w[2]) : []; const f = w[0].replace(/\//g, ''); return '<tr><td class="he" lang="he">' + esc(f) + '</td><td>' + esc(EXT.translit ? EXT.translit(f) : '') + '</td><td>' + (L ? '<a href="#dic-' + k + '">' + esc(L[3] || L[4]) + '</a>' : '—') + '</td><td>' + esc(segs.map(x => x.txt).join(' + ')) + '</td></tr>'; }).join('');
    return { expr: 'explicativo', title: B.refLabel(ref) + ' palabra por palabra', blocks: [blk('texto', '<p class="he mc-he" lang="he" dir="rtl">' + esc(V.heT.replace(/[\u0591-\u05AF]/g, '')) + '</p>'), blk('ling', '<div class="mc-tbl"><table><tr><th>Hebreo</th><th>Transliteración</th><th>Significado</th><th>Análisis</th></tr>' + rows + '</table></div>'), blk('trad', '<p>' + esc(V.es) + '</p>')], sources: [['Análisis interlineal del capítulo', 'interlineal-' + r.b + '-' + r.c + '-' + (r.v || 1)]], ctx: { ref } };
  }
  async function aChapterStudy(r) {
    const { C, S } = await EXT.chapterAnalysis(r.b, r.c); const top = Object.entries(S.lem).filter(([k]) => D.LX[k] && D.LX[k][3] && !/^(prep|conj|prt|d|art)/.test(D.LX[k][2])).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const ch = await aChapter(r);
    return { expr: 'reflexivo', title: 'Estudio de ' + B.bookName(r.b) + ' ' + r.c, blocks: [blk('ling', '<p><b>Vocabulario:</b> ' + S.words + ' palabras y ' + Object.keys(S.lem).length + ' lemas distintos. Más frecuentes: ' + top.map(([k, n]) => '<span class="he" lang="he">' + esc(D.LX[k][0]) + '</span> «' + esc(D.LX[k][3]) + '» (' + n + ')').join(', ') + '.</p><p><b>Verbos por binyán:</b> ' + Object.entries(S.bin).sort((a, b) => b[1] - a[1]).map(([k, n]) => esc(k) + ' ' + n).join(', ') + '.</p>' + (S.reps.length ? '<p><b>Estructura (repeticiones):</b> ' + S.reps.slice(0, 3).map(([g, vs]) => '<span class="he" lang="he">' + esc(g) + '</span> en los v. ' + [...new Set(vs)].join(', ')).join('; ') + '. Las fórmulas que se repiten suelen marcar la estructura literaria del capítulo.</p>' : '') + (S.hapax.length ? '<p><b>Hápax:</b> ' + S.hapax.length + ' palabras que solo aparecen aquí en todo el Tanaj.</p>' : ''))].concat(ch.blocks), sources: [['Análisis palabra por palabra', 'interlineal-' + r.b + '-' + r.c]].concat(ch.sources), ctx: ch.ctx };
  }
  async function aParadigm(tok) {
    const c = plain(tok); const vs = D.PI.filter(v => plain(v.r) === c || plain(v.he) === c); if (!vs.length) return null; const v = vs[0];
    const SH = await B.getJSON('pealim/p' + (+v.id % 8) + '.json'); const F = (SH[v.id] || {}).f || {}; const BN = { q: 'Qal', N: 'Nifal', p: 'Piel', P: 'Pual', h: 'Hifil', H: 'Hofal', t: 'Hitpael' };
    const by = {}; Object.entries(F).forEach(([code, l]) => { (by[code[0]] = by[code[0]] || []).push([code, l]); });
    const cls = EXT.verbClass ? EXT.verbClass(v.r) : [];
    return { expr: 'explicativo', title: 'Paradigma de ' + v.he, blocks: [blk('ling', '<p><b class="he" lang="he">' + esc(v.he) + '</b> «' + esc(v.es || gl(v.id)) + '», raíz ' + esc(v.r) + '. ' + (cls.length ? 'Clase: ' + cls.map(x => x[0]).join(', ') + '. ' + esc(cls[0][1]) : 'Verbo regular.') + '</p>'),
      blk('texto', '<p><b>Formas documentadas en el Tanaj</b> (no generadas):</p>' + Object.entries(by).map(([b, l]) => '<p><b>' + (BN[b] || b) + ':</b> ' + l.sort((x, y) => y[1].reduce((s, z) => s + z[1], 0) - x[1].reduce((s, z) => s + z[1], 0)).slice(0, 6).map(([code, lst]) => '<span class="he" lang="he">' + esc(lst[0][0]) + '</span> (' + esc(((EXT.decodeMorph('HV' + code)[0] || {}).txt || '').replace(/^Verbo \S+, /, '')) + ')').join(', ') + '.</p>').join('')),
      blk('ling', cls.length ? '<p>Como es un verbo débil, el laboratorio muestra solo sus formas documentadas y no genera un paradigma por reglas, para no inventar formas.</p>' : '<p>En el laboratorio puedes ver el paradigma regular completo, generado por reglas y marcado como tal.</p>')],
      sources: [['Laboratorio de conjugación', 'laboratorio-' + c], ['Tablas de PEALIM', 'pealim-' + v.id]], ctx: { word: v.id } };
  }
  async function aVariants(q) {
    const ref = findRef(q); const RS = (await EXT.biblioteca.data(), EXT.biblioteca.all()).filter(r => r.cat === 'critica');
    const hit = ref ? RS.filter(r => r.refs.some(x => x.startsWith(ref.b + ' ' + ref.c + ':'))) : RS;
    if (ref && !hit.length) return { expr: 'comprensivo', blocks: [blk('dato', '<p>La biblioteca de Beit Hatzirah no registra variantes textuales para ' + esc(B.bookName(ref.b) + ' ' + ref.c + (ref.v ? ':' + ref.v : '')) + '. Eso no significa que no existan: el aparato crítico completo de la Biblia Hebraica no está integrado por derechos de autor.</p>')], sources: [['Crítica textual en la biblioteca', 'bibcat-critica']] };
    return { expr: 'reflexivo', title: 'Variantes textuales', blocks: hit.slice(0, 3).map(r => blk('trad2', '<p><b>' + esc(r.t) + ':</b> ' + esc(r.sencillo) + '</p>')).concat([blk('dato', '<p class="mc-small">Las variantes se presentan con su testimonio y grado de certeza; ninguna reconstrucción se presenta como el texto original indiscutible.</p>')]), sources: [['Crítica textual', 'bibcat-critica']] };
  }

  /* ---------- Preguntas para comprobar lo aprendido ---------- */
  async function parashaWords(p) {
    const MO = await B.getJSON('morph/' + p.lec.b + '.json'); const cnt = {};
    const key = s => s.split(':').map(Number); const a = key(p.lec.hs), z = key(p.lec.he);
    for (const cv of Object.keys(MO)) { const k = key(cv); if ((k[0] > a[0] || (k[0] === a[0] && k[1] >= a[1])) && (k[0] < z[0] || (k[0] === z[0] && k[1] <= z[1]))) MO[cv].forEach(w => w[1].split('/').filter(x => /^\d/.test(x)).forEach(x => { const l = x.replace(/\D/g, '').split(' ')[0]; const L = D.LX[l]; if (L && L[3] && !/^(n-pr|prep|conj|prt|d|art|inj|r|i|p)/.test(L[2])) cnt[l] = (cnt[l] || 0) + 1; })); }
    return Object.entries(cnt).sort((x, y) => y[1] - x[1]).slice(0, 10).map(x => x[0]);
  }
  async function makeQuiz(src) {
    let pool = []; let title = '';
    if (src && src.parasha) { const p = D.PAR.find(x => +x.n === +src.parasha); pool = await parashaWords(p); title = 'Palabras de la parashá ' + p.tr; }
    if (pool.length < 4) { const s = B.Store.get('learn', {}) || {}; const items = D.AP.worlds.flatMap(w => w.units.flatMap(u => u.items)); const seen = Object.keys(s.srs || {}); pool = items.filter(it => seen.includes(it.id) && it.es && it.he && !/^l-/.test(it.id)).map(it => 'it:' + it.id); title = 'Palabras que estás aprendiendo'; }
    if (pool.length < 4) { pool = Object.keys(D.LX).filter(k => D.LX[k][3] && !/^n-pr/.test(D.LX[k][2])).sort((a, b) => D.LX[b][5] - D.LX[a][5]).slice(0, 40); title = 'Palabras frecuentes del Tanaj'; }
    const items = D.AP.worlds.flatMap(w => w.units.flatMap(u => u.items));
    const info = id => { if (id.startsWith('it:')) { const it = items.find(x => x.id === id.slice(3)); return { he: it.he, es: it.es, tr: it.tr || '' }; } const L = D.LX[id]; return { he: L[0], es: L[3], tr: pron(id), k: id }; };
    const sh = a => a.map(x => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
    return { title, qs: sh(pool).slice(0, 5).map(id => { const c = info(id); const opts = sh([c.es].concat(sh(pool.filter(x => x !== id)).slice(0, 3).map(x => info(x).es))); return { he: c.he, tr: c.tr, ok: c.es, opts, k: c.k }; }), i: 0, score: 0 };
  }
  function quizMsg(Q) {
    const q = Q.qs[Q.i]; return { expr: 'atento', title: Q.title + ' · ' + (Q.i + 1) + ' de ' + Q.qs.length, blocks: [blk('dato', '<p>¿Qué significa <b class="he mc-q" lang="he">' + esc(q.he) + '</b>' + (q.tr ? ' (' + esc(q.tr) + ')' : '') + '?</p><div class="mc-opts">' + q.opts.map((o, j) => '<button class="btn" data-act="mc-quiz" data-j="' + j + '">' + esc(o) + '</button>').join('') + '</div>')], hePron: q.he };
  }

  /* ---------- Interpretar la pregunta ---------- */
  async function respond(q) {
    await data(); const n = norm(q); const C = CH.ctx;
    const ctxWord = () => C.word || null;
    // clases completas («Estudiemos juntos» por temas)
    const CLS = [[/hebreo desde cero|empezar (con el )?hebreo|aprender hebreo desde/, 'hebreo'], [/(todos )?los binyanim|los siete binyanim/, 'binyanim'], [/aprender a conjugar|conjugar verbos|como se conjuga/, 'conjugar'], [/estudiar (el libro de )?bereshit|el libro de bereshit|estudiar genesis/, 'bereshit'], [/historia del antiguo israel|historia de israel/, 'historia'], [/contexto historico de los profetas|historia de los profetas/, 'profetas'], [/los cinco libros|libros de la tora/, 'tora'], [/(las )?fiestas biblicas|todas las fiestas/, 'fiestas'], [/arqueologia biblica/, 'arqueologia'], [/gramatica (hebrea )?intermedia|aprender gramatica/, 'gramatica']];
    if (/ensename|ensenarme|quiero (aprender|estudiar|comprender)|estudiemos|clase|curso|desarrollemos/.test(n)) for (const [rx, id] of CLS) if (rx.test(n)) return { expr: 'entusiasmado', blocks: [blk('dato', '<p>¡Estudiemos juntos! Preparé una clase con lecciones ordenadas y preguntas al final para comprobar lo aprendido.</p>')], sources: [['Comenzar la clase', 'clase-' + id]], go: 'clase-' + id };
    // análisis de una forma hebrea
    const heTok = (q.match(/[\u05D0-\u05EA][\u05B0-\u05C7\u05D0-\u05EA\u05BE]*/g) || []).sort((a, b) => b.length - a.length)[0];
    if (heTok && /analiza|que forma|de que (raiz|verbo|palabra) (viene|proviene)|que binyan|quien realiza|forma verbal|morfolog/.test(n)) { const r = await aAnalyze(heTok); if (r) return r; }
    // pruebas avanzadas: palabra por palabra, capítulo, paradigma, variantes, salmo, comparación semántica
    const rf = findRef(q);
    if (rf && /palabra por palabra|interlineal/.test(n)) { const r = await aWordByWord(rf); if (r) return r; }
    if (rf && !rf.v && /(analiza|estudia|estudiemos|analisis de)( el)? capitulo/.test(n)) return aChapterStudy(rf);
    const sm = n.match(/salmo (\d+)/); if (sm && /analiza|estudia|analisis|paralelismo|estructura/.test(n)) { const ps = +sm[1]; const rec = ps === 1 && EXT.biblioteca.rec('p-salmo1'); const st = await aChapterStudy({ b: 'PSA', c: ps }); if (rec) { const r0 = await aRecord(rec, 'deep'); st.blocks = r0.blocks.concat(st.blocks.slice(0, 1)); } st.blocks.push(blk('ling', '<p>En el análisis interlineal, cada versículo del salmo se muestra en sus dos miembros (divididos por el acento atnaj) para observar el paralelismo.</p>')); st.sources = [['Ver el salmo con sus paralelismos', 'interlineal-PSA-' + ps]].concat(st.sources); return st; }
    if (/paradigma|conjuga(cion|r)? (de|el verbo)|tabla de conjugacion/.test(n) && heTok) { const r = await aParadigm(heTok); if (r) return r; }
    if (/variante|manuscrito|critica textual|qumran/.test(n)) return aVariants(q);
    const dif = n.match(/diferencia (?:hay |contextual )?entre (.+?) y (.+)/); if (dif && EXT.biblioteca) { const ka = findWords(dif[1])[0], kb = findWords(dif[2])[0]; const rec = ka && kb && EXT.biblioteca.all().find(r => r.pair && r.pair.includes(ka) && r.pair.includes(kb)); if (rec) { const r = await aRecord(rec, 'deep'); const t = await aDiff(ka, kb); r.blocks = r.blocks.concat(t.blocks); return r; } }
    // libros de la Torá
    const bk = /capitulos|el libro de|libro|cuantos versiculos/.test(n) && B.BOOKS.find(b => ['GEN', 'EXO', 'LEV', 'NUM', 'DEU'].includes(b.c) && [b.tr, b.es].some(x => n.includes(norm(x))));
    if (bk && EXT.biblioteca) { const r = EXT.biblioteca.rec('libro-' + bk.c.toLowerCase()); if (r) return aRecord(r, 'deep'); }
    // niveles de respuesta sobre lo anterior
    if (/^(profundiza|ampl[ií]a|desarrolla mas|mas profundo|explica(me)? mas)/.test(n) && CH.last) { const L = CH.last; if (L.deep) { const r = EXT.biblioteca.rec(L.deep); if (r) return aRecord(r, 'deep'); } if (C.word) return Object.assign(await aConnections(C.word), { intro: 'Profundicemos en la palabra y sus conexiones:' }); if (C.parasha) return { expr: 'entusiasmado', blocks: [blk('dato', '<p>Para profundizar, estudiemos la parashá paso a paso.</p>')], sources: [['Estudiemos juntos', 'estudiemos-' + C.parasha]] }; }
    if (/muestrame las referencias|que referencias|dame las referencias|citas biblicas/.test(n) && CH.last && (CH.last.refsAll || C.ref)) { const refs = CH.last.refsAll || [C.ref]; let h = ''; for (const r of refs.slice(0, 8)) h += await verseBlock(r, false); return { expr: 'explicativo', title: 'Referencias', blocks: [blk('trad', h)], sources: CH.last.sources }; }
    if (/ensename el hebreo|las palabras hebreas|palabras en hebreo/.test(n) && CH.last && (CH.last.words || C.word)) { const ws = (CH.last.words && CH.last.words.length ? CH.last.words : [C.word]); return { expr: 'entusiasmado', blocks: [blk('ling', ws.map(k => '<p><a href="#dic-' + k + '"><b class="he" lang="he">' + esc(D.LX[k][0]) + '</b></a> — ' + esc(pron(k)) + ': «' + esc(gl(k)) + '»' + (D.LX[k][7] ? ', raíz ' + esc(rootStr(D.LX[k][7])) : '') + '.</p>').join(''))], hePron: D.LX[ws[0]][0], ctx: { word: ws[0] } }; }
    if (/(desarrolla|hazme|prepara(me)?) (un )?estudio completo|estudio completo/.test(n)) { if (C.rec) return { expr: 'entusiasmado', blocks: [blk('dato', '<p>Abro el estudio completo en la Biblioteca del Moreh.</p>')], sources: [['Abrir el estudio', 'bib-' + C.rec]], go: 'bib-' + C.rec }; const wk = findWords(q)[0] || C.word; if (wk) return { expr: 'entusiasmado', blocks: [blk('dato', '<p>Preparé un estudio completo de <b class="he" lang="he">' + esc(D.LX[wk][0]) + '</b> en diez pasos.</p>')], sources: [['Abrir el estudio', 'estudio-palabra-' + wk]], go: 'estudio-palabra-' + wk }; if (C.parasha) return { expr: 'entusiasmado', blocks: [blk('dato', '<p>Estudiemos la parashá paso a paso.</p>')], go: 'estudiemos-' + C.parasha, sources: [['Estudiemos juntos', 'estudiemos-' + C.parasha]] }; }
    if (/(de que|sobre que) (estabamos hablando|hablabamos)|retomemos|retomar (la |el )?(conversacion|tema)|donde nos quedamos/.test(n)) { const s = B.Store.get('moreh:ctx', null); if (!s) return { expr: 'comprensivo', blocks: [blk('dato', '<p>No tengo guardado un tema anterior.</p>')] }; Object.assign(C, s); const label = s.word ? 'la palabra ' + D.LX[s.word][0] : s.parasha ? 'la parashá ' + (D.PAR.find(x => +x.n === +s.parasha) || {}).tr : s.ref ? B.refLabel(s.ref) : s.rec ? (EXT.biblioteca.rec(s.rec) || {}).t : 'un tema'; return { expr: 'sonriente', blocks: [blk('dato', '<p>Estábamos estudiando ' + esc(label) + '. ¿Seguimos? Puedes pedirme «profundiza más», «muéstrame las referencias» o «hazme preguntas».</p>')], follow: [['Profundiza más', 'profundiza más'], ['Hazme preguntas', 'hazme preguntas']] }; }
    // acciones de agente: abrir, buscar, llevar a…
    const go = n.match(/^(abre|abrir|abreme|llevame a|llevame|muestrame|ir a|ve a|busca|buscame|encuentra|localiza)\s+(.*)$/);
    if (go && !/referencias|conexiones|hebreo/.test(n)) {
      const what = go[2]; const MOD = { diccionario: 'diccionario', tefilot: 'tefilot', gematria: 'gematria', audio: 'audio', 'audio libro': 'audio', besora: 'besora', biblioteca: 'biblioteca', calendario: 'calendario', parashiot: 'parashiot', biblia: 'biblia', pealim: 'pealim', curso: 'aprender', 'mi camino': 'camino' };
      for (const m in MOD) if (norm(what).replace(/^(el|la|los|las) /, '') === m) return { expr: 'sonriente', blocks: [blk('dato', '<p>Te llevo a ' + esc(m) + '.</p>')], go: MOD[m] };
      const ref = findRef(what); if (ref) return { expr: 'sonriente', blocks: [blk('dato', '<p>Abro ' + esc(B.bookName(ref.b) + ' ' + ref.c + (ref.v ? ':' + ref.v : '')) + '.</p>')], go: 'leer-' + ref.b + '-' + ref.c + (ref.v ? '-' + ref.v : ''), ctx: { ref: ref.b + ' ' + ref.c + ':' + (ref.v || 1) } };
      const p = findParasha(what); if (p && /parash/.test(n)) return { expr: 'sonriente', blocks: [blk('dato', '<p>Abro la parashá ' + esc(p.tr) + '.</p>')], go: 'parasha-' + p.n, ctx: { parasha: p.n } };
      const t = findTefila(what + ' bendicion oracion'); if (t && /tefil|oracion|bendic/.test(n)) return { expr: 'sonriente', blocks: [blk('dato', '<p>Abro ' + esc(t.es) + '.</p>')], go: 'tefilot-t-' + t.id };
      const r = await libFind(what); if (r) return { expr: 'sonriente', blocks: [blk('dato', '<p>Abro «' + esc(r.t) + '» en la biblioteca.</p>')], go: 'bib-' + r.id, ctx: { rec: r.id } };
      const w = findWords(what)[0]; if (w) { if (/raiz/.test(n) && D.LX[w][7]) return { expr: 'sonriente', blocks: [blk('dato', '<p>Abro la raíz ' + esc(rootStr(D.LX[w][7])) + '.</p>')], go: 'raiz-' + encodeURIComponent(plain(D.LX[w][7])), ctx: { word: w } }; if (/verbo|conjug/.test(n) && D.PI.some(v => v.id === w)) return { expr: 'sonriente', blocks: [blk('dato', '<p>Abro las conjugaciones.</p>')], go: 'pealim-' + w, ctx: { word: w } }; return { expr: 'sonriente', blocks: [blk('dato', '<p>Abro la ficha de <b class="he" lang="he">' + esc(D.LX[w][0]) + '</b>.</p>')], go: 'dic-' + w, ctx: { word: w } }; }
    }
    const qe = n.match(/quiero estudiar (?:el significado de )?(?:la palabra )?(.+)$/); if (qe && !/parash/.test(n)) { const wk = findWords(qe[1])[0]; if (wk) { const a0 = await aMeaning(wk); a0.intro = 'Estudiemos la palabra juntos. Aquí está lo esencial; abro también el estudio completo en diez pasos.'; a0.go = 'estudio-palabra-' + wk; a0.sources = [['Estudio completo', 'estudio-palabra-' + wk]].concat(a0.sources); return a0; } }
    if (/recomiendame una leccion|que leccion|siguiente leccion|que estudio hoy|que me recomiendas estudiar/.test(n)) { const nx = EXT.nextLesson ? await EXT.nextLesson() : null; const w = await thisWeek(); return { expr: 'entusiasmado', blocks: [blk('dato', (nx ? '<p>En el curso de hebreo te recomiendo continuar con «' + esc(nx.name) + '» (' + esc(nx.world) + ').</p>' : '') + '<p>Y para la Torá, la parashá de esta semana es ' + esc(w.tr) + '.</p>')], sources: (nx ? [['Continuar el curso', 'leccion-' + nx.id + '-l']] : []).concat([['Estudiemos juntos ' + w.tr, 'estudiemos-' + w.n]]) }; }
    // acciones que modifican datos del usuario: siempre con confirmación
    if (/(guarda|guardar|agrega|agregar|anade)( esta| la)? palabra|a mis palabras/.test(n)) { const wk = findWords(q.replace(/guarda|palabra|mis palabras/gi, ''))[0] || C.word; if (!wk) return { expr: 'comprensivo', blocks: [blk('dato', '<p>¿Qué palabra quieres guardar? Abre primero su ficha o escríbela.</p>')] }; return { expr: 'atento', blocks: [blk('dato', '<p>¿Agrego <b class="he" lang="he">' + esc(D.LX[wk][0]) + '</b> («' + esc(gl(wk)) + '») a tus palabras para repasar?</p><div class="btns"><button class="btn solid" data-act="mc-confirm" data-do="save" data-k="' + wk + '">Sí, guardarla</button><button class="btn" data-act="mc-confirm" data-do="no">No</button></div>')] }; }
    if (/marca(r)?( la parasha)? como estudiada/.test(n) && C.parasha) { const p = D.PAR.find(x => +x.n === +C.parasha); return { expr: 'atento', blocks: [blk('dato', '<p>¿Marco la parashá ' + esc(p.tr) + ' como estudiada en tu progreso?</p><div class="btns"><button class="btn solid" data-act="mc-confirm" data-do="studied" data-n="' + p.n + '">Sí, marcarla</button><button class="btn" data-act="mc-confirm" data-do="no">No</button></div>')] }; }
    // conexiones, español-hebreo y verbos
    if (/conexion|relaciones de|como se conecta/.test(n)) { const wk = findWords(q.replace(/conexion(es)?/gi, ''))[0] || C.word; if (wk) return aConnections(wk); }
    const sh = n.match(/como se dice (.+?) en hebreo|(?:^|\s)(.+?) en hebreo$|traduce (.+?) al hebreo/); if (sh) { const r = await aEsHe((sh[1] || sh[2] || sh[3]).replace(/^(el|la|los|las|un|una) /, '')); if (r) return r; }
    if (/(el )?verbo|conjuga/.test(n)) { const wk = findWords(q.replace(/verbo|conjuga\w*/gi, ''))[0] || C.word; if (wk && D.PI.some(v => v.id === wk)) return aVerb(wk); }
    if (/hazme preguntas|ponme a prueba|evaluame|examiname|comprobar si aprendi|preguntame/.test(n)) { const p = findParasha(q); CH.quiz = await makeQuiz(p ? { parasha: p.n } : C.parasha ? { parasha: C.parasha } : null); return Object.assign(quizMsg(CH.quiz), { intro: 'Muy bien. Te haré ' + CH.quiz.qs.length + ' preguntas.' }); }
    if (/por que .*(equivocad|incorrect|mal|error)|explicame (mi )?error/.test(n)) {
      const w = CH.lastWrong; if (!w) return { expr: 'comprensivo', blocks: [blk('dato', '<p>Todavía no tengo una respuesta tuya equivocada para explicar. Pídeme «hazme preguntas» y te explico cada error.</p>')] };
      return { expr: 'comprensivo', blocks: [blk('ling', '<p>Elegiste «' + esc(w.chosen) + '», pero <b class="he" lang="he">' + esc(w.he) + '</b>' + (w.tr ? ' (' + esc(w.tr) + ')' : '') + ' significa «' + esc(w.ok) + '».' + (w.k && D.LX[w.k][7] ? ' Su raíz es ' + esc(rootStr(D.LX[w.k][7])) + ': recordarla ayuda a distinguirla.' : '') + ' Es un error frecuente: con la repetición se fija.</p>')], sources: w.k ? [['Ficha de la palabra', 'dic-' + w.k]] : [] };
    }
    if (/mas sencill|mas simple|resumen|resumelo|en pocas palabras/.test(n)) { const L = CH.last; if (L && L.short) return { expr: 'sonriente', blocks: [blk('ense', '<p>' + esc(L.short) + '</p>')], sources: L.sources }; if (L) { const first = L.blocks && L.blocks[0]; return { expr: 'sonriente', blocks: [first || blk('dato', '<p>No tengo una versión más breve.</p>')], sources: L.sources }; } }
    if (/estudi(ar|emos)|desarroll/.test(n) && /parash/.test(n)) { const p = findParasha(q) || (C.parasha && D.PAR.find(x => +x.n === +C.parasha)) || await thisWeek(); return { expr: 'entusiasmado', blocks: [blk('dato', '<p>¡Estudiemos juntos la parashá ' + esc(p.tr) + '! Te guiaré en 8 pasos: presentación, estructura, pasajes, palabras hebreas, enseñanzas, referencias, preguntas y profundización.</p>')], sources: [['Comenzar «Estudiemos juntos»', 'estudiemos-' + p.n]], go: 'estudiemos-' + p.n }; }
    if (/ensena(me)? (las )?letras|alfabeto|alef ?bet/.test(n)) return { expr: 'entusiasmado', blocks: [blk('dato', '<p>El alef-bet tiene 22 letras, todas consonantes; las vocales se indican con el nikud. Te las presento una por una, con su sonido, su valor y un ejemplo de la Torá.</p>')], sources: [['Aprende con el Moreh: el alfabeto', 'aprende-alfabeto'], ['Curso «Yo aprendo hebreo»', 'aprender']] };
    if (/ayudame a (leer|estudiar)|palabra por palabra/.test(n)) { if (/palabra/.test(n) && ctxWord() && !/versiculo|leer/.test(n)) return aMeaning(ctxWord()); return { expr: 'entusiasmado', blocks: [blk('dato', '<p>Leamos juntos el versículo palabra por palabra: el texto, la transliteración, el significado y los prefijos de cada palabra.</p>')], sources: [['Comenzar la lectura', 'aprende-leer']] }; }
    if (/mashiaj|mesias/.test(n) && /tanaj|profec|dice|anuncia|antiguo/.test(n)) return aMashiaj();
    // parashá
    const par = findParasha(q);
    if (/parash/.test(n) || (par && /significa|que es|que ensena|ensena/.test(n) && !findRef(q))) {
      const p = par || (/esta semana|semanal|de hoy|actual/.test(n) || !C.parasha ? await thisWeek() : D.PAR.find(x => +x.n === +C.parasha));
      if (p) { const r = await aParasha(p, /relacion|otros pasajes|relaciona|haftar/.test(n) ? 'rel' : ''); if (par && /significa/.test(n)) { const wk = findWords(p.he).filter(k => D.LX[k][3]).slice(0, 1); if (wk.length) { const w = await aMeaning(wk[0]); r.blocks.push(blk('ling', '<p>Como palabra: ' + w.blocks[0].html.replace(/<\/?p>/g, '') + '</p>')); r.sources = r.sources.concat(w.sources.slice(0, 1)); } } return r; }
    }
    // referencias bíblicas
    const ref = findRef(q) || (/este versiculo|este pasuq/.test(n) && C.ref ? parseRef(C.ref) : null);
    if (ref) { if (/referencias cruzadas|relacionad|otros versiculos/.test(n) && ref.v) return aVerse(ref, 'xref'); if (!ref.v || /contexto/.test(n)) return aChapter(ref); return aVerse(ref); }
    // gematría
    if (/gematr|valor numerico|cuanto vale/.test(n)) { const h = (q.match(/[\u05D0-\u05EA][\u05B0-\u05C7\u05D0-\u05EA]*/) || [])[0] || (ctxWord() && D.LX[ctxWord()][0]); if (h) return aGem(h); return { expr: 'atento', blocks: [blk('dato', '<p>Escribe una palabra hebrea, por ejemplo: «¿cuál es la gematría de שלום?».</p>')], sources: [['Abrir la calculadora', 'gematria'], ['Aprende la gematría con el Moreh', 'aprende-gematria']] }; }
    // diferencia entre dos palabras
    const dm = n.match(/diferencia (?:hay )?entre (.+?) y (.+)/); if (dm) { const a = findWords(dm[1])[0], b = findWords(dm[2])[0]; if (a && b && a !== b) return aDiff(a, b); }
    // fiestas
    const moed = findMoed(q); if (moed) { const r = EXT.biblioteca && EXT.biblioteca.rec('moed-' + moed.id); return r ? aRecord(r, 'deep') : aMoed(moed); }
    // tefilot
    if (/bendic|oracion|tefil|rezar|bracha|beraja|shema|kidush|havdal|birkat|motzi|mode ani|modeh|netilat|kadish|alein|adon olam|salmo/.test(n)) { const t = findTefila(q); if (t) return aTefila(t); }
    // conceptos («¿dónde encontramos…?», «¿qué versículos hablan sobre…?»)
    const cm = n.match(/(?:sobre|acerca de|habla de|hablan de|concepto de|tema de|encontramos el concepto de|encontramos)\s+(?:el |la |los |las )?(.+)$/);
    if (cm && /donde|versiculos|que dice|pasajes|encontramos|concepto/.test(n)) { const r = await aConcept(cm[1]); if (r) return r; }
    // enseñanzas (Besorá) y «este estudio»
    if (/este estudio|esta ensenanza|este tema/.test(n) && C.topic) { const t = D.BS.temas.find(x => x.id === C.topic); if (/referencias|respald|textos/.test(n)) return { expr: 'explicativo', blocks: [blk('texto', '<p>Textos que respaldan «' + esc(t.t) + '»: ' + t.refs.map(refLink).join(', ') + '.</p>'), blk('interp', t.pos.map(p => '<p><b>' + esc(p.q) + ':</b> ' + p.refs.map(refLink).join(', ') + '</p>').join(''))], sources: [['Estudio completo', 'besora-tema-' + t.id]] }; return aTopic(t); }
    if (/referencias .*respald|que textos respaldan/.test(n) && C.topic) { const t = D.BS.temas.find(x => x.id === C.topic); return { expr: 'explicativo', blocks: [blk('texto', '<p>' + t.refs.map(refLink).join(', ') + '</p>')], sources: [['Estudio completo', 'besora-tema-' + t.id]] }; }
    // biblioteca central (conceptos, temas, mundo bíblico, gramática)
    if (!/[\u05D0-\u05EA]/.test(q) || /que es|explica/.test(n)) { const r = await libFind(q); if (r && (/que es|que son|que era|que eran|que paso|que se encontro|cuando|donde|explica|que significa|que fue|quien|como|cual|habla|cuentame|historia/.test(n) || norm(r.t).length > 5)) return aRecord(r, /profund|detall|completo/.test(n) ? 'deep' : ''); }
    // palabras
    const hasHe = /[\u05D0-\u05EA]/.test(q); const followUp = /^(y )?(cual es )?(su|esta|la) |^(como se pronuncia|donde aparece|cuantas veces)|su raiz|esta palabra/.test(n);
    const words = (followUp && !hasHe && ctxWord()) ? [] : findWords(q);
    if (hasHe && !words.length && heTok) { const r = await aAnalyze(heTok); if (r) return r; } const wk = words[0] || (/esta palabra|la palabra|su raiz|se pronuncia|aparece|raiz/.test(n) ? ctxWord() : null);
    if (wk) { if (/raiz|shoresh/.test(n)) return aRoot(wk); if (/pronunci|se dice|se lee/.test(n)) return aPron(wk); if (/primera vez|primera aparicion|primer lugar/.test(n)) return aFirst(wk); if (/donde (mas )?aparece|cuantas veces|apariciones|donde se encuentra/.test(n)) return aOcc(wk); return aMeaning(wk); }
    const tops = findTopics(q); if (tops.length) return aTopic(tops[0]);
    if (ctxWord() && /raiz|pronuncia|aparece/.test(n)) return aRoot(ctxWord());
    if (!/[\u05D0-\u05EA]/.test(q) && !findWords(q, true).length && !findTopics(q).length) return aGeneral(q);
    return { expr: 'comprensivo', blocks: [blk('dato', '<p>No encontré información suficiente en Beit Hatzirah para responder eso. Puedo ayudarte con palabras hebreas (significado, raíz, pronunciación, apariciones), versículos y capítulos, parashiot, fiestas, tefilot, gematría, profecías y los estudios de Besorá. Prueba con otras palabras o usa la búsqueda global.</p>')], sources: [['Búsqueda global', 'buscar-todo']], follow: [['¿Qué significa shalom?', '¿qué significa shalom?'], ['Parashá de esta semana', '¿qué enseña la parashá de esta semana?'], ['Hazme preguntas', 'hazme preguntas']] };
  }
  async function thisWeek() { const w = await B.weekInfo(); return w && w.list && w.list[0] ? D.PAR.find(x => +x.n === +w.list[0].n) : D.PAR[0]; }
  function parseRef(r) { const m = r.match(/^(\w+) (\d+):(\d+)/); return m ? { b: m[1], c: +m[2], v: +m[3] } : null; }

  /* ---------- Vista de la conversación ---------- */
  const CH = { ctx: {}, last: null, quiz: null, lastWrong: null, from: '' };
  const hist = () => B.Store.get('moreh:chat', []) || [];
  const saveHist = h => B.Store.set('moreh:chat', h.slice(-40));
  function ctxFrom(h) {
    const c = {}; let m;
    if ((m = h.match(/^#dic-(\d+)/))) c.word = m[1];
    if ((m = h.match(/^#leer-(\w+)-(\d+)-(\d+)/))) c.ref = m[1] + ' ' + m[2] + ':' + m[3]; else if ((m = h.match(/^#leer-(\w+)-(\d+)/))) c.ref = m[1] + ' ' + m[2] + ':1';
    if ((m = h.match(/^#(?:parasha|lectura|vocabparasha|estudiemos)-(\d+)/))) c.parasha = +m[1];
    if ((m = h.match(/^#besora-tema-(.+)/))) c.topic = m[1];
    return c;
  }
  function render(a) {
    return (a.intro ? '<p>' + esc(a.intro) + '</p>' : '') + (a.title ? '<h4 class="mc-title">' + esc(a.title) + '</h4>' : '') +
      a.blocks.map(b => '<div class="mc-blk t-' + b.type + '"><span class="mc-type">' + TYPES[b.type] + '</span>' + b.html + '</div>').join('') +
      ((a.sources || []).length ? '<div class="mc-src"><span>Ver fuente en Beit Hatzirah:</span>' + a.sources.map(([l, r]) => '<a class="btn" href="#' + r + '">' + esc(l) + '</a>').join('') + '</div>' : '') +
      '<div class="mc-tools">' + (a.say || a.blocks.length ? '<button class="mc-tool" data-act="mc-say">🔊 Escuchar</button>' : '') + (a.hePron ? '<button class="mc-tool" data-act="mc-sayhe" data-h="' + esc(a.hePron) + '">🔊 En hebreo</button>' : '') + '</div>' +
      ((a.follow || []).length ? '<div class="mc-follow">' + a.follow.map(([l, qq]) => '<button class="chip" data-act="mc-ask" data-q="' + esc(qq) + '">' + esc(l) + '</button>').join('') + '</div>' : '');
  }
  function chip(l, a) {
    if (a === 'tour') return '<button class="chip" data-act="mo-tourstart">' + esc(l) + '</button>';
    if (a.startsWith('go:')) return '<a class="chip" href="#' + a.slice(3) + '">' + esc(l) + '</a>';
    if (a.startsWith('aprende:')) return '<a class="chip" href="#aprende-' + a.slice(8) + '">' + esc(l) + '</a>';
    if (a.startsWith('gem:')) return '<button class="chip" data-act="mc-ask" data-q="¿cuál es la gematría de ' + esc(a.slice(4)) + '?">' + esc(l) + '</button>';
    return '<button class="chip" data-act="mc-ask" data-q="' + esc(a.replace(/^ask:/, '')) + '">' + esc(l) + '</button>';
  }
  const bubble = (who, html) => '<div class="mc-msg ' + who + '">' + (who === 'm' ? M().avatar(36, '', 'sonriente', false) : '') + '<div class="mc-b">' + html + '</div></div>';
  async function vChat() {
    await data(); const prev = CH.from; CH.ctx = Object.assign({}, ctxFrom(prev)); const c = M().ctxOf(prev); const sug = M().CTX[c].q;
    const H = hist();
    B.view().innerHTML = B.top('Conversar con el Moreh', { back: prev ? prev.slice(1) : 'inicio', right: '<button class="icon-btn" data-act="mc-clear" aria-label="Borrar la conversación">🗑️</button>' }) +
      '<div class="wrap mc"><div class="mc-head">' + M().fig('idle', '', 'sonriente', { wasp: 'hover' }) + '<div class="mc-intro"><b>Moreh Gabriel ben Eliyah</b><span>Respondo con el contenido de Beit Hatzirah: Biblia, diccionario, raíces, parashiot, fiestas, tefilot, gematría, Besorá y el curso. Te muestro siempre las fuentes.</span></div></div>' +
      '<div class="mc-quick"><a class="chip" href="#aprende-alfabeto">Aprende con el Moreh</a><button class="chip" data-act="mc-ask" data-q="quiero estudiar la parashá de esta semana">Estudiemos juntos</button><button class="chip" data-act="mc-ask" data-q="hazme preguntas">Hazme preguntas</button><button class="chip" data-act="mo-tourstart">Recorrido guiado</button><a class="chip" href="#camino">Mi camino</a><button class="chip" data-act="mo-hide">Ocultar al Moreh</button></div>' +
      '<div class="mc-log" id="mc-log" aria-live="polite">' + (H.length ? H.map(m => bubble(m.w, m.h)).join('') : bubble('m', '<p>' + esc(M().msgFor(c)) + '</p>')) + '</div>' +
      '<div class="mc-sug">' + sug.concat([['¿Qué significa Bereshit?', 'ask:¿qué significa Bereshit?'], ['¿Qué dice el Tanaj sobre el Mashíaj?', 'ask:¿qué dice el Tanaj sobre el Mashíaj?'], ['Contexto de Génesis 1', 'ask:¿cuál es el contexto de Génesis 1?']]).slice(0, 6).map(([l, a]) => chip(l, a)).join('') + '</div>' +
      '<div class="mc-lvl"><span>Nivel:</span>' + ['principiante', 'intermedio', 'avanzado'].map(l => '<button class="chip" data-act="mc-lvl" data-l="' + l + '" aria-pressed="' + (((B.Store.get('moreh', {}) || {}).nivel || 'intermedio') === l) + '">' + l[0].toUpperCase() + l.slice(1) + '</button>').join('') + '</div>' +
      '<form class="mc-form" onsubmit="return false"><input id="mc-q" type="text" placeholder="Pregúntale al Moreh…" aria-label="Tu pregunta" autocomplete="off"><button class="btn solid" data-act="mc-send">Enviar</button></form></div>';
    const log = document.getElementById('mc-log'); log.scrollTop = log.scrollHeight;
    const inp = document.getElementById('mc-q'); const head = document.querySelector('.mc-head');
    inp.addEventListener('focus', () => M().expr(head, 'atento')); inp.addEventListener('input', () => M().expr(head, 'atento'));
  }
  async function ask(q) {
    q = (q || '').trim(); if (!q) return; const log = document.getElementById('mc-log'); const head = document.querySelector('.mc-head'); if (!log) return;
    const H = hist(); const uh = '<p>' + esc(q) + '</p>'; H.push({ w: 'u', h: uh }); log.insertAdjacentHTML('beforeend', bubble('u', uh));
    log.insertAdjacentHTML('beforeend', '<div class="mc-msg m mc-think">' + M().avatar(36, '', 'pensativo', false) + '<div class="mc-b"><p>…</p></div></div>'); log.scrollTop = log.scrollHeight;
    M().expr(head, 'pensativo'); head.classList.add('w-attn');
    let a; try { a = await respond(q); } catch (e) { a = { expr: 'comprensivo', blocks: [blk('dato', '<p>No pude consultar esa información en este momento.</p>')] }; }
    const lvl = (B.Store.get('moreh', {}) || {}).nivel || 'intermedio';
    try {
      if (lvl === 'avanzado' && a.deep && !a._deep) { const r = EXT.biblioteca.rec(a.deep); if (r) { a = Object.assign(await aRecord(r, 'deep'), { _deep: true }); } }
      if (lvl === 'avanzado' && a.ctx && a.ctx.word && !a.deep && EXT.biblioteca && a.blocks.length && !/conexiones/i.test(a.title || '')) { const c = await EXT.biblioteca.connections(a.ctx.word); a.blocks.push(blk('ling', '<p>Conexiones de la palabra:</p>' + EXT.biblioteca.mapHTML(a.ctx.word, c))); }
      if (lvl === 'principiante' && a.blocks.length > 2) { a.blocks = a.blocks.slice(0, 2); a.follow = [['Explícame más', 'profundiza más']].concat(a.follow || []).slice(0, 3); }
    } catch (e) { }
    await new Promise(r => setTimeout(r, 450));
    log.querySelector('.mc-think') && log.querySelector('.mc-think').remove();
    if (a.ctx) { Object.assign(CH.ctx, a.ctx); B.Store.set('moreh:ctx', CH.ctx); } CH.last = a;
    const html = render(a); H.push({ w: 'm', h: html }); saveHist(H);
    log.insertAdjacentHTML('beforeend', bubble('m', html)); const last = log.lastElementChild; M().expr(last, a.expr || 'sonriente');
    M().expr(head, a.expr || 'sonriente'); head.classList.remove('w-attn'); M().talk(head, true); setTimeout(() => M().talk(head, false), Math.min(3500, 900 + (a.say || '').length * 30));
    last.scrollIntoView({ block: 'start', behavior: 'smooth' });
    if (a.go) setTimeout(() => B.go(a.go), 1600);
  }
  function speakES(text, el) {
    const S = window.speechSynthesis; if (!S) return B.toast('Este navegador no permite la lectura en voz alta');
    const vs = S.getVoices().filter(v => /^es/i.test(v.lang)); if (!vs.length) return B.toast('No hay una voz en español instalada en este dispositivo');
    S.cancel(); const u = new SpeechSynthesisUtterance(B.es(text).replace(/[\u0590-\u05FF]+/g, '')); const pref = (B.Store.get('audio', {}) || {}).vEs; u.voice = vs.find(v => v.name === pref) || vs[0]; u.lang = u.voice.lang; u.rate = 0.97;
    const head = document.querySelector('.mc-head');
    u.onstart = () => M().talk(head, true); u.onboundary = () => { M().talk(head, true); }; u.onend = u.onerror = () => M().talk(head, false);
    S.speak(u);
  }

  /* ---------- Estudiemos juntos ---------- */
  let ST = null;
  async function vEstudiemos(p) {
    await data(); const n = +p[1]; const par = D.PAR.find(x => +x.n === n) || await thisWeek();
    if (!ST || ST.n !== par.n) { B.view().innerHTML = B.top('Estudiemos juntos', { back: 'parasha-' + par.n }) + '<div class="loading">El Moreh prepara el estudio…</div>'; ST = { n: par.n, i: 0, steps: await buildStudy(par), ans: {} }; }
    renderStudy(par);
  }
  async function buildStudy(p) {
    const S = []; const bk = B.bookName(p.lec.b);
    S.push({ t: '1. Presentación', expr: 'sonriente', pose: 'welcome', html: '<p class="he mc-big" lang="he">' + esc(p.he) + '</p><p>La parashá <b>' + esc(p.tr) + '</b> («' + esc(p.sig) + '») es la porción ' + p.n + ' de 54. Está en ' + esc(bk) + ' y se lee en ' + refLink(rng(p.lec)) + '.</p>' });
    S.push({ t: '2. Estructura', expr: 'explicativo', pose: 'explain', html: '<p>La lectura se divide en ' + p.aliyot.length + ' aliyot (las partes en que se llama a leer la Torá):</p><ol>' + p.aliyot.map(a => '<li>' + refLink(rng(a)) + '</li>').join('') + '</ol>' });
    let pas = ''; for (const a of p.aliyot.filter((_, i) => i % 3 === 0).slice(0, 3)) pas += await verseBlock(a.b + ' ' + a.s, true);
    S.push({ t: '3. Pasajes principales', expr: 'reflexivo', pose: 'teach', type: 'texto', html: '<p>Así comienzan algunas aliyot:</p>' + pas });
    const ws = await parashaWords(p); ST_WORDS = ws;
    S.push({ t: '4. Palabras hebreas importantes', expr: 'entusiasmado', pose: 'point', type: 'ling', html: '<p>Las palabras con significado más frecuentes en esta porción (según el análisis del texto hebreo):</p><div class="rows">' + ws.slice(0, 8).map(k => '<a class="row" href="#dic-' + k + '"><span class="t"><b>' + esc(D.LX[k][3]) + '</b><span>' + esc(pron(k)) + '</span></span><span class="he" lang="he">' + esc(D.LX[k][0]) + '</span></a>').join('') + '</div>' });
    const rel = (D.BS ? D.BS.temas : []).filter(t => t.refs.some(r => r.startsWith(p.lec.b + ' ') && (() => { const c = +r.split(' ')[1].split(':')[0]; return c >= +p.lec.s.split(':')[0] && c <= +p.lec.e.split(':')[0]; })()));
    S.push({ t: '5. Enseñanzas disponibles', expr: 'reflexivo', pose: 'reflect', type: 'ense', html: '<p>' + esc(p.res) + '</p>' + (p.temas && p.temas.length ? '<p><b>Temas:</b> ' + esc(p.temas.join('; ')) + '.</p>' : '') + (p.per && p.per.length ? '<p><b>Personajes:</b> ' + esc(p.per.join(', ')) + '.</p>' : '') + (rel.length ? '<p><b>En Besorá:</b> ' + rel.map(t => '<a href="#besora-tema-' + t.id + '">' + esc(t.t) + '</a>').join('; ') + '.</p>' : '') });
    let xr = []; try { const X = await B.getJSON('xref/' + p.lec.b + '.json'); xr = (X[p.lec.s] || []).slice(0, 3); } catch (e) { }
    let xh = ''; for (const r of xr) xh += await verseBlock(r, false);
    S.push({ t: '6. Referencias relacionadas', expr: 'explicativo', pose: 'point', type: 'ctx', html: '<p>Haftará: ' + p.haft.map(x => refLink(rng(x))).join(', ') + '.</p>' + (xh ? '<p>Pasajes relacionados con su primer versículo:</p>' + xh : '') });
    const others = D.PAR.filter(x => x.n !== p.n); const sh = a => a.map(x => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
    const qs = [{ q: '¿Qué significa el nombre «' + p.tr + '»?', ok: p.sig, opts: sh([p.sig].concat(sh(others).slice(0, 3).map(x => x.sig))) }];
    if (p.per && p.per.length) { const notIn = sh(others.flatMap(x => x.per || []).filter(x => !p.per.includes(x))); qs.push({ q: '¿Cuál de estos personajes aparece en esta parashá?', ok: p.per[0], opts: sh([p.per[0]].concat([...new Set(notIn)].slice(0, 3))) }); }
    if (ws.length >= 4) { const k = ws[0]; qs.push({ q: '¿Qué significa ' + D.LX[k][0] + '?', ok: D.LX[k][3], opts: sh([D.LX[k][3]].concat(ws.slice(1, 4).map(x => D.LX[x][3]))) }); }
    S.push({ t: '7. Preguntas', expr: 'atento', pose: 'idle', quiz: qs });
    S.push({ t: '8. Profundizar', expr: 'celebracion', pose: 'celebrate', html: '<p>¡Kol hakavod! (Muy bien hecho.) Puedes profundizar en cualquier punto:</p><div class="btns"><a class="btn" href="#parasha-' + p.n + '">Estudio de la parashá</a><a class="btn" href="#lectura-' + p.n + '">Leer la porción</a><a class="btn" href="#vocabparasha-' + p.n + '">Hebreo de la parashá</a><button class="btn solid" data-act="st-done" data-n="' + p.n + '">Marcar como estudiada</button></div>' });
    return S;
  }
  let ST_WORDS = [];
  function renderStudy(p) {
    const s = ST.steps[ST.i]; const n = ST.steps.length;
    const quiz = s.quiz ? s.quiz.map((q, qi) => '<div class="st-q"><p><b>' + esc(q.q) + '</b></p><div class="mc-opts">' + q.opts.map((o, j) => { const st = ST.ans[qi]; const cls = st === undefined ? '' : o === q.ok ? ' ok' : st === j ? ' bad' : ''; return '<button class="btn' + cls + '" data-act="st-ans" data-q="' + qi + '" data-j="' + j + '"' + (st !== undefined ? ' disabled' : '') + '>' + esc(o) + '</button>'; }).join('') + '</div>' + (ST.ans[qi] !== undefined ? '<p class="st-fb">' + (q.opts[ST.ans[qi]] === q.ok ? '¡Correcto!' : 'La respuesta correcta es «' + esc(q.ok) + '».') + '</p>' : '') + '</div>').join('') : '';
    B.view().innerHTML = B.top('Estudiemos juntos', { back: 'parasha-' + p.n }) + '<div class="wrap mo-learnv">' +
      '<div class="mo-stage">' + M().fig(s.pose, '', s.expr, { nowasp: s.type === 'ling' || !!s.quiz }) + '<div class="mo-board">' + (s.type === 'ling' || s.quiz ? M().WASP('land', 'mo-letter-wasp') : '') + '<small>' + esc(p.tr) + ' · ' + esc(s.t) + ' (' + (ST.i + 1) + ' de ' + n + ')</small>' + (s.type ? '<span class="mc-type t-' + s.type + '">' + TYPES[s.type] + '</span>' : '') + (s.html || '') + quiz + '</div></div>' +
      '<div class="mo-steps"><button class="btn" data-act="st-step" data-d="-1"' + (ST.i ? '' : ' disabled') + '>Anterior</button><div class="mo-dots">' + ST.steps.map((_, k) => '<i' + (k === ST.i ? ' class="on"' : '') + '></i>').join('') + '</div><button class="btn solid" data-act="st-step" data-d="1"' + (ST.i < n - 1 ? '' : ' disabled') + '>Siguiente</button></div>' +
      '<p class="mo-note">Estudio preparado con el contenido de Beit Hatzirah: datos de la parashá, texto hebreo del Códice de Leningrado, análisis morfológico y referencias cruzadas.</p></div>';
    const st = document.querySelector('.mo-stage'); M().talk(st, true); setTimeout(() => M().talk(st, false), 2200);
  }

  /* ---------- Acciones ---------- */
  Object.assign(EXT.act, {
    'mc-send': () => { const i = document.getElementById('mc-q'); if (i && i.value.trim()) { const q = i.value; i.value = ''; ask(q); } },
    'mc-ask': el => { if (el.dataset.go) return B.go(el.dataset.go); ask(el.dataset.q); },
    'mc-say': el => { const b = el.closest('.mc-b'); if (b) speakES(b.innerText.replace(/Ver fuente en Beit Hatzirah:[\s\S]*/, '').replace(/(Texto bíblico|Traducción|Análisis lingüístico|Contexto|Interpretación|Enseñanza de Beit Hatzirah|Dato de Beit Hatzirah)\n/g, '')); },
    'mc-sayhe': el => { if (EXT.speak) EXT.speak(el.dataset.h); },
    'mc-lvl': el => { const p = B.Store.get('moreh', {}) || {}; p.nivel = el.dataset.l; B.Store.set('moreh', p); document.querySelectorAll('[data-act=mc-lvl]').forEach(b => b.setAttribute('aria-pressed', b.dataset.l === p.nivel)); B.toast('Nivel ' + p.nivel + ': adaptaré la profundidad de mis respuestas'); },
    'mc-confirm': el => {
      const d = el.dataset.do; el.parentNode.querySelectorAll('button').forEach(b => b.disabled = true);
      if (d === 'save') { const L = D.LX[el.dataset.k]; if (EXT.saveWord) EXT.saveWord({ id: 'lx-' + el.dataset.k, he: L[0], tr: pron(el.dataset.k), es: L[3] || L[4] }); B.toast('Palabra guardada en tus palabras para repasar'); }
      else if (d === 'studied') { const s = B.Store.get('studied', {}) || {}; s[el.dataset.n] = Date.now(); B.Store.set('studied', s); B.toast('Parashá marcada como estudiada'); }
      else B.toast('De acuerdo, no hice ningún cambio');
    },
    'mc-clear': () => { saveHist([]); CH.last = null; vChat(); },
    'mc-quiz': el => {
      const Q = CH.quiz; if (!Q) return; const q = Q.qs[Q.i]; const chosen = q.opts[+el.dataset.j]; const ok = chosen === q.ok; const head = document.querySelector('.mc-head');
      el.parentNode.querySelectorAll('button').forEach(b => { b.disabled = true; if (b.textContent === q.ok) b.classList.add('ok'); }); if (!ok) el.classList.add('bad');
      if (ok) { Q.score++; M().expr(head, 'celebracion'); head.classList.add('w-party'); setTimeout(() => head.classList.remove('w-party'), 1400); }
      else { CH.lastWrong = { he: q.he, tr: q.tr, ok: q.ok, chosen, k: q.k }; M().expr(head, 'comprensivo'); }
      const log = document.getElementById('mc-log'); const fb = ok ? '<p>¡Correcto! <b class="he" lang="he">' + esc(q.he) + '</b> significa «' + esc(q.ok) + '».</p>' : '<p>No exactamente. <b class="he" lang="he">' + esc(q.he) + '</b> significa «' + esc(q.ok) + '», no «' + esc(chosen) + '».</p><div class="mc-follow"><button class="chip" data-act="mc-ask" data-q="explícame por qué mi respuesta está equivocada">¿Por qué?</button></div>';
      Q.i++; const next = Q.i < Q.qs.length ? quizMsg(Q) : { expr: Q.score >= Q.qs.length - 1 ? 'celebracion' : 'comprensivo', blocks: [blk('dato', '<p>Resultado: ' + Q.score + ' de ' + Q.qs.length + '. ' + (Q.score >= Q.qs.length - 1 ? '¡Kol hakavod! (Muy bien hecho.)' : 'Repasa estas palabras y vuelve a intentarlo.') + '</p>')], follow: [['Otra ronda', 'hazme preguntas']] };
      const html = fb + render(next); const H = hist(); H.push({ w: 'm', h: html }); saveHist(H);
      log.insertAdjacentHTML('beforeend', bubble('m', html)); log.lastElementChild.scrollIntoView({ block: 'start', behavior: 'smooth' });
      if (Q.i >= Q.qs.length && Q.score >= Q.qs.length - 1 && M().celebrate) M().celebrate('Respondiste ' + Q.score + ' de ' + Q.qs.length + ' correctamente. ¡Kol hakavod! (Muy bien hecho.)');
    },
    'st-step': el => { ST.i = Math.max(0, Math.min(ST.steps.length - 1, ST.i + +el.dataset.d)); renderStudy(D.PAR.find(x => x.n === ST.n)); window.scrollTo({ top: 0, behavior: 'smooth' }); },
    'st-ans': el => { const qi = +el.dataset.q, j = +el.dataset.j; ST.ans[qi] = j; const q = ST.steps[ST.i].quiz[qi]; renderStudy(D.PAR.find(x => x.n === ST.n)); const st = document.querySelector('.mo-stage'); if (q.opts[j] === q.ok) { M().expr(st, 'celebracion'); st.classList.add('w-party'); } else M().expr(st, 'comprensivo'); },
    'st-done': el => { const s = B.Store.get('studied', {}) || {}; s[el.dataset.n] = Date.now(); B.Store.set('studied', s); M().celebrate('Parashá estudiada. ¡Kol hakavod! (Muy bien hecho.)'); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target && e.target.id === 'mc-q') { e.preventDefault(); const q = e.target.value; e.target.value = ''; ask(q); } });
  Object.assign(EXT.routes, { moreh: vChat, estudiemos: vEstudiemos });
  EXT.tabs.moreh = ''; EXT.tabs.estudiemos = '';
  EXT.morehChat = { respond: q => respond(q) };
  const prevLeave = EXT.leave;
  EXT.leave = () => { if (prevLeave) prevLeave(); if (!/^#moreh$/.test(location.hash)) CH.from = location.hash; if (window.speechSynthesis && !/^#moreh/.test(location.hash)) speechSynthesis.cancel(); };
})();
