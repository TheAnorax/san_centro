const express = require('express');
const axios = require('axios');
const router = express.Router();
const pool = require('../db'); // 🔥 MOVER AQUÍ ARRIBA

const {
  handleGuardarTraspaso,
  handleListadoRecibidos,
  handleGetInventarioPorCodigo,
  handleUpdateProducto,
  handleGetProductosPorUbicacion,
  handleGuardarIncidencia
} = require('../controllers/traspasoController');

const RH_BASE_URL = process.env.RH_BASE_URL || 'http://66.232.105.87:3007/api/RH';

router.post('/guardarTraspaso', handleGuardarTraspaso);
router.get('/recibidos', handleListadoRecibidos);

router.get('/pendientes', async (req, res) => {
  try {
    // 1️⃣ Obtener traspasos de RH y recibidos en paralelo
    const [r, recibidos] = await Promise.all([
      axios.get(`${RH_BASE_URL}/ObtenerTraspaso`, { timeout: 5000 }),
      pool.query(`SELECT No_Orden, Codigo, Cantidad FROM recibir_traspasos`)
    ]);

    const todosLosTraspaso = r.data || [];

    // 2️⃣ Crear set de claves recibidas
    const recibidosSet = new Set(
      recibidos[0].map(r => `${r.No_Orden}|${r.Codigo}|${r.Cantidad}`)
    );

    // 3️⃣ Filtrar solo los pendientes
    const pendientes = todosLosTraspaso.filter(t => {
      const key = `${t.No_Orden}|${t.Codigo}|${t.Cantidad}`;
      return !recibidosSet.has(key);
    });

    res.json(pendientes);
  } catch (err) {
    const status = err.response?.status || 502;
    res.status(status).json({ ok: false, error: 'Proxy RH falló', detail: err.message });
  }
});

router.get('/inventario-por-codigo/:codigo', handleGetInventarioPorCodigo);
router.get('/producto/:codigo', handleGetInventarioPorCodigo);
router.put('/producto/:codigo', handleUpdateProducto);
router.get('/ubicacion/:ubicacion', handleGetProductosPorUbicacion);
router.post('/incidencia', handleGuardarIncidencia);

module.exports = router;