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
 * Si se pasa id_usuario, solo trae los pedidos asignados a ese surtidor
 * (ps.id_usuario = id_usuario); sin id_usuario trae todo (uso admin/master).
 */
const listarPedidosEnSurtido = async (id_usuario) => {
    const condicionUsuario = id_usuario ? 'AND ps.id_usuario = ?' : '';
    const params = id_usuario ? [id_usuario] : [];

    // inv: un producto puede estar en varias ubicaciones dentro de `inventario`.
    // Se toma solo UNA (la de mayor cant_stock_real) para no duplicar líneas del
    // pedido cuando se hace el JOIN por codigo_producto.
    const [rows] = await pool.query(
        `SELECT
            ps.id_pedi, ps.no_orden, ps.tipo, ps.codigo_pedido, ps.clave,
            ps.cantidad, ps.cant_surtida, ps.cant_no_enviada, ps.um,
            ps._bl, ps._pz, ps._pq, ps._inner, ps._master, ps._palet,
            ps.ubi_bahia, ps.estado, ps.avance, ps.id_usuario,
            ps.unido, ps.fusion, ps.ordenes_unidas,
            prod.descripcion,
            -- Piezas por empaque (catálogo), para convertir un escaneo de
            -- INNER/MASTER/PALET a piezas reales (ver FACTOR_POR_UM).
            prod._pz AS factor_pz, prod._inner AS factor_inner,
            prod._master AS factor_master, prod._palet AS factor_palet,
            -- Códigos de barras del catálogo, como texto (vienen como
            -- DOUBLE en productos), para comparar contra lo que lee el lector.
            CAST(prod.barcode_pz AS CHAR) AS barcode_pz,
            CAST(prod.barcode_inner AS CHAR) AS barcode_inner,
            CAST(prod.barcode_master AS CHAR) AS barcode_master,
            CAST(prod.barcode_palet AS CHAR) AS barcode_palet,
            inv.ubicacion,
            inv.cant_stock_real
        FROM pedidos_surtiendo ps
        LEFT JOIN productos prod ON ps.codigo_pedido = prod.codigo
        LEFT JOIN (
            SELECT i.codigo_producto, i.ubicacion, i.cant_stock_real
            FROM inventario i
            INNER JOIN (
                SELECT codigo_producto, MAX(cant_stock_real) AS max_stock
                FROM inventario
                GROUP BY codigo_producto
            ) tope ON tope.codigo_producto = i.codigo_producto AND tope.max_stock = i.cant_stock_real
            GROUP BY i.codigo_producto
        ) inv ON inv.codigo_producto = ps.codigo_pedido
        WHERE ps.estado = 'S'
        ${condicionUsuario}
        ORDER BY ps.no_orden ASC, ps.id_pedi ASC;`,
        params
    );
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

        const columnaEmpaque =
            { PZ: '_pz', PQ: '_pq', INNER: '_inner', MASTER: '_master', PALET: '_palet' }[String(um).toUpperCase()] ||
            '_pz';

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
 * Marca cantidad no disponible (faltante) en una línea, con motivo y el id
 * del supervisor (rol_id 13) que autorizó/liberó la acción.
 */
const registrarNoSurtido = async ({ id_pedi, cantidadNoEnviada, motivo, idUsuarioLibero }) => {
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
                 motivo = ?,
                 id_usuario_libero = ?
             WHERE id_pedi = ?`,
            [cantidadNoEnviada, motivo || null, idUsuarioLibero || null, id_pedi]
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
 * (no canceladas) cuadren, y SOLO marca el pedido como terminado (estado = 'E')
 * dentro de la misma tabla `pedidos_surtiendo` — YA NO lo mueve a
 * `pedidos_embarques` ni a `pedido_finalizado`. Como `listarPedidosEnSurtido`
 * solo trae `estado = 'S'`, el pedido deja de verse en la lista de Surtido,
 * pero la fila sigue existiendo tal cual, nada más con otro estado.
 *
 * `bahia`, si se manda, se guarda en `ubi_bahia` de todas las líneas del pedido.
 */
const finalizarSurtido = async (no_orden, tipo, bahia) => {
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

        // Descuenta el inventario real por lo que sí se surtió (igual que antes).
        await conn.query(
            `UPDATE inventario i
             INNER JOIN pedidos_surtiendo ps ON ps.codigo_pedido = i.codigo_producto
             SET i.cant_stock_real = i.cant_stock_real - ps.cant_surtida
             WHERE ps.no_orden = ? AND UPPER(ps.tipo) = UPPER(?)
               AND ps.cant_surtida > 0 AND i.cant_stock_real >= ps.cant_surtida`,
            [no_orden, tipo]
        );

        // Único cambio real: estado -> 'E', y la bahía si se escaneó una.
        // No se mueve ni se borra ninguna fila.
        await conn.query(
            `UPDATE pedidos_surtiendo
             SET estado = 'E',
                 fin_surtido = IF(fin_surtido IS NULL, NOW(), fin_surtido),
                 ubi_bahia = COALESCE(?, ubi_bahia)
             WHERE no_orden = ? AND UPPER(tipo) = UPPER(?)`,
            [bahia || null, no_orden, tipo]
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
