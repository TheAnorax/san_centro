const express = require('express');
const router = express.Router();
const { consultarUbicacionEspecifica, consultarUbicacionesConProductos, actualizarCodigo, pickDisponible, AlmaDisponible} = require('../appcontrollers/movimientosController');

// Ruta para consultar información de una ubicación específica
router.post('/', consultarUbicacionEspecifica);
router.get('/picking', consultarUbicacionesConProductos);
router.post('/actualizarUbicacion', actualizarCodigo);
router.get('/pickDisponible', pickDisponible )
router.get('/AlmaDisponible', AlmaDisponible )

module.exports = router;
