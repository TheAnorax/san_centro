const pool = require('../db');

const actualizarProducto = async (req, res) => {
  const { idPedi, scannedPz, scannedPq, scannedInner, scannedMaster, caja, tipoCaja } = req.body;
  console.log("📦 Entrada a actualizarProducto:", req.body);

  let connection;
  try {
    connection = await pool.getConnection();

    const [rows] = await connection.query(
      'SELECT cajas FROM pedidos_embarques WHERE id_pedi = ?',
      [idPedi]
    );

    if (rows.length === 0) {
      console.log('⚠️ No se encontró producto para id_pedi:', idPedi);
      return res.status(404).json({ error: 'No se encontró el producto para actualizar' });
    }

    let cajasActual = rows[0].cajas || '';
    const cajasArray = cajasActual.split(',').map(c => c.trim()).filter(Boolean);
    const yaExiste = cajasArray.includes(caja.toString());

    const nuevaCajas = yaExiste
      ? cajasActual
      : cajasActual
        ? `${cajasActual},${caja}`
        : caja.toString();

    console.log(`📦 Caja actual: "${cajasActual}"`);
    console.log(`🆕 Caja nueva: "${nuevaCajas}"`);

    const tipoCajaTexto = tipoCaja?.toUpperCase() || null;

    const updateQuery = `
      UPDATE pedidos_embarques
      SET 
        v_pz = ?, 
        v_pq = ?, 
        v_inner = ?, 
        v_master = ?, 
        caja = ?, 
        cajas = ?,
        tipo_caja = ?,
        inicio_embarque = IF(inicio_embarque IS NULL, NOW(), inicio_embarque)
      WHERE id_pedi = ?;
    `;

    const [result] = await connection.query(updateQuery, [
      scannedPz,
      scannedPq,
      scannedInner,
      scannedMaster,
      caja,
      nuevaCajas,
      tipoCajaTexto,
      idPedi
    ]);

    if (result.affectedRows === 0) {
      console.log("⚠️ No se actualizó ningún registro.");
      return res.status(404).json({ error: 'No se actualizó ningún registro' });
    }

    console.log("✅ Producto actualizado correctamente en DB");
    res.status(200).json({ message: 'Producto actualizado correctamente' });

  } catch (err) {
    console.error('❌ Error en actualizarProducto:', err);
    res.status(500).json({ error: 'Error al actualizar el producto' });
  } finally {
    if (connection) {
      connection.release();
      console.log("🔄 Conexión liberada");
    }
  }
};

module.exports = { actualizarProducto };
