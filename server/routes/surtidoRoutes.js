const express = require('express');
const router = express.Router();
const { obtenerPedidosSurtiendo, finalizarPedido, obtenerPedidosEmbarque, cerrarPedidoEmbarque, obtenerPedidosFinalizados, asignarUsuarioPaqueteria, obtenerUsuariosEmbarques, getPedidosEmbarquePacking, liberarUsuarioPaqueteria
    , obtenerPedidoPorOrdenYTipo, getDetallePedido, sincronizarSanced, obtenerDatosSanced } = require('../controllers/surtidoController');

router.get('/pedidos/pedidos-surtiendo', obtenerPedidosSurtiendo);

router.get("/pedido/:noOrden/:tipo", obtenerPedidoPorOrdenYTipo);
router.post('/finalizar/:noOrden/:tipo', finalizarPedido);


router.get('/embarque', obtenerPedidosEmbarque);

router.post('/pedido-finalizado/:noOrden', cerrarPedidoEmbarque);

router.get('/Obtener-pedidos-finalizados', obtenerPedidosFinalizados);

router.get('/Obtener-usuarios', obtenerUsuariosEmbarques);

router.put('/asignar-usuario-paqueteria', asignarUsuarioPaqueteria);

router.get('/packing/:tipo/:no_orden', getPedidosEmbarquePacking);

router.put('/liberar-u suario-paqueteria', liberarUsuarioPaqueteria);

router.get("/detalle/:no_orden/:tipo", getDetallePedido);

router.get('/sincronizar-sanced', sincronizarSanced);  // 👈 nueva ruta

router.get('/sanced/:noOrden', obtenerDatosSanced);

module.exports = router;