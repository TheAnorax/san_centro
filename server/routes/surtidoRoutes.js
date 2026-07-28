const express = require('express');
const router = express.Router();
const { obtenerPedidosSurtiendo, finalizarPedido, obtenerPedidosEmbarque, cerrarPedidoEmbarque, obtenerPedidosFinalizados, asignarUsuarioPaqueteria, obtenerUsuariosEmbarques, getPedidosEmbarquePacking, liberarUsuarioPaqueteria
    , obtenerPedidoPorOrdenYTipo, getDetallePedido, sincronizarSanced, obtenerDatosSanced, obtenerProductosPorOrdenUniversalConFusion } = require('../controllers/surtidoController');
const { emitPedidosActualizados } = require('../socket');

// 🔥 La app móvil (servidor aparte, puerto 3003) llama aquí cuando alguien
// escanea o cambia el estado de un pedido, para que el dashboard web
// se actualice al instante sin necesidad de recargar la página.
router.post('/notificar-cambio', (req, res) => {
    emitPedidosActualizados(req.body || {});
    res.json({ ok: true });
});

router.get('/pedidos/pedidos-surtiendo', obtenerPedidosSurtiendo);

router.get("/pedido/:noOrden/:tipo", obtenerPedidoPorOrdenYTipo);
router.post('/finalizar/:noOrden/:tipo', finalizarPedido);


router.get('/embarque', obtenerPedidosEmbarque);

router.post('/pedido-finalizado/:noOrden', cerrarPedidoEmbarque);

router.get('/Obtener-pedidos-finalizados', obtenerPedidosFinalizados);

router.get('/Obtener-usuarios', obtenerUsuariosEmbarques);

router.put('/asignar-usuario-paqueteria', asignarUsuarioPaqueteria);

router.get('/packing/:tipo/:no_orden', getPedidosEmbarquePacking);

router.put('/liberar-usuario-paqueteria', liberarUsuarioPaqueteria);

router.get("/detalle/:no_orden/:tipo", getDetallePedido);

router.get('/sincronizar-sanced', sincronizarSanced);  // 👈 nueva ruta

router.get('/sanced/:noOrden', obtenerDatosSanced);

router.get('/productos-fusion/:noOrden/:tipo', obtenerProductosPorOrdenUniversalConFusion);

module.exports = router;