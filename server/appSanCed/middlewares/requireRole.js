/**
 * requireRole.js
 * Middleware que restringe una ruta a ciertos roles.
 * Debe usarse DESPUÉS de verifyToken (necesita req.usuario ya puesto).
 *
 * Valida por `rol_id` (el id numérico de la tabla `roles`), NO por el nombre
 * del rol — el nombre en `roles.nombre` no tiene una convención fija de
 * mayúsculas/minúsculas ("admin" vs "Surtidor"), así que compararlo como
 * texto es frágil. El id es estable.
 *
 * Uso: router.use(verifyToken, requireRole([2, 1, 4])); // Surtidor, admin, master
 */

function requireRole(rolIdsPermitidos) {
    return (req, res, next) => {
        const rolId = req.usuario?.rol_id;

        if (rolId === undefined || rolId === null) {
            return res.status(401).json({
                ok: false,
                message: 'Tu sesión no trae el rol_id (inicia sesión de nuevo para renovar el token).',
            });
        }

        if (!rolIdsPermitidos.includes(Number(rolId))) {
            return res.status(403).json({
                ok: false,
                message: `Tu rol (id ${rolId}) no tiene acceso a esta sección.`,
            });
        }

        next();
    };
}

module.exports = requireRole;
