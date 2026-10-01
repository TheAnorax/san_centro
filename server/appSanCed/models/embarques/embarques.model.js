/**
 * embarques.model.js
 * Acceso a datos del módulo de Embarques (tabla `pedidos_embarques`).
 * Escrito de cero para appSanCed — sin depender del código anterior.
 */

const pool = require('../../config/db.config');
// Mismo helper que ya usa el panel web de Usuarios para impresoras
// (tabla `prints`) — se reutiliza tal cual, sin duplicar la lógica.
const usuarioModel = require('../../../models/usuarioModel');

// Campos de cliente/factura/total: viven en la tabla `sanced` (la misma que
// usa Plan de Rutas en el sistema web), no en `pedidos_embarques`. Se juntan
// por no_orden + tipo (tpo_original) — LEFT JOIN porque no todo no_orden
// tiene todavía una fila ahí (pedidos CD en vivo, por ejemplo).
const SELECT_EMBARQUES_BASE = `
        SELECT
            pe.id_pedi, pe.no_orden, pe.tipo, pe.codigo_pedido, pe.clave,
            pe.cantidad, pe.cant_surtida, pe.cant_no_enviada, pe.um,
            pe._bl, pe._pz, pe._pq, pe._inner, pe._master,
            pe.v_pz, pe.v_pq, pe.v_inner, pe.v_master,
            pe.ubi_bahia, pe.estado, pe.id_usuario, pe.id_usuario_paqueteria,
            pe.caja, pe.cajas, pe.tipo_caja,
            pe.unido, pe.fusion, pe.ordenes_unidas,
            pe.inicio_embarque, pe.fin_embarque,
            prod.descripcion,
            u.nombre AS nombre_usuario,
            up.nombre AS nombre_paqueteria,
            s.nombre_cliente,
            s.no_factura,
            s.total,
            s.total_con_iva
        FROM pedidos_embarques pe
        LEFT JOIN productos prod ON pe.codigo_pedido = prod.codigo
        LEFT JOIN usuarios u  ON pe.id_usuario = u.id
        LEFT JOIN usuarios up ON pe.id_usuario_paqueteria = up.id
        LEFT JOIN sanced s ON s.no_orden = pe.no_orden AND UPPER(s.tpo_original) = UPPER(pe.tipo)
`;

/**
 * Pedidos actualmente en embarque, agrupados por no_orden+tipo.
 * Si se pasa `idUsuarioPaqueteria`, se filtra a solo los pedidos asignados
 * a ese usuario (así cada Paquetería ve nada más lo suyo); si no se pasa
 * (admin/Surtidor/master), se ven todos, igual que antes.
 */
const listarPedidosEnEmbarque = async (idUsuarioPaqueteria) => {
    const filtro = idUsuarioPaqueteria ? `WHERE pe.id_usuario_paqueteria = ?` : '';
    const params = idUsuarioPaqueteria ? [idUsuarioPaqueteria] : [];
    const [rows] = await pool.query(`
        ${SELECT_EMBARQUES_BASE}
        ${filtro}
        ORDER BY pe.no_orden DESC, pe.id_pedi ASC;
    `, params);
    return rows;
};

/**
 * Pedidos ya finalizados en embarque (tabla `pedido_finalizado`), con los
 * mismos datos de cliente/factura/total — para la pestaña "Finalizados".
 * Se limita a los últimos 200 para no traer todo el histórico de un jalón.
 */
