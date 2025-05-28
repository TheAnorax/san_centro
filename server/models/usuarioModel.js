// models/usuarioModel.js
const pool = require('../db');

async function obtenerUsuarios() {
  const [rows] = await pool.query(`
    SELECT u.id, u.nombre, u.correo, r.nombre AS rol, u.turno
    FROM usuarios u
    JOIN roles r ON u.rol_id = r.id
    WHERE u.activo = 1
  `);
  return rows;
}

async function obtenerUsuarioPorId(id) {
  const [rows] = await pool.query(`
    SELECT 
      u.id, 
      u.nombre, 
      u.correo, 
      r.nombre AS rol, 
      u.turno,
      u.rol_id
    FROM usuarios u
    LEFT JOIN roles r ON u.rol_id = r.id
    WHERE u.id = ?
  `, [id]);

  return rows[0];
}



async function crearUsuario({ nombre, correo, password_hash, rol_id, turno }) {
  const sql = `INSERT INTO usuarios (nombre, correo, password_hash, rol_id, turno, activo) VALUES (?, ?, ?, ?, ?, 1)`;
  await pool.query(sql, [nombre, correo, password_hash, rol_id, turno]);
}

async function actualizarUsuario(id, { nombre, correo, rol_id, turno }) {
  const sql = `UPDATE usuarios SET nombre = ?, correo = ?, rol_id = ?, turno = ? WHERE id = ?`;
  await pool.query(sql, [nombre, correo, rol_id, turno, id]);
}

async function eliminarUsuario(id) {
  const sql = `UPDATE usuarios SET activo = 0 WHERE id = ?`;
  await pool.query(sql, [id]);
}

async function obtenerRoles() {
  const [rows] = await pool.query('SELECT id, nombre FROM roles');
  return rows;
}

module.exports = {
  obtenerUsuarios,
  obtenerUsuarioPorId,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
  obtenerRoles
};
