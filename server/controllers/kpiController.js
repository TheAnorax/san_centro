const { obtenerKpiProductividad, obtenerKpiEmbarques } = require("../models/kpiModel");

const KpiProductividad = async (req, res) => {
    try {
        const fecha = req.query.fecha; // ← RECIBE FECHA DEL FRONT

        const data = await obtenerKpiProductividad(fecha); // ← SE LA PASA AL MODELO

        res.json(data);

    } catch (error) {
        console.error("❌ Error en getKpiProductividad:", error);
        res.status(500).json({ error: "Error obteniendo KPI" });
    }
};

const KpiEmbarques = async (req, res) => {
    try {
        const fecha = req.query.fecha;

        const data = await obtenerKpiEmbarques(fecha); // <-- (cuando lo actualicemos)

        res.json({ success: true, data });

    } catch (error) {
        console.error("❌ Error en KpiEmbarques:", error);
        res.status(500).json({
            success: false,
            message: "Error al obtener KPI de embarques",
            error: error.message,
        });
    }
};

module.exports = { KpiProductividad, KpiEmbarques };
