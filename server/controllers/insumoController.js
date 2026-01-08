const { insertarInsumo, obtenerInsumos, actualizarInsumo, registrarMovimiento,
  obtenerMovimientosPorInsumo, obtenerTodosLosMovimientos,
  guardarSolicitud,        // 👈 FALTABA ESTO
  obtenerSolicitudes,      // 👈 también lo necesitas
  actualizarEstadoSolicitud } = require('../models/insumoModel');

const plantillaCorreoEstado = require("../utils/plantillaCorreoEstado");
const plantillaCorreoSolicitud = require("../utils/plantillaCorreoSolicitud");
const path = require("path");
const nodemailer = require("nodemailer");


async function crearInsumo(req, res) {
  try {
    const data = req.body;
    const result = await insertarInsumo(data);
    res.status(201).json({
      success: true,
      message: 'Insumo registrado correctamente',
      insertId: result.insertId
    });
  } catch (error) {
    console.error('❌ Error al insertar insumo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar insumo',
      error: error.message
    });
  }
}

async function obtenerTodosLosInsumos(req, res) {
  try {
    const insumos = await obtenerInsumos();
    res.json(insumos);
  } catch (error) {
    console.error('❌ Error al obtener insumos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener insumos',
      error: error.message
    });
  }
}

async function editarInsumo(req, res) {
  try {
    const id = req.params.id;
    const data = req.body;
    console.log("ID recibido:", id);
    console.log("DATA recibida:", data);
    await actualizarInsumo(id, data);
    res.json({ success: true, message: "Insumo actualizado correctamente" });
  } catch (error) {
    console.error("❌ Error en editarInsumo:", error);
    res.status(500).json({ success: false, message: "Error al actualizar insumo", error: error.message });
  }
}

async function crearMovimiento(req, res) {
  try {
    const data = req.body;
    await registrarMovimiento(data);
    res.status(201).json({ success: true, message: "Movimiento registrado correctamente" });
  } catch (error) {
    console.error('❌ Error en crearMovimiento:', error); // <-- Cambiado para mostrar el error real
    res.status(500).json({ success: false, message: "Error al registrar movimiento", error: error.message });
  }
}


// Obtener movimientos de un insumo
async function movimientosPorInsumo(req, res) {
  try {
    const { id_insumos } = req.params;
    const [movimientos] = await obtenerMovimientosPorInsumo(id_insumos);
    res.json(movimientos);
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al consultar movimientos", error: error.message });
  }
}

// (Opcional) Todos los movimientos
async function todosLosMovimientos(req, res) {
  try {
    const movimientos = await obtenerTodosLosMovimientos();
    res.json(movimientos);
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al consultar movimientos", error: error.message });
  }
}


// CORREO DE LOS INSUMOS 

async function enviarSolicitud(req, res) {
  try {
    const { codigo, descripcion, cantidad, area, usuario } = req.body;

    if (!codigo || !cantidad) {
      return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    // Convertir usuario en objeto si viene como JSON string
    let solicitanteParsed = usuario;
    try {
      solicitanteParsed = JSON.parse(usuario);
    } catch { }

    const solicitanteNombre = solicitanteParsed.nombre || "Sin Nombre";

    // 👉 1: Guardar en base de datos
    await guardarSolicitud({
      codigo,
      descripcion,
      cantidad,
      area,
      solicitante: solicitanteNombre
    });

    // 👉 2: Crear transportador de correo
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "crossdoog@gmail.com",
        pass: "lrzm nkgj ysbi gmpt",
      },
    });

    // 👉 3: Generar HTML con diseño bonito
    const html = plantillaCorreoSolicitud({
      codigo,
      descripcion,
      cantidad,
      area,
      solicitante: solicitanteNombre
    });

    // 👉 4: Configurar correo
    const mailOptions = {
      from: '"Santul – Insumos del Centro Historico" <crossdoog@gmail.com>',
      to: "jonathan.alcantara@santul.net",
      subject: `Nueva Solicitud de Insumo (${codigo})`,
      html,
      attachments: [
        {
          filename: "logo.png",
          path: path.join(__dirname, "../assets/logob.png"),
          cid: "logo_santul"
        }
      ]
    };

    // 👉 5: Enviar correo
    await transporter.sendMail(mailOptions);

    return res.json({ mensaje: "Solicitud enviada y guardada correctamente" });

  } catch (error) {
    console.error("❌ Error en enviarSolicitud:", error);
    res.status(500).json({ error: "Error al enviar o guardar la solicitud" });
  }
}

async function verSolicitudes(req, res) {
  try {
    const solicitudes = await obtenerSolicitudes();
    res.json(solicitudes);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener solicitudes" });
  }
}


async function cambiarEstadoSolicitud(req, res) {
  try {
    const { id, estado } = req.params;

    // 1️⃣ Actualizar DB
    await actualizarEstadoSolicitud(id, estado);

    // 2️⃣ Obtener datos
    const solicitudes = await obtenerSolicitudes();
    const solicitud = solicitudes.find(s => s.id == id);

    if (!solicitud) {
      return res.status(404).json({ error: "Solicitud no encontrada" });
    }

    // 3️⃣ Configurar correo
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "crossdoog@gmail.com",
        pass: "lrzm nkgj ysbi gmpt"
      }
    });

    const html = plantillaCorreoEstado({
      codigo: solicitud.codigo,
      descripcion: solicitud.descripcion,
      cantidad: solicitud.cantidad,
      area: solicitud.area,
      solicitante: solicitud.solicitante,
      estado
    });

    const mailOptions = {
      from: '"Santul – Insumos del Centro Historico" <crossdoog@gmail.com>',
      to: "jonathan.alcantara@santul.net",
      subject: `Solicitud ${estado} (${solicitud.codigo})`,
      html,
      attachments: [
        {
          filename: "logo.png",
          path: path.join(__dirname, "../assets/logob.png"),
          cid: "logo_santul"
        }
      ]
    };

    await transporter.sendMail(mailOptions);

    res.json({ mensaje: "Estado actualizado y correo enviado correctamente" });

  } catch (error) {
    console.error("❌ Error en cambiarEstadoSolicitud:", error);
    res.status(500).json({ error: "Error al actualizar estado o enviar correo" });
  }
}


module.exports = {
  crearInsumo, obtenerTodosLosInsumos, editarInsumo, crearMovimiento, movimientosPorInsumo, todosLosMovimientos, enviarSolicitud, verSolicitudes,
  cambiarEstadoSolicitud,
};
