/* Servidor opcional de IA para el Moreh de Beit Hatzirah (Cloudflare Workers).
   Recibe { pregunta, contexto[] } desde la app y responde { respuesta }.
   La clave de la API se guarda como secreto del servidor (ANTHROPIC_API_KEY); nunca va en la app.
   Variables: ANTHROPIC_API_KEY (secreto), MODELO (opcional), ORIGEN (dominio permitido, por ejemplo
   https://kevingalaz10kgv-ui.github.io). Verifica el nombre de modelo vigente en
   https://docs.claude.com/en/docs/about-claude/models antes de publicar. */
const SISTEMA = `Eres el Moreh Gabriel ben Eliyah, maestro virtual de Beit Hatzirah. Respondes en español, con claridad, respeto y sentido pedagógico.
Reglas obligatorias:
- Si recibes datos de la «Biblioteca de Beit Hatzirah», úsalos primero y cítalos como tales. Indica con claridad qué parte es conocimiento general tuyo.
- No inventes citas bíblicas, referencias, significados de palabras hebreas ni contenidos de parashiot. Si no estás seguro, dilo.
- Distingue texto bíblico, traducción, análisis lingüístico, investigación histórica, tradición interpretativa e interpretación.
- El nombre divino en español se escribe YAH; usa Elohim, Yahshúa, Mashíaj y Ruaj HaKodesh. No escribas el Tetragrámaton en letras latinas.
- En las transliteraciones del hebreo, la letra Vav se escribe V (nunca W).
- No incluyas palabras, explicaciones ni fuentes en griego.
- Relaciona el tema con las Escrituras solo cuando la relación sea real; no fuerces conexiones.
- Sé conciso: no más de 250 palabras salvo que se pida un estudio extenso.`;
export default {
  async fetch(req, env) {
    const origin = env.ORIGEN || '*';
    const cors = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST') return new Response('Solo POST', { status: 405, headers: cors });
    let body; try { body = await req.json(); } catch (e) { return new Response('JSON no válido', { status: 400, headers: cors }); }
    const pregunta = String(body.pregunta || '').slice(0, 1500); if (!pregunta) return new Response('Falta la pregunta', { status: 400, headers: cors });
    const ctx = (Array.isArray(body.contexto) ? body.contexto : []).slice(0, 6).map(c => `[${c.fuente}] ${c.titulo}: ${c.texto}`).join('\n');
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: env.MODELO || 'claude-sonnet-5-5', max_tokens: 900, system: SISTEMA,
        messages: [{ role: 'user', content: (ctx ? 'Datos de la Biblioteca de Beit Hatzirah:\n' + ctx + '\n\n' : '') + 'Pregunta del usuario: ' + pregunta }] })
    });
    if (!r.ok) return new Response(JSON.stringify({ respuesta: 'El servidor de IA no está disponible en este momento.' }), { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } });
    const d = await r.json(); const texto = (d.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n\n');
    return new Response(JSON.stringify({ respuesta: texto }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  }
};
