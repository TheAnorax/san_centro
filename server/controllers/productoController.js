const Producto = require('../models/productoModel');

exports.getProductos = async (req, res) => {
  try {
    const [productos] = await Producto.getAll();
    res.json(productos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener productos' });
  }
};

exports.getProductoById = async (req, res) => {
  try {
    const [producto] = await Producto.getById(req.params.id);
    if (producto.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(producto[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener producto' });
  }
};

exports.createProducto = async (req, res) => {
  try {
    const [result] = await Producto.create(req.body);
    res.json({ message: 'Producto creado', id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear producto' });
  }
};

exports.updateProducto = async (req, res) => {
  try {
    await Producto.update(req.params.id, req.body);
    res.json({ message: 'Producto actualizado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
};

exports.deleteProducto = async (req, res) => {
  try {
    await Producto.delete(req.params.id);
    res.json({ message: 'Producto eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
};
