const express = require('express');
const router = express.Router();
const { obtenerReciboMonta } = require('../appcontrollers/reciboMontaController');

// Ruta para obtener los datos de recibo monta
router.get('/', obtenerReciboMonta);

module.exports = router;
