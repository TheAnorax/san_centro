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



/**
 * agregarPedidoSurtiendo — con soporte de fusión de órdenes
 *
 * Cambios respecto a la versión anterior:
 *  - Recibe `ordenes: [{ no_orden, tipo }]` en lugar de un solo no_orden/tipo
 *  - Si dos órdenes tienen el mismo codigo_pedido → se fusionan en un solo registro
 *      · no_orden  = "135-20799"
 *      · tipo      = "CD-VQ"
 *      · cantidad  = suma de ambas
 *      · unido     = 1
 *  - Los productos que solo aparecen en una orden se insertan normalmente (unido = 0)
 */
const agregarPedidoSurtiendo = async ({ ordenes, bahias, usuario, modo }) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Datos del primer pedido — todos los productos irán ba
        // jo este no_orden
        const primerOrden   = ordenes[0].no_orden;
        const primerTipo = ordenes.map(o => o.tipo).join('-');  // 'CD-VQ'
        // String que identifica la fusión, ej: "135-20799"
        const ordenesUnidas = ordenes.map(o => o.no_orden).join('-');
        const bahiasString  = bahias.join(', ');

        // ── 1. Cargar productos de TODAS las órdenes ──────────────────────────
        const todosLosProductos = [];
        for (const { no_orden, tipo } of ordenes) {
            const [rows] = await conn.query(`
                SELECT p.*, inventario.ubicacion
                FROM pedidos p
                LEFT JOIN inventario ON p.codigo_pedido = inventario.codigo_producto
                WHERE p.no_orden = ? AND p.tipo = ?
            `, [no_orden, tipo]);

            rows.forEach(r => todosLosProductos.push({ ...r, _origen_orden: no_orden }));
        }

        // ── 2. Agrupar por codigo_pedido → detectar si está en ambas órdenes ──
        const porCodigo = {};
        for (const prod of todosLosProductos) {
            const key = prod.codigo_pedido;
            if (!porCodigo[key]) porCodigo[key] = [];
            porCodigo[key].push(prod);
        }

        // ── 3. Construir lista final ───────────────────────────────────────────
        // Todos van con no_orden del primero y ordenes_unidas
        // unido=1 si el código estaba en las dos órdenes (cantidades sumadas)
        // unido=0 si el código solo estaba en una (cantidad original)
        const productosFinales = [];

        for (const grupo of Object.values(porCodigo)) {
            const estaEnAmbas   = grupo.length > 1;
            const cantidadFinal = estaEnAmbas
                ? grupo.reduce((sum, p) => sum + Number(p.cantidad), 0)
                : grupo[0].cantidad;

            productosFinales.push({
                ...grupo[0],                        // base del primer registro
                no_orden_final:  primerOrden,       // ← siempre el primero
                tipo_final:      primerTipo,        // ← tipo del primero
                cantidad_final:  cantidadFinal,
                unido:           estaEnAmbas ? 1 : 0,
                ordenes_unidas:  ordenesUnidas,     // ← "135-20799" en todos
            });
        }

        // ── 4. INSERT según modo ──────────────────────────────────────────────
        for (const prod of productosFinales) {
            let id_usuario_final = Number(usuario);

            if (modo === 'cuarto') {
                const cuarto = prod.ubicacion?.split('-')[0]?.trim();
                const [responsableRows] = await conn.query(`
                    SELECT id_usuario FROM responsables_cuarto WHERE cuarto = ? LIMIT 1
                `, [cuarto]);
                id_usuario_final = responsableRows[0]?.id_usuario ?? null;
            }

            await conn.query(`
                INSERT INTO pedidos_surtiendo (
                    no_orden, tipo, codigo_pedido, clave, cantidad, cant_surtida, cant_no_enviada,
                    um, _bl, _pz, _pq, _inner, _master, ubi_bahia, estado, avance, id_usuario,
                    registro, inicio_surtido, fin_surtido, unido, ordenes_unidas
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'S', ?, ?, ?, ?, ?, ?, ?)
            `, [
                prod.no_orden_final, prod.tipo_final, prod.codigo_pedido, prod.clave,
                prod.cantidad_final, prod.cant_surtida, prod.cant_no_enviada,
                prod.um, prod._bl, prod._pz, prod._pq, prod._inner, prod._master,
                bahiasString, prod.avance, id_usuario_final,
                prod.registro, prod.inicio_surtido, prod.fin_surtido,
                prod.unido, prod.ordenes_unidas
            ]);
        }

        // ── 5. Actualizar bahías ──────────────────────────────────────────────
        for (const bahia of bahias) {
            await conn.query(`
                UPDATE bahias SET estado = 1, id_pdi = ?, ingreso = CURDATE()
                WHERE bahia = ?
            `, [primerOrden, bahia]);
        }

        // ── 6. Borrar ambos pedidos originales ────────────────────────────────
        for (const { no_orden, tipo } of ordenes) {
            await conn.query(`
                DELETE FROM pedidos WHERE no_orden = ? AND tipo = ?
            `, [no_orden, tipo]);
        }

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
