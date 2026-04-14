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

const obtenerRutas = async () => {
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

            -- ✅ Status del pedido
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
        ORDER BY r.routeName ASC, r.created_at DESC
    `);

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

module.exports = { insertarRutas, obtenerRutas };