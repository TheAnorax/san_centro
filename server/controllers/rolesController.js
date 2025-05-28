const {
  obtenerRoles,
  crearNuevoRol,
  actualizarRolExistente,
  eliminarRolPorId
} = require('../models/rolesModel');

async function listarRoles(req, res) {
  try {
    const roles = await obtenerRoles();
    res.json(roles);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener roles', error: err });
  }
}

async function crearRol(req, res) {
  const { nombre } = req.body;
  try {
    await crearNuevoRol(nombre);
    res.status(201).json({ message: 'Rol creado correctamente' });
  } catch (err) {
    res.status(500).json({ message: 'Error al crear rol', error: err });
  }
}

async function actualizarRol(req, res) {
  const { id } = req.params;
  const { nombre } = req.body;
  try {
    await actualizarRolExistente(id, nombre);
    res.json({ message: 'Rol actualizado correctamente' });
  } catch (err) {
    res.status(500).json({ message: 'Error al actualizar rol', error: err });
  }
}

async function eliminarRol(req, res) {
  const { id } = req.params;
  try {
    await eliminarRolPorId(id);
    res.json({ message: 'Rol eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar rol', error: err });
  }
}

module.exports = {
  listarRoles,
  crearRol,
  actualizarRol,
  eliminarRol
};
