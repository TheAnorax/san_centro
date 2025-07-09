const express = require('express');
const router = express.Router();
const { realizarMovimiento } = require('../appcontrollers/movimientoController');

// Ruta para realizar un movimiento entre ubicaciones
router.post('/', realizarMovimiento);

module.exports = router;
