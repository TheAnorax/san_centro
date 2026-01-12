// models/bahiaModel.js
const pool = require('../db'); // Asegúrate que sea tu conexión MySQL

const BahiaModel = {
    // Obtener todas las bahías
    getAll: async () => {
        const [rows] = await pool.query("SELECT * FROM bahias ORDER BY bahia");
        return rows;
    },

    // Liberar bahía por ID (ej: 309)
    liberarPorId: async (id_bahia) => {
        await pool.query(
            "UPDATE bahias SET estado = NULL, id_pdi = NULL, ingreso = NULL WHERE id_bahia = ?",
            [id_bahia]
        );
    },

    // Liberar bahía por nombre (ej: 'A-01')
    liberar: async (bahiaNombre) => {
        await pool.query(
            "UPDATE bahias SET estado = NULL, id_pdi = NULL, ingreso = NULL WHERE bahia = ?",
            [bahiaNombre]
        );
    },
};

module.exports = BahiaModel; 
