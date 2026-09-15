function plantillaCorreoStock({ codigo, descripcion, ubicacion, stock, cantidadSolicitada, solicitante }) {
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
                        <td style="border:1px solid #ccc; padding:8px;">${cantidadSolicitada}</td>
                    </tr>

                    <tr>
                        <td style="border:1px solid #ccc; padding:8px;"><b>Solicitante:</b></td>
                        <td style="border:1px solid #ccc; padding:8px;">${solicitante}</td>
                    </tr>

                </table>

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
// varios códigos + cantidad) desde la pestaña
// "Solicitar Inventario".
// ================================================
function plantillaCorreoStockMasivo({ productos, solicitante }) {
    const filas = (productos || []).map((p) => `
        <tr>
            <td style="border:1px solid #ccc; padding:8px;">${p.codigo}</td>
            <td style="border:1px solid #ccc; padding:8px;">${p.descripcion || '-'}</td>
            <td style="border:1px solid #ccc; padding:8px;">${p.ubicacion || '-'}</td>
            <td style="border:1px solid #ccc; padding:8px; color:red;"><b>${p.stock ?? '-'}</b></td>
            <td style="border:1px solid #ccc; padding:8px;">${p.cantidadSolicitada}</td>
        </tr>
    `).join('');

    return `
    <body style="background-color:#f4f4f4; padding:20px; font-family:Arial, sans-serif;">
    <table style="max-width:700px; margin:auto; background:#fff; border-radius:8px; box-shadow:0 0 10px #ccc;">

        <!-- LOGO -->
        <tr>
            <td style="text-align:center; padding:20px;">
                <img src="cid:logo_santul" alt="Logo Santul" width="180" />
            </td>
        </tr>

        <!-- TITULO -->
        <tr>
            <td style="background:#1A13EB; color:white; padding:20px; border-radius:8px 8px 0 0;">
                <h2 style="margin:0;">📦 Solicitud masiva de productos (carga por Excel)</h2>
            </td>
        </tr>

        <!-- CONTENIDO -->
        <tr>
            <td style="padding:22px;">

                <p>Se generó una solicitud de reabastecimiento masiva con <b>${(productos || []).length}</b> producto(s):</p>

                <table style="width:100%; border-collapse:collapse; margin-top:15px;">
                    <tr style="background:#f0f0f0;">
                        <td style="border:1px solid #ccc; padding:8px;"><b>Código</b></td>
                        <td style="border:1px solid #ccc; padding:8px;"><b>Descripción</b></td>
                        <td style="border:1px solid #ccc; padding:8px;"><b>Ubicación</b></td>
                        <td style="border:1px solid #ccc; padding:8px;"><b>Stock actual</b></td>
                        <td style="border:1px solid #ccc; padding:8px;"><b>Cantidad solicitada</b></td>
                    </tr>
                    ${filas}
                </table>

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
