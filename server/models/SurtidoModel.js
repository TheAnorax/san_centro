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
// Mover el pedido según su estado real
const moverPedidoASurtidoFinalizado = async (noOrden, tipo) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1️⃣ Obtener productos en surtido
        const [productos] = await connection.query(`
            SELECT *
            FROM pedidos_surtiendo
            WHERE no_orden = ? AND UPPER(tipo) = UPPER(?)
        `, [noOrden, tipo]);

        if (productos.length === 0) {
            throw new Error("No se encontraron productos para este pedido.");
        }

        // 2️⃣ Validar cuadratura (excluyendo cancelados)
        const lineasActivas = productos.filter(p => p.estado !== 'C');

        const errores = lineasActivas.filter(p =>
            Number(p.cantidad) !==
            (Number(p.cant_surtida) + Number(p.cant_no_enviada))
        );

        if (errores.length > 0) {
            throw new Error("El pedido no está correctamente cerrado en surtido.");
        }

        // 3️⃣ Calcular totales
        const totalSurtido = lineasActivas.reduce(
            (sum, p) => sum + Number(p.cant_surtida), 0
        );

        const totalNoEnviado = lineasActivas.reduce(
            (sum, p) => sum + Number(p.cant_no_enviada), 0
        );

        // 🔴 CASO: NO SE SURTIÓ NADA → pedido_finalizado
        if (totalSurtido === 0 && totalNoEnviado > 0) {

            for (const p of productos) {
                await connection.query(`
                    INSERT INTO pedido_finalizado (
                        no_orden, tipo, codigo_pedido, clave,
                        cantidad, cant_surtida, cant_no_enviada,
                        um, _pz, _pq, _inner, _master,
                        ubi_bahia, estado, id_usuario,
                        registro, inicio_surtido, fin_surtido,
                        motivo, registro_fin
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                `, [
                    p.no_orden, p.tipo, p.codigo_pedido, p.clave,
                    p.cantidad, p.cant_surtida, p.cant_no_enviada,
                    p.um, p._pz, p._pq, p._inner, p._master,
                    p.ubi_bahia, 'NO_ATENDIDO', p.id_usuario,
                    p.registro, p.inicio_surtido, p.fin_surtido,
                    p.motivo || 'Sin surtido'
                ]);
            }

            // 🔥 Borrar de surtido
            await connection.query(`
                DELETE FROM pedidos_surtiendo
                WHERE no_orden = ? AND UPPER(tipo) = UPPER(?)
            `, [noOrden, tipo]);

            await connection.commit();

            return {
                ok: true,
                estadoPedido: 'NO_ATENDIDO',
                mensaje: `Pedido ${noOrden}-${tipo} finalizado como NO ATENDIDO.`
            };
        }

        // 🟡🟢 CASO: HUBO SURTIDO → pedidos_embarques
        for (const p of productos) {
            await connection.query(`
                INSERT INTO pedidos_embarques (
                    no_orden, tipo, codigo_pedido, clave,
                    cantidad, cant_surtida, cant_no_enviada,
                    um, _bl, _pz, _pq, _inner, _master,
                    ubi_bahia, estado, id_usuario,
                    id_usuario_paqueteria,
                    registro, inicio_surtido, fin_surtido, motivo
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                p.no_orden, p.tipo, p.codigo_pedido, p.clave,
                p.cantidad, p.cant_surtida, p.cant_no_enviada,
                p.um, p._bl, p._pz, p._pq, p._inner, p._master,
                p.ubi_bahia, 'E', p.id_usuario,
                p.id_usuario_paqueteria,
                p.registro, p.inicio_surtido, p.fin_surtido,
                p.motivo
            ]);
        }

        // 🔥 Borrar de surtido
        await connection.query(`
            DELETE FROM pedidos_surtiendo
            WHERE no_orden = ? AND UPPER(tipo) = UPPER(?)
        `, [noOrden, tipo]);

        await connection.commit();

        return {
            ok: true,
            estadoPedido: totalNoEnviado > 0 ? 'PARCIAL' : 'COMPLETO',
            mensaje: `Pedido ${noOrden}-${tipo} movido a embarques.`
        };

    } catch (error) {
        await connection.rollback();
        console.error(error.message);
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

const moverPedidoAFinalizado = async (noOrden, tipo) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [productos] = await connection.query(
            `SELECT * FROM pedidos_embarques 
             WHERE no_orden = ? AND UPPER(tipo) = UPPER(?)`,
            [noOrden, tipo]  // 🔥 agrega tipo
        );

        if (productos.length === 0) {
            throw new Error("No se encontraron productos en embarques para este pedido.");
        }

        for (const p of productos) {
            const estadoFinal = (p.estado === 'C') ? 'C' : 'F';
            await connection.query(`
                INSERT INTO pedido_finalizado (
                    no_orden, tipo, codigo_pedido, clave, cantidad, cant_surtida, cant_no_enviada,
                    um, _pz, _pq, _inner, _master,
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
                p.unificado, null, null,
                p.fusion, p.tipo_caja, p.cajas
            ]);
        }

        // 🔥 Borrar también por tipo
        await connection.query(
            `DELETE FROM pedidos_embarques 
             WHERE no_orden = ? AND UPPER(tipo) = UPPER(?)`,
            [noOrden, tipo]
        );

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
            pe.cantidad,
            pe.cant_surtida,
            pe.cant_no_enviada,
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

// ===== NUEVO: Sanced =====
const insertarSanced = async (datos) => {
    const sql = `
        INSERT INTO sanced 
            (no_orden, nombre_cliente, num_consigna, tpo_original, fecha,
             correo, ejecutivo, estado, municipio, direccion, postal,
             ruta, zona, telefono, referencia, observaciones,
             no_factura, partidas, piezas, total, total_con_iva)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE
            total = IF(VALUES(total) > 0, VALUES(total), total),
            total_con_iva = IF(VALUES(total_con_iva) > 0, VALUES(total_con_iva), total_con_iva),
            no_factura = IF(VALUES(no_factura) != '0-' AND VALUES(no_factura) != '', VALUES(no_factura), no_factura)
    `;
    const valores = [
        datos.NoOrden, datos.Nombre_Cliente, datos.NumConsigna, datos.TpoOriginal,
        datos.Fecha, datos.Correo, datos.Ejecutivo, datos.Estado, datos.Municipio,
        datos.Direccion, datos.Postal, datos.Ruta, datos.Zona, datos.Telefono,
        datos.Referencia, datos.Observaciones, datos.NoFactura,
        datos.Partidas, datos.Piezas, datos.Total, datos.TotalConIva
    ];
    const [result] = await pool.query(sql, valores);
    return result;
};


const obtenerDatosSanced = async (noOrden) => {
    const [rows] = await pool.query(
        `SELECT nombre_cliente, telefono, direccion, correo, num_consigna,
                total, total_con_iva, no_factura
         FROM sanced 
         WHERE no_orden = ? LIMIT 1`,
        [noOrden]
    );
    return rows[0] || null;
};


module.exports = {
    getPedidosSurtiendo, moverPedidoASurtidoFinalizado, getPedidosEmbarque, moverPedidoAFinalizado,
    getpedidosFinalizados, verificarYFinalizarPedido, getUsuariosEmbarques, actualizarUsuarioPaqueteria,
    liberarUsuarioPaqueteria, obtenerPedidoPorOrdenYTipo, obtenerDetallePedido, insertarSanced, obtenerDatosSanced
};
