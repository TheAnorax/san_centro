const SurtidoModel = require('../models/SurtidoModel');

const obtenerPedidosSurtiendo = async (req, res) => {
    try {
        const pedidos = await SurtidoModel.getPedidosSurtiendo();
        res.json(pedidos);
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, message: "Error al obtener pedidos surtiendo" });
    }
};

// ✅ Nueva función: finalizar y mover pedido
const finalizarPedido = async (req, res) => {
    const { noOrden } = req.params;

    try {
        const resultado = await SurtidoModel.moverPedidoASurtidoFinalizado(noOrden);
        if (resultado.ok) {
            res.status(200).json({ ok: true, message: resultado.mensaje });
        } else {
            res.status(400).json({ ok: false, message: resultado.mensaje });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, message: "Error al finalizar el pedido" });
    }
};

const obtenerPedidosEmbarque = async (req, res) => {
    try {
        const pedidos = await SurtidoModel.getPedidosEmbarque();
        res.json(pedidos);
    } catch (err) {
        console.error("Error al obtener pedidos embarque:", err);
        res.status(500).json({ ok: false, message: "Error al obtener pedidos embarque" });
    }
};

const cerrarPedidoEmbarque = async (req, res) => {
    const { noOrden } = req.params;

    try {
        const resultado = await SurtidoModel.moverPedidoAFinalizado(noOrden);
        if (resultado.ok) {
            res.status(200).json({ ok: true, message: resultado.mensaje });
        } else {
            res.status(400).json({ ok: false, message: resultado.mensaje });
        }
    } catch (err) {
        console.error("Error en cerrarPedidoEmbarque:", err);
        res.status(500).json({ ok: false, message: "Error al cerrar el pedido" });
    }
};

const obtenerPedidosFinalizados = async (req, res) => {
    try {
        const pedidos = await SurtidoModel.getpedidosFinalizados();
        res.status(200).json(pedidos);
    } catch (error) {
        console.error("Error al obtener pedidos finalizados", error);
        res.status(500).json({ ok: false, message: "Error al obtner pedidos Finalizados" });
    }
};


module.exports = { obtenerPedidosSurtiendo, finalizarPedido, obtenerPedidosEmbarque, cerrarPedidoEmbarque, obtenerPedidosFinalizados };
