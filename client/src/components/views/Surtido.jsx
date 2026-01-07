import React, { useEffect, useState } from 'react';
import {
    Card, CardContent, Typography, Box, Button,
    Table, TableBody, TableCell, TableHead, TableRow,
    LinearProgress, Grid, Paper, Tabs, Tab, TextField, InputAdornment, IconButton
} from '@mui/material';
import { FaTimes } from "react-icons/fa";
import axios from 'axios';
import Pagination from '@mui/material/Pagination';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import Swal from "sweetalert2";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoPacking from "../../../src/img/general/LOGO_PACKING_LIST.jpg";
import footerBar from "../../../src/img/general/BARRA.jpg";


/* ===================== Helpers robustos ===================== */

// id/nombre tolerantes a distintos nombres de campo
const getUserId = (u) =>
    Number(u?.id ?? u?.ID ?? u?.id_usuario ?? u?.usuario_id ?? u?.idUser ?? 0);

const getUserName = (u) =>
    String(u?.nombre ?? u?.name ?? u?.usuario ?? u?.alias ?? u?.display ?? '').trim();

// ¿el pedido ya tiene usuario de paquetería asignado?
const getAssignedUserIdFromPedido = (pedido) => {
    const top = Number(
        pedido?.id_usuario_paqueteria ??
        pedido?.usuario_paqueteria_id ??
        pedido?.id_paqueteria ??
        0
    );
    if (top) return top;

    for (const r of (pedido.productos || [])) {
        const v = Number(
            r?.id_usuario_paqueteria ??
            r?.usuario_paqueteria_id ??
            r?.id_paqueteria ??
            0
        );
        if (v) return v;
    }
    return 0;
};

const getAssignedUserNameFromPedido = (pedido, usuariosPaqueteria = []) => {
    // primero nivel pedido con varios alias
    const direct =
        pedido?.nombre_usuario_paqueteria ??
        pedido?.usuario_paqueteria ??
        pedido?.nombre_paqueteria ?? '';
    if (direct) return String(direct);

    // luego cualquier renglón
    const row = (pedido.productos || []).find(
        r => r?.nombre_usuario_paqueteria || r?.usuario_paqueteria || r?.nombre_paqueteria
    );
    if (row) {
        return String(row.nombre_usuario_paqueteria ?? row.usuario_paqueteria ?? row.nombre_paqueteria);
    }

    // intentar resolver por id contra catálogo
    const id = getAssignedUserIdFromPedido(pedido);
    if (id) {
        const hit = usuariosPaqueteria.find(u => getUserId(u) === Number(id));
        if (hit) return getUserName(hit);
    }
    return '';
};

// progreso de surtido (pestaña Surtido)
function calcularProgreso(productos) {
    const arr = Array.isArray(productos) ? productos : [];
    const total = arr.reduce((sum, p) => sum + Number(p.cantidad || 0), 0);
    const surtido = arr.reduce((sum, p) => sum + Number(p.cant_surtida || 0), 0);
    const noEnviada = arr.reduce((sum, p) => sum + Number(p.cant_no_enviada || 0), 0);
    return total > 0 ? Math.round(((surtido + noEnviada) / total) * 100) : 0;
}

/* ===================== Componente ===================== */

