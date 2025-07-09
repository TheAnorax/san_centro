// routes/pedidos.js
const express = require('express');
const router = express.Router();
const { getPedidosData } = require('../appcontrollers/pedidosController');

router.get('/', getPedidosData);

module.exports = router;
