const nodemailer = require("nodemailer");
const axios = require("axios");
const crypto = require("crypto");
const {
  obtenerInventario,
  actualizarUbicacion,
  actualizarLimites,
  actualizarInvOpt,
  limpiarInvOpt,
  sincronizarStockRealSantul,
  cargaMasivaLimites,
  buscarProductosPorCodigos,
  crearSolicitudesInventario,
  listarSolicitudesInventario,
  actualizarEstadoSolicitudInventario,
  actualizarCantidadSolicitudInventario,
  marcarLotePendienteAutorizacion,
  obtenerLotePorToken,
  resolverLotePorToken,
  marcarPedidoRegistradoEnCedis
} = require('../models/inventarioModel');
const plantillaCorreoStock = require("../utils/plantillaCorreoStock");
const { plantillaCorreoStockMasivo, plantillaCorreoSolicitarAutorizacion } = require("../utils/plantillaCorreoStock");
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
    // 🆕 Ya no se manda "tal cual, sin redondear": si no completa el empaque
    // mínimo de venta se ajusta hacia abajo (cantidadAjustada), y si ni para
    // 1 empaque completo alcanza, se rechaza el envío.
    const { um, precioUnitarioSinIva, costoTotalSinIva, minimoVenta, cantidadAjustada, excluidoPorEmpaqueIncompleto } =
      await resolverUnidadYCosto(codigo, cantidadSolicitada);

    if (excluidoPorEmpaqueIncompleto) {
      return res.status(400).json({
        success: false,
        message: `La cantidad (${cantidadSolicitada}) no alcanza para completar ni 1 empaque mínimo de venta (${minimoVenta.unidadEmpaque} de ${minimoVenta.piezasPorEmpaque} PZ). No se envió la solicitud.`,
      });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: "santuldesarrollo@gmail.com", pass: "kcjx obmc cvaz vecr" }
    });

    const html = plantillaCorreoStock({
      codigo, descripcion, ubicacion, stock,
      cantidadSolicitada: cantidadAjustada, solicitante,
      masters, inners, sueltas,  // 🆕
      um, precioUnitarioSinIva, costoTotalSinIva, minimoVenta
    });

    console.time("envioCorreo");
    await transporter.sendMail({
      from: '"📦 Inventario Almacen 7240" <santuldesarrollo@gmail.com>',
      to: DESTINATARIOS.join(", "),
      subject: `Solicitud de reposición · Código: ${codigo}`,
      html,
      attachments: [{ filename: "logob.png", path: __dirname + "/../assets/logob.png", cid: "logo_santul" }]
    });
    console.timeEnd("envioCorreo");

    // 📝 Se registra en "No Pedido": el correo ya avisó que hay una
    // solicitud, pero todavía falta que el siguiente departamento la
    // revise/ajuste (Modificación) y Dirección la apruebe (Autorizada).
    // `solicitante` (quien la mandó) queda guardado como solicitado_por.
    await crearSolicitudesInventario([{ sku: codigo, cantidad: cantidadAjustada }], solicitante);

    return res.json({ success: true, message: "Solicitud enviada correctamente" });

  } catch (error) {
    console.error("❌ Error enviando correo:", error);
    return res.status(500).json({ success: false, message: "Error enviando correo", error: error.message });
  }
}

