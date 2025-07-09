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
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();

// ? Configuración de middlewares ? \\
app.use(cors());
app.use(express.json());

// * ╔════════════════════════════════════════════════════════════╗ * \\
// * ║   Iniciar el servidor para su conexion desde el frontend   ║ * \\
// * ╚════════════════════════════════════════════════════════════╝ * \\
// Rutas públicas

app.use((req, res, next) => {
  if (["POST", "PUT", "PATCH"].includes(req.method)) {
    console.log(`📦 [${req.method}] ${req.path} Body:`, req.body);
  }
  next();
});

const authRoutes = require("./routes/authRoutes");
const usuarioRoutes = require('./routes/usuarioRoutes');
const rolesRoutes = require('./routes/roles');
const permisosRoutes = require('./routes/permisosRoutes');
const productosRoutes = require('./routes/productoRoutes');
const insumoRoutes = require('./routes/insumoRoutes');
const traspasoRouter = require('./routes/traspasoRouter');
const inventarioRouter = require('./routes/inventarioRouter');
const bahiaRouter = require('./routes/bahiaRouter');
const pedidosRouter = require('./routes/pedidosRouter');
const surtidoRouter = require('./routes/surtidoRoutes');

app.use('/api/productos', productosRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use("/api/auth", authRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/permisos', permisosRoutes)
app.use('/api/insumos', insumoRoutes);
app.use('/api/insumos', insumoRoutes);
app.use('/api/traspaso', traspasoRouter);
app.use('/api/inventario', inventarioRouter);
app.use('/api/bahia', bahiaRouter);
app.use('/api/pedidos', pedidosRouter);
app.use('/api/surtido', surtidoRouter);



// ? ┌────────────────────────────────────────────────────────────┐ ? \\
// ? │        Declarar el puerto e inicializar el servidor        │ ? \\
// ? └────────────────────────────────────────────────────────────┘ ? \\                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         

// * Declarar el puerto del servidor * \\


const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`✅ Servidor backend corriendo en puerto ${port}`);
});
