const express = require('express');
const router = express.Router();
const { crearInsumo, obtenerTodosLosInsumos, crearMovimiento,
    movimientosPorInsumo, todosLosMovimientos, editarInsumo, enviarSolicitud, verSolicitudes, cambiarEstadoSolicitud } = require('../controllers/insumoController');

router.post('/Insertar_insumo', crearInsumo);

router.get('/Obtener_insumos', obtenerTodosLosInsumos);

router.put('/Editar_insumo/:id', editarInsumo);

router.post('/movimientos', crearMovimiento);

router.get('/movimientos/:id_insumos', movimientosPorInsumo);

router.get('/Mostrar_movimientos', todosLosMovimientos);




// INSERCCIONES DE INSUMOS 

router.post('/enviar-solicitud', enviarSolicitud);

router.get('/solicitudes', verSolicitudes);

router.put('/solicitudes/:id/:estado', cambiarEstadoSolicitud);


module.exports = router;
 