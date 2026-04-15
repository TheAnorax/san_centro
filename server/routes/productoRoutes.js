const express = require('express');
const router = express.Router();
const productoController = require('../controllers/productoController');

router.get('/', productoController.getProductos);
router.get('/negados', productoController.getCodigosNegados);        // ✅ antes de /:id
router.get('/historial', productoController.getHistorial);           // ✅ antes de /:id
router.get('/:id/historial', productoController.getHistorial);       // ✅ por si se llama con id
router.get('/:id', productoController.getProductoById);              // ← al final
router.post('/', productoController.createProducto);
router.put('/:id', productoController.updateProducto);
router.delete('/:id', productoController.deleteProducto);

module.exports = router;