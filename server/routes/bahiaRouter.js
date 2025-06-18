// routes/bahiaRouter.js
const express = require('express');
const BahiaController = require('../controllers/bahiaController');

const router = express.Router();

// GET: Todas las bahías
router.get('/Obtener', BahiaController.getAll);

// PATCH: Liberar bahía
router.patch('/liberar', BahiaController.liberar);

module.exports = router;
