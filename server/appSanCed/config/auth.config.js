/**
 * auth.config.js
 * Configuración mínima de autenticación usada por los middlewares de esta app.
 *
 * Carga explícitamente server/.env (sin depender de la carpeta desde donde se
 * arranque el servidor) para que el servidor web (3001, que firma el token) y el
 * móvil (3003, que lo verifica) usen SIEMPRE el mismo JWT_SECRET.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

if (!process.env.JWT_SECRET) {
    console.warn('⚠️  JWT_SECRET no está definido en server/.env — se usa un valor por defecto INSEGURO. Defínelo.');
}

module.exports = {
    // El valor de respaldo solo existe para que no se caiga si falta el .env.
    // Debe ser el mismo que usa server/controllers/authController.js.
    JWT_SECRET: process.env.JWT_SECRET || 'secreto123',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
};
