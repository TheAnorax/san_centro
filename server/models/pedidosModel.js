const pool = require('../db');

// ...otros métodos...

const getProductosPorOrden = async (no_orden) => {
    const [rows] = await pool.query(`
        SELECT 
            p.no_orden, 
            p.tipo, 
            p.registro,
            p.codigo_pedido, 
            p.clave,
            p.cantidad, 
            p.ubi_bahia AS ubi, 
            p.estado,
            productos.descripcion,
            inventario.ubicacion
        FROM pedidos p
        LEFT JOIN productos ON p.codigo_pedido = productos.codigo
        LEFT JOIN inventario ON p.codigo_pedido = inventario.codigo_producto
        WHERE p.no_orden = ?
    `, [no_orden]);
    return rows;
};

const getPedidosConProductos = async () => {
    const [rows] = await pool.query(`
        SELECT 
            p.no_orden, p.tipo, p.registro,
            pr.codigo_pedido, pr.clave, pr.cantidad, pr.um, 
            pr.ubi_bahia as ubi, pr.estado, pr.avance,
            productos.descripcion,
            inventario.ubicacion,

            CASE 
                WHEN EXISTS (
                    SELECT 1 FROM pedidos_embarques pe 
                    WHERE pe.no_orden = pr.no_orden
                ) THEN 'EN EMBARQUE'
                WHEN EXISTS (
                    SELECT 1 FROM pedidos_surtiendo ps 
                    WHERE ps.no_orden = pr.no_orden
                ) THEN 'EN SURTIDO'
                ELSE 'PENDIENTE'
            END AS estado_proceso

        FROM pedidos AS pr
        INNER JOIN (
            SELECT DISTINCT no_orden, tipo, registro
            FROM pedidos
        ) AS p ON p.no_orden = pr.no_orden
        LEFT JOIN productos ON pr.codigo_pedido = productos.codigo
        LEFT JOIN inventario ON pr.codigo_pedido = inventario.codigo_producto

        WHERE NOT EXISTS (
            SELECT 1 FROM pedido_finalizado pf
            WHERE pf.no_orden = pr.no_orden
        )
        ORDER BY p.no_orden DESC, pr.id_pedi ASC
    `);

    const pedidosMap = {};
    rows.forEach(row => {
        const key = row.no_orden;
        if (!pedidosMap[key]) {
            pedidosMap[key] = {
                no_orden: row.no_orden,
                tipo: row.tipo,
                registro: row.registro,
                estado_proceso: row.estado_proceso, // ✅ NUEVO
                productos: []
            };
        }
        pedidosMap[key].productos.push({
            codigo_pedido: row.codigo_pedido,
            clave: row.clave,
            cantidad: row.cantidad,
            um: row.um,
            ubi: row.ubi,
            estado: row.estado,
            avance: row.avance,
            descripcion: row.descripcion,
            ubicacion: row.ubicacion
        });
    });

    return Object.values(pedidosMap);
};

const ObtenerBahias = async () => {
    const [rows] = await pool.query(`
        SELECT DISTINCT bahia FROM bahias WHERE estado IS NULL OR estado = ''
    `);
    return rows;
};

const ObtenerUsuarios = async () => {
    const [rows] = await pool.query(`
        SELECT DISTINCT nombre, id AS id_usuario FROM usuarios WHERE rol_id = '2'
    `);
    return rows;
};

// Nuevo: obtener id_usuario por nombre
const obtenerIdUsuario = async () => {
    const [rows] = await pool.query(`
        SELECT id AS id_usuario, nombre FROM usuarios WHERE rol_id = '2'
    `);
    return rows;
};


// Nuevo: obtener id_bahia por nombre
const obtenerIdBahia = async (bahia) => {
    const [rows] = await pool.query('SELECT id_bahia FROM bahias WHERE bahia = ?', [bahia]);
    return rows[0]?.id || null;
};



