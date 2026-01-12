const express = require('express');
const router = express.Router();
const activosController = require('../controllers/activosController');
const multer = require('multer');
const path = require('path');

// ====================
// CONFIG MULTER
// ====================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads/activos'));
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const name = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, name + ext);
    }
});



const upload = multer({ storage });

// ====================
// RUTAS
// ====================
router.get('/', activosController.getActivos);

router.post('/', upload.single('foto'), activosController.crearActivo);

router.put('/:id_tipo', upload.single('foto'), activosController.actualizarActivo);

router.post('/sumar/:id_tipo', activosController.sumarCantidad);

router.post('/restar/:id_tipo', activosController.restarCantidad);

router.delete('/:id_tipo', activosController.eliminarActivo);

module.exports = router;
