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

// ✅ NUEVA - Obtener pedidos sanced por fecha
const obtenerPedidosPorFecha = async (req, res) => {
    const { fecha } = req.query;
    try {
        const pedidos = await planModel.obtenerPedidosPorFecha(fecha);
        res.status(200).json({ ok: true, data: pedidos });
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({ ok: false, message: 'Error al obtener pedidos.' });
    }
};

// ✅ NUEVA - Actualizar status y entrega
const actualizarStatusEntrega = async (req, res) => {
    const { no_orden, status, entrega, fecha_entrega, costos } = req.body; // 👈

    if (!no_orden) {
        return res.status(400).json({ ok: false, message: 'no_orden es requerido.' });
    }

    try {
        await planModel.actualizarStatusEntrega(no_orden, status, entrega, fecha_entrega, costos); // 👈
        res.status(200).json({ ok: true, message: 'Actualizado correctamente.' });
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({ ok: false, message: 'Error al actualizar.' });
    }
};

const registrarEntregaPaqueteria = async (req, res) => {
    const { no_orden, nombre_cliente, monto, cantidad, observaciones, fecha_entrega } = req.body;
    if (!no_orden) return res.status(400).json({ ok: false, message: 'no_orden requerido' });
    try {
        await planModel.registrarEntregaPaqueteria({ no_orden, nombre_cliente, monto, cantidad, observaciones, fecha_entrega });
        res.status(200).json({ ok: true, message: 'Entrega registrada correctamente.' });
    } catch (error) {
        res.status(500).json({ ok: false, message: 'Error al registrar entrega.' });
    }
};


const obtenerPedidosPorFactura = async (req, res) => {
    try {
        const { no_factura } = req.body;

        if (!no_factura) {
            return res.status(400).json({ success: false, message: 'no_factura es requerido' });
        }

        const datos = await planModel.obtenerPedidosPorFactura(no_factura);

        res.json({
            success: true,
            total_resultados: datos.length,
            datos,
        });
    } catch (error) {
        console.error('Error al obtener pedidos por factura:', error);
        res.status(500).json({ success: false, message: 'Error al obtener pedidos por factura' });
    }
};

const obtenerPedidosFinalizadosPorMes = async (req, res) => {
    try {
        const { anio, mes } = req.body;

        if (!anio || !mes) {
            return res.status(400).json({ success: false, message: 'anio y mes son requeridos' });
        }

        const datos = await planModel.obtenerPedidosFinalizadosPorMes(anio, mes);

        res.json({
            success: true,
            total_resultados: datos.length,
            datos,
        });
    } catch (error) {
        console.error('Error al obtener pedidos por mes:', error);
        res.status(500).json({ success: false, message: 'Error al obtener pedidos por mes' });
    }
};

const obtenerHistoricoCrossDocking = async (req, res) => {
    try {
        const anio = req.query.anio ? parseInt(req.query.anio) : null;
        const datos = await planModel.obtenerHistoricoCrossDocking(anio);
        res.json({ ok: true, data: datos });
    } catch (error) {
        console.error('❌ Error historico cross docking:', error.message);
        res.status(500).json({ ok: false, message: 'Error al obtener histórico.' });
    }
};

module.exports = {
    insertarRutasPlan,
    obtenerRutasPlan,
    obtenerPedidosPorFecha,    // 👈 nueva
    actualizarStatusEntrega,    // 👈 nueva
    registrarEntregaPaqueteria,
    obtenerPedidosPorFactura,
    obtenerPedidosFinalizadosPorMes,
    obtenerHistoricoCrossDocking
};