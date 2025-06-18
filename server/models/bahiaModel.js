// models/bahiaModel.js
const pool = require('../db'); // Asegúrate que sea tu conexión MySQL

const BahiaModel = {
    // Obtener todas las bahías
    getAll: async () => {
        const [rows] = await pool.query("SELECT * FROM bahias ORDER BY bahia");
        return rows;
    },
    // Liberar bahía (setear en NULL los campos)
    liberar: async (id_bahia) => {
        await pool.query(
            "UPDATE bahias SET estado = NULL, id_pdi = NULL, ingreso = NULL WHERE id_bahia = ?",
            [id_bahia]
        );
    },
    // Si quieres agregar crear, actualizar, etc., aquí los metes.
};

module.exports = BahiaModel;
