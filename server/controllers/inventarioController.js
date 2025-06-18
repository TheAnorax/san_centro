const { obtenerInventario } = require('../models/inventarioModel');

async function todosLosInventarios(req, res) {
  try {
    const inventario = await obtenerInventario();
    res.json(inventario);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al consultar inventario",
      error: error.message
    });
  }
}

module.exports = { todosLosInventarios };
