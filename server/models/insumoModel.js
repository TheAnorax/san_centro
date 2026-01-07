const pool = require('../db');

async function insertarInsumo(data) {
  const {
    codigopropuesto,
    minimofabricacion,
    descripcion,
    caracteristicas,
    inventario,
    tiempodefabricacion,
    um,
    consumomensual,
    inventarioptimo,
    inventariominimo,
    requerimiento,
    area
  } = data;

  const query = `
  INSERT INTO insumos (
    codigopropuesto, minimofabricacion, descripcion, caracteristicas,
    inventario, tiempodefabricacion, um, consumomensual,
    inventarioptimo, inventariominimo, requerimiento, area
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;


  const values = [
    codigopropuesto,
    minimofabricacion,
    descripcion,
    caracteristicas,
    inventario,
    tiempodefabricacion,
    um,
    consumomensual,
    inventarioptimo,
    inventariominimo,
    requerimiento,
    area,
  ];

  const [result] = await pool.query(query, values);
  return result;
}

async function obtenerInsumos() {
  const [rows] = await pool.query('SELECT * FROM insumos');
  return rows;
}

async function actualizarInsumo(id, data) {
  const {
    codigopropuesto,
    minimofabricacion,
    descripcion,
    caracteristicas,
    inventario,
    tiempodefabricacion,
    um,
    consumomensual,
    inventarioptimo,
    inventariominimo,
    requerimiento,
    area
  } = data;

  const query = `
    UPDATE insumos SET
      codigopropuesto=?, minimofabricacion=?, descripcion=?, caracteristicas=?,
      inventario=?, tiempodefabricacion=?, um=?, consumomensual=?,
      inventarioptimo=?, inventariominimo=?, requerimiento=?, area=?
    WHERE id_insumos=?
  `;

  const values = [
    codigopropuesto, minimofabricacion, descripcion, caracteristicas,
    inventario, tiempodefabricacion, um, consumomensual,
    inventarioptimo, inventariominimo, requerimiento, area, id
  ];

  const [result] = await pool.query(query, values);
  return result;
}

async function registrarMovimiento(data) {
  const { id_insumos, tipo, cantidad, usuario, area, entregado_a, comentario } = data;

  // 1. Inserta el movimiento
  await pool.query(
    `INSERT INTO movimientos_insumo 
     (id_insumos, tipo, cantidad, usuario, area, entregado_a, comentario) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id_insumos, tipo, cantidad, usuario, area, entregado_a, comentario]
  );

  // 2. Actualiza el inventario
  const [rows] = await pool.query(`SELECT inventario FROM insumos WHERE id_insumos = ?`, [id_insumos]);
  let inventarioActual = Number(rows[0].inventario); // <-- Cambio aquí
  let cantidadFinal = Number(cantidad);

  let inventarioFinal = tipo === 'SALIDA'
    ? Math.max(0, inventarioActual - cantidadFinal)
    : inventarioActual + cantidadFinal;

  await pool.query(
    `UPDATE insumos SET inventario = ? WHERE id_insumos = ?`,
    [inventarioFinal, id_insumos]
  );
}

function obtenerMovimientosPorInsumo(id_insumos) {
  return db.query(
    `SELECT * FROM movimientos_insumo WHERE id_insumos = ? ORDER BY fecha DESC`,
    [id_insumos]
  );
}

async function obtenerTodosLosMovimientos() {
  const [rows] = await pool.query(`
    SELECT 
      m.*, 
      i.codigopropuesto, 
      i.descripcion
    FROM movimientos_insumo m
    LEFT JOIN insumos i ON m.id_insumos = i.id_insumos
    ORDER BY m.fecha DESC
  `);
  return rows;
}

// guardar insumos en mi base de datos 


async function guardarSolicitud({ codigo, descripcion, cantidad, area, solicitante }) {
  const query = `
    INSERT INTO insumos_solicitudes (codigo, descripcion, cantidad, area, solicitante)
    VALUES (?, ?, ?, ?, ?)
  `;

  const values = [codigo, descripcion, cantidad, area, solicitante];

  const [result] = await pool.query(query, values);
  return result;
}

async function obtenerSolicitudes() {
  const [rows] = await pool.query(`
    SELECT * FROM insumos_solicitudes
    ORDER BY fecha_solicitud DESC
  `);
  return rows;
}

async function actualizarEstadoSolicitud(id, estado) {
  let campoFecha = estado === "APROBADO" ? "fecha_aprobado" : "fecha_recibido";

  await pool.query(
    `UPDATE insumos_solicitudes SET estado=?, ${campoFecha}=NOW() WHERE id=?`,
    [estado, id]
  );

  return true;
}

async function guardarSolicitud({ codigo, descripcion, cantidad, area, solicitante }) {
  const query = `
    INSERT INTO insumos_solicitudes (codigo, descripcion, cantidad, area, solicitante)
    VALUES (?, ?, ?, ?, ?)
  `;

  const values = [codigo, descripcion, cantidad, area, solicitante];

  const [result] = await pool.query(query, values);
  return result;
}



module.exports = {
  
  insertarInsumo,
  obtenerInsumos,
  actualizarInsumo,
  registrarMovimiento,
  obtenerMovimientosPorInsumo,
  obtenerTodosLosMovimientos,
  // nuevos insercciones
  guardarSolicitud,
  obtenerSolicitudes,
  actualizarEstadoSolicitud,

};