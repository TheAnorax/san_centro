// src/services/traspasoService.js (o donde tengas este helper)
const pool = require('../db');

async function insertTraspasoRecibido(datos) {
  const sql = `
    INSERT INTO recibir_traspasos
      (No_Orden, tipo_orden,
       Codigo, Descripcion, Clave, um, _pz, Cantidad,
       dia_envio, almacen_envio, tiempo_llegada_estimado,
       estado, ubicacion, usuario_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    datos.No_Orden || null,
    datos.tipo_orden || null,

    datos.Codigo,
    datos.Descripcion,
    datos.Clave || null,
    datos.um || null,
    datos._pz != null ? datos._pz : null,
    datos.Cantidad,

    // fechas
    datos.dia_envio ? new Date(datos.dia_envio) : null,
    datos.almacen_envio || null,
    datos.tiempo_llegada_estimado ? new Date(datos.tiempo_llegada_estimado) : null,

    // estado / destino / auditoría
    datos.estado || 'F',
    datos.ubicacion || null,
    datos.usuario_id || null
  ];

  const [result] = await pool.query(sql, params);

  // inventario (no cambia)
  const sqlInv = `
    INSERT INTO inventario
      (ubicacion, codigo_producto, lote, almacen, cant_stock_real, ingreso)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  const paramsInv = [
    datos.ubicacion,
    datos.Codigo,
    datos.lote || null,
    datos.almacen_envio || null,
    datos.Cantidad,
    new Date()
  ];
  const [invResult] = await pool.query(sqlInv, paramsInv);

  return {
    recibir_traspasos_id: result.insertId,
    inventario_id: invResult.insertId
  };
}

async function handleObtenerRecibidos(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT 
        rt.No_Orden, rt.tipo_orden,
        rt.Codigo, rt.Cantidad, rt.estado, rt.ubicacion,
        rt.usuario_id, u.nombre AS nombre_usuario
      FROM recibir_traspasos rt
      LEFT JOIN usuarios u ON rt.usuario_id = u.id
    `);
    return res.status(200).json(rows);
  } catch (err) {
    console.error('Error al obtener recibidos:', err);
    return res.status(500).json({ message: 'Error en el servidor' });
  }
}

module.exports = { insertTraspasoRecibido, handleObtenerRecibidos };
 