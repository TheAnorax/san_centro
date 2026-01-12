const pool = require('../db');

/**
 * OBTENER TODOS
 */
const getAllActivos = async () => {
  const [rows] = await pool.query(`
        SELECT 
            id_tipo,
            nombre,
            categoria,
            descripcion,
            foto_referencia,
            cantidad,
            fecha_alta
        FROM cat_activos_tipos
        ORDER BY categoria, nombre
    `);
  return rows;
};

/**
 * INSERTAR
 */
const insertActivoTipo = async ({ nombre, categoria, descripcion, foto_referencia, cantidad }) => {
  const [result] = await pool.query(`
        INSERT INTO cat_activos_tipos
        (nombre, categoria, descripcion, foto_referencia, cantidad)
        VALUES (?, ?, ?, ?, ?)
    `, [
    nombre,
    categoria,
    descripcion || null,
    foto_referencia || null,
    cantidad || 0
  ]);

  return result.insertId;
};

/**
 * ACTUALIZAR
 */
const updateActivoTipo = async (id_tipo, data) => {
  const { nombre, categoria, descripcion, foto_referencia, cantidad } = data;

  const [result] = await pool.query(`
        UPDATE cat_activos_tipos SET
            nombre = ?,
            categoria = ?,
            descripcion = ?,
            foto_referencia = ?,
            cantidad = ?
        WHERE id_tipo = ?
    `, [
    nombre,
    categoria,
    descripcion || null,
    foto_referencia || null,
    cantidad || 0,
    id_tipo
  ]);

  return result.affectedRows;
};

/**
 * SUMAR
 */
const sumarCantidad = async (id_tipo, cantidad) => {
  const [result] = await pool.query(`
        UPDATE cat_activos_tipos
        SET cantidad = cantidad + ?
        WHERE id_tipo = ?
    `, [cantidad, id_tipo]);

  return result.affectedRows;
};

/**
 * RESTAR
 */
const restarCantidad = async (id_tipo, cantidad) => {
  const [result] = await pool.query(`
        UPDATE cat_activos_tipos
        SET cantidad = IF(cantidad - ? < 0, 0, cantidad - ?)
        WHERE id_tipo = ?
    `, [cantidad, cantidad, id_tipo]);

  return result.affectedRows;
};

/**
 * ELIMINAR
 */
const deleteActivoTipo = async (id_tipo) => {
  const [result] = await pool.query(`
        DELETE FROM cat_activos_tipos
        WHERE id_tipo = ?
    `, [id_tipo]);

  return result.affectedRows;
};

module.exports = {
  getAllActivos,
  insertActivoTipo,
  updateActivoTipo,
  sumarCantidad,
  restarCantidad,
  deleteActivoTipo
};
