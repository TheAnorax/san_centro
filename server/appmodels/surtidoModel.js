const pool = require('../config/database');

const getPedidosSurtido = async () => {
  const query = `
    SELECT 
      p.id_pedi AS idPedido,
      p.no_orden AS numeroPedido,
      p.tipo AS tipoPedido,
      p.codigo_pedido AS sku,
      p.cantidad AS cantidadSolicitada,
      p.cant_surtida AS cantidadSurtida,
      p.cant_no_enviada AS cantidadNoEnviada,
      p.um AS unidadMedida,
      p.ubi_bahia AS ubicacionDestino,
      p.estado AS estado,
      p.registro_surtido AS fechaRegistro,
      us.role AS rolUsuario,
      u.cant_stock AS cantidadEnStock,
      u.ubi AS ubicacionProducto,
      u.pasillo AS pasilloProducto,
      prod.des AS descripcionProducto,
     prod.code_pz AS barcode_pz,
    prod.code_inner AS barcode_inner,
    prod.code_master AS barcode_master,
    prod.code_palet AS barcode_palet,
      prod._pz AS piezasPorUnidad,
      prod._inner AS piezasPorInner,
      prod._pq AS piezasPorPaquete,
      prod._master AS piezasPorCaja,
      prod._palet AS piezasPorTarima
    FROM pedidos_surtiendo p
    LEFT JOIN productos prod ON p.codigo_pedido = prod.codigo_pro
    LEFT JOIN ubicaciones u ON p.codigo_pedido = u.code_prod
    LEFT JOIN usuarios us ON p.id_usuario = us.id_usu
    WHERE p.estado = 'S'
      AND prod.des IS NOT NULL
    GROUP BY p.id_pedi
    ORDER BY u.ubi ASC;
  `;

  const [rows] = await pool.query(query);
  return rows;
};

module.exports = {
  getPedidosSurtido,
};
