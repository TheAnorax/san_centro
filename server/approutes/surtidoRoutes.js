const express = require('express');
const router = express.Router();
const surtidoController = require('../appcontrollers/surtidoController');

router.get('/surtido', surtidoController.obtenerPedidosSurtido);
router.get('/pedidos', surtidoController.obtenerPedidosSurtido); // ← misma función

module.exports = router;