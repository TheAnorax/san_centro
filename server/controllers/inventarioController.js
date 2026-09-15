const nodemailer = require("nodemailer");
const axios = require("axios");
const {
  obtenerInventario,
  actualizarUbicacion,
  actualizarLimites,
  actualizarInvOpt,
  limpiarInvOpt,
  cargaMasivaLimites,
  buscarProductosPorCodigos
} = require('../models/inventarioModel');
const plantillaCorreoStock = require("../utils/plantillaCorreoStock");
const { plantillaCorreoStockMasivo } = require("../utils/plantillaCorreoStock");

const DESTINATARIOS = ["desarrollo4@santul.net"];

// ================================================
// GET Inventario
// ================================================
async function todosLosInventarios(req, res) {
  try {
    const inventario = await obtenerInventario();
    res.json(inventario);
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al consultar inventario", error: error.message });
  }
}

// ================================================
// ENVIAR CORREO
// ================================================
async function solicitarProducto(req, res) {
  try {
    const { codigo, descripcion, ubicacion, stock, cantidadSolicitada, solicitante, masters, inners, sueltas } = req.body;

    if (!codigo || !cantidadSolicitada || !solicitante) {
      return res.status(400).json({ success: false, message: "Faltan datos obligatorios" });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: "crossdoog@gmail.com", pass: "lrzm nkgj ysbi gmpt" }
    });

    const html = plantillaCorreoStock({
      codigo, descripcion, ubicacion, stock,
      cantidadSolicitada, solicitante,
      masters, inners, sueltas  // 🆕
    });

    console.time("envioCorreo");
    await transporter.sendMail({
      from: '"📦 Inventario Almacen 7240" <crossdoog@gmail.com>',
      to: DESTINATARIOS.join(", "),
      subject: `Solicitud de reposición · Código: ${codigo}`,
      html,
      attachments: [{ filename: "logob.png", path: __dirname + "/../assets/logob.png", cid: "logo_santul" }]
    });
    console.timeEnd("envioCorreo");

    return res.json({ success: true, message: "Solicitud enviada correctamente" });

  } catch (error) {
    console.error("❌ Error enviando correo:", error);
    return res.status(500).json({ success: false, message: "Error enviando correo", error: error.message });
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
      data: { Almacen: almacen }
    });
    res.json(response.data);
  } catch (error) {
    console.error("❌ Error consultando inventario JDE:", error.response?.data || error.message);
    res.status(500).json({ success: false, message: "Error consultando inventario JDE", error: error.response?.data || error.message });
  }
}

// ================================================
// PUT Actualizar Ubicación
// ================================================
const actualizarUbicacionController = async (req, res) => {
  try {
    const { id, ubicacion } = req.body;
    if (!id || !ubicacion) return res.status(400).json({ ok: false, message: "ID y ubicación son requeridos" });

    const result = await actualizarUbicacion(id, ubicacion);
    if (result.affectedRows === 0) return res.status(404).json({ ok: false, message: "No se encontró el registro" });

    res.json({ ok: true, message: "Ubicación actualizada correctamente" });
  } catch (error) {
    console.error("Error actualizarUbicacion:", error);
    res.status(500).json({ ok: false, message: "Error en el servidor", error });
  }
};

// ================================================
// PUT Actualizar inv_min, inv_max → calcula inv_opt solo
// ================================================
const actualizarLimitesController = async (req, res) => {
  try {
    const { id, inv_min, inv_max } = req.body;
    if (!id) return res.status(400).json({ ok: false, message: "ID requerido" });

    const result = await actualizarLimites(id, inv_min ?? null, inv_max ?? null);
    if (result.affectedRows === 0) return res.status(404).json({ ok: false, message: "No se encontró el registro" });

    res.json({ ok: true, message: "Límites actualizados y inv_opt calculado correctamente" });
  } catch (error) {
    console.error("Error actualizarLimites:", error);
    res.status(500).json({ ok: false, message: "Error en el servidor", error });
  }
};

