// controllers/pedidosNoSurtidaController.js
const pool = require('../db'); // Configuración de la base de datos

const actualizarCantidadNoSurtida = async (req, res) => {
  console.log('Faltante', req.body);
  const { pedido, producto, motivo } = req.body;
  const estado = "B";

  const selectQuery = "SELECT cantidad, cant_surti FROM pedido_surtido WHERE pedido = ? AND id_pedi = ?";
  const updateQuery = `
    UPDATE pedido_surtido 
    SET cant_no_env = ?, motivo = ?, 
        inicio_surtido = IF(inicio_surtido IS NULL, NOW(), inicio_surtido), 
        fin_surtido = IF(fin_surtido IS NULL, NOW(), fin_surtido), 
        estado = ? 
    WHERE pedido = ? AND id_pedi = ?
  `;

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [results] = await connection.query(selectQuery, [pedido, producto]);
    if (results.length === 0) {
      res.status(404).send("Pedido no encontrado");
      return;
    }

    const { cantidad, cant_surti } = results[0];
    const cant_no_env = cantidad - cant_surti;

    await connection.query(updateQuery, [cant_no_env, motivo, estado, pedido, producto]);

    await connection.commit();
    res.status(200).json({ message: "Cantidad no surtida actualizada correctamente", cant_no_env });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error en la transacción:", error);
    res.status(500).send("Error en la transacción");
  } finally {
    if (connection) connection.release();
  }
};

module.exports = { actualizarCantidadNoSurtida };
