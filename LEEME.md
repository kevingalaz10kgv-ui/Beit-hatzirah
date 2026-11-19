# Beit Hatzirah — בית הצרעה
Biblioteca digital de las Sagradas Escrituras en hebreo y español.

Proyecto y dirección de contenido: **Moreh Gabriel ben Eliyah**
Autoridad rabínica: **Rab Eliyah ben Eleazar**

Versión 0.3.2. Incluye el módulo «Yo aprendo hebreo con la Torá».

---

## 1. Qué contiene esta carpeta

```
index.html              Página principal de la app
manifest.webmanifest    Datos de instalación (nombre, iconos, colores)
sw.js                   Service Worker: funcionamiento sin conexión
capacitor.config.json   Preparación para APK Android y app iOS
css/app.css             Diseño visual (modo claro y oscuro)
js/books.js             Índice de los 66 libros y sus nombres
js/app.js               Lógica de la aplicación (Biblia, parashiot, calendario, etc.)
js/aprender.js          Módulo «Yo aprendo hebreo con la Torá» (juegos, niveles, repaso)
data/aprender.json      Contenido del curso: 12 mundos, 49 unidades, 280 elementos
data/b/*.json           Un archivo por libro: [español RV1909, hebreo, numeración hebrea si difiere]
data/es/pdt/*.json      Palabra de Dios para ti (un archivo por libro)
data/es/blm/*.json      Biblia Libre para el Mundo (un archivo por libro)
data/parashiot.json     Las 54 parashiot: lecturas, aliyot, haftarot y estudio
data/calendario.json    Parashá de cada Shabat (Israel y diáspora) y fechas de moedim 2025-2036
data/mensajes.json      Mensajes diarios (se pueden editar sin tocar el código)
data/moedim.json        Contenido de las fiestas bíblicas
data/vocabulario.json   Vocabulario hebreo
data/estudios.json      Publicaciones, categorías y futuros estudios temáticos
img/, icons/            Logotipo oficial e iconos de la app
fonts/                  Tipografías (Noto Serif Hebrew y Spectral, licencia OFL)
```

No necesita instalar nada ni compilar: son archivos estáticos.

## 2. Publicar gratis en internet (GitHub Pages)

1. Crea una cuenta gratuita en https://github.com
2. Crea un repositorio nuevo, por ejemplo `beit-hatzirah`, marcado como público.
3. Toca "Add file" → "Upload files" y arrastra **todo el contenido** de esta carpeta (no la carpeta en sí: `index.html` debe quedar en la raíz).
4. Ve a Settings → Pages. En "Branch" elige `main` y la carpeta `/ (root)`. Guarda.
5. En unos minutos la app estará en `https://TU-USUARIO.github.io/beit-hatzirah/`

Alternativa: Cloudflare Pages (arrastrar la carpeta en "Upload assets").
Verifica las condiciones vigentes de cada servicio; hoy ambos tienen planes gratuitos.

**Importante:** el modo sin conexión y la instalación como app solo funcionan desde una dirección `https://` (GitHub Pages y Cloudflare la dan automáticamente). Al abrir `index.html` directamente desde el teléfono o la computadora, la app no carga los libros.

## 3. Instalar en el teléfono

**Android (Chrome):** abre la dirección de la app → menú ⋮ → "Instalar aplicación" o "Agregar a pantalla principal". También aparece el botón "Instalar" en Configuración.

**iPhone (Safari):** abre la dirección en Safari → botón Compartir → "Agregar a pantalla de inicio". En iPhone debe hacerse desde Safari.

Para leer sin internet: Menú → Configuración → "Leer sin conexión" → Guardar (descarga los 66 libros, unos 9 MB). Las secciones y los libros que ya abriste también quedan guardados.

## 4. Actualizar contenido sin tocar el código

