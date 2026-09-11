/**
 * auth.config.js
 * Configuración mínima de autenticación usada por los middlewares de esta app.
 * (El módulo de auth completo no es parte de este primer entregable —
 * solo Surtido y Embarques — pero los middlewares de rutas protegidas
 * necesitan esta config para verificar el token del usuario.)
 */

require('dotenv').config();

module.exports = {
    // ⚠️ Mismo valor de respaldo que usa el login actual (server/controllers/authController.js)
    // para que los tokens ya emitidos sigan siendo válidos aquí. Cambien ambos juntos si lo actualizan.
    JWT_SECRET: process.env.JWT_SECRET || 'secreto123',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
};
