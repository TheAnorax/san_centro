/**
 * embarques.controller.js
 * Controlador del módulo de Embarques para appSanCed.
 */

const embarquesModel = require('../../models/embarques/embarques.model');

const listarPedidosEnEmbarque = async (req, res) => {
    try {
        const pedidos = await embarquesModel.listarPedidosEnEmbarque();
        res.json({ ok: true, data: pedidos });
    } catch (err) {
        console.error('❌ [embarques] listarPedidosEnEmbarque:', err);
        res.status(500).json({ ok: false, message: 'Error al obtener los pedidos en embarque.' });
    }
};

const asignarCaja = async (req, res) => {
    try {
        const { id_pedi } = req.params;
        const { caja, tipoCaja, scannedPz, scannedPq, scannedInner, scannedMaster } = req.body;

        if (caja === undefined || caja === null || caja === '') {
            return res.status(400).json({ ok: false, message: 'Falta el número de caja.' });
        }

        const resultado = await embarquesModel.asignarCaja({
            id_pedi, caja, tipoCaja, scannedPz, scannedPq, scannedInner, scannedMaster,
        });

        if (!resultado.ok) return res.status(resultado.code || 500).json(resultado);
        res.json(resultado);
    } catch (err) {
        console.error('❌ [embarques] asignarCaja:', err);
        res.status(500).json({ ok: false, message: 'Error al asignar la caja.' });
    }
};

const asignarUsuarioPaqueteria = async (req, res) => {
    try {
        const { no_orden } = req.params;
        const { id_usuario_paqueteria } = req.body;

        if (!id_usuario_paqueteria) {
            return res.status(400).json({ ok: false, message: 'Falta id_usuario_paqueteria.' });
        }

        const resultado = await embarquesModel.asignarUsuarioPaqueteria(no_orden, id_usuario_paqueteria);
        if (!resultado.ok) return res.status(resultado.code || 500).json(resultado);
        res.json(resultado);
    } catch (err) {
        console.error('❌ [embarques] asignarUsuarioPaqueteria:', err);
        res.status(500).json({ ok: false, message: 'Error al asignar el usuario de paquetería.' });
    }
};

const liberarUsuarioPaqueteria = async (req, res) => {
    try {
        const { no_orden } = req.params;
        const resultado = await embarquesModel.liberarUsuarioPaqueteria(no_orden);
        if (!resultado.ok) return res.status(resultado.code || 500).json(resultado);
        res.json(resultado);
    } catch (err) {
        console.error('❌ [embarques] liberarUsuarioPaqueteria:', err);
        res.status(500).json({ ok: false, message: 'Error al liberar el usuario de paquetería.' });
    }
};

const finalizarEmbarque = async (req, res) => {
    try {
        const { no_orden, tipo } = req.params;
        const resultado = await embarquesModel.finalizarEmbarque(no_orden, tipo);
        if (!resultado.ok) return res.status(resultado.code || 500).json(resultado);
        res.json(resultado);
    } catch (err) {
        console.error('❌ [embarques] finalizarEmbarque:', err);
        res.status(500).json({ ok: false, message: 'Error al finalizar el embarque.' });
    }
};

const regresarASurtido = async (req, res) => {
    try {
        const { no_orden, tipo } = req.params;
        const resultado = await embarquesModel.regresarASurtido(no_orden, tipo);
        if (!resultado.ok) return res.status(resultado.code || 500).json(resultado);
        res.json(resultado);
    } catch (err) {
        console.error('❌ [embarques] regresarASurtido:', err);
        res.status(500).json({ ok: false, message: 'Error al regresar el pedido a Surtido.' });
    }
};

module.exports = {
    listarPedidosEnEmbarque,
    asignarCaja,
    asignarUsuarioPaqueteria,
    liberarUsuarioPaqueteria,
    finalizarEmbarque,
    regresarASurtido,
};
