/**
 * surtido.routes.js
 * Rutas del módulo de Surtido para appSanCed.
 * Se montan bajo el prefijo /api/app/surtido (ver appSanCed/app.js).
 *
 * Acceso restringido por rol_id (tabla `roles`): 1=admin, 2=Surtidor, 4=master.
 */

const express = require('express');
const router = express.Router();
const verifyToken = require('../../middlewares/verifyToken');
const requireRole = require('../../middlewares/requireRole');
const surtidoController = require('../../controllers/surtido/surtido.controller');

const ROL_ADMIN = 1;
const ROL_SURTIDOR = 2;
const ROL_MASTER = 4;
const ROLES_PERMITIDOS = [ROL_SURTIDOR, ROL_ADMIN, ROL_MASTER];
router.use(verifyToken, requireRole(ROLES_PERMITIDOS));

// GET  /api/app/surtido                       -> lista de pedidos en surtido
router.get('/', surtidoController.listarPedidosEnSurtido);

// PUT  /api/app/surtido/:id_pedi/escaneo      -> registrar un escaneo de producto
router.put('/:id_pedi/escaneo', surtidoController.escanearProducto);

// PUT  /api/app/surtido/:id_pedi/no-surtido   -> marcar cantidad faltante + motivo
router.put('/:id_pedi/no-surtido', surtidoController.marcarNoSurtido);

// POST /api/app/surtido/:no_orden/:tipo/finalizar -> mover a embarques (o a finalizado si nada se surtió)
//      body opcional: { bahia } -> se guarda en ubi_bahia de todas las líneas del pedido
router.post('/:no_orden/:tipo/finalizar', surtidoController.finalizarSurtido);

module.exports = router;
