const axios = require("axios");
const { sendMail } = require("../services/mailer.service");
const notificaciones = require("../config/notifications.config");
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

const DESTINATARIOS = notificaciones.recipients.inventario;

// Adjunto del logo (va inline con cid="logo_santul" en las plantillas).
const LOGO_ADJUNTO = [{ filename: "logob.png", path: __dirname + "/../assets/logob.png", cid: "logo_santul", contentType: "image/png" }];

// Envía por Microsoft Graph. Mantiene el comportamiento de antes: si el envío falla
// (y las notificaciones están encendidas) lanza error para que el flujo no siga como si
// el correo hubiera salido. `sendMail` devuelve null cuando falla.
async function enviarCorreo({ subject, html, adjuntos = [] }) {
  const r = await sendMail({ to: DESTINATARIOS, subject, html, attachments: [...LOGO_ADJUNTO, ...adjuntos] });
  if (!r && notificaciones.enabled) throw new Error("No se pudo enviar el correo (revisa credenciales de Microsoft Graph en el .env).");
  return r;
}

// 📎 Excel con el detalle de lo que se solicita (código, descripción, cantidad...).
// Usa exceljs si está instalado; si no, genera un CSV (abre igual en Excel) para
// que el correo salga de todos modos.
async function construirAdjuntoSolicitud(productos) {
  const fecha = new Date().toISOString().slice(0, 10);
  const filas = productos.map((p) => ({
    codigo: p.codigo,
    descripcion: p.descripcion || "",
    cantidad: Number(p.cantidadSolicitada) || 0,
    original: p.cantidadPedidaOriginal !== undefined ? Number(p.cantidadPedidaOriginal) || 0 : "",
    disponible: p.disponible7050 ?? "",
  }));
  try {
    const ExcelJS = require("exceljs");
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Solicitud");
    ws.columns = [
      { header: "Código", key: "codigo", width: 12 },
      { header: "Descripción", key: "descripcion", width: 55 },
      { header: "Cantidad solicitada (PZ)", key: "cantidad", width: 24 },
      { header: "Cantidad pedida originalmente", key: "original", width: 28 },
      { header: "Disponible 7050", key: "disponible", width: 16 },
    ];
    ws.addRows(filas);
    ws.getRow(1).font = { bold: true };
    const buf = await wb.xlsx.writeBuffer();
    return {
      filename: `solicitud_inventario_${fecha}.xlsx`,
      content: Buffer.from(buf),
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  } catch (e) {
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = "﻿" + [
      ["Código", "Descripción", "Cantidad solicitada (PZ)", "Cantidad pedida originalmente", "Disponible 7050"].map(esc).join(","),
      ...filas.map((f) => [f.codigo, f.descripcion, f.cantidad, f.original, f.disponible].map(esc).join(",")),
    ].join("\r\n");
    return { filename: `solicitud_inventario_${fecha}.csv`, content: Buffer.from(csv, "utf8"), contentType: "text/csv" };
  }
}

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

    const html = plantillaCorreoStock({
      codigo, descripcion, ubicacion, stock,
      cantidadSolicitada: cantidadAjustada, solicitante,
      masters, inners, sueltas,  // 🆕
      um, precioUnitarioSinIva, costoTotalSinIva, minimoVenta
    });

    console.time("envioCorreo");
    await enviarCorreo({ subject: `Solicitud de reposición · Código: ${codigo}`, html });
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
// Mapa { codigo: disponible } del almacén (Existencia_Fisica - Comprometido).
async function obtenerMapaDisponibilidad(almacen = "7050") {
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
  return disponibilidad;
}

// Igual pero sin lanzar error: si el servicio de inventarios falla (o viene
// vacío) regresa null y NO se recorta nada, para no excluir todo por una caída.
async function mapaDisponibilidad7050Seguro() {
  try {
    const mapa = await obtenerMapaDisponibilidad("7050");
    return Object.keys(mapa).length > 0 ? mapa : null;
  } catch (e) {
    console.warn("⚠️ No se pudo consultar disponibilidad 7050, no se recorta por disponible:", e.message);
    return null;
  }
}

// Regla: sin disponible (no aparece o <= 0) -> no se pide; si lo pedido pasa
// de lo disponible se baja a lo disponible; luego se aplica el empaque mínimo
// sin rebasar lo disponible. Regresa el detalle para pantalla/correo.
async function resolverCantidadFinal(codigo, cantidad, mapa) {
  const pedida = Number(cantidad) || 0;
  const disp = mapa ? (Number(mapa[String(codigo).trim()]) || 0) : null;
  if (mapa && disp <= 0) {
    return { sinDisponible: true, excluido: true, cantidadSolicitada: pedida, disponible: 0, cantidadAjustada: 0 };
  }
  const base = mapa ? Math.min(pedida, disp) : pedida;
  const r = await resolverUnidadYCosto(codigo, base, mapa ? disp : null);
  return {
    sinDisponible: false,
    excluido: Boolean(r.excluidoPorEmpaqueIncompleto),
    cantidadSolicitada: pedida,
    disponible: mapa ? disp : null,
    recortadoPorDisponible: Boolean(mapa && pedida > disp && !r.excluidoPorEmpaqueIncompleto),
    detalle: r,
    cantidadAjustada: r.cantidadAjustada,
  };
}

async function obtenerDisponibilidadSantul(req, res) {
  try {
    const almacen = req.query.almacen || "7050";
    const disponibilidad = await obtenerMapaDisponibilidad(almacen);
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
    // 📦 7050: también se limita a lo disponible (ver resolverCantidadFinal).
    const mapaDisp = await mapaDisponibilidad7050Seguro();

    const resultados = await Promise.all(encontrados.map(async (row) => {
      const cantidadSolicitada = mapaCantidades[String(row.codigo_producto).trim()] ?? "";
      const fin = await resolverCantidadFinal(row.codigo_producto, cantidadSolicitada, mapaDisp);

      if (fin.sinDisponible) {
        return { excluido: true, sinDisponible: true, codigo: row.codigo_producto, cantidadSolicitada };
      }
      const { um, precioUnitarioSinIva, costoTotalSinIva, minimoVenta, cantidadAjustada } = fin.detalle;

      if (fin.excluido) {
        return { excluido: true, codigo: row.codigo_producto, minimoVenta, cantidadSolicitada };
      }

      return {
        excluido: false,
        recortadoPorDisponible: fin.recortadoPorDisponible,
        disponible7050: fin.disponible,
        cantidadPedidaOriginal: cantidadSolicitada,
        codigo: row.codigo_producto,
        descripcion: row.descripcion,
        ubicacion: row.ubicacion,
        stock: row.cant_stock_real,
        invMin: row.inv_min ?? null,
        invMax: row.inv_max ?? null,
        cantidadSolicitada: cantidadAjustada,
        um,
        precioUnitarioSinIva,
        costoTotalSinIva,
        minimoVenta,
      };
    }));

    const agregados = resultados.filter((r) => !r.excluido);
    const excluidosPorEmpaque = resultados
      .filter((r) => r.excluido && !r.sinDisponible)
      .map((r) => ({
        codigo: r.codigo,
        cantidadSolicitada: r.cantidadSolicitada,
        piezasPorEmpaque: r.minimoVenta?.piezasPorEmpaque ?? null,
        unidadEmpaque: r.minimoVenta?.unidadEmpaque ?? null,
      }));
    // 7050: sin disponible (no se piden) y recortados a lo disponible.
    const sinDisponible = resultados
      .filter((r) => r.sinDisponible)
      .map((r) => ({ codigo: r.codigo, cantidadSolicitada: r.cantidadSolicitada }));
    const recortadosDisponible = agregados
      .filter((a) => a.recortadoPorDisponible)
      .map((a) => ({
        codigo: a.codigo,
        cantidadSolicitada: a.cantidadPedidaOriginal,
        cantidadFinal: a.cantidadSolicitada,
        disponible: a.disponible7050,
      }));

    if (agregados.length > 0) {
      const html = plantillaCorreoStockMasivo({ productos: agregados, solicitante, excluidos: excluidosPorEmpaque, recortadosDisponible, sinDisponible });

      const adjuntoExcel = await construirAdjuntoSolicitud(agregados);
      await enviarCorreo({ subject: `Solicitud masiva de reposición · ${agregados.length} producto(s)`, html, adjuntos: [adjuntoExcel] });

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
      sinDisponible,
      recortadosDisponible,
    });

  } catch (error) {
    console.error("❌ Error en solicitud masiva:", error);
    return res.status(500).json({ ok: false, message: "Error enviando la solicitud masiva", error: error.message });
  }
};

