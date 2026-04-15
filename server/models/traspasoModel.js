const pool = require('../db');

async function insertTraspasoRecibido(datos) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

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
      datos.dia_envio ? new Date(datos.dia_envio) : null,
      datos.almacen_envio || null,
      datos.tiempo_llegada_estimado ? new Date(datos.tiempo_llegada_estimado) : null,
      datos.estado || 'F',
      datos.ubicacion || null,
      datos.usuario_id || null
    ];

    const [result] = await connection.query(sql, params);

    const sqlCheck = `
      SELECT id_ubicaccion, cant_stock_real, oc
      FROM inventario
      WHERE ubicacion = ? AND codigo_producto = ?
      LIMIT 1
    `;

    const [rows] = await connection.query(sqlCheck, [
      datos.ubicacion,
      datos.Codigo
    ]);

    if (rows.length > 0) {
      const actual = rows[0];

      const nuevaCantidad =
        Number(actual.cant_stock_real || 0) + Number(datos.Cantidad || 0);

      let nuevaOC = actual.oc || '';
      if (datos.oc) {
        const ocs = new Set(nuevaOC.split(',').map(o => o.trim()));
        ocs.add(datos.oc);
        nuevaOC = Array.from(ocs).join(',');
      }

      let nuevoLote = actual.lote_serie || '';
      if (datos.lote_serie) {
        const lotes = new Set(nuevoLote.split(',').map(l => l.trim()));
        lotes.add(datos.lote_serie);
        nuevoLote = Array.from(lotes).join(',');
      }

      await connection.query(
        'UPDATE inventario SET cant_stock_real = ?, oc = ? WHERE id_ubicaccion = ?',
        [nuevaCantidad, nuevaOC, actual.id_ubicaccion]
      );

      await connection.commit();
      return {
        recibir_traspasos_id: result.insertId,
        inventario_id: actual.id_ubicaccion,
        accion: 'update'
      };

    } else {
      const [invResult] = await connection.query(`
        INSERT INTO inventario
          (ubicacion, codigo_producto, almacen, cant_stock_real, lote_serie, oc, ingreso)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        datos.ubicacion,
        datos.Codigo,
        datos.almacen_envio || null,
        datos.Cantidad,
        datos.lote_serie || null,
        datos.oc || null,
        new Date()
      ]);

      await connection.commit();
      return {
        recibir_traspasos_id: result.insertId,
        inventario_id: invResult.insertId,
        accion: 'insert'
      };
    }

  } catch (error) {
    await connection.rollback();
    console.error('❌ Error en insertTraspasoRecibido:', error);
    throw error;
  } finally {
    connection.release();
  }
}


async function handleObtenerRecibidos(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT 
        rt.No_Orden, rt.tipo_orden,
        rt.Codigo, rt.Cantidad, rt.estado, rt.ubicacion,
        rt.usuario_id, u.nombre AS nombre_usuario,
        rt.created_at
      FROM recibir_traspasos rt
      LEFT JOIN usuarios u ON rt.usuario_id = u.id
    `);
    return res.status(200).json(rows);
  } catch (err) {
    console.error('Error al obtener recibidos:', err);
    return res.status(500).json({ message: 'Error en el servidor' });
  }
}


async function getInventarioPorCodigo(codigo) {
  const [rows] = await pool.query(`
    SELECT 
      i.*,
      p.descripcion,
      p.um,
      p.barcode_pz,
      p.barcode_master,
      p.barcode_inner,
      p.img_pz,
      p._pz,
      p._master,
      p._inner
    FROM inventario i
    LEFT JOIN productos p ON p.codigo = i.codigo_producto
    WHERE 
      i.codigo_producto = ?
      OR p.barcode_pz = ?
      OR p.barcode_master = ?
      OR p.barcode_inner = ?
    LIMIT 1`,
    [codigo, codigo, codigo, codigo]
  );

  return rows.length > 0 ? rows[0] : null;
}


