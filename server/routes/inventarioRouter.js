const express = require('express');
const router = express.Router();
const {
  todosLosInventarios,
  solicitarProducto,
  obtenerInventarioJDE,
  actualizarUbicacion,
  actualizarLimites,
  recalcularInvOpt,
  cargaMasivaLimites,
  solicitarProductoMasivo,
  listarSolicitudesInventario,
  actualizarEstadoSolicitudInventario,
  actualizarCantidadSolicitudInventario,
  autorizarSolicitudesInventarioLote
} = require('../controllers/inventarioController');

router.get('/Obtenerinventario', todosLosInventarios);
router.post("/solicitar-producto", solicitarProducto);
router.post("/solicitar-producto-masivo", solicitarProductoMasivo);
router.get("/inventario-jde", obtenerInventarioJDE);
router.put("/actualizar-ubicacion", actualizarUbicacion);
router.put("/actualizar-limites", actualizarLimites);
router.put("/recalcular-inv-opt", recalcularInvOpt);
router.post('/carga-masiva-limites', cargaMasivaLimites);
router.get('/solicitudes', listarSolicitudesInventario); // 👈 nueva: ?estado=No Pedido|Modificacion|Autorizada
router.put('/solicitudes/autorizar-lote', autorizarSolicitudesInventarioLote); // 👈 nueva: autoriza todo el lote de un golpe
router.put('/solicitudes/:id/estado', actualizarEstadoSolicitudInventario); // 👈 nueva
router.put('/solicitudes/:id/cantidad', actualizarCantidadSolicitudInventario); // 👈 nueva

module.exports = router;