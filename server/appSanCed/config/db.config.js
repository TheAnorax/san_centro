/**
 * db.config.js
 * Conexión a MySQL para la nueva app (appSanCed).
 * Todo se lee de variables de entorno (.env en la raíz de /server);
 * los valores de respaldo solo son para no romper en desarrollo local.
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || '66.232.105.107',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'Santul2025',
    database: process.env.DB_NAME || 'san_centro',

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,

    connectTimeout: 10000,       // 10 seg máximo para conectar
    idleTimeout: 300000,         // cerrar conexiones inactivas tras 5 min
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
});

// Prueba de conexión al arrancar, solo para avisar en consola si algo está mal
// configurado (no detiene la app: cada query seguirá lanzando su propio error).
pool.getConnection()
    .then((conn) => {
        console.log('✅ [appSanCed] Conexión a MySQL OK');
        conn.release();
    })
    .catch((err) => {
        console.error('❌ [appSanCed] No se pudo conectar a MySQL:', err.message);
    });

module.exports = pool;
