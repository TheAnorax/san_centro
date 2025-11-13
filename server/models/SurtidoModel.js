const pool = require('../db');
const cron = require('node-cron');
const BahiaModel = require('../models/bahiaModel');


cron.schedule('*/1 * * * *', async () => {
    console.log("⏰ Verificando pedidos...");

    const pedidosSurtiendo = await getPedidosSurtiendo();
    const unicosSurtido = [...new Set(pedidosSurtiendo.map(p => p.no_orden))];

    let movimientos = 0;

    // 🔁 1. Verifica si se deben mover de surtido a embarques
    // for (const noOrden of unicosSurtido) {
    //     const resultado = await verificarYFinalizarPedido(noOrden);
    //     if (resultado) movimientos += 1;
    // }

    // 🔁 1. Desactivado el movimiento automático de pedidos
    for (const noOrden of unicosSurtido) {
        console.log(`⏩ Pedido ${noOrden} en surtido. Movimiento automático desactivado.`);
    }


    // 🔍 2. Traer todas las bahías activas
    const [bahiasOcupadas] = await pool.query(`
        SELECT id_bahia, bahia, id_pdi
        FROM bahias
        WHERE estado IS NOT NULL AND id_pdi IS NOT NULL
    `);

    for (const bahia of bahiasOcupadas) {
        const { id_bahia, bahia: nombreBahia, id_pdi: no_orden } = bahia;

        // 🚚 Si está en pedidos_embarques, actualiza estado a 3
        const [existeEnEmbarques] = await pool.query(`
            SELECT 1 FROM pedidos_embarques WHERE no_orden = ? LIMIT 1
        `, [no_orden]);

        if (existeEnEmbarques.length > 0) {
            await pool.query(`
                UPDATE bahias SET estado = 3 WHERE id_bahia = ?
            `, [id_bahia]);
            console.log(`🚛 Bahía ${nombreBahia} actualizada a estado 3 por estar en embarques.`);
            continue; // Ya se actualizó, no revises si está finalizado
        }

        // ✅ Si ya está en finalizado → liberamos la bahía
        const [existeFinalizado] = await pool.query(`
            SELECT 1 FROM pedido_finalizado WHERE no_orden = ? LIMIT 1
        `, [no_orden]);

        if (existeFinalizado.length > 0) {
            console.log(`🧼 Liberando bahía ${nombreBahia} (pedido ${no_orden})...`);
            await BahiaModel.liberar(nombreBahia);
        }
    }

    if (movimientos === 0) {
        console.log("⏳ No hay pedidos terminados en surtido en este ciclo.");
    }
});



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
const moverPedidoASurtidoFinalizado = async (noOrden, tipo) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1️⃣ Buscar productos del pedido y tipo específico
        const [productos] = await connection.query(`
            SELECT * 
            FROM pedidos_surtiendo 
            WHERE no_orden = ? AND UPPER(tipo) = UPPER(?)
        `, [noOrden, tipo]);

        if (productos.length === 0) {
            throw new Error("No se encontraron productos para este pedido y tipo.");
        }

        // 2️⃣ Verificar si ya existe en pedidos_embarques
        const [existe] = await connection.query(`
            SELECT 1 
            FROM pedidos_embarques 
            WHERE no_orden = ? AND UPPER(tipo) = UPPER(?) 
            LIMIT 1
        `, [noOrden, tipo]);

        if (existe.length > 0) {
            console.log(`⚠️ El pedido ${noOrden}-${tipo} ya fue movido a embarques.`);
            await connection.commit();
            return { ok: true, mensaje: "Ya estaba en embarques." };
        }

        // 3️⃣ Validar si el pedido está completo (sin incluir cancelados)
        const lineasActivas = productos.filter(p => p.estado !== 'C');
        const incompletos = lineasActivas.filter(p =>
            Number(p.cantidad) !== (Number(p.cant_surtida) + Number(p.cant_no_enviada))
        );

        if (incompletos.length > 0) {
            throw new Error(`El pedido ${noOrden}-${tipo} aún no está completamente surtido (excluyendo cancelados).`);
        }

        // 4️⃣ Mover líneas de surtido a embarques
        for (const p of productos) {
            const estadoDestino = (p.estado === 'C') ? 'C' : 'E';

            await connection.query(`
                INSERT INTO pedidos_embarques (
                    no_orden, tipo, codigo_pedido, clave, cantidad, cant_surtida, cant_no_enviada,
                    um, _bl, _pz, _pq, _inner, _master, ubi_bahia, estado, id_usuario,
                    id_usuario_paqueteria, registro, inicio_surtido, fin_surtido, motivo
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                p.no_orden, p.tipo, p.codigo_pedido, p.clave, p.cantidad, p.cant_surtida, p.cant_no_enviada,
                p.um, p._bl, p._pz, p._pq, p._inner, p._master, p.ubi_bahia, estadoDestino, p.id_usuario,
                p.id_usuario_paqueteria, p.registro, p.inicio_surtido, p.fin_surtido, p.motivo
            ]);
        }

        // 5️⃣ Eliminar del surtido una vez insertado en embarques
        await connection.query(`
            DELETE FROM pedidos_surtiendo 
            WHERE no_orden = ? AND UPPER(tipo) = UPPER(?)
        `, [noOrden, tipo]);

        await connection.commit();
        console.log(`🚚 Pedido ${noOrden}-${tipo} movido correctamente a embarques.`);
        return { ok: true, mensaje: `Pedido ${noOrden}-${tipo} movido correctamente a embarques.` };

    } catch (error) {
        await connection.rollback();
        console.error(`❌ Error al mover pedido ${noOrden}-${tipo}:`, error.message);
        return { ok: false, mensaje: error.message };
    } finally {
        connection.release();
    }
};

const obtenerPedidoPorOrdenYTipo = async (noOrden, tipo) => {
    const [rows] = await pool.query(
        `SELECT 
        no_orden, tipo, codigo_pedido, cantidad, cant_surtida, cant_no_enviada, motivo, unificado,ubi_bahia
     FROM pedidos_surtiendo
     WHERE no_orden = ? AND UPPER(tipo) = UPPER(?)
     ORDER BY codigo_pedido`,
        [noOrden, tipo]
    );
    return rows;
};

const verificarYFinalizarPedido = async (noOrden) => {
    const conn = await pool.getConnection();
    try {
        const [productos] = await conn.query(`
      SELECT cantidad, cant_surtida, cant_no_enviada, estado
      FROM pedidos_surtiendo
      WHERE no_orden = ?
    `, [noOrden]);

        if (productos.length === 0) return false;

        // 1) Ignora cancelados en el check de cantidades
        const lineasActivas = productos.filter(p => p.estado !== 'C');

        const incompletos = lineasActivas.filter(p =>
            Number(p.cantidad) !== (Number(p.cant_surtida) + Number(p.cant_no_enviada))
        );

        // 2) Acepta 'E' y 'C' como estados válidos
        const estadosInvalidos = productos.filter(p => !['E', 'C'].includes(p.estado));

        if (incompletos.length === 0 && estadosInvalidos.length === 0) {
            console.log(`🚛 Pedido ${noOrden} listo (E/C). Moviendo a embarques...`);
            const resultado = await moverPedidoASurtidoFinalizado(noOrden);
            console.log(`✅ Resultado: ${resultado.mensaje}`);
            return true;
        } else {
            return false;
        }
    } catch (err) {
        console.error("❌ Error en verificarYFinalizarPedido:", err);
        return false;
    } finally {
        conn.release();
    }
};

const moverPedidoAFinalizado = async (noOrden) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [productos] = await connection.query(
            `SELECT * FROM pedidos_embarques WHERE no_orden = ?`,
            [noOrden]
        );

        if (productos.length === 0) {
            throw new Error("No se encontraron productos en embarques para este pedido.");
        }

        for (const p of productos) {
            const estadoFinal = (p.estado === 'C') ? 'C' : 'F';

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
                p.ubi_bahia, estadoFinal,
                p.id_usuario, p.id_usuario_paqueteria, p.registro,
                p.inicio_surtido, p.fin_surtido, p.inicio_embarque, p.fin_embarque,
                p.unido, p.registro_surtido, p.registro_embarque, p.caja, p.motivo,
                p.unificado, null, null, // registro_fin, id_usuario_surtido
                p.fusion, p.tipo_caja, p.cajas
            ]);
        }

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
                    pf.id_usuario,
                    u.nombre AS nombre_usuario,
                    pf.id_usuario_paqueteria,
                    a.nombre AS nombre_paqueteria,
                    pf.codigo_pedido,
                    pf.cantidad,
                    pf.cant_surtida,
                    pf.cant_no_enviada,
                    pf.ubi_bahia,
                    pf._pz,
                    pf._inner,
                    pf._master,
                    pf.inicio_surtido,
                    pf.fin_surtido,
                    pf.v_master,
                    pf.v_pz,
                    pf.v_inner,
                    pf.v_master,
                    pf.inicio_embarque,
                    pf.fin_embarque
                FROM pedido_finalizado pf
                LEFT JOIN usuarios u ON pf.id_usuario = u.id
                LEFT JOIN usuarios a ON pf.id_usuario_paqueteria = a.id
                ORDER BY pf.no_orden DESC;
    `);
    return rows;
};

