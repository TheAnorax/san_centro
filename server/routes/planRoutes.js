const express = require('express');
const router = express.Router();
const { insertarRutasPlan, obtenerRutasPlan } = require('../controllers/planController');

router.post('/insertar', insertarRutasPlan);
router.get('/rutas', obtenerRutasPlan); // ← NUEVA

module.exports = router;