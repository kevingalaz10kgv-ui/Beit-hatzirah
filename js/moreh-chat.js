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
    if (/hazme preguntas|ponme a prueba|evaluame|examiname|comprobar si aprendi|preguntame/.test(n)) { const p = findParasha(q); CH.quiz = await makeQuiz(p ? { parasha: p.n } : C.parasha ? { parasha: C.parasha } : null); return Object.assign(quizMsg(CH.quiz), { intro: 'Muy bien. Te haré ' + CH.quiz.qs.length + ' preguntas.' }); }
    if (/por que .*(equivocad|incorrect|mal|error)|explicame (mi )?error/.test(n)) {
      const w = CH.lastWrong; if (!w) return { expr: 'comprensivo', blocks: [blk('dato', '<p>Todavía no tengo una respuesta tuya equivocada para explicar. Pídeme «hazme preguntas» y te explico cada error.</p>')] };
      return { expr: 'comprensivo', blocks: [blk('ling', '<p>Elegiste «' + esc(w.chosen) + '», pero <b class="he" lang="he">' + esc(w.he) + '</b>' + (w.tr ? ' (' + esc(w.tr) + ')' : '') + ' significa «' + esc(w.ok) + '».' + (w.k && D.LX[w.k][7] ? ' Su raíz es ' + esc(rootStr(D.LX[w.k][7])) + ': recordarla ayuda a distinguirla.' : '') + ' Es un error frecuente: con la repetición se fija.</p>')], sources: w.k ? [['Ficha de la palabra', 'dic-' + w.k]] : [] };
    }
    if (/mas sencill|mas simple|resumen|resumelo|en pocas palabras/.test(n)) { const L = CH.last; if (L && L.short) return { expr: 'sonriente', blocks: [blk('ense', '<p>' + esc(L.short) + '</p>')], sources: L.sources }; if (L) { const first = L.blocks && L.blocks[0]; return { expr: 'sonriente', blocks: [first || blk('dato', '<p>No tengo una versión más breve.</p>')], sources: L.sources }; } }
    if (/estudi(ar|emos)/.test(n) && /parash/.test(n)) { const p = findParasha(q) || (C.parasha && D.PAR.find(x => +x.n === +C.parasha)) || await thisWeek(); return { expr: 'entusiasmado', blocks: [blk('dato', '<p>¡Estudiemos juntos la parashá ' + esc(p.tr) + '! Te guiaré en 8 pasos: presentación, estructura, pasajes, palabras hebreas, enseñanzas, referencias, preguntas y profundización.</p>')], sources: [['Comenzar «Estudiemos juntos»', 'estudiemos-' + p.n]], go: 'estudiemos-' + p.n }; }
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
    const moed = findMoed(q); if (moed) return aMoed(moed);
    // tefilot
    if (/bendic|oracion|tefil|rezar|bracha|beraja|shema|kidush|havdal|birkat|motzi|mode ani|modeh|netilat|kadish|alein|adon olam|salmo/.test(n)) { const t = findTefila(q); if (t) return aTefila(t); }
    // conceptos («¿dónde encontramos…?», «¿qué versículos hablan sobre…?»)
    const cm = n.match(/(?:sobre|acerca de|habla de|hablan de|concepto de|tema de|encontramos el concepto de|encontramos)\s+(?:el |la |los |las )?(.+)$/);
    if (cm && /donde|versiculos|que dice|pasajes|encontramos|concepto/.test(n)) { const r = await aConcept(cm[1]); if (r) return r; }
    // enseñanzas (Besorá) y «este estudio»
    if (/este estudio|esta ensenanza|este tema/.test(n) && C.topic) { const t = D.BS.temas.find(x => x.id === C.topic); if (/referencias|respald|textos/.test(n)) return { expr: 'explicativo', blocks: [blk('texto', '<p>Textos que respaldan «' + esc(t.t) + '»: ' + t.refs.map(refLink).join(', ') + '.</p>'), blk('interp', t.pos.map(p => '<p><b>' + esc(p.q) + ':</b> ' + p.refs.map(refLink).join(', ') + '</p>').join(''))], sources: [['Estudio completo', 'besora-tema-' + t.id]] }; return aTopic(t); }
    if (/referencias .*respald|que textos respaldan/.test(n) && C.topic) { const t = D.BS.temas.find(x => x.id === C.topic); return { expr: 'explicativo', blocks: [blk('texto', '<p>' + t.refs.map(refLink).join(', ') + '</p>')], sources: [['Estudio completo', 'besora-tema-' + t.id]] }; }
    // palabras
    const hasHe = /[\u05D0-\u05EA]/.test(q); const followUp = /^(y )?(cual es )?(su|esta|la) |^(como se pronuncia|donde aparece|cuantas veces)|su raiz|esta palabra/.test(n);
    const words = (followUp && !hasHe && ctxWord()) ? [] : findWords(q); const wk = words[0] || (/esta palabra|la palabra|su raiz|se pronuncia|aparece|raiz/.test(n) ? ctxWord() : null);
    if (wk) { if (/raiz|shoresh/.test(n)) return aRoot(wk); if (/pronunci|se dice|se lee/.test(n)) return aPron(wk); if (/primera vez|primera aparicion|primer lugar/.test(n)) return aFirst(wk); if (/donde (mas )?aparece|cuantas veces|apariciones|donde se encuentra/.test(n)) return aOcc(wk); return aMeaning(wk); }
    const tops = findTopics(q); if (tops.length) return aTopic(tops[0]);
    if (ctxWord() && /raiz|pronuncia|aparece/.test(n)) return aRoot(ctxWord());
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
    await new Promise(r => setTimeout(r, 450));
    log.querySelector('.mc-think') && log.querySelector('.mc-think').remove();
    if (a.ctx) Object.assign(CH.ctx, a.ctx); CH.last = a;
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
