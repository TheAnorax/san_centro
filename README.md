# San Centro

Sistema web de gestión operativa para el futuro CEDIS de Centro Histórico (Santul). Cubre inventario, surtido de pedidos, embarques, plan de rutas, control de activos, insumos, traspasos y administración de usuarios/roles/permisos.

## Stack técnico

**Frontend** (`client/`)
- React 19 + React Router 7
- MUI (Material UI) 7 para componentes de interfaz
- Axios para consumo de API
- Socket.IO Client para actualizaciones en tiempo real
- `xlsx` para leer/generar archivos Excel
- `jspdf` + `jspdf-autotable` para generación de PDFs (packing list, hojas de surtido)

**Backend** (`server/`)
- Node.js + Express 5
- MySQL (vía `mysql2`) — base de datos `san_centro`
- Socket.IO (servidor) para notificar cambios en tiempo real a los clientes conectados
- `bcrypt` + `jsonwebtoken` para autenticación
- `nodemailer` para envío de correos (solicitudes de inventario, autorizaciones)
- `multer` para carga de archivos
- Sub-aplicación `server/appSanCed/` con su propia estructura MVC (config/controllers/models/routes/middlewares) para módulos específicos de Surtido/Embarques
