/**
 * verifyToken.js
 * Middleware para proteger rutas: exige "Authorization: Bearer <token>"
 * y cuelga el usuario decodificado en req.usuario ({ id, nombre, rol }).
 */

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/auth.config');

function verifyToken(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
        return res.status(401).json({ ok: false, message: 'Falta el token de autenticación.' });
    }

    try {
        req.usuario = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        return res.status(401).json({ ok: false, message: 'Token inválido o expirado.' });
    }
}

module.exports = verifyToken;
