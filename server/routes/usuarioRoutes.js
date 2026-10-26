// routes/usuarios.js
const express = require('express');
const router = express.Router();
const {
  listarUsuarios,
  obtenerUsuario,
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
} = require('../controllers/usuarioController');

router.get('/roles', obtenerListaRoles);

// ------- RUTAS DE IMPRESORAS (antes de '/:id') -------
router.get('/impresoras', listarImpresoras);                       // GET  /api/usuarios/impresoras
router.get('/impresoras/usuario/:id_usu', impresoraDeUsuario);     // GET  /api/usuarios/impresoras/usuario/5  (opcional)
router.post('/impresoras/asignar', asignarImpresoraAUsuario);      // POST /api/usuarios/impresoras/asignar
router.post('/impresoras/quitar', quitarImpresora);                // POST /api/usuarios/impresoras/quitar
// -----------------------------------------------------

// usuarios
router.get('/', listarUsuarios);
// 🔒 Credenciales (QR), crear, editar y borrar usuarios: solo Admin (1) y Master (4).
//    El token ya lo exige server.js para toda la API.
const requireRole = require('../appSanCed/middlewares/requireRole');
const soloAdmin = requireRole([1, 4]);

router.get('/:id/credenciales', soloAdmin, getCredencialesUsuario);
router.get('/:id', obtenerUsuario);

router.post('/', soloAdmin, crearNuevoUsuario);
router.put('/:id', soloAdmin, actualizarUsuarioExistente);
router.delete('/:id', soloAdmin, eliminarUsuarioLogico);

module.exports = router;
