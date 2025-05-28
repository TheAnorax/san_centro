const pool = require('../db');

async function getPermisosByRol(rol_id) {
  const [rows] = await pool.query('SELECT seccion, permitido FROM permisos WHERE rol_id = ?', [rol_id]);
  return rows;
}

async function setPermisosByRol(rol_id, permisos) {
  // Elimina los permisos actuales del rol
  await pool.query('DELETE FROM permisos WHERE rol_id = ?', [rol_id]);

  if (permisos.length > 0) {
    const values = permisos.map(p => [rol_id, p.seccion, p.permitido ? 1 : 0]);
    await pool.query('INSERT INTO permisos (rol_id, seccion, permitido) VALUES ?', [values]);
  }
}

module.exports = {
  getPermisosByRol,
  setPermisosByRol
};
