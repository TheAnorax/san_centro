const express = require('express');
const router = express.Router();
const { crearInsumo, obtenerTodosLosInsumos, crearMovimiento,
    movimientosPorInsumo, todosLosMovimientos, editarInsumo } = require('../controllers/insumoController');

router.post('/Insertar_insumo', crearInsumo);
router.get('/Obtener_insumos', obtenerTodosLosInsumos);
router.put('/Editar_insumo/:id', editarInsumo);

router.post('/movimientos', crearMovimiento);

router.get('/movimientos/:id_insumos', movimientosPorInsumo);

router.get('/Mostrar_movimientos', todosLosMovimientos);

module.exports = router;
