// * ╔════════════════════════════════════════════════════════════╗ * \\
// * ║                                                            ║ * \\
// * ║   ====== Conexion con el servidor desde el index ======    ║ * \\
// * ║                                                            ║ * \\
// * ╚════════════════════════════════════════════════════════════╝ * \\

// ? ┌─────────────────────────────────────────────────────┐ ? \\
// ? │                                                     │ ? \\
// ? │    Importacion de Funciones, Librerias y modulos    │ ? \\
// ? │                                                     │ ? \\
// ? └─────────────────────────────────────────────────────┘ ? \\

// ? Importar configuracion del servidor ? \\
const app = require("./server");

// * ╔════════════════════════════════════════════════════════════╗ * \\
// * ║           Verificar la conexion con el servidor            ║ * \\
// * ╚════════════════════════════════════════════════════════════╝ * \\

// ? ┌────────────────────────────────────────────────────────────┐ ? \\
// ? │           Conexion con el server desde el index            │ ? \\
// ? └────────────────────────────────────────────────────────────┘ ? \\

// * Verificar la conexion al servidor * \\
app.listen(app.get("port"), () => {
  // DEPURACION: Verificar el puerto en el que se esta ejecutando el servidor
  console.log("Servidor conectado en el puerto ", app.get("port"));
});
