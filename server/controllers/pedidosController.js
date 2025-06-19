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

// *** Nuevo controlador para insertar el pedido a pedidos_surtiendo ***
const agregarPedidoSurtiendo = async (req, res) => {
    try {
        // AHORA también recibimos 'tipo'
        const { no_orden, tipo, bahia, usuario } = req.body;
        if (!no_orden || !tipo || !bahia || !usuario) {
            return res.status(400).json({ ok: false, message: "Faltan datos" });
        }

        const ok = await PedidosModel.agregarPedidoSurtiendo({
            no_orden,
            tipo,
            bahia,
            usuario
        });

        if (!ok) return res.status(500).json({ ok: false, message: "Error al insertar pedido" });

        return res.json({ ok: true, message: "Pedido agregado correctamente" });
    } catch (error) {
        console.error("Error en agregarPedidoSurtiendo:", error);
        return res.status(500).json({ ok: false, message: "Error interno" });
    }
};



module.exports = { getProductosPorOrden, obtenerTodosConProductos, getBahias, getUsuarios, agregarPedidoSurtiendo };
