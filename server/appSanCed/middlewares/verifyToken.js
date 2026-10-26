/**
 * verifyToken.js
 * Middleware para proteger rutas: exige "Authorization: Bearer <token>".
 *
 * Acepta DOS tipos de token:
 *  1) JWT de login (el de siempre) → req.usuario = { id, nombre, rol_id, ... }
 *  2) TOKEN MAESTRO: una cadena aleatoria cuyo hash (SHA-256) vive en la tabla
 *     `api_tokens`. El token en sí NO se guarda en ningún archivo ni en la BD,
 *     solo su hash. Se crea/revoca con server/scripts/tokenMaestro.js.
 *     Entra como Admin (rol_id 1) y queda marcado con req.usuario.maestro = true.
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/auth.config');
const pool = require('../config/db.config');

async function buscarTokenMaestro(token) {
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const [rows] = await pool.query(
        `SELECT id, nombre FROM api_tokens
          WHERE token_hash = ? AND activo = 1
            AND (expira_en IS NULL OR expira_en > NOW())
          LIMIT 1`,
        [hash]
    );
    if (!rows.length) return null;
    // fire-and-forget: no frena la petición si falla
    pool.query('UPDATE api_tokens SET ultimo_uso = NOW() WHERE id = ?', [rows[0].id]).catch(() => {});
    return rows[0];
}

async function verifyToken(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

    if (!token) {
        return res.status(401).json({ ok: false, message: 'Falta el token de autenticación.' });
    }

    // 1) JWT de login
    try {
        req.usuario = jwt.verify(token, JWT_SECRET);
        return next();
    } catch (_) { /* no es un JWT válido: probamos como token maestro */ }

    // 2) Token maestro (tabla api_tokens)
    try {
        const maestro = await buscarTokenMaestro(token);
        if (maestro) {
            req.usuario = {
                id: 0,
                nombre: `TOKEN_MAESTRO:${maestro.nombre}`,
                rol: 'admin',
                rol_id: 1,
                maestro: true,
            };
            return next();
        }
    } catch (err) {
        // Si la tabla no existe o la BD falla, se trata como token inválido (sin filtrar detalles).
        console.error('verifyToken (token maestro):', err.code || err.message);
    }

    return res.status(401).json({ ok: false, message: 'Token inválido o expirado.' });
}

module.exports = verifyToken;