// ================================================
// 🆕 GET Disponibilidad en vivo de un almacén (Santul), SOLO para mostrar en
// pantalla — NO actualiza cant_stock_real ni toca la base para nada. Se usa
// para la columna "Disponible en 7050" de la tabla de Solicitar Inventario:
// la sincronización que sí se guarda en la base sigue siendo la del 7240.
// ================================================
async function obtenerDisponibilidadSantul(req, res) {
  try {
    const almacen = req.query.almacen || "7050";
    const { data } = await axios({
      method: "get",
      url: "http://santul.verpedidos.com:9010/Santul/Inventarios",
      headers: { "Content-Type": "application/json" },
      data: { Almacen: almacen },
      timeout: 15000,
    });
    const productos = Array.isArray(data) ? data : [];
    const disponibilidad = {};
    productos.forEach((p) => {
      if (p.Clave === undefined) return;
      const comprometido = Number(p.Comprometido) || 0;
      const fisica = Number(p.Existencia_Fisica) || 0;
      disponibilidad[String(p.Clave).trim()] = fisica - comprometido;
    });
    res.json({ success: true, almacen, disponibilidad });
  } catch (error) {
    console.error("❌ Error consultando disponibilidad Santul:", error.response?.data || error.message);
    res.status(500).json({ success: false, message: "Error consultando disponibilidad", error: error.message });
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
    // 🆕 Antes de recalcular el faltante, SIEMPRE se sincroniza primero
    // cant_stock_real contra la existencia física real de Santul — así el
    // inventario de la app nunca queda desfasado del almacén real. Si
    // Santul no responde, se sigue con el stock que ya había (no se rompe
    // el flujo), solo se deja constancia en el log.
    console.log("🔄 Sincronizando stock real con Santul...");
    const sync = await sincronizarStockRealSantul();

    console.log("🔄 Recalculando inv_opt...");
    await limpiarInvOpt();
    const result = await actualizarInvOpt();
    console.log(`✅ inv_opt actualizado en ${result.affectedRows} productos`);
    res.json({
      success: true,
      message: `inv_opt actualizado en ${result.affectedRows} productos`,
      stockReal: sync,
    });
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
    // 🆕 Ya no se manda nada "tal cual, sin redondear": si un producto no
    // completa su empaque mínimo de venta (cant_sec), se redondea hacia
    // abajo al múltiplo completo más cercano (cantidadAjustada), y si ni
    // siquiera alcanza para 1 empaque completo, se excluye por completo
    // (no se manda, no se cotiza, no se registra). Los productos sin
    // empaque mínimo (puro PZ) no se tocan.
    const resultados = await Promise.all(encontrados.map(async (row) => {
      const cantidadSolicitada = mapaCantidades[String(row.codigo_producto).trim()] ?? "";
      const { um, precioUnitarioSinIva, costoTotalSinIva, minimoVenta, cantidadAjustada, excluidoPorEmpaqueIncompleto } =
        await resolverUnidadYCosto(row.codigo_producto, cantidadSolicitada);

      if (excluidoPorEmpaqueIncompleto) {
        return { excluido: true, codigo: row.codigo_producto, minimoVenta, cantidadSolicitada };
      }

      return {
        excluido: false,
        codigo: row.codigo_producto,
        descripcion: row.descripcion,
        ubicacion: row.ubicacion,
        stock: row.cant_stock_real,
        cantidadSolicitada: cantidadAjustada,
        um,
        precioUnitarioSinIva,
        costoTotalSinIva,
        minimoVenta,
      };
    }));

    const agregados = resultados.filter((r) => !r.excluido);
    const excluidosPorEmpaque = resultados
      .filter((r) => r.excluido)
      .map((r) => ({
        codigo: r.codigo,
        cantidadSolicitada: r.cantidadSolicitada,
        piezasPorEmpaque: r.minimoVenta?.piezasPorEmpaque ?? null,
        unidadEmpaque: r.minimoVenta?.unidadEmpaque ?? null,
      }));

    if (agregados.length > 0) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: "santuldesarrollo@gmail.com", pass: "kcjx obmc cvaz vecr" }
      });

      const html = plantillaCorreoStockMasivo({ productos: agregados, solicitante, excluidos: excluidosPorEmpaque });

      await transporter.sendMail({
        from: '"📦 Inventario Almacen 7240" <santuldesarrollo@gmail.com>',
        to: DESTINATARIOS.join(", "),
        subject: `Solicitud masiva de reposición · ${agregados.length} producto(s)`,
        html,
        attachments: [{ filename: "logob.png", path: __dirname + "/../assets/logob.png", cid: "logo_santul" }]
      });

      // 📝 Igual que en la solicitud individual: cada producto que sí se
      // agregó y se mandó por correo queda registrado en "No Pedido", con
      // `solicitante` como solicitado_por.
      await crearSolicitudesInventario(
        agregados.map((a) => ({ sku: a.codigo, cantidad: a.cantidadSolicitada })),
        solicitante
      );
    }

    // 🆕 Ya no hay "advertencias de empaque incompleto" (antes se mandaban
    // tal cual sin redondear): lo que sí se agregó ya viene siempre en un
    // múltiplo completo de su empaque mínimo, así que aquí solo se informan
    // los códigos que se excluyeron por no alcanzar ni para 1 empaque.
    return res.json({
      ok: true,
      // Detalle completo (código, descripción, cantidad, UM, costo, empaque
      // mínimo) para que la pantalla pueda mostrar una tabla de resultados,
      // no solo la lista de códigos.
      agregados,
      faltan: noEncontrados,
      excluidosPorEmpaque,
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
    const { estado, modificadoPor } = req.body;
    const estadosValidos = ["No Pedido", "Modificacion", "Autorizada"];

    if (!id) return res.status(400).json({ ok: false, message: "ID requerido" });
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ ok: false, message: `Estado inválido. Debe ser uno de: ${estadosValidos.join(", ")}` });
    }
    if (!modificadoPor) {
      return res.status(400).json({ ok: false, message: "Falta modificadoPor (quién está haciendo el cambio)" });
    }

    const result = await actualizarEstadoSolicitudInventario(id, estado, modificadoPor);
    if (result.affectedRows === 0) return res.status(404).json({ ok: false, message: "No se encontró la solicitud" });

    res.json({ ok: true, message: "Estado actualizado correctamente" });
  } catch (error) {
    console.error("Error actualizando estado de solicitud:", error);
    res.status(500).json({ ok: false, message: "Error en el servidor", error: error.message });
  }
};

