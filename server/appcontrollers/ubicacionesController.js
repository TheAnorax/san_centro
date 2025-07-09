const pool = require('../db'); 

const consultaUbicaciones = async (req, res) => {
  const { codigo_pro } = req.body;

  console.log("Consulta alma con código:", codigo_pro);

  if (!codigo_pro) {
    return res.status(400).json({ error: "codigo_pro es requerido" });
  }

  const codigoStr = String(codigo_pro).trim();

  const query = `
    SELECT 
      prod.des,    
      u.ubi,         
      u.cant_stock 
    FROM ubi_alma u
    LEFT JOIN productos prod ON CAST(u.code_prod AS UNSIGNED) = CAST(prod.codigo_pro AS UNSIGNED)
    WHERE u.code_prod = ?;
  `;

  let connection;
  try {
    connection = await pool.getConnection();

    const [results] = await connection.query(query, [codigoStr]);

    if (results.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const response = {
      descripcion: results[0].des || "Sin descripción",
      ubicaciones: results.map(row => ({
        ubicacion: row.ubi,
        cantidad_stock: row.cant_stock
      }))
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error en la consulta:", error);
    res.status(500).send("Error en la consulta");
  } finally {
    if (connection) connection.release();
  }
};

module.exports = { consultaUbicaciones };
