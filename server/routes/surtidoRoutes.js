const express = require('express');
const router = express.Router();
const { obtenerPedidosSurtiendo, finalizarPedido, obtenerPedidosEmbarque, cerrarPedidoEmbarque, obtenerPedidosFinalizados, asignarUsuarioPaqueteria, obtenerUsuariosEmbarques, getPedidosEmbarquePacking, liberarUsuarioPaqueteria } = require('../controllers/surtidoController');

router.get('/pedidos/pedidos-surtiendo', obtenerPedidosSurtiendo);

router.post('/finalizar/:noOrden', finalizarPedido);

router.get('/embarque', obtenerPedidosEmbarque);

router.post('/pedido-finalizado/:noOrden', cerrarPedidoEmbarque);

router.get('/Obtener-pedidos-finalizados', obtenerPedidosFinalizados);

router.get('/Obtener-usuarios', obtenerUsuariosEmbarques);

router.put('/asignar-usuario-paqueteria', asignarUsuarioPaqueteria);

router.get('/packing/:tipo/:no_orden', getPedidosEmbarquePacking);

router.put('/liberar-usuario-paqueteria', liberarUsuarioPaqueteria);

module.exports = router;