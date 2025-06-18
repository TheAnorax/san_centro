const { insertarInsumo, obtenerInsumos, actualizarInsumo, registrarMovimiento,
  obtenerMovimientosPorInsumo, obtenerTodosLosMovimientos } = require('../models/insumoModel');

async function crearInsumo(req, res) {
  try {
    const data = req.body;
    const result = await insertarInsumo(data);
    res.status(201).json({
      success: true,
      message: 'Insumo registrado correctamente',
      insertId: result.insertId
    });
  } catch (error) {
    console.error('❌ Error al insertar insumo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar insumo',
      error: error.message
    });
  }
}

async function obtenerTodosLosInsumos(req, res) {
  try {
    const insumos = await obtenerInsumos();
    res.json(insumos);
  } catch (error) {
    console.error('❌ Error al obtener insumos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener insumos',
      error: error.message
    });
  }
}

async function editarInsumo(req, res) {
  try {
    const id = req.params.id;
    const data = req.body;
    console.log("ID recibido:", id);
    console.log("DATA recibida:", data);
    await actualizarInsumo(id, data);
    res.json({ success: true, message: "Insumo actualizado correctamente" });
  } catch (error) {
    console.error("❌ Error en editarInsumo:", error);
    res.status(500).json({ success: false, message: "Error al actualizar insumo", error: error.message });
  }
}

async function crearMovimiento(req, res) {
  try {
    const data = req.body;
    await registrarMovimiento(data);
    res.status(201).json({ success: true, message: "Movimiento registrado correctamente" });
  } catch (error) {
    console.error('❌ Error en crearMovimiento:', error); // <-- Cambiado para mostrar el error real
    res.status(500).json({ success: false, message: "Error al registrar movimiento", error: error.message });
  }
}


// Obtener movimientos de un insumo
async function movimientosPorInsumo(req, res) {
  try {
    const { id_insumos } = req.params;
    const [movimientos] = await obtenerMovimientosPorInsumo(id_insumos);
    res.json(movimientos);
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al consultar movimientos", error: error.message });
  }
}

// (Opcional) Todos los movimientos
async function todosLosMovimientos(req, res) {
  try {
    const movimientos = await obtenerTodosLosMovimientos();
    res.json(movimientos);
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al consultar movimientos", error: error.message });
  }
}


module.exports = { crearInsumo, obtenerTodosLosInsumos, editarInsumo, crearMovimiento, movimientosPorInsumo, todosLosMovimientos };
