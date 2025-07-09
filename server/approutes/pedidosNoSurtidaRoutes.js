// routes/pedidosNoSurtidaRoutes.js
const express = require('express');
const router = express.Router();
const { actualizarCantidadNoSurtida } = require('../appcontrollers/pedidosNoSurtidaController');

router.put("/", actualizarCantidadNoSurtida);

module.exports = router;
