const planModel = require('../models/planModel');
const axios = require('axios');

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

// #region ACTUALIZACION_MASIVA_ENTREGA_EXCEL
// ✅ NUEVA - Actualizar fecha_entrega + entrega en lote (subida de Excel de
// concentrado de entregas). Solo toca esos dos campos, no status ni costos.
const actualizarEntregaMasivaController = async (req, res) => {
    const { registros } = req.body;

    if (!Array.isArray(registros) || registros.length === 0) {
        return res.status(400).json({ ok: false, message: 'No se recibieron registros para actualizar.' });
    }

    try {
        const { actualizados, noEncontrados } = await planModel.actualizarEntregaMasiva(registros);
        res.status(200).json({
            ok: true,
            total: registros.length,
            actualizados: actualizados.length,
            noEncontrados,
        });
    } catch (error) {
        console.error('❌ Error en actualizarEntregaMasivaController:', error.message);
        res.status(500).json({ ok: false, message: 'Error al actualizar en lote.' });
    }
};
// #endregion ACTUALIZACION_MASIVA_ENTREGA_EXCEL

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

// ✅ NUEVA - Pedidos CD "en vivo" desde la API de Sanced, para llenar la
// tabla "Pedidos disponibles" del tab Plan sin tener que subir el Excel.
// Es solo lectura (no inserta nada en BD, a diferencia de sincronizarSanced
// en surtidoController.js que sí guarda en la tabla de surtido).
const obtenerPedidosCD = async (req, res) => {
    try {
        const respuesta = await axios.post('http://santul.verpedidos.com:9010/Santul/Sanced');
        const datos = Array.isArray(respuesta.data) ? respuesta.data : [];
        const soloCD = datos.filter(
            (item) => String(item.TpoOriginal || '').trim().toUpperCase() === 'CD'
        );
        res.status(200).json({ ok: true, data: soloCD });
    } catch (error) {
        console.error('❌ Error obteniendo pedidos CD de Sanced:', error.message);
        res.status(500).json({ ok: false, message: 'Error al consultar pedidos CD de Sanced', error: error.message });
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

// 2026-10-29: Facturación CROSS DOCK por día y tipo — GET /api/Plan/facturacion-diaria-cd?year=&month=
const CACHE_FACT_CD = new Map();
const obtenerFacturacionDiariaCD = async (req, res) => {
    try {
        const z2 = (x) => String(x).padStart(2, '0');
        const r2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
        const fechaStr = (f) => (f instanceof Date
            ? `${f.getFullYear()}-${z2(f.getMonth() + 1)}-${z2(f.getDate())}` : String(f).slice(0, 10));

        const hoy = new Date();
        const year = parseInt(req.query.year, 10) || hoy.getFullYear();
        const month = Math.min(Math.max(parseInt(req.query.month, 10) || hoy.getMonth() + 1, 1), 12);
        const key = `${year}-${month}`;
        const c = CACHE_FACT_CD.get(key);
        if (c && c.exp > Date.now() && !req.query.nocache) return res.json({ ...c.body, cache: true });

        const desde = `${year}-${z2(month)}-01`;
        const hasta = month === 12 ? `${year + 1}-01-01` : `${year}-${z2(month + 1)}-01`;
        const pm = month === 1 ? 12 : month - 1, py = month === 1 ? year - 1 : year;
        const desdeAnt = `${py}-${z2(pm)}-01`;

        const [rows, rowsAnt] = await Promise.all([
            planModel.obtenerFacturacionDiariaCD(desde, hasta),
            planModel.obtenerFacturacionDiariaCD(desdeAnt, desde),
        ]);

        const dias = {};
        for (const r of rows) {
            const f = fechaStr(r.fecha);
            const d = dias[f] || (dias[f] = { fecha: f, facturas: 0, total: 0, total_iva: 0, por_tipo: {} });
            const v = { facturas: Number(r.facturas) || 0, total: r2(r.total), total_iva: r2(r.total_iva) };
            d.facturas += v.facturas; d.total = r2(d.total + v.total); d.total_iva = r2(d.total_iva + v.total_iva);
            d.por_tipo[r.tipo] = v;
        }

        const body = {
            ok: true,
            periodo: { year, month, desde, hasta },
            dias: Object.values(dias),
            mes_anterior: {
                year: py, month: pm,
                dias: rowsAnt.map((r) => ({ fecha: fechaStr(r.fecha), total: r2(r.total), total_iva: r2(r.total_iva), facturas: Number(r.facturas) || 0 })),
            },
        };
        const esActual = year === hoy.getFullYear() && month === hoy.getMonth() + 1;
        CACHE_FACT_CD.set(key, { body, exp: Date.now() + (esActual ? 2 * 60 * 1000 : 6 * 3600 * 1000) });
        if (CACHE_FACT_CD.size > 60) CACHE_FACT_CD.clear();
        res.json(body);
    } catch (error) {
        console.error('❌ Error facturación diaria CD:', error.message);
        res.status(500).json({ ok: false, message: 'Error al obtener facturación diaria de cross dock.' });
    }
};

module.exports = {
    insertarRutasPlan,
    obtenerRutasPlan,
    obtenerPedidosPorFecha,    // 👈 nueva
    actualizarStatusEntrega,    // 👈 nueva
    actualizarEntregaMasivaController,
    registrarEntregaPaqueteria,
    obtenerPedidosPorFactura,
    obtenerPedidosFinalizadosPorMes,
    obtenerHistoricoCrossDocking,
    obtenerPedidosCD,
    obtenerFacturacionDiariaCD, // 👈 nueva
};