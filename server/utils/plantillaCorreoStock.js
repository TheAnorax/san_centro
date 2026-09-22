// Mismo formateo de moneda que usan las pantallas de React (es-MX / MXN).
const formatCurrency = (valor) => {
    const num = Number(valor);
    if (valor === null || valor === undefined || Number.isNaN(num)) return "-";
    return num.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

function plantillaCorreoStock({ codigo, descripcion, ubicacion, stock, cantidadSolicitada, solicitante, um, precioUnitarioSinIva, costoTotalSinIva, minimoVenta }) {
  // La cantidad siempre se maneja en PIEZAS (así viene de inv_opt/lo capturado
  // en pantalla) — se muestra como tal, y aparte se avisa si no alcanza para
  // completar un empaque cerrado (mínimo de venta), sin redondear nada.
  const avisoEmpaque = minimoVenta && !minimoVenta.completo
    ? `<p style="font-size:12px; color:#e65100; background:#fff8e1; border:1px solid #ffb300; border-radius:6px; padding:10px; margin-top:12px;">
        ⚠️ Esta cantidad NO completa un empaque cerrado (${minimoVenta.unidadEmpaque} de ${minimoVenta.piezasPorEmpaque} PZ).
        Faltan ${minimoVenta.faltantePiezas} PZ para completar el siguiente empaque.
      </p>`
    : "";

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
                        <td style="border:1px solid #ccc; padding:8px;">${minimoVenta.unidadEmpaque} de ${minimoVenta.piezasPorEmpaque} PZ${minimoVenta.completo ? " (se completa)" : ""}</td>
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
function plantillaCorreoStockMasivo({ productos, solicitante }) {
    const lista = productos || [];

    // La cantidad de cada renglón siempre está en PIEZAS (viene de inv_opt o
    // de la columna "cantidad" del Excel) — se muestra como tal. Si el
    // producto tiene empaque mínimo de venta (cant_sec) y la cantidad no lo
    // completa, la fila se marca en amarillo y se agrega el detalle abajo.
    const filas = lista.map((p) => {
        const noCompleta = p.minimoVenta && !p.minimoVenta.completo;
        return `
        <tr${noCompleta ? ' style="background:#fff8e1;"' : ''}>
            <td style="border:1px solid #ccc; padding:8px;">${p.codigo}</td>
            <td style="border:1px solid #ccc; padding:8px;">${p.descripcion || '-'}</td>
            <td style="border:1px solid #ccc; padding:8px;">${p.ubicacion || '-'}</td>
            <td style="border:1px solid #ccc; padding:8px; color:red;"><b>${p.stock ?? '-'}</b></td>
            <td style="border:1px solid #ccc; padding:8px;">
                ${p.cantidadSolicitada} PZ
                ${noCompleta ? `<br/><span style="color:#e65100; font-size:11px;">⚠️ Empaque ${p.minimoVenta.unidadEmpaque} de ${p.minimoVenta.piezasPorEmpaque} PZ — faltan ${p.minimoVenta.faltantePiezas} PZ</span>` : ''}
            </td>
            <td style="border:1px solid #ccc; padding:8px;">${formatCurrency(p.precioUnitarioSinIva)}</td>
            <td style="border:1px solid #ccc; padding:8px;"><b>${formatCurrency(p.costoTotalSinIva)}</b></td>
        </tr>
    `;
    }).join('');

    const granTotal = lista.reduce((acc, p) => acc + (Number(p.costoTotalSinIva) || 0), 0);
    const hayNoResueltos = lista.some((p) => p.precioUnitarioSinIva === null || p.precioUnitarioSinIva === undefined);
    const hayEmpaquesIncompletos = lista.some((p) => p.minimoVenta && !p.minimoVenta.completo);

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

                <p>Se generó una solicitud de reabastecimiento masiva con <b>${lista.length}</b> producto(s):</p>

                <table style="width:100%; border-collapse:collapse; margin-top:15px; font-size:13px;">
                    <tr style="background:#f0f0f0;">
                        <td style="border:1px solid #ccc; padding:8px;"><b>Código</b></td>
                        <td style="border:1px solid #ccc; padding:8px;"><b>Descripción</b></td>
                        <td style="border:1px solid #ccc; padding:8px;"><b>Ubicación</b></td>
                        <td style="border:1px solid #ccc; padding:8px;"><b>Stock actual</b></td>
                        <td style="border:1px solid #ccc; padding:8px;"><b>Cantidad (PZ)</b></td>
                        <td style="border:1px solid #ccc; padding:8px;"><b>Precio unit. (s/IVA)</b></td>
                        <td style="border:1px solid #ccc; padding:8px;"><b>Costo total (s/IVA)</b></td>
                    </tr>
                    ${filas}
                    <tr style="background:#f9f9f9;">
                        <td colspan="6" style="border:1px solid #ccc; padding:8px; text-align:right;"><b>Costo total de la solicitud (sin IVA):</b></td>
                        <td style="border:1px solid #ccc; padding:8px;"><b>${formatCurrency(granTotal)}</b></td>
                    </tr>
                </table>

                ${hayNoResueltos ? `
                <p style="font-size:12px; color:#e65100; margin-top:10px;">
                    ⚠️ Algunos códigos no se encontraron en el catálogo de ventas, así que no se les pudo calcular
                    costo (se muestran con cantidad en piezas y sin precio).
                </p>` : ""}

                ${hayEmpaquesIncompletos ? `
                <p style="font-size:12px; color:#e65100; margin-top:10px;">
                    ⚠️ Los renglones resaltados en amarillo no completan un empaque cerrado (mínimo de venta) —
                    se solicitan tal cual, sin redondear, para que se decida si se ajustan antes de surtir.
                </p>` : ""}

                <table style="width:100%; border-collapse:collapse; margin-top:15px;">
                    <tr>
                        <td style="border:1px solid #ccc; padding:8px;"><b>Solicitante:</b></td>
                        <td style="border:1px solid #ccc; padding:8px;">${solicitante}</td>
                    </tr>
                </table>

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

module.exports = plantillaCorreoStock;
module.exports.plantillaCorreoStockMasivo = plantillaCorreoStockMasivo;
