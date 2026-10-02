const pool = require('../db');
const axios = require('axios');

// 🔗 Para que el número de pedido de solicitudes_inventario siga la MISMA
// numeración que ya usa CrossDock (app "sanced") en vez de tener su propio
// contador aparte empezando en 1.
const CROSS_DOCK_API = 'http://66.232.105.87:3007/api/cross-dock';

// ================================================
// 🆕 Sincronizar cant_stock_real contra la API de Santul (existencia física
// real del almacén). Se corre siempre ANTES de recalcular inv_opt, para que
// el faltante nunca se calcule con un stock desactualizado. Si la API de
// Santul falla, no se rompe el flujo: se registra el error y se sigue con
// los valores de cant_stock_real que ya había en la base.
// ================================================
const SANTUL_INVENTARIO_API = 'http://santul.verpedidos.com:9010/Santul/Inventarios';
const ALMACEN_SANTUL = process.env.ALMACEN || '7240';

const sincronizarStockRealSantul = async (almacen = ALMACEN_SANTUL) => {
  const resumen = { actualizados: 0, omitidos: 0, noEncontrados: [], error: null };

  let productos;
  try {
    const { data } = await axios({
      method: 'get',
      url: SANTUL_INVENTARIO_API,
      data: { Almacen: almacen },
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    });
    productos = Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('❌ No se pudo consultar la API de Santul para sincronizar stock real:', err.message);
    resumen.error = err.message;
    return resumen;
  }

  for (const producto of productos) {
    const codigo = producto.Clave;
    const existenciaFisica = producto.Existencia_Fisica;
    if (codigo === undefined || existenciaFisica === undefined) continue;

    try {
      const [rows] = await pool.query(
        `SELECT cant_stock_real FROM inventario WHERE codigo_producto = ? AND almacen = ? LIMIT 1`,
        [codigo, almacen]
      );

      if (rows.length === 0) {
        resumen.noEncontrados.push(codigo);
        continue;
      }

      const valorActual = Number(rows[0].cant_stock_real);
      const valorNuevo = Number(existenciaFisica);

      if (valorActual === valorNuevo) {
        resumen.omitidos++;
        continue;
      }

      await pool.query(
        `UPDATE inventario SET cant_stock_real = ? WHERE codigo_producto = ? AND almacen = ?`,
        [existenciaFisica, codigo, almacen]
      );
      resumen.actualizados++;
    } catch (err) {
      console.error(`❌ Error sincronizando stock real del código ${codigo}:`, err.message);
    }
  }

  console.log(
    `🔄 Stock real sincronizado con Santul: ${resumen.actualizados} actualizado(s), ${resumen.omitidos} sin cambio, ${resumen.noEncontrados.length} no encontrado(s)`
  );
  return resumen;
};

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


// ================================================
// Buscar productos por código (para la solicitud
// masiva desde Excel: sku + cantidad). No modifica
// nada, solo regresa qué códigos existen en inventario
// (con su descripción/ubicación/stock) y cuáles no.
// ================================================
const buscarProductosPorCodigos = async (codigos) => {
  const encontrados = [];
  const noEncontrados = [];

  for (const codigo of codigos) {
    const codigoLimpio = String(codigo).trim();
    if (!codigoLimpio) continue;

    const [[row]] = await pool.query(
      `SELECT i.id_ubicaccion, i.codigo_producto, i.ubicacion, i.cant_stock_real,
              p.descripcion, p._inner, p._master
       FROM inventario i
       LEFT JOIN productos p ON p.codigo = CAST(i.codigo_producto AS UNSIGNED)
       WHERE i.codigo_producto = ?
       LIMIT 1`,
      [codigoLimpio]
    );

    if (!row) {
      noEncontrados.push(codigoLimpio);
    } else {
      encontrados.push(row);
    }
  }

  return { encontrados, noEncontrados };
};

// ================================================
// Solicitudes de inventario (sku + cantidad + estado).
// Se crean en "No Pedido" apenas se manda el correo de
// solicitud (individual o masiva). El flujo de estados es:
//   No Pedido -> Modificacion -> Autorizada
// (el siguiente departamento revisa/ajusta en Modificacion,
// Dirección aprueba en Autorizada).
// ================================================
const crearSolicitudesInventario = async (items, solicitadoPor) => {
  // items: [{ sku, cantidad }]
  const filas = (items || [])
    .map((it) => [String(it.sku ?? '').trim(), Number(it.cantidad) || 0])
    .filter(([sku, cantidad]) => sku && cantidad > 0);

  if (filas.length === 0) return { insertados: 0 };

  // 🔢 Todos los renglones que se mandan juntos en una misma solicitud
  // (Excel o "Solicitar todos") comparten el mismo número de pedido —
  // así Planeación puede identificar el pedido completo, no solo SKUs sueltos.
  //
  // El número sigue la secuencia de CrossDock (app "sanced"): se toma el
  // mayor entre lo que ya llevamos aquí y el último "NO ORDEN" de CrossDock,
  // y se avanza desde ahí — así nunca queda un número repetido ni atrasado
  // respecto a la otra aplicación.
  const [[{ siguiente: siguienteLocal }]] = await pool.query(
    `SELECT COALESCE(MAX(numero_pedido), 0) + 1 AS siguiente FROM solicitudes_inventario`
  );

  let ultimoCrossDock = 0;
  try {
    const { data } = await axios.get(`${CROSS_DOCK_API}/ultimo-no-orden`, { timeout: 5000 });
    ultimoCrossDock = Number(data?.ultimo) || 0;
  } catch (err) {
    console.error('No se pudo consultar el último NO ORDEN de CrossDock (se usa el contador local):', err.message);
  }

  const numeroPedido = Math.max(siguienteLocal, ultimoCrossDock + 1);

  const values = filas.map(([sku, cantidad]) => [sku, cantidad, 'No Pedido', solicitadoPor || null, numeroPedido]);
  const [result] = await pool.query(
    `INSERT INTO solicitudes_inventario (sku, cantidad, estado, solicitado_por, numero_pedido) VALUES ?`,
    [values]
  );
  return { insertados: result.affectedRows, numeroPedido };
};

