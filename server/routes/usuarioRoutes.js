const express = require('express');
const router = express.Router();
const {
  listarUsuarios,
  obtenerUsuario,
  crearNuevoUsuario,
  actualizarUsuarioExistente,
  eliminarUsuarioLogico,
  obtenerListaRoles
} = require('../controllers/usuarioController');

router.get('/roles', obtenerListaRoles);
router.get('/', listarUsuarios);
router.get('/:id', obtenerUsuario);
router.post('/', crearNuevoUsuario);
router.put('/:id', actualizarUsuarioExistente);
router.delete('/:id', eliminarUsuarioLogico);


module.exports = router;
