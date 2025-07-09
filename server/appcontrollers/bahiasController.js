// controllers/bahiasController.js
const pool = require('../db');

// Obtener bahías agrupadas
const getBahias = async (req, res) => {
    try {
        const [rows] = await pool.query(`SELECT * FROM bahias`);

        // Filtrar bahías y agruparlas
        const groupedBahias = rows.reduce((acc, bahia) => {
            if (!bahia.bahia.includes('Pasillo')) {
                const initial = bahia.bahia.charAt(0).toUpperCase();
                acc[initial] = acc[initial] || [];
                acc[initial].push(bahia);
            }
            return acc;
        }, {});

        res.json(groupedBahias);
    } catch (error) {
        console.error('Error al obtener las bahías:', error);
        res.status(500).json({ message: 'Error al obtener las bahías', error: error.message });
    }
};

// Liberar una bahía
const liberarBahia = async (req, res) => {
    const { id_bahia } = req.params;
    try {
        const [result] = await pool.query(
            'UPDATE bahias SET estado = NULL, id_pdi = NULL, ingreso = NULL WHERE id_bahia = ?',
            [id_bahia]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Bahía no encontrada' });
        }
        res.json({ message: 'Bahía liberada correctamente' });
    } catch (error) {
        console.error('Error al liberar la bahía:', error);
        res.status(500).json({ message: 'Error al liberar la bahía', error: error.message });
    }
};

module.exports = { getBahias, liberarBahia };
