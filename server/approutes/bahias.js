// routes/bahias.js
const express = require('express');
const router = express.Router();
const { getBahias, liberarBahia } = require('../appcontrollers/bahiasController');

router.get('/bahias', getBahias);
router.put('/bahias/liberar/:id_bahia', liberarBahia);

module.exports = router;
