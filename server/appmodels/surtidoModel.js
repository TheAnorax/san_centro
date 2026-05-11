const pool = require('../config/database');

const getPedidosSurtido = async () => {
    const [rows] = await pool.query(`
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
            p.id_usuario AS id_usuario,
            u.ubicacion AS ubicacionProducto,
            NULL AS pasilloProducto,
            prod.descripcion AS descripcionProducto,
            prod.barcode_pz AS barcode_pz,
            prod.barcode_inner AS barcode_inner,
            prod.barcode_master AS barcode_master,
            prod._pz AS piezasPorUnidad,
            prod._inner AS piezasPorInner,
            prod._pq AS piezasPorPaquete,
            prod._master AS piezasPorCaja,
            prod._palet AS piezasPorTarima
        FROM pedidos_surtiendo p
        LEFT JOIN productos prod ON p.codigo_pedido = prod.codigo
        LEFT JOIN (
            SELECT codigo_producto, MIN(ubicacion) AS ubicacion
            FROM inventario
            GROUP BY codigo_producto
        ) u ON p.codigo_pedido = u.codigo_producto
        WHERE p.estado = 'S'
        ORDER BY u.ubicacion ASC
    `);

    const pedidosMap = {};
    rows.forEach(row => {
        const key = row.numeroPedido;
        if (!pedidosMap[key]) {
            pedidosMap[key] = {
                tipo: row.tipoPedido,
                usuario: null,
                jaula: row.ubicacionDestino,
                registro_surtido: row.fechaRegistro,
                id_usuario: row.id_usuario,
                productos: []
            };
        }
        pedidosMap[key].productos.push({
            identifi: row.idPedido,
            codigo_ped: row.sku,
            quantity: row.cantidadSolicitada,
            allquantity: row.cantidadSolicitada,
            cant_surti: row.cantidadSurtida,
            cant_no_env: row.cantidadNoEnviada,
            um: row.unidadMedida,
            peackinglocation: row.ubicacionDestino,
            estado: row.estado,
            name: row.descripcionProducto ?? 'Sin descripción',
            location: row.ubicacionProducto ?? 'Sin ubicación',
            pasillo: row.pasilloProducto ?? 'NORMAL',
            _pz: row.piezasPorUnidad,
            _inner: row.piezasPorInner,
            _pq: row.piezasPorPaquete,
            _master: row.piezasPorCaja,
            _palet: row.piezasPorTarima,
            barcodePz: row.barcode_pz,
            barcodeInner: row.barcode_inner,
            barcodeMaster: row.barcode_master,
            id_usuario: row.id_usuario
        });
    });

    return pedidosMap;
};

module.exports = { getPedidosSurtido };