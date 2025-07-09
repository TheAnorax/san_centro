// routes/pedidosReabastecimientoRoutes.js
const express = require('express');
const router = express.Router();
const { actualizarSurtidoFaltante } = require('../appcontrollers/pedidosReabastecimientoController');

router.put("/", actualizarSurtidoFaltante);

module.exports = router;