// ================================================
// PUT Cambiar la cantidad de una solicitud (Planeación
// la ajusta, por ejemplo para cerrarla a Master/Inner,
// antes de mandar todo el lote a autorizar).
// ================================================
const actualizarCantidadSolicitudInventarioController = async (req, res) => {
  try {
    const { id } = req.params;
    const { cantidad, modificadoPor } = req.body;

    if (!id) return res.status(400).json({ ok: false, message: "ID requerido" });
    const cantidadNum = Number(cantidad);
    if (!Number.isFinite(cantidadNum) || cantidadNum <= 0) {
      return res.status(400).json({ ok: false, message: "Cantidad inválida" });
    }
    if (!modificadoPor) {
      return res.status(400).json({ ok: false, message: "Falta modificadoPor (quién está haciendo el cambio)" });
    }

    const result = await actualizarCantidadSolicitudInventario(id, cantidadNum, modificadoPor);
    if (result.affectedRows === 0) return res.status(404).json({ ok: false, message: "No se encontró la solicitud" });

    res.json({ ok: true, message: "Cantidad actualizada correctamente" });
  } catch (error) {
    console.error("Error actualizando cantidad de solicitud:", error);
    res.status(500).json({ ok: false, message: "Error en el servidor", error: error.message });
  }
};