// ================================================
// PUT Recalcular inv_opt en toda la tabla
// ================================================
async function recalcularInvOpt(req, res) {
  try {
    console.log("🔄 Recalculando inv_opt...");
    await limpiarInvOpt();
    const result = await actualizarInvOpt();
    console.log(`✅ inv_opt actualizado en ${result.affectedRows} productos`);
    res.json({ success: true, message: `inv_opt actualizado en ${result.affectedRows} productos` });
  } catch (error) {
    console.error("❌ Error recalculando inv_opt:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}


// ================================================
// POST Carga Masiva inv_min e inv_max por código
// ================================================
const cargaMasivaLimitesController = async (req, res) => {
  try {
    const { productos } = req.body;

    if (!Array.isArray(productos) || productos.length === 0) {
      return res.status(400).json({ ok: false, message: "No se recibieron productos" });
    }

    const resultado = await cargaMasivaLimites(productos);

    res.json({
      ok: true,
      message: `Se actualizaron ${resultado.actualizados} productos correctamente`,
      actualizados: resultado.actualizados,
      noEncontrados: resultado.noEncontrados
    });

  } catch (error) {
    console.error("Error cargaMasivaLimites:", error);
    res.status(500).json({ ok: false, message: "Error en el servidor", error });
  }
};



// ================================================
// POST Solicitud masiva por Excel (código + cantidad)
// Busca cada código en inventario; a los que sí existen
// les manda UN solo correo consolidado y regresa cuáles
// se agregaron a la solicitud y cuáles no se encontraron.
// ================================================
const solicitarProductoMasivoController = async (req, res) => {
  try {
    const { productos, solicitante } = req.body;

    if (!Array.isArray(productos) || productos.length === 0) {
      return res.status(400).json({ ok: false, message: "No se recibieron productos" });
    }
    if (!solicitante) {
      return res.status(400).json({ ok: false, message: "Falta el solicitante" });
    }

    // Normaliza: quita filas sin código y sin cantidad válida.
    const filas = productos
      .map((p) => ({
        codigo: String(p.codigo ?? "").trim(),
        cantidad: Number(p.cantidad),
      }))
      .filter((p) => p.codigo && Number.isFinite(p.cantidad) && p.cantidad > 0);

    if (filas.length === 0) {
      return res.status(400).json({ ok: false, message: "El archivo no tiene filas válidas (código + cantidad)" });
    }

    const { encontrados, noEncontrados } = await buscarProductosPorCodigos(filas.map((f) => f.codigo));

    // Une cada producto encontrado con la cantidad que traía su fila del Excel.
    const mapaCantidades = {};
    filas.forEach((f) => { mapaCantidades[f.codigo] = f.cantidad; });

    const agregados = encontrados.map((row) => ({
      codigo: row.codigo_producto,
      descripcion: row.descripcion,
      ubicacion: row.ubicacion,
      stock: row.cant_stock_real,
      cantidadSolicitada: mapaCantidades[String(row.codigo_producto).trim()] ?? "",
    }));

    if (agregados.length > 0) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: "crossdoog@gmail.com", pass: "lrzm nkgj ysbi gmpt" }
      });

      const html = plantillaCorreoStockMasivo({ productos: agregados, solicitante });

      await transporter.sendMail({
        from: '"📦 Inventario Almacen 7240" <crossdoog@gmail.com>',
        to: DESTINATARIOS.join(", "),
        subject: `Solicitud masiva de reposición · ${agregados.length} producto(s)`,
        html,
        attachments: [{ filename: "logob.png", path: __dirname + "/../assets/logob.png", cid: "logo_santul" }]
      });
    }

    return res.json({
      ok: true,
      agregados: agregados.map((a) => a.codigo),
      faltan: noEncontrados,
    });

  } catch (error) {
    console.error("❌ Error en solicitud masiva:", error);
    return res.status(500).json({ ok: false, message: "Error enviando la solicitud masiva", error: error.message });
  }
};

module.exports = {
  todosLosInventarios,
  solicitarProducto,
  obtenerInventarioJDE,
  actualizarUbicacion: actualizarUbicacionController,
  actualizarLimites: actualizarLimitesController,
  recalcularInvOpt,
  cargaMasivaLimites: cargaMasivaLimitesController,
  solicitarProductoMasivo: solicitarProductoMasivoController
};