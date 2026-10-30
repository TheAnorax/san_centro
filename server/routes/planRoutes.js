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
    obtenerFacturacionDiariaCD,
    obtenerFacturacionCDOrdenes,
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
// 2026-10-29: facturación cross dock por día y tipo (Histórico Ventas › Facturación diaria en agenda2.0)
router.get('/facturacion-diaria-cd', obtenerFacturacionDiariaCD);
// 2026-10-30: detalle por orden (SANCED deduplica contra paquetería)
router.get('/facturacion-cd-ordenes', obtenerFacturacionCDOrdenes);
module.exports = router;