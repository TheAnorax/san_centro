const pool = require('../db');

// Obtener todos los pedidos en proceso de surtido
const getPedidosSurtiendo = async () => {
    const [rows] = await pool.query(`
        SELECT ps.*, u.nombre AS nombre_usuario
        FROM pedidos_surtiendo ps
        LEFT JOIN usuarios u ON ps.id_usuario = u.id
        ORDER BY ps.no_orden DESC
    `);
    return rows;
};

// Mover el pedido completo a la tabla de embarques
const moverPedidoASurtidoFinalizado = async (noOrden) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Obtener todos los productos de ese pedido
        const [productos] = await connection.query(
            `SELECT * FROM pedidos_surtiendo WHERE no_orden = ?`, [noOrden]
        );

        if (productos.length === 0) {
            throw new Error("No se encontraron productos para este pedido.");
        }

        // 2. Validar que todos los productos están surtidos (cantidad === cant_surtida + cant_no_enviada)
        const incompletos = productos.filter(p => Number(p.cantidad) !== (Number(p.cant_surtida) + Number(p.cant_no_enviada)));
        if (incompletos.length > 0) {
            throw new Error("El pedido aún no está completamente surtido.");
        }

        // 3. Insertar cada producto en la tabla de pedidos_embarques
        for (const p of productos) {
            await connection.query(`
                INSERT INTO pedidos_embarques (
                    no_orden, tipo, codigo_pedido, clave, cantidad, cant_surtida, cant_no_enviada,
                    um, _bl, _pz, _pq, _inner, _master, ubi_bahia, estado, id_usuario,
                    id_usuario_paqueteria, registro, inicio_surtido, fin_surtido
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                p.no_orden, p.tipo, p.codigo_pedido, p.clave, p.cantidad, p.cant_surtida, p.cant_no_enviada,
                p.um, p._bl, p._pz, p._pq, p._inner, p._master, p.ubi_bahia, p.estado, p.id_usuario,
                p.id_usuario_paqueteria, p.registro, p.inicio_surtido, p.fin_surtido
            ]);
        }

        // 4. Eliminar de la tabla de surtido
        await connection.query(`DELETE FROM pedidos_surtiendo WHERE no_orden = ?`, [noOrden]);

        await connection.commit();
        return { ok: true, mensaje: "Pedido movido correctamente a embarques." };

    } catch (error) {
        await connection.rollback();
        return { ok: false, mensaje: error.message };
    } finally {
        connection.release();
    }
};

const getPedidosEmbarque = async () => {
    const [rows] = await pool.query(`
        SELECT 
            pe.no_orden,
            pe.tipo,
            pe.ubi_bahia,
            pe.id_usuario,
            pe.codigo_pedido,
            pe._pz, pe._pq, pe._inner, pe._master,
            pe.v_pz, pe.v_pq, pe.v_inner, pe.v_master,
            u.nombre AS nombre_usuario
        FROM pedidos_embarques pe
        LEFT JOIN usuarios u ON pe.id_usuario = u.id
        ORDER BY pe.no_orden DESC
    `);
    return rows;
};

const moverPedidoAFinalizado = async (noOrden) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Obtener los productos del pedido
        const [productos] = await connection.query(
            `SELECT * FROM pedidos_embarques WHERE no_orden = ?`,
            [noOrden]
        );

        if (productos.length === 0) {
            throw new Error("No se encontraron productos en embarques para este pedido.");
        }

        // Insertar en tabla finalizada con estado 'F'
        for (const p of productos) {
            await connection.query(`
                    INSERT INTO pedido_finalizado (
                        no_orden, tipo, codigo_pedido, clave, cantidad, cant_surtida, cant_no_enviada,
                        um,  _pz, _pq, _inner, _master,
                        v_pz, v_pq, v_inner, v_master,
                        ubi_bahia, estado, id_usuario, id_usuario_paqueteria, registro,
                        inicio_surtido, fin_surtido, inicio_embarque, fin_embarque,
                        unido, registro_surtido, registro_embarque, caja, motivo,
                        unificado, registro_fin, id_usuario_surtido,
                        fusion, tipo_caja, cajas
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                p.no_orden, p.tipo, p.codigo_pedido, p.clave, p.cantidad, p.cant_surtida, p.cant_no_enviada,
                p.um, p._pz, p._pq, p._inner, p._master,
                p.v_pz, p.v_pq, p.v_inner, p.v_master,
                p.ubi_bahia, 'F', // estado fijo
                p.id_usuario, p.id_usuario_paqueteria, p.registro,
                p.inicio_surtido, p.fin_surtido, p.inicio_embarque, p.fin_embarque,
                p.unido, p.registro_surtido, p.registro_embarque, p.caja, p.motivo,
                p.unificado, null, null, // registro_fin, id_usuario_surtido
                p.fusion, p.tipo_caja, p.cajas
            ]);

        }

        // Eliminar de embarques
        await connection.query(`DELETE FROM pedidos_embarques WHERE no_orden = ?`, [noOrden]);

        await connection.commit();
        return { ok: true, mensaje: "Pedido finalizado correctamente." };
    } catch (error) {
        await connection.rollback();
        return { ok: false, mensaje: error.message };
    } finally {
        connection.release();
    }
};

const getpedidosFinalizados = async () => {
    const [rows] = await pool.query(`
        SELECT 
            pf.no_orden,
            pf.tipo,
            pf.ubi_bahia,
            pf.id_usuario,
            u.nombre AS nombre_usuario,
            pf.cantidad,
            pf.codigo_pedido,
            pf.cant_surtida,
            pf.cant_no_enviada
        FROM pedido_finalizado pf
        LEFT JOIN usuarios u ON pf.id_usuario = u.id
        GROUP BY pf.no_orden, pf.tipo, pf.ubi_bahia, pf.id_usuario, u.nombre
        ORDER BY pf.no_orden DESC
    `);
    return rows;
};





module.exports = { getPedidosSurtiendo, moverPedidoASurtidoFinalizado, getPedidosEmbarque, moverPedidoAFinalizado, getpedidosFinalizados };
