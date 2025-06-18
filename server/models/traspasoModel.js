const pool = require('../db');

async function insertTraspasoRecibido(datos) {
  const sql = `
    INSERT INTO recibir_traspasos
      (Codigo, Descripcion, Clave, um, _pz, Cantidad,
       dia_envio, almacen_envio, tiempo_llegada_estimado,
       estado, ubicacion)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    datos.Codigo,
    datos.Descripcion,
    datos.Clave || null,
    datos.um || null,
    datos._pz != null ? datos._pz : null,
    datos.Cantidad,
    new Date(datos.dia_envio),
    datos.almacen_envio || null,
    new Date(datos.tiempo_llegada_estimado),
    datos.estado,
    datos.ubicacion
  ];

  const [result] = await pool.query(sql, params);

  const sqlInv = `
    INSERT INTO inventario
      (ubicaccion, codigo_producto, lote, almacen, cant_stock_real, ingreso)
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
    const [rows] = await pool.query('SELECT Codigo, Cantidad, estado, ubicacion  FROM recibir_traspasos');
    return res.status(200).json(rows);
  } catch (err) {
    console.error('Error al obtener recibidos:', err);
    return res.status(500).json({ message: 'Error en el servidor' });
  }
}



module.exports = { insertTraspasoRecibido, handleObtenerRecibidos };