// controllers/usuarioController.js
const bcrypt = require('bcrypt');
const {
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
} = require('../models/usuarioModel');

/* ------------ USUARIOS ------------ */
async function listarUsuarios(req, res) {
  try { res.json(await obtenerUsuarios()); }
  catch (err) { res.status(500).json({ message: 'Error al obtener usuarios', error: err }); }
}

async function obtenerUsuarioCtrl(req, res) {
  try {
    const u = await obtenerUsuarioPorId(req.params.id);
    if (!u) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json(u);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener usuario', error: err });
  }
}

async function crearNuevoUsuario(req, res) {
  try {
    const { nombre, correo, password, rol_id, turno } = req.body;
    if (!nombre || !correo || !password || !rol_id)
      return res.status(400).json({ message: 'Faltan campos requeridos' });

    const password_hash = await bcrypt.hash(password, 10);
    await crearUsuario({ nombre, correo, password_hash, password_plain: password, rol_id, turno });
    res.status(201).json({ message: 'Usuario creado' });
  } catch (err) {
    res.status(500).json({ message: 'Error al crear usuario', error: err });
  }
}

async function actualizarUsuarioExistente(req, res) {
  try {
    const { id } = req.params;
    const { nombre, correo, rol_id, turno, new_password } = req.body;

    if (new_password) {
      const hash = await bcrypt.hash(new_password, 10);
      await actualizarPasswordHash(id, hash);
      await actualizarUsuario(id, { nombre, correo, rol_id, turno, new_password_plain: new_password });
    } else {
      await actualizarUsuario(id, { nombre, correo, rol_id, turno });
    }

    res.json({ message: 'Usuario actualizado' });
  } catch (err) {
    res.status(500).json({ message: 'Error al actualizar usuario', error: err });
  }
}

async function eliminarUsuarioLogico(req, res) {
  try { await eliminarUsuario(req.params.id); res.json({ message: 'Usuario eliminado' }); }
  catch (err) { res.status(500).json({ message: 'Error al eliminar usuario', error: err }); }
}

async function obtenerListaRoles(req, res) {
  try { res.json(await obtenerRoles()); }
  catch (err) { res.status(500).json({ message: 'Error al obtener roles', error: err }); }
}

/** Devuelve correo + password_plain para el modal/QR */
async function getCredencialesUsuario(req, res) {
  try {
    const u = await obtenerCredencialesUsuario(req.params.id);
    if (!u || u.activo !== 1) return res.status(404).json({ message: 'Usuario no encontrado o inactivo' });
    if (!u.password_plain) return res.status(404).json({ message: 'No hay password en claro almacenada' });
    res.json({ id: u.id, correo: u.correo, password: u.password_plain });
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener credenciales', error: err });
  }
}

/* ------------ IMPRESORAS ------------ */
async function listarImpresoras(req, res) {
  try { res.json(await getImpresoras()); }
  catch (e) { res.status(500).json({ message: 'Error al listar impresoras', error: e.message }); }
}

async function impresoraDeUsuario(req, res) {
  try { res.json(await getImpresoraByUsuario(req.params.id_usu)); }
  catch (e) { res.status(500).json({ message: 'Error al obtener impresora del usuario', error: e.message }); }
}

async function asignarImpresoraAUsuario(req, res) {
  try {
    const { id_print, id_usu } = req.body;
    if (!id_print || !id_usu) return res.status(400).json({ message: 'id_print e id_usu son requeridos' });
    await asignarImpresoraPorId({ id_print, id_usu });
    res.json({ message: 'Impresora asignada' });
  } catch (e) {
    res.status(500).json({ message: 'Error al asignar impresora', error: e.message });
  }
}

async function quitarImpresora(req, res) {
  try {
    const { id_usu } = req.body;
    if (!id_usu) return res.status(400).json({ message: 'id_usu es obligatorio' });
    await unassignImpresoraFromUsuario(id_usu);
    res.json({ message: 'Asignación eliminada' });
  } catch (e) {
    res.status(500).json({ message: 'Error al quitar impresora', error: e.message });
  }
}

module.exports = {
  // usuarios
  listarUsuarios,
  obtenerUsuario: obtenerUsuarioCtrl,
  crearNuevoUsuario,
  actualizarUsuarioExistente,
  eliminarUsuarioLogico,
  obtenerListaRoles,
  getCredencialesUsuario,

  // impresoras
  listarImpresoras,
  impresoraDeUsuario,
  asignarImpresoraAUsuario,
  quitarImpresora,
};
