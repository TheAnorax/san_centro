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

    getById: (id) => {
        return db.query('SELECT * FROM productos WHERE id = ?', [id]);
    },

    create: (producto) => {
        return db.query('INSERT INTO productos SET ?', [producto]);
    },

    update: (id, producto, nombreUsuario) => {
        const {
            ubicacion,
            almacen,
            cant_stock_real,
            modificado_por,
            ...soloProducto
        } = producto;

        return new Promise(async (resolve, reject) => {
            try {
                const [actual] = await db.query(
                    'SELECT * FROM productos WHERE id = ?', [id]
                );
                const productoActual = actual[0];

                const cambios = [];
                for (const campo in soloProducto) {
                    const valorAnterior = productoActual[campo]?.toString() ?? '';
                    const valorNuevo = soloProducto[campo]?.toString() ?? '';

                    if (valorAnterior !== valorNuevo) {
                        cambios.push({
                            producto_id: id,
                            codigo: soloProducto.codigo,
                            campo,
                            valor_anterior: valorAnterior,
                            valor_nuevo: valorNuevo,
                            modificado_por: nombreUsuario,
                        });
                    }
                }

                await db.query('UPDATE productos SET ? WHERE id = ?', [soloProducto, id]);

                if (cambios.length > 0) {
                    for (const cambio of cambios) {
                        await db.query('INSERT INTO productos_historial SET ?', [cambio]);
                    }
                }

                resolve({ ok: true, cambios: cambios.length });
            } catch (err) {
                reject(err);
            }
        });
    },

    delete: (id) => {
        return db.query('DELETE FROM productos WHERE id = ?', [id]);
    },

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
    },

    // ✅ NUEVA — códigos más solicitados por número de órdenes
    getCodigosMasSolicitados: () => {
        const query = `
            SELECT 
                pf.codigo_pedido,
                p.descripcion,
                p.clave,
                p.img_pz,
                COUNT(DISTINCT pf.no_orden) AS total_ordenes,
                SUM(pf.cantidad) AS total_cantidad
            FROM pedido_finalizado pf
            LEFT JOIN productos p ON pf.codigo_pedido = p.codigo
            GROUP BY 
                pf.codigo_pedido,
                p.descripcion,
                p.clave,
                p.img_pz
            ORDER BY total_ordenes DESC
            LIMIT 50
        `;
        return db.query(query);
    },

    getHistorial: () => {
        const query = `
            SELECT 
                campo,
                valor_anterior,
                valor_nuevo,
                modificado_por,
                codigo,
                fecha
            FROM productos_historial
            ORDER BY fecha DESC
            LIMIT 500
        `;
        return db.query(query);
    }
};

module.exports = Producto;