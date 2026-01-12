const activosModel = require('../models/activosModel');

/**
 * OBTENER
 */
const getActivos = async (req, res) => {
    try {
        const data = await activosModel.getAllActivos();
        res.json(data);
    } catch (error) {
        console.error('❌ Error al obtener activos:', error);
        res.status(500).json({ message: 'Error al obtener activos' });
    }
};

/**
 * CREAR
 */
const crearActivo = async (req, res) => {
    try {
        const { nombre, categoria, descripcion, cantidad } = req.body;
        const foto = req.file ? req.file.filename : null;

        if (!nombre || !categoria) {
            return res.status(400).json({ message: 'Nombre y categoría son obligatorios' });
        }

        const idNuevo = await activosModel.insertActivoTipo({
            nombre,
            categoria,
            descripcion,
            foto_referencia: foto,
            cantidad
        });

        res.json({ message: 'Activo creado correctamente', id_tipo: idNuevo });

    } catch (error) {
        console.error('❌ Error al crear activo:', error);
        res.status(500).json({ message: 'Error al crear activo' });
    }
};

/**
 * ACTUALIZAR
 */
const actualizarActivo = async (req, res) => {
    try {
        const { id_tipo } = req.params;
        const { nombre, categoria, descripcion, cantidad } = req.body;
        const foto = req.file ? req.file.filename : null;

        const affected = await activosModel.updateActivoTipo(id_tipo, {
            nombre,
            categoria,
            descripcion,
            foto_referencia: foto,
            cantidad
        });

        if (affected === 0) {
            return res.status(404).json({ message: 'Activo no encontrado' });
        }

        res.json({ message: 'Activo actualizado correctamente' });

    } catch (error) {
        console.error('❌ Error al actualizar activo:', error);
        res.status(500).json({ message: 'Error al actualizar activo' });
    }
};

/**
 * SUMAR
 */
const sumarCantidad = async (req, res) => {
    try {
        const { id_tipo } = req.params;
        const { cantidad } = req.body;

        const affected = await activosModel.sumarCantidad(id_tipo, cantidad);

        if (affected === 0) {
            return res.status(404).json({ message: 'Activo no encontrado' });
        }

        res.json({ message: 'Cantidad sumada correctamente' });

    } catch (error) {
        console.error('❌ Error al sumar cantidad:', error);
        res.status(500).json({ message: 'Error al sumar cantidad' });
    }
};

/**
 * RESTAR
 */
const restarCantidad = async (req, res) => {
    try {
        const { id_tipo } = req.params;
        const { cantidad } = req.body;

        const affected = await activosModel.restarCantidad(id_tipo, cantidad);

        if (affected === 0) {
            return res.status(404).json({ message: 'Activo no encontrado' });
        }

        res.json({ message: 'Cantidad restada correctamente' });

    } catch (error) {
        console.error('❌ Error al restar cantidad:', error);
        res.status(500).json({ message: 'Error al restar cantidad' });
    }
};

/**
 * ELIMINAR
 */
const eliminarActivo = async (req, res) => {
    try {
        const { id_tipo } = req.params;

        const affected = await activosModel.deleteActivoTipo(id_tipo);

        if (affected === 0) {
            return res.status(404).json({ message: 'Activo no encontrado' });
        }

        res.json({ message: 'Activo eliminado correctamente' });

    } catch (error) {
        console.error('❌ Error al eliminar activo:', error);
        res.status(500).json({ message: 'Error al eliminar activo' });
    }
};

module.exports = {
    getActivos,
    crearActivo,
    actualizarActivo,
    sumarCantidad,
    restarCantidad,
    eliminarActivo
};
