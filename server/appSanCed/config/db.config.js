/**
 * db.config.js
 * appSanCed ya NO abre su propia conexión a MySQL: reutiliza el mismo pool
 * que usa el resto del servidor (server/db.js), para no duplicar conexiones
 * ni tener dos configuraciones de base de datos que mantener sincronizadas.
 */

module.exports = require('../../db');
