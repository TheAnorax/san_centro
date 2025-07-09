const express = require('express');
const router = express.Router();
const { actualizarRecibo } = require('../appcontrollers/reciboController');

// Ruta para actualizar el recibo
router.put('/', actualizarRecibo);

module.exports = router;
