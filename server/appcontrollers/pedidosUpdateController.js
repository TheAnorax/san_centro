const pool = require('../db');

const actualizarCantidadSurtida = async (req, res) => {
  console.log("Request received:", req.body);

  const {
    pedido: no_orden,
    producto: id_pedi,
    codigo_ped,
    nuevaCantidadSurtida,
    cantumsurt: cant_des,
    um,
    usuarioS,
    origen
  } = req.body;

  const unidadesPorUM = {
    PZ: 1,
    ATADO: Math.max(cant_des, 1),
    BL: Math.max(cant_des, 1),
    CJ: Math.max(cant_des, 1),
    EM: Math.max(cant_des, 1),
    JG: Math.max(cant_des, 1),
    PQ: Math.max(cant_des, 1),
    INNER: Math.max(cant_des, 1),
    MASTER: Math.max(cant_des, 1),
    PQTE: Math.max(cant_des, 1),
  };


  // Si estás en modo online, cada escaneo representa 1 unidad de empaque (ej. 1 INNER = 50 piezas)
  const cant_surti_um = 1;
  const totalUnidades = nuevaCantidadSurtida * unidadesPorUM[um];


  const updateQueries = {
    PZ: "UPDATE pedidos_surtiendo SET _pz = _pz + ? WHERE no_orden = ? AND id_pedi = ?;",
    ATADO: "UPDATE pedidos_surtiendo SET _pz = _pz + ? WHERE no_orden = ? AND id_pedi = ?;",
    BL: "UPDATE pedidos_surtiendo SET _pz = _pz + ? WHERE no_orden = ? AND id_pedi = ?;",
    CJ: "UPDATE pedidos_surtiendo SET _pz = _pz + ? WHERE no_orden = ? AND id_pedi = ?;",
    EM: "UPDATE pedidos_surtiendo SET _pz = _pz + ? WHERE no_orden = ? AND id_pedi = ?;",
    JG: "UPDATE pedidos_surtiendo SET _pz = _pz + ? WHERE no_orden = ? AND id_pedi = ?;",
    PQ: "UPDATE pedidos_surtiendo SET _pz = _pz + ? WHERE no_orden = ? AND id_pedi = ?;",
    INNER: "UPDATE pedidos_surtiendo SET _inner = _inner + ? WHERE no_orden = ? AND id_pedi = ?;",
    MASTER: "UPDATE pedidos_surtiendo SET _master = _master + ? WHERE no_orden = ? AND id_pedi = ?;",
    PQTE: "UPDATE pedidos_surtiendo SET _pz = _pz + ? WHERE no_orden = ? AND id_pedi = ?;"
  };

  const updatePedidoQuery = `
    UPDATE pedidos_surtiendo
    SET cant_surtida = cant_surtida + ?,
        id_usuario = ?,
        inicio_surtido = IF(inicio_surtido IS NULL, NOW(), inicio_surtido)
    WHERE no_orden = ? AND id_pedi = ? AND cant_surtida < cantidad;
  `;

  const updateUmQuery = updateQueries[um];

  if (!updateUmQuery) {
    return res.status(400).json({ error: "Unidad de medida no soportada" });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [pedidoCheck] = await connection.query(
      "SELECT no_orden, id_pedi, cant_surtida, cantidad FROM pedidos_surtiendo WHERE no_orden = ? AND id_pedi = ?",
      [no_orden, id_pedi]
    );

    if (pedidoCheck.length === 0) {
      throw new Error(`El pedido ${no_orden} con producto ${id_pedi} no existe en la tabla pedidos_surtiendo.`);
    }

    const { cant_surtida, cantidad } = pedidoCheck[0];

    if (cant_surtida >= cantidad) {
      return res.status(200).json({ message: "El pedido ya ha sido surtido completamente. No se descuenta stock." });
    }

    const [resultPedido] = await connection.query(updatePedidoQuery, [totalUnidades, usuarioS, no_orden, id_pedi]);

    if (resultPedido.affectedRows > 0) {
      await connection.query(updateUmQuery, [cant_surti_um, no_orden, id_pedi]);
      await connection.commit();
    } else {
      throw new Error("No se pudo actualizar `cant_surtida`, verifica las condiciones.");
    }
  } catch (transactionError) {
    if (connection) await connection.rollback();
    console.error("Error en la transacción pedidos_surtiendo:", transactionError);
    return res.status(500).json({ error: transactionError.message });
  } finally {
    if (connection) connection.release();
  }

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [ubicaciones] = await connection.query(
      "SELECT id_ubicacion, cant_stock_real, ubicacion, almacen FROM inventario WHERE codigo_producto = ? ORDER BY cant_stock_real DESC LIMIT 1",
      [codigo_ped]
    );

    if (ubicaciones.length === 0) {
      throw new Error(`No se encontró el producto con código ${codigo_ped} en la tabla de inventario.`);
    }

    const { id_ubicaccion, cant_stock_real, ubicacion, almacen } = ubicaciones[0];

    if (cant_stock_real < totalUnidades) {
      throw new Error(`Stock insuficiente en la ubicación (${ubicacion}). Disponible: ${cant_stock_real}, Intentando descontar: ${totalUnidades}`);
    }

    const [updateStock] = await connection.query(
      "UPDATE inventario SET cant_stock_real = cant_stock_real - ? WHERE id_ubicacion = ?",
      [totalUnidades, id_ubicaccion]
    );

    if (updateStock.affectedRows === 0) {
      throw new Error("No se pudo actualizar el stock en la ubicación.");
    }


    await connection.commit();

    res.status(200).json({ message: "Cantidad surtida actualizada y stock descontado correctamente." });

  } catch (transactionError) {
    if (connection) await connection.rollback();
    console.error("Error en la transacción inventario:", transactionError);
    res.status(500).json({ error: transactionError.message });
  } finally {
    if (connection) connection.release();
  }
};

module.exports = { actualizarCantidadSurtida };
