/**
 * notifications.config.js
 * Configuración centralizada de notificaciones por correo (Microsoft Graph, ver
 * services/mailer.service.js). Las credenciales viven en .env — nunca aquí.
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

module.exports = {
  // Pon MAIL_NOTIFICATIONS_ENABLED=false en .env para apagar todo sin tocar código.
  enabled: process.env.MAIL_NOTIFICATIONS_ENABLED !== "false",

  recipients: {
    // Solicitudes de inventario: solicitud, autorización pendiente y confirmación final.
    inventario: [
      "desarrollo4@santul.net",
      "eduardo.sandler@santul.net",
      "gerente.desarrollo@santul.net",
    ],
  },
};
