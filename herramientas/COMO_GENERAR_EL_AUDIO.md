# Cómo generar el audio con voz neuronal masculina (como la de ChatGPT)

Este programa usa el servicio de voz de OpenAI, la misma tecnología de voz de ChatGPT, para leer cada pasuq con una voz masculina natural. Se hace **una sola vez**: los audios quedan guardados en la app y luego todos los escuchan gratis, en cualquier teléfono, sin depender de la voz del teléfono.

## Antes de empezar

- **Costo:** OpenAI cobra por uso. Para la Torá en hebreo el programa calcula el precio aproximado antes de empezar y pide confirmación. Verifica los precios actuales en https://openai.com/api/pricing
- **Espacio:** la Torá en hebreo ocupa unos 300 a 500 MB de audio, que cabe en GitHub Pages (límite de 1 GB). El Tanaj completo no cabe; para eso habría que usar otro alojamiento (por ejemplo, Cloudflare R2).
- **Pronunciación:** la voz lee desde el texto hebreo con nikud y con instrucciones de pronunciación israelí nativa, pero es una voz sintética: escucha la prueba antes de generar todo.

## Paso 1: crear la clave de OpenAI

1. Entra en https://platform.openai.com e inicia sesión (o crea una cuenta).
2. Agrega un método de pago en Settings → Billing.
3. Ve a API keys → Create new secret key, y copia la clave (empieza con `sk-`). No la compartas con nadie.

## Paso 2: preparar la computadora

1. Instala Python desde https://www.python.org/downloads (en Windows, marca «Add Python to PATH»).
2. Descomprime el proyecto de Beit Hatzirah (beit-hatzirah-proyecto.zip) y abre una terminal en esa carpeta:
   - Windows: abre la carpeta, escribe `cmd` en la barra de dirección y presiona Enter.
   - Mac: clic derecho sobre la carpeta → Servicios → Nueva terminal en la carpeta.
3. Instala lo necesario:
   ```
   pip install requests mutagen
   ```
4. Escribe tu clave (cambia `sk-...` por la tuya):
   - Windows: `set OPENAI_API_KEY=sk-...`
   - Mac: `export OPENAI_API_KEY="sk-..."`

## Paso 3: escuchar una prueba

```
python herramientas/generar_audio.py --prueba
```

Genera solo Bereshit 1:1–3 en `data/audio/he/GEN/1/`. Escucha esos archivos. Si quieres otra voz masculina, prueba `--voz ash` o `--voz echo` (la predeterminada es `onyx`, la más grave).

## Paso 4: generar la Torá en hebreo

```
python herramientas/generar_audio.py --idioma he --libros torah
```

Puede tardar varias horas. Si se interrumpe, vuelve a ejecutar el mismo comando: continúa donde quedó y no cobra otra vez lo ya generado.

Para el español (con los nombres hebreos):
```
python herramientas/generar_audio.py --idioma es --libros torah
```

Otras opciones: `--libros GEN,EXO` (libros elegidos), `--libros tanaj`, `--traduccion blm`, `--modelo tts-1-hd`.

## Paso 5: subir los audios a la app

Sube la carpeta `data/audio` completa (incluido `data/audio/indice.json`) a tu repositorio de GitHub. Como son muchos archivos, lo más fácil es usar **GitHub Desktop** (https://desktop.github.com): clona el repositorio Beit-hatzirah, copia dentro la carpeta `data/audio`, y presiona «Commit» y luego «Push».

Desde ese momento, en el Audio libro esos capítulos se escuchan con la voz generada, con el tiempo exacto y el pasuq resaltado. Los capítulos sin audio generado siguen usando la voz del teléfono.
