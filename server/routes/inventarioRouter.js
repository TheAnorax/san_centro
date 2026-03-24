const express = require('express');
const router = express.Router();
const { todosLosInventarios, solicitarProducto, obtenerInventarioJDE, actualizarUbicacion } = require('../controllers/inventarioController');

router.get('/Obtenerinventario', todosLosInventarios);

router.post("/solicitar-producto", solicitarProducto);

router.get("/inventario-jde", obtenerInventarioJDE);

router.put("/actualizar-ubicacion", actualizarUbicacion);

module.exports = router;
