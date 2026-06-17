const express = require('express');
const router = express.Router();
const {
    insertarRutasPlan,
    obtenerRutasPlan,
    obtenerPedidosPorFecha,    // 👈 nueva
    actualizarStatusEntrega,    // 👈 nueva
    registrarEntregaPaqueteria,
    obtenerPedidosPorFactura,
    obtenerPedidosFinalizadosPorMes,
    obtenerHistoricoCrossDocking
} = require('../controllers/planController');

router.post('/insertar', insertarRutasPlan);
router.get('/rutas', obtenerRutasPlan);
router.get('/pedidos-por-fecha', obtenerPedidosPorFecha);       // 👈 nueva
router.put('/actualizar-status', actualizarStatusEntrega);       // 👈 nueva
router.post('/registrar-paqueteria', registrarEntregaPaqueteria);

router.post('/pedidos-finalizados-tipo', obtenerPedidosPorFactura);
router.post('/pedidos-finalizados-mes-cd', obtenerPedidosFinalizadosPorMes);
router.get('/historico-cross-docking', obtenerHistoricoCrossDocking); 
module.exports = router;