function plantillaCorreoSolicitud({ codigo, descripcion, cantidad, area, solicitante }) {
    return `
  <body style="background:#f4f4f4; padding:20px; font-family:Arial, sans-serif;">
    <table style="max-width:650px; margin:auto; background:white; border-radius:10px; box-shadow:0 0 10px #ccc;">
      
      <!-- LOGO -->
      <tr>
        <td style="text-align:center; padding:25px;">
          <img src="cid:logo_santul" width="180" />
        </td>
      </tr>

      <!-- HEADER AZUL -->
      <tr>
        <td style="background:#1A13EB; color:white; padding:20px; border-radius:8px 8px 0 0;">
          <h2 style="margin:0;">📦 Nueva solicitud de insumo</h2>
        </td>
      </tr>

      <!-- CONTENIDO -->
      <tr>
        <td style="padding:25px; font-size:15px;">

          <p>Se registró una nueva solicitud con la siguiente información:</p>

          <table style="width:100%; border-collapse:collapse; margin-top:15px;">
            <tr>
              <td style="border:1px solid #ccc; padding:10px;"><b>Código:</b></td>
              <td style="border:1px solid #ccc; padding:10px;">${codigo}</td>
            </tr>
            <tr>
              <td style="border:1px solid #ccc; padding:10px;"><b>Descripción:</b></td>
              <td style="border:1px solid #ccc; padding:10px;">${descripcion}</td>
            </tr>
            <tr>
              <td style="border:1px solid #ccc; padding:10px;"><b>Cantidad solicitada:</b></td>
              <td style="border:1px solid #ccc; padding:10px;">${cantidad}</td>
            </tr>
            <tr>
              <td style="border:1px solid #ccc; padding:10px;"><b>Área:</b></td>
              <td style="border:1px solid #ccc; padding:10px;">${area}</td>
            </tr>
            <tr>
              <td style="border:1px solid #ccc; padding:10px;"><b>Solicitante:</b></td>
              <td style="border:1px solid #ccc; padding:10px;">${solicitante}</td>
            </tr>
          </table>

          <p style="font-size:13px; color:#777; margin-top:28px;">
            Este correo fue generado automáticamente por el sistema · Santul San Cen
          </p>

        </td>
      </tr>

    </table>
  </body>
  `;
}

module.exports = plantillaCorreoSolicitud;