- **Mensajes diarios:** edita `data/mensajes.json`. Cada mensaje tiene `titulo`, `ref` (por ejemplo `"DEU 31:8"`), `reflexion`, `ensenanza`, `pregunta` y `cierre`. El texto del versículo se toma automáticamente de la Biblia, así nunca se escribe a mano.
- **Publicaciones del inicio:** `data/estudios.json` → `publicaciones`.
- **Vocabulario:** `data/vocabulario.json`.
- **Estudios de parashiot:** `data/parashiot.json` (campos `res`, `per`, `temas`).

Después de publicar cambios en el código, sube el número `VERSION` en `sw.js` (por ejemplo `bh-0.2.1`) para que los teléfonos descarguen la nueva versión. Si cambias los textos bíblicos (`data/b` o `data/es`), cambia también `LIBROS` (por ejemplo `bh-libros-3`).

Códigos de libros: GEN EXO LEV NUM DEU JOS JDG 1SA 2SA 1KI 2KI ISA JER EZK HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL PSA PRO JOB SNG RUT LAM ECC EST DAN EZR NEH 1CH 2CH MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV.

## 5. Generar el APK de Android (Capacitor)

Necesitas una computadora con Node.js (gratis) y Android Studio (gratis).

```bash
mkdir beit-hatzirah-app && cd beit-hatzirah-app
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/android
# copia aquí capacitor.config.json y crea la carpeta www con TODO el contenido de esta carpeta
npx cap add android
npx cap sync
npx cap open android
```

En Android Studio: Build → Build Bundle(s)/APK(s) → Build APK(s). El APK queda en `android/app/build/outputs/apk/`. Ese archivo se puede compartir e instalar directamente (el teléfono pedirá permitir "orígenes desconocidos").

Alternativa sin programar: https://www.pwabuilder.com — pega la dirección https de la app y descarga el paquete de Android.

## 6. Publicar en tiendas: requisitos y costos

Una PWA instalada **no es lo mismo** que una app publicada en Google Play o App Store.

- **Google Play:** requiere una cuenta de desarrollador de Google Play (pago único, hoy 25 USD), política de privacidad publicada y cumplir sus revisiones.
- **App Store (iPhone):** requiere el Apple Developer Program (hoy 99 USD por año), una Mac con Xcode y pasar la revisión de Apple. Con Capacitor: `npm install @capacitor/ios`, `npx cap add ios`, `npx cap open ios`.

Verifica los precios y condiciones vigentes antes de empezar; pueden cambiar. Sin publicar en tiendas, la PWA sigue siendo gratuita para toda la comunidad.

## 7. Fuentes y licencias

- Tanaj en hebreo: Westminster Leningrad Codex (Códice de Leningrado), dominio público.
- Español, a elección del lector (la predeterminada es Palabra de Dios para ti):
  - Palabra de Dios para ti © 2020 Asociación Bíblica Latinoamericana, licencia Creative Commons CC BY-SA 4.0. Obliga a citar la fuente y a compartir las adaptaciones (como la de nombres) con la misma licencia; la app lo indica en Acerca de.
  - Biblia Libre para el Mundo, de David Williams y Michael Paul Johnson, CC0 (dominio público). Es un borrador en revisión: faltan Ezequiel 5:17 y 10:13–22, y Ezequiel 5:16 y 10:12 están incompletos; la app lo indica.
  - Reina-Valera 1909, dominio público.
- La Reina-Valera 1960 no se incluye porque tiene derechos de autor de las Sociedades Bíblicas Unidas.
- Brit Hadashá en hebreo: traducción de Franz Delitzsch, texto sin vocales, tomado del corpus de eBible.org (BibleNLP/ebible), que lo publica como dominio público. En algunos pasajes la fuente une o divide versículos de otra manera; la app lo indica junto a la referencia. En 2 Corintios 13:13 y en la última frase de Hechos 19:40 la fuente no trae texto hebreo, y así se indica.
- Parashiot, aliyot, haftarot y fechas: calendario hebreo tradicional, generados con Hebcal.
- Correspondencia de versículos hebreo/español: tabla de versificación estándar (inglesa/original).
- Tipografías: Noto Serif Hebrew y Spectral, SIL Open Font License.

## 9. Estado del proyecto

