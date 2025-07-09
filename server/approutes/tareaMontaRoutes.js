// routes/tareaMontaRoutes.js
const express = require('express');
const router = express.Router();
const { actualizarTareaMonta } = require('../appcontrollers/tareaMontaController');

router.put("/", actualizarTareaMonta);

module.exports = router;
