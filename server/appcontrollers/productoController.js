const pool = require('../db'); // Importa la configuración de la base de datos

// Controlador para actualizar el producto en pedido_embarque
const actualizarProducto = async (req, res) => {
  const { idPedi, scannedPz, scannedPq, scannedInner, scannedMaster, caja } = req.body;

  const query = `
    UPDATE pedidos_embarques
    SET 
      v_pz = ?, 
      v_pq = ?, 
      v_inner = ?, 
      v_master = ?, 
      caja = ?, 
      inicio_embarque = IF(inicio_embarque IS NULL, NOW(), inicio_embarque)
    WHERE id_pedi = ?;
  `;

  let connection;
  try {
    connection = await pool.getConnection(); // Obtiene una conexión del pool

    // Ejecuta la actualización del producto en pedido_embarque
    const [result] = await connection.query(query, [
      scannedPz,
      scannedPq,
      scannedInner,
      scannedMaster,
      caja,
      idPedi,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'No se encontró el producto para actualizar' });
    }

    res.status(200).json({ message: 'Producto actualizado correctamente' });
  } catch (err) {
    console.error('Error al actualizar el producto:', err);
    res.status(500).json({ error: 'Error al actualizar el producto' });
  } finally {
    if (connection) connection.release();
  }
};

module.exports = { actualizarProducto };
