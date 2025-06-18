const PedidosModel = require('../models/pedidosModel');

const getProductosPorOrden = async (req, res) => {
    try {
        const { no_orden } = req.params;
        const productos = await PedidosModel.getProductosPorOrden(no_orden);

        if (!productos.length) {
            return res.status(404).json({ message: 'Pedido no encontrado', info: {}, items: [] });
        }

        // Info general para el header
        const info = {
            no_orden: productos[0].no_orden,
            tipo: productos[0].tipo,
            registro: productos[0].registro,
        };

        // Lista de productos
        const items = productos.map(row => ({
            codigo_pedido: row.codigo_pedido,
            clave: row.clave,
            cantidad: row.cantidad,
            ubi: row.ubi,
            estado: row.estado
        }));

        res.json({ info, items });
    } catch (error) {
        console.error('Error en getProductosPorOrden:', error);
        res.status(500).json({ message: 'Error interno' });
    }
};

const obtenerTodosConProductos = async (req, res) => {
    try {
        const pedidos = await PedidosModel.getPedidosConProductos(); // ← aquí el cambio
        res.json(pedidos);
    } catch (error) {
        console.error("Error en obtenerTodosConProductos:", error);
        res.status(500).json({ error: "Error al obtener pedidos" });
    }
};

module.exports = { getProductosPorOrden, obtenerTodosConProductos };
