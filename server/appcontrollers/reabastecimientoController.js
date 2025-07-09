// controllers/reabastecimientoController.js
const pool = require('../db'); // Configuración de la base de datos

// Controlador para obtener datos de reabastecimiento
const obtenerReabastecimiento = async (req, res) => {
  const query = `
     SELECT 
    m.id_mon,
    m.id_codigo,
    m.ubi_ini,
    m.ubi_fin,
    m.id_ubi_ini,  
    m.id_ubi_fin,
    m.ingreso,
    p.des,
    u.cant_stock
FROM tarea_monta m
LEFT JOIN productos p ON m.id_codigo = p.codigo_pro
LEFT JOIN ubi_alma u ON u.code_prod = m.id_codigo 
WHERE m.estado = "R"
  AND m.ubi_fin IS NOT NULL
  AND m.ingreso >= CURDATE();  
  `;

  try {
    const [results] = await pool.query(query);
    res.json(results);
  } catch (error) {
    console.error('Error al obtener los datos de reabastecimiento:', error);
    res.status(500).json({ error: 'Error al obtener los datos de reabastecimiento' });
  }
};

module.exports = { obtenerReabastecimiento };
