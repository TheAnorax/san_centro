/**
 * seguridad.js — middlewares de seguridad del servidor web (puerto 3001).
 * Sin dependencias nuevas.
 */

// ─── Cabeceras básicas ──────────────────────────────────────────────────────
function cabecerasSeguras(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
}

// ─── Log de bodies SIN contraseñas ─────────────────────────────────────────
const CAMPOS_SECRETOS = /pass|pwd|token|secret/i;

function ocultarSecretos(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(ocultarSecretos);
  const copia = {};
  for (const [k, v] of Object.entries(obj)) {
    copia[k] = CAMPOS_SECRETOS.test(k) ? '***' : ocultarSecretos(v);
  }
  return copia;
}

function logBodies(req, res, next) {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    console.log(`📦 [${req.method}] ${req.path} Body:`, ocultarSecretos(req.body));
  }
  next();
}

// ─── Límite de intentos de login fallidos (por IP + correo) ────────────────
// Cuenta solo los intentos FALLIDOS (401). Un login correcto reinicia el contador.
// Se usa IP + correo porque en la bodega varios equipos comparten IP.
const MAX_FALLOS = 8;
const VENTANA_MS = 15 * 60 * 1000;
const intentos = new Map(); // clave -> { fallos, desde }

function limitarLogin(req, res, next) {
  const clave = `${req.ip}|${String(req.body?.correo || '').toLowerCase()}`;
  const ahora = Date.now();
  let reg = intentos.get(clave);
  if (reg && ahora - reg.desde > VENTANA_MS) {
    intentos.delete(clave);
    reg = undefined;
  }
  if (reg && reg.fallos >= MAX_FALLOS) {
    return res.status(429).json({
      message: 'Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo.',
    });
  }
  res.on('finish', () => {
    if (res.statusCode === 401) {
      const r = intentos.get(clave) || { fallos: 0, desde: Date.now() };
      r.fallos += 1;
      intentos.set(clave, r);
    } else if (res.statusCode === 200) {
      intentos.delete(clave);
    }
  });
  next();
}

// Limpieza periódica para que el Map no crezca
setInterval(() => {
  const ahora = Date.now();
  for (const [k, r] of intentos) if (ahora - r.desde > VENTANA_MS) intentos.delete(k);
}, 10 * 60 * 1000).unref();

// ─── Solo peticiones desde el mismo servidor (127.0.0.1) ───────────────────
function esLoopback(req) {
  const ip = req.socket?.remoteAddress || '';
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
}

// ─── Llave de servicio (header X-API-Key) ──────────────────────────────────
// Se compara contra SERVICE_API_KEY del .env. Si no está definida, queda desactivada.
const crypto = require('crypto');

function llaveDeServicioValida(req) {
  const esperada = process.env.SERVICE_API_KEY;
  const recibida = req.headers['x-api-key'];
  if (!esperada || typeof recibida !== 'string') return false;
  const a = Buffer.from(esperada);
  const b = Buffer.from(recibida);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { cabecerasSeguras, logBodies, limitarLogin, esLoopback, llaveDeServicioValida };
