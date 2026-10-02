// Mismo formateo de moneda que usan las pantallas de React (es-MX / MXN).
const formatCurrency = (valor) => {
    const num = Number(valor);
    if (valor === null || valor === undefined || Number.isNaN(num)) return "-";
    return num.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

function plantillaCorreoStock({ codigo, descripcion, ubicacion, stock, cantidadSolicitada, solicitante, um, precioUnitarioSinIva, costoTotalSinIva, minimoVenta }) {
  // 🆕 La cantidad que llega aquí (cantidadAjustada) ya viene SIEMPRE en un
  // múltiplo completo del empaque mínimo de venta (o se rechazó el envío
  // antes de llegar aquí si no alcanzaba ni para 1) — ya no hace falta
  // avisar de "no completa empaque", porque nunca se manda incompleto.
  const avisoEmpaque = "";

  return `
    <body style="background-color:#f4f4f4; padding:20px; font-family:Arial, sans-serif;">
    <table style="max-width:600px; margin:auto; background:#fff; border-radius:8px; box-shadow:0 0 10px #ccc;">

        <!-- LOGO -->
        <tr>
            <td style="text-align:center; padding:20px;">
                <img src="cid:logo_santul" alt="Logo Santul" width="180" />
            </td>
        </tr>

        <!-- TITULO -->
        <tr>
            <td style="background:#1A13EB; color:white; padding:20px; border-radius:8px 8px 0 0;">
                <h2 style="margin:0;">📦 Solicitud de producto con stock bajo</h2>
            </td>
        </tr>

        <!-- CONTENIDO -->
        <tr>
            <td style="padding:22px;">

                <p>Se ha generado una solicitud de reabastecimiento con los siguientes datos:</p>

                <table style="width:100%; border-collapse:collapse; margin-top:15px;">

                    <tr>
                        <td style="border:1px solid #ccc; padding:8px;"><b>Código:</b></td>
                        <td style="border:1px solid #ccc; padding:8px;">${codigo}</td>
                    </tr>

                    <tr>
                        <td style="border:1px solid #ccc; padding:8px;"><b>Descripción:</b></td>
                        <td style="border:1px solid #ccc; padding:8px;">${descripcion}</td>
                    </tr>

                    <tr>
                        <td style="border:1px solid #ccc; padding:8px;"><b>Stock actual:</b></td>
                        <td style="border:1px solid #ccc; padding:8px; color:red;"><b>${stock}</b></td>
                    </tr>

                    <tr>
                        <td style="border:1px solid #ccc; padding:8px;"><b>Cantidad solicitada:</b></td>
                        <td style="border:1px solid #ccc; padding:8px;">${cantidadSolicitada} PZ</td>
                    </tr>

                    ${minimoVenta ? `
                    <tr>
                        <td style="border:1px solid #ccc; padding:8px;"><b>Empaque mínimo de venta:</b></td>
                        <td style="border:1px solid #ccc; padding:8px;">${minimoVenta.unidadEmpaque} de ${minimoVenta.piezasPorEmpaque} PZ</td>
                    </tr>` : ""}

                    <tr>
                        <td style="border:1px solid #ccc; padding:8px;"><b>Precio unitario (sin IVA):</b></td>
                        <td style="border:1px solid #ccc; padding:8px;">${formatCurrency(precioUnitarioSinIva)} por PZ</td>
                    </tr>

                    <tr>
                        <td style="border:1px solid #ccc; padding:8px;"><b>Costo total (sin IVA):</b></td>
                        <td style="border:1px solid #ccc; padding:8px;"><b>${formatCurrency(costoTotalSinIva)}</b></td>
                    </tr>

                    <tr>
                        <td style="border:1px solid #ccc; padding:8px;"><b>Solicitante:</b></td>
                        <td style="border:1px solid #ccc; padding:8px;">${solicitante}</td>
                    </tr>

                </table>

                ${avisoEmpaque}

                <p style="margin-top:20px;">
                    Favor de reabastecer este producto a la brevedad.
                </p>

                <p style="font-size:12px; color:#888; margin-top:30px;">
                    Este correo fue generado automáticamente por el sistema de inventario · Santul San Cen.
                </p>

            </td>
        </tr>

    </table>
    </body>
    `;
}

// ================================================
// Correo consolidado para la carga masiva (Excel con
// varios códigos + cantidad, o el botón "Solicitar
// todos") desde la pestaña "Solicitar Inventario".
// Cada producto ya trae su unidad de medida y costo
// (sin IVA) resueltos contra el catálogo de ventas
// (misma API que usa Muestras.jsx).
// ================================================
function plantillaCorreoStockMasivo({ productos, solicitante, excluidos }) {
    const lista = productos || [];
    const excluidosLista = excluidos || [];

    const granTotal = lista.reduce((acc, p) => acc + (Number(p.costoTotalSinIva) || 0), 0);
    const hayNoResueltos = lista.some((p) => p.precioUnitarioSinIva === null || p.precioUnitarioSinIva === undefined);

    return `
    <body style="background-color:#f4f4f4; padding:20px; font-family:Arial, sans-serif;">
    <table style="max-width:760px; margin:auto; background:#fff; border-radius:8px; box-shadow:0 0 10px #ccc;">

        <!-- LOGO -->
        <tr>
            <td style="text-align:center; padding:20px;">
                <img src="cid:logo_santul" alt="Logo Santul" width="180" />
            </td>
        </tr>

        <!-- TITULO -->
        <tr>
            <td style="background:#1A13EB; color:white; padding:20px; border-radius:8px 8px 0 0;">
                <h2 style="margin:0;">📦 Solicitud masiva de productos</h2>
            </td>
        </tr>

        <!-- CONTENIDO -->
        <tr>
            <td style="padding:22px;">

                <table style="width:100%; border-collapse:collapse; margin-top:5px;">
                    <tr>
                        <td style="border:1px solid #ccc; padding:8px;"><b>Productos solicitados:</b></td>
                        <td style="border:1px solid #ccc; padding:8px;">${lista.length}</td>
                    </tr>
                    <tr style="background:#f9f9f9;">
                        <td style="border:1px solid #ccc; padding:8px;"><b>Costo total de la solicitud (sin IVA):</b></td>
                        <td style="border:1px solid #ccc; padding:8px;"><b>${formatCurrency(granTotal)}</b></td>
                    </tr>
                    <tr>
                        <td style="border:1px solid #ccc; padding:8px;"><b>Solicitante:</b></td>
                        <td style="border:1px solid #ccc; padding:8px;">${solicitante}</td>
                    </tr>
                </table>

                ${hayNoResueltos ? `
                <p style="font-size:12px; color:#e65100; margin-top:10px;">
                    ⚠️ Algunos códigos no se encontraron en el catálogo de ventas, así que no se les pudo calcular costo.
                </p>` : ""}

                ${excluidosLista.length > 0 ? `
                <p style="font-size:12px; color:#c62828; margin-top:10px;">
                    ⚠️ ${excluidosLista.length} código(s) NO se incluyeron porque la cantidad no alcanza para completar ni 1 empaque mínimo de venta: ${excluidosLista.map((e) => `${e.codigo} (pedía ${e.cantidadSolicitada}, mínimo ${e.piezasPorEmpaque})`).join(", ")}.
                </p>` : ""}

                <p style="margin-top:20px;">
                    Favor de reabastecer estos productos a la brevedad.
                </p>

                <p style="font-size:12px; color:#888; margin-top:30px;">
                    Este correo fue generado automáticamente por el sistema de inventario · Santul San Cen.
                </p>

            </td>
        </tr>

    </table>
    </body>
    `;
}

// ================================================
// Correo de "pedir autorización" (segundo correo del
// flujo): Planeación ya revisó/ajustó el pedido y este
// correo le pide a Dirección que lo autorice. Va
// reducido (sin tabla de productos, solo el resumen y
// el total ya recalculado con los ajustes de Planeación)
// y trae dos botones para que Dirección resuelva
// directamente desde el correo, sin tener que entrar
// al sistema.
// ================================================
function plantillaCorreoSolicitarAutorizacion({ cantidadProductos, total, solicitante, linkAutorizar, linkCancelar }) {
    return `
    <body style="background-color:#f4f4f4; padding:20px; font-family:Arial, sans-serif;">
    <table style="max-width:600px; margin:auto; background:#fff; border-radius:8px; box-shadow:0 0 10px #ccc;">

        <!-- LOGO -->
        <tr>
            <td style="text-align:center; padding:20px;">
                <img src="cid:logo_santul" alt="Logo Santul" width="180" />
            </td>
        </tr>

        <!-- TITULO -->
        <tr>
            <td style="background:#e65100; color:white; padding:20px; border-radius:8px 8px 0 0;">
                <h2 style="margin:0;">🔔 Autorización pendiente</h2>
            </td>
        </tr>

        <!-- CONTENIDO -->
        <tr>
            <td style="padding:22px;">

                <p>Planeación revisó y mandó el siguiente pedido para su autorización:</p>

                <table style="width:100%; border-collapse:collapse; margin-top:10px;">
                    <tr>
                        <td style="border:1px solid #ccc; padding:8px;"><b>Productos:</b></td>
                        <td style="border:1px solid #ccc; padding:8px;">${cantidadProductos}</td>
                    </tr>
                    <tr style="background:#f9f9f9;">
                        <td style="border:1px solid #ccc; padding:8px;"><b>Costo total (sin IVA):</b></td>
                        <td style="border:1px solid #ccc; padding:8px;"><b>${formatCurrency(total)}</b></td>
                    </tr>
                    <tr>
                        <td style="border:1px solid #ccc; padding:8px;"><b>Revisado por:</b></td>
                        <td style="border:1px solid #ccc; padding:8px;">${solicitante}</td>
                    </tr>
                </table>

                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px auto 0 auto;">
                    <tr>
                        <td style="padding:0 8px;">
                            <a href="${linkAutorizar}" style="display:inline-block; background:#2e7d32; color:#ffffff; text-decoration:none; padding:14px 30px; border-radius:6px; font-weight:bold; font-family:Arial, sans-serif;">
                                ✅ Autorizar pedido
                            </a>
                        </td>
                        <td style="padding:0 8px;">
                            <a href="${linkCancelar}" style="display:inline-block; background:#c62828; color:#ffffff; text-decoration:none; padding:14px 30px; border-radius:6px; font-weight:bold; font-family:Arial, sans-serif;">
                                ❌ Cancelar pedido
                            </a>
                        </td>
                    </tr>
                </table>

                <p style="font-size:12px; color:#888; margin-top:30px;">
                    Este correo fue generado automáticamente por el sistema de inventario · Santul San Cen.
                </p>

            </td>
        </tr>

    </table>
    </body>
    `;
}

module.exports = plantillaCorreoStock;
module.exports.plantillaCorreoStockMasivo = plantillaCorreoStockMasivo;
module.exports.plantillaCorreoSolicitarAutorizacion = plantillaCorreoSolicitarAutorizacion;
