const pool = require('../db');

const actualizarEstadoPedido = async (req, res) => {
  console.log("📦 Request recibido:", req.body);
  const { pedido } = req.body;
  const pedidoId = pedido;

  const nuevoEstado = "B";

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 🔍 Verifica datos actuales para logging
    const [debugRow] = await connection.query(`
      SELECT id_pedi, cantidad, cant_surtida, cant_no_enviada, estado 
      FROM pedidos_surtiendo 
      WHERE no_orden = ?
    `, [pedidoId]);

    console.log("🧪 Datos actuales en DB:", debugRow);

    // ✅ Actualiza todos los productos del pedido que estén completamente surtidos
    const updateQuery = `
      UPDATE pedidos_surtiendo
      SET estado = ?, fin_surtido = NOW()
      WHERE no_orden = ?
        AND (cant_surtida + IFNULL(cant_no_enviada, 0) = cantidad)
    `;

    const [updateResult] = await connection.query(updateQuery, [nuevoEstado, pedidoId]);
    console.log("🟡 Resultado de UPDATE:", updateResult);

    if (updateResult.affectedRows > 0) {
      const totalQuery = "SELECT COUNT(*) AS total FROM pedidos_surtiendo WHERE no_orden = ?";
      const [totalResults] = await connection.query(totalQuery, [pedidoId]);
      const totalProductos = totalResults[0].total;

      const countBQuery = "SELECT COUNT(*) AS count FROM pedidos_surtiendo WHERE no_orden = ? AND estado = ?";
      const [countBResults] = await connection.query(countBQuery, [pedidoId, nuevoEstado]);
      const countB = countBResults[0].count;

      console.log(`✅ Productos finalizados: ${countB} / ${totalProductos}`);

      if (countB === totalProductos) {
        const queryBahia = "UPDATE bahias SET estado = 2 WHERE id_pdi = ?";
        await connection.query(queryBahia, [pedidoId]);
        console.log("📦 Bahia actualizada a estado 2");
      }

      await connection.commit();
      return res.json({ message: "Estado del producto actualizado exitosamente" });
    } else {
      await connection.rollback();
      return res.status(400).json({
        message: "No se cumplieron las condiciones para actualizar el estado del producto",
        condiciones: "(cant_surtida + cant_no_enviada = cantidad)",
        datos_actuales: debugRow
      });
    }

  } catch (error) {
    if (connection) await connection.rollback();
    console.error("❌ Error en la transacción:", error);
    res.status(500).send("Error en la transacción");
  } finally {
    if (connection) connection.release();
  }
};

module.exports = { actualizarEstadoPedido };
