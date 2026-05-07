const express = require('express');
const router = express.Router();
const { 
    insertarRutasPlan, 
    obtenerRutasPlan,
    obtenerPedidosPorFecha,    // 👈 nueva
    actualizarStatusEntrega,    // 👈 nueva
    registrarEntregaPaqueteria  
} = require('../controllers/planController');

router.post('/insertar', insertarRutasPlan);
router.get('/rutas', obtenerRutasPlan);
router.get('/pedidos-por-fecha', obtenerPedidosPorFecha);       // 👈 nueva
router.put('/actualizar-status', actualizarStatusEntrega);       // 👈 nueva
router.post('/registrar-paqueteria', registrarEntregaPaqueteria);

module.exports = router;