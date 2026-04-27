const pool = require('../db');

// ================================================
// GET Inventario
// ================================================
const obtenerInventario = async () => {
  const sql = `
    SELECT
      i.id_ubicaccion,
      i.ubicacion,
      i.codigo_producto,
      i.almacen,
      i.cant_stock_real,
      i.inv_min,
      i.inv_max,
      i.inv_opt,
      i.ingreso,
      p.descripcion AS descripcion,
      p._inner,
      p._master,
      i.oc,
      i.lote_serie
    FROM inventario AS i
    LEFT JOIN productos AS p
      ON p.codigo = CAST(i.codigo_producto AS UNSIGNED)
    ORDER BY i.ingreso DESC
  `;
  const [rows] = await pool.query(sql);
  return rows;
};

// ================================================
// PUT Actualizar Ubicación
// ================================================
const actualizarUbicacion = async (id, ubicacion) => {
  const [result] = await pool.query(
    `UPDATE inventario SET ubicacion = ? WHERE id_ubicaccion = ?`,
    [ubicacion, id]
  );
  return result;
};

// ================================================
// PUT Calcular inv_opt
// ================================================
const actualizarInvOpt = async () => {
  const [result] = await pool.query(`
    UPDATE inventario
    SET inv_opt = CAST(inv_max AS SIGNED) - CAST(cant_stock_real AS SIGNED)
    WHERE inv_min IS NOT NULL
      AND inv_max IS NOT NULL
      AND cant_stock_real IS NOT NULL
      AND CAST(cant_stock_real AS SIGNED) <= CAST(inv_min AS SIGNED)
  `);
  return result;
};

// ================================================
// PUT Limpiar inv_opt cuando ya no aplica
// ================================================
const limpiarInvOpt = async () => {
  const [result] = await pool.query(`
    UPDATE inventario
    SET inv_opt = NULL
    WHERE inv_min IS NOT NULL
      AND inv_max IS NOT NULL
      AND cant_stock_real IS NOT NULL
      AND CAST(cant_stock_real AS SIGNED) > CAST(inv_min AS SIGNED)
  `);
  return result;
};

// ================================================
// PUT Actualizar inv_min, inv_max y calcular inv_opt
// ================================================
const actualizarLimites = async (id, inv_min, inv_max) => {
  const [[row]] = await pool.query(
    `SELECT cant_stock_real FROM inventario WHERE id_ubicaccion = ?`,
    [id]
  );

  const stock = Number(row?.cant_stock_real ?? 0);
  const min = inv_min !== null ? Number(inv_min) : null;
  const max = inv_max !== null ? Number(inv_max) : null;

  let inv_opt = null;
  if (min !== null && max !== null && stock <= min) {
    inv_opt = max - stock;
  }

  const [result] = await pool.query(
    `UPDATE inventario SET inv_min = ?, inv_max = ?, inv_opt = ? WHERE id_ubicaccion = ?`,
    [inv_min, inv_max, inv_opt, id]
  );
  return result;
};

// ================================================
// POST Carga Masiva de inv_min e inv_max por código
// ================================================
const cargaMasivaLimites = async (productos) => {
  let actualizados = 0;
  let noEncontrados = [];

  for (const p of productos) {
    if (!p.codigo_producto) continue;

    // Buscar el registro por codigo_producto
    const [[row]] = await pool.query(
      `SELECT id_ubicaccion, cant_stock_real 
             FROM inventario 
             WHERE codigo_producto = ?`,
      [String(p.codigo_producto).trim()]
    );

    if (!row) {
      noEncontrados.push(p.codigo_producto);
      continue;
    }

    const stock = Number(row.cant_stock_real ?? 0);
    const min = p.inv_min !== null && p.inv_min !== "" ? Number(p.inv_min) : null;
    const max = p.inv_max !== null && p.inv_max !== "" ? Number(p.inv_max) : null;

    // Calcular inv_opt igual que en actualizarLimites
    let inv_opt = null;
    if (min !== null && max !== null && stock <= min) {
      inv_opt = max - stock;
    }

    await pool.query(
      `UPDATE inventario 
             SET inv_min = ?, inv_max = ?, inv_opt = ?
             WHERE id_ubicaccion = ?`,
      [min, max, inv_opt, row.id_ubicaccion]
    );

    actualizados++;
  }

  return { actualizados, noEncontrados };
};


module.exports = {
  obtenerInventario,
  actualizarUbicacion,
  actualizarInvOpt,
  limpiarInvOpt,
  actualizarLimites,
  cargaMasivaLimites
};