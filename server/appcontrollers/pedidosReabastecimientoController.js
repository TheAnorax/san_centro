// controllers/pedidosReabastecimientoController.js
const pool = require('../db'); // Configuración de la base de datos

const actualizarSurtidoFaltante = async (req, res) => {
  console.log("Reabasto:", req.body);
  const { codigo_pedF: codigo_ped } = req.body;

  const queryUbicaciones = `
    SELECT id_ubi, ubi 
    FROM ubicaciones 
    WHERE code_prod = ?
  `;

  const queryUbicacionesAlma = `
    SELECT m.id_ubi, m.ubi, m.code_prod, m.codigo_ubi, m.cant_stock, m.pasillo, m.ingreso, p.des 
    FROM ubi_alma m 
    LEFT JOIN productos p ON m.code_prod = p.codigo_pro 
    WHERE m.code_prod = ? 
    ORDER BY 
        CASE WHEN m.ingreso IS NULL THEN 1 ELSE 0 END, 
        m.ingreso ASC                                 
    LIMIT 1;
  `;

  const queryInsert = `
    INSERT INTO tarea_monta (id_codigo, id_ubi_ini, id_ubi_fin, ubi_ini, ubi_fin, estado, ingreso) 
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `;

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [resultsUbicaciones] = await connection.query(queryUbicaciones, [codigo_ped]);
    if (resultsUbicaciones.length === 0) {
      throw new Error("No se encontraron ubicaciones en la tabla ubicaciones");
    }
    const ubicacionFin = resultsUbicaciones[0].ubi;
    const idUbiFin = resultsUbicaciones[0].id_ubi;

    const [resultsUbicacionesAlma] = await connection.query(queryUbicacionesAlma, [codigo_ped]);
    let ubicacionIni, idUbiIni, estado;

    if (resultsUbicacionesAlma.length === 0) {
      ubicacionIni = "Sin ubicación";
      idUbiIni = null;
      estado = "I";
    } else {
      ubicacionIni = resultsUbicacionesAlma[0].ubi;
      idUbiIni = resultsUbicacionesAlma[0].id_ubi;
      estado = "R";
    }

    await connection.query(queryInsert, [
      codigo_ped, idUbiIni, idUbiFin, ubicacionIni, ubicacionFin, estado
    ]);

    await connection.commit();
    res.status(200).json({ message: "Tarea Asignada correctamente" });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error en la transacción:", error);
    res.status(500).send("Error en la transacción");
  } finally {
    if (connection) connection.release();
  }
};

module.exports = { actualizarSurtidoFaltante };
