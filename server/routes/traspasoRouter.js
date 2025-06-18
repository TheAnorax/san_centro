// routes/traspasoRouter.js
const express = require('express');
const router = express.Router();
const { handleGuardarTraspaso, handleListadoRecibidos } = require('../controllers/traspasoController');

router.post('/guardarTraspaso', handleGuardarTraspaso);

router.get('/recibidos', handleListadoRecibidos);

module.exports = router;
