const pool = require('../db');
const cron = require('node-cron');
const BahiaModel = require('../models/bahiaModel');


cron.schedule('*/1 * * * *', async () => {
    console.log("⏰ Verificando pedidos...");

    const pedidosSurtiendo = await getPedidosSurtiendo();
    const unicosSurtido = [...new Set(pedidosSurtiendo.map(p => p.no_orden))];

    let movimientos = 0;

    // 🔁 1. Verifica si se deben mover de surtido a embarques
    for (const noOrden of unicosSurtido) {
        const resultado = await verificarYFinalizarPedido(noOrden);
        if (resultado) movimientos += 1;
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
const moverPedidoASurtidoFinalizado = async (noOrden) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [productos] = await connection.query(`
      SELECT * FROM pedidos_surtiendo WHERE no_orden = ?
    `, [noOrden]);

        if (productos.length === 0) {
            throw new Error("No se encontraron productos para este pedido.");
        }

        const [existe] = await connection.query(`
      SELECT 1 FROM pedidos_embarques WHERE no_orden = ? LIMIT 1
    `, [noOrden]);
        if (existe.length > 0) {
            console.log("⚠️ El pedido ya fue movido a embarques.");
            await connection.commit(); // ← importante: cerrar transacción
            return { ok: true, mensaje: "Ya estaba en embarques." };
        }

        // ✅ Ignora cancelados en la validación de cantidades
        const lineasActivas = productos.filter(p => p.estado !== 'C');
        const incompletos = lineasActivas.filter(p =>
            Number(p.cantidad) !== (Number(p.cant_surtida) + Number(p.cant_no_enviada))
        );
        if (incompletos.length > 0) {
            throw new Error("El pedido aún no está completamente surtido (excluyendo cancelados).");
        }

        // 🚚 Inserta en pedidos_embarques
        for (const p of productos) {
            // OPCIÓN A (recomendada): preservar estado; C sigue siendo C
            const estadoDestino = (p.estado === 'C') ? 'C' : 'E';

            // OPCIÓN B: si NO quieres llevar líneas canceladas a embarques:
            // if (p.estado === 'C') continue;

            await connection.query(`
        INSERT INTO pedidos_embarques (
          no_orden, tipo, codigo_pedido, clave, cantidad, cant_surtida, cant_no_enviada,
          um, _bl, _pz, _pq, _inner, _master, ubi_bahia, estado, id_usuario,
          id_usuario_paqueteria, registro, inicio_surtido, fin_surtido
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
                p.no_orden, p.tipo, p.codigo_pedido, p.clave, p.cantidad, p.cant_surtida, p.cant_no_enviada,
                p.um, p._bl, p._pz, p._pq, p._inner, p._master, p.ubi_bahia, estadoDestino, p.id_usuario,
                p.id_usuario_paqueteria, p.registro, p.inicio_surtido, p.fin_surtido
            ]);
        }

        // 🧹 Elimina de pedidos_surtiendo
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


//generacion del Packinlist

// Detalle por partida (normaliza nulls a 0)
async function obtenerPartidasFinalizadasSimple(tipo, no_orden, { incluirConMotivo = false } = {}) {
    const filtroMotivo = incluirConMotivo ? '' : "AND (pf.motivo IS NULL OR TRIM(pf.motivo) = '')";

    const sql = `
    SELECT
      pf.no_orden,
      pf.tipo,
      pf.codigo_pedido,
      COALESCE(pr.descripcion, CONCAT('SKU ', pf.codigo_pedido)) AS descripcion,
      COALESCE(pf.um, pr.um, 'PZ') AS um,
      pf.cantidad                                AS cant_pedida,
      COALESCE(pf.cant_surtida,     0)           AS cant_surtida,
      COALESCE(pf.cant_no_enviada,  0)           AS cant_no_enviada,
      COALESCE(pf._pz,              0)           AS _pz,
      COALESCE(pf._pq,              0)           AS _pq,
      COALESCE(pf._inner,           0)           AS _inner,
      COALESCE(pf._master,          0)           AS _master,
      pf.caja,
      pf.tipo_caja,
      COALESCE(pf.cajas,            0)           AS cajas
    FROM pedido_finalizado pf
    LEFT JOIN productos pr
      ON pr.codigo = pf.codigo_pedido  -- ajusta a pr.codigo_pro si aplica
    WHERE pf.tipo = ?
      AND pf.no_orden = ?
      AND pf.estado = 'F'
      ${filtroMotivo}
    ORDER BY
      CASE WHEN pf.caja IS NULL THEN 1 ELSE 0 END,
      pf.caja,
      pf.codigo_pedido
  `;
    const [rows] = await pool.query(sql, [tipo, no_orden]);
    return rows;
}

// Resumen por caja (AGREGA los campos por caja)
async function obtenerResumenCajas(tipo, no_orden, { incluirConMotivo = false } = {}) {
    const filtroMotivo = incluirConMotivo ? '' : "AND (motivo IS NULL OR TRIM(motivo) = '')";

    const sql = `
    SELECT
      caja,
      tipo_caja,
      SUM(COALESCE(_pz,     0)) AS _pz,
      SUM(COALESCE(_pq,     0)) AS _pq,
      SUM(COALESCE(_inner,  0)) AS _inner,
      SUM(COALESCE(_master, 0)) AS _master,
      MAX(COALESCE(cajas,   0)) AS cajas
    FROM pedido_finalizado
    WHERE tipo = ?
      AND no_orden = ?
      AND estado = 'F'
      ${filtroMotivo}
    GROUP BY caja, tipo_caja
    ORDER BY
      CASE WHEN caja IS NULL THEN 1 ELSE 0 END,
      caja
  `;
    const [rows] = await pool.query(sql, [tipo, no_orden]);
    return rows;
}





module.exports = {
    getPedidosSurtiendo, moverPedidoASurtidoFinalizado, getPedidosEmbarque, moverPedidoAFinalizado,
    getpedidosFinalizados, verificarYFinalizarPedido, getUsuariosEmbarques, actualizarUsuarioPaqueteria,
    obtenerPartidasFinalizadasSimple,
    obtenerResumenCajas,
};
