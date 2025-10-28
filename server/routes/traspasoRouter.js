const express = require('express');
const axios = require('axios');
const router = express.Router();

const { handleGuardarTraspaso, handleListadoRecibidos } = require('../controllers/traspasoController');

const RH_BASE_URL = process.env.RH_BASE_URL || 'http://66.232.105.107:3007/api/RH';

const RH_BASE_URL = process.env.RH_BASE_URL || 'http://66.232.105.107:3007/api/RH';

const RH_BASE_URL = process.env.RH_BASE_URL || 'http://66.232.105.87:3007/api/RH';


router.post('/guardarTraspaso', handleGuardarTraspaso);

router.get('/recibidos', handleListadoRecibidos);

router.get('/pendientes', async (req, res) => {
    try {
        const r = await axios.get(`${RH_BASE_URL}/ObtenerTraspaso`, { timeout: 10000 });
        res.json(r.data);
    } catch (err) {
        const status = err.response?.status || 502;
        res.status(status).json({ ok: false, error: 'Proxy RH falló', detail: err.message });
    }
});


module.exports = router;