// Se trae descripcion/_inner/_master del catálogo para que Planeación pueda
// ver, por cada renglón, si la cantidad cierra a Inner o a Master (mismo
// criterio que la vista previa del Excel: ambos empaques > 1 para que aplique).
const SELECT_SOLICITUDES = `
  SELECT si.*, p.descripcion, p._inner, p._master
  FROM solicitudes_inventario si
  LEFT JOIN productos p ON p.codigo = CAST(si.sku AS UNSIGNED)
`;

const listarSolicitudesInventario = async (estado) => {
  if (estado) {
    const [rows] = await pool.query(
      `${SELECT_SOLICITUDES} WHERE si.estado = ? ORDER BY si.creado_en DESC`,
      [estado]
    );
    return rows;
  }
  const [rows] = await pool.query(`${SELECT_SOLICITUDES} ORDER BY si.creado_en DESC`);
  return rows;
};

// `modificadoPor` se guarda en CUALQUIER cambio de estado (incluido pasar a
// "Autorizada"), para saber quién fue la última persona que tocó la
// solicitud, sin importar en qué paso del flujo estaba.
const actualizarEstadoSolicitudInventario = async (id, estado, modificadoPor) => {
  const [result] = await pool.query(
    `UPDATE solicitudes_inventario SET estado = ?, modificado_por = ? WHERE id = ?`,
    [estado, modificadoPor || null, id]
  );
  return result;
};

// Planeación puede ajustar la cantidad de un renglón antes de mandarlo a
// autorizar (por ejemplo, para cerrarlo a Master/Inner).
const actualizarCantidadSolicitudInventario = async (id, cantidad, modificadoPor) => {
  const [result] = await pool.query(
    `UPDATE solicitudes_inventario SET cantidad = ?, modificado_por = ? WHERE id = ?`,
    [cantidad, modificadoPor || null, id]
  );
  return result;
};

// 📨 Planeación manda TODO el lote (el "pedido completo") a pedir
// autorización de un solo golpe, no uno por uno. No se marca "Autorizada"
// directamente: queda "Pendiente Autorizacion" hasta que Dirección responda
// desde los botones del correo (autorizar/cancelar). `token` agrupa todos los
// renglones que se mandaron juntos en ese correo.
const marcarLotePendienteAutorizacion = async (ids, token, modificadoPor) => {
  const listaIds = (ids || []).map((id) => Number(id)).filter((id) => Number.isInteger(id));
  if (listaIds.length === 0) return { affectedRows: 0 };

  const [result] = await pool.query(
    `UPDATE solicitudes_inventario SET estado = 'Pendiente Autorizacion', lote_token = ?, modificado_por = ? WHERE id IN (?)`,
    [token, modificadoPor || null, listaIds]
  );
  return result;
};

const obtenerLotePorToken = async (token) => {
  const [rows] = await pool.query(`${SELECT_SOLICITUDES} WHERE si.lote_token = ?`, [token]);
  return rows;
};

// Dirección da clic en "Autorizar" o "Cancelar" desde el correo (sin login) —
// solo resuelve lotes que sigan "Pendiente Autorizacion" (evita que un link
// viejo o clic doble vuelva a cambiar algo que ya se resolvió).
const resolverLotePorToken = async (token, nuevoEstado, modificadoPor) => {
  const [result] = await pool.query(
    `UPDATE solicitudes_inventario SET estado = ?, modificado_por = ? WHERE lote_token = ? AND estado = 'Pendiente Autorizacion'`,
    [nuevoEstado, modificadoPor || null, token]
  );
  return result;
};

// 🏭 Una vez que el pedido completo ya se registró a mano en CEDIS (otra
// aplicación), ya no hace falta subir ningún archivo allá — se marca TODO el
// pedido (todos los SKUs que comparten el mismo numero_pedido) de un jalón.
const marcarPedidoRegistradoEnCedis = async (numeroPedido, modificadoPor) => {
  const numero = Number(numeroPedido);
  if (!Number.isInteger(numero)) return { affectedRows: 0 };

  const [result] = await pool.query(
    `UPDATE solicitudes_inventario SET registrado_cedis = 1, modificado_por = ? WHERE numero_pedido = ?`,
    [modificadoPor || null, numero]
  );
  return result;
};

module.exports = {
  obtenerInventario,
  actualizarUbicacion,
  actualizarInvOpt,
  limpiarInvOpt,
  sincronizarStockRealSantul,
  actualizarLimites,
  cargaMasivaLimites,
  buscarProductosPorCodigos,
  crearSolicitudesInventario,
  listarSolicitudesInventario,
  actualizarEstadoSolicitudInventario,
  actualizarCantidadSolicitudInventario,
  marcarLotePendienteAutorizacion,
  obtenerLotePorToken,
  resolverLotePorToken,
  marcarPedidoRegistradoEnCedis
};