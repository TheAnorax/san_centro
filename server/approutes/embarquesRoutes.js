const express = require('express');
const router = express.Router();
const { obtenerEmbarques, actualizarBahiaEmbarque, obtenerEmbarquesNew} = require('../appcontrollers/embarquesController');

// Ruta para obtener los datos de embarques
router.get('/', obtenerEmbarques);
router.put('/', actualizarBahiaEmbarque);
//router.get('/obtenerEmbarquesNew', obtenerEmbarquesNew);
router.get('/obtenerEmbarquesNew/:idUsu', obtenerEmbarquesNew);
module.exports = router;
