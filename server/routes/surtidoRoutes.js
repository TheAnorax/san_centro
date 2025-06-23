const express = require('express');
const router = express.Router();
const { obtenerPedidosSurtiendo, finalizarPedido } = require('../controllers/surtidoController');

router.get('/pedidos/pedidos-surtiendo', obtenerPedidosSurtiendo);

router.post('/finalizar/:noOrden', finalizarPedido);

module.exports = router;
