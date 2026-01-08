const pool = require('../db');


const obtenerInventario = async () => {
    const sql = `
    SELECT
      i.ubicacion,
      i.codigo_producto,
      i.almacen,
      i.cant_stock_real,
      i.ingreso,
      p.descripcion                           AS descripcion,
      i.oc,
      i.lote_serie
    FROM inventario AS i
    LEFT JOIN productos AS p
      ON p.codigo = CAST(i.codigo_producto AS UNSIGNED)  -- normaliza tipo
    ORDER BY i.ingreso DESC
  `;

    const [rows] = await pool.query(sql);
    return rows;
};

module.exports = { obtenerInventario };