// ================================================
// POST Validar empaque mínimo (SIN enviar nada)
// La pantalla lo llama al armar la vista previa para mostrar ya las cantidades
// finales (ajustadas al empaque mínimo de venta) o los códigos que se excluyen,
// ANTES de mandar el correo. Usa exactamente la misma regla que el envío.
// body: { productos: [{ codigo, cantidad }] }
// ================================================
const validarEmpaqueController = async (req, res) => {
  try {
    const { productos } = req.body;
    if (!Array.isArray(productos)) {
      return res.status(400).json({ ok: false, message: "Falta la lista de productos" });
    }
    const mapaDisp = await mapaDisponibilidad7050Seguro();
    const resultados = await Promise.all(productos.map(async (p) => {
      const codigo = String(p.codigo ?? "").trim();
      const cantidad = Number(p.cantidad) || 0;
      const fin = await resolverCantidadFinal(codigo, cantidad, mapaDisp);
      return {
        codigo,
        cantidadSolicitada: cantidad,
        cantidadAjustada: fin.cantidadAjustada,
        excluido: fin.excluido,
        sinDisponible: fin.sinDisponible,
        recortadoPorDisponible: Boolean(fin.recortadoPorDisponible),
        disponible: fin.disponible,
        piezasPorEmpaque: fin.detalle?.minimoVenta?.piezasPorEmpaque ?? null,
        conCatalogo: fin.detalle?.conCatalogo ?? null,
      };
    }));
    return res.json({ ok: true, resultados });
  } catch (error) {
    console.error("❌ Error validando empaque:", error);
    return res.status(500).json({ ok: false, message: "Error validando empaque" });
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

    const html = plantillaCorreoSolicitarAutorizacion({
      cantidadProductos: lote.length,
      total: granTotal,
      solicitante: modificadoPor,
      linkAutorizar,
      linkCancelar,
    });

    await enviarCorreo({ subject: `Autorización pendiente · ${lote.length} producto(s)`, html });

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
      await enviarCorreo({
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
  validarEmpaque: validarEmpaqueController,
  listarSolicitudesInventario: listarSolicitudesInventarioController,
  actualizarEstadoSolicitudInventario: actualizarEstadoSolicitudInventarioController,
  actualizarCantidadSolicitudInventario: actualizarCantidadSolicitudInventarioController,
  autorizarSolicitudesInventarioLote: autorizarSolicitudesInventarioLoteController,
  resolverLotePorToken: resolverLotePorTokenController,
  marcarPedidoRegistradoEnCedis: marcarPedidoRegistradoEnCedisController
};