// ✅ Una sola función — actualiza productos + inventario + historial
async function updateProductoCompleto(codigo, datos, modificadoPor) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1️⃣ Obtener valores actuales de productos
    const [actualProducto] = await connection.query(
      'SELECT _pz, _inner, _master, barcode_pz, barcode_inner, barcode_master, um FROM productos WHERE codigo = ?',
      [codigo]
    );

    if (actualProducto.length === 0) throw new Error('Producto no encontrado');

    // 2️⃣ Obtener valores actuales de inventario
    const [actualInv] = await connection.query(
      'SELECT ubicacion, cant_stock_real FROM inventario WHERE codigo_producto = ? LIMIT 1',
      [codigo]
    );

    if (actualInv.length === 0) throw new Error('Inventario no encontrado');

    const prodActual = actualProducto[0];
    const invActual = actualInv[0];

    // 3️⃣ Normalizar um a mayúsculas
    const umMayusculas = datos.um?.toString().toUpperCase() ?? null;

    // 4️⃣ Actualizar tabla productos
    await connection.query(`
      UPDATE productos 
      SET _pz = ?, _inner = ?, _master = ?,
          barcode_pz = ?, barcode_inner = ?, barcode_master = ?,
          um = ?
      WHERE codigo = ?
    `, [
      datos._pz, datos._inner, datos._master,
      datos.barcode_pz, datos.barcode_inner, datos.barcode_master,
      umMayusculas,
      codigo
    ]);

    // 5️⃣ Actualizar tabla inventario
    await connection.query(
      'UPDATE inventario SET ubicacion = ?, cant_stock_real = ? WHERE codigo_producto = ?',
      [datos.ubicacion, datos.cant_stock_real, codigo]
    );

    // 6️⃣ Historial — productos
    const camposProducto = [
      '_pz', '_inner', '_master',
      'barcode_pz', 'barcode_inner', 'barcode_master',
      'um'  // ✅
    ];

    for (const campo of camposProducto) {
      const anterior = prodActual[campo]?.toString() ?? '';
      const nuevo = campo === 'um'
        ? umMayusculas ?? ''
        : datos[campo]?.toString() ?? '';

      if (anterior !== nuevo) {
        await connection.query('INSERT INTO productos_historial SET ?', [{
          producto_id: codigo,
          codigo,
          campo,
          valor_anterior: anterior,
          valor_nuevo: nuevo,
          modificado_por: modificadoPor,
        }]);
      }
    }

    // 7️⃣ Historial — inventario
    const camposInventario = [
      { campo: 'ubicacion', anterior: invActual.ubicacion, nuevo: datos.ubicacion },
      { campo: 'cant_stock_real', anterior: invActual.cant_stock_real, nuevo: datos.cant_stock_real },
    ];

    for (const c of camposInventario) {
      if (c.anterior?.toString() !== c.nuevo?.toString()) {
        await connection.query('INSERT INTO productos_historial SET ?', [{
          producto_id: codigo,
          codigo,
          campo: c.campo,
          valor_anterior: c.anterior?.toString() ?? '',
          valor_nuevo: c.nuevo?.toString() ?? '',
          modificado_por: modificadoPor,
        }]);
      }
    }

    await connection.commit();
    return { ok: true };

  } catch (err) {
    await connection.rollback();
    console.error('❌ Error en updateProductoCompleto:', err);
    throw err;
  } finally {
    connection.release();
  }
}

async function getProductosPorUbicacion(ubicacion) {
  const [rows] = await pool.query(`
    SELECT 
      i.ubicacion,
      i.codigo_producto,
      i.cant_stock_real,
      p.descripcion,
      p.clave,
      p.um,
      p.barcode_pz,
      p.barcode_inner,
      p.barcode_master,
      p._pz,
      p._inner,
      p._master
    FROM inventario i
    LEFT JOIN productos p ON p.codigo = i.codigo_producto
    WHERE i.ubicacion = ?
    ORDER BY i.codigo_producto ASC
  `, [ubicacion]);

  return rows;
}


module.exports = {
  insertTraspasoRecibido,
  handleObtenerRecibidos,
  getInventarioPorCodigo,
  updateProductoCompleto,
  getProductosPorUbicacion
};