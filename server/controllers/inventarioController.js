const nodemailer = require("nodemailer");
const axios = require("axios");
const { obtenerInventario } = require('../models/inventarioModel');
const plantillaCorreoStock = require("../utils/plantillaCorreoStock");

const DESTINATARIOS = [
  "jonathan.alcantara@santul.net",
];

// ================================================
// GET Inventario
// ================================================
async function todosLosInventarios(req, res) {
  try {
    const inventario = await obtenerInventario();
    res.json(inventario);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al consultar inventario",
      error: error.message
    });
  }
}

// ================================================
// ENVIAR CORREO
// ================================================
async function solicitarProducto(req, res) {
  try {
    const {
      codigo,
      descripcion,
      ubicacion,
      stock,
      cantidadSolicitada,
      solicitante,
    } = req.body;

    if (!codigo || !cantidadSolicitada || !solicitante) {
      return res.status(400).json({
        success: false,
        message: "Faltan datos obligatorios"
      });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "crossdoog@gmail.com",
        pass: "lrzm nkgj ysbi gmpt",
      },
    });

    const html = plantillaCorreoStock({
      codigo,
      descripcion,
      ubicacion,
      stock,
      cantidadSolicitada,
      solicitante,
    });

    // ⏱️ INICIA EL TIMER
    console.time("envioCorreo");

    await transporter.sendMail({
      from: '" 📦 Inventario Almacen 7240" <crossdoog@gmail.com>',
      to: DESTINATARIOS.join(", "),
      subject: `Solicitud de reposición · Código: ${codigo}`,
      html,
      attachments: [
        {
          filename: "logob.png",
          path: __dirname + "/../assets/logob.png",
          cid: "logo_santul"
        }
      ]
    });

    // ⏱️ TERMINA EL TIMER
    console.timeEnd("envioCorreo");

    return res.json({
      success: true,
      message: "Solicitud enviada correctamente"
    });

  } catch (error) {
    console.error("❌ Error enviando correo:", error);
    return res.status(500).json({
      success: false,
      message: "Error enviando correo",
      error: error.message
    });
  }
}

// ================================================
// GET Inventario JDE
// ================================================

async function obtenerInventarioJDE(req, res) {
  try {

    const almacen = req.query.almacen || "7240";

    const response = await axios({
      method: "get",
      url: "http://santul.verpedidos.com:9010/Santul/Inventarios",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": "LflquX0b1rIzKmr2q8zxFBIdkFiqKMSl1KGo2fLR0wNnz2eAHMLoLZnQN2NabTtA"
      },
      data: {
        Almacen: almacen
      }
    });

    res.json(response.data);

  } catch (error) {

    console.error(
      "❌ Error consultando inventario JDE:",
      error.response?.data || error.message
    );

    res.status(500).json({
      success: false,
      message: "Error consultando inventario JDE",
      error: error.response?.data || error.message
    });

  }
}


module.exports = {
  todosLosInventarios,
  solicitarProducto,
  obtenerInventarioJDE
};
