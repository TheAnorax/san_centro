const express = require('express');
const router = express.Router();
const { login, register} = require('../controllers/authController');
const { obtenerListaRoles } = require('../controllers/usuarioController');
const { limitarLogin } = require('../middlewares/seguridad');
const requireRole = require('../appSanCed/middlewares/requireRole');

const ROL_ADMIN = 1;
const ROL_MASTER = 4;

router.post('/login', limitarLogin, login);
// 🔒 Registrar usuarios: el token ya lo exige server.js; además solo Admin/Master.
router.post('/register', requireRole([ROL_ADMIN, ROL_MASTER]), register);
router.get('/roles', obtenerListaRoles);

module.exports = router;
