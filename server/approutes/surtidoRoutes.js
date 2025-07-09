// Archivo: src/routes/surtidoRoutes.js
const express = require('express');
const router = express.Router();
const surtidoController = require('../appcontrollers/surtidoController');

router.get('/surtido', surtidoController.obtenerPedidosSurtido);

module.exports = router;
