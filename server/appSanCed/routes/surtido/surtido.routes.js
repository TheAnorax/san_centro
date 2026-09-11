/**
 * surtido.routes.js
 * Rutas del módulo de Surtido para appSanCed.
 * Se montan bajo el prefijo /api/app/surtido (ver appSanCed/app.js).
 */

const express = require('express');
const router = express.Router();
const verifyToken = require('../../middlewares/verifyToken');
const surtidoController = require('../../controllers/surtido/surtido.controller');

// GET  /api/app/surtido                       -> lista de pedidos en surtido
router.get('/', verifyToken, surtidoController.listarPedidosEnSurtido);

// PUT  /api/app/surtido/:id_pedi/escaneo      -> registrar un escaneo de producto
router.put('/:id_pedi/escaneo', verifyToken, surtidoController.escanearProducto);

// PUT  /api/app/surtido/:id_pedi/no-surtido   -> marcar cantidad faltante + motivo
router.put('/:id_pedi/no-surtido', verifyToken, surtidoController.marcarNoSurtido);

// POST /api/app/surtido/:no_orden/:tipo/finalizar -> mover a embarques (o a finalizado si nada se surtió)
router.post('/:no_orden/:tipo/finalizar', verifyToken, surtidoController.finalizarSurtido);

module.exports = router;