// ================================================
// PUT Planeación manda TODO el lote (el "pedido
// completo") a PEDIR autorización de un solo golpe, no
// uno por uno. No autoriza directo: manda el 2do correo
// a Dirección con el resumen (reducido, sin tabla) y el
// costo total ya recalculado con los ajustes de
// Planeación, más los botones de Autorizar/Cancelar.
// ================================================
const autorizarSolicitudesInventarioLoteController = async (req, res) => {
  try {
    const { ids, modificadoPor } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ ok: false, message: "Falta la lista de ids a mandar a autorizar" });
    }
    if (!modificadoPor) {
      return res.status(400).json({ ok: false, message: "Falta modificadoPor (quién está haciendo el cambio)" });
    }

    const token = crypto.randomBytes(16).toString("hex");
    await marcarLotePendienteAutorizacion(ids, token, modificadoPor);

    const lote = await obtenerLotePorToken(token);

    // 💲 Se recalcula el costo total por si Planeación modificó cantidades
    // (cierres a Master/Inner, etc.) antes de mandarlo.
    const conCosto = await Promise.all(lote.map(async (item) => {
      const { costoTotalSinIva } = await resolverUnidadYCosto(item.sku, item.cantidad);
      return costoTotalSinIva;
    }));
    const granTotal = conCosto.reduce((acc, c) => acc + (Number(c) || 0), 0);

    const baseUrl = process.env.APP_BASE_URL || "http://66.232.105.107:3001";
    const linkAutorizar = `${baseUrl}/api/inventario/solicitudes/resolver-lote?token=${token}&accion=autorizar`;
    const linkCancelar = `${baseUrl}/api/inventario/solicitudes/resolver-lote?token=${token}&accion=cancelar`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: "santuldesarrollo@gmail.com", pass: "kcjx obmc cvaz vecr" }
    });

    const html = plantillaCorreoSolicitarAutorizacion({
      cantidadProductos: lote.length,
      total: granTotal,
      solicitante: modificadoPor,
      linkAutorizar,
      linkCancelar,
    });

    await transporter.sendMail({
      from: '"📦 Inventario Almacen 7240" <santuldesarrollo@gmail.com>',
      to: DESTINATARIOS.join(", "),
      subject: `Autorización pendiente · ${lote.length} producto(s)`,
      html,
      attachments: [{ filename: "logob.png", path: __dirname + "/../assets/logob.png", cid: "logo_santul" }]
    });

    res.json({ ok: true, message: "Se mandó a pedir autorización", token, productos: lote.length });
  } catch (error) {
    console.error("Error mandando lote a pedir autorización:", error);
    res.status(500).json({ ok: false, message: "Error en el servidor", error: error.message });
  }
};

// ================================================
// GET Dirección resuelve el pedido directo desde los
// botones del correo (sin login). Solo resuelve lotes
// que sigan "Pendiente Autorizacion" (evita que un link
// viejo o un clic doble cambie algo ya resuelto).
//
// Antes de aplicar el cambio se pide el nombre de quién
// autoriza/cancela (un formulario simple por GET, sin
// necesitar login) para poder guardarlo como
// modificado_por y avisar por correo quién fue.
// ================================================
const resolverLotePorTokenController = async (req, res) => {
  try {
    const { token, accion, nombre } = req.query;

    if (!token || !["autorizar", "cancelar"].includes(accion)) {
      return res.status(400).send("<h2>Enlace inválido.</h2>");
    }

    const lote = await obtenerLotePorToken(token);
    if (lote.length === 0) {
      return res.send("<h2>Este enlace ya no es válido.</h2>");
    }
    if (lote[0].estado !== "Pendiente Autorizacion") {
      return res.send(`<h2>Este pedido ya fue procesado (estado actual: ${lote[0].estado}).</h2>`);
    }

    const esAutorizar = accion === "autorizar";
    const colorAccion = esAutorizar ? "#2e7d32" : "#c62828";
    const tituloAccion = esAutorizar ? "Autorizar pedido" : "Cancelar pedido";

    // 1) Todavía no viene el nombre → se pide con un formulario (por GET, sin
    // necesitar sesión ni body-parser especial) antes de aplicar el cambio.
    if (!nombre || !nombre.trim()) {
      return res.send(`
        <body style="font-family:Arial, sans-serif; text-align:center; padding:40px; background:#f4f4f4;">
          <div style="max-width:420px; margin:auto; background:#fff; padding:30px; border-radius:10px; box-shadow:0 0 10px #ccc;">
            <h2 style="margin-top:0;">${tituloAccion}</h2>
            <p>${lote.length} producto(s) · Antes de confirmar, dinos tu nombre:</p>
            <form method="GET" action="/api/inventario/solicitudes/resolver-lote">
              <input type="hidden" name="token" value="${token}" />
              <input type="hidden" name="accion" value="${accion}" />
              <input type="text" name="nombre" placeholder="Tu nombre" required
                style="width:100%; padding:10px; margin:12px 0; border:1px solid #ccc; border-radius:6px; box-sizing:border-box;" />
              <button type="submit" style="background:${colorAccion}; color:#fff; border:none; padding:12px 28px; border-radius:6px; font-weight:bold; cursor:pointer;">
                Confirmar ${esAutorizar ? "autorización" : "cancelación"}
              </button>
            </form>
          </div>
        </body>
      `);
    }

    // 2) Ya viene el nombre → se aplica el cambio de verdad.
    const nuevoEstado = esAutorizar ? "Autorizada" : "Cancelada";
    await resolverLotePorToken(token, nuevoEstado, nombre.trim());

    // 3) Correo de confirmación (el "último correo" del flujo): avisa que ya
    // se resolvió y quién lo hizo.
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: "santuldesarrollo@gmail.com", pass: "kcjx obmc cvaz vecr" }
      });
      await transporter.sendMail({
        from: '"📦 Inventario Almacen 7240" <santuldesarrollo@gmail.com>',
        to: DESTINATARIOS.join(", "),
        subject: `Pedido ${esAutorizar ? "autorizado" : "cancelado"} · ${lote.length} producto(s)`,
        html: `
          <body style="font-family:Arial, sans-serif; padding:20px;">
            <h2>${esAutorizar ? "✅ Pedido autorizado" : "❌ Pedido cancelado"}</h2>
            <p><b>${nombre.trim()}</b> ${esAutorizar ? "autorizó" : "canceló"} este pedido (${lote.length} producto(s)).</p>
          </body>
        `,
      });
    } catch (mailErr) {
      console.error("No se pudo mandar el correo de confirmación final:", mailErr.message);
    }

    res.send(`
      <body style="font-family:Arial, sans-serif; text-align:center; padding:40px;">
        <h2>${esAutorizar ? "✅ Pedido autorizado" : "❌ Pedido cancelado"}</h2>
        <p>${lote.length} producto(s) fueron marcados como "${nuevoEstado}" por <b>${nombre.trim()}</b>.</p>
      </body>
    `);
  } catch (error) {
    console.error("Error resolviendo lote por token:", error);
    res.status(500).send("<h2>Ocurrió un error procesando tu solicitud.</h2>");
  }
};

