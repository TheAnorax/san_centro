import jsPDF from "jspdf";
import QRCode from "qrcode";
import logoSantul from "../img/logob.png";

export async function generarPalletTraspaso({
    Codigo,
    Descripcion,
    Cantidad,
    dia_envio,
    almacen_envio,
    um,
    _pz,
    cajasXCama = 7,
    camasXPallet = 1,
    ubicacion_final = "N/A",
}) {
    const doc = new jsPDF("l", "mm", [148, 210]);
    const fechaHoy = new Date().toISOString().split("T")[0];

    // ====== ENCABEZADO ======
    doc.setDrawColor(0);
    doc.setLineWidth(0.25);

    // Marco general
    doc.rect(8, 5, 194, 138);

    // Logo
    doc.addImage(logoSantul, "PNG", 10, 9, 30, 10);

    // Cuadro encabezado superior
    doc.rect(42, 5, 160, 20);
    doc.line(42, 10, 202, 10);
    doc.line(42, 15, 202, 15);
    doc.line(42, 20, 202, 20);
    doc.line(145, 5, 145, 25);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Título de documento", 44, 9);
    doc.text("Identificación de pallet", 44, 14);
    doc.text("Formato:", 44, 19);

    doc.text("Fecha de emisión:", 147, 9);
    doc.text("Reemplaza a la Rev.:", 147, 14);
    doc.text("Elaboró:", 147, 19);

    doc.setFont("helvetica", "normal");
    doc.text(fechaHoy, 182, 9);
    doc.text("000", 182, 14);

    // Línea Sistema Calidad
    doc.line(8, 25, 202, 25);
    doc.line(8, 31, 202, 31);

    doc.setFont("helvetica", "bold");
    doc.text("SISTEMA DE GESTIÓN DE CALIDAD", 10, 30);

    doc.setFontSize(7);

    // ====== SECCIÓN CENTRAL ======
    // Cuadro principal dividido en 3 secciones
    doc.rect(8, 31, 194, 97);
    doc.line(45, 31, 45, 128); // columna izquierda
    doc.line(8, 92, 202, 92); // segunda línea (DESCRIPCIÓN)
    doc.line(8, 128, 202, 128); // tercera línea (TOTAL piezas)

    // ==== Columna izquierda ====
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("MODELO", 15, 65);
    doc.text("Total de piezas", 10, 115);

    // ==== MODELO (grande, centrado) ====
    doc.setFont("helvetica", "bold");
    doc.setFontSize(85);
    doc.text(String(Codigo || "—"), 125, 70, { align: "center" });

    // ==== DESCRIPCIÓN ====
    doc.setFontSize(22);
    doc.text(String(Descripcion || "—"), 125, 88, { align: "center" });

    // ==== TOTAL DE PIEZAS ====
    doc.setFontSize(95);
    doc.text(String(Cantidad || 0), 125, 120, { align: "center" });

    // ==== QR ====
    const qrData = `
        Código: ${Codigo}
        Descripción: ${Descripcion}
        Cantidad: ${Cantidad}
        UM: ${um}
        Almacén: ${almacen_envio || ""}
        Fecha: ${fechaHoy}
        Ubicación: ${ubicacion_final}

        `;
    const qrUrl = await QRCode.toDataURL(qrData);
    doc.addImage(qrUrl, "PNG", 165, 96, 30, 30);

    // ====== PIE DE PÁGINA ======
    doc.rect(8, 128, 194, 15);
    doc.line(120, 128, 120, 143);
    doc.line(190, 128, 190, 143);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Fecha de Arribo", 10, 132);
    doc.text("Ubicación Destino:", 10, 138);
    doc.text("RESTANTE", 170, 132);

    doc.setFont("helvetica", "bold");
    doc.text(fechaHoy, 55, 132);
    doc.text(ubicacion_final, 55, 138);
    // ====== GUARDAR ======
    doc.save(`Pallet ${Codigo} ${fechaHoy}.pdf`);
}
