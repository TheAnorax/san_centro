const pool = require('../db');

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
    WHERE u.id = ?
    LIMIT 1
  `, [id]);
  return rows[0];
}

async function obtenerCredencialesUsuario(id) {
  const [rows] = await pool.query(`
    SELECT id, correo, password_plain, activo
    FROM usuarios
    WHERE id = ?
    LIMIT 1
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

/**
 * Actualiza datos básicos. Si pasas new_password_plain:
 *  - actualiza password_plain y su fecha
 *  - NO toca el hash (para eso usa actualizarPasswordHash).
 */
async function actualizarUsuario(id, { nombre, correo, rol_id, turno, new_password_plain = undefined }) {
  if (new_password_plain === undefined) {
    const sql = `UPDATE usuarios SET nombre=?, correo=?, rol_id=?, turno=? WHERE id=?`;
    await pool.query(sql, [nombre, correo, rol_id, turno, id]);
  } else if (new_password_plain === null) {
    const sql = `
      UPDATE usuarios
      SET nombre=?, correo=?, rol_id=?, turno=?, password_plain=NULL, password_plain_at=NULL
      WHERE id=?`;
    await pool.query(sql, [nombre, correo, rol_id, turno, id]);
  } else {
    const sql = `
      UPDATE usuarios
      SET nombre=?, correo=?, rol_id=?, turno=?, password_plain=?, password_plain_at=NOW()
      WHERE id=?`;
    await pool.query(sql, [nombre, correo, rol_id, turno, new_password_plain, id]);
  }
}

/** Cambia SOLO el hash (cuando actualizas la contraseña real del login) */
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



//agregar impresoras
async function upsertImpresora({ id_usu, mac_print, hand }) {
  // upsert por id_usu
  await pool.query(
    `INSERT INTO prints (id_usu, mac_print, hand)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE mac_print = VALUES(mac_print), hand = VALUES(hand)`,
    [id_usu, mac_print, hand]
  );
}

async function getImpresoraByUsuario(id_usu) {
  const [rows] = await pool.query(
    `SELECT id_print, id_usu, mac_print, hand
     FROM prints WHERE id_usu = ? LIMIT 1`,
    [id_usu]
  );
  return rows[0] || null;
}

module.exports = {
  upsertImpresora,
  getImpresoraByUsuario,
  obtenerUsuarios,
  obtenerUsuarioPorId,
  obtenerCredencialesUsuario,
  crearUsuario,
  actualizarUsuario,
  actualizarPasswordHash,
  eliminarUsuario,
  obtenerRoles,
};
