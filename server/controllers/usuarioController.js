const bcrypt = require('bcrypt');
const {
  obtenerUsuarios,
  obtenerUsuarioPorId,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
  obtenerRoles 
} = require('../models/usuarioModel');

async function listarUsuarios(req, res) {
  try {
    const usuarios = await obtenerUsuarios();
    res.json(usuarios);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener usuarios', error: err });
  }
}

async function obtenerUsuario(req, res) {
  const { id } = req.params;
  try {
    const usuario = await obtenerUsuarioPorId(id);
    if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado*' });
    res.json(usuario);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener usuario', error: err });
  }
}

async function crearNuevoUsuario(req, res) {
  const { nombre, correo, password, rol_id, turno } = req.body; // 👈 aquí debe ser `rol_id`
  try {
    const password_hash = await bcrypt.hash(password, 10);
    await crearUsuario({ nombre, correo, password_hash, rol_id, turno });
    res.status(201).json({ message: 'Usuario creado correctamente' });
  } catch (err) {
    res.status(500).json({ message: 'Error al crear usuario', error: err });
  }
}


async function actualizarUsuarioExistente(req, res) {
  const { id } = req.params;
  const { nombre, correo, rol_id, turno } = req.body; // ✅ aquí debe ser rol_id
  try {
    await actualizarUsuario(id, { nombre, correo, rol_id, turno }); // ✅ pasa rol_id
    res.json({ message: 'Usuario actualizado correctamente' });
  } catch (err) {
    res.status(500).json({ message: 'Error al actualizar usuario', error: err });
  }
}


async function eliminarUsuarioLogico(req, res) {
  const { id } = req.params;
  try {
    await eliminarUsuario(id);
    res.json({ message: 'Usuario eliminado correctamente' }); 
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar usuario', error: err });
  }
}

async function obtenerListaRoles(req, res) {
  try {
    const roles = await obtenerRoles();
    res.json(roles); // ✅ debe ser así
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener roles', error: err });
  }
}


module.exports = {
  listarUsuarios,
  obtenerUsuario,
  crearNuevoUsuario,
  actualizarUsuarioExistente,
  eliminarUsuarioLogico,
  obtenerListaRoles
};
