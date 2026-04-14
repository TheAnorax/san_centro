// src/services/traspasoService.js (o donde tengas este helper)
const pool = require('../db');

async function insertTraspasoRecibido(datos) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // =========================
    // 1. INSERT EN recibir_traspasos (SIN lote)
    // =========================
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

    // =========================
    // 2. INVENTARIO: SUMAR SI EXISTE, INSERTAR SI NO
    // =========================

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
      // 👉 YA EXISTE → SUMAR + CONCATENAR OC
      const actual = rows[0];

      const nuevaCantidad =
        Number(actual.cant_stock_real || 0) + Number(datos.Cantidad || 0);

      let nuevaOC = actual.oc || '';

      if (datos.oc) {
        if (nuevaOC) {
          const ocs = new Set(
            nuevaOC.split(',').map(o => o.trim())
          );
          ocs.add(datos.oc);
          nuevaOC = Array.from(ocs).join(',');
        } else {
          nuevaOC = datos.oc;
        }
      }

      if (datos.lote_serie) {
        if (nuevoLote) {
          const lotes = new Set(
            nuevoLote.split(',').map(l => l.trim())
          );
          lotes.add(datos.lote_serie);
          nuevoLote = Array.from(lotes).join(',');
        } else {
          nuevoLote = datos.lote_serie;
        }
      }

      const sqlUpdate = `
        UPDATE inventario
        SET cant_stock_real = ?, oc = ?
        WHERE id_ubicaccion = ?
      `;

      await connection.query(sqlUpdate, [
        nuevaCantidad,
        nuevaOC,
        actual.id_ubicaccion
      ]);

      await connection.commit();

      return {
        recibir_traspasos_id: result.insertId,
        inventario_id: actual.id_ubicaccion,
        accion: 'update'
      };

    } else {
      // 👉 NO EXISTE → INSERT NORMAL
      const sqlInv = `
        INSERT INTO inventario
          (ubicacion, codigo_producto, almacen, cant_stock_real, lote_serie, oc, ingreso)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const paramsInv = [
        datos.ubicacion,
        datos.Codigo,
        datos.almacen_envio || null,
        datos.Cantidad,
        datos.lote_serie || null,
        datos.oc || null,
        new Date()
      ];

      const [invResult] = await connection.query(sqlInv, paramsInv);

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

  // Busca por código interno O por cualquier barcode
  const [rows] = await pool.query(
    `SELECT 
       i.*,
       p.descripcion,
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

module.exports = { insertTraspasoRecibido, handleObtenerRecibidos, getInventarioPorCodigo };
