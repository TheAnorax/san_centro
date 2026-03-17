const express = require('express');
const router = express.Router();
const { todosLosInventarios, solicitarProducto, obtenerInventarioJDE } = require('../controllers/inventarioController');

router.get('/Obtenerinventario', todosLosInventarios);

router.post("/solicitar-producto", solicitarProducto);

router.get("/inventario-jde", obtenerInventarioJDE);

module.exports = router;
  