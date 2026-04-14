const planModel = require('../models/planModel');

const insertarRutasPlan = async (req, res) => {
    const { rutas } = req.body;
    if (!rutas || rutas.length === 0) {
        return res.status(400).json({ message: 'No se enviaron rutas.' });
    }
    try {
        const { insertados, duplicados } = await planModel.insertarRutas(rutas);
        res.status(200).json({
            message: `✅ ${insertados} rutas insertadas (${duplicados} duplicados ignorados).`,
            insertados,
            duplicados
        });
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({ message: 'Error al insertar rutas.' });
    }
};

const obtenerRutasPlan = async (req, res) => {
    try {
        const rutas = await planModel.obtenerRutas();
        res.status(200).json(rutas);
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({ message: 'Error al obtener rutas.' });
    }
};

module.exports = { insertarRutasPlan, obtenerRutasPlan };