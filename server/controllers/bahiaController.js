// controllers/bahiaController.js
const BahiaModel = require('../models/bahiaModel');

const BahiaController = {
    // GET todas las bahías
    getAll: async (req, res) => {
        try {
            const bahias = await BahiaModel.getAll();
            res.json(bahias);
        } catch (error) {
            res.status(500).json({ error: 'Error al obtener las bahías' });
        }
    },

    // PATCH liberar bahía
    liberar: async (req, res) => {
        const { id_bahia } = req.body;
        if (!id_bahia) {
            return res.status(400).json({ error: 'Falta id_bahia' });
        }
        try {
            await BahiaModel.liberar(id_bahia);
            res.json({ success: true, message: 'Bahía liberada' }); 
        } catch (error) {
            res.status(500).json({ error: 'Error al liberar la bahía' });
        }
    }
};

module.exports = BahiaController;