function Surtiendo() {
    const [tabActual, setTabActual] = useState(0);
    const handleChange = (_e, v) => setTabActual(v);

    /* ---------- Surtido ---------- */
    const [pedidos, setPedidos] = useState([]);
    const [expanded, setExpanded] = useState({});
    const [usuariosResumen, setUsuariosResumen] = useState([]);

    useEffect(() => { cargarPedidosSurtiendo(); }, []);

    const cargarPedidosSurtiendo = async () => {
        try {
            const res = await axios.get('http://66.232.105.107:3001/api/surtido/pedidos/pedidos-surtiendo');

            const pedidosAgrupados = {};
            const resumenUsuarios = {};
            const pedidosPorUsuario = {};

            (res.data || []).forEach(item => {
                const noOrden = String(item.no_orden ?? '').trim();
                const tipoNorm = String(item.tipo ?? '').trim().toUpperCase();
                const key = `${noOrden}__${tipoNorm}`;

                if (!pedidosAgrupados[key]) {
                    pedidosAgrupados[key] = {
                        key,
                        no_orden: noOrden,
                        tipo: tipoNorm,
                        bahia: item.ubi_bahia ?? '',
                        nombre_usuario: item.nombre_usuario ?? '',
                        productos: []
                    };
                }
                pedidosAgrupados[key].productos.push(item);

                const uname = item.nombre_usuario ?? 'SIN NOMBRE';
                if (!resumenUsuarios[uname]) {
                    resumenUsuarios[uname] = { nombre: uname, pedidos: 0, piezas: 0, piezas_surtidas: 0, piezas_no_enviadas: 0 };
                    pedidosPorUsuario[uname] = new Set();
                }
                pedidosPorUsuario[uname].add(key);
                resumenUsuarios[uname].piezas += Number(item.cantidad || 0);
                resumenUsuarios[uname].piezas_surtidas += Number(item.cant_surtida || 0);
                resumenUsuarios[uname].piezas_no_enviadas += Number(item.cant_no_enviada || 0);
            });

            Object.keys(resumenUsuarios).forEach(n => {
                resumenUsuarios[n].pedidos = pedidosPorUsuario[n].size;
            });

            setPedidos(Object.values(pedidosAgrupados));
            setUsuariosResumen(Object.values(resumenUsuarios));
        } catch {
            setPedidos([]); setUsuariosResumen([]);
        }
    };

    /* ---------- Embarques ---------- */
    const [embarques, setEmbarques] = useState([]);
    const [usuariosPaqueteria, setUsuariosPaqueteria] = useState([]);

    const cargarPedidosEmbarques = async () => {
        try {
            const res = await axios.get('http://66.232.105.107:3001/api/surtido/embarque');
            const pedidosAgrupados = {};

            (res.data || []).forEach(item => {
                const tipoNorm = String(item.tipo ?? '').toUpperCase();
                const key = `${item.no_orden}__${tipoNorm}`;

                if (!pedidosAgrupados[key]) {
                    pedidosAgrupados[key] = {
                        key,
                        no_orden: item.no_orden,
                        tipo: tipoNorm,
                        bahia: item.ubi_bahia,
                        nombre_usuario: item.nombre_usuario,
                        id_usuario_paqueteria: item.id_usuario_paqueteria ?? null,
                        nombre_usuario_paqueteria: item.nombre_usuario_paqueteria ?? '',
                        productos: []
                    };
                }

                pedidosAgrupados[key].productos.push(item);

                // Si el id/nombre aparece en otra fila, súbelo al encabezado
                if (item.id_usuario_paqueteria && !pedidosAgrupados[key].id_usuario_paqueteria) {
                    pedidosAgrupados[key].id_usuario_paqueteria = item.id_usuario_paqueteria;
                }
                if (item.nombre_usuario_paqueteria && !pedidosAgrupados[key].nombre_usuario_paqueteria) {
                    pedidosAgrupados[key].nombre_usuario_paqueteria = item.nombre_usuario_paqueteria;
                }
            });

            setEmbarques(Object.values(pedidosAgrupados));
        } catch {
            setEmbarques([]);
        }
    };

    const cargarUsuariosPaqueteria = async () => {
        try {
            const res = await axios.get('http://66.232.105.107:3001/api/surtido/Obtener-usuarios');
            setUsuariosPaqueteria(Array.isArray(res.data) ? res.data : []);
        } catch {
            setUsuariosPaqueteria([]);
        }
    };

    useEffect(() => {
        if (tabActual === 1) {
            cargarPedidosEmbarques();
            cargarUsuariosPaqueteria();
        }
    }, [tabActual]);

    const finalizarPedido = async (noOrden, tipo) => {
        try {
            // 1️⃣ Confirmar acción
            const { isConfirmed } = await Swal.fire({
                title: `¿Finalizar pedido ${noOrden}-${tipo}?`,
                text: "Se generará el PDF y luego se moverá el pedido a embarques.",
                icon: "question",
                showCancelButton: true,
                confirmButtonText: "Sí, finalizar",
                cancelButtonText: "Cancelar",
                confirmButtonColor: "#3085d6",
            });
            if (!isConfirmed) return;

            // 2️⃣ Consultar productos del pedido desde la base
            const { data: productos } = await axios.get(
                `http://66.232.105.107:3001/api/surtido/pedido/${noOrden}/${tipo}`
            );

            if (!productos || productos.length === 0) {
                await Swal.fire({
                    title: "Sin datos",
                    text: `No se encontraron productos para el pedido ${noOrden}-${tipo}.`,
                    icon: "warning",
                });
                return;
            }

            // 3️⃣ Generar PDF antes de finalizar
            const doc = new jsPDF();



            // 🧩 Datos de encabezado
            const totalCodigos = productos.length; // total de registros en la consulta
            const ubi_bahia = productos[0]?.ubi_bahia || "SIN BAHÍA"; // toma la bahía del primer producto

            // 🏷️ Encabezado
            doc.setFontSize(14);
            doc.text(`Pedido: ${tipo} ${noOrden} (Total códigos: ${totalCodigos})`, 14, 18);
            doc.setFontSize(12);
            doc.text(`Bahías: ${ubi_bahia}`, 14, 26);

            // 📦 Subtítulo
            doc.setFontSize(10);
            doc.text("Detalle de productos surtidos", 14, 34);

            // 🧾 Definición de tabla
            const head = [
                ["Código", "Cantidad", "Cant. Surtida", "Cant. No Enviada", "Motivo", "Unificado"],
            ];

            const body = productos.map((p) => [
                p.codigo_pedido,
                p.cantidad,
                p.cant_surtida,
                p.cant_no_enviada,
                p.motivo || "",
                p.unificado || "",
            ]);

            // 🧩 Fallback doble para compatibilidad total
            if (typeof doc.autoTable === "function") {
                doc.autoTable({
                    startY: 38,
                    head,
                    body,
                    theme: "grid",
                    styles: { fontSize: 8, cellPadding: 2 },
                    headStyles: { fillColor: [17, 100, 163], textColor: [255, 255, 255] },
                    didParseCell: (data) => {
                        const row = productos[data.row.index];
                        if (Number(row?.cant_no_enviada || 0) > 0) {
                            data.cell.styles.fillColor = [255, 220, 220]; // rojo claro
                            data.cell.styles.textColor = [180, 0, 0]; // texto rojo
                        }
                    },
                });
            } else {
                // fallback si no se inyectó bien jspdf-autotable
                autoTable(doc, {
                    startY: 38,
                    head,
                    body,
                    theme: "grid",
                    styles: { fontSize: 8, cellPadding: 2 },
                    headStyles: { fillColor: [17, 100, 163], textColor: [255, 255, 255] },
                    didParseCell: (data) => {
                        const row = productos[data.row.index];
                        if (Number(row?.cant_no_enviada || 0) > 0) {
                            data.cell.styles.fillColor = [255, 220, 220];
                            data.cell.styles.textColor = [180, 0, 0];
                        }
                    },
                });
            }

            // 💾 Guardar PDF
            const nombrePDF = `Surtido_${noOrden}_${tipo}.pdf`;
            doc.save(nombrePDF);


            await Swal.fire({
                title: "📄 PDF generado",
                text: `Se generó el archivo ${nombrePDF} correctamente.`,
                icon: "success",
                confirmButtonText: "Continuar",
            });

            // 4️⃣ Llamar al backend para mover a embarques
            const res = await axios.post(
                `http://66.232.105.107:3001/api/surtido/finalizar/${noOrden}/${tipo}`
            );

            {
                Swal.fire({
                    title: "Liberado",
                    text: res.data.message || "Pedidos Liberado",
                    icon: "success",
                    confirmButtonColor: "#0ee231ff",
                });
            }
        } catch (err) {
            console.error(err);
            Swal.fire({
                title: "❌ Error del servidor",
                text: "Ocurrió un problema al generar el PDF o finalizar el pedido.",
                icon: "error",
                confirmButtonColor: "#e74c3c",
                confirmButtonText: "Cerrar",
            });
        }
    };


    // Liberar solo si todas las v_* = 0
    const puedeLiberarPedido = (pedido) => {
        const totalV = (pedido.productos || []).reduce(
            (s, p) => s +
                Number(p?.v_pz || 0) +
                Number(p?.v_pq || 0) +
                Number(p?.v_inner || 0) +
                Number(p?.v_master || 0), 0
        );
        return totalV === 0;
    };

    const asignarUsuarioPaqueteria = async (no_orden, id_usuario) => {
        try {
            const res = await axios.put(`http://66.232.105.107:3001/api/surtido/asignar-usuario-paqueteria`, {
                no_orden,
                id_usuario_paqueteria: id_usuario, // acepta id o nombre si backend lo resuelve
            });

            if (res.data?.ok) {
                await Swal.fire({
                    title: "✅ Usuario asignado correctamente",
                    text: `El pedido ${no_orden} fue asignado exitosamente.`,
                    icon: "success",
                    confirmButtonColor: "#3085d6",
                    confirmButtonText: "Aceptar",
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                await Swal.fire({
                    title: "⚠️ Error al asignar",
                    text: res.data?.error || res.data?.mensaje || "No se pudo asignar el usuario.",
                    icon: "warning",
                    confirmButtonColor: "#f39c12",
                    confirmButtonText: "Entendido"
                });
            }

        } catch (err) {
            if (err.response?.status === 409) {
                Swal.fire({
                    title: "⚠️ Pedido ya asignado",
                    text: "Este pedido ya fue asignado a otra persona.",
                    icon: "warning",
                    confirmButtonColor: "#f39c12",
                    confirmButtonText: "Aceptar"
                });
            } else {
                Swal.fire({
                    title: "❌ Error inesperado",
                    text: "Ocurrió un error al intentar asignar el usuario.",
                    icon: "error",
                    confirmButtonColor: "#e74c3c",
                    confirmButtonText: "Cerrar"
                });
            }
        } finally {
            await cargarPedidosEmbarques();
        }
    };


    const liberarUsuarioPaqueteria = async (no_orden) => {
        const confirm = await Swal.fire({
            title: "¿Liberar pedido?",
            text: `¿Deseas liberar el pedido ${no_orden} para reasignarlo a otro usuario?`,
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Sí, liberar",
            cancelButtonText: "Cancelar"
        });

        if (!confirm.isConfirmed) return;

        try {
            const res = await axios.put(`http://66.232.105.107:3001/api/surtido/liberar-usuario-paqueteria`, { no_orden });
            if (res.data?.ok) {
                await Swal.fire({
                    title: "⚠️ No se pudo liberar",
                    text: res.data?.message || "Ocurrió un problema al intentar liberar el pedido.",
                    icon: "warning",
                    confirmButtonColor: "#f39c12",
                    confirmButtonText: "Entendido"
                });
            }
 
        } catch (err) {
            if (err.response?.status === 409) {
                await Swal.fire({
                    title: "⚠️ No se puede liberar",
                    text: "Existen registros en las Vlidaciones. El pedido no puede ser liberado.",
                    icon: "warning",
                    confirmButtonColor: "#f39c12",
                    confirmButtonText: "Aceptar"
                });
            } else {
                await Swal.fire({
                    title: "❌ Error al liberar",
                    text: "Ocurrió un error inesperado al liberar el pedido.",
                    icon: "error",
                    confirmButtonColor: "#e74c3c",
                    confirmButtonText: "Cerrar"
                });
            }
        } finally {
            await cargarPedidosEmbarques();
        }
    };


    /* ---------- Finalizados ---------- */
    const [pedidosFinalizados, setPedidosFinalizados] = useState([]);
    const [detalleExpandido, setDetalleExpandido] = useState({});
    const [qFin, setQFin] = useState(''); // filtro de finalizados

    useEffect(() => {
        axios.get("http://66.232.105.107:3001/api/surtido/Obtener-pedidos-finalizados")
            .then(res => {
                const rows = Array.isArray(res.data) ? res.data : [];
                const map = {};
                rows.forEach(item => {
                    const no_orden = String(item.no_orden ?? "").trim();
                    const tipo = String(item.tipo ?? "").trim().toUpperCase();
                    const key = `${no_orden}__${tipo}`;
                    if (!map[key]) map[key] = { key, no_orden, tipo, productos: [] };
                    map[key].productos.push(item);
                });
                setPedidosFinalizados(Object.values(map));
            })
            .catch(() => setPedidosFinalizados([]));
    }, []);

    const PAGE_SIZE_FIN = 5;
    const [pageFin, setPageFin] = useState(1);

    // FILTRO aplicado a finalizados (no_orden, tipo, código de producto)
    const finalizadosFiltrados = (Array.isArray(pedidosFinalizados) ? pedidosFinalizados : []).filter(p => {
        const q = qFin.trim().toLowerCase();
        if (!q) return true;
        const no = String(p?.no_orden ?? '').toLowerCase();
        const tip = String(p?.tipo ?? '').toLowerCase();
        const enProductos = (Array.isArray(p?.productos) ? p.productos : [])
            .some(prod => String(prod?.codigo_pedido ?? '').toLowerCase().includes(q));
        return no.includes(q) || tip.includes(q) || enProductos;
    });

    useEffect(() => { setPageFin(1); }, [qFin, pedidosFinalizados]);

    const totalPagesFin = Math.ceil(finalizadosFiltrados.length / PAGE_SIZE_FIN) || 1;
    const startIdxFin = (pageFin - 1) * PAGE_SIZE_FIN;
    const endIdxFin = startIdxFin + PAGE_SIZE_FIN;
    const pedidosFinPagina = finalizadosFiltrados.slice(startIdxFin, endIdxFin);

    /* ===================== Render ===================== */

    const [busqueda, setBusqueda] = useState('');

    const embarquesFiltrados = embarques.filter((p) => {
        const texto = busqueda.trim().toLowerCase();
        if (!texto) return true;
        return String(p.no_orden).toLowerCase().includes(texto);
    });


    // Generar Packin list

    const generarPDFPackingList = async (noOrden, tipo) => {
        try {
            Swal.fire({
                title: "Generando PDF...",
                text: "Por favor espera",
                didOpen: () => Swal.showLoading(),
                allowOutsideClick: false,
            });

            const res = await axios.get(
                `http://66.232.105.107:3001/api/surtido/detalle/${noOrden}/${tipo}`
            );

            const cajas = res.data.data || res.data;
            if (!Array.isArray(cajas)) {
                Swal.fire("❌ Error", "Formato inválido de servidor", "error");
                return;
            }

            const doc = new jsPDF();

            // === CONFIGURACIÓN GLOBAL DE FOOTER Y NUMERACIÓN ===
            doc.autoTableSetDefaults({
                didDrawPage: (data) => {
                    const pageWidth = doc.internal.pageSize.getWidth();
                    const pageHeight = doc.internal.pageSize.getHeight();

                    // Dibuja la barra inferior (footer)
                    const footerHeight = 6;
                    const footerY = pageHeight - footerHeight - 5;
                    doc.addImage(footerBar, "JPEG", 10, footerY, pageWidth - 20, footerHeight);

                    // Texto de numeración (encima de la barra)
                    const currentPage = doc.internal.getCurrentPageInfo().pageNumber;
                    const totalPages = doc.internal.getNumberOfPages();

                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(8);
                    doc.setTextColor(255, 255, 255);
                    doc.text(`Página ${currentPage} de ${totalPages}`, pageWidth - 35, pageHeight - 3);
                },
            });


            const marginLeft = 10;
            let y = 26;

            // **** ENCABEZADO SANTUL ****
            doc.setFillColor(240, 36, 44);
            doc.rect(10, 10, 190, 8, "F");
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10.5);
            doc.text("FORMATO PARA RECEPCIÓN DEL PEDIDO", 105, 15.5, { align: "center" });

            doc.addImage(logoPacking, "JPEG", 150, 21, 45, 18);

            doc.setFont("helvetica", "bold");
            doc.setFontSize(14);
            doc.setTextColor(84, 84, 84);
            doc.text("Santul Herramientas S.A. de C.V.", marginLeft, y);
            y += 4;

            doc.setFontSize(12);
            doc.setFont("helvetica", "normal");
            doc.text("Henry Ford 257 C y D, Col. Bondojito, Gustavo A. Madero,", marginLeft, y);
            y += 4;
            doc.text("Ciudad de México, C.P. 07850, México,", marginLeft, y);
            y += 4;
            doc.text("Tel.: 58727290", marginLeft, y);
            y += 4;
            doc.text("R.F.C. SHE130912866", marginLeft, y);
            y += 5;

            doc.setDrawColor(240, 36, 44);
            doc.setLineWidth(0.5);
            doc.line(10, y, 200, y);
            y += 4;

            // Datos del cliente (provisional)
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9.5);
            doc.setTextColor(0, 0, 0);
            doc.text(`CLIENTE NO.: XXXX`, marginLeft, y);
            doc.text(`NOMBRE DEL CLIENTE: XXXXXXXX`, 60, y);
            y += 4;
            doc.text(`TELÉFONO: XXXXXXXX`, marginLeft, y);
            y += 4;
            doc.text(`DIRECCIÓN: XXXXXXXX`, marginLeft, y);
            y += 4;
            doc.text(`No Orden: ${noOrden}-${tipo}`, marginLeft, y);
            y += 4;
            doc.text(`FACTURA No.: ----   OC: ----`, marginLeft, y);
            y += 4;
            doc.text(`Líneas BD: ${cajas.length} | Líneas PDF: ${cajas.length} | Motivo: 0`, marginLeft, y);
            y += 3;


            // === BLOQUE "INFORMACIÓN IMPORTANTE" ===
            const bloqueAltura = 18; // altura mayor del recuadro
            const infoY = y + 1; // pequeño margen arriba

            // Fondo amarillo
            doc.setFillColor(255, 255, 0);
            doc.rect(10, infoY, 190, bloqueAltura, "F");

            // Título
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text("INFORMACIÓN IMPORTANTE", 105, infoY + 6, { align: "center" });

            // Texto en bold y con espacio más abajo
            doc.setFont("helvetica", "bold"); // <- ahora sí negritas
            doc.setFontSize(7);
            doc.text(
                "En caso de detectar cualquier irregularidad (daños, faltantes, cajas mojadas o manipulaciones), Favor de comunicarse de inmediato al departamento de atención al cliente al número: (55) 58727290 EXT.: (8815, 8819) en un Horario de Lunes a Viernes de 8:30 am a 5:00 pm",
                105,
                infoY + 13, // más bajito para mejor margen
                { align: "center", maxWidth: 185 }
            );
            y = infoY + bloqueAltura + 3;

            // === CONTAR CAJAS POR TIPO ===
            let innerMaster = 0;
            let tarimas = 0;
            let atados = 0;
            let cajasArmadas = 0;

            cajas.forEach(caja => {
                const tipo = (caja.tipo_caja || "").toUpperCase().trim();
                const numeros = String(caja.cajas || "")
                    .split(",")
                    .map(x => x.trim())
                    .filter(x => x !== "");

                if (tipo === "INNER" || tipo === "MASTER") innerMaster += numeros.length;
                if (tipo === "TARIMA") tarimas += numeros.length;
                if (tipo === "ATA" || tipo === "ATADO") atados += numeros.length;
                if (tipo === "CAJA") cajasArmadas += numeros.length;
            });

            const totalCajas = innerMaster + tarimas + atados + cajasArmadas;

            // === TABLA DE RESUMEN ===
            doc.autoTable({
                startY: y,
                head: [["INNER/MASTER", "TARIMAS", "ATADOS", "CAJAS ARMADAS", "TOTAL CAJAS"]],
                body: [[innerMaster, tarimas, atados, cajasArmadas, totalCajas]],
                theme: "grid",
                margin: { left: 10 },
                tableWidth: 190,
                styles: { fontSize: 9, halign: "center", cellPadding: 3 },
                headStyles: {
                    fillColor: [210, 210, 210],
                    textColor: [0, 0, 0],
                    fontStyle: "bold"
                }
            });

            y = doc.lastAutoTable.finalY + 6;


            // ===== TABLAS POR CAJA =====
            cajas.forEach((caja, index) => {
                doc.setFontSize(10);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(0, 0, 0);

                // Determinar texto según tipo caja
                const tipoMostrar = (caja.tipo_caja || "").toUpperCase();
                const titulo = `Productos en ${tipoMostrar} ${caja.cajas}`;

                doc.text(titulo, 105, y, { align: "center" });
                y += 6;

                doc.autoTable({
                    startY: y,
                    columnStyles: {
                        1: { cellWidth: 85 },
                    },
                    headStyles: {
                        fillColor: [0, 0, 0],
                        textColor: [255, 255, 255],
                        fontSize: 7,
                        fontStyle: "bold"
                    },
                    head: [[
                        "SKU",
                        "DESCRIPCIÓN",
                        "CANTIDAD",
                        "UM",
                        "PZ",
                        "PQ",
                        "INNER",
                        "MASTER",
                        "TARIMA",
                        "ATADOS",
                        "VALIDA"
                    ]],
                    body: caja.productos.map(p => [
                        p.codigo_producto,
                        p.descripcion_producto,
                        p.cantidad,
                        p.um,
                        p._pz || 0,
                        p._pq || 0,
                        p._inner || 0,
                        p._master || 0,
                        tipoMostrar === "TARIMA" ? 1 : 0,
                        tipoMostrar === "ATADO" ? 1 : 0,
                        "" // columna VACÍA para firma/validación
                    ]),
                    theme: "grid",
                    margin: { left: 10 },
                    tableWidth: 190,
                    styles: {
                        fontSize: 7,
                        halign: "center",
                        cellPadding: 1.3
                    },
                    headStyles: {
                        fillColor: [0, 0, 0],
                        textColor: [255, 255, 255],
                        fontSize: 7,
                        fontStyle: "bold"
                    },
                    columnStyles: {
                        1: { cellWidth: 60 }, // descripción más ancha
                    }
                });

                y = doc.lastAutoTable.finalY + 6;

                if (y > 260) {
                    doc.addPage();
                    drawFooterSantul(doc);
                    y = 20;
                }
            });

            // === DETALLES DEL PEDIDO (Diseño final compacto) ===
            let currentY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 5 : y + 5;

            // Configuración del tamaño reducido y centrado
            const tableWidth = 90; // más angosto
            const pageWidth = doc.internal.pageSize.getWidth();
            const leftMargin = (pageWidth - tableWidth) / 2; // centrado

            doc.autoTable({
                startY: currentY,
                head: [
                    [
                        {
                            content: "DETALLES DEL PEDIDO",
                            colSpan: 2,
                            styles: {
                                halign: "center",
                                fillColor: [230, 230, 230],
                                fontSize: 7,
                            },
                        },
                        {
                            content: noOrden,
                            styles: {
                                halign: "center",
                                fillColor: [200, 200, 200],
                                fontSize: 9,
                            },
                        },
                    ],
                    [
                        {
                            content: "IMPORTE DEL PEDIDO\n(SIN IVA)",
                            styles: { halign: "center", fontSize: 5 },
                        },
                        {
                            content: "TOTAL A PAGAR\n(con IVA)",
                            styles: { halign: "center", fontSize: 5 },
                        },
                        {
                            content: "PORCENTAJE DE ENTREGA",
                            styles: { halign: "center", fontSize: 5 },
                        },
                    ],
                ],
                body: [
                    [
                        `$`,
                        `$`,
                        "100.00 %",
                    ],
                ],
                theme: "grid",
                styles: { fontSize: 8, halign: "center" },
                margin: { left: leftMargin },
                tableWidth: tableWidth,
                headStyles: {
                    fillColor: [245, 245, 245],
                    textColor: [0, 0, 0],
                    fontStyle: "bold",
                    fontSize: 4.5,
                },
            });

            y = doc.lastAutoTable.finalY + 6;

            // === TABLA DE CONFIRMACIÓN Y FIRMAS ===
            currentY = doc.lastAutoTable.finalY + 5;
            currentY = verificarEspacio(doc, currentY, 1);

            // 1️⃣ CONFIRMACIÓN + FIRMA TRANSPORTISTA
            doc.autoTable({
                startY: currentY,
                body: [
                    [
                        {
                            content:
                                "Se confirma que las cajas, atados y/o tarimas listadas en esta lista de empaque fueron recibidas cerradas y en buen estado, y así serán entregadas al cliente. Cualquier anomalía se atenderá según lo establecido en el contrato.",
                            styles: {
                                fontSize: 7,
                                halign: "justify",
                                textColor: [0, 0, 0],
                                cellPadding: 3,
                            },
                        },
                        {
                            content: "Firma del Transportista",
                            styles: {
                                fontSize: 7,
                                halign: "center",
                                fontStyle: "bold",
                                valign: "bottom",
                                cellPadding: 3,
                            },
                        },
                    ],
                ],
                theme: "grid",
                styles: { lineColor: [180, 180, 180], lineWidth: 0.25 },
                columnStyles: {
                    0: { cellWidth: 150 },
                    1: { cellWidth: 40 },
                },
                margin: { left: 10 },
                tableWidth: 190,
            });

            currentY = doc.lastAutoTable.finalY;


            // 2️⃣ BLOQUE DE INSTRUCCIONES — Justificado + con bordes
            const instruccionesTexto = [
                "• Estimado cliente, nuestro transportista cuenta con ruta asignada por lo que agradeceríamos agilizar el tiempo de recepción de su mercancía. El material viaja consignado por lo que sólo podrá entregarse en la dirección estipulada en este documento.",
                "• Cualquier retraso en la recepción genera costos adicionales y puede afectar la entrega a otros clientes. En casos repetitivos, podrían cancelarse beneficios como descuentos adicionales.",
                "• El transportista sólo entregará en planta baja o 'nivel de calle'; si cuenta con alguna política especial de recepción, por favor solicítala con tu asesor de ventas.",
                "• Si detecta alguna anomalía en el empaque, embalaje, estado de la mercancía o diferencia en las cajas embarcadas, notifíquelo de inmediato en el apartado de observaciones.",
                "• El transportista no está autorizado a recibir mercancía. Todo reporte de devolución o garantía deberá ser comunicado a su asesor de ventas y se aplicará conforme a la política vigente.",
                "• Con la firma y/o sello en el presente documento, se da por recibida a entera conformidad la mercancía descrita y se acepta el monto a pagar aquí indicado."
            ].join("\n\n");

            doc.autoTable({
                startY: currentY,
                body: [
                    [
                        {
                            content: instruccionesTexto,
                            styles: {
                                fontSize: 7,
                                halign: "justify",
                                textColor: [0, 0, 0],
                                cellPadding: 4,
                                valign: "top",
                            },
                        },
                    ],
                ],
                theme: "grid",
                styles: { lineColor: [180, 180, 180], lineWidth: 0.25 },
                columnStyles: {
                    0: { cellWidth: 190 },
                },
                margin: { left: 10 },
                tableWidth: 190,
            });

            currentY = doc.lastAutoTable.finalY;



            // Configuración de texto

            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            doc.setTextColor(0, 0, 0);

            // Función para justificación visual con espacios reales
            function drawJustifiedText(doc, text, x, y, maxWidth, lineHeight) {
                const words = text.replace(/\s+/g, " ").split(" "); // normaliza espacios
                let line = "";
                for (let i = 0; i < words.length; i++) {
                    const testLine = line + words[i] + " ";
                    const testWidth = doc.getTextWidth(testLine);
                    if (testWidth > maxWidth && i > 0) {
                        const wordsInLine = line.trim().split(" ");
                        const numSpaces = wordsInLine.length - 1;
                        let extraSpace = 0;
                        if (numSpaces > 0)
                            extraSpace = (maxWidth - doc.getTextWidth(line.trim())) / numSpaces;
                        let posX = x;
                        wordsInLine.forEach((word, idx) => {
                            doc.text(word, posX, y);
                            if (idx < numSpaces) posX += doc.getTextWidth(word) + extraSpace;
                        });
                        line = words[i] + " ";
                        y += lineHeight;
                    } else {
                        line = testLine;
                    }
                }
                doc.text(line.trim(), x, y);
                return y + lineHeight;
            }

            // 3️⃣ PAGARÉ + FIRMA CLIENTE
            const fechaActual = new Date();
            const fechaHoy = fechaActual.toLocaleDateString("es-MX");
            const fechaVence = new Date(
                fechaActual.setMonth(fechaActual.getMonth() + 1)
            ).toLocaleDateString("es-MX");

            const textoPagare =
                `En cualquier lugar de este documento donde se estampe la firma por este pagaré debo(emos) y pagaré(mos) ` +
                `incondicionalmente a la vista y a la orden de SANTUL HERRAMIENTAS S.A. DE C.V., la cantidad de: $` +
                `( M.N.) En el total a pagar en Cuautitlán, Estado de México, o en la que SANTUL HERRAMIENTAS S.A. DE C.V., juzgue necesario. ` +
                `Este documento causará intereses al 3% mensual si no se paga a su vencimiento. Expide el ${fechaHoy}, vence el ${fechaVence}.`;

            doc.autoTable({
                startY: currentY,
                body: [
                    [
                        {
                            content: textoPagare,
                            styles: {
                                fontSize: 7,
                                halign: "justify",
                                textColor: [0, 0, 0],
                                cellPadding: 3,
                                fillColor: [245, 245, 245], // fondo gris suave
                            },
                        },
                        {
                            content: "Firma del Cliente",
                            styles: {
                                fontSize: 7,
                                halign: "center",
                                fontStyle: "bold",
                                valign: "bottom",
                                cellPadding: 3,
                            },
                        },
                    ],
                ],
                theme: "grid",
                styles: { lineColor: [180, 180, 180], lineWidth: 0.25 },
                columnStyles: {
                    0: { cellWidth: 150 },
                    1: { cellWidth: 40 },
                },
                margin: { left: 10 },
                tableWidth: 190,
            });



            // === BLOQUE DE REFERENCIA BANCARIA + OBSERVACIONES ===

            // === BLOQUE DE REFERENCIA BANCARIA SIN TABLA (alineado) ===
            let bloqueY = (doc.lastAutoTable && doc.lastAutoTable.finalY)
                ? doc.lastAutoTable.finalY + 10
                : y + 10;

            const pageHeight = doc.internal.pageSize.height;
            const footerHeight = 22;

            // Si no cabe, manda a nueva página
            if (bloqueY + 40 > pageHeight - footerHeight) {
                doc.addPage();
                drawFooterSantul(doc);
                bloqueY = 25;
            }

            // --- Título de referencia ---
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.text("Referencias bancarias:", 15, bloqueY);

            // --- Encabezados de columnas ---
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            const headerY = bloqueY + 8;
            doc.text("BANCO", 15, headerY);
            doc.text("NO. DE CUENTA", 40, headerY);
            doc.text("SUCURSAL", 75, headerY);
            doc.text("CLABE", 100, headerY); // ← antes 140

            // --- Datos de cuentas ---
            doc.setFont("helvetica", "normal");
            const dataY = headerY + 6;
            doc.text("BANAMEX", 15, dataY);
            doc.text("6860432", 40, dataY);
            doc.text("7006", 75, dataY);
            doc.text("002180700668604325", 100, dataY); // ← antes 140

            doc.text("BANORTE", 15, dataY + 6);
            doc.text("0890771176", 40, dataY + 6);
            doc.text("04", 75, dataY + 6);
            doc.text("072180008907711766", 100, dataY + 6); // ← antes 140

            doc.text("BANCOMER", 15, dataY + 12);
            doc.text("CIE 2476827", 40, dataY + 12);
            doc.text("1838", 75, dataY + 12);
            doc.text("", 100, dataY + 12); // sin clabe

            // --- Cuadro de observaciones a la derecha ---
            const obsX = 135; // ← antes 135
            const obsY = bloqueY + 3;
            const obsWidth = 65;
            const obsHeight = 38;


            doc.setDrawColor(0);
            doc.rect(obsX, obsY, obsWidth, obsHeight);

            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.text("Observaciones:", obsX + 4, obsY + 7);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);

            let obsLineY = obsY + 12;
            [
                "...........................................................................",
                "OC: ....................................................................",
                "...........................................................................",
                "...........................................................................",
            ].forEach((linea) => {
                doc.text(linea, obsX + 4, obsLineY);
                obsLineY += 7;
            });

            // --- Texto inferior ---
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.text(
                "A la firma/sello del presente documento se tiene por recibida de conformidad la mercancía y aceptado el monto a pagar aquí descrita.",
                105,
                obsY + obsHeight + 10,
                { align: "center", maxWidth: 185 }
            );


            // === Agregar numeración de páginas ===
            const totalPages = doc.internal.getNumberOfPages();

            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i); // Ir a la página i

                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);
                doc.setTextColor(0, 0, 0);

                const pageWidth = doc.internal.pageSize.getWidth();
                const pageHeight = doc.internal.pageSize.getHeight();

                // Redibuja la barra en cada página
                drawFooterSantul(doc);

                // Esquina inferior derecha, justo encima de la barra
                doc.text(`Página ${i} de ${totalPages}`, pageWidth - 35, pageHeight - 8);
            }


            drawFooterSantul(doc);
            doc.save(`Packing Lsit ${noOrden}-${tipo}.pdf`);
            Swal.close();
            Swal.fire("✅ Packing List generado", "El archivo fue creado con éxito", "success");

        } catch (err) {
            Swal.close();

            Swal.fire("❌ Error", "No se pudo generar el PDF", "error");
            console.error(err);
        }
    };

    // ==== FUNCIONES AUXILIARES ====
    function verificarEspacio(doc, currentY, lineasEstimadas = 3) {
        const maxY = 270; // límite inferior de la hoja
        const espacio = lineasEstimadas * 5; // alto estimado de líneas
        if (currentY + espacio > maxY) {
            doc.addPage();
            return 20; // reinicia posición Y en nueva página
        }
        return currentY;
    }


    function drawFooterSantul(doc) {
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();

        // Coloca la barra en el fondo inferior centrada
        const footerHeight = 6; // alto visible de la barra
        const footerY = pageHeight - footerHeight - 5; // un poco arriba del borde

        // Inserta la imagen
        doc.addImage(footerBar, "JPEG", 10, footerY, pageWidth - 20, footerHeight);

        // Texto informativo (si quieres conservarlo)
    }



    return (
        <div className="place_holder-container fade-in" style={{ height: '95vh', overflowY: 'auto' }}>
            <Box sx={{ width: '100%' }}>

                <div
                    className="place_holder-header"
                    style={{
                        background: '#e74c3c', padding: '8px 16px', display: 'flex',
                        alignItems: 'center', justifyContent: 'space-between',
                        position: 'sticky', top: 0, zIndex: 2500
                    }}
                >
                    <span className="place_holder-title">Progreso de Pedidos</span>
                    <button style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                        onClick={() => (window.location.href = '/menu')}>
                        <FaTimes color="#fff" size={18} />
                    </button>
                </div>

                <Tabs value={tabActual} onChange={handleChange} variant="fullWidth"
                    textColor="primary" indicatorColor="primary"
                    sx={{ borderBottom: 1, borderColor: 'divider', backgroundColor: '#f9f9f9' }}>
                    <Tab label="Surtido" />
                    <Tab label="Embarques" />
                    <Tab label="Finalizados" />
                </Tabs>

                <Box sx={{ p: 2 }}>

                    {/* ----------  TAB SURTIDO  ---------- */}
                    {tabActual === 0 && (
                        <div>
                            <Box p={3} sx={{ height: 'calc(100vh - 180px)', overflowY: 'auto', background: "#faf9f9" }}>
                                {pedidos.length === 0 ? (
                                    <Typography color="textSecondary" align="center" mt={4}>No hay pedidos en surtido.</Typography>
                                ) : pedidos.map(pedido => {
                                    const progreso = calcularProgreso(pedido.productos);
                                    const rowKey = pedido.key || (pedido.no_orden + pedido.tipo);
                                    return (
                                        <Card key={rowKey} sx={{ mb: 4 }}>
                                            <CardContent>
                                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                                    <Box>
                                                        <Typography variant="h6" fontWeight={600}>
                                                            {pedido.tipo} : {pedido.no_orden} : {pedido.bahia}
                                                        </Typography>
                                                        <Typography fontWeight={600}>Surtido por: <b>{pedido.nombre_usuario || "?"}</b></Typography>
                                                    </Box>
                                                    <Button size="small" variant="outlined"
                                                        onClick={() => setExpanded(prev => ({ ...prev, [rowKey]: !prev[rowKey] }))}>
                                                        {expanded[rowKey] ? "Ocultar" : "Ver productos"}
                                                    </Button>

                                                    {progreso === 100 && (
                                                        <Button
                                                            size="small"
                                                            variant="contained"
                                                            color="success"
                                                            sx={{ ml: 1 }}
                                                            onClick={() => finalizarPedido(pedido.no_orden, pedido.tipo)}
                                                        >
                                                            Autorización
                                                        </Button>

                                                    )}
                                                </Box>

                                                <Box mt={1} mb={2}>
                                                    <Typography variant="body2" mb={0.5}>Progreso</Typography>
                                                    <Box display="flex" alignItems="center">
                                                        <LinearProgress variant="determinate" value={progreso}
                                                            sx={{
                                                                flex: 1, height: 8, borderRadius: 8, mr: 2, background: "#d6eaff",
                                                                '& .MuiLinearProgress-bar': { background: progreso === 100 ? '#2ecc40' : progreso > 0 ? '#82f263' : '#c4e0fc' }
                                                            }}
                                                        />
                                                        <Typography width={40} fontWeight={600} textAlign="right">{progreso}%</Typography>
                                                    </Box>
                                                </Box>

                                                {expanded[rowKey] && (
                                                    <Table size="small" sx={{ mt: 2 }}>
                                                        <TableHead>
                                                            <TableRow>
                                                                <TableCell>Código</TableCell>
                                                                <TableCell>Cantidad</TableCell>
                                                                <TableCell>Cant. Surtida</TableCell>
                                                                <TableCell>Cant. No Enviada</TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {(pedido.productos || []).map((prod, idx) => (
                                                                <TableRow key={prod.codigo_pedido + idx}>
                                                                    <TableCell>{prod.codigo_pedido}</TableCell>
                                                                    <TableCell>{prod.cantidad}</TableCell>
                                                                    <TableCell>{prod.cant_surtida}</TableCell>
                                                                    <TableCell>{prod.cant_no_enviada}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                )}
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </Box>
                        </div>
                    )}

                    {/* ---------- TAB EMBARQUES ---------- */}
                    {tabActual === 1 && (
                        <Box sx={{ height: 'calc(100vh - 150px)', overflowY: 'auto', paddingRight: 1 }}>
                            <Box
                                display="flex"
                                alignItems="center"
                                gap={2}
                                mb={2}
                                sx={{ backgroundColor: '#f5f5f5', p: 2, borderRadius: 2 }}
                            >
                                <TextField
                                    label="Buscar por No. Orden"
                                    variant="outlined"
                                    size="small"
                                    value={busqueda || ""}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    placeholder="Ej. 17839"
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon color="action" />
                                            </InputAdornment>
                                        ),
                                        endAdornment: busqueda && (
                                            <InputAdornment position="end">
                                                <IconButton onClick={() => setBusqueda("")}>
                                                    <ClearIcon />
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{ width: 300 }}
                                />
                                <Typography variant="body2" color="textSecondary">
                                    Resultados: {embarquesFiltrados.length}
                                </Typography>
                            </Box>

                            {embarquesFiltrados.length === 0 ? (
                                <Typography color="textSecondary" align="center" mt={4}>
                                    No hay pedidos en embarques.
                                </Typography>
                            ) : (
                                embarquesFiltrados.map(pedido => {
                                    const rowKey = pedido.key || (pedido.no_orden + pedido.tipo);

                                    const total = pedido.productos.reduce(
                                        (sum, p) => sum + Number(p._pz || 0) + Number(p._pq || 0) + Number(p._inner || 0) + Number(p._master || 0), 0);
                                    const surtido = pedido.productos.reduce(
                                        (sum, p) => sum + Number(p.v_pz || 0) + Number(p.v_pq || 0) + Number(p.v_inner || 0) + Number(p.v_master || 0), 0);
                                    const progreso = total > 0 ? Math.round((surtido / total) * 100) : 0;

                                    const yaAsignado = !!getAssignedUserIdFromPedido(pedido) ||
                                        !!getAssignedUserNameFromPedido(pedido, usuariosPaqueteria);
                                    const nombreAsignado = getAssignedUserNameFromPedido(pedido, usuariosPaqueteria) || '?';
                                    const liberarHabilitado = puedeLiberarPedido(pedido);

                                    return (
                                        <Card key={rowKey} sx={{ mb: 4 }}>
                                            <CardContent>
                                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                                    <Box>
                                                        <Typography variant="h6" fontWeight={600}>
                                                            {pedido.tipo} : {pedido.no_orden} : {pedido.bahia}
                                                        </Typography>
                                                        <Typography fontWeight={600}>Surtido por: <b>{pedido.nombre_usuario || '?'}</b></Typography>
                                                    </Box>

                                                    <Box>
                                                        <Button size="small" variant="outlined"
                                                            onClick={() => setExpanded(prev => ({ ...prev, [rowKey]: !prev[rowKey] }))}>
                                                            {expanded[rowKey] ? 'Ocultar' : 'Ver productos'}
                                                        </Button>

                                                        {!yaAsignado ? (
                                                            <Box mt={1}>
                                                                <Typography variant="body2">Asignar usuario:</Typography>
                                                                <select
                                                                    defaultValue=""
                                                                    onChange={(e) => {
                                                                        const selected = e.target.value; // puede ser id o nombre
                                                                        if (!selected) return;
                                                                        asignarUsuarioPaqueteria(pedido.no_orden, selected);
                                                                    }}
                                                                >
                                                                    <option value="">-- Selecciona --</option>
                                                                    {usuariosPaqueteria.map((u, i) => {
                                                                        const id = getUserId(u);
                                                                        const nombre = getUserName(u) || `Usuario ${id || i + 1}`;
                                                                        const value = id || nombre; // si no hay id, manda nombre
                                                                        return <option key={id || nombre || i} value={value}>{nombre}</option>;
                                                                    })}
                                                                </select>
                                                            </Box>
                                                        ) : (
                                                            <Box mt={1} display="flex" alignItems="center" gap={1}>
                                                                <Typography variant="body2">Usuario asignado: <b>{nombreAsignado}</b></Typography>
                                                                <Button
                                                                    size="small"
                                                                    color="warning"
                                                                    variant="outlined"
                                                                    onClick={() => liberarUsuarioPaqueteria(pedido.no_orden)}
                                                                    disabled={!liberarHabilitado}
                                                                    title={liberarHabilitado ? '' : 'No se puede liberar: hay validaciones en v_pz/v_pq/v_inner/v_master'}
                                                                    sx={{ ml: 1 }}
                                                                >
                                                                    Liberar pedido
                                                                </Button>
                                                            </Box>
                                                        )}

                                                        {progreso === 100 && (
                                                            <Button size="small" variant="contained" color="success" sx={{ ml: 1 }}
                                                                onClick={() => finalizarPedido(pedido.no_orden)}>
                                                                Finalizar Pedido
                                                            </Button>
                                                        )}
                                                    </Box>
                                                </Box>

                                                <Box mt={1} mb={2}>
                                                    <Typography variant="body2" mb={0.5}>Progreso (Validación de Surtido)</Typography>
                                                    <Box display="flex" alignItems="center">
                                                        <LinearProgress variant="determinate" value={progreso}
                                                            sx={{
                                                                flex: 1, height: 8, borderRadius: 8, mr: 2, background: '#f1f1f1',
                                                                '& .MuiLinearProgress-bar': { background: '#3498db' }
                                                            }}
                                                        />
                                                        <Typography width={40} fontWeight={600} textAlign="right">{progreso}%</Typography>
                                                    </Box>
                                                </Box>

                                                {expanded[rowKey] && (
                                                    <Table size="small" sx={{ mt: 2 }}>
                                                        <TableHead>
                                                            <TableRow>
                                                                <TableCell>Código</TableCell>
                                                                <TableCell>PZ</TableCell>
                                                                <TableCell>PQ</TableCell>
                                                                <TableCell>INNER</TableCell>
                                                                <TableCell>MASTER</TableCell>
                                                                <TableCell>V_PZ</TableCell>
                                                                <TableCell>V_PQ</TableCell>
                                                                <TableCell>V_INNER</TableCell>
                                                                <TableCell>V_MASTER</TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {pedido.productos.map((prod, idx) => (
                                                                <TableRow key={prod.codigo_pedido + idx}>
                                                                    <TableCell>{prod.codigo_pedido}</TableCell>
                                                                    <TableCell>{prod._pz}</TableCell>
                                                                    <TableCell>{prod._pq}</TableCell>
                                                                    <TableCell>{prod._inner}</TableCell>
                                                                    <TableCell>{prod._master}</TableCell>
                                                                    <TableCell>{prod.v_pz}</TableCell>
                                                                    <TableCell>{prod.v_pq}</TableCell>
                                                                    <TableCell>{prod.v_inner}</TableCell>
                                                                    <TableCell>{prod.v_master}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                )}
                                            </CardContent>
                                        </Card>
                                    );
                                })
                            )}
                        </Box>
                    )}

                    {/* ---------- TAB FINALIZADOS ---------- */}
                    {tabActual === 2 && (
                        <Box p={2}>
                            <Typography variant="h6" gutterBottom>Pedidos finalizados</Typography>

                            {(Array.isArray(pedidosFinalizados) ? pedidosFinalizados : []).length === 0 ? (
                                <Typography color="textSecondary">No hay pedidos finalizados.</Typography>
                            ) : (
                                <>
                                    {/* BUSCADOR + PAGINACIÓN */}
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1} gap={2} flexWrap="wrap">
                                        <TextField
                                            size="small"
                                            label="Buscar pedido"
                                            placeholder="No. orden, tipo o código"
                                            value={qFin}
                                            onChange={(e) => setQFin(e.target.value)}
                                            sx={{ minWidth: 260 }}
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <SearchIcon fontSize="small" />
                                                    </InputAdornment>
                                                ),
                                                endAdornment: qFin ? (
                                                    <InputAdornment position="end">
                                                        <IconButton aria-label="limpiar" onClick={() => setQFin('')}>
                                                            <ClearIcon fontSize="small" />
                                                        </IconButton>
                                                    </InputAdornment>
                                                ) : null,
                                            }}
                                        />

                                        <Pagination
                                            count={totalPagesFin}
                                            page={pageFin}
                                            onChange={(_, p) => {
                                                setPageFin(p);
                                                document.querySelector('#lista-finalizados')?.scrollTo({ top: 0, behavior: 'smooth' });
                                            }}
                                            size="small" color="primary" showFirstButton showLastButton
                                        />
                                    </Box>

                                    <Box id="lista-finalizados">
                                        {(Array.isArray(pedidosFinPagina) ? pedidosFinPagina : []).map((pedido, idxPedido) => {
                                            const rowKey = pedido?.key || `${pedido?.tipo || ''}-${pedido?.no_orden || ''}-${idxPedido}`;
                                            const prods = Array.isArray(pedido?.productos) ? pedido.productos : [];
                                            const total = prods.reduce((s, p) => s + Number(p?.cantidad || 0), 0);
                                            const surtida = prods.reduce((s, p) => s + Number(p?.cant_surtida || 0), 0);
                                            const noEnviada = prods.reduce((s, p) => s + Number(p?.cant_no_enviada || 0), 0);

                                            return (
                                                <Paper key={rowKey} sx={{ mb: 2, p: 2 }}>
                                                    <Typography variant="subtitle1" fontWeight="bold">
                                                        {pedido?.tipo} : {pedido?.no_orden}
                                                    </Typography>

                                                    <Typography variant="body2" sx={{ mb: 1 }}>
                                                        Total: <b>{total}</b> &nbsp;|&nbsp; Surtida: <b>{surtida}</b> &nbsp;|&nbsp; No enviada: <b>{noEnviada}</b>
                                                    </Typography>

                                                    <Button variant="outlined" size="small" sx={{ my: 1 }}
                                                        onClick={() => setDetalleExpandido(prev => ({ ...prev, [rowKey]: !prev[rowKey] }))}>
                                                        {detalleExpandido[rowKey] ? "Ocultar productos" : "Ver productos"}
                                                    </Button>

                                                    <Button
                                                        variant="contained"
                                                        size="small"
                                                        sx={{ ml: 1 }}
                                                        onClick={() => generarPDFPackingList(pedido.no_orden, pedido.tipo)}
                                                    >
                                                        Generar PDF
                                                    </Button>

                                                    {detalleExpandido[rowKey] && (
                                                        <Box sx={{ mt: 2, maxHeight: 250, overflowY: 'auto', border: '1px solid #ccc', borderRadius: 2 }}>
                                                            <Table size="small">
                                                                <TableHead>
                                                                    <TableRow>
                                                                        <TableCell>Código</TableCell>
                                                                        <TableCell>Cantidad</TableCell>
                                                                        <TableCell>Cant. Surtida</TableCell>
                                                                        <TableCell>Cant. No Enviada</TableCell>
                                                                        <TableCell>Bahia</TableCell>
                                                                        <TableCell>Nombre Surtidor</TableCell>
                                                                        <TableCell>Cant pz</TableCell>
                                                                        <TableCell>Cant Inner</TableCell>
                                                                        <TableCell>Cant Master</TableCell>
                                                                        <TableCell>Inicio - Fin de Surtido</TableCell>
                                                                        <TableCell>Nombre Embarques / Paqueteria</TableCell>
                                                                        <TableCell>Validar pz</TableCell>
                                                                        <TableCell>Validar Inner</TableCell>
                                                                        <TableCell>Validar Master</TableCell>
                                                                        <TableCell>Inicio - Fin de Embarque</TableCell>
                                                                    </TableRow>
                                                                </TableHead>
                                                                <TableBody>
                                                                    {prods.map((prod, i) => (
                                                                        <TableRow key={`${prod?.codigo_pedido || i}_${i}`}
                                                                            sx={{ backgroundColor: Number(prod?.cant_no_enviada || 0) > 0 ? "#ff0026ff" : "inherit" }}>
                                                                            <TableCell>{prod?.codigo_pedido}</TableCell>
                                                                            <TableCell>{prod?.cantidad}</TableCell>
                                                                            <TableCell>{prod?.cant_surtida}</TableCell>
                                                                            <TableCell>{prod?.cant_no_enviada}</TableCell>
                                                                            <TableCell>{prod?.ubi_bahia}</TableCell>
                                                                            <TableCell>{prod?.nombre_usuario}</TableCell>
                                                                            <TableCell>{prod?._pz}</TableCell>
                                                                            <TableCell>{prod?._inner}</TableCell>
                                                                            <TableCell>{prod?._master}</TableCell>
                                                                            <TableCell>
                                                                                <b>Inicio:</b> {prod?.inicio_surtido ? new Date(prod.inicio_surtido).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "medium" }) : "-"}
                                                                                <br />
                                                                                <b>Fin:</b> {prod?.fin_surtido ? new Date(prod.fin_surtido).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "medium" }) : "-"}
                                                                            </TableCell>
                                                                            <TableCell>{prod?.nombre_paqueteria}</TableCell>
                                                                            <TableCell>{prod?.v_pz}</TableCell>
                                                                            <TableCell>{prod?.v_inner}</TableCell>
                                                                            <TableCell>{prod?.v_master}</TableCell>
                                                                            <TableCell>
                                                                                <b>Inicio:</b> {prod?.inicio_embarque ? new Date(prod.inicio_embarque).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "medium" }) : "-"}
                                                                                <br />
                                                                                <b>Fin:</b> {prod?.fin_embarque ? new Date(prod.fin_embarque).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "medium" }) : "-"}
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                        </Box>
                                                    )}
                                                </Paper>
                                            );
                                        })}
                                    </Box>
                                </>
                            )}
                        </Box>
                    )}

                </Box>
            </Box>
        </div>
    );
}

export default Surtiendo;

