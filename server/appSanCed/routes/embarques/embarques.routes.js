/**
 * embarques.routes.js
 * Rutas del módulo de Embarques para appSanCed.
 * Se montan bajo el prefijo /api/app/embarques (ver appSanCed/app.js).
 *
 * Acceso restringido por rol_id (tabla `roles`): 1=admin, 2=Surtidor, 4=master.
 */

const express = require('express');
const router = express.Router();
const verifyToken = require('../../middlewares/verifyToken');
const requireRole = require('../../middlewares/requireRole');
const embarquesController = require('../../controllers/embarques/embarques.controller');

const ROL_ADMIN = 1;
const ROL_SURTIDOR = 2;
const ROL_MASTER = 4;
const ROLES_PERMITIDOS = [ROL_SURTIDOR, ROL_ADMIN, ROL_MASTER];
router.use(verifyToken, requireRole(ROLES_PERMITIDOS));

// GET  /api/app/embarques                          -> lista de pedidos en embarque
router.get('/', embarquesController.listarPedidosEnEmbarque);

// PUT  /api/app/embarques/:id_pedi/caja             -> asignar/actualizar número y tipo de caja
router.put('/:id_pedi/caja', embarquesController.asignarCaja);

// PUT  /api/app/embarques/:no_orden/paqueteria      -> asignar usuario de paquetería
router.put('/:no_orden/paqueteria', embarquesController.asignarUsuarioPaqueteria);

// PUT  /api/app/embarques/:no_orden/paqueteria/liberar -> liberar usuario de paquetería
router.put('/:no_orden/paqueteria/liberar', embarquesController.liberarUsuarioPaqueteria);

// POST /api/app/embarques/:no_orden/:tipo/finalizar -> mover a pedido_finalizado
router.post('/:no_orden/:tipo/finalizar', embarquesController.finalizarEmbarque);

module.exports = router;
