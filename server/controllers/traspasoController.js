// controllers/traspasoController.js
const { insertTraspasoRecibido, handleObtenerRecibidos } = require('../models/traspasoModel');

async function handleGuardarTraspaso(req, res) {
  try {
    const {
      Codigo,
      Descripcion,
      Clave,
      um,
      _pz,
      Cantidad,
      dia_envio,
      almacen_envio,
      tiempo_llegada_estimado,
      estado,
      ubicacion
    } = req.body;

    if (
      Codigo == null ||
      !Descripcion ||
      Cantidad == null ||
      !dia_envio ||
      !tiempo_llegada_estimado ||
      !estado ||
      estado !== 'F' ||
      !ubicacion
    ) {
      return res.status(400).json({
        message:
          'Faltan datos obligatorios o el estado no es "F". ' +
          'Verifica que tengas: Codigo, Descripcion, Cantidad, dia_envio, ' +
          'tiempo_llegada_estimado, estado="F" y ubicacion.'
      });
    }

    const newId = await insertTraspasoRecibido({
      Codigo,
      Descripcion,
      Clave,
      um,
      _pz,
      Cantidad,
      dia_envio,
      almacen_envio,
      tiempo_llegada_estimado,
      estado,
      ubicacion
    });

    return res
      .status(201)
      .json({ message: 'Traspaso guardado correctamente', id: newId });
  } catch (error) {
    console.error('Error en handleGuardarTraspaso:', error);
    return res.status(500).json({
      message: 'Ocurrió un error al guardar el traspaso',
      error: error.message
    });
  }
}

async function handleListadoRecibidos(req, res) {
  try {
    return await handleObtenerRecibidos(req, res);
  } catch (error) {
    console.error('Error en handleListadoRecibidos:', error);
    return res.status(500).json({
      message: 'Error inesperado al solicitar recibidos',
      error: error.message
    });
  }
}


module.exports = {
  handleGuardarTraspaso,
  handleListadoRecibidos
};
