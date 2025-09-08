// models/usuarioModel.js
const pool = require('../db');

/* ------- USUARIOS ------- */
async function obtenerUsuarios() {
  const [rows] = await pool.query(`
    SELECT u.id, u.nombre, u.correo, r.nombre AS rol, u.turno, u.rol_id
    FROM usuarios u
    JOIN roles r ON u.rol_id = r.id
    WHERE u.activo = 1
    ORDER BY r.nombre, u.nombre
  `);
  return rows;
}

async function obtenerUsuarioPorId(id) {
  const [rows] = await pool.query(`
    SELECT u.id, u.nombre, u.correo, r.nombre AS rol, u.turno, u.rol_id, u.activo
    FROM usuarios u
    LEFT JOIN roles r ON u.rol_id = r.id
    WHERE u.id = ? LIMIT 1
  `, [id]);
  return rows[0];
}

async function obtenerCredencialesUsuario(id) {
  const [rows] = await pool.query(`
    SELECT id, correo, password_plain, activo
    FROM usuarios WHERE id = ? LIMIT 1
  `, [id]);
  return rows[0];
}

async function crearUsuario({ nombre, correo, password_hash, password_plain, rol_id, turno }) {
  const sql = `
    INSERT INTO usuarios
      (nombre, correo, password_hash, password_plain, password_plain_at, rol_id, turno, activo)
    VALUES (?, ?, ?, ?, IF(? IS NULL, NULL, NOW()), ?, ?, 1)
  `;
  await pool.query(sql, [nombre, correo, password_hash, password_plain, password_plain, rol_id, turno]);
}

async function actualizarUsuario(id, { nombre, correo, rol_id, turno, new_password_plain = undefined }) {
  if (new_password_plain === undefined) {
    await pool.query(`UPDATE usuarios SET nombre=?, correo=?, rol_id=?, turno=? WHERE id=?`,
      [nombre, correo, rol_id, turno, id]);
  } else if (new_password_plain === null) {
    await pool.query(`
      UPDATE usuarios
      SET nombre=?, correo=?, rol_id=?, turno=?, password_plain=NULL, password_plain_at=NULL
      WHERE id=?`, [nombre, correo, rol_id, turno, id]);
  } else {
    await pool.query(`
      UPDATE usuarios
      SET nombre=?, correo=?, rol_id=?, turno=?, password_plain=?, password_plain_at=NOW()
      WHERE id=?`, [nombre, correo, rol_id, turno, new_password_plain, id]);
  }
}

async function actualizarPasswordHash(id, password_hash) {
  await pool.query(`UPDATE usuarios SET password_hash=? WHERE id=?`, [password_hash, id]);
}

async function eliminarUsuario(id) {
  await pool.query(`UPDATE usuarios SET activo=0 WHERE id=?`, [id]);
}

async function obtenerRoles() {
  const [rows] = await pool.query('SELECT id, nombre FROM roles ORDER BY nombre');
  return rows;
}

/* ------- IMPRESORAS ------- */
// Lista todas las impresoras
async function getImpresoras() {
  const [rows] = await pool.query(
    `SELECT id_print, name, mac_print, hand, id_usu
     FROM prints
     ORDER BY name`
  );
  return rows;
}

// Devuelve la impresora asignada a un usuario (o null)
async function getImpresoraByUsuario(id_usu) {
  const [rows] = await pool.query(
    `SELECT id_print, name, mac_print, hand, id_usu
     FROM prints
     WHERE id_usu = ? LIMIT 1`, [id_usu]
  );
  return rows[0] || null;
}

// Asigna una impresora a un usuario (deja sólo 1 por usuario)
async function asignarImpresoraPorId({ id_print, id_usu }) {
  await pool.query('UPDATE prints SET id_usu = NULL WHERE id_usu = ?', [id_usu]);
  const [r] = await pool.query('UPDATE prints SET id_usu = ? WHERE id_print = ?', [id_usu, id_print]);
  if (r.affectedRows === 0) throw new Error('Impresora no encontrada');
}

async function unassignImpresoraFromUsuario(id_usu) {
  await pool.query('UPDATE prints SET id_usu = NULL WHERE id_usu = ?', [id_usu]);
}

module.exports = {
  obtenerUsuarios,
  obtenerUsuarioPorId,
  obtenerCredencialesUsuario,
  crearUsuario,
  actualizarUsuario,
  actualizarPasswordHash,
  eliminarUsuario,
  obtenerRoles,

  // impresoras
  getImpresoras,
  getImpresoraByUsuario,
  asignarImpresoraPorId,
  unassignImpresoraFromUsuario,
};
