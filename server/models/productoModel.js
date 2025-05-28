const db = require('../db'); // asegúrate que este archivo exporta tu pool/conexión MySQL

const Producto = {
  getAll: () => {
    return db.query('SELECT * FROM productos');
  },

  getById: (id) => {
    return db.query('SELECT * FROM productos WHERE id = ?', [id]);
  },

  create: (producto) => {
    return db.query('INSERT INTO productos SET ?', [producto]);
  },

  update: (id, producto) => {
    return db.query('UPDATE productos SET ? WHERE id = ?', [producto, id]);
  },

  delete: (id) => {
    return db.query('DELETE FROM productos WHERE id = ?', [id]);
  }
};

module.exports = Producto;