// ================================================
// PUT Marca TODO un pedido (todos los SKUs con el mismo
// numero_pedido) como ya registrado en CEDIS — ya no hay
// que subir ningún archivo en la otra aplicación para
// ese pedido.
// ================================================
const marcarPedidoRegistradoEnCedisController = async (req, res) => {
  try {
    const { numeroPedido } = req.params;
    const { modificadoPor } = req.body;

    if (!numeroPedido) return res.status(400).json({ ok: false, message: "Falta el número de pedido" });
    if (!modificadoPor) {
      return res.status(400).json({ ok: false, message: "Falta modificadoPor (quién está haciendo el cambio)" });
    }

    const result = await marcarPedidoRegistradoEnCedis(numeroPedido, modificadoPor);
    if (result.affectedRows === 0) return res.status(404).json({ ok: false, message: "No se encontró ese pedido" });

    res.json({ ok: true, message: "Pedido marcado como registrado en CEDIS", actualizados: result.affectedRows });
  } catch (error) {
    console.error("Error marcando pedido como registrado en CEDIS:", error);
    res.status(500).json({ ok: false, message: "Error en el servidor", error: error.message });
  }
};

module.exports = {
  todosLosInventarios,
  solicitarProducto,
  obtenerInventarioJDE,
  obtenerDisponibilidadSantul,
  actualizarUbicacion: actualizarUbicacionController,
  actualizarLimites: actualizarLimitesController,
  recalcularInvOpt,
  cargaMasivaLimites: cargaMasivaLimitesController,
  solicitarProductoMasivo: solicitarProductoMasivoController,
  listarSolicitudesInventario: listarSolicitudesInventarioController,
  actualizarEstadoSolicitudInventario: actualizarEstadoSolicitudInventarioController,
  actualizarCantidadSolicitudInventario: actualizarCantidadSolicitudInventarioController,
  autorizarSolicitudesInventarioLote: autorizarSolicitudesInventarioLoteController,
  resolverLotePorToken: resolverLotePorTokenController,
  marcarPedidoRegistradoEnCedis: marcarPedidoRegistradoEnCedisController
};