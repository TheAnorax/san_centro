const pool = require('../db'); // Importa la configuración de la base de datos

const actualizarEmbarque = async (req, res) => {
  const { pedido } = req.body;
  const estado = "F";

  const updatePedidoQuery = `
    UPDATE pedidos_embarques
    SET estado = ?, 
        fin_embarque = IF(fin_embarque IS NULL, NOW(), fin_embarque) 
    WHERE no_orden = ?;
  `;

  let connection;
  try {
    connection = await pool.getConnection(); // Obtiene una conexión del pool
    await connection.beginTransaction(); // Iniciar la transacción

    // ✅ Actualiza el estado del pedido en `pedido_embarque`
    const [updateResult] = await connection.query(updatePedidoQuery, [estado, pedido]);

    // 🔍 Verifica si realmente se actualizó algún registro
    if (updateResult.affectedRows === 0) {
      throw new Error(`No se encontró el pedido ${pedido} en pedido_embarque.`);
    }

    // ✅ Insertar en `pedido_finalizado`
    const [insertResult] = await connection.query(`
INSERT INTO pedido_finalizado (
  no_orden,
  tipo,
  codigo_pedido,
  clave,
  cantidad,
  cant_surtida,
  cant_no_enviada,
  um,
  _pz,
  _pq,
  _inner,
  _master,
  v_pz,
  v_pq,
  v_inner,
  v_master,
  ubi_bahia,
  estado,
  id_usuario,
  registro,
  inicio_surtido,
  fin_surtido,
  unido,
  id_usuario_paqueteria,
  id_usuario_surtido,
  registro_surtido,
  registro_embarque,
  inicio_embarque,
  fin_embarque,
  motivo,
  unificado,
  registro_fin,
  caja,
  fusion,
  tipo_caja,
  cajas
)
SELECT
  no_orden,
  tipo,
  codigo_pedido,
  clave,
  cantidad,
  cant_surtida,
  cant_no_enviada,
  um,
  _pz,
  _pq,
  _inner,
  _master,
  v_pz,
  v_pq,
  v_inner,
  v_master,
  ubi_bahia,
  estado,
  id_usuario,
  registro,
  inicio_surtido,
  fin_surtido,
  unido,
  id_usuario_paqueteria,
  id_usuario,
  registro_surtido,
  registro_embarque,
  inicio_embarque,
  fin_embarque,
  motivo,
  unificado,
  NOW(),         -- registro_fin
  caja,
  fusion,
  tipo_caja,
  cajas
FROM pedidos_embarques
WHERE estado = ?;

    `, [estado]);

    // 🔍 Si no se insertaron registros, no ejecutar el DELETE
    if (insertResult.affectedRows > 0) {
      await connection.query(`DELETE FROM pedidos_embarques WHERE estado = ?;`, [estado]);
    }

    await connection.commit(); // Confirmar la transacción

    res.status(200).json({ message: "✅ Estado de embarque actualizado correctamente" });

  } catch (error) {
    if (connection) await connection.rollback(); // Revertir cambios en caso de error
    console.error("❌ Error en la transacción:", error.message);
    res.status(500).json({ message: "❌ Error en la transacción", error: error.message });
  } finally {
    if (connection) connection.release(); // Liberar la conexión
  }
};

module.exports = { actualizarEmbarque };
