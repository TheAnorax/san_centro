const pool = require('../db');

async function obtenerRoles() {
  const [rows] = await pool.query('SELECT id, nombre FROM roles');
  return rows;
}

async function crearNuevoRol(nombre) {
  await pool.query('INSERT INTO roles (nombre) VALUES (?)', [nombre]);
}

async function actualizarRolExistente(id, nombre) {
  await pool.query('UPDATE roles SET nombre = ? WHERE id = ?', [nombre, id]);
}

async function eliminarRolPorId(id) {
  await pool.query('DELETE FROM roles WHERE id = ?', [id]);
}

module.exports = {
  obtenerRoles,
  crearNuevoRol,
  actualizarRolExistente,
  eliminarRolPorId
};
