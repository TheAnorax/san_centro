const express = require('express');
const router = express.Router();
const pedidosController = require('../controllers/pedidosController');

router.get('/todos-con-productos', pedidosController.obtenerTodosConProductos);
router.get('/productos-por-orden/:no_orden', pedidosController.getProductosPorOrden);
router.get('/bahias', pedidosController.getBahias);
router.get('/usuarios-surtidor', pedidosController.getUsuarios);

// Nueva ruta:
router.post('/agregar-pedido-surtiendo', pedidosController.agregarPedidoSurtiendo);

module.exports = router;
