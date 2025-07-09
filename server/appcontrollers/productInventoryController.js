const pool = require('../db'); // Importa la configuración de la base de datos

// Controlador para obtener el inventario de un producto filtrado por `codigo_pz`
const obtenerInventarioProducto = async (req, res) => {
  const query = `
    SELECT 
      id_prod,
      codigo_pro,
      des,
      _pz,
      _inner,
      _master,
      _palet,
      code_pz,
      code_inner,
      code_master
    FROM productos
    WHERE code_pz = ?
  `;

  // Obtener el parámetro `codigo_pz` de la solicitud
  const { codigo_pz } = req.query;

  // Verificar si se proporcionó `codigo_pz`
  if (!codigo_pz) {
    return res.status(400).json({ error: 'El parámetro codigo_pz es requerido' });
  }

  let connection;
  try {
    connection = await pool.getConnection(); // Obtener la conexión del pool
    // Ejecutar la consulta usando `codigo_pz` como parámetro
    const [results] = await connection.query(query, [codigo_pz]);
    res.json(results);
  } catch (error) {
    console.error('Error al obtener los datos de productos:', error);
    res.status(500).json({ error: 'Error al obtener los datos de productos' });
  } finally {
    if (connection) connection.release();
  }
};

module.exports = { obtenerInventarioProducto };
