const pool = require('../db');

const obtenerInventario = async ()=> {
    const [rows] = await pool.query(
         `SELECT * FROM inventario`
    );
    return rows;
};

module.exports = {obtenerInventario};