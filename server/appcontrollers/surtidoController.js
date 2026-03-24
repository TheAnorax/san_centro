// Archivo: src/controllers/surtidoController.js
const surtidoModel = require('../appmodels/surtidoModel');

const obtenerPedidosSurtido = async (req, res) => {
  try {
    const pedidos = await surtidoModel.getPedidosSurtido();
    res.json(pedidos);
  } catch (error) {
    console.error('Error al obtener los pedidos:', error);
    res.status(500).json({ message: 'Error al obtener pedidos' });
  }
};

const getPedidosAgrupados = async (req, res) => {
  try {
    const data = await pedidosModel.getPedidos();

    // 🔥 AGRUPAR POR PEDIDO
    const pedidosMap = {};

    data.forEach(row => {
      if (!pedidosMap[row.pedido]) {
        pedidosMap[row.pedido] = {
          pedidoId: row.pedido,
          productos: []
        };
      }

      pedidosMap[row.pedido].productos.push({
        codigo: row.codigo,
        descripcion: row.descripcion,
        cantidad: row.cantidad,
        idUsuario: row.id_usuario, // 🔥 CLAVE
        ubicacion: row.ubi_bahia
      });
    });

    const pedidos = Object.values(pedidosMap);

    res.json(pedidos);

  } catch (error) {
    console.error("Error al obtener pedidos:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};


module.exports = {
  obtenerPedidosSurtido,
  getPedidosAgrupados
};
