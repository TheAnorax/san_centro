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
            pr.codigo_pedido, pr.clave, pr.cantidad, pr.um, pr.ubi_bahia as ubi, pr.estado, pr.avance,
            productos.descripcion,
            inventario.ubicacion
        FROM pedidos AS pr
        INNER JOIN (
            SELECT DISTINCT no_orden, tipo, registro
            FROM pedidos
        ) AS p ON p.no_orden = pr.no_orden
        LEFT JOIN productos ON pr.codigo_pedido = productos.codigo
        LEFT JOIN inventario ON pr.codigo_pedido = inventario.codigo_producto
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



const agregarPedidoSurtiendo = async ({ no_orden, tipo, bahia, usuario }) => {
    const id_usuario = Number(usuario);

    if (!no_orden || !tipo || !bahia || !id_usuario) {
        throw new Error("Faltan datos obligatorios para agregar pedido surtiendo");
    }
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // INSERTA EN pedidos_surtiendo
        await conn.query(`
            INSERT INTO pedidos_surtiendo (
                no_orden, tipo, codigo_pedido, clave, cantidad, cant_surtida, cant_no_enviada,
                um, _bl, _pz, _pq, _inner, _master, ubi_bahia, estado, avance, id_usuario,
                registro, inicio_surtido, fin_surtido, unido
            )
            SELECT 
                no_orden, tipo, codigo_pedido, clave, cantidad, cant_surtida, cant_no_enviada,
                um, _bl, _pz, _pq, _inner, _master, ?, 'C', avance, ?,
                registro, inicio_surtido, fin_surtido, unido
            FROM pedidos
            WHERE no_orden = ? AND tipo = ?
        `, [bahia, usuario, no_orden, tipo]);

        // ACTUALIZA tabla bahias (opcional)
        await conn.query(`
            UPDATE bahias
            SET estado = 1, id_pdi = ?, ingreso = CURDATE()
            WHERE bahia = ?
        `, [no_orden, bahia]);

        // BORRA DE pedidos
        await conn.query(`
            DELETE FROM pedidos
            WHERE no_orden = ? AND tipo = ?
        `, [no_orden, tipo]);

        await conn.commit();
        return true;
    } catch (err) {
        await conn.rollback();
        console.error("Error en agregarPedidoSurtiendo (modelo):", err);
        return false;
    } finally {
        conn.release();
    }
};




module.exports = {
    getProductosPorOrden,
    getPedidosConProductos,
    ObtenerBahias,
    ObtenerUsuarios,
    obtenerIdUsuario,
    obtenerIdBahia,
    agregarPedidoSurtiendo
};
