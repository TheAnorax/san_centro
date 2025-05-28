const pool = require('../db');

async function findUserByEmail(email) {
 const [rows] = await pool.query(
  `SELECT u.id, u.nombre, u.correo, u.password_hash, u.turno, u.rol_id, r.nombre AS rol
   FROM usuarios u
   JOIN roles r ON u.rol_id = r.id
   WHERE u.correo = ? AND u.activo = 1`,
  [email]
);

  return rows[0];
}


async function createUser({ nombre, correo, password_hash, rol_id, turno }) {
  const sql = `
    INSERT INTO usuarios (nombre, correo, password_hash, rol_id, turno, activo)
    VALUES (?, ?, ?, ?, ?, 1)
  `;
  await pool.query(sql, [nombre, correo, password_hash, rol_id, turno]);
}

module.exports = {
  findUserByEmail,
  createUser
};
