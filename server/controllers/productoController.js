const Producto = require('../models/productoModel');

// Obtener todos los productos con ubicación y stock real
exports.getProductos = async (req, res) => {
  try {
    const [productos] = await Producto.getAll();
    res.status(200).json(productos);
  } catch (error) {
    console.error("Error al obtener productos:", error);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
};

// Obtener un producto por ID (con su ubicación y stock real)
exports.getProductoById = async (req, res) => {
  try {
    const [producto] = await Producto.getById(req.params.id);
    if (!producto || producto.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.status(200).json(producto[0]);
  } catch (error) {
    console.error("Error al obtener producto:", error);
    res.status(500).json({ error: 'Error al obtener producto' });
  }
};

// Crear un nuevo producto
exports.createProducto = async (req, res) => {
  try {
    const [result] = await Producto.create(req.body);
    res.status(201).json({ message: 'Producto creado correctamente', id: result.insertId });
  } catch (error) {
    console.error("Error al crear producto:", error);
    res.status(500).json({ error: 'Error al crear producto' });
  }
};

// Actualizar un producto existente
exports.updateProducto = async (req, res) => {
  try {
    await Producto.update(req.params.id, req.body);
    res.status(200).json({ message: 'Producto actualizado correctamente' });
  } catch (error) {
    console.error("Error al actualizar producto:", error);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
};

// Eliminar un producto
exports.deleteProducto = async (req, res) => {
  try {
    await Producto.delete(req.params.id);
    res.status(200).json({ message: 'Producto eliminado correctamente' });
  } catch (error) {
    console.error("Error al eliminar producto:", error);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
};
