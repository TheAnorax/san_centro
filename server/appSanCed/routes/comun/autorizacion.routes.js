/**
 * autorizacion.routes.js
 * /api/app/autorizacion/validar-supervisor
 * Requiere sesión activa (el que está trabajando en la app), y adentro
 * valida las credenciales del supervisor que autoriza la acción.
 */

const express = require('express');
const router = express.Router();
const verifyToken = require('../../middlewares/verifyToken');
const { validarSupervisor } = require('../../controllers/comun/autorizacion.controller');

router.use(verifyToken);
router.post('/validar-supervisor', validarSupervisor);

module.exports = router;
