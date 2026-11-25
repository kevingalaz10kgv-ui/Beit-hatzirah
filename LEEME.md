# Beit Hatzirah — בית הצרעה
Biblioteca digital de las Sagradas Escrituras en hebreo y español.

Proyecto y dirección de contenido: **Moreh Gabriel ben Eliyah**
Autoridad rabínica: **Rab Eliyah ben Eleazar**

Versión 0.9.1. Incluye el módulo «Yo aprendo hebreo con la Torá».

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
data/aprender.json      Contenido del curso: 15 mundos + 12 temáticos, 68 unidades, 374 elementos
js/pealim.js            PEALIM: buscador y analizador de verbos
js/audio.js             AUDIO LIBRO: lectura en voz alta sincronizada
js/besora.js            BESORÁ: evangelización, apologética y raíces hebreas
js/tefilot.js           TEFILOT: sidur digital
data/tefilot.json       Textos de las tefilot (hebreo, transliteración, traducción, fuente y estado)
data/besora.json        Contenido de Besorá (temas, profecías, raíces, fiestas, preguntas, simulador)
data/audio/indice.json  Lista de grabaciones reales (vacía por ahora)
data/pealim/            1.534 verbos bíblicos con todas sus formas atestiguadas
data/morph/             Análisis de cada palabra del Tanaj (por libro)
data/lexico.json        Léxico hebreo (8.638 entradas) con significados en español
data/lemas.json         Dónde aparece cada palabra
data/h2e.json           Correspondencia de versículos hebreo ↔ español
data/b/*.json           Un archivo por libro: [español RV1909, hebreo, numeración hebrea si difiere]
data/es/pdt/*.json      Palabra de Dios para ti (un archivo por libro)
data/es/blm/*.json      Biblia Libre para el Mundo (un archivo por libro)
data/parashiot.json     Las 54 parashiot: lecturas, aliyot, haftarot y estudio
data/calendario.json    Parashá de cada Shabat (Israel y diáspora) y fechas de moedim 2025-2036
data/mensajes.json      Mensajes diarios (se pueden editar sin tocar el código)
data/moedim.json        Contenido de las fiestas bíblicas
data/vocabulario.json   Vocabulario hebreo
data/estudios.json      Publicaciones, categorías y futuros estudios temáticos
img/, icons/            Logotipo oficial (logo.png original recortado; logo.webp y logo-sm.webp optimizados) e íconos de la app (192, 512, 1024, enmascarable, Apple y favicon)
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

## 11. Novedades de la versión 0.4

**Alef-Bet revisado.** Cada letra tiene nombre, otros nombres usados (Beit, Gimel, Tzadik, Qof…), sonido explicado, forma final cuando la tiene, una palabra de ejemplo de la Torá con su versículo, audio y un ejercicio para trazarla con el dedo. Se explica que Kaf suena k o j (kh) y que su nombre no es la letra J; que Pe/Fe suena p o f; y que Shin y Sin son la misma letra con distinto punto.

**Curso reorganizado.** 15 mundos principales (Alef-Bet, letras finales, niqqud, sílabas, lectura, primer vocabulario, sustantivos y adjetivos, verbos y conjugaciones, raíces, construcción de frases, expresiones bíblicas, fragmentos de la Torá, comprensión de versículos, intermedio y avanzado) y 12 mundos temáticos (creación, naturaleza, animales, familia, acciones, lugares, tiempo, pacto, mandamientos, Shabat, moedim y vida espiritual). Las unidades de conjugación usan formas que aparecen tal cual en la Biblia. Nuevos: desafío diario, metas semanales, práctica libre sin corazones, trazado de letras y animaciones.

**PEALIM (Menú → PEALIM).** Busca verbos por hebreo (también formas conjugadas, como וַיִּשְׁמְרוּ), transliteración, español o raíz. Cada ficha muestra raíz, binyanim, conjugaciones por binyan y tiempo (solo las formas atestiguadas en el Tanaj, con su versículo), palabras de la misma raíz, ejemplos bíblicos, audio y práctica. Incluye la sección «Los siete binyanim» y listas de favoritos, aprendidos y verbos con errores.

**Versículos con colores y notas.** Al tocar un versículo: siete colores para destacarlo, «Agregar nota» y «Analizar las palabras hebreas». En Guardados → Destacados (filtro por color) y Guardados → Notas (búsqueda, filtro por libro y orden).

**Integración.** El análisis de cada palabra del Tanaj lleva a PEALIM o a la ficha de la palabra, y permite guardarla en «Mis palabras por repasar». Cada parashá tiene «Hebreo de esta parashá» con sus 15 palabras más presentes.

**Fuentes de datos lingüísticos:** Open Scriptures Hebrew Bible (morfología, CC BY 4.0) y léxico de Strong (dominio público). Los significados en español de 508 palabras (los 250 verbos más frecuentes y las palabras más comunes) los redactó Beit Hatzirah; cubren el 72 % de las palabras del texto hebreo.

**Pendiente:** significado en español para el resto del léxico, ilustraciones propias y grabaciones de audio.

## 12. Audio libro (ספר שמע)

Pestaña **Audio** de la barra inferior, botón 🎧 en cada capítulo de la Biblia y tarjeta «Continuar escuchando» en el inicio.

**Qué hace:** selección de Tanaj o Brit Hadashá, libro, capítulo y pasuq; lectura en español, en hebreo o en ambos (cada pasuq en hebreo y luego en español); texto visible en hebreo, español o ambos; el pasuq que se escucha se resalta y la pantalla lo sigue; tocar un pasuq empieza la lectura desde allí. Reproductor con reproducir/pausar, pasuq anterior y siguiente, barra de progreso (tocándola se salta a esa parte), tiempo transcurrido y total, velocidad 0.75x a 1.5x, volumen, repetir pasuq, repetir capítulo, modo «Solo este pasuq», paso automático al capítulo siguiente, favoritos y reanudación desde el último punto.

**De dónde sale la voz:** por ahora, de la voz del propio teléfono (síntesis de voz), leyendo el texto bíblico: el español de la traducción elegida y el hebreo original con nikud. No se usa una voz española para el hebreo ni transliteraciones. El Nombre יהוה se lee «Adonay» (o «Elohim» cuando lleva esas vocales). La voz hebrea tiene pronunciación israelí moderna; no es la lectura cantada con te’amim. Si el teléfono no tiene voz en un idioma, la app lo avisa y no reproduce nada. Con voces sintéticas el tiempo es aproximado (≈) y, en iPhone, la lectura puede detenerse con la pantalla bloqueada.

**Agregar grabaciones reales:** sube archivos de audio por capítulo (por ejemplo `data/audio/he/GEN-1.mp3`) y regístralos en `data/audio/indice.json` con el segundo en que empieza cada pasuq:

```json
{ "he": { "GEN-1": { "src": "data/audio/he/GEN-1.mp3", "t": [0, 6.2, 14.8] } },
  "es": { "GEN-1": { "src": "data/audio/es/GEN-1.mp3", "t": [0, 4.1, 9.5] } } }
```

La app usará la grabación en ese capítulo, con tiempo exacto y la misma sincronización por pasuq. Las grabaciones deben tener derechos de uso (por ejemplo, grabadas por la comunidad).

**Voz neuronal masculina (como la de ChatGPT):** el programa `herramientas/generar_audio.py` genera un MP3 por pasuq con la voz de OpenAI y lo registra en `data/audio/indice.json` con este formato: `{"he": {"GEN-1": {"voz": "…", "v": [{"s": "data/audio/he/GEN/1/1.mp3", "d": 5.2}, …]}}}`. Instrucciones completas en `herramientas/COMO_GENERAR_EL_AUDIO.md`.

## 13. Besorá (בְּשׂוֹרָה): evangelización, apologética y raíces hebreas

Menú → Besorá, o la tarjeta del inicio.

- **¿Con quién voy a conversar?** 35 temas: judío tradicional o secular (15), Testigo de Jehová (6), evangélico (6), católico (4) y ateo o agnóstico (4). Cada tema tiene respuesta breve, desarrollo bíblico, los textos (hebreo y español, tomados del texto de la app), palabras hebreas, las distintas interpretaciones con sus textos, preguntas que pueden surgir, una respuesta respetuosa y preguntas para continuar.
- **Profecías del Mashíaj:** 28 profecías en dos columnas (Tanaj y Escrituras apostólicas), organizadas por tema, con un indicador que distingue cumplimiento explícito, interpretación mesiánica, tipología, cumplimiento parcial y expectativa futura.
- **Shabat y fiestas bíblicas:** las ocho fiestas de Levítico 23 con su mandato, historia, celebración, significado espiritual y relación mesiánica (presentada como interpretación), y «¿Por qué estudiar las fiestas?».
- **Raíces hebreas:** 14 conceptos con pronunciación (audio), raíz, primera aparición en el Tanaj (calculada sobre el texto hebreo), pasajes, aplicación y relación con el Mashíaj. Se aclara cuando un término es posterior a la Biblia (Shejiná, kedushá).
- **El misterio del Alef-Tav:** función gramatical de אֵת, su lectura simbólica mesiánica, y la distinción clara entre ambas.
- **Preguntas difíciles:** 15 preguntas con los siete apartados pedidos.
- **Simulador:** 10 escenarios en tres niveles; el usuario escribe su respuesta y recibe una evaluación automática orientativa (referencias, contexto, términos hebreos, claridad y respeto) y una respuesta modelo.
- **Evangelización rápida:** persona y pregunta → respuesta preparada con texto hebreo, traducción, contexto, interpretaciones y respuesta respetuosa, con audio.

Incluye buscador, favoritos, historial y progreso. Todas las referencias se verifican automáticamente al generar `data/besora.json`.

**Pendiente:** los temas restantes de la lista original (por ejemplo, el Reino de Elohim y la resurrección para Testigos de Jehová, la oración para católicos, el origen de la creación para ateos) y más escenarios para el simulador. El contenido debe ser revisado por la autoridad rabínica y la dirección de contenido.

## 14. Tefilot (תְּפִלּוֹת): sidur digital

Menú → Tefilot, la tarjeta del inicio, o «Tefilot de Shabat» en cada parashá.

**Primera etapa (38 tefilot):** diarias (Modé Aní, Netilat Yadáyim, Asher Yatzar, Elohai Neshamá, Birkot HaShajar, Tefilat HaDérej, Hashkivénu, Adón Olam, Aleinu); Shemá (versículo, tres secciones completas, Vehavtá, Vayómer); bendiciones de alimentos (Hamotzí, Mezonot, Hagafen, HaEtz, HaAdamá, Shehakol, Al Hamijiá, Boré Nefashot, Birkat HaMazón) con la guía «¿Qué bendición digo?»; Shabat (velas, Shalom Aleijem, Éshet Jáyil, Kidush de la noche y del día, Hamotzí con dos panes, agregados de Birkat HaMazón, Havdalá); estudio de Torá (Birkot HaTorá, Birkat Kohanim, bendiciones de la aliyá, Gal einai); momentos especiales (Mi Sheberaj por los enfermos, Shehejeyanu, HaTov VehaMetiv, Birkat HaGomel).

**Cada tefilá** muestra nombre en hebreo y español, texto hebreo con nikud en letra grande, transliteración, traducción, explicación, momento, instrucciones, fuente y estado. Se puede mostrar u ocultar cada columna, cambiar el tamaño de letra, usar «Lectura cómoda», escuchar (todo o desde un párrafo, lento, repetir párrafo, en hebreo o español, con el párrafo resaltado), marcar como favorita o aprendida, agregar una nota, copiar el hebreo, la transliteración o la traducción por separado y compartir por WhatsApp. «Estudiar palabras» permite tocar una palabra para ver su significado, ir a PEALIM o guardarla para repasar. Hay buscador (nombre en español o hebreo, palabra, categoría, momento, festividad; tolera distintas transliteraciones), favoritas, más usadas e historial.

**Estado de los textos (importante):**
- *Texto bíblico* (verde): partes tomadas del Códice de Leningrado de la app (Shemá, Éshet Jáyil, Vayejulú, Kidush del día, Birkat Kohanim, Salmos). Las frases litúrgicas añadidas se marcan como «Texto litúrgico».
- *Dominio público* (azul): Havdalá y Birkat HaMazón, de una fuente CC0 (github.com/marcstober/siddur-text), con erratas evidentes corregidas. La Birkat HaMazón es la versión breve (zimún y cuatro bendiciones, sin los Harajamán).
- *Por verificar* (naranja): transcripciones del nusaj tradicional Ashkenaz hechas por Beit Hatzirah, porque no hubo acceso a un sidur con licencia abierta. Deben compararse con un sidur impreso. Cuando la autoridad rabínica las revise, se marcan como verificadas cambiando `"verificado": false` por `"verificado": true` en `data/tefilot.json`.

**Audio:** voz sintética del dispositivo, indicada como tal. No se presenta como grabación de pronunciación tradicional. Se puede reemplazar por grabaciones verificadas en una próxima etapa.

**Próximas etapas:** tefilot personales y familiares (composiciones devocionales identificadas como tales), versión completa de Birkat HaMazón, más cánticos de Shabat (Lejá Dodí, etc.) y variantes sefaradíes completas.

## 15. Identidad visual (versión 0.8)

El logotipo oficial es el archivo entregado por Beit Hatzirah (fondo transparente). Solo se recortó el margen vacío y se redujo de tamaño: no se modificó el dibujo, los colores ni las proporciones. Como es plateado con contornos oscuros sobre fondo transparente, se ve bien tanto en modo claro como en modo oscuro sin versiones alteradas.

Aparece en: pantalla de bienvenida, encabezado de todas las pantallas (en el lector se oculta para dar espacio al título), inicio, menú, pantallas de carga, Audio libro, Estudios, Parashiot, Aprender hebreo, PEALIM, Besorá, Tefilot y la imagen para compartir versículos. Los íconos de la app usan el logo sobre fondo negro #111111 (paleta oficial); el ícono enmascarable deja el margen de seguridad para Android.

## 16. Actualización maestra (versión 0.9)

**Identidad.** Inicio renovado con logo, lema y créditos («Pertenece a Ha’roeh Eliyah ben Eleazar · Desarrollado por Moreh Gabriel ben Eliyah»), cuadrícula de módulos con íconos propios y «Continuar leyendo / escuchando». «Acerca de» con lema, créditos, quiénes somos, misión, visión y propósito educativo.

**Nombres divinos (YAH).** En español, el Nombre se presenta como YAH en las cuatro traducciones y en todo el contenido: Jehová/Yahvé/YAVÉ/JAH/Jah/YA → YAH; «Señor Jehová» → Adonay YAH; «Jehová de los ejércitos» → YAH Tzevaot; Aleluya → AleluYAH; Jesús/Jesu → Yahshúa. El hebreo original nunca se modifica. La palabra hebrea אֲדֹנָי (Adonai, «Señor») se conserva como Adonay, y el nombre de la organización «Testigos de Jehová» no se cambia. La voz lee el Nombre como «YAH». El generador de audio usa las mismas reglas.

**Diccionario bíblico** (Menú → Diccionario): ficha de 8.638 palabras (hebreo, transliteración, pronunciación, significado, categoría, género, raíz, familia de palabras, frecuencia, primera aparición verificada, gematría, ejemplos y explicación cuando existe); explorador de 1.472 raíces (índice BDB); 21 nombres y títulos divinos; diccionario temático; 10 expresiones idiomáticas; lugares y personajes; concordancia completa calculada sobre el texto hebreo; flashcards; favoritos e historial; buscador por hebreo, español, transliteración, raíz o número.

**Gematría:** calculadora con teclado hebreo en pantalla, desglose letra por letra, Mispar Hejrejí, Gadol, Katán, Sidurí y reducción, palabras del Tanaj con el mismo valor, tabla de valores y aclaración de que no es prueba de doctrina. El valor numérico aparece también en el análisis de palabras y en las letras del curso.

**Biblia:** Reina-Valera 1865 (dominio público) como cuarta traducción; «Comparar versiones» y «Referencias cruzadas» (OpenBible.info, CC BY) en cada versículo; el análisis de palabras enlaza al diccionario, PEALIM y la concordancia.

**Tefilot:** 55 tefilot. Nuevas categorías: Tehilim (Salmos 23, 121, 150), Fiestas (Salmo 117 y bendiciones de las fiestas), Agradecimiento (Salmo 100, Salmo 136), Arrepentimiento (Salmo 51, Hoshea 14) y nueve oraciones personales y familiares marcadas como «Composición devocional». Filtros por momento del día.

**Búsqueda global:** botón de lupa del inicio; busca a la vez en la Biblia, el diccionario, Tefilot, Besorá, Parashiot, el curso, PEALIM y el calendario.

**Pendiente (próximas etapas):** estudios completos por parashá, libro, personaje y tema (con objetivos, desarrollo y preguntas); ampliación de Besorá (Reino de Elohim, resurrección y demás temas faltantes); nuevos minijuegos y niveles del curso (ranking personal, desafíos semanales nuevos, animación del trazado); Brit Hadashá en hebreo con nikud (no se encontró una edición con licencia abierta accesible; la de Delitzsch disponible no tiene vocales); grabaciones de audio verificadas; asistente de inteligencia artificial (la app no tiene IA integrada: requeriría un servicio externo con costo).

## 17. Ajuste global de contenido (versión 0.9.1)

**Sin contenido de idioma griego.** Se eliminaron el texto griego del Brit Hadashá (y su carpeta de datos), la opción de mostrarlo, la línea griega en «Comparar versiones», la sección «Hebreo y griego» del diccionario y sus datos, las referencias a términos griegos en las fichas y los análisis basados en palabras griegas dentro de Besorá (se reescribieron desde el texto y el trasfondo hebreo). Se conservan todos los libros y versículos del Brit Hadashá en español y en hebreo. Las menciones a la Septuaginta se mantienen solo como dato histórico sobre el texto del Tanaj (Salmo 22:16 e Isaías 7:14), sin términos griegos.

**Vav = V.** La letra ו se enseña y translitera siempre como V: se quitó «antigua w» del curso, las transliteraciones del léxico y de PEALIM se convirtieron a la forma de Beit Hatzirah (sin W), y los nombres de las formas verbales se escriben «vayiqtol» y «veqatal».
