/**
 * app.js — appSanCed
 * Nueva aplicación, separada y ordenada, solo para los módulos de
 * Surtido y Embarques (los demás de la captura se agregan después
 * siguiendo el mismo patrón de carpetas: config / controllers / models / routes).
 *
 * Esto NO reemplaza server.js ni serverMovil.js todavía — corre en su propio
 * puerto para poder probarse en paralelo sin arriesgar lo que ya funciona.
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