const listarPedidosFinalizadosEmbarque = async (idUsuarioPaqueteria) => {
    const filtro = idUsuarioPaqueteria ? `WHERE pf.id_usuario_paqueteria = ?` : '';
    const params = idUsuarioPaqueteria ? [idUsuarioPaqueteria] : [];
    const [rows] = await pool.query(`
        SELECT
            pf.id_pedi, pf.no_orden, pf.tipo, pf.codigo_pedido, pf.clave,
            pf.cantidad, pf.cant_surtida, pf.cant_no_enviada, pf.um,
            pf.ubi_bahia, pf.estado, pf.id_usuario, pf.id_usuario_paqueteria,
            pf.caja, pf.cajas, pf.tipo_caja,
            pf.unido, pf.fusion, pf.ordenes_unidas,
            pf.inicio_embarque, pf.fin_embarque,
            prod.descripcion,
            u.nombre AS nombre_usuario,
            up.nombre AS nombre_paqueteria,
            s.nombre_cliente,
            s.no_factura,
            s.total,
            s.total_con_iva
        FROM pedido_finalizado pf
        LEFT JOIN productos prod ON pf.codigo_pedido = prod.codigo
        LEFT JOIN usuarios u  ON pf.id_usuario = u.id
        LEFT JOIN usuarios up ON pf.id_usuario_paqueteria = up.id
        LEFT JOIN sanced s ON s.no_orden = pf.no_orden AND UPPER(s.tpo_original) = UPPER(pf.tipo)
        ${filtro}
        ORDER BY pf.no_orden DESC, pf.id_pedi ASC
        LIMIT 2000;
    `, params);
    return rows;
};

/**
 * Impresora (tabla `prints`) asignada al usuario de paquetería logueado —
 * reutiliza el mismo helper que ya usa el panel web de Usuarios, así que
 * conectar/desconectar desde ahí también se refleja aquí.
 */
const obtenerImpresoraDeUsuario = (idUsuario) => usuarioModel.getImpresoraByUsuario(idUsuario);

/**
 * Catálogo completo de impresoras registradas (tabla `prints`) — para que
 * el usuario de paquetería elija cuál es la suya al "conectar".
 */
const listarImpresoras = () => usuarioModel.getImpresoras();

/**
 * Asigna una impresora (por id_print) al usuario logueado. Como ya hace el
 * panel web, deja solo una impresora por usuario (libera cualquier otra que
 * tuviera antes asignada).
 */
const asignarImpresoraAUsuario = (idPrint, idUsuario) =>
    usuarioModel.asignarImpresoraPorId({ id_print: idPrint, id_usu: idUsuario });

/**
 * Conecta una impresora escribiendo su MAC directamente (en vez de elegirla
 * de un catálogo): si ya existe una fila en `prints` con esa MAC, se le
 * asigna el usuario; si no existe, se crea una nueva. Igual que las demás
 * formas de conectar, deja solo una impresora por usuario (libera cualquier
 * otra que tuviera antes).
 */
const conectarImpresoraPorMac = async (mac, idUsuario) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        await conn.query(`UPDATE prints SET id_usu = NULL WHERE id_usu = ?`, [idUsuario]);

        const [existente] = await conn.query(
            `SELECT id_print FROM prints WHERE mac_print = ? LIMIT 1`,
            [mac]
        );

        if (existente.length > 0) {
            await conn.query(`UPDATE prints SET id_usu = ? WHERE id_print = ?`, [idUsuario, existente[0].id_print]);
        } else {
            await conn.query(
                `INSERT INTO prints (name, mac_print, id_usu) VALUES (?, ?, ?)`,
                [`Impresora ${mac}`, mac, idUsuario]
            );
        }

        await conn.commit();
        return { ok: true };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};

/**
 * Asigna/actualiza el número de caja y tipo de caja de una línea de embarque.
 * `cajas` guarda un acumulado tipo "1,2,3" sin duplicar números ya agregados.
 */
