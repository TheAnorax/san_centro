const mysql = require('mysql2/promise');
require('dotenv').config();

// Pool de conexiones para manejar múltiples transacciones
const pool = mysql.createPool({
  host: process.env.DB_HOST || '66.232.105.107',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'san_centro',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
