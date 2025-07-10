const pool = require('../db'); // Importa la configuración de la base de datos

// Controlador para obtener datos de embarques
const obtenerEmbarques = async (req, res) => {
  const idUsuario = req.query.idUsu;

  if (!idUsuario) {
    return res.status(400).json({ error: 'Falta el parámetro idUsu' });
  }

  const query = `
    SELECT
      p.id_pedi,
      p.tipo,
      p.no_orden AS pedido,
      p.codigo_pedido AS codigo_ped,
      prod.descripcion AS des,
      p.cantidad,
      p.cant_surtida AS cant_surti,
      p.cant_no_enviada AS cant_no_env,
      p._pz AS pz,
      p._pq AS pq,
      p._inner AS inne,
      p._master AS maste,
      p.v_pz,
      p.v_pq,
      p.v_inner,
      p.v_master,
      p.um,
      p.caja,
      r.nombre AS usuario,
      prin.mac_print,
      p.ubi_bahia,
      p.estado,
      prod.barcode_pz AS code_pz,
      prod.barcode_inner AS code_inner,
      prod.barcode_master AS code_master,
      prod._pz,
      prod._pq,
      prod._inner,
      prod._master,
      caja_info.ultima_caja,
      caja_info.total_cajas
    FROM pedidos_embarques p
    LEFT JOIN productos prod ON CAST(p.codigo_pedido AS UNSIGNED) = prod.codigo
    LEFT JOIN usuarios us ON p.id_usuario_paqueteria = us.id
    LEFT JOIN roles r ON us.rol_id = r.id
    LEFT JOIN prints prin ON p.id_usuario_paqueteria = prin.id_usu
    LEFT JOIN (
      SELECT no_orden, MAX(caja) AS ultima_caja, COUNT(DISTINCT caja) AS total_cajas
      FROM pedidos_embarques
      WHERE caja IS NOT NULL
      GROUP BY no_orden
    ) AS caja_info ON p.no_orden = caja_info.no_orden
    WHERE p.estado = 'E' AND p.id_usuario_paqueteria = ?;
  `;

  try {
    const [results] = await pool.query(query, [idUsuario]);

    const groupedResults = results.reduce((acc, row) => {
      if (!acc[row.pedido]) {
        acc[row.pedido] = {
          pedido: row.pedido,
          tipo: row.tipo,
          ubi_bahia: row.ubi_bahia,
          usuario: row.usuario,
          mac_print: row.mac_print,
          ultima_caja: row.ultima_caja,
          total_cajas: row.total_cajas,
          datos: []
        };
      }

      acc[row.pedido].datos.push({
        id_pedi: row.id_pedi,
        codigo_ped: row.codigo_ped,
        des: row.des,
        cantidad: row.cantidad,
        cant_surti: row.cant_surti,
        cant_no_env: row.cant_no_env,
        pz: row.pz,
        pq: row.pq,
        inne: row.inne,
        maste: row.maste,
        v_pz: row.v_pz,
        v_pq: row.v_pq,
        v_inner: row.v_inner,
        v_master: row.v_master,
        um: row.um,
        caja: row.caja,
        estado: row.estado,
        code_pz: row.code_pz,
        code_inner: row.code_inner,
        code_master: row.code_master,
        _pz: row._pz,
        _inner: row._inner,
        _pq: row._pq,
        _master: row._master
      });

      return acc;
    }, {});

    const response = Object.values(groupedResults);
    res.json(response);
  } catch (error) {
    console.error('Error al obtener los datos de embarques:', error);
    res.status(500).json({ error: 'Error al obtener los datos de embarques' });
  }
};



const obtenerEmbarquesNew = async (req, res) => {
  const idUsu = req.params.idUsu;

  const query = `
    SELECT
      p.id_pedi,
      p.tipo,
      p.pedido,
      p.codigo AS codigo_ped,
      IFNULL(prod.descripcion, 'SIN DESCRIPCIÓN') AS des,
      p.cantidad,
      p.cant_surti,
      p.cant_no_env,
      p._pz AS pz,
      p._pq AS pq,
      p._inner AS inne,
      p._master AS maste,
      p.v_pz,
      p.v_pq,
      p.v_inner,
      p.v_master,
      p.um,
      p.caja,
      r.nombre AS usuario,
      prin.mac_print,
      p.ubi_bahia, 
      p.estado,
      prod.barcode_pz AS code_pz,
      prod.barcode_inner AS code_inner,
      prod.barcode_master AS code_master,  
      prod._pz,
      prod._inner,
      prod._pq,
      prod._master,
      caja_info.ultima_caja,
      caja_info.total_cajas
    FROM 
      pedido_embarque p
    LEFT JOIN productos prod ON p.codigo = prod.codigo
    LEFT JOIN usuarios us ON p.id_usuario_paqueteria = us.id_usu
    LEFT JOIN roles r ON us.rol_id = r.id
    LEFT JOIN prints prin ON p.id_usuario_paqueteria = prin.id_usu
    LEFT JOIN (
      SELECT pedido, MAX(caja) AS ultima_caja, COUNT(DISTINCT caja) AS total_cajas
      FROM pedido_embarque
      WHERE caja IS NOT NULL
      GROUP BY pedido
    ) AS caja_info ON p.pedido = caja_info.pedido
    WHERE p.estado = 'E' AND (p.id_usuario_paqueteria IS NULL OR p.id_usuario_paqueteria = ?);
  `;

  try {
    const [results] = await pool.query(query, [idUsu]);

    const groupedResults = results.reduce((acc, row) => {
      if (!acc[row.pedido]) {
        acc[row.pedido] = {
          pedido: row.pedido,
          tipo: row.tipo,
          ubi_bahia: row.ubi_bahia,
          usuario: row.usuario,
          mac_print: row.mac_print,
          ultima_caja: row.ultima_caja,
          total_cajas: row.total_cajas,
          datos: []
        };
      }

      acc[row.pedido].datos.push({
        id_pedi: row.id_pedi,
        codigo_ped: row.codigo_ped,
        des: row.des,
        cantidad: row.cantidad,
        cant_surti: row.cant_surti,
        cant_no_env: row.cant_no_env,
        pz: row.pz,
        pq: row.pq,
        inne: row.inne,
        maste: row.maste,
        v_pz: row.v_pz,
        v_pq: row.v_pq,
        v_inner: row.v_inner,
        v_master: row.v_master,
        um: row.um,
        caja: row.caja,
        estado: row.estado,
        code_pz: row.code_pz,
        code_inner: row.code_inner,
        code_master: row.code_master,
        _pz: row._pz,
        _inner: row._inner,
        _pq: row._pq,
        _master: row._master
      });

      return acc;
    }, {});

    const response = Object.values(groupedResults);
    res.json(response);
  } catch (error) {
    console.error('❌ Error al obtener los datos de embarques:', error);
    res.status(500).json({ error: 'Error al obtener los datos de embarques' });
  }
};



const actualizarBahiaEmbarque = async (req, res) => {
  console.log("UPDT-BHIA", req.body);
  const { pedido } = req.body;
  const updateBahiasQuery = "UPDATE bahias SET id_pdi=NULL, estado=NULL, ingreso = NULL WHERE id_pdi=?";

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(updateBahiasQuery, [pedido]);

    await connection.commit();
    res.status(200).json({ message: "Cantidad surtida actualizada correctamente" });
  } catch (error) {
    await connection.rollback();
    console.error("Error en la transacción:", error);
    res.status(500).send("Error en la transacción");
  } finally {
    connection.release();
  }
};

module.exports = { obtenerEmbarques, actualizarBahiaEmbarque, obtenerEmbarquesNew };
