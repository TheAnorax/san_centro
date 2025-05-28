const { getPermisosByRol, setPermisosByRol } = require('../models/permisosModel');

async function obtenerPermisosPorRol(req, res) {
  const { rol_id } = req.params;
  try {
    const permisos = await getPermisosByRol(rol_id);
    res.json(permisos);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener permisos', error: err });
  }
}

async function actualizarPermisos(req, res) {
  const { rol_id, permisos } = req.body;
  try {
    await setPermisosByRol(rol_id, permisos);
    res.json({ message: 'Permisos actualizados correctamente' });
  } catch (err) {
    res.status(500).json({ message: 'Error al actualizar permisos', error: err });
  }
}

module.exports = {
  obtenerPermisosPorRol,
  actualizarPermisos
};
