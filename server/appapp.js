const express = require('express');
const router = express.Router();
const pedidosRoutes = require('./approutes/pedidos');
const bahiasRoutes = require('./approutes/bahias');
const pedidosUpdates = require('./approutes/pedidosUpdateRoutes'); 
const pedidosEstadoRoutes  = require('./approutes/pedidosEstadoRoutes'); 
const pedidosNoSurtidaRoutes = require('./approutes/pedidosNoSurtidaRoutes');
const pedidosReabastecimientoRoutes = require('./approutes/pedidosReabastecimientoRoutes');
const reabastecimientoRoutes = require('./approutes/reabastecimientoRoutes');
const tareaMontaRoutes = require('./approutes/tareaMontaRoutes');
const reciboMontaRoutes = require('./approutes/reciboMontaRoutes');
const reciboRoutes = require('./approutes/reciboRoutes');
const authRoutes = require('./approutes/authRoutes');
const embarquesRoutes = require('./approutes/embarquesRoutes'); 
const productoRoutes = require('./approutes/productoRoutes'); 
const embarqueRoutes = require('./approutes/embarqueRoutes'); 
const ubicacionesRoutes = require('./approutes/ubicacionesRoutes');
const movimientosRoutes = require('./approutes/movimientosRoutes');
const movimientoRoutes = require('./approutes/movimientoRoutes');
const inventoryRoutes = require('./approutes/inventoryRoutes');  
const productInventoryRoutes = require('./approutes/productInventoryRoutes'); 
const updateInventoryUbi = require('./approutes/inventoryRoutes') 
const getInventoryByPasillo = require ('./approutes/inventoryRoutes')
const update_inventory = require('./approutes/inventoryRoutes')
const actualizarBahiaEmbarque = require('./approutes/embarquesRoutes'); 

router.use('/api/pedidos', pedidosRoutes);
router.use('/bahias', bahiasRoutes);
router.use('/actualizarCantidadSurtida', pedidosUpdates );
router.use('/api/pedidos/actualizar-estado', pedidosEstadoRoutes);
router.use('/actualizarCantidadNoSurtida', pedidosNoSurtidaRoutes);
router.use('/actualizarSurtidoFaltante', pedidosReabastecimientoRoutes);
router.use('/reabastecimiento', reabastecimientoRoutes);
router.use('/tarea-monta', tareaMontaRoutes);
router.use('/recibomonta', reciboMontaRoutes);
router.use('/actualizarRecibo', reciboRoutes);
router.use('/api/login', authRoutes);
router.use('/embarques', embarquesRoutes);
router.use('/actualizarProducto', productoRoutes);
router.use('/actualizarEmbarque', embarqueRoutes);
router.use('/consultaUbicaciones', ubicacionesRoutes);
router.use('/movimientosUbicacion', movimientosRoutes);
router.use('/realizarMovimiento', movimientoRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/getproductinventory', productInventoryRoutes);
router.use('/updateInventory', updateInventoryUbi)
router.use('/inventory',  getInventoryByPasillo)
router.use('/inventory', update_inventory)
router.use('/actualizarBahiaEmbarque', actualizarBahiaEmbarque);




module.exports = router;