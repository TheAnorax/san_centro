const express = require('express');
const router = express.Router();
const { login, register} = require('../controllers/authController');
const { obtenerListaRoles } = require('../controllers/usuarioController');

router.post('/login', login);
router.post('/register', register); // ✅ NUEVA RUTA
router.get('/roles', obtenerListaRoles);

module.exports = router;
