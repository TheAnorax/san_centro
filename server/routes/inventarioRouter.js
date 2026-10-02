const express = require('express');
const router = express.Router();
const {
  todosLosInventarios,
  solicitarProducto,
  obtenerInventarioJDE,
  obtenerDisponibilidadSantul,
  actualizarUbicacion,
  actualizarLimites,
  recalcularInvOpt,
  cargaMasivaLimites,
  solicitarProductoMasivo,
  listarSolicitudesInventario,
  actualizarEstadoSolicitudInventario,
  actualizarCantidadSolicitudInventario,
  autorizarSolicitudesInventarioLote,
  resolverLotePorToken,
  marcarPedidoRegistradoEnCedis
} = require('../controllers/inventarioController');

router.get('/Obtenerinventario', todosLosInventarios);
router.post("/solicitar-producto", solicitarProducto);
router.post("/solicitar-producto-masivo", solicitarProductoMasivo);
router.get("/inventario-jde", obtenerInventarioJDE);
router.get("/disponibilidad-santul", obtenerDisponibilidadSantul); // 👈 nueva: disponible en vivo (Existencia_Fisica - Comprometido) de un almacén, solo para mostrar — no toca la base
router.put("/actualizar-ubicacion", actualizarUbicacion);
router.put("/actualizar-limites", actualizarLimites);
router.put("/recalcular-inv-opt", recalcularInvOpt);
router.post('/carga-masiva-limites', cargaMasivaLimites);
router.get('/solicitudes', listarSolicitudesInventario); // 👈 nueva: ?estado=No Pedido|Modificacion|Autorizada
router.put('/solicitudes/autorizar-lote', autorizarSolicitudesInventarioLote); // 👈 nueva: manda todo el lote a pedir autorización (correo con botones)
router.get('/solicitudes/resolver-lote', resolverLotePorToken); // 👈 nueva: link público (sin login) que clican los botones del correo
router.put('/solicitudes/:id/estado', actualizarEstadoSolicitudInventario); // 👈 nueva
router.put('/solicitudes/:id/cantidad', actualizarCantidadSolicitudInventario); // 👈 nueva
router.put('/solicitudes/pedido/:numeroPedido/registrar-cedis', marcarPedidoRegistradoEnCedis); // 👈 nueva: marca TODO el pedido como ya registrado en CEDIS

module.exports = router;