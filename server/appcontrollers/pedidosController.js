const pool = require('../db');
const moment = require('moment');

const getPedidosData = async (req, res) => {
  const query = `
    SELECT
      p.id_pedi,
      p.no_orden AS pedido,
      p.tipo,
      p.codigo_pedido AS codigo_ped,
      p.cantidad,
      p.cant_surtida AS cant_surti,
      p.cant_no_enviada AS cant_no_env,
      p.um,
      p.ubi_bahia,
      p.estado,
      p.registro_surtido,
      COALESCE(r.nombre, 'SIN_ROL') AS usuario,
       p.id_usuario,
      u.cant_stock_real AS cant_stock,
      u.ubicacion AS ubi,
      'AV' AS pasillo,
      prod.descripcion,
      prod.barcode_pz,
      prod.barcode_inner,
      prod.barcode_master,
      prod.barcode_palet,
      prod._pz,
      prod._pq,
      prod._inner,
      prod._master
    FROM pedidos_surtiendo p
    LEFT JOIN productos prod ON p.codigo_pedido = prod.codigo
    LEFT JOIN inventario u ON p.codigo_pedido = u.codigo_producto
    LEFT JOIN usuarios us ON p.id_usuario = us.id
    LEFT JOIN roles r ON us.rol_id = r.id
    WHERE p.estado = 'S'
      AND prod.descripcion IS NOT NULL
    ORDER BY u.ubicacion ASC;
  `;

  let connection;
  try {
    connection = await pool.getConnection();
    const [result] = await connection.query(query);

    const groupedByPedido = {};

    result.forEach(row => {
      const pedido = row.pedido;
      const tipo = row.tipo;
      const usuario = row.usuario;
      const registro_surtido = moment(row.registro_surtido).format('YYYY-MM-DD HH:mm:ss');

      if (!groupedByPedido[pedido]) {
        groupedByPedido[pedido] = {
          tipo,
          usuario,
          jaula: row.pasillo === 'AV' ? 'Si' : 'No',
          registro_surtido,
          id_usuario: row.id_usuario,
          productos: []
        };
      }

      if (row.cant_stock !== null) {
        const faltan = row.cantidad - row.cant_surti;
        let restante = faltan;

        const baseProduct = {
          identifi: row.id_pedi,
          codigo_ped: row.codigo_ped,
          quantity: row.cantidad,
          allquantity: row.cantidad,
          cant_surti: row.cant_surti,
          cant_no_env: row.cant_no_env,
          _master: row._master,
          _inner: row._inner,
          _pz: row._pz,
          _pq: row._pq,
          barcodeMaster: row.barcode_master?.toString(),
          barcodeInner: row.barcode_inner?.toString(),
          barcodePz: row.barcode_pz?.toString(),
          barcodePalet: row.barcode_palet,
          peackinglocation: row.ubi_bahia,
          estado: row.estado,
          name: row.descripcion,
          stockpeak: row.cant_stock,
          location: row.ubi,
          pasillo: row.pasillo,
          um: row.um
        };


        if (row._master > 0 && restante >= row._master) {
          const masterQty = Math.floor(restante / row._master);
          restante -= masterQty * row._master;
          groupedByPedido[pedido].productos.push({
            ...baseProduct,
            surtir: masterQty,
            unidad: 'MASTER',
            barcode: row.barcode_master
          });
        }

        if (row._inner > 0 && restante >= row._inner) {
          const innerQty = Math.floor(restante / row._inner);
          restante -= innerQty * row._inner;
          groupedByPedido[pedido].productos.push({
            ...baseProduct,
            surtir: innerQty,
            unidad: 'INNER',
            barcode: row.barcode_inner
          });
        }

        if (row._pz > 0 && restante >= row._pz) {
          const pzQty = Math.floor(restante / row._pz);
          restante -= pzQty * row._pz;
          groupedByPedido[pedido].productos.push({
            ...baseProduct,
            surtir: pzQty,
            unidad: 'PZ',
            barcode: row.barcode_pz
          });
        }
      }
    });

    res.json(groupedByPedido);
  } catch (error) {
    console.error('Error al obtener pedidos:', error);
    res.status(500).json({ error: 'Error al obtener los pedidos' });
  } finally {
    if (connection) connection.release();
  }
};

module.exports = { getPedidosData };
