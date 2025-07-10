const pool = require('../db');

const actualizarCantidadNoSurtida = async (req, res) => {
  const { pedido, producto, codigo_ped, nuevaCantidadSurtida, motivo } = req.body;
  const estado = "C";

  const selectQuery = `
    SELECT cantidad, cant_surtida, codigo_pedido, no_orden
    FROM pedidos_surtiendo 
    WHERE codigo_pedido = ? AND no_orden = ?
  `;

  const updateQuery = `
    UPDATE pedidos_surtiendo
    SET 
      cant_no_enviada = ?, 
      motivo = ?, 
      inicio_surtido = IF(inicio_surtido IS NULL, NOW(), inicio_surtido), 
      fin_surtido = IF(fin_surtido IS NULL, NOW(), fin_surtido), 
      estado = ?
    WHERE codigo_pedido = ? AND no_orden = ?
  `;

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    console.log("📥 Body recibido:", req.body);

    // ⚠️ CORRECCIÓN AQUÍ
    const [results] = await connection.query(selectQuery, [codigo_ped, pedido]);

    if (results.length === 0) {
      console.warn(`⚠️ No se encontró producto con codigo_pedido ${codigo_ped} y no_orden ${pedido}`);
      return res.status(404).json({ message: "Producto o pedido no encontrado" });
    }

    const { cantidad, cant_surtida, codigo_pedido, no_orden } = results[0];
    const cant_no_enviada = cantidad - cant_surtida;
    const motivoFinal = motivo?.trim() || 'SIN MOTIVO';

    const [updateResult] = await connection.query(updateQuery, [
      cant_no_enviada,
      motivoFinal,
      estado,
      codigo_pedido,
      no_orden,
    ]);

    if (updateResult.affectedRows === 0) {
      throw new Error(`❌ No se actualizó ninguna fila. Verifica si codigo_pedido ${codigo_pedido} y no_orden ${no_orden} existen`);
    }

    await connection.commit();

    console.log(`✅ Producto con codigo_pedido ${codigo_pedido} y no_orden ${no_orden} actualizado como no surtido`);

    res.status(200).json({
      message: "Cantidad no surtida actualizada correctamente",
      cant_no_enviada
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error("❌ Error en la transacción:", error.message);
    res.status(500).json({ message: "Error en la transacción", error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

module.exports = { actualizarCantidadNoSurtida };
