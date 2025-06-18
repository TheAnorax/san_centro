const express = require('express');
const router = express.Router();
const { getProductosPorOrden, obtenerTodosConProductos } = require('../controllers/pedidosController');

// GET /api/pedidos/productos-por-orden/:no_orden
router.get('/productos-por-orden/:no_orden', getProductosPorOrden);

router.get('/todos-con-productos', obtenerTodosConProductos);

module.exports = router;
