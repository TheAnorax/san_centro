/**
 * autorizacion.controller.js
 * Valida usuario+contraseña de un SUPERVISOR (rol_id 13) para autorizar
 * acciones sensibles desde la app (por ahora: "Negar Producto" en Surtido).
 * No genera una sesión nueva ni reemplaza el token del que está trabajando;
 * solo confirma que el supervisor es quien dice ser y devuelve su id, para
 * dejar constancia de quién liberó/autorizó la acción.
 */

const bcrypt = require('bcrypt');
const { findUserByEmail } = require('../../../models/userModel');

const ROL_SUPERVISOR = 13;

const validarSupervisor = async (req, res) => {
    try {
        const { correo, password } = req.body;

        if (!correo || !password) {
            return res.status(400).json({ ok: false, message: 'Falta correo o contraseña del supervisor.' });
        }

        const usuario = await findUserByEmail(correo);
        if (!usuario) {
            return res.status(401).json({ ok: false, message: 'Ese usuario no existe o está inactivo.' });
        }

        if (Number(usuario.rol_id) !== ROL_SUPERVISOR) {
            return res.status(403).json({ ok: false, message: 'Ese usuario no tiene permiso de supervisor para autorizar esto.' });
        }

        const coincide = await bcrypt.compare(password, usuario.password_hash);
        if (!coincide) {
            return res.status(401).json({ ok: false, message: 'Contraseña de supervisor incorrecta.' });
        }

        res.json({ ok: true, idSupervisor: usuario.id, nombreSupervisor: usuario.nombre });
    } catch (err) {
        console.error('❌ [autorizacion] validarSupervisor:', err);
        res.status(500).json({ ok: false, message: 'Error al validar al supervisor.' });
    }
};

module.exports = { validarSupervisor };
