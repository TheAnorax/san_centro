const PedidosModel = require('../models/pedidosModel');

const getProductosPorOrden = async (req, res) => {
    try {
        const { no_orden } = req.params;
        const productos = await PedidosModel.getProductosPorOrden(no_orden);
        if (!productos.length) {
            return res.status(404).json({ message: 'Pedido no encontrado', info: {}, items: [] });
        }
        const info = {
            no_orden: productos[0].no_orden,
            tipo: productos[0].tipo,
            registro: productos[0].registro,
        };
        const items = productos.map(row => ({
            codigo_pedido: row.codigo_pedido,
            clave: row.clave,
            cantidad: row.cantidad,
            ubi: row.ubi,
            estado: row.estado,
            descripcion: row.descripcion,
            ubicacion: row.ubicacion,
        }));
        res.json({ info, items });
    } catch (error) {
        console.error('Error en getProductosPorOrden:', error);
        res.status(500).json({ message: 'Error interno' });
    }
};

const obtenerTodosConProductos = async (req, res) => {
    try {
        const pedidos = await PedidosModel.getPedidosConProductos();
        res.json(pedidos);
    } catch (error) {
        console.error("Error en obtenerTodosConProductos:", error);
        res.status(500).json({ error: "Error al obtener pedidos" });
    }
};

const getBahias = async (req, res) => {
    try {
        const bahias = await PedidosModel.ObtenerBahias();
        res.json(bahias);
    } catch (err) {
        res.status(500).json({ message: 'Error obteniendo bahías' });
    }
};

const getUsuarios = async (req, res) => {
    try {
        const usuarios = await PedidosModel.ObtenerUsuarios();
        res.json(usuarios);
    } catch (err) {
        res.status(500).json({ message: 'Error obteniendo usuarios' });
    }
};

// ✅ NUEVA — devuelve responsables por cuarto para mostrarlo en el front
const getResponsablesCuarto = async (req, res) => {
    try {
        const responsables = await PedidosModel.getResponsablesCuarto();
        res.json(responsables);
    } catch (err) {
        console.error("Error en getResponsablesCuarto:", err);
        res.status(500).json({ message: 'Error obteniendo responsables' });
    }
};

const agregarPedidoSurtiendo = async (req, res) => {
    try {
        const { no_orden, tipo, bahias, usuario, modo } = req.body; // ← agrega modo

        // ✅ Validación según modo
        if (!no_orden || !tipo || !bahias || !bahias.length) {
            return res.status(400).json({ ok: false, message: "Faltan datos" });
        }
        if (modo !== 'cuarto' && !usuario) {
            return res.status(400).json({ ok: false, message: "Falta usuario" });
        }

        const resultado = await PedidosModel.agregarPedidoSurtiendo({
            no_orden, tipo, bahias, usuario, modo // ← agrega modo
        });

        if (!resultado.ok) return res.status(500).json({ ok: false, message: "Error al insertar pedido" });
        return res.json({ ok: true, message: "Pedido agregado correctamente" });
    } catch (error) {
        console.error("Error en agregarPedidoSurtiendo:", error);
        return res.status(500).json({ ok: false, message: "Error interno" });
    }
};

const liberarUsuarioPaqueteria = async (req, res) => {
    try {
        const { no_orden } = req.body;
        const r = await PedidosModel.liberarUsuarioPaqueteria(no_orden);
        if (!r.ok) {
            if (r.code === 404) return res.status(404).json({ ok: false, message: r.message });
            if (r.code === 409) return res.status(409).json({ ok: false, message: r.message });
            return res.status(500).json({ ok: false, message: r.message || 'Error al liberar' });
        }
        res.json({ ok: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ ok: false, message: 'Error al liberar' });
    }
};

module.exports = {
    getProductosPorOrden,
    obtenerTodosConProductos,
    getBahias,
    getUsuarios,
    getResponsablesCuarto, // ← NUEVA
    agregarPedidoSurtiendo,
    liberarUsuarioPaqueteria
};