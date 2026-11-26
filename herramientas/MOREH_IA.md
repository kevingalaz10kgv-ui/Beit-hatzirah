# Servidor opcional de IA del Moreh

Sin este servidor, el Moreh responde **solo con la biblioteca de Beit Hatzirah** (Biblia, diccionario, raíces, verbos, parashiot, Besorá, tefilot, gematría y la Biblioteca del Moreh) y dice con honestidad cuando una pregunta de conocimiento general no está en ella.

Con el servidor, las preguntas que no encuentra en la biblioteca se envían a un modelo de IA de Anthropic junto con los datos internos relacionados, y la respuesta aparece marcada como **«Conocimiento general (fuente externa)»**.

## Por qué hace falta un servidor
La clave de la API tiene costo y no puede ir dentro de la app (cualquiera podría copiarla). El servidor la guarda como secreto y solo reenvía las preguntas.

## Pasos (Cloudflare Workers, plan gratuito)
1. Crea una cuenta en Cloudflare y una clave de API en la consola de Anthropic (https://console.anthropic.com). El uso de la API tiene costo por consulta.
2. Crea un Worker y pega el contenido de `moreh-ia-worker.js`.
3. En la configuración del Worker agrega:
   - el secreto `ANTHROPIC_API_KEY` con tu clave;
   - la variable `ORIGEN` con `https://kevingalaz10kgv-ui.github.io` (así solo tu app puede usarlo);
   - opcionalmente `MODELO`. Verifica el nombre de modelo vigente en https://docs.claude.com/en/docs/about-claude/models.
4. Publica el Worker y copia su dirección (`https://….workers.dev`).
5. En la app: **Configuración → El Moreh → Servidor de IA**, pega la dirección y toca «Guardar».

## Reglas que el servidor aplica
Responde en español; usa primero los datos internos y los cita; no inventa citas ni significados; distingue texto bíblico, traducción, análisis, historia, tradición e interpretación; usa YAH, Vav = V y no incluye contenido en griego.

## Límites
Las respuestas generales de la IA pueden contener errores: verifica la información importante. Conviene fijar en Anthropic un límite de gasto mensual.
