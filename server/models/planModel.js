const pool = require('../db');
const moment = require('moment');

const insertarRutas = async (rutas) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        let insertados = 0;
        let duplicados = 0;

        for (const ruta of rutas) {
            const {
                NO_ORDEN, NO_FACTURA, NUM_CLIENTE,
                NOMBRE_DEL_CLIENTE, ZONA, MUNICIPIO,
                ESTADO, OBSERVACIONES, TOTAL, PARTIDAS,
                PIEZAS, TIPO, DIRECCION, TELEFONO,
                CORREO, EJECUTIVO_VTAS, GUIA,
                tipo_original, routeName, FECHA
            } = ruta;

            let formattedDate = null;
            if (FECHA) {
                const f = moment(FECHA, 'DD/MM/YYYY', true);
                formattedDate = f.isValid()
                    ? f.format('YYYY-MM-DD')
                    : moment(FECHA).isValid()
                        ? moment(FECHA).format('YYYY-MM-DD')
                        : null;
            }

            const [existe] = await connection.query(
                `SELECT 1 FROM rutas 
                 WHERE NO_ORDEN = ? AND tipo_original = ? LIMIT 1`,
                [NO_ORDEN, tipo_original || null]
            );

            if (existe.length > 0) {
                duplicados++;
                continue;
            }

            await connection.query(`
                INSERT INTO rutas (
                    routeName, FECHA, NO_ORDEN, NO_FACTURA,
                    NUM_CLIENTE, NOMBRE_DEL_CLIENTE, ZONA,
                    MUNICIPIO, ESTADO, OBSERVACIONES,
                    TOTAL, PARTIDAS, PIEZAS,
                    TRANSPORTE, PAQUETERIA, TIPO,
                    DIRECCION, TELEFONO, CORREO,
                    EJECUTIVO_VTAS, GUIA, tipo_original
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                routeName || null,
                formattedDate,
                NO_ORDEN,
                NO_FACTURA || null,
                NUM_CLIENTE || null,
                NOMBRE_DEL_CLIENTE || null,
                ZONA || null,
                MUNICIPIO || null,
                ESTADO || null,
                OBSERVACIONES || null,
                TOTAL || 0,
                PARTIDAS || 0,
                PIEZAS || 0,
                routeName || null,
                routeName || null,
                TIPO || null,
                DIRECCION || null,
                TELEFONO || null,
                CORREO || null,
                EJECUTIVO_VTAS || null,
                GUIA || null,
                tipo_original || null
            ]);

            insertados++;
        }

        await connection.commit();
        return { insertados, duplicados };

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const obtenerRutas = async (fecha) => {
    // Si no viene fecha, usa hoy
    const fechaFiltro = fecha || new Date().toISOString().split('T')[0];

    const [rows] = await pool.query(`
        SELECT 
            r.id,
            r.routeName,
            r.FECHA,
            r.NO_ORDEN,
            r.NO_FACTURA,
            r.NUM_CLIENTE,
            r.NOMBRE_DEL_CLIENTE,
            r.ZONA,
            r.MUNICIPIO,
            r.ESTADO,
            r.TOTAL,
            r.PARTIDAS,
            r.PIEZAS,
            r.TIPO,
            r.TRANSPORTE,
            r.PAQUETERIA,
            r.GUIA,
            r.tipo_original,
            r.created_at,

            CASE 
                WHEN EXISTS (
                    SELECT 1 FROM pedido_finalizado pf 
                    WHERE pf.no_orden = r.NO_ORDEN
                ) THEN 'FINALIZADO'
                WHEN EXISTS (
                    SELECT 1 FROM pedidos_embarques pe 
                    WHERE pe.no_orden = r.NO_ORDEN
                ) THEN 'EMBARQUE'
                WHEN EXISTS (
                    SELECT 1 FROM pedidos_surtiendo ps 
                    WHERE ps.no_orden = r.NO_ORDEN
                ) THEN 'SURTIDO'
                ELSE 'NO ASIGNADO'
            END AS status_pedido

        FROM rutas r
        WHERE DATE(r.created_at) = ?
        ORDER BY r.routeName ASC, r.created_at DESC
    `, [fechaFiltro]);

    const agrupadas = {};
    rows.forEach(row => {
        const ruta = row.routeName || 'Sin Ruta';
        if (!agrupadas[ruta]) {
            agrupadas[ruta] = {
                routeName: ruta,
                pedidos: [],
                total: 0,
                partidas: 0,
                piezas: 0,
            };
        }
        agrupadas[ruta].pedidos.push(row);
        agrupadas[ruta].total += Number(row.TOTAL) || 0;
        agrupadas[ruta].partidas += Number(row.PARTIDAS) || 0;
        agrupadas[ruta].piezas += Number(row.PIEZAS) || 0;
    });

    return Object.values(agrupadas);
};


const obtenerPedidosPorFecha = async (fecha) => {
    const fechaFiltro = fecha || new Date().toISOString().split('T')[0].substring(0, 7); // 'YYYY-MM'

    const [rows] = await pool.query(`
        SELECT DISTINCT
            s.id, s.no_orden, s.nombre_cliente, s.num_consigna,
            s.tpo_original, s.fecha, s.fecha_factura, s.correo, s.ejecutivo,
            s.estado, s.municipio, s.direccion, s.postal,
            s.ruta, s.zona, s.telefono, s.referencia,
            s.observaciones, s.no_factura, s.partidas,
            s.piezas, s.total, s.total_con_iva,
            s.registro, s.status, s.entrega
        FROM sanced s
        INNER JOIN pedido_finalizado pf ON pf.no_orden = s.no_orden
        WHERE DATE_FORMAT(s.fecha_factura, '%Y-%m') = ?
        ORDER BY s.fecha_factura ASC, s.registro DESC
    `, [fechaFiltro]);

    return rows;
};

// ✅ NUEVA - Actualizar status y entrega de un pedido
const actualizarStatusEntrega = async (no_orden, status, entrega) => {
    const [result] = await pool.query(`
        UPDATE sanced 
        SET status = ?, entrega = ?
        WHERE no_orden = ?
    `, [status || null, entrega || null, no_orden]);

    return result;
};

const registrarEntregaPaqueteria = async (data) => {
    const { no_orden, nombre_cliente, monto, cantidad, observaciones, fecha_entrega } = data;
    const [result] = await pool.query(`
        INSERT INTO entregas_paqueteria 
        (no_orden, nombre_cliente, monto, cantidad, observaciones, fecha_entrega)
        VALUES (?, ?, ?, ?, ?, ?)
    `, [no_orden, nombre_cliente, monto, cantidad, observaciones, fecha_entrega]);
    return result;
};

// Nueva función - Pedidos finalizados con coincidencia de tipo
const obtenerPedidosFinalizadosPorTipo = async () => {
    const [rows] = await pool.query(`
        SELECT 
            s.no_orden,
            s.tpo_original,
            s.fecha,
            s.no_factura,
            s.fecha_factura,
            s.nombre_cliente,
            s.num_consigna,
            s.direccion,
            s.partidas,
            s.piezas,
            s.total_con_iva
        FROM sanced s
        WHERE EXISTS (
            SELECT 1
            FROM pedido_finalizado pf
            WHERE pf.no_orden = s.no_orden
              AND pf.tipo = s.tpo_original
        )
    `);

    return rows;
};


module.exports = { insertarRutas, obtenerRutas, obtenerPedidosPorFecha, actualizarStatusEntrega, registrarEntregaPaqueteria, obtenerPedidosFinalizadosPorTipo };