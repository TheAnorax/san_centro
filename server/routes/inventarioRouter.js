const express = require('express');
const router = express.Router();
const { todosLosInventarios, solicitarProducto } = require('../controllers/inventarioController');

router.get('/Obtenerinventario', todosLosInventarios);

router.post("/solicitar-producto", solicitarProducto);


module.exports = router;
 