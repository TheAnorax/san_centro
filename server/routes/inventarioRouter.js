const express = require('express');
const router = express.Router();
const { 
  todosLosInventarios, 
  solicitarProducto, 
  obtenerInventarioJDE, 
  actualizarUbicacion,
  actualizarLimites,
  recalcularInvOpt,
  cargaMasivaLimites
} = require('../controllers/inventarioController');

router.get('/Obtenerinventario', todosLosInventarios);
router.post("/solicitar-producto", solicitarProducto);
router.get("/inventario-jde", obtenerInventarioJDE);
router.put("/actualizar-ubicacion", actualizarUbicacion);
router.put("/actualizar-limites", actualizarLimites);
router.put("/recalcular-inv-opt", recalcularInvOpt);
router.post('/carga-masiva-limites', cargaMasivaLimites);

module.exports = router;