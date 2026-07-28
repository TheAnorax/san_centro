// socket.js
// Módulo compartido para inicializar socket.io y notificar a los clientes
// conectados (el dashboard web) cuando algo cambia en pedidos/embarques.

let io = null;

function initSocket(server) {
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: {
      origin: '*',
    },
  });

  io.on('connection', (socket) => {
    console.log('🔌 Cliente conectado al socket:', socket.id);
    socket.on('disconnect', () => {
      console.log('🔌 Cliente desconectado:', socket.id);
    });
  });

  return io;
}

// Avisa a todos los clientes conectados que hay cambios en pedidos.
// El payload es opcional, solo informativo (el cliente vuelve a pedir los datos).
function emitPedidosActualizados(payload = {}) {
  if (io) {
    io.emit('pedidos-actualizados', payload);
  }
}

module.exports = { initSocket, emitPedidosActualizados };
