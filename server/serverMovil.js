// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const routes = require('./appapp'); // Archivo de rutas (app vieja de surtido/embarques)

// appSanCed: módulo nuevo de Surtido/Embarques (mismo servidor, mismo puerto,
// pero rutas propias bajo /api/app/... para no chocar con nada de lo de arriba).
const surtidoRoutesNuevo = require('./appSanCed/routes/surtido/surtido.routes');
const embarquesRoutesNuevo = require('./appSanCed/routes/embarques/embarques.routes');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const port = 3003;

app.use(cors());
app.use(express.json());
app.use('/', routes);

app.use('/api/app/surtido', surtidoRoutesNuevo);
app.use('/api/app/embarques', embarquesRoutesNuevo);
app.get('/api/app/health', (_req, res) => res.json({ ok: true, app: 'appSanCed (dentro de serverMovil)' }));

io.on('connection', (socket) => {
  console.log('Nuevo cliente conectado');
  socket.on('disconnect', () => console.log('Cliente desconectado'));
});

server.listen(port, () => {
  console.log(`Servidor escuchando en http://66.232.105.107:${port}`);
});
