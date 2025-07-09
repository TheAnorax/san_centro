const pool = require('../db'); // Importa la configuración de la base de datos

// Controlador para actualizar los datos del recibo
const actualizarRecibo = async (req, res) => {
  const { codigo, cantidad, idRecibo, ubicacion, id_usario } = req.body;
  console.log("Datos recibidos para actualizar el recibo:", req.body);

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Consulta para obtener los datos de recibo_compras
    const [reciboCompra] = await connection.query(
      "SELECT pedimento, almacen7050, almacen7066, cantidad7050, cantidad7066 FROM recibo_compras WHERE id_recibo = ?",
      [idRecibo]
    );
    console.log("Datos obtenidos de recibo_compras:", reciboCompra);

    if (reciboCompra.length === 0) {
      connection.release();
      return res.status(404).json({ error: "No se encontró el recibo en recibo_compras" });
    }

    const { pedimento } = reciboCompra[0];

    // Consulta la ubicación para verificar si está ocupada
    const [ubicacionExistente] = await connection.query(
      "SELECT cant_stock, code_prod FROM ubi_alma WHERE ubi = ?",
      [ubicacion]
    );
    console.log("Datos obtenidos de ubi_alma para la ubicación:", ubicacionExistente);

    if (ubicacionExistente.length > 0) {
      if (ubicacionExistente[0].cant_stock && ubicacionExistente[0].code_prod) {
        // La ubicación está ocupada, limpia los datos existentes
        console.log("Ubicación ocupada, procediendo a limpiarla...");

        const limpiarUbicacionQuery = `
          UPDATE ubi_alma 
          SET cant_stock = NULL, 
              lote = NULL, 
              code_prod = NULL, 
              codigo_ingreso = NULL, 
              ingreso = NULL 
          WHERE ubi = ?
        `;
        await connection.query(limpiarUbicacionQuery, [ubicacion]);
        console.log("Ubicación limpiada correctamente.");
      }
    }

    // Inserta los nuevos datos en la ubicación
    const updateUbicacionQuery = `
      UPDATE ubi_alma 
      SET cant_stock = ?, 
          lote = ?, 
          code_prod = ?,
          codigo_ingreso = ?, 
          ingreso = NOW()
      WHERE ubi = ?
    `;
    await connection.query(updateUbicacionQuery, [
      cantidad,
      pedimento,
      codigo,
      id_usario,
      ubicacion,
    ]);
    console.log("Nueva información ingresada en ubi_alma:", {
      cantidad,
      pedimento,
      codigo,
      id_usario,
      ubicacion,
    });

    // Actualiza la cantidad_ubicada en la tabla recibo_cedis
    const updateReciboQuery = `
      UPDATE recibo_cedis 
      SET cantidad_ubicada = cantidad_ubicada - ? 
      WHERE id_recibo_compras = ? 
    `;
    await connection.query(updateReciboQuery, [cantidad, idRecibo]);
    console.log("Cantidad actualizada en recibo_cedis:", { cantidad, idRecibo });

    await connection.commit();
    console.log("Transacción completada con éxito.");
    res.status(200).json({ message: "Datos actualizados correctamente" });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error en la transacción:", error.message);
    res.status(500).json({ error: "Ocurrió un error al actualizar los datos: " + error.message });
  } finally {
    if (connection) connection.release();
  }
};

module.exports = { actualizarRecibo };
