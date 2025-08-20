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

//generacion del pakinlist


const getPedidosEmbarquePacking = async (req, res) => {
    try {
        const tipo = String(req.params.tipo || '').trim().toUpperCase();
        const no_orden = Number(req.params.no_orden || req.params.pedido);
        if (!tipo || !no_orden) {
            return res.status(400).json({ message: 'Faltan parámetros: tipo y no_orden' });
        }

        // Política para partidas sin caja (NULL)
        const policy = String(req.query.nullTo || 'last').toLowerCase(); // 'first' | 'last' | 'new-last'

        // Trae partidas (estado='F', sin motivo). IMPORTANTe:
        // Asegúrate que obtenerPartidasFinalizadasSimple ya haga COALESCE a 0 en _pz/_pq/_inner/_master
        const partidas = await SurtidoModel.obtenerPartidasFinalizadasSimple(tipo, no_orden);
        if (partidas.length === 0) {
            return res.status(404).json({
                message: "No hay partidas para packing (todas tienen motivo o no están en 'F').",
            });
        }

        // Separa con caja vs sin caja
        const conCaja = partidas
            .filter(p => p.caja !== null && p.caja !== undefined)
            .sort((a, b) => (Number(a.caja) - Number(b.caja)) || (a.codigo_pedido - b.codigo_pedido));

        const sinCaja = partidas.filter(p => p.caja === null || p.caja === undefined);

        // Agrupa las que SÍ tienen caja
        const map = new Map();
        for (const p of conCaja) {
            const numCaja = Number(p.caja);
            if (!map.has(numCaja)) {
                map.set(numCaja, {
                    caja: numCaja,
                    tipo_caja: p.tipo_caja ?? null,
                    cajas: p.cajas ?? null,
                    partidas: [],
                    // totales por caja (útiles para el PDF si los quieres mostrar)
                    tot_pedida: 0,
                    tot_surtida: 0,
                    tot_no_enviada: 0,
                    tot_pz: 0,
                    tot_pq: 0,
                    tot_inner: 0,
                    tot_master: 0,
                });
            }

            const partida = {
                codigo_pedido: Number(p.codigo_pedido),
                descripcion: (p.descripcion || '').trim(),
                um: p.um || 'PZ',
                cant_pedida: Number(p.cant_pedida || 0),
                cant_surtida: Number(p.cant_surtida || 0),
                cant_no_enviada: Number(p.cant_no_enviada || 0),
                _pz: Number(p._pz || 0),
                _pq: Number(p._pq || 0),
                _inner: Number(p._inner || 0),
                _master: Number(p._master || 0),
            };

            const cajaRef = map.get(numCaja);
            cajaRef.partidas.push(partida);

            // acumula totales por caja
            cajaRef.tot_pedida += partida.cant_pedida;
            cajaRef.tot_surtida += partida.cant_surtida;
            cajaRef.tot_no_enviada += partida.cant_no_enviada;
            cajaRef.tot_pz += partida._pz;
            cajaRef.tot_pq += partida._pq;
            cajaRef.tot_inner += partida._inner;
            cajaRef.tot_master += partida._master;
        }

        // Ordena cajas numéricas
        const cajas = Array.from(map.values()).sort((a, b) => a.caja - b.caja);

        // Si hay partidas sin caja, decide adónde pegarlas
        if (sinCaja.length) {
            const sinCajaPartidas = sinCaja.map(p => ({
                codigo_pedido: Number(p.codigo_pedido),
                descripcion: (p.descripcion || '').trim(),
                um: p.um || 'PZ',
                cant_pedida: Number(p.cant_pedida || 0),
                cant_surtida: Number(p.cant_surtida || 0),
                cant_no_enviada: Number(p.cant_no_enviada || 0),
                _pz: Number(p._pz || 0),
                _pq: Number(p._pq || 0),
                _inner: Number(p._inner || 0),
                _master: Number(p._master || 0),
            }));

            const acumularEn = (cajaObj, arrPartidas) => {
                for (const it of arrPartidas) {
                    cajaObj.partidas.push(it);
                    cajaObj.tot_pedida += it.cant_pedida;
                    cajaObj.tot_surtida += it.cant_surtida;
                    cajaObj.tot_no_enviada += it.cant_no_enviada;
                    cajaObj.tot_pz += it._pz;
                    cajaObj.tot_pq += it._pq;
                    cajaObj.tot_inner += it._inner;
                    cajaObj.tot_master += it._master;
                }
            };

            if (cajas.length === 0) {
                // No había ninguna caja → crea la #1
                const nueva = {
                    caja: 1,
                    tipo_caja: sinCaja[0]?.tipo_caja ?? null,
                    cajas: sinCaja[0]?.cajas ?? null,
                    partidas: [],
                    tot_pedida: 0, tot_surtida: 0, tot_no_enviada: 0,
                    tot_pz: 0, tot_pq: 0, tot_inner: 0, tot_master: 0,
                };
                acumularEn(nueva, sinCajaPartidas);
                cajas.push(nueva);
            } else if (policy === 'first') {
                acumularEn(cajas[0], sinCajaPartidas);
            } else if (policy === 'new-last') {
                const lastNum = cajas[cajas.length - 1].caja;
                const nueva = {
                    caja: lastNum + 1,
                    tipo_caja: sinCaja[0]?.tipo_caja ?? cajas[cajas.length - 1].tipo_caja ?? null,
                    cajas: null,
                    partidas: [],
                    tot_pedida: 0, tot_surtida: 0, tot_no_enviada: 0,
                    tot_pz: 0, tot_pq: 0, tot_inner: 0, tot_master: 0,
                };
                acumularEn(nueva, sinCajaPartidas);
                cajas.push(nueva);
            } else {
                // default = 'last'
                acumularEn(cajas[cajas.length - 1], sinCajaPartidas);
            }
        }

        // Totales globales (por si quieres usarlos)
        const totalLineas = partidas.length;
        const total_pedidas = partidas.reduce((s, p) => s + Number(p.cant_pedida || 0), 0);
        const total_surtidas = partidas.reduce((s, p) => s + Number(p.cant_surtida || 0), 0);
        const total_no_enviada = partidas.reduce((s, p) => s + Number(p.cant_no_enviada || 0), 0);
        const total_pz = partidas.reduce((s, p) => s + Number(p._pz || 0), 0);
        const total_pq = partidas.reduce((s, p) => s + Number(p._pq || 0), 0);
        const total_inner = partidas.reduce((s, p) => s + Number(p._inner || 0), 0);
        const total_master = partidas.reduce((s, p) => s + Number(p._master || 0), 0);

        return res.json({
            tipo,
            no_orden,
            totalLineas,
            // si quieres exponer también los globales por UM, déjalos:
            total_pedidas, total_surtidas, total_no_enviada,
            total_pz, total_pq, total_inner, total_master,
            cajas,
        });
    } catch (err) {
        console.error('Error en getPedidosEmbarquePacking:', err);
        return res.status(500).json({ message: 'Error al obtener packing' });
    }
};


 

module.exports = {
    obtenerPedidosSurtiendo,
    finalizarPedido,
    cerrarPedidoEmbarque,
    obtenerPedidosFinalizados,
    obtenerPedidosEmbarque,
    obtenerUsuariosEmbarques,
    asignarUsuarioPaqueteria,
    getPedidosEmbarquePacking,

};
