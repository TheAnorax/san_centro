// routes/reabastecimientoRoutes.js
const express = require('express');
const router = express.Router();
const { obtenerReabastecimiento } = require('../appcontrollers/reabastecimientoController');

router.get("/", obtenerReabastecimiento);

module.exports = router;
