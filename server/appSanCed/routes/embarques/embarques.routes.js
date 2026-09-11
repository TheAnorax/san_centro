/**
 * embarques.routes.js
 * Rutas del módulo de Embarques para appSanCed.
 * Se montan bajo el prefijo /api/app/embarques (ver appSanCed/app.js).
 */

const express = require('express');
const router = express.Router();
const verifyToken = require('../../middlewares/verifyToken');
const embarquesController = require('../../controllers/embarques/embarques.controller');

// GET  /api/app/embarques                          -> lista de pedidos en embarque
router.get('/', verifyToken, embarquesController.listarPedidosEnEmbarque);

// PUT  /api/app/embarques/:id_pedi/caja             -> asignar/actualizar número y tipo de caja
router.put('/:id_pedi/caja', verifyToken, embarquesController.asignarCaja);

// PUT  /api/app/embarques/:no_orden/paqueteria      -> asignar usuario de paquetería
router.put('/:no_orden/paqueteria', verifyToken, embarquesController.asignarUsuarioPaqueteria);

// PUT  /api/app/embarques/:no_orden/paqueteria/liberar -> liberar usuario de paquetería
router.put('/:no_orden/paqueteria/liberar', verifyToken, embarquesController.liberarUsuarioPaqueteria);

// POST /api/app/embarques/:no_orden/:tipo/finalizar -> mover a pedido_finalizado
router.post('/:no_orden/:tipo/finalizar', verifyToken, embarquesController.finalizarEmbarque);

module.exports = router;