const asignarCaja = async ({ id_pedi, caja, tipoCaja, scannedPz, scannedPq, scannedInner, scannedMaster }) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [rows] = await conn.query(
            `SELECT cajas FROM pedidos_embarques WHERE id_pedi = ? FOR UPDATE`,
            [id_pedi]
        );
        if (rows.length === 0) {
            await conn.rollback();
            return { ok: false, code: 404, message: 'No se encontró esa línea en embarques.' };
        }

        const cajasActuales = String(rows[0].cajas || '')
            .split(',')
            .map((c) => c.trim())
            .filter(Boolean);

        const cajaStr = String(caja);
        const yaExiste = cajasActuales.includes(cajaStr);
        const cajasNuevas = yaExiste ? cajasActuales.join(',') : [...cajasActuales, cajaStr].join(',');

        await conn.query(
            `UPDATE pedidos_embarques
             SET caja = ?, cajas = ?, tipo_caja = ?,
                 v_pz = COALESCE(?, v_pz), v_pq = COALESCE(?, v_pq),
                 v_inner = COALESCE(?, v_inner), v_master = COALESCE(?, v_master),
                 inicio_embarque = IF(inicio_embarque IS NULL, NOW(), inicio_embarque)
             WHERE id_pedi = ?`,
            [caja, cajasNuevas, tipoCaja ? String(tipoCaja).toUpperCase() : null,
                scannedPz ?? null, scannedPq ?? null, scannedInner ?? null, scannedMaster ?? null,
                id_pedi]
        );

        await conn.commit();
        return { ok: true, cajas: cajasNuevas };
    } catch (err) {
        await conn.rollback();
        return { ok: false, code: 500, message: err.message };
    } finally {
        conn.release();
    }
};

/**
 * Asigna el usuario de paquetería responsable de un pedido completo (todas sus líneas).
 */
const asignarUsuarioPaqueteria = async (no_orden, id_usuario_paqueteria) => {
    const [result] = await pool.query(
        `UPDATE pedidos_embarques SET id_usuario_paqueteria = ? WHERE no_orden = ?`,
        [id_usuario_paqueteria, no_orden]
    );
    if (result.affectedRows === 0) {
        return { ok: false, code: 404, message: 'No se encontró ese pedido en embarques.' };
    }
    return { ok: true };
};

/**
 * Libera al usuario de paquetería de un pedido, solo si aún no se ha
 * escaneado/validado nada en embarque (v_pz/v_pq/v_inner/v_master en 0).
 */
const liberarUsuarioPaqueteria = async (no_orden) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [rows] = await conn.query(
            `SELECT SUM(COALESCE(v_pz,0) + COALESCE(v_pq,0) + COALESCE(v_inner,0) + COALESCE(v_master,0)) AS total_v
             FROM pedidos_embarques WHERE no_orden = ? FOR UPDATE`,
            [no_orden]
        );

        if (!rows.length) {
            await conn.rollback();
            return { ok: false, code: 404, message: 'Pedido no encontrado.' };
        }
        if (Number(rows[0].total_v || 0) > 0) {
            await conn.rollback();
            return { ok: false, code: 409, message: 'No se puede liberar: ya hay movimientos escaneados en este pedido.' };
        }

        await conn.query(`UPDATE pedidos_embarques SET id_usuario_paqueteria = NULL WHERE no_orden = ?`, [no_orden]);
        await conn.commit();
        return { ok: true };
    } catch (err) {
        await conn.rollback();
        return { ok: false, code: 500, message: err.message };
    } finally {
        conn.release();
    }
};

/**
 * Cierra un pedido de embarque y lo mueve a `pedido_finalizado`.
 */
