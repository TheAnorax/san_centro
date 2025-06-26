const express = require('express');
const router = express.Router();
const { obtenerPedidosSurtiendo, finalizarPedido, obtenerPedidosEmbarque } = require('../controllers/surtidoController');

router.get('/pedidos/pedidos-surtiendo', obtenerPedidosSurtiendo);

router.post('/finalizar/:noOrden', finalizarPedido);

router.get('/embarque', obtenerPedidosEmbarque);

module.exports = router;
