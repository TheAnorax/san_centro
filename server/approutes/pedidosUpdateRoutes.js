// routes/pedidosUpdateRoutes.js
const express = require('express');
const router = express.Router();
const { actualizarCantidadSurtida } = require('../appcontrollers/pedidosUpdateController');

router.put('/', actualizarCantidadSurtida);

module.exports = router;
