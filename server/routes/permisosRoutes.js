const express = require('express');
const router = express.Router();
const { obtenerPermisosPorRol, actualizarPermisos } = require('../controllers/permisosController');

router.get('/:rol_id', obtenerPermisosPorRol);
router.post('/', actualizarPermisos);

module.exports = router;
