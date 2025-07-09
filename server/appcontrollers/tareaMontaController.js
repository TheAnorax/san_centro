// controllers/tareaMontaController.js
const pool = require('../db'); // Importa la configuración de la base de datos

// Controlador para actualizar la tarea en tarea_monta
const actualizarTareaMonta = async (req, res) => {
  console.log(req.body); // Para verificar el dato recibido
  const { idMon } = req.body;
  const estado = "S"; // Nuevo estado de la tarea

  // Queries SQL
  const updatePedidoQuery = "UPDATE tarea_monta SET estado = ? WHERE id_mon = ?";
  const selectUbicacionesQuery = "SELECT id_ubi_ini, id_ubi_fin FROM tarea_monta WHERE id_mon = ?";
  const selectUbiAlmaQuery = "SELECT code_prod, cant_stock, lote, almacen FROM ubi_alma WHERE id_ubi = ?";
  const updateUbicacionesQuery = "UPDATE ubicaciones SET code_prod = ?, cant_stock = ?, lote = ?, almacen = ? WHERE id_ubi = ?";
  const clearUbiAlmaQuery = "UPDATE ubi_alma SET code_prod = NULL, cant_stock = NULL, lote = NULL, almacen = NULL WHERE id_ubi = ?";

  let connection;
  try {
    connection = await pool.getConnection(); // Obtiene una conexión del pool
    await connection.beginTransaction();

    // 1. Actualizar el estado de la tarea en `tarea_monta`
    await connection.query(updatePedidoQuery, [estado, idMon]);

    // 2. Obtener id_ubi_ini y id_ubi_fin para el idMon dado
    const [ubicacionesResults] = await connection.query(selectUbicacionesQuery, [idMon]);
    const { id_ubi_ini, id_ubi_fin } = ubicacionesResults[0];

    // 3. Obtener datos de `code_prod`, `cant_stock`, `lote`, `almacen` en `ubi_alma` para id_ubi_ini
    const [ubiAlmaResults] = await connection.query(selectUbiAlmaQuery, [id_ubi_ini]);
    const { code_prod, cant_stock, lote, almacen } = ubiAlmaResults[0];

    // 4. Actualizar los datos obtenidos en la tabla `ubicaciones` donde `id_ubi` es `id_ubi_fin`
    await connection.query(updateUbicacionesQuery, [code_prod, cant_stock, lote, almacen, id_ubi_fin]);

    // 5. Poner en NULL los campos de `ubi_alma` para `id_ubi_ini`, excepto `ubi`
    await connection.query(clearUbiAlmaQuery, [id_ubi_ini]);

    await connection.commit();
    res.status(200).json({ message: "Tarea actualizada correctamente y ubi_alma procesada" });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error en la transacción:", error);
    res.status(500).send("Error en la transacción");
  } finally {
    if (connection) connection.release();
  }
};

module.exports = { actualizarTareaMonta };
