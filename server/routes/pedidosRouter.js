const express = require('express');
const router = express.Router();
const pedidosController = require('../controllers/pedidosController');

router.get('/todos-con-productos', pedidosController.obtenerTodosConProductos);
router.get('/productos-por-orden/:no_orden', pedidosController.getProductosPorOrden);
router.get('/bahias', pedidosController.getBahias);
router.get('/usuarios-surtidor', pedidosController.getUsuarios);
router.get('/responsables-cuarto', pedidosController.getResponsablesCuarto); // ← NUEVA
router.post('/agregar-pedido-surtiendo', pedidosController.agregarPedidoSurtiendo);
router.put('/embarques/liberar-usuario', pedidosController.liberarUsuarioPaqueteria);

module.exports = router;