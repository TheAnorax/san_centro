// * ╔════════════════════════════════════════════════════════════╗ * \\
// * ║                                                            ║ * \\
// * ║     ====== Configuracion principal del servidor ======     ║ * \\
// * ║                                                            ║ * \\
// * ╚════════════════════════════════════════════════════════════╝ * \\

// ? ┌─────────────────────────────────────────────────────┐ ? \\
// ? │                                                     │ ? \\
// ? │    Importacion de Funciones, Librerias y modulos    │ ? \\
// ? │                                                     │ ? \\
// ? └─────────────────────────────────────────────────────┘ ? \\

// ? Importar funciones necesarias ? \\
const express = require("express");
const cors = require("cors");
const app = express();

// ? Configuración de middlewares ? \\
app.use(cors());
app.use(express.json());

// * ╔════════════════════════════════════════════════════════════╗ * \\
// * ║   Iniciar el servidor para su conexion desde el frontend   ║ * \\
// * ╚════════════════════════════════════════════════════════════╝ * \\

// ? ┌────────────────────────────────────────────────────────────┐ ? \\
// ? │        Declarar el puerto e inicializar el servidor        │ ? \\
// ? └────────────────────────────────────────────────────────────┘ ? \\

 // * Declarar el puerto del servidor * \\
const port = 6000;

// * Iniciar el servidor * \\
app.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}`);
});
