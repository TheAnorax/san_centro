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



const obtenerPedidosEmbarque = async (req, res) => {
    try {
        const pedidos = await SurtidoModel.getPedidosEmbarque();
        res.json(pedidos);
    } catch (err) {
        console.error("Error al obtener pedidos embarque:", err);
        res.status(500).json({ ok: false, message: "Error al obtener pedidos embarque" });
    }
};


const obtenerUsuariosEmbarques = async (req, res) => {
    try {
        const usuarios = await SurtidoModel.getUsuariosEmbarques(); // ✅ sin pasarle res
        res.json(usuarios); // Aquí es donde haces el response
    } catch (error) {
        console.error('Error al obtener usuarios de embarques y paquetería:', error);
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
};

const asignarUsuarioPaqueteria = async (req, res) => {
    const { no_orden, id_usuario_paqueteria } = req.body;

    if (!no_orden || !id_usuario_paqueteria) {
        return res.status(400).json({ error: 'Faltan datos' });
    }

    try {
        const result = await SurtidoModel.actualizarUsuarioPaqueteria(no_orden, id_usuario_paqueteria);
        res.json({ ok: true, result });
    } catch (error) {
        console.error("❌ Error en asignarUsuarioPaqueteria:", error);
        res.status(500).json({ error: 'Error interno al asignar usuario' });
    }
};



module.exports = {
    obtenerPedidosSurtiendo, finalizarPedido, obtenerPedidosEmbarque,
    cerrarPedidoEmbarque, obtenerPedidosFinalizados, obtenerUsuariosEmbarques,
    asignarUsuarioPaqueteria
};
