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
router.get('/:id/credenciales', getCredencialesUsuario);
router.get('/:id', obtenerUsuario);

router.post('/', crearNuevoUsuario);
router.put('/:id', actualizarUsuarioExistente);
router.delete('/:id', eliminarUsuarioLogico);

module.exports = router;
