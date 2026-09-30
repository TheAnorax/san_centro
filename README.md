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

## Estructura del proyecto

```
san_centro/
├── client/                        # Frontend React
│   └── src/components/views/      # Pantallas principales (una por módulo)
├── server/                        # Backend Express
│   ├── routes/                    # Rutas por módulo (/api/...)
│   ├── controllers/                # Lógica de cada endpoint
│   ├── models/                     # Acceso a datos (queries MySQL)
│   ├── utils/                      # Plantillas de correo, helpers
│   ├── appSanCed/                  # Sub-app MVC para Surtido/Embarques
│   └── server.js                   # Punto de entrada, monta todos los routers
```

## Módulos y funcionalidad

### Inventario (`inventario.jsx` / `inventarioRouter.js`)
- Tabla general de inventario por ubicación, con stock, mínimos/máximos y cálculo automático de faltante (`inv_opt`).
- Carga masiva de mínimos/máximos vía Excel.
- Pestaña **Solicitar Inventario** (acceso restringido por rol):
  - Subida de Excel (código + cantidad) o sincronización automática de faltantes calculados por la app — la cantidad siempre se toma del faltante real (`inv_opt`), no de lo que traiga el archivo.
  - Validación de cierre a empaque **Master/Inner**: si un código maneja ambos empaques y la cantidad no cierra exacto a ninguno, se marca en rojo y se puede "Cerrar a Master" o "Cerrar a Inner".
  - Envío de correo de solicitud (individual o masiva) y registro en la tabla `solicitudes_inventario`.
  - **Bandeja de Planeación**: revisa el pedido completo (todos los SKUs agrupados bajo un mismo `numero_pedido`, sincronizado con la numeración de CrossDock/sanced), edita cantidades, y manda el pedido completo a pedir autorización con un solo botón (no uno por uno).
  - **Flujo de autorización por correo**: al mandar a autorizar se genera un correo a Dirección con dos botones (Autorizar/Cancelar) que resuelven el pedido directamente desde el correo (pide el nombre de quien confirma, sin necesitar login), y se manda un correo de confirmación final.
  - Marcado de pedido como "Registrado en CEDIS" (una vez capturado en la otra aplicación, ya no aparece como pendiente).

Estados de una solicitud: `No Pedido` → `Modificacion` (en revisión) → `Pendiente Autorizacion` → `Autorizada` / `Cancelada`.

### Surtido (`Surtido.jsx` / `surtidoRoutes.js` / `appSanCed`)
- Gestión de pedidos en proceso de surtido, agrupados por orden/tipo, con asignación de usuario surtidor.
- Fusión de órdenes (misma bahía) en un solo pedido de trabajo.
- Vista previa y generación de PDF de surtido, con detalle de productos, motivos de no-enviado, y recuento de partidas por tipo original (para órdenes fusionadas).
- Generación de Packing List (formato de recepción para el cliente).
- Finalización de pedido → mueve el pedido a Embarques.

### Embarques
- Listado de pedidos finalizados listos para embarque, asignación a paquetería/transporte.

### Plan de Rutas (`Plan.jsx` / `planRoutes.js`)
- Carga de pedidos tipo "CD" en vivo desde la API externa de Sanced (solo lectura) o por Excel.
- Asignación de pedidos a rutas/bahías.
- Persistencia local (localStorage) hasta que se confirma el envío de rutas (`Enviar Rutas`), momento en el que se guarda en base de datos.

### Activos, Insumos, Traspaso
- Módulos de control de activos fijos, insumos de operación y traspasos entre almacenes/ubicaciones.

### Usuarios, Roles y Permisos
- Administración de usuarios, asignación de rol (`rol_id`) y permisos por pantalla/acción.
- Roles relevantes: `admin` (1), `supervisor` (13), `Planeación` (20), entre otros (Surtidor, Recibo, Compras, Paquetería, Embarques, Auditoría, Transporte).
- Validación de acceso en frontend por `rol_id` (estable) en vez de por nombre de rol (evita problemas de mayúsculas/typos).

## Tiempo real

El backend emite eventos de Socket.IO (`pedidos-actualizados`) cuando hay cambios relevantes (escaneo desde la app móvil de surtido, movimientos de pedidos, etc.). El frontend se suscribe y refresca sus listas automáticamente, sin que el usuario tenga que recargar la página.

## Integraciones externas

- **API Sanced** (`santul.verpedidos.com:9010`) — solo lectura, para traer pedidos tipo CD al Plan de Rutas.
- **CrossDock (app "sanced")** (`66.232.105.87:3007/api/cross-dock`) — se consulta el último "NO ORDEN" para que la numeración de pedidos de inventario (`numero_pedido`) siga la misma secuencia.
- **Catálogo de precios/unidad de medida** (`pedidoDetProd`) — usado para calcular costos y unidad de medida en los correos de solicitud de inventario.

## Configuración / variables de entorno

El servidor usa `dotenv`. Variables relevantes en `server/db.js`:

```
DB_HOST=66.232.105.107
DB_USER=root
DB_PASS=********
DB_NAME=san_centro
```

## Cómo correr el proyecto

**Backend**
```bash
cd server
npm install
npm run dev      # con nodemon
# o
npm start
```

**Frontend**
```bash
cd client
npm install
npm start
```

El backend expone la API en el puerto configurado en `server.js` (por defecto vía Express) bajo el prefijo `/api/...`; el frontend (CRA) corre en `http://localhost:3000` y consume esa API.

## Notas de mantenimiento

- Los cambios de esquema de base de datos (nuevas columnas/estados) no se aplican automáticamente: hay que correr manualmente los `ALTER TABLE` correspondientes en la base `san_centro`.
- Las credenciales de correo (Gmail) usadas por `nodemailer` están hardcodeadas en los controllers (`santuldesarrollo@gmail.com`); si se revoca el password de aplicación de Gmail, hay que generar uno nuevo y actualizarlo ahí.
