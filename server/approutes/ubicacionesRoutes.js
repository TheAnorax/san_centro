const express = require('express');
const router = express.Router();
const { consultaUbicaciones } = require('../appcontrollers/ubicacionesController');

// Ruta para consultar ubicaciones de un producto
router.post('/', consultaUbicaciones);

module.exports = router;
