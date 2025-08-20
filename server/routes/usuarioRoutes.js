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
  guardarImpresora,
  obtenerImpresoras
} = require('../controllers/usuarioController');

router.get('/roles', obtenerListaRoles);

router.get('/', listarUsuarios);
router.get('/:id/credenciales', getCredencialesUsuario); // modal/QR
router.get('/:id', obtenerUsuario);

router.post('/', crearNuevoUsuario);
router.put('/:id', actualizarUsuarioExistente);
router.delete('/:id', eliminarUsuarioLogico);

router.get('/:id_usu', obtenerImpresoras);
router.post('/guardarImpresora', guardarImpresora);


module.exports = router;
