const {
  insertTraspasoRecibido,
  handleObtenerRecibidos,
  getInventarioPorCodigo,
  updateProductoCompleto  // ✅ nombre correcto
} = require('../models/traspasoModel');

const toDateOrNull = (v) => (v ? new Date(v) : null);

async function handleGuardarTraspaso(req, res) {
  try {
    const {
      No_Orden, tipo_orden,
      Codigo, Descripcion, Clave, um, _pz, Cantidad,
      dia_envio, almacen_envio, tiempo_llegada_estimado,
      estado, ubicacion, usuario_id,
      lote, lote_serie, oc
    } = req.body;

    if (Codigo == null || !Descripcion || Cantidad == null || !ubicacion) {
      return res.status(400).json({
        ok: false,
        message: 'Faltan campos obligatorios: Codigo, Descripcion, Cantidad y ubicacion.',
      });
    }

    const payload = {
      No_Orden: No_Orden ?? null,
      tipo_orden: tipo_orden ?? null,
      Codigo: Number(Codigo),
      Descripcion: String(Descripcion).trim(),
      Clave: Clave ?? null,
      um: um ?? null,
      _pz: _pz ?? null,
      Cantidad: Number(Cantidad) || 0,
      dia_envio: toDateOrNull(dia_envio),
      almacen_envio: almacen_envio ?? null,
      tiempo_llegada_estimado: toDateOrNull(tiempo_llegada_estimado),
      estado: (estado ?? 'F').toUpperCase(),
      ubicacion: String(ubicacion).trim(),
      usuario_id: usuario_id ?? null,
      lote: lote ?? null,
      lote_serie: lote_serie ?? null,
      oc: oc ?? null,
    };

    console.log('🚀 guardarTraspaso payload →', payload);
    const ids = await insertTraspasoRecibido(payload);
    return res.status(201).json({ ok: true, ...ids });

  } catch (error) {
    console.error('Error en handleGuardarTraspaso:', error);
    return res.status(500).json({
      ok: false,
      message: 'Ocurrió un error al guardar el traspaso',
      error: error.message,
    });
  }
}

async function handleListadoRecibidos(req, res) {
  try {
    return await handleObtenerRecibidos(req, res);
  } catch (error) {
    console.error('Error en handleListadoRecibidos:', error);
    return res.status(500).json({
      ok: false,
      message: 'Error inesperado al solicitar recibidos',
      error: error.message,
    });
  }
}

async function handleGetInventarioPorCodigo(req, res) {
  try {
    const { codigo } = req.params;

    if (!codigo) {
      return res.status(400).json({ ok: false, message: 'Código es requerido' });
    }

    const data = await getInventarioPorCodigo(codigo);

    if (data) {
      return res.json({ ok: true, data });
    } else {
      return res.json({ ok: false, data: null });
    }

  } catch (error) {
    console.error('Error en handleGetInventarioPorCodigo:', error);
    return res.status(500).json({
      ok: false,
      message: 'Error al consultar inventario',
      error: error.message
    });
  }
}

// ✅ actualizar producto + inventario + historial
async function handleUpdateProducto(req, res) {
  try {
    const { codigo } = req.params;
    const {
      _pz, _inner, _master,
      barcode_pz, barcode_inner, barcode_master,
      ubicacion, cant_stock_real,  // ✅ agregados
      um,                           // ✅ agregado
      modificado_por
    } = req.body;

    if (!codigo) {
      return res.status(400).json({ ok: false, message: 'Código es requerido' });
    }

    if (!modificado_por) {
      return res.status(400).json({ ok: false, message: 'Falta el usuario que modifica' });
    }

    await updateProductoCompleto(  // ✅ nombre correcto
      codigo,
      { _pz, _inner, _master, barcode_pz, barcode_inner, barcode_master, ubicacion, cant_stock_real, um },
      modificado_por
    );

    return res.json({ ok: true, message: 'Producto actualizado correctamente' });

  } catch (error) {
    console.error('Error en handleUpdateProducto:', error);
    return res.status(500).json({
      ok: false,
      message: 'Error al actualizar producto',
      error: error.message
    });
  }
}

module.exports = {
  handleGuardarTraspaso,
  handleListadoRecibidos,
  handleGetInventarioPorCodigo,
  handleUpdateProducto
};