const pool = require('../db');


async function obtenerKpiProductividad(fecha) {

    const filtro = fecha ? `'${fecha}'` : 'CURDATE()';

    const [rows] = await pool.query(`
      SELECT 
          u.id AS id_usuario,
          u.nombre,
          COUNT(DISTINCT resumen.no_orden) AS pedidos_del_dia,
          SUM(resumen.total_partidas) AS total_partidas,
          SUM(resumen.total_piezas) AS total_piezas,
          SEC_TO_TIME(SUM(resumen.segundos_trabajados)) AS tiempo_total
      FROM (

          -- 🟦 SURTIDO
          SELECT 
              ps.id_usuario,
              ps.no_orden,
              COUNT(*) AS total_partidas,
              SUM(ps.cant_surtida) AS total_piezas,
              SUM(TIMESTAMPDIFF(SECOND, ps.inicio_surtido, ps.fin_surtido)) AS segundos_trabajados
          FROM pedidos_surtiendo ps
          WHERE DATE(ps.inicio_surtido) = ${filtro}
            AND ps.fin_surtido IS NOT NULL
          GROUP BY ps.id_usuario, ps.no_orden

          UNION ALL

          -- 🟧 EMBARQUES
          SELECT 
              pe.id_usuario,
              pe.no_orden,
              COUNT(*) AS total_partidas,
              SUM(pe.cant_surtida) AS total_piezas,
              SUM(TIMESTAMPDIFF(SECOND, pe.inicio_surtido, pe.fin_surtido)) AS segundos_trabajados
          FROM pedidos_embarques pe
          WHERE DATE(pe.inicio_surtido) = ${filtro}
            AND pe.fin_surtido IS NOT NULL
          GROUP BY pe.id_usuario, pe.no_orden

          UNION ALL

          -- 🟥 FINALIZADO
          SELECT 
              pf.id_usuario,
              pf.no_orden,
              COUNT(*) AS total_partidas,
              SUM(pf.cant_surtida) AS total_piezas,
              SUM(TIMESTAMPDIFF(SECOND, pf.inicio_surtido, pf.fin_surtido)) AS segundos_trabajados
          FROM pedido_finalizado pf
          WHERE DATE(pf.inicio_surtido) = ${filtro}
            AND pf.fin_surtido IS NOT NULL
          GROUP BY pf.id_usuario, pf.no_orden

      ) AS resumen
      INNER JOIN usuarios u ON u.id = resumen.id_usuario
      GROUP BY resumen.id_usuario;
    `);

    return rows;
}



async function obtenerKpiEmbarques(fecha) {

    const filtro = fecha ? `'${fecha}'` : 'CURDATE()';

    const query = `
        SELECT 
            r.id_usuario_paqueteria,
            u.nombre AS nombre_usuario,

            COUNT(DISTINCT r.no_orden) AS pedidos_del_dia,
            SUM(r.total_partidas) AS total_partidas,
            SUM(r.total_piezas) AS total_piezas,
            SEC_TO_TIME(SUM(r.segundos_trabajados)) AS tiempo_total

        FROM (
            SELECT 
                pe.id_usuario_paqueteria,
                pe.no_orden,
                COUNT(*) AS total_partidas,
                SUM(pe.cant_surtida) AS total_piezas,
                SUM(TIMESTAMPDIFF(SECOND, pe.inicio_embarque, pe.fin_embarque)) AS segundos_trabajados
            FROM pedidos_embarques pe
            WHERE DATE(pe.inicio_embarque) = ${filtro}
              AND pe.fin_embarque IS NOT NULL
            GROUP BY pe.id_usuario_paqueteria, pe.no_orden

            UNION ALL

            SELECT 
                pf.id_usuario_paqueteria,
                pf.no_orden,
                COUNT(*) AS total_partidas,
                SUM(pf.cant_surtida) AS total_piezas,
                SUM(TIMESTAMPDIFF(SECOND, pf.inicio_embarque, pf.fin_embarque)) AS segundos_trabajados
            FROM pedido_finalizado pf
            WHERE DATE(pf.inicio_embarque) = ${filtro}
              AND pf.fin_embarque IS NOT NULL
            GROUP BY pf.id_usuario_paqueteria, pf.no_orden
        ) AS r

        LEFT JOIN usuarios u ON u.id = r.id_usuario_paqueteria
        GROUP BY r.id_usuario_paqueteria, u.nombre;
    `;

    const [rows] = await pool.query(query);
    return rows;
}


module.exports = {
    obtenerKpiEmbarques,
    obtenerKpiProductividad
};