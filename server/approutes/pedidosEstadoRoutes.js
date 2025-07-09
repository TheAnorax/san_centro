// routes/pedidosEstadoRoutes.js
const express = require('express');
const router = express.Router();
const { actualizarEstadoPedido } = require('../appcontrollers/pedidosEstadoController');

router.put("/", actualizarEstadoPedido);

module.exports = router;
