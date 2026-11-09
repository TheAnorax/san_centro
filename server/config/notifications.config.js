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

  // Únicas personas que reciben los botones Autorizar/Cancelar y que pueden
  // resolver el pedido (el formulario del enlace solo acepta estos nombres).
  aprobadores: [
    { id: "eduardo", nombre: "Eduardo Sandler", email: "eduardo.sandler@santul.net" },
  ],

  // En copia (CC): reciben el mismo correo pero SIN botones de autorizar/cancelar.
  copia: [
    { nombre: "Jonathan Alcantara", email: "desarrollo4@santul.net" },
    { nombre: "Rodrigo Arias", email: "gerente.desarrollo@santul.net" },
    { nombre: "Ruben Acosta", email: "coordinador.planeacion@santul.net" },
    { nombre: "Juan Pablo Cuamatla", email: "gerente.crossdock@santul.net" },
  ],

  recipients: {
    // Solicitudes de inventario: solicitud, autorización pendiente y confirmación final.
    inventario: [
      "desarrollo4@santul.net",
      "eduardo.sandler@santul.net",
      "gerente.desarrollo@santul.net",
      
    ],
  },
};
