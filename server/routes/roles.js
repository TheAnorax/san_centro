const express = require('express');
const router = express.Router();
const {
  listarRoles,
  crearRol,
  actualizarRol,
  eliminarRol
} = require('../controllers/rolesController');

router.get('/', listarRoles);
router.post('/', crearRol);
router.put('/:id', actualizarRol);
router.delete('/:id', eliminarRol);

module.exports = router;