const agregarPedidoSurtiendo = async ({ no_orden, tipo, bahias, usuario, modo }) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [productos] = await conn.query(`
            SELECT p.*, inventario.ubicacion
            FROM pedidos p
            LEFT JOIN inventario ON p.codigo_pedido = inventario.codigo_producto
            WHERE p.no_orden = ? AND p.tipo = ?
        `, [no_orden, tipo]);

        const bahiasString = bahias.join(', ');

        if (modo === 'cuarto') {
            // ✅ MODO CUARTO — reparte por responsable de cuarto
            const cuartosUnicos = [...new Set(
                productos.map(p => p.ubicacion?.split('-')[0]?.trim()).filter(Boolean)
            )];

            let responsables = [];
            if (cuartosUnicos.length) {
                const placeholders = cuartosUnicos.map(() => '?').join(',');
                const [rows] = await conn.query(`
                    SELECT rc.cuarto, rc.id_usuario
                    FROM responsables_cuarto rc
                    WHERE rc.cuarto IN (${placeholders})
                `, cuartosUnicos);
                responsables = rows;
            }

            for (const prod of productos) {
                const cuarto = prod.ubicacion?.split('-')[0]?.trim();
                const responsable = responsables.find(r => r.cuarto === cuarto);
                const id_usuario_final = responsable ? responsable.id_usuario : null;

                await conn.query(`
                    INSERT INTO pedidos_surtiendo (
                        no_orden, tipo, codigo_pedido, clave, cantidad, cant_surtida, cant_no_enviada,
                        um, _bl, _pz, _pq, _inner, _master, ubi_bahia, estado, avance, id_usuario,
                        registro, inicio_surtido, fin_surtido, unido
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'S', ?, ?, ?, ?, ?, ?)
                `, [
                    prod.no_orden, prod.tipo, prod.codigo_pedido, prod.clave,
                    prod.cantidad, prod.cant_surtida, prod.cant_no_enviada,
                    prod.um, prod._bl, prod._pz, prod._pq, prod._inner, prod._master,
                    bahiasString, prod.avance, id_usuario_final,
                    prod.registro, prod.inicio_surtido, prod.fin_surtido, prod.unido
                ]);
            }

        } else {
            // ✅ MODO INDIVIDUAL — todos van al mismo usuario
            const id_usuario_final = Number(usuario);

            await conn.query(`
                INSERT INTO pedidos_surtiendo (
                    no_orden, tipo, codigo_pedido, clave, cantidad, cant_surtida, cant_no_enviada,
                    um, _bl, _pz, _pq, _inner, _master, ubi_bahia, estado, avance, id_usuario,
                    registro, inicio_surtido, fin_surtido, unido
                )
                SELECT
                    no_orden, tipo, codigo_pedido, clave, cantidad, cant_surtida, cant_no_enviada,
                    um, _bl, _pz, _pq, _inner, _master, ?, 'S', avance, ?,
                    registro, inicio_surtido, fin_surtido, unido
                FROM pedidos
                WHERE no_orden = ? AND tipo = ?
            `, [bahiasString, id_usuario_final, no_orden, tipo]);
        }

        // ✅ Actualizar bahías
        for (const bahia of bahias) {
            await conn.query(`
                UPDATE bahias SET estado = 1, id_pdi = ?, ingreso = CURDATE()
                WHERE bahia = ?
            `, [no_orden, bahia]);
        }

        // ✅ Borrar pedido original
        await conn.query(`
            DELETE FROM pedidos WHERE no_orden = ? AND tipo = ?
        `, [no_orden, tipo]);

        await conn.commit();
        return { ok: true };

    } catch (err) {
        await conn.rollback();
        console.error("Error en agregarPedidoSurtiendo:", err);
        return { ok: false };
    } finally {
        conn.release();
    }
};



const liberarUsuarioPaqueteria = async (no_orden) => {
    if (!no_orden) throw new Error('Falta no_orden');

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Bloquea y suma validaciones v_*
        const [sumRows] = await conn.query(
            `
      SELECT
        SUM(COALESCE(v_pz,0) + COALESCE(v_pq,0) + COALESCE(v_inner,0) + COALESCE(v_master,0)) AS total_v
      FROM pedidos_embarques
      WHERE no_orden = ?
      FOR UPDATE
      `,
            [no_orden]
        );

        if (!sumRows.length) {
            await conn.rollback();
            return { ok: false, code: 404, message: 'Pedido no encontrado' };
        }

        const totalV = Number(sumRows[0].total_v || 0);
        if (totalV > 0) {
            await conn.rollback();
            return {
                ok: false,
                code: 409,
                message: 'No se puede liberar: existen movimientos en v_pz/v_pq/v_inner/v_master.'
            };
        }

        // Liberar: dejar NULL el usuario de paquetería
        const [upd] = await conn.query(
            `UPDATE pedidos_embarques SET id_usuario_paqueteria = NULL WHERE no_orden = ?`,
            [no_orden]
        );

        await conn.commit();
        return { ok: upd.affectedRows > 0 };
    } catch (e) {
        await conn.rollback();
        console.error('Error en liberarUsuarioPaqueteria:', e);
        return { ok: false, code: 500, message: 'Error interno' };
    } finally {
        conn.release();
    }
};



const getResponsablesCuarto = async () => {
    const [rows] = await pool.query(`
        SELECT rc.cuarto, rc.id_usuario, u.nombre
        FROM responsables_cuarto rc
        INNER JOIN usuarios u ON rc.id_usuario = u.id
        ORDER BY rc.cuarto ASC
    `);
    return rows;
};


module.exports = {
    getProductosPorOrden,
    getPedidosConProductos,
    ObtenerBahias,
    ObtenerUsuarios,
    obtenerIdUsuario,
    obtenerIdBahia,
    agregarPedidoSurtiendo,
    getResponsablesCuarto,
    liberarUsuarioPaqueteria,
    getResponsablesCuarto
};