| Etapa | Estado |
|---|---|
| 1. Estructura, diseño, PWA | Completa |
| 2. Biblia (Tanaj y Brit Hadashá en hebreo y español), búsqueda, favoritos | Completa |
| 3. Parashiot | 54 con resumen, personajes, temas, lectura, aliyot y haftará. Faltan los estudios completos de 24 apartados |
| 4. Estudios y mensaje diario | Mensaje diario funcionando (18 mensajes). Estudios temáticos pendientes |
| 5. Calendario y vocabulario | Calendario 2025-2036 y 26 palabras funcionando |
| 6. Pruebas en dispositivos reales | Pendiente: probar en Android e iPhone reales tras publicar |

## 10. Módulo «Yo aprendo hebreo con la Torá» (אֲנִי לוֹמֵד עִבְרִית עִם הַתּוֹרָה)

Está en la pestaña **Aprender** de la barra inferior.

**Recorrido:** 12 mundos y 49 unidades. Mundo 1: el Alef Bet (22 letras, letras finales, el punto que cambia el sonido y letras parecidas). Mundo 2: las vocalizaciones. Mundos 3 a 8: vocabulario (primeras palabras, la creación, la familia, la naturaleza, verbos y vocabulario de la Torá). Mundo 9: frases bíblicas. Mundo 10: lectura de Bereshit 1:1–5 palabra por palabra. Mundo 11: gramática (prefijos, número, pronombres, sufijos, raíces y vav consecutiva). Mundo 12: análisis del Shemá, de la bendición sacerdotal y de Bereshit 1:1.

**Juegos:** asocia imagen y palabra, selecciona la imagen, relaciona las parejas, construye la palabra (tocando o arrastrando), completa la palabra, escucha y selecciona, reconoce la letra y su sonido, memoria, ordena la frase o el versículo, traduce, detecta el error y contrarreloj de 60 segundos.

**Progreso:** XP y niveles, racha diaria, 5 corazones por lección (se pueden recuperar con monedas o repitiendo la lección gratis), monedas, protector de racha, 13 insignias, examen por unidad (80 % para desbloquear la siguiente), prueba de nivel y elección del punto de partida.

**Repaso inteligente:** cada respuesta actualiza el nivel de dominio de la palabra (cajas de Leitner: 0, 1, 3, 7, 14, 30 y 60 días). Las que se fallan vuelven a los 10 minutos. La sección «Mis palabras por repasar» muestra hebreo, transliteración, significado, audio, dominio y próximo repaso.

**Conexión con la Torá:** cada palabra tiene un versículo verificado donde aparece. «Hebreo de la parashá» busca en el texto hebreo de la parashá de la semana qué palabras del curso aparecen, cuántas veces y dónde, y permite practicarlas.

**Audio:** usa la voz en hebreo del propio teléfono (síntesis de voz, pronunciación israelí moderna), con opción lenta. No es una grabación del hebreo antiguo, y la app lo aclara. Si el teléfono no tiene voz en hebreo, los ejercicios de escuchar se ocultan:
- iPhone: Ajustes → Accesibilidad → Contenido leído → Voces → Hebreo.
- Android: Ajustes → Sistema → Idioma → Texto a voz → instalar datos de voz en hebreo.

**Verificación del contenido:** todas las palabras con referencia se comprobaron automáticamente contra el texto hebreo del versículo citado; las frases y versículos de los mundos 9, 10 y 12 se toman directamente del Códice de Leningrado (sin signos de cantilación).

**Agregar unidades:** edita `data/aprender.json`. Cada unidad tiene `id`, `name`, `type` (letters, vowels, read, words, phrases, reading, grammar, analysis), `intro` e `items` (`id`, `he`, `tr`, `es`, y opcionalmente `em` para la imagen y `ref` para el versículo).

**Pendiente:** grabaciones de audio reales, ilustraciones propias (hoy se usan emojis del teléfono), más unidades intermedias y avanzadas, y vocabulario de cada parashá con formas verbales conjugadas.
