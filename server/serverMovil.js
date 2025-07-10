// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const routes = require('./appapp'); // Archivo de rutas
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const port = 3003;

app.use(express.json());
app.use('/', routes);

io.on('connection', (socket) => {
  console.log('Nuevo cliente conectado');
  socket.on('disconnect', () => console.log('Cliente desconectado'));
});

server.listen(port, () => {
  console.log(`Servidor escuchando en http://66.232.105.107:${port}`);
});
