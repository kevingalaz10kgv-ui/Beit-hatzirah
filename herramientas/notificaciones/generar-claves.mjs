// Genera las claves VAPID para las notificaciones (Node 18 o posterior): node generar-claves.mjs
const { subtle } = globalThis.crypto;
const k = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const raw = new Uint8Array(await subtle.exportKey('raw', k.publicKey));
const pub = Buffer.from(raw).toString('base64url');
const jwk = await subtle.exportKey('jwk', k.privateKey);
console.log('Clave pública (VAPID_PUBLIC y data/notificaciones.json):\n' + pub + '\n');
console.log('Clave privada (secreto VAPID_PRIVATE_JWK; no la compartas):\n' + JSON.stringify(jwk));
