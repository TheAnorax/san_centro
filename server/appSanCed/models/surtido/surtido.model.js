/**
 * surtido.model.js
 * Acceso a datos del módulo de Surtido (tabla `pedidos_surtiendo`).
 * Escrito de cero para appSanCed — sin depender del código anterior.
 */

const pool = require('../../config/db.config');

// Cuánto representa "1 unidad escaneada" en piezas, según la unidad de medida (um)
// que trae la línea del pedido. Si um no es una de estas, se trata como 1 pieza.
const FACTOR_POR_UM = (um, factorEmpaque) => {
    const u = String(um || '').toUpperCase().trim();
    if (u === 'PZ') return 1;
    // Para unidades de empaque (MASTER, INNER, PQ, etc.) el factor real de piezas
    // por empaque viene del catálogo de producto (factorEmpaque); si no se conoce,
    // se asume 1 para no inflar cantidades por error.
    return Math.max(Number(factorEmpaque) || 1, 1);
};

/**
 * Pedidos actualmente en surtido (estado 'S'), agrupados por no_orden+tipo.
 */
const listarPedidosEnSurtido = async () => {
    const [rows] = await pool.query(`
        SELECT
            ps.id_pedi, ps.no_orden, ps.tipo, ps.codigo_pedido, ps.clave,
            ps.cantidad, ps.cant_surtida, ps.cant_no_enviada, ps.um,
            ps._bl, ps._pz, ps._pq, ps._inner, ps._master,
            ps.ubi_bahia, ps.estado, ps.avance, ps.id_usuario,
            ps.unido, ps.fusion, ps.ordenes_unidas,
            prod.descripcion,
            inv.ubicacion,
            inv.cant_stock_real
        FROM pedidos_surtiendo ps
        LEFT JOIN productos prod ON ps.codigo_pedido = prod.codigo
        LEFT JOIN inventario inv ON ps.codigo_pedido = inv.codigo_producto
        WHERE ps.estado = 'S'
        ORDER BY ps.no_orden DESC, ps.id_pedi ASC;
    `);
    return rows;
};

/**
 * Detalle de una sola línea de surtido, con lock de fila (para usarse dentro
 * de una transacción antes de actualizar cantidades).
 */
const obtenerLineaParaActualizar = async (conn, id_pedi) => {
    const [rows] = await conn.query(
        `SELECT id_pedi, no_orden, tipo, codigo_pedido, cantidad, cant_surtida,
                cant_no_enviada, um
         FROM pedidos_surtiendo
         WHERE id_pedi = ?
         FOR UPDATE`,
        [id_pedi]
    );
    return rows[0] || null;
};

/**
 * Registra un escaneo: suma piezas a cant_surtida y al contador de empaque
 * correspondiente (_pz/_pq/_inner/_master), sin dejar que se pase de `cantidad`.
 */
const registrarEscaneo = async ({ id_pedi, unidadesEscaneadas, um, factorEmpaque, id_usuario }) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const linea = await obtenerLineaParaActualizar(conn, id_pedi);
        if (!linea) {
            await conn.rollback();
            return { ok: false, code: 404, message: 'No se encontró esa línea en surtido.' };
        }

        const factor = FACTOR_POR_UM(um, factorEmpaque);
        const piezasNuevas = Number(unidadesEscaneadas) * factor;
        const totalSurtidoDespues = Number(linea.cant_surtida) + piezasNuevas;

        if (totalSurtidoDespues > Number(linea.cantidad)) {
            await conn.rollback();
            return {
                ok: false, code: 409,
                message: `Ese escaneo excede lo pedido (pedido: ${linea.cantidad}, ya surtido: ${linea.cant_surtida}).`
            };
        }

        const columnaEmpaque = { PZ: '_pz', PQ: '_pq', INNER: '_inner', MASTER: '_master' }[String(um).toUpperCase()] || '_pz';

        await conn.query(
            `UPDATE pedidos_surtiendo
             SET cant_surtida = cant_surtida + ?,
                 ${columnaEmpaque} = ${columnaEmpaque} + ?,
                 id_usuario = ?,
                 inicio_surtido = IF(inicio_surtido IS NULL, NOW(), inicio_surtido)
             WHERE id_pedi = ?`,
            [piezasNuevas, unidadesEscaneadas, id_usuario, id_pedi]
        );

        // Si con este escaneo la línea quedó completa, se marca como Entregada.
        await conn.query(
            `UPDATE pedidos_surtiendo
             SET estado = 'E', fin_surtido = NOW()
             WHERE id_pedi = ? AND (cant_surtida + IFNULL(cant_no_enviada, 0)) >= cantidad`,
            [id_pedi]
        );

        await conn.commit();
        return { ok: true, piezasAgregadas: piezasNuevas };
    } catch (err) {
        await conn.rollback();
        return { ok: false, code: 500, message: err.message };
    } finally {
        conn.release();
    }
};

/**
 * Marca cantidad no disponible (faltante) en una línea, con motivo.
 */
