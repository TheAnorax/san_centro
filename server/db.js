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

  // 🔥 AGREGAR ESTO
  connectTimeout: 10000,        // 10 seg máximo para conectar
  idleTimeout: 300000,          // cerrar conexiones idle después de 5 min
  enableKeepAlive: true,        // mantener vivas las conexiones activas
  keepAliveInitialDelay: 0,
});

module.exports = pool;