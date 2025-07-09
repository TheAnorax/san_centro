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

module.exports = {
  obtenerPedidosSurtido,
};
