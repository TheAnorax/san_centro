const express = require('express');
const router = express.Router();
const { actualizarProducto } = require('../appcontrollers/productoController');

// Ruta para actualizar el producto en pedido_embarque
router.put('/', actualizarProducto);

module.exports = router;
