/**
 * embarques.controller.js
 * Controlador del módulo de Embarques para appSanCed.
 */

const embarquesModel = require('../../models/embarques/embarques.model');

// Paquetería (rol_id 11) solo debe ver lo que tiene asignado; los demás
// roles (admin/Surtidor/master) siguen viendo todos los pedidos en
// embarque, igual que antes (lo necesitan para asignar paquetería a otros).
const ROL_PAQUETERIA = 11;
const idPaqueteriaDeFiltro = (req) =>
    Number(req.usuario?.rol_id) === ROL_PAQUETERIA ? req.usuario.id : undefined;

const listarPedidosEnEmbarque = async (req, res) => {
    try {
        const pedidos = await embarquesModel.listarPedidosEnEmbarque(idPaqueteriaDeFiltro(req));
        res.json({ ok: true, data: pedidos });
    } catch (err) {
        console.error('❌ [embarques] listarPedidosEnEmbarque:', err);
        res.status(500).json({ ok: false, message: 'Error al obtener los pedidos en embarque.' });
    }
};

const listarPedidosFinalizadosEmbarque = async (req, res) => {
    try {
        const pedidos = await embarquesModel.listarPedidosFinalizadosEmbarque(idPaqueteriaDeFiltro(req));
        res.json({ ok: true, data: pedidos });
    } catch (err) {
        console.error('❌ [embarques] listarPedidosFinalizadosEmbarque:', err);
        res.status(500).json({ ok: false, message: 'Error al obtener los pedidos finalizados.' });
    }
};

// #region IMPRESORA
// req.usuario lo llena verifyToken (middleware) a partir del token — mismo
// patrón que el resto de appSanCed para saber quién está logueado.
const obtenerMiImpresora = async (req, res) => {
    try {
        const impresora = await embarquesModel.obtenerImpresoraDeUsuario(req.usuario.id);
        res.json({ ok: true, data: impresora });
    } catch (err) {
        console.error('❌ [embarques] obtenerMiImpresora:', err);
        res.status(500).json({ ok: false, message: 'Error al consultar la impresora.' });
    }
};

const listarImpresoras = async (req, res) => {
    try {
        const impresoras = await embarquesModel.listarImpresoras();
        res.json({ ok: true, data: impresoras });
    } catch (err) {
        console.error('❌ [embarques] listarImpresoras:', err);
        res.status(500).json({ ok: false, message: 'Error al listar las impresoras.' });
    }
};

const conectarImpresora = async (req, res) => {
    try {
        const { id_print } = req.body;
        if (!id_print) {
            return res.status(400).json({ ok: false, message: 'Falta id_print.' });
        }
        await embarquesModel.asignarImpresoraAUsuario(id_print, req.usuario.id);
        res.json({ ok: true });
    } catch (err) {
        console.error('❌ [embarques] conectarImpresora:', err);
        res.status(500).json({ ok: false, message: 'Error al conectar la impresora.' });
    }
};

// Conectar escribiendo la MAC directamente (pantalla "Impresora no
// conectada" de la app) — no requiere elegir de un catálogo.
const conectarImpresoraPorMac = async (req, res) => {
    try {
        const { mac } = req.body;
        if (!mac || !mac.trim()) {
            return res.status(400).json({ ok: false, message: 'Falta la MAC de la impresora.' });
        }
        await embarquesModel.conectarImpresoraPorMac(mac.trim().toUpperCase(), req.usuario.id);
        res.json({ ok: true });
    } catch (err) {
        console.error('❌ [embarques] conectarImpresoraPorMac:', err);
        res.status(500).json({ ok: false, message: 'Error al conectar la impresora.' });
    }
};
// #endregion IMPRESORA

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
    listarPedidosFinalizadosEmbarque,
    obtenerMiImpresora,
    listarImpresoras,
    conectarImpresora,
    conectarImpresoraPorMac,
    asignarCaja,
    asignarUsuarioPaqueteria,
    liberarUsuarioPaqueteria,
    finalizarEmbarque,
    regresarASurtido,
};
