/**
 * tokenMaestro.js — administra tokens maestros (tabla `api_tokens`).
 *
 *   node scripts/tokenMaestro.js crear "Postman Jonathan" [dias]   → genera y muestra el token UNA vez
 *   node scripts/tokenMaestro.js listar
 *   node scripts/tokenMaestro.js revocar <id>
 *
 * Solo se guarda el HASH del token. Si lo pierdes, revoca y crea otro.
 * Se ejecuta en el servidor (usa el .env local para conectarse a la BD).
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const crypto = require('crypto');
const pool = require('../db');

const SQL_TABLA = `
CREATE TABLE IF NOT EXISTS api_tokens (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  nombre     VARCHAR(100) NOT NULL,
  token_hash CHAR(64)     NOT NULL UNIQUE,
  activo     TINYINT(1)   NOT NULL DEFAULT 1,
  expira_en  DATETIME     NULL,
  creado_en  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ultimo_uso DATETIME     NULL
)`;

(async () => {
  const [accion, arg1, arg2] = process.argv.slice(2);
  try {
    await pool.query(SQL_TABLA);

    if (accion === 'crear') {
      if (!arg1) throw new Error('Falta el nombre. Ej: node scripts/tokenMaestro.js crear "Postman Jonathan" 90');
      const token = 'mst_' + crypto.randomBytes(32).toString('hex');
      const hash = crypto.createHash('sha256').update(token).digest('hex');
      const dias = arg2 ? Number(arg2) : null;
      if (arg2 && (!Number.isFinite(dias) || dias <= 0)) throw new Error('Los días deben ser un número mayor a 0.');
      await pool.query(
        `INSERT INTO api_tokens (nombre, token_hash, expira_en)
         VALUES (?, ?, ${dias ? 'DATE_ADD(NOW(), INTERVAL ? DAY)' : 'NULL'})`,
        dias ? [arg1, hash, dias] : [arg1, hash]
      );
      console.log('\n✅ Token maestro creado. Guárdalo AHORA, no se vuelve a mostrar:\n');
      console.log(token);
      console.log(`\nÚsalo así:  Authorization: Bearer ${token.slice(0, 8)}...\n`);
    } else if (accion === 'listar') {
      const [rows] = await pool.query(
        'SELECT id, nombre, activo, expira_en, creado_en, ultimo_uso FROM api_tokens ORDER BY id'
      );
      console.table(rows);
    } else if (accion === 'revocar') {
      if (!arg1) throw new Error('Falta el id. Ej: node scripts/tokenMaestro.js revocar 3');
      const [r] = await pool.query('UPDATE api_tokens SET activo = 0 WHERE id = ?', [arg1]);
      console.log(r.affectedRows ? `🚫 Token ${arg1} revocado.` : 'No existe ese id.');
    } else {
      console.log('Uso: crear "<nombre>" [dias] | listar | revocar <id>');
    }
  } catch (e) {
    console.error('❌', e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
