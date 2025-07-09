const express = require('express');
const router = express.Router();
const { actualizarEmbarque } = require('../appcontrollers/embarqueController');

// Ruta para actualizar el estado de embarque en pedido_embarque
router.put('/', actualizarEmbarque);

module.exports = router;
