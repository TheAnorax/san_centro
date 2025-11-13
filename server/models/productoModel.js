const db = require('../db');

const Producto = {
  // Obtener todos los productos con su ubicación y stock real
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
      LEFT JOIN inventario i 
        ON p.codigo = i.codigo_producto
      ORDER BY i.ubicacion;
    `;
    return db.query(query);
  },

  // Obtener producto por ID, incluyendo ubicación y stock
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
    LEFT JOIN inventario i 
      ON p.codigo = i.codigo_producto
    ORDER BY p.codigo ASC;
  `;
    return db.query(query);
  },


  // Crear nuevo producto
  create: (producto) => {
    return db.query('INSERT INTO productos SET ?', [producto]);
  },

  // Actualizar producto
  update: (id, producto) => {
    return db.query('UPDATE productos SET ? WHERE id = ?', [producto, id]);
  },

  // Eliminar producto
  delete: (id) => {
    return db.query('DELETE FROM productos WHERE id = ?', [id]);
  }
};

module.exports = Producto;
