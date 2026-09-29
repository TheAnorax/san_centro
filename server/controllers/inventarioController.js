const nodemailer = require("nodemailer");
const axios = require("axios");
const {
  obtenerInventario,
  actualizarUbicacion,
  actualizarLimites,
  actualizarInvOpt,
  limpiarInvOpt,
  cargaMasivaLimites,
  buscarProductosPorCodigos,
  crearSolicitudesInventario,
  listarSolicitudesInventario,
  actualizarEstadoSolicitudInventario
} = require('../models/inventarioModel');
const plantillaCorreoStock = require("../utils/plantillaCorreoStock");
const { plantillaCorreoStockMasivo } = require("../utils/plantillaCorreoStock");
// 💲 Misma API de precios/unidad de medida que usa Muestras.jsx
// (pedidoDetProd), para poder mostrar el correo de solicitud con la UM y el
// costo real de cada producto, no solo el código y la cantidad.
const { resolverUnidadYCosto } = require("../utils/preciosProducto");

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

    // 💲 Se consulta la unidad de medida y el costo real (mismo catálogo de
    // ventas que usa Muestras.jsx) para que el correo no muestre solo la
    // cantidad "pelona", sino en qué unidad y a qué costo se está pidiendo.
    const { um, precioUnitarioSinIva, costoTotalSinIva, minimoVenta } = await resolverUnidadYCosto(codigo, cantidadSolicitada);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: "crossdoog@gmail.com", pass: "lrzm nkgj ysbi gmpt" }
    });

    const html = plantillaCorreoStock({
      codigo, descripcion, ubicacion, stock,
      cantidadSolicitada, solicitante,
      masters, inners, sueltas,  // 🆕
      um, precioUnitarioSinIva, costoTotalSinIva, minimoVenta
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

    // 📝 Se registra en "No Pedido": el correo ya avisó que hay una
    // solicitud, pero todavía falta que el siguiente departamento la
    // revise/ajuste (Modificación) y Dirección la apruebe (Autorizada).
    await crearSolicitudesInventario([{ sku: codigo, cantidad: cantidadSolicitada }]);

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

    // 💲 Para cada código encontrado se consulta su UM real y su costo
    // (mismo catálogo de ventas que Muestras.jsx), en paralelo para no hacer
    // la solicitud masiva lenta si son muchos códigos.
    const agregados = await Promise.all(encontrados.map(async (row) => {
      const cantidadSolicitada = mapaCantidades[String(row.codigo_producto).trim()] ?? "";
      const { um, precioUnitarioSinIva, costoTotalSinIva, minimoVenta } = await resolverUnidadYCosto(row.codigo_producto, cantidadSolicitada);
      return {
        codigo: row.codigo_producto,
        descripcion: row.descripcion,
        ubicacion: row.ubicacion,
        stock: row.cant_stock_real,
        cantidadSolicitada,
        um,
        precioUnitarioSinIva,
        costoTotalSinIva,
        minimoVenta,
      };
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

      // 📝 Igual que en la solicitud individual: cada producto que sí se
      // agregó y se mandó por correo queda registrado en "No Pedido".
      await crearSolicitudesInventario(
        agregados.map((a) => ({ sku: a.codigo, cantidad: a.cantidadSolicitada }))
      );
    }

    // Productos que sí se agregaron pero no completan su empaque mínimo de
    // venta (cant_sec) — se avisa en pantalla además del correo, sin
    // bloquear ni redondear nada.
    const advertenciasEmpaque = agregados
      .filter((a) => a.minimoVenta && !a.minimoVenta.completo)
      .map((a) => ({
        codigo: a.codigo,
        cantidadSolicitada: a.cantidadSolicitada,
        piezasPorEmpaque: a.minimoVenta.piezasPorEmpaque,
        unidadEmpaque: a.minimoVenta.unidadEmpaque,
        faltantePiezas: a.minimoVenta.faltantePiezas,
      }));

    return res.json({
      ok: true,
      // Detalle completo (código, descripción, cantidad, UM, costo, empaque
      // mínimo) para que la pantalla pueda mostrar una tabla de resultados,
      // no solo la lista de códigos.
      agregados,
      faltan: noEncontrados,
      advertenciasEmpaque,
    });

  } catch (error) {
    console.error("❌ Error en solicitud masiva:", error);
    return res.status(500).json({ ok: false, message: "Error enviando la solicitud masiva", error: error.message });
  }
};

// ================================================
// GET Listar solicitudes de inventario (sku/cantidad/estado)
// Filtro opcional ?estado=No Pedido|Modificacion|Autorizada
// ================================================
const listarSolicitudesInventarioController = async (req, res) => {
  try {
    const { estado } = req.query;
    const solicitudes = await listarSolicitudesInventario(estado || null);
    res.json({ ok: true, data: solicitudes });
  } catch (error) {
    console.error("Error listando solicitudes de inventario:", error);
    res.status(500).json({ ok: false, message: "Error al listar solicitudes", error: error.message });
  }
};

// ================================================
// PUT Cambiar estado de una solicitud
// (No Pedido -> Modificacion -> Autorizada)
// ================================================
const actualizarEstadoSolicitudInventarioController = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const estadosValidos = ["No Pedido", "Modificacion", "Autorizada"];

    if (!id) return res.status(400).json({ ok: false, message: "ID requerido" });
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ ok: false, message: `Estado inválido. Debe ser uno de: ${estadosValidos.join(", ")}` });
    }

    const result = await actualizarEstadoSolicitudInventario(id, estado);
    if (result.affectedRows === 0) return res.status(404).json({ ok: false, message: "No se encontró la solicitud" });

    res.json({ ok: true, message: "Estado actualizado correctamente" });
  } catch (error) {
    console.error("Error actualizando estado de solicitud:", error);
    res.status(500).json({ ok: false, message: "Error en el servidor", error: error.message });
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
  solicitarProductoMasivo: solicitarProductoMasivoController,
  listarSolicitudesInventario: listarSolicitudesInventarioController,
  actualizarEstadoSolicitudInventario: actualizarEstadoSolicitudInventarioController
};