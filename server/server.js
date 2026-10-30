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

const { cabecerasSeguras, logBodies, esLoopback, llaveDeServicioValida } = require('./middlewares/seguridad');
const verifyToken = require('./appSanCed/middlewares/verifyToken');

app.disable('x-powered-by');
app.use(cabecerasSeguras);
app.use(logBodies); // ya no imprime contraseñas

// 🔒 Toda la API exige token, salvo el login y la lista de roles (públicos).
//    `notificar-cambio` lo llama la app vieja (puerto 3003) desde el mismo servidor, sin token:
//    se permite SOLO si viene de 127.0.0.1.
const RUTAS_PUBLICAS = ['/auth/login', '/auth/roles'];
app.use('/api', (req, res, next) => {
  if (RUTAS_PUBLICAS.includes(req.path)) return next();
  // Botones Autorizar/Cancelar del correo a Dirección: se abren sin login; los protege
  // el token aleatorio de un solo lote que va en la liga (ver inventarioController).
  if (req.method === 'GET' && req.path === '/inventario/solicitudes/resolver-lote') return next();
  if (req.path === '/surtido/notificar-cambio' && esLoopback(req)) return next();
  // Lectura de solo consulta para `sanced`, que no tiene token de este sistema: usa llave de servicio.
  if (req.method === 'GET' && req.path === '/traspaso/recibidos' && llaveDeServicioValida(req)) return next();
  return verifyToken(req, res, next);
});

const path = require('path');

app.use('/uploads/activos', express.static(path.join(__dirname, 'uploads/activos')));



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
const kpiRouter = require('./routes/kpiRouter');
const activosRouter = require('./routes/activosRoutes');
const planRouter = require('./routes/planRoutes');

app.use('/api/productos', productosRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use("/api/auth", authRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/permisos', permisosRoutes)
app.use('/api/insumos', insumoRoutes);
app.use('/api/traspaso', traspasoRouter);
app.use('/api/inventario', inventarioRouter);
app.use('/api/bahia', bahiaRouter);
app.use('/api/pedidos', pedidosRouter);
app.use('/api/surtido', surtidoRouter);
app.use('/api/kpi', kpiRouter);
app.use('/api/activos', activosRouter);
app.use('/api/Plan',planRouter);



// ? ┌────────────────────────────────────────────────────────────┐ ? \\
// ? │        Declarar el puerto e inicializar el servidor        │ ? \\
// ? └────────────────────────────────────────────────────────────┘ ? \\                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         

// * Declarar el puerto del servidor * \\

const http = require('http');
const { initSocket } = require('./socket');

const server = http.createServer(app);
initSocket(server); // 🔥 Habilita socket.io para avisar cambios en tiempo real

const port = process.env.PORT || 3001;
server.listen(port, () => {
  console.log(`✅ Servidor backend corriendo en puerto ${port}`);
});