const finalizarEmbarque = async (no_orden, tipo) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [lineas] = await conn.query(
            `SELECT * FROM pedidos_embarques WHERE no_orden = ? AND UPPER(tipo) = UPPER(?) FOR UPDATE`,
            [no_orden, tipo]
        );

        if (lineas.length === 0) {
            await conn.rollback();
            return { ok: false, code: 404, message: 'No se encontraron líneas de este pedido en embarques.' };
        }

        for (const l of lineas) {
            const estadoFinal = l.estado === 'C' ? 'C' : 'F';
            await conn.query(
                `INSERT INTO pedido_finalizado (
                    no_orden, tipo, codigo_pedido, clave, cantidad, cant_surtida, cant_no_enviada,
                    um, _pz, _pq, _inner, _master, v_pz, v_pq, v_inner, v_master,
                    ubi_bahia, estado, id_usuario, id_usuario_paqueteria, registro,
                    inicio_surtido, fin_surtido, inicio_embarque, fin_embarque,
                    unido, fusion, ordenes_unidas, caja, tipo_caja, motivo, registro_fin
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                [
                    l.no_orden, l.tipo, l.codigo_pedido, l.clave, l.cantidad, l.cant_surtida, l.cant_no_enviada,
                    l.um, l._pz, l._pq, l._inner, l._master, l.v_pz, l.v_pq, l.v_inner, l.v_master,
                    l.ubi_bahia, estadoFinal, l.id_usuario, l.id_usuario_paqueteria, l.registro,
                    l.inicio_surtido, l.fin_surtido, l.inicio_embarque, l.fin_embarque,
                    l.unido, l.fusion, l.ordenes_unidas, l.caja, l.tipo_caja, l.motivo,
                ]
            );
        }

        await conn.query(
            `DELETE FROM pedidos_embarques WHERE no_orden = ? AND UPPER(tipo) = UPPER(?)`,
            [no_orden, tipo]
        );

        await conn.commit();
        return { ok: true };
    } catch (err) {
        await conn.rollback();
        return { ok: false, code: 500, message: err.message };
    } finally {
        conn.release();
    }
};

/**
 * Regresa un pedido completo de `pedidos_embarques` a `pedidos_surtiendo`
 * (por si se mandó a embarques por error, o hay que corregir/completar algo
 * del surtido). Los contadores de empaque (_bl, _pz, _pq, _inner, _master,
 * _palet) se regresan en 0 — el pedido vuelve a aparecer en la lista de
 * Surtido con estado 'S', como si no se hubiera escaneado nada todavía.
 */
const regresarASurtido = async (no_orden, tipo) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [lineas] = await conn.query(
            `SELECT * FROM pedidos_embarques WHERE no_orden = ? AND UPPER(tipo) = UPPER(?) FOR UPDATE`,
            [no_orden, tipo]
        );

        if (lineas.length === 0) {
            await conn.rollback();
            return { ok: false, code: 404, message: 'No se encontraron líneas de este pedido en embarques.' };
        }

        for (const l of lineas) {
            await conn.query(
                `INSERT INTO pedidos_surtiendo (
                    no_orden, tipo, codigo_pedido, clave, cantidad, cant_surtida, cant_no_enviada,
                    um, _bl, _pz, _pq, _inner, _master, _palet, ubi_bahia, estado, id_usuario,
                    id_usuario_paqueteria, registro, inicio_surtido, fin_surtido, unido,
                    ordenes_unidas, registro_surtido, motivo, id_usuario_libero, unificado, fusion
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 0, ?, 'S', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    l.no_orden, l.tipo, l.codigo_pedido, l.clave, l.cantidad, l.cant_surtida, l.cant_no_enviada,
                    l.um, l.ubi_bahia, l.id_usuario,
                    l.id_usuario_paqueteria, l.registro, l.inicio_surtido, l.fin_surtido, l.unido,
                    l.ordenes_unidas, l.registro_surtido, l.motivo, l.id_usuario_libero, l.unificado, l.fusion,
                ]
            );
        }

        await conn.query(
            `DELETE FROM pedidos_embarques WHERE no_orden = ? AND UPPER(tipo) = UPPER(?)`,
            [no_orden, tipo]
        );

        await conn.commit();
        return { ok: true };
    } catch (err) {
        await conn.rollback();
        return { ok: false, code: 500, message: err.message };
    } finally {
        conn.release();
    }
};

module.exports = {
    listarPedidosEnEmbarque,
    listarPedidosFinalizadosEmbarque,
    asignarCaja,
    asignarUsuarioPaqueteria,
    liberarUsuarioPaqueteria,
    finalizarEmbarque,
    regresarASurtido,
    obtenerImpresoraDeUsuario,
    listarImpresoras,
    asignarImpresoraAUsuario,
    conectarImpresoraPorMac,
};