const registrarNoSurtido = async ({ id_pedi, cantidadNoEnviada, motivo }) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const linea = await obtenerLineaParaActualizar(conn, id_pedi);
        if (!linea) {
            await conn.rollback();
            return { ok: false, code: 404, message: 'No se encontró esa línea en surtido.' };
        }

        const totalDespues = Number(linea.cant_surtida) + Number(linea.cant_no_enviada) + Number(cantidadNoEnviada);
        if (totalDespues > Number(linea.cantidad)) {
            await conn.rollback();
            return { ok: false, code: 409, message: 'La cantidad no enviada excede lo que falta del pedido.' };
        }

        await conn.query(
            `UPDATE pedidos_surtiendo
             SET cant_no_enviada = cant_no_enviada + ?,
                 motivo = ?
             WHERE id_pedi = ?`,
            [cantidadNoEnviada, motivo || null, id_pedi]
        );

        await conn.query(
            `UPDATE pedidos_surtiendo
             SET estado = 'E', fin_surtido = NOW()
             WHERE id_pedi = ? AND (cant_surtida + IFNULL(cant_no_enviada, 0)) >= cantidad`,
            [id_pedi]
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
 * Finaliza el surtido de un pedido completo: valida que todas las líneas activas
 * (no canceladas) cuadren, y las mueve a `pedidos_embarques`. Si nada se surtió,
 * el pedido cae directo a `pedido_finalizado` como NO_ATENDIDO.
 */
const finalizarSurtido = async (no_orden, tipo) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [lineas] = await conn.query(
            `SELECT * FROM pedidos_surtiendo WHERE no_orden = ? AND UPPER(tipo) = UPPER(?) FOR UPDATE`,
            [no_orden, tipo]
        );

        if (lineas.length === 0) {
            await conn.rollback();
            return { ok: false, code: 404, message: 'No se encontraron líneas de este pedido en surtido.' };
        }

        const activas = lineas.filter((l) => l.estado !== 'C');
        const noCuadran = activas.filter(
            (l) => Number(l.cantidad) !== Number(l.cant_surtida) + Number(l.cant_no_enviada)
        );
        if (noCuadran.length > 0) {
            await conn.rollback();
            return { ok: false, code: 409, message: 'Hay líneas sin cerrar (faltan piezas por escanear o marcar como no enviadas).' };
        }

        const totalSurtido = activas.reduce((s, l) => s + Number(l.cant_surtida), 0);
        const totalNoEnviado = activas.reduce((s, l) => s + Number(l.cant_no_enviada), 0);

        if (totalSurtido === 0 && totalNoEnviado > 0) {
            // Nada se pudo surtir: va directo a pedido_finalizado como NO_ATENDIDO.
            for (const l of lineas) {
                await conn.query(
                    `INSERT INTO pedido_finalizado (
                        no_orden, tipo, codigo_pedido, clave, cantidad, cant_surtida, cant_no_enviada,
                        um, _pz, _pq, _inner, _master, ubi_bahia, estado, id_usuario,
                        registro, inicio_surtido, fin_surtido, unido, fusion, ordenes_unidas,
                        motivo, registro_fin
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'NO_ATENDIDO', ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                    [
                        l.no_orden, l.tipo, l.codigo_pedido, l.clave, l.cantidad, l.cant_surtida, l.cant_no_enviada,
                        l.um, l._pz, l._pq, l._inner, l._master, l.ubi_bahia, l.id_usuario,
                        l.registro, l.inicio_surtido, l.fin_surtido, l.unido, l.fusion, l.ordenes_unidas,
                        l.motivo || 'Sin surtido',
                    ]
                );
            }
        } else {
            for (const l of lineas) {
                await conn.query(
                    `INSERT INTO pedidos_embarques (
                        no_orden, tipo, codigo_pedido, clave, cantidad, cant_surtida, cant_no_enviada,
                        um, _bl, _pz, _pq, _inner, _master, ubi_bahia, estado, id_usuario,
                        registro, inicio_surtido, fin_surtido, unido, fusion, ordenes_unidas, motivo
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'E', ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        l.no_orden, l.tipo, l.codigo_pedido, l.clave, l.cantidad, l.cant_surtida, l.cant_no_enviada,
                        l.um, l._bl, l._pz, l._pq, l._inner, l._master, l.ubi_bahia, l.id_usuario,
                        l.registro, l.inicio_surtido, l.fin_surtido, l.unido, l.fusion, l.ordenes_unidas, l.motivo,
                    ]
                );
            }

            // Descuenta el inventario real por lo que sí se surtió.
            await conn.query(
                `UPDATE inventario i
                 INNER JOIN pedidos_surtiendo ps ON ps.codigo_pedido = i.codigo_producto
                 SET i.cant_stock_real = i.cant_stock_real - ps.cant_surtida
                 WHERE ps.no_orden = ? AND UPPER(ps.tipo) = UPPER(?)
                   AND ps.cant_surtida > 0 AND i.cant_stock_real >= ps.cant_surtida`,
                [no_orden, tipo]
            );
        }

        await conn.query(
            `DELETE FROM pedidos_surtiendo WHERE no_orden = ? AND UPPER(tipo) = UPPER(?)`,
            [no_orden, tipo]
        );

        await conn.commit();
        return {
            ok: true,
            estado: totalSurtido === 0 ? 'NO_ATENDIDO' : (totalNoEnviado > 0 ? 'PARCIAL' : 'COMPLETO'),
        };
    } catch (err) {
        await conn.rollback();
        return { ok: false, code: 500, message: err.message };
    } finally {
        conn.release();
    }
};

module.exports = {
    listarPedidosEnSurtido,
    registrarEscaneo,
    registrarNoSurtido,
    finalizarSurtido,
};
