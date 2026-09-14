/**
 * surtido.controller.js
 * Controlador del módulo de Surtido para appSanCed.
 */

const surtidoModel = require('../../models/surtido/surtido.model');

// Un Surtidor (rol_id 2) solo ve los pedidos que tiene asignados (ps.id_usuario);
// Admin (1) y Master (4) ven todos los pedidos en surtido, sin filtrar por usuario.
const ROL_SURTIDOR = 2;

const listarPedidosEnSurtido = async (req, res) => {
    try {
        const esSurtidor = Number(req.usuario?.rol_id) === ROL_SURTIDOR;
        const id_usuario = esSurtidor ? req.usuario?.id : null;

        const pedidos = await surtidoModel.listarPedidosEnSurtido(id_usuario);
        res.json({ ok: true, data: pedidos });
    } catch (err) {
        console.error('❌ [surtido] listarPedidosEnSurtido:', err);
        res.status(500).json({ ok: false, message: 'Error al obtener los pedidos en surtido.' });
    }
};

const escanearProducto = async (req, res) => {
    try {
        const { id_pedi } = req.params;
        const { unidadesEscaneadas, um, factorEmpaque } = req.body;
        const id_usuario = req.usuario?.id ?? req.body.id_usuario;

        if (!unidadesEscaneadas || Number(unidadesEscaneadas) <= 0) {
            return res.status(400).json({ ok: false, message: 'unidadesEscaneadas debe ser mayor a 0.' });
        }
        if (!um) {
            return res.status(400).json({ ok: false, message: 'Falta la unidad de medida (um).' });
        }
        if (!id_usuario) {
            return res.status(400).json({ ok: false, message: 'Falta el usuario que realiza el escaneo.' });
        }

        const resultado = await surtidoModel.registrarEscaneo({
            id_pedi, unidadesEscaneadas, um, factorEmpaque, id_usuario,
        });

        if (!resultado.ok) return res.status(resultado.code || 500).json(resultado);
        res.json(resultado);
    } catch (err) {
        console.error('❌ [surtido] escanearProducto:', err);
        res.status(500).json({ ok: false, message: 'Error al registrar el escaneo.' });
    }
};

const MOTIVOS_NO_SURTIDO = [
    'CERO X FALTA DE EXISTENCIA',
    'UM NO COINCIDE',
    'CICLICO',
    'A MENOS X FALTA DE INVENTARIO',
    'ELIMINADO X VENTAS',
    'CUARENTENA',
];

const marcarNoSurtido = async (req, res) => {
    try {
        const { id_pedi } = req.params;
        const { cantidadNoEnviada, motivo, idUsuarioLibero } = req.body;

        if (!cantidadNoEnviada || Number(cantidadNoEnviada) <= 0) {
            return res.status(400).json({ ok: false, message: 'cantidadNoEnviada debe ser mayor a 0.' });
        }
        if (!motivo || !MOTIVOS_NO_SURTIDO.includes(motivo)) {
            return res.status(400).json({
                ok: false,
                message: `El motivo debe ser uno de: ${MOTIVOS_NO_SURTIDO.join(', ')}.`,
            });
        }
        if (!idUsuarioLibero) {
            return res.status(400).json({ ok: false, message: 'Falta la autorización del supervisor (idUsuarioLibero).' });
        }

        const resultado = await surtidoModel.registrarNoSurtido({ id_pedi, cantidadNoEnviada, motivo, idUsuarioLibero });
        if (!resultado.ok) return res.status(resultado.code || 500).json(resultado);
        res.json(resultado);
    } catch (err) {
        console.error('❌ [surtido] marcarNoSurtido:', err);
        res.status(500).json({ ok: false, message: 'Error al marcar la cantidad no surtida.' });
    }
};

const finalizarSurtido = async (req, res) => {
    try {
        const { no_orden, tipo } = req.params;
        const { bahia } = req.body || {};
        const resultado = await surtidoModel.finalizarSurtido(no_orden, tipo, bahia);
        if (!resultado.ok) return res.status(resultado.code || 500).json(resultado);
        res.json(resultado);
    } catch (err) {
        console.error('❌ [surtido] finalizarSurtido:', err);
        res.status(500).json({ ok: false, message: 'Error al finalizar el surtido.' });
    }
};

module.exports = {
    listarPedidosEnSurtido,
    escanearProducto,
    marcarNoSurtido,
    finalizarSurtido,
};
