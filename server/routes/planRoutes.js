const express = require('express');
const router = express.Router();
const {
    insertarRutasPlan,
    obtenerRutasPlan,
    obtenerPedidosPorFecha,    // 👈 nueva
    actualizarStatusEntrega,    // 👈 nueva
    actualizarEntregaMasivaController,
    registrarEntregaPaqueteria,
    obtenerPedidosPorFactura,
    obtenerPedidosFinalizadosPorMes,
    obtenerHistoricoCrossDocking,
    obtenerPedidosCD
} = require('../controllers/planController');

router.post('/insertar', insertarRutasPlan);
router.get('/rutas', obtenerRutasPlan);
router.get('/pedidos-por-fecha', obtenerPedidosPorFecha);       // 👈 nueva
router.put('/actualizar-status', actualizarStatusEntrega);       // 👈 nueva
router.put('/actualizar-entrega-masivo', actualizarEntregaMasivaController); // 👈 nueva: subida de Excel de entregas
router.post('/registrar-paqueteria', registrarEntregaPaqueteria);

router.post('/pedidos-finalizados-tipo', obtenerPedidosPorFactura);
router.post('/pedidos-finalizados-mes-cd', obtenerPedidosFinalizadosPorMes);
router.get('/historico-cross-docking', obtenerHistoricoCrossDocking);
router.get('/pedidos-cd', obtenerPedidosCD); // 👈 nueva: pedidos CD en vivo desde Sanced
module.exports = router;