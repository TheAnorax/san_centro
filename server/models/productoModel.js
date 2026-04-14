const db = require('../db');

const Producto = {
    getAll: () => {
        const query = `
            SELECT 
                p.id,
                p.codigo,
                p.um,
                p.clave,
                p.descripcion,
                p.barcode_pz,
                p.barcode_master,
                p.barcode_inner,
                p.barcode_palet,
                p._pz,
                p._pq,
                p._inner,
                p._master,
                p._palet,
                p.img_pz,
                p.img_pq,
                p.img_inner,
                p.img_master,
                i.ubicacion,
                i.almacen,
                i.cant_stock_real
            FROM productos p
            INNER JOIN inventario i 
                ON p.codigo = i.codigo_producto
            WHERE 
                i.ubicacion IS NOT NULL
                AND i.ubicacion <> ''
            ORDER BY p.codigo ASC;
        `;
        return db.query(query);
    },

    create: (producto) => {
        return db.query('INSERT INTO productos SET ?', [producto]);
    },

    update: (id, producto) => {
        return db.query('UPDATE productos SET ? WHERE id = ?', [producto, id]);
    },

    delete: (id) => {
        return db.query('DELETE FROM productos WHERE id = ?', [id]);
    },

    // ✅ Códigos negados
    getCodigosNegados: () => {
        const query = `
            SELECT 
                pf.codigo_pedido,
                p.descripcion,
                p.clave,
                SUM(pf.cant_no_enviada) AS total_no_enviada,
                pf.motivo,
                pf.no_orden,
                pf.tipo,
                pf.registro_fin
            FROM pedido_finalizado pf
            LEFT JOIN productos p ON pf.codigo_pedido = p.codigo
            WHERE pf.cant_no_enviada > 0
              AND pf.motivo IS NOT NULL
              AND pf.motivo != ''
            GROUP BY 
                pf.codigo_pedido,
                p.descripcion,
                p.clave,
                pf.motivo,
                pf.no_orden,
                pf.tipo,
                pf.registro_fin
            ORDER BY pf.registro_fin DESC
        `;
        return db.query(query);
    }
};

module.exports = Producto;