const getPedidosEmbarque = async () => {
    const [rows] = await pool.query(`
        SELECT 
            pe.no_orden,
            pe.tipo,
            pe.ubi_bahia,
            pe.id_usuario,
            pe.codigo_pedido,
            pe.id_usuario_paqueteria,
            pe._pz, pe._pq, pe._inner, pe._master,
            pe.v_pz, pe.v_pq, pe.v_inner, pe.v_master,
            u.nombre AS nombre_usuario
        FROM pedidos_embarques pe
        LEFT JOIN usuarios u ON pe.id_usuario = u.id
        ORDER BY pe.no_orden DESC
    `);
    return rows;
};

const getUsuariosEmbarques = async () => {
    const [rows] = await pool.query(`
        SELECT id, nombre 
        FROM usuarios 
        WHERE rol_id IN (11, 12)
    `);
    return rows; // ✅ solo retorna los datos, sin usar res.json o res.status
};

const actualizarUsuarioPaqueteria = async (no_orden, id_usuario_paqueteria) => {
    const [result] = await pool.query(
        `UPDATE pedidos_embarques 
         SET id_usuario_paqueteria = ? 
         WHERE no_orden = ?`,
        [id_usuario_paqueteria, no_orden]
    );
    return result;
};

const liberarUsuarioPaqueteria = async (no_orden) => {
    if (!no_orden) return { ok: false, code: 400, message: 'Falta no_orden' };

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Bloquear filas del pedido y sumar validaciones
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

        // Si hay cualquier validación hecha no se puede liberar
        if (totalV > 0) {
            await conn.rollback();
            return {
                ok: false,
                code: 409,
                message: 'No se puede liberar: existen movimientos en v_pz/v_pq/v_inner/v_master.'
            };
        }

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

//generar pdf

const obtenerDetallePedido = async (noOrden, tipo) => {
    const sql = `
    SELECT
      pf.no_orden AS pedido,
      pf.tipo,
      pf.cajas,
      pf.tipo_caja,
      GROUP_CONCAT(
        CONCAT(
          '{',
          '"codigo_producto":', pf.codigo_pedido, ',',
          '"descripcion_producto":"', REPLACE(prod.descripcion,'"','\\"'), '",',
          '"cantidad":', pf.cantidad, ',',
          '"um":"', pf.um, '",',
          '"_pz":', pf._pz, ',',
          '"_pq":', pf._pq, ',',
          '"_inner":', pf._inner, ',',
          '"_master":', pf._master,
          '}'
        )
        SEPARATOR '||'
      ) AS productos
    FROM pedido_finalizado pf
    LEFT JOIN productos prod ON pf.codigo_pedido = prod.codigo
    WHERE pf.no_orden = ?
      AND pf.tipo = ?
    GROUP BY pf.no_orden, pf.tipo, pf.cajas, pf.tipo_caja
    ORDER BY pf.cajas ASC;
  `;

    const [rows] = await pool.execute(sql, [noOrden, tipo]);

    // Convertir el string concatenado a JSON real
    rows.forEach(row => {
        row.productos = row.productos
            ? row.productos.split('||').map(item => JSON.parse(item))
            : [];
    });

    return rows;
};




module.exports = {
    getPedidosSurtiendo, moverPedidoASurtidoFinalizado, getPedidosEmbarque, moverPedidoAFinalizado,
    getpedidosFinalizados, verificarYFinalizarPedido, getUsuariosEmbarques, actualizarUsuarioPaqueteria,
    liberarUsuarioPaqueteria, obtenerPedidoPorOrdenYTipo, obtenerDetallePedido
};
