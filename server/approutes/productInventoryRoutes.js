const express = require('express');
const router = express.Router();
const { obtenerInventarioProducto } = require('../appcontrollers/productInventoryController');

// Ruta para obtener el inventario de un producto por `codigo_pz`
router.get('/', obtenerInventarioProducto);

module.exports = router;
