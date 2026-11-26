# Notificaciones del Versículo del día — guía de puesta en marcha

La app ya tiene todo lo necesario para recibir el aviso diario: pantalla, contenido, preferencias, service worker
y suscripción. Para que **todos** los usuarios reciban el aviso a las 09:00 aunque no abran la app, falta poner
en marcha el servidor de avisos (una sola vez). Usa Cloudflare Workers, que tiene un plan gratuito.

## Qué hace el servidor
- Guarda la suscripción de cada dispositivo con su zona horaria, su hora preferida (09:00 por defecto),
  su recordatorio opcional y si quiere el versículo o solo un recordatorio.
- Cada 15 minutos revisa a quién le corresponde su hora local (con horario de verano) y envía el aviso,
  una sola vez por día. Las suscripciones vencidas se eliminan automáticamente.
- Registra envíos, recordatorios, errores y suscripciones eliminadas; el panel de administración de la app
  los consulta con una clave.
- El aviso no lleva el texto: el service worker de la app arma la notificación con el versículo del día, para
  que coincida siempre con la pantalla y no haya datos personales en tránsito.

## Pasos
1. Instala Node 18 o posterior y Wrangler: `npm install -g wrangler` y luego `wrangler login`.
2. En esta carpeta, genera las claves: `node generar-claves.mjs`.
3. Crea el espacio de datos: `wrangler kv namespace create SUBS` y copia su `id` en `wrangler.toml`.
4. En `wrangler.toml` completa `VAPID_PUBLIC` (clave pública) y `CONTACTO` (un correo de contacto).
5. Guarda los secretos: `wrangler secret put VAPID_PRIVATE_JWK` (pega la clave privada completa) y
   `wrangler secret put ADMIN_TOKEN` (una clave larga para el panel de administración).
6. Publica: `wrangler deploy`. Copia la dirección del servidor (`https://…workers.dev`).
7. En el proyecto de la app, edita `data/notificaciones.json`:
   `{"servidor": "https://…workers.dev", "vapid": "LA_CLAVE_PUBLICA"}` y publica la app.
8. Comprueba: en la app, Configuración → Mi encuentro diario con YAH → «Probar desde el servidor».

## Prueba sin desplegar
`node prueba-local.mjs` simula un día completo con usuarios en Santiago, Madrid y Ciudad de México:
envío a las 09:00 locales, recordatorio, desactivación, sin duplicados, horario de verano, suscripción vencida,
firma VAPID, prueba inmediata, estadísticas protegidas y baja.

## Límites que conviene conocer
- **Android (Chrome):** recibe los avisos con la app instalada o abierta en el navegador.
- **iPhone (Safari):** solo desde iOS 16.4 y **con la app agregada a la pantalla de inicio**.
- Los avisos dependen del permiso del usuario, la conexión y el ahorro de batería del sistema: no se puede
  garantizar la entrega en todos los casos.
- Una app nativa (Capacitor) usaría Firebase Cloud Messaging y APNs; este servidor cubre la app web instalable.
- Para muchos miles de usuarios conviene pasar de KV a una cola o a Durable Objects.
