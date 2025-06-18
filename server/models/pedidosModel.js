// models/pedidoModel.js
const pool = require('../db');

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
            p.estado
        FROM pedidos p
        WHERE p.no_orden = ?
    `, [no_orden]);
    return rows;
};


const getPedidosConProductos = async () => {
    const [rows] = await pool.query(`
        SELECT 
            p.no_orden, p.tipo, p.registro,
            pr.codigo_pedido, pr.clave, pr.cantidad, pr.um, pr.ubi_bahia as ubi, pr.estado, pr.avance
        FROM pedidos AS pr
        INNER JOIN (
            SELECT DISTINCT no_orden, tipo, registro
            FROM pedidos
        ) AS p ON p.no_orden = pr.no_orden
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
            avance: row.avance
        });
    });
    return Object.values(pedidosMap);
};


module.exports = { getProductosPorOrden, getPedidosConProductos };
