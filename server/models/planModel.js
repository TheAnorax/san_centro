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


// Reemplaza las DOS funciones obtenerPedidosPorFecha por esta única:
const obtenerPedidosPorFecha = async (fecha) => {
    const fechaFiltro = fecha || new Date().toISOString().split('T')[0].substring(0, 7);

    const [rows] = await pool.query(`
        SELECT DISTINCT
            s.id, s.no_orden, s.nombre_cliente, s.num_consigna,
            s.tpo_original, s.fecha, s.fecha_factura, s.correo, s.ejecutivo,
            s.estado, s.municipio, s.direccion, s.postal,
            s.ruta, s.zona, s.telefono, s.referencia,
            s.observaciones, s.no_factura, s.partidas,
            s.piezas, s.total, s.total_con_iva,
            s.registro, s.status, s.entrega,
            s.fecha_entrega,
            s.costos                                -- 👈 esto faltaba
        FROM sanced s
        INNER JOIN pedido_finalizado pf ON pf.no_orden = s.no_orden
        WHERE DATE_FORMAT(s.fecha_factura, '%Y-%m') = ?
        ORDER BY s.fecha_factura ASC, s.registro DESC
    `, [fechaFiltro]);

    return rows;
};

// Agrega esta función que faltaba completamente:
const actualizarStatusEntrega = async (no_orden, status, entrega, fecha_entrega, costos) => {
    const [result] = await pool.query(`
        UPDATE sanced 
        SET status = ?, entrega = ?, fecha_entrega = ?, costos = ?
        WHERE no_orden = ?
    `, [status || null, entrega || null, fecha_entrega || null, costos || null, no_orden]);
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
const obtenerPedidosPorFactura = async (no_factura) => {
    const [rows] = await pool.query(`
        SELECT 
            s.num_consigna   AS clave_dir,
            s.nombre_cliente AS nombre,
            s.no_orden       AS orden,
            s.tpo_original   AS tipo,
            s.direccion,
            DATE_FORMAT(s.fecha_factura, '%d-%m-%Y') AS fecha_entrega,
            s.no_factura     AS numero_factura
        FROM sanced s
        WHERE EXISTS (
            SELECT 1
            FROM pedido_finalizado pf
            WHERE pf.no_orden = s.no_orden
              AND pf.tipo = s.tpo_original
        )
        AND s.no_factura = ?
    `, [no_factura]);
    return rows;
};

const obtenerPedidosFinalizadosPorMes = async (anio, mes) => {
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
            s.total,
            s.total_con_iva
        FROM sanced s
        WHERE EXISTS (
            SELECT 1
            FROM pedido_finalizado pf
            WHERE pf.no_orden = s.no_orden
              AND pf.tipo = s.tpo_original
        )
        AND YEAR(s.fecha_factura) = ?
        AND MONTH(s.fecha_factura) = ?
    `, [anio, mes]);
    return rows;
};


const obtenerHistoricoCrossDocking = async (anio) => {
    const year = anio || new Date().getFullYear();
    const from = `${year}-01-01`;
    const to   = `${year + 1}-01-01`;

    const [rows] = await pool.query(`
        SELECT
          f.mes,
          f.total_pedidos,
          f.total_codigos,
          f.total_facturado,
          f.total_facturado_iva,
          f.total_flete,
          ROUND((f.total_flete / NULLIF(f.total_facturado, 0)) * 100, 2) AS pct_flete,
          f.promedio_dias_entrega,
          f.total_clientes,
          IFNULL(l.total_cajas,   0) AS total_cajas,
          IFNULL(l.total_tarimas, 0) AS total_tarimas
        FROM (
          SELECT
            DATE_FORMAT(s.fecha_factura, '%Y-%m')                AS mes,
            COUNT(DISTINCT s.no_orden)                            AS total_pedidos,
            SUM(pf.total_codigos)                                 AS total_codigos,
            SUM(s.total)                                          AS total_facturado,
            SUM(s.total_con_iva)                                  AS total_facturado_iva,
            SUM(CAST(IFNULL(s.costos, 0) AS DECIMAL(12,2)))      AS total_flete,
            ROUND(AVG(DATEDIFF(s.fecha_entrega, s.fecha)), 1)    AS promedio_dias_entrega,
            COUNT(DISTINCT s.nombre_cliente)                      AS total_clientes
          FROM sanced s
          INNER JOIN (
            -- ✅ Pre-agrupamos pedido_finalizado: 1 fila por orden+tipo
            SELECT
              no_orden,
              tipo,
              COUNT(id_pedi)            AS total_codigos,
              MIN(codigo_pedido)        AS codigo_pedido
            FROM pedido_finalizado
            GROUP BY no_orden, tipo
          ) pf
            ON  pf.no_orden = CAST(s.no_orden AS UNSIGNED)
            AND pf.tipo     = s.tpo_original
          WHERE s.status = 'finalizado'
            AND s.fecha_factura >= ?
            AND s.fecha_factura <  ?
          GROUP BY DATE_FORMAT(s.fecha_factura, '%Y-%m')
        ) f
        LEFT JOIN (
          SELECT
            DATE_FORMAT(s.fecha_factura, '%Y-%m')                AS mes,
            COUNT(DISTINCT
              CASE WHEN UPPER(TRIM(pf.tipo_caja)) NOT LIKE 'TARIMA%'
                        AND pf.caja IS NOT NULL
                   THEN CONCAT(pf.no_orden, '-', pf.caja)
              END
            )                                                     AS total_cajas,
            COUNT(DISTINCT
              CASE WHEN UPPER(TRIM(pf.tipo_caja)) LIKE 'TARIMA%'
                        AND pf.caja IS NOT NULL
                   THEN CONCAT(pf.no_orden, '-', pf.caja)
              END
            )                                                     AS total_tarimas
          FROM pedido_finalizado pf
          INNER JOIN sanced s
            ON  pf.no_orden = CAST(s.no_orden AS UNSIGNED)
            AND pf.tipo     = s.tpo_original
          WHERE s.status = 'finalizado'
            AND s.fecha_factura >= ?
            AND s.fecha_factura <  ?
          GROUP BY DATE_FORMAT(s.fecha_factura, '%Y-%m')
        ) l ON f.mes = l.mes
        ORDER BY f.mes
    `, [from, to, from, to]);

    return rows;
};
module.exports = { obtenerHistoricoCrossDocking,insertarRutas, obtenerRutas, obtenerPedidosPorFecha, actualizarStatusEntrega, registrarEntregaPaqueteria, obtenerPedidosPorFactura, obtenerPedidosFinalizadosPorMes };