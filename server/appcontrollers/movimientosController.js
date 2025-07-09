const pool = require('../db'); // Importa la configuración de la base de datos

// Controlador para consultar información de una ubicación específica
const consultarUbicacionEspecifica = async (req, res) => {
  console.log("Consulta de ubicación específica:", req.body);
  const { ubicacion } = req.body;

  if (!ubicacion) {
    return res.status(400).json({ error: "La ubicación es requerida" });
  }

  const query = `
    SELECT 
      u.id_ubi,
      prod.des,    
      u.ubi, 
      u.code_prod,     
      u.cant_stock 
    FROM ubi_alma u
    LEFT JOIN productos prod ON u.code_prod = prod.codigo_pro 
    WHERE u.ubi = ?;
  `;

  let connection;
  try {
    connection = await pool.getConnection(); // Obtiene una conexión del pool

    // Ejecutar la consulta
    const [results] = await connection.query(query, [ubicacion]);

    if (results.length === 0) {
      return res.status(404).json({ error: "Ubicación no encontrada" });
    }

    // Estructura la respuesta con los datos de la ubicación
    const response = {
      id_ubicacion: results[0].id_ubi,
      descripcion: results[0].des,
      ubicacion: results[0].ubi,
      codigo_producto: results[0].code_prod,
      cantidad_stock: results[0].cant_stock 
    };

    res.status(200).json(response); // Retornar la respuesta estructurada
  } catch (error) {
    console.error("Error en la consulta de ubicación:", error);
    res.status(500).send("Error en la consulta de ubicación");
  } finally {
    if (connection) connection.release();
  }
};

// Nueva consulta: Consultar información de ubicaciones y productos
const consultarUbicacionesConProductos = async (req, res) => {
  console.log("Consulta de ubicaciones y productos:", req.body);

  const query = `
    SELECT 
      u.id_ubi,
      u.ubi,
      u.code_prod,
      p.des
    FROM ubicaciones u
    LEFT JOIN productos p ON u.code_prod = p.codigo_pro;
  `;

  let connection;
  try {
    connection = await pool.getConnection(); // Obtiene una conexión del pool

    // Ejecutar la consulta
    const [results] = await connection.query(query);

    if (results.length === 0) {
      return res.status(404).json({ error: "No se encontraron ubicaciones" });
    }

    // Estructura la respuesta con los datos obtenidos
    const response = results.map((row) => ({
      id_ubicacion: row.id_ubi,
      ubicacion: row.ubi,
      codigo_producto: row.code_prod,
      descripcion_producto: row.des,
    }));

    res.status(200).json(response); // Retornar la respuesta estructurada
  } catch (error) {
    console.error("Error en la consulta de ubicaciones y productos:", error);
    res.status(500).send("Error en la consulta de ubicaciones y productos");
  } finally {
    if (connection) connection.release();
  }
};

const actualizarCodigo = async (req, res) => {
  console.log("Actualización de código:", req.body);
  const { id_ubicacion, codigo_producto, id_usuario } = req.body;

  if (!id_ubicacion || !codigo_producto || !id_usuario) {
    return res.status(400).json({ error: "Faltan datos requeridos" });
  }

  const query = `
    UPDATE ubicaciones 
    SET code_prod = ? 
    WHERE id_ubi = ?;
  `;

  let connection;
  try {
    connection = await pool.getConnection();

    // Ejecutar la actualización
    const [result] = await connection.query(query, [codigo_producto, id_ubicacion]);

    if (result.affectedRows > 0) {
      res.status(200).json({ message: "Código actualizado correctamente" });
    } else {
      res.status(404).json({ error: "No se encontró la ubicación" });
    }
  } catch (error) {
    console.error("Error en la actualización del código:", error);
    res.status(500).json({ error: "Error en el servidor" });
  } finally {
    if (connection) connection.release();
  }
};


const pickDisponible = async (req, res) => {
  console.log("Consulta de ubicaciones disponibles (sin producto)");

  const query = `
    SELECT 
      id_ubi,
      ubi,
      code_prod 
    FROM ubicaciones 
    WHERE code_prod IS NULL OR code_prod = 0;
  `;

  let connection;
  try {
    connection = await pool.getConnection();

    const [results] = await connection.query(query);

    if (results.length === 0) {
      return res.status(404).json({ message: "No hay ubicaciones disponibles" });
    }

    const response = results.map(row => ({
      id_ubicacion: row.id_ubi,
      ubicacion: row.ubi,
      codigo_producto: row.code_prod,
    }));

    res.status(200).json(response);
  } catch (error) {
    console.error("Error al consultar ubicaciones disponibles:", error);
    res.status(500).json({ error: "Error en el servidor" });
  } finally {
    if (connection) connection.release();
  }
};


const AlmaDisponible = async (req, res) => {
  console.log("Consulta de ubicaciones disponibles (sin producto)");

  const query = `
    SELECT 
      id_ubi,
      ubi,
      code_prod 
    FROM ubi_alma 
    WHERE code_prod IS NULL OR code_prod = 0;
  `;

  let connection;
  try {
    connection = await pool.getConnection();

    const [results] = await connection.query(query);

    if (results.length === 0) {
      return res.status(404).json({ message: "No hay ubicaciones disponibles" });
    }

    const response = results.map(row => ({
      id_ubicacion: row.id_ubi,
      ubicacion: row.ubi,
      codigo_producto: row.code_prod,
    }));

    res.status(200).json(response);
  } catch (error) {
    console.error("Error al consultar ubicaciones disponibles:", error);
    res.status(500).json({ error: "Error en el servidor" });
  } finally {
    if (connection) connection.release();
  }
};
 

module.exports = { consultarUbicacionEspecifica, consultarUbicacionesConProductos, actualizarCodigo, pickDisponible, AlmaDisponible };
