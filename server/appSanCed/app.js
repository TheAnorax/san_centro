/**
 * app.js — appSanCed (YA NO SE USA COMO SERVIDOR APARTE)
 *
 * Las rutas de Surtido y Embarques de este módulo ahora se montan
 * directamente dentro de `serverMovil.js` (puerto 3003), bajo
 * /api/app/surtido y /api/app/embarques, para no tener que levantar
 * un tercer proceso/puerto. Este archivo se deja solo de referencia;
 * NO lo corras (no lo arranques con `node app.js`), ya no hace falta.
 *
 * El código real que sí se usa son los archivos de:
 *   appSanCed/routes/**, appSanCed/controllers/**, appSanCed/models/**
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const surtidoRoutes = require('./routes/surtido/surtido.routes');
const embarquesRoutes = require('./routes/embarques/embarques.routes');

const app = express();

app.use(cors());
app.use(express.json());

// Log simple de cada request, para depurar mientras se prueba esta app nueva.
app.use((req, res, next) => {
    console.log(`[appSanCed] ${req.method} ${req.originalUrl}`);
    next();
});

app.use('/api/app/surtido', surtidoRoutes);
app.use('/api/app/embarques', embarquesRoutes);

app.get('/api/app/health', (_req, res) => res.json({ ok: true, app: 'appSanCed' }));

const PORT = process.env.APPSANCED_PORT || 3010;
app.listen(PORT, () => {
    console.log(`✅ [appSanCed] corriendo en el puerto ${PORT}`);
});

module.exports = app;
