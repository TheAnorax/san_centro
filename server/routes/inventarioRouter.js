const express = require('express');
const router = express.Router();
const { todosLosInventarios } = require('../controllers/inventarioController');

router.get('/Obtenerinventario', todosLosInventarios);

module.exports = router;
