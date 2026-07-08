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

const getUserId = (u) =>
    Number(u?.id ?? u?.ID ?? u?.id_usuario ?? u?.usuario_id ?? u?.idUser ?? 0);

const getUserName = (u) =>
    String(u?.nombre ?? u?.name ?? u?.usuario ?? u?.alias ?? u?.display ?? '').trim();

const getAssignedUserIdFromPedido = (pedido) => {
    const top = Number(
        pedido?.id_usuario_paqueteria ??
        pedido?.usuario_paqueteria_id ??
        pedido?.id_paqueteria ??
        0
    );
    if (top) return top;
    for (const r of (pedido.productos || [])) {
        const v = Number(r?.id_usuario_paqueteria ?? r?.usuario_paqueteria_id ?? r?.id_paqueteria ?? 0);
        if (v) return v;
    }
    return 0;
};

const getAssignedUserNameFromPedido = (pedido, usuariosPaqueteria = []) => {
    const direct = pedido?.nombre_usuario_paqueteria ?? pedido?.usuario_paqueteria ?? pedido?.nombre_paqueteria ?? '';
    if (direct) return String(direct);
    const row = (pedido.productos || []).find(r => r?.nombre_usuario_paqueteria || r?.usuario_paqueteria || r?.nombre_paqueteria);
    if (row) return String(row.nombre_usuario_paqueteria ?? row.usuario_paqueteria ?? row.nombre_paqueteria);
    const id = getAssignedUserIdFromPedido(pedido);
    if (id) {
        const hit = usuariosPaqueteria.find(u => getUserId(u) === Number(id));
        if (hit) return getUserName(hit);
    }
    return '';
};

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

    const [pedidosPendientes, setPedidosPendientes] = useState([]);

    const cargarPedidosPendientes = async () => {
        try {
            const res = await axios.get('http://66.232.105.107:3001/api/pedidos/todos-con-productos');
            // Solo los que están PENDIENTE (aún en 'pedidos', no en surtido/embarque)
            const pendientes = (res.data || []).filter(p => p.estado_proceso === 'PENDIENTE');
            setPedidosPendientes(pendientes);
        } catch {
            setPedidosPendientes([]);
        }
    };

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
                        key, no_orden: noOrden, tipo: tipoNorm,
                        bahia: item.ubi_bahia ?? '',
                        nombre_usuario: item.nombre_usuario ?? '',
                        ordenes_unidas: item.ordenes_unidas ?? null,
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
                        key, no_orden: item.no_orden, tipo: tipoNorm,
                        bahia: item.ubi_bahia, nombre_usuario: item.nombre_usuario,
                        id_usuario_paqueteria: item.id_usuario_paqueteria ?? null,
                        nombre_usuario_paqueteria: item.nombre_usuario_paqueteria ?? '',
                        productos: []
                    };
                }
                pedidosAgrupados[key].productos.push(item);
                if (item.id_usuario_paqueteria && !pedidosAgrupados[key].id_usuario_paqueteria)
                    pedidosAgrupados[key].id_usuario_paqueteria = item.id_usuario_paqueteria;
                if (item.nombre_usuario_paqueteria && !pedidosAgrupados[key].nombre_usuario_paqueteria)
                    pedidosAgrupados[key].nombre_usuario_paqueteria = item.nombre_usuario_paqueteria;
            });

            setEmbarques(Object.values(pedidosAgrupados));
        } catch { setEmbarques([]); }
    };

    const cargarUsuariosPaqueteria = async () => {
        try {
            const res = await axios.get('http://66.232.105.107:3001/api/surtido/Obtener-usuarios');
            setUsuariosPaqueteria(Array.isArray(res.data) ? res.data : []);
        } catch { setUsuariosPaqueteria([]); }
    };


    // ✅ NUEVO — fusionar una VQ pendiente sobre la CD que ya está en embarques
    const fusionarVqEnEmbarque = async (pedidoCD) => {
        // Si no hay pendientes, avisar
        if (!pedidosPendientes.length) {
            await Swal.fire({
                title: "Sin pedidos pendientes",
                text: "No hay órdenes pendientes para fusionar.",
                icon: "info"
            });
            return;
        }

        // Construir las opciones del select con los pendientes
        const opciones = {};
        pedidosPendientes.forEach(p => {
            // value = "no_orden|tipo"  ·  label = "VQ 20856 (11 productos)"
            opciones[`${p.no_orden}|${p.tipo}`] =
                `${p.tipo} ${p.no_orden} (${(p.productos || []).length} prod.)`;
        });

        const { value: seleccion } = await Swal.fire({
            title: `Fusionar con ${pedidoCD.tipo} ${pedidoCD.no_orden}`,
            input: "select",
            inputOptions: opciones,
            inputPlaceholder: "Selecciona la orden a fusionar",
            showCancelButton: true,
            confirmButtonText: "Fusionar",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#7b1fa2",
            inputValidator: (v) => !v && "Debes seleccionar una orden"
        });

        if (!seleccion) return;

        const [noOrdenVQ, tipoVQ] = seleccion.split('|');

        // Confirmación final
        const { isConfirmed } = await Swal.fire({
            title: "¿Confirmar fusión?",
            html: `Se va a pegar <b>${tipoVQ} ${noOrdenVQ}</b> sobre <b>${pedidoCD.tipo} ${pedidoCD.no_orden}</b>.<br>Los códigos repetidos se sumarán.`,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Sí, fusionar",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#7b1fa2"
        });
        if (!isConfirmed) return;

        try {
            Swal.fire({
                title: "Fusionando...",
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const res = await axios.post(
                'http://66.232.105.107:3001/api/pedidos/fusionar-vq-embarque',
                {
                    noOrdenCD: pedidoCD.no_orden,
                    tipoCD: pedidoCD.tipo,
                    noOrdenVQ,
                    tipoVQ
                }
            );

            Swal.close();

            if (res.data?.ok) {
                await Swal.fire({
                    title: "✅ Fusión completada",
                    text: `Órdenes unidas: ${res.data.ordenesUnidas} (${res.data.tipoFinal})`,
                    icon: "success",
                    confirmButtonColor: "#3085d6"
                });
                // Recargar embarques y pendientes
                cargarPedidosEmbarques();
                cargarPedidosPendientes();
            } else {
                await Swal.fire({
                    title: "❌ No se pudo fusionar",
                    text: res.data?.message || "Error al fusionar.",
                    icon: "error",
                    confirmButtonColor: "#e74c3c"
                });
            }
        } catch (err) {
            Swal.close();
            console.error(err);
            await Swal.fire({
                title: "❌ Error de conexión",
                text: err.response?.data?.message || "Ocurrió un error al fusionar.",
                icon: "error",
                confirmButtonColor: "#e74c3c"
            });
        }
    };

    useEffect(() => {
        if (tabActual === 1) {
            cargarPedidosEmbarques();
            cargarUsuariosPaqueteria();
            cargarPedidosPendientes();   // ✅ NUEVO
        }
    }, [tabActual]);

    // ── Helper compartido: construye el PDF de surtido ────────────────────────
    const buildPDFSurtido = (doc, productos, noOrden, tipo, ordenesOriginales = []) => {
        const totalCodigos = productos.length;
        const ubi_bahia = productos[0]?.ubi_bahia || "SIN BAHÍA";
        const primerProd = productos[0];
        const esFusion = !!primerProd?.ordenes_unidas;

        doc.setFontSize(14);
        doc.text(`Pedido: ${tipo} ${noOrden} (Total códigos: ${totalCodigos})`, 14, 18);
        doc.setFontSize(12);
        doc.text(`Bahías: ${ubi_bahia}`, 14, 26);
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);

        if (esFusion) {
            doc.text(`Órdenes fusionadas: ${primerProd.ordenes_unidas}`, 14, 34);
            doc.text("Detalle de productos surtidos", 14, 40);
        } else {
            doc.text("Detalle de productos surtidos", 14, 34);
        }

        // ── Construir mapa de cantidades originales por código ──
        // { codigo: { "CD": 60, "VQ": 60 } }
        const mapaOriginal = {};
        const tiposOriginales = [];
        for (const orden of ordenesOriginales) {
            const tipoOrden = orden.tipo;
            if (!tiposOriginales.includes(tipoOrden)) tiposOriginales.push(tipoOrden);
            for (const prod of orden.productos) {
                const cod = String(prod.codigo_pedido);
                if (!mapaOriginal[cod]) mapaOriginal[cod] = {};
                mapaOriginal[cod][tipoOrden] = prod.cantidad;
            }
        }

        const productosOrdenados = [...productos].sort((a, b) => {
            // Prioridad 1: tienen motivo (cant_no_enviada > 0 o motivo no vacío)
            const tieneMotA = a.motivo && a.motivo.trim() !== "" ? 0 : 1;
            const tieneMotB = b.motivo && b.motivo.trim() !== "" ? 0 : 1;

            // Prioridad 2: están unidos (unido === 1)
            const esUnidoA = Number(a.unido) === 1 ? 0 : 1;
            const esUnidoB = Number(b.unido) === 1 ? 0 : 1;

            // Primero motivo, luego unidos
            if (tieneMotA !== tieneMotB) return tieneMotA - tieneMotB;
            return esUnidoA - esUnidoB;
        });

        // ── Columnas ──
        const head = esFusion
            ? [["Código", "Cantidad", "Cant. Surtida", "Cant. No Enviada", "Motivo", "Unificado", "Cant. por orden"]]
            : [["Código", "Cantidad", "Cant. Surtida", "Cant. No Enviada", "Motivo", "Unificado"]];

        const body = productosOrdenados.map((p) => {
            const cod = String(p.codigo_pedido);
            // Construye "CD:60 | VQ:60"
            const cantPorOrden = esFusion
                ? tiposOriginales.map(t => {
                    const cant = mapaOriginal[cod]?.[t];
                    return cant !== undefined ? `${t}:${cant}` : `${t}:0`;
                }).join(' | ')
                : null;

            const fila = [
                p.codigo_pedido,
                p.cantidad,
                p.cant_surtida,
                p.cant_no_enviada,
                p.motivo || "",
                Number(p.unido) === 1 ? "Sí" : "",
            ];

            if (esFusion) fila.push(cantPorOrden);
            return fila;
        });

        const tableConfig = {
            startY: esFusion ? 44 : 38,
            head,
            body,
            theme: "grid",
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [17, 100, 163], textColor: [255, 255, 255] },
            didParseCell: (data) => {
                const row = productosOrdenados[data.row.index];
                if (Number(row?.cant_no_enviada || 0) > 0) {
                    data.cell.styles.fillColor = [255, 220, 220];
                    data.cell.styles.textColor = [180, 0, 0];
                }
            },
        };

        if (typeof doc.autoTable === "function") doc.autoTable(tableConfig);
        else autoTable(doc, tableConfig);
    };

    

    // ── Vista previa PDF — funciona en los 3 tabs ─────────────────────────────
    const verPreviaPDF = async (noOrden, tipo) => {
        try {
            const { data } = await axios.get(
                `http://66.232.105.107:3001/api/surtido/productos-fusion/${noOrden}/${tipo}`
            );
            if (!data.productos || data.productos.length === 0) {
                await Swal.fire({ title: "Sin datos", icon: "warning" });
                return;
            }

            const doc = new jsPDF();
            // ✅ Pasa ordenesOriginales a buildPDFSurtido
            buildPDFSurtido(doc, data.productos, noOrden, tipo, data.ordenesOriginales || []);
            doc.save(`Vista_Previa_${noOrden}_${tipo}.pdf`);

        } catch (err) {
            console.error(err);
            Swal.fire({ title: "❌ Error", text: "No se pudo generar la vista previa.", icon: "error" });
        }
    };
    // ── finalizarPedido ───────────────────────────────────────────────────────
    const finalizarPedido = async (noOrden, tipo) => {
        try {
            const { isConfirmed } = await Swal.fire({
                title: `¿Finalizar pedido ${noOrden}-${tipo}?`,
                text: "Se generará el PDF y luego se moverá el pedido a embarques.",
                icon: "question", showCancelButton: true,
                confirmButtonText: "Sí, finalizar", cancelButtonText: "Cancelar", confirmButtonColor: "#3085d6",
            });
            if (!isConfirmed) return;

            const { data } = await axios.get(`http://66.232.105.107:3001/api/surtido/productos-fusion/${noOrden}/${tipo}`);
            const productos = data.productos;
            if (!productos || productos.length === 0) {
                await Swal.fire({ title: "Sin datos", text: `No se encontraron productos para el pedido ${noOrden}-${tipo}.`, icon: "warning" });
                return;
            }

            const productosPasados = productos.filter(p => Number(p.cant_surtida) > Number(p.cantidad));
            if (productosPasados.length > 0) {
                const filas = productosPasados.map(p =>
                    `<tr>
                        <td style="padding:4px 8px;border:1px solid #ddd;text-align:left">${p.codigo_pedido}</td>
                        <td style="padding:4px 8px;border:1px solid #ddd;text-align:center">${p.cantidad}</td>
                        <td style="padding:4px 8px;border:1px solid #ddd;text-align:center;color:#e74c3c;font-weight:bold">${p.cant_surtida}</td>
                        <td style="padding:4px 8px;border:1px solid #ddd;text-align:center;color:#e74c3c;font-weight:bold">+${Number(p.cant_surtida) - Number(p.cantidad)}</td>
                    </tr>`
                ).join('');

                const { isConfirmed: continuar } = await Swal.fire({
                    title: "⚠️ Productos con exceso de surtido",
                    html: `<p style="margin-bottom:10px;color:#555;font-size:13px">${productosPasados.length} producto(s) tienen más piezas surtidas que las pedidas:</p>
                    <div style="max-height:220px;overflow-y:auto;border:1px solid #eee;border-radius:6px">
                        <table style="width:100%;border-collapse:collapse;font-size:12px">
                            <thead><tr style="background:#f8d7da;position:sticky;top:0">
                                <th style="padding:6px 8px;border:1px solid #ddd;text-align:left">Código</th>
                                <th style="padding:6px 8px;border:1px solid #ddd">Pedido</th>
                                <th style="padding:6px 8px;border:1px solid #ddd">Surtido</th>
                                <th style="padding:6px 8px;border:1px solid #ddd">Exceso</th>
                            </tr></thead>
                            <tbody>${filas}</tbody>
                        </table>
                    </div>`,
                    icon: "warning", showCancelButton: true,
                    confirmButtonText: "Continuar de todas formas", cancelButtonText: "Cancelar y corregir",
                    confirmButtonColor: "#e67e22", cancelButtonColor: "#3085d6", width: 520,
                });
                if (!continuar) return;
            }

            const doc = new jsPDF();
            buildPDFSurtido(doc, productos, noOrden, tipo, data.ordenesOriginales || []);
            const nombrePDF = `Surtido_${noOrden}_${tipo}.pdf`;
            doc.save(nombrePDF);

            await Swal.fire({ title: "📄 PDF generado", text: `Se generó el archivo ${nombrePDF} correctamente.`, icon: "success", confirmButtonText: "Continuar" });

            const res = await axios.post(`http://66.232.105.107:3001/api/surtido/finalizar/${noOrden}/${tipo}`);
            setPedidos(prev => prev.filter(p => !(p.no_orden === noOrden && p.tipo === tipo)));
            setEmbarques(prev => prev.filter(p => !(p.no_orden === noOrden && p.tipo === tipo)));
            Swal.fire({ title: "Liberado", text: res.data.message || "Pedido Liberado", icon: "success", confirmButtonColor: "#0ee231ff" });

        } catch (err) {
            console.error(err);
            Swal.fire({ title: "❌ Error del servidor", text: "Ocurrió un problema al generar el PDF o finalizar el pedido.", icon: "error", confirmButtonColor: "#e74c3c", confirmButtonText: "Cerrar" });
        }
    };

    const puedeLiberarPedido = (pedido) => {
        const totalV = (pedido.productos || []).reduce(
            (s, p) => s + Number(p?.v_pz || 0) + Number(p?.v_pq || 0) + Number(p?.v_inner || 0) + Number(p?.v_master || 0), 0
        );
        return totalV === 0;
    };

    const asignarUsuarioPaqueteria = async (no_orden, id_usuario) => {
        try {
            const res = await axios.put(`http://66.232.105.107:3001/api/surtido/asignar-usuario-paqueteria`, {
                no_orden, id_usuario_paqueteria: id_usuario,
            });
            if (res.data?.ok) {
                await Swal.fire({ title: "✅ Usuario asignado correctamente", text: `El pedido ${no_orden} fue asignado exitosamente.`, icon: "success", confirmButtonColor: "#3085d6", confirmButtonText: "Aceptar", timer: 2000, showConfirmButton: false });
            } else {
                await Swal.fire({ title: "⚠️ Error al asignar", text: res.data?.error || res.data?.mensaje || "No se pudo asignar el usuario.", icon: "warning", confirmButtonColor: "#f39c12", confirmButtonText: "Entendido" });
            }
        } catch (err) {
            if (err.response?.status === 409) {
                Swal.fire({ title: "⚠️ Pedido ya asignado", text: "Este pedido ya fue asignado a otra persona.", icon: "warning", confirmButtonColor: "#f39c12", confirmButtonText: "Aceptar" });
            } else {
                Swal.fire({ title: "❌ Error inesperado", text: "Ocurrió un error al intentar asignar el usuario.", icon: "error", confirmButtonColor: "#e74c3c", confirmButtonText: "Cerrar" });
            }
        } finally { await cargarPedidosEmbarques(); }
    };

    const liberarUsuarioPaqueteria = async (no_orden) => {
        const confirm = await Swal.fire({
            title: "¿Liberar pedido?", text: `¿Deseas liberar el pedido ${no_orden} para reasignarlo a otro usuario?`,
            icon: "question", showCancelButton: true, confirmButtonColor: "#3085d6", cancelButtonColor: "#d33",
            confirmButtonText: "Sí, liberar", cancelButtonText: "Cancelar"
        });
        if (!confirm.isConfirmed) return;
        try {
            const res = await axios.put(`http://66.232.105.107:3001/api/surtido/liberar-usuario-paqueteria`, { no_orden });
            if (res.data?.ok) {
                await Swal.fire({ title: "✅ Pedido liberado", text: res.data?.message || "El pedido se Liberó exitosamente", icon: "success", confirmButtonColor: "#159909", confirmButtonText: "Entendido" });
            }
        } catch (err) {
            if (err.response?.status === 409) {
                await Swal.fire({ title: "⚠️ No se puede liberar", text: "Existen registros en las Validaciones. El pedido no puede ser liberado.", icon: "warning", confirmButtonColor: "#f39c12", confirmButtonText: "Aceptar" });
            } else {
                await Swal.fire({ title: "❌ Error al liberar", text: "Ocurrió un error inesperado al liberar el pedido.", icon: "error", confirmButtonColor: "#e74c3c", confirmButtonText: "Cerrar" });
            }
        } finally { await cargarPedidosEmbarques(); }
    };

    const finalizarDesdeEmbarque = async (noOrden, tipo) => {
        try {
            const { isConfirmed } = await Swal.fire({
                title: `¿Finalizar pedido ${noOrden}-${tipo}?`, text: "Se generará el Packing List y se moverá a finalizados.",
                icon: "question", showCancelButton: true, confirmButtonText: "Sí, finalizar", cancelButtonText: "Cancelar", confirmButtonColor: "#3085d6",
            });
            if (!isConfirmed) return;
            await generarPDFPackingList(noOrden, tipo);
            const res = await axios.post(`http://66.232.105.107:3001/api/surtido/finalizar/${noOrden}/${tipo}`);
            setEmbarques(prev => prev.filter(p => !(String(p.no_orden) === String(noOrden) && p.tipo === tipo)));
            Swal.fire({ title: "✅ Pedido Finalizado", text: res.data.message || "Pedido movido a finalizados", icon: "success", confirmButtonColor: "#0ee231ff" });
        } catch (err) {
            console.error(err);
            Swal.fire({ title: "❌ Error", text: "Ocurrió un problema al finalizar el pedido.", icon: "error", confirmButtonColor: "#e74c3c" });
        }
    };

    /* ---------- Finalizados ---------- */
    const [pedidosFinalizados, setPedidosFinalizados] = useState([]);
    const [modalDetalle, setModalDetalle] = useState({ open: false, pedido: null });
    const [qFin, setQFin] = useState('');

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
    const pedidosFinPagina = finalizadosFiltrados.slice((pageFin - 1) * PAGE_SIZE_FIN, pageFin * PAGE_SIZE_FIN);

    const [busqueda, setBusqueda] = useState('');
    const embarquesFiltrados = embarques.filter(p => {
        const texto = busqueda.trim().toLowerCase();
        if (!texto) return true;
        return String(p.no_orden).toLowerCase().includes(texto);
    });

    /* ---------- Packing List ---------- */
    const generarPDFPackingList = async (noOrden, tipo) => {
        try {
            Swal.fire({ title: "Generando Packing List...", text: "Por favor espera", didOpen: () => Swal.showLoading(), allowOutsideClick: false });

            const resSanced = await axios.get(`http://66.232.105.107:3001/api/surtido/sanced/${noOrden}`);
            const cliente = resSanced.data.data || {};
            const res = await axios.get(`http://66.232.105.107:3001/api/surtido/detalle/${noOrden}/${tipo}`);
            const cajas = res.data.data || res.data;
            if (!Array.isArray(cajas)) { Swal.fire("❌ Error", "Formato inválido de servidor", "error"); return; }

            const doc = new jsPDF();

            doc.autoTableSetDefaults({
                didDrawPage: (data) => {
                    const pageWidth = doc.internal.pageSize.getWidth();
                    const pageHeight = doc.internal.pageSize.getHeight();
                    const footerHeight = 6;
                    const footerY = pageHeight - footerHeight - 5;
                    doc.addImage(footerBar, "JPEG", 10, footerY, pageWidth - 20, footerHeight);
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

            doc.setFillColor(240, 36, 44);
            doc.rect(10, 10, 190, 8, "F");
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10.5);
            doc.text("FORMATO PARA RECEPCIÓN DEL PEDIDO", 105, 15.5, { align: "center" });

            doc.addImage(logoPacking, "JPEG", 150, 21, 45, 18);

            doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(84, 84, 84);
            doc.text("Santul Herramientas S.A. de C.V.", marginLeft, y); y += 4;
            doc.setFontSize(12); doc.setFont("helvetica", "normal");
            doc.text("Henry Ford 257 C y D, Col. Bondojito, Gustavo A. Madero,", marginLeft, y); y += 4;
            doc.text("Ciudad de México, C.P. 07850, México,", marginLeft, y); y += 4;
            doc.text("Tel.: 58727290", marginLeft, y); y += 4;
            doc.text("R.F.C. SHE130912866", marginLeft, y); y += 5;

            doc.setDrawColor(240, 36, 44); doc.setLineWidth(0.5); doc.line(10, y, 200, y); y += 4;

            doc.setFont("helvetica", "bold"); doc.setFontSize(9.5); doc.setTextColor(0, 0, 0);
            doc.text(`CLIENTE NO.: ${cliente.num_consigna || 'S/D'}`, marginLeft, y);
            doc.text(`NOMBRE DEL CLIENTE: ${cliente.nombre_cliente || 'S/D'}`, 60, y); y += 4;
            doc.text(`TELÉFONO: ${cliente.telefono || 'S/D'}`, marginLeft, y); y += 4;
            doc.text(`DIRECCIÓN: ${cliente.direccion || 'S/D'}`, marginLeft, y); y += 4;
            doc.text(`No Orden: ${noOrden}-${tipo}`, marginLeft, y); y += 4;
            doc.text(`FACTURA No.: ${cliente.no_factura || '---'}`, marginLeft, y); y += 4;

            const bloqueAltura = 18;
            const infoY = y + 1;
            doc.setFillColor(255, 255, 0);
            doc.rect(10, infoY, 190, bloqueAltura, "F");
            doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(0, 0, 0);
            doc.text("INFORMACIÓN IMPORTANTE", 105, infoY + 6, { align: "center" });
            doc.setFont("helvetica", "bold"); doc.setFontSize(7);
            doc.text("En caso de detectar cualquier irregularidad (daños, faltantes, cajas mojadas o manipulaciones), Favor de comunicarse de inmediato al departamento de atención al cliente al número: (55) 58727290 EXT.: (8815, 8819) en un Horario de Lunes a Viernes de 8:30 am a 5:00 pm", 105, infoY + 13, { align: "center", maxWidth: 185 });
            y = infoY + bloqueAltura + 3;

            let innerMaster = 0, tarimas = 0, atados = 0, cajasArmadas = 0;
            cajas.forEach(caja => {
                const tipoCaja = (caja.tipo_caja || "").toUpperCase().trim();
                const numeros = String(caja.cajas || "").split(",").map(x => x.trim()).filter(x => x !== "");
                if (tipoCaja === "INNER" || tipoCaja === "MASTER") innerMaster += numeros.length;
                if (tipoCaja === "TARIMA") tarimas += numeros.length;
                if (tipoCaja === "ATA" || tipoCaja === "ATADO") atados += numeros.length;
                if (tipoCaja === "CAJA") cajasArmadas += numeros.length;
            });
            const totalCajas = innerMaster + tarimas + atados + cajasArmadas;

            doc.autoTable({
                startY: y,
                head: [["INNER/MASTER", "TARIMAS", "ATADOS", "CAJAS ARMADAS", "TOTAL CAJAS"]],
                body: [[innerMaster, tarimas, atados, cajasArmadas, totalCajas]],
                theme: "grid", margin: { left: 10 }, tableWidth: 190,
                styles: { fontSize: 9, halign: "center", cellPadding: 3 },
                headStyles: { fillColor: [210, 210, 210], textColor: [0, 0, 0], fontStyle: "bold" }
            });
            y = doc.lastAutoTable.finalY + 6;

            cajas.forEach((caja) => {
                doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(0, 0, 0);
                const tipoMostrar = (caja.tipo_caja || "").toUpperCase();
                doc.text(`Productos en ${tipoMostrar} ${caja.cajas}`, 105, y, { align: "center" });
                y += 6;

                doc.autoTable({
                    startY: y,
                    headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontSize: 7, fontStyle: "bold" },
                    head: [["SKU", "DESCRIPCIÓN", "CANTIDAD", "UM", "PZ", "PQ", "INNER", "MASTER", "TARIMA", "ATADOS", "VALIDA"]],
                    body: caja.productos.filter(p => p.cant_surtida > 0).map(p => [
                        p.codigo_producto, p.descripcion_producto, p.cant_surtida, p.um,
                        p._pz || 0, p._pq || 0, p._inner || 0, p._master || 0,
                        tipoMostrar === "TARIMA" ? 1 : 0, tipoMostrar === "ATADO" ? 1 : 0, ""
                    ]),
                    theme: "grid", margin: { left: 10 }, tableWidth: 190,
                    styles: { fontSize: 7, halign: "center", cellPadding: 1.3 },
                    columnStyles: { 1: { cellWidth: 60 } }
                });
                y = doc.lastAutoTable.finalY + 6;
                if (y > 260) { doc.addPage(); drawFooterSantul(doc); y = 20; }
            });

            let currentY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 5 : y + 5;
            const tableWidth = 90;
            const pageWidth = doc.internal.pageSize.getWidth();
            const leftMargin = (pageWidth - tableWidth) / 2;

            doc.autoTable({
                startY: currentY,
                head: [
                    [{ content: "DETALLES DEL PEDIDO", colSpan: 2, styles: { halign: "center", fillColor: [230, 230, 230], fontSize: 7 } }, { content: noOrden, styles: { halign: "center", fillColor: [200, 200, 200], fontSize: 9 } }],
                    [{ content: "IMPORTE DEL PEDIDO\n(SIN IVA)", styles: { halign: "center", fontSize: 5 } }, { content: "TOTAL A PAGAR\n(con IVA)", styles: { halign: "center", fontSize: 5 } }, { content: "PORCENTAJE DE ENTREGA", styles: { halign: "center", fontSize: 5 } }],
                ],
                body: [[`$${formatMoney(cliente.total)}`, `$${formatMoney(cliente.total_con_iva)}`, "100.00 %"]],
                theme: "grid", styles: { fontSize: 8, halign: "center" }, margin: { left: leftMargin }, tableWidth,
                headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: "bold", fontSize: 4.5 },
            });

            currentY = doc.lastAutoTable.finalY + 5;
            currentY = verificarEspacio(doc, currentY, 1);

            doc.autoTable({
                startY: currentY,
                body: [[
                    { content: "Se confirma que las cajas, atados y/o tarimas listadas en esta lista de empaque fueron recibidas cerradas y en buen estado, y así serán entregadas al cliente. Cualquier anomalía se atenderá según lo establecido en el contrato.", styles: { fontSize: 7, halign: "justify", textColor: [0, 0, 0], cellPadding: 3 } },
                    { content: "Firma del Transportista", styles: { fontSize: 7, halign: "center", fontStyle: "bold", valign: "bottom", cellPadding: 3 } },
                ]],
                theme: "grid", styles: { lineColor: [180, 180, 180], lineWidth: 0.25 },
                columnStyles: { 0: { cellWidth: 150 }, 1: { cellWidth: 40 } },
                margin: { left: 10 }, tableWidth: 190,
            });
            currentY = doc.lastAutoTable.finalY;

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
                body: [[{ content: instruccionesTexto, styles: { fontSize: 7, halign: "justify", textColor: [0, 0, 0], cellPadding: 4, valign: "top" } }]],
                theme: "grid", styles: { lineColor: [180, 180, 180], lineWidth: 0.25 },
                columnStyles: { 0: { cellWidth: 190 } }, margin: { left: 10 }, tableWidth: 190,
            });
            currentY = doc.lastAutoTable.finalY;

            const fechaActual = new Date();
            const fechaHoy = fechaActual.toLocaleDateString("es-MX");
            const fechaVence = new Date(fechaActual.setMonth(fechaActual.getMonth() + 1)).toLocaleDateString("es-MX");
            const textoPagare = `En cualquier lugar de este documento donde se estampe la firma por este pagaré debo(emos) y pagaré(mos) incondicionalmente a la vista y a la orden de SANTUL HERRAMIENTAS S.A. DE C.V., la cantidad de: $( M.N.) En el total a pagar en Cuautitlán, Estado de México, o en la que SANTUL HERRAMIENTAS S.A. DE C.V., juzgue necesario. Este documento causará intereses al 3% mensual si no se paga a su vencimiento. Expide el ${fechaHoy}, vence el ${fechaVence}.`;

            doc.autoTable({
                startY: currentY,
                body: [[
                    { content: textoPagare, styles: { fontSize: 7, halign: "justify", textColor: [0, 0, 0], cellPadding: 3, fillColor: [245, 245, 245] } },
                    { content: "Firma del Cliente", styles: { fontSize: 7, halign: "center", fontStyle: "bold", valign: "bottom", cellPadding: 3 } },
                ]],
                theme: "grid", styles: { lineColor: [180, 180, 180], lineWidth: 0.25 },
                columnStyles: { 0: { cellWidth: 150 }, 1: { cellWidth: 40 } },
                margin: { left: 10 }, tableWidth: 190,
            });

            let bloqueY = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 10 : y + 10;
            const pageHeight = doc.internal.pageSize.height;
            const footerHeight = 22;
            if (bloqueY + 40 > pageHeight - footerHeight) { doc.addPage(); drawFooterSantul(doc); bloqueY = 25; }

            doc.setFont("helvetica", "bold"); doc.setFontSize(10);
            doc.text("Referencias bancarias:", 15, bloqueY);
            doc.setFontSize(9); doc.setFont("helvetica", "bold");
            const headerY = bloqueY + 8;
            doc.text("BANCO", 15, headerY); doc.text("NO. DE CUENTA", 40, headerY);
            doc.text("SUCURSAL", 75, headerY); doc.text("CLABE", 100, headerY);
            doc.setFont("helvetica", "normal");
            const dataY = headerY + 6;
            doc.text("BANAMEX", 15, dataY); doc.text("6860432", 40, dataY); doc.text("7006", 75, dataY); doc.text("002180700668604325", 100, dataY);
            doc.text("BANORTE", 15, dataY + 6); doc.text("0890771176", 40, dataY + 6); doc.text("04", 75, dataY + 6); doc.text("072180008907711766", 100, dataY + 6);
            doc.text("BANCOMER", 15, dataY + 12); doc.text("CIE 2476827", 40, dataY + 12); doc.text("1838", 75, dataY + 12);

            const obsX = 135, obsY = bloqueY + 3, obsWidth = 65, obsHeight = 38;
            doc.setDrawColor(0); doc.rect(obsX, obsY, obsWidth, obsHeight);
            doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.text("Observaciones:", obsX + 4, obsY + 7);
            doc.setFont("helvetica", "normal"); doc.setFontSize(8);
            let obsLineY = obsY + 12;
            ["...........................................................................", "OC: ....................................................................", "...........................................................................", "..........................................................................."].forEach(linea => { doc.text(linea, obsX + 4, obsLineY); obsLineY += 7; });

            doc.setFont("helvetica", "normal"); doc.setFontSize(8);
            doc.text("A la firma/sello del presente documento se tiene por recibida de conformidad la mercancía y aceptado el monto a pagar aquí descrita.", 105, obsY + obsHeight + 10, { align: "center", maxWidth: 185 });

            const totalPages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(0, 0, 0);
                const pw = doc.internal.pageSize.getWidth();
                const ph = doc.internal.pageSize.getHeight();
                drawFooterSantul(doc);
                doc.text(`Página ${i} de ${totalPages}`, pw - 35, ph - 8);
            }

            drawFooterSantul(doc);
            doc.save(`Packing List ${noOrden}-${tipo}.pdf`);
            Swal.close();
            Swal.fire("✅ Packing List generado", "El archivo fue creado con éxito", "success");

        } catch (err) {
            Swal.close();
            Swal.fire("❌ Error", "No se pudo generar el PDF", "error");
            console.error(err);
        }
    };

    function verificarEspacio(doc, currentY, lineasEstimadas = 3) {
        const maxY = 270;
        const espacio = lineasEstimadas * 5;
        if (currentY + espacio > maxY) { doc.addPage(); return 20; }
        return currentY;
    }

    function drawFooterSantul(doc) {
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();
        const footerHeight = 6;
        const footerY = pageHeight - footerHeight - 5;
        doc.addImage(footerBar, "JPEG", 10, footerY, pageWidth - 20, footerHeight);
    }

    const [modalUbicacion, setModalUbicacion] = useState({ open: false, pedido: null, cliente: null });
    const [miUbicacion, setMiUbicacion] = useState(null);
    const [loadingModal, setLoadingModal] = useState(false);

    const abrirModalUbicacion = async (noOrden, tipo) => {
        setLoadingModal(true);
        setModalUbicacion({ open: true, pedido: { noOrden, tipo }, cliente: null });
        try {
            const res = await axios.get(`http://66.232.105.107:3001/api/surtido/sanced/${noOrden}`);
            const cliente = res.data.data || {};
            navigator.geolocation.getCurrentPosition(
                (pos) => setMiUbicacion({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => setMiUbicacion(null)
            );
            setModalUbicacion({ open: true, pedido: { noOrden, tipo }, cliente });
        } catch { setModalUbicacion({ open: true, pedido: { noOrden, tipo }, cliente: {} }); }
        finally { setLoadingModal(false); }
    };

    const formatMoney = (value) => {
        const num = parseFloat(value || 0);
        return num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <div className="place_holder-container fade-in" style={{ height: '95vh', overflowY: 'auto' }}>
            <Box sx={{ width: '100%' }}>

                <div className="place_holder-header" style={{ background: '#e74c3c', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 2500 }}>
                    <span className="place_holder-title">Progreso de Pedidos</span>
                    <button style={{ background: 'transparent', border: 'none', cursor: 'pointer' }} onClick={() => (window.location.href = '/menu')}>
                        <FaTimes color="#fff" size={18} />
                    </button>
                </div>

                <Tabs value={tabActual} onChange={handleChange} variant="fullWidth" textColor="primary" indicatorColor="primary" sx={{ borderBottom: 1, borderColor: 'divider', backgroundColor: '#f9f9f9' }}>
                    <Tab label="Surtido" />
                    <Tab label="Embarques" />
                    <Tab label="Finalizados" />
                </Tabs>

                <Box sx={{ p: 2 }}>

                    {/* ==================== TAB SURTIDO ==================== */}
                    {tabActual === 0 && (
                        <div>
                            <Box p={3} sx={{ height: 'calc(100vh - 180px)', overflowY: 'auto', background: "#faf9f9" }}>
                                {pedidos.length === 0 ? (
                                    <Typography color="textSecondary" align="center" mt={4}>No hay pedidos en surtido.</Typography>
                                ) : pedidos.map(pedido => {
                                    const progreso = calcularProgreso(pedido.productos);
                                    const rowKey = pedido.key || (pedido.no_orden + pedido.tipo);
                                    const esFusionado = !!pedido.ordenes_unidas;

                                    return (
                                        <Card key={rowKey} sx={{ mb: 4, border: esFusionado ? '2px solid #7b1fa2' : undefined }}>
                                            <CardContent>
                                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                                    <Box>
                                                        <Typography variant="h6" fontWeight={600}>{pedido.tipo} : {pedido.no_orden} : {pedido.bahia}</Typography>
                                                        <Typography fontWeight={600}>Surtido por: <b>{pedido.nombre_usuario || "?"}</b></Typography>
                                                        {esFusionado && (
                                                            <Typography variant="body2" sx={{ color: '#7b1fa2', fontWeight: 600, mt: 0.5 }}>
                                                                🔗 Órdenes fusionadas: {pedido.ordenes_unidas}
                                                            </Typography>
                                                        )}
                                                    </Box>

                                                    <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
                                                        <Button size="small" variant="outlined"
                                                            onClick={() => setExpanded(prev => ({ ...prev, [rowKey]: !prev[rowKey] }))}>
                                                            {expanded[rowKey] ? "Ocultar" : "Ver productos"}
                                                        </Button>

                                                        {/* ✅ Vista previa PDF — fuente surtido */}
                                                        <Button size="small" variant="outlined" color="secondary"
                                                            onClick={() => verPreviaPDF(pedido.no_orden, pedido.tipo)}>
                                                            📄 Vista previa PDF
                                                        </Button>

                                                        {progreso === 100 && (
                                                            <Button size="small" variant="contained" color="success"
                                                                onClick={() => finalizarPedido(pedido.no_orden, pedido.tipo)}>
                                                                Autorización
                                                            </Button>
                                                        )}
                                                    </Box>
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
                                                                <TableCell>Motivo</TableCell>
                                                                <TableCell>Unificado</TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {(pedido.productos || []).map((prod, idx) => (
                                                                <TableRow key={prod.codigo_pedido + idx}>
                                                                    <TableCell>{prod.codigo_pedido}</TableCell>
                                                                    <TableCell>{prod.cantidad}</TableCell>
                                                                    <TableCell>{prod.cant_surtida}</TableCell>
                                                                    <TableCell>{prod.cant_no_enviada}</TableCell>
                                                                    <TableCell>{prod.motivo}</TableCell>
                                                                    <TableCell>
                                                                        {Number(prod.unido) === 1
                                                                            ? <span style={{ color: '#7b1fa2', fontWeight: 700 }}>Sí</span>
                                                                            : ''}
                                                                    </TableCell>
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

                    {/* ==================== TAB EMBARQUES ==================== */}
                    {tabActual === 1 && (
                        <Box sx={{ height: 'calc(100vh - 150px)', overflowY: 'auto', paddingRight: 1 }}>
                            <Box display="flex" alignItems="center" gap={2} mb={2} sx={{ backgroundColor: '#f5f5f5', p: 2, borderRadius: 2 }}>
                                <TextField
                                    label="Buscar por No. Orden" variant="outlined" size="small"
                                    value={busqueda || ""} onChange={(e) => setBusqueda(e.target.value)} placeholder="Ej. 17839"
                                    InputProps={{
                                        startAdornment: (<InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>),
                                        endAdornment: busqueda && (<InputAdornment position="end"><IconButton onClick={() => setBusqueda("")}><ClearIcon /></IconButton></InputAdornment>),
                                    }}
                                    sx={{ width: 300 }}
                                />
                                <Typography variant="body2" color="textSecondary">Resultados: {embarquesFiltrados.length}</Typography>
                            </Box>

                            {embarquesFiltrados.length === 0 ? (
                                <Typography color="textSecondary" align="center" mt={4}>No hay pedidos en embarques.</Typography>
                            ) : (
                                embarquesFiltrados.map(pedido => {
                                    const rowKey = pedido.key || (pedido.no_orden + pedido.tipo);
                                    const total = pedido.productos.reduce((sum, p) => sum + Number(p._pz || 0) + Number(p._pq || 0) + Number(p._inner || 0) + Number(p._master || 0), 0);
                                    const surtido = pedido.productos.reduce((sum, p) => sum + Number(p.v_pz || 0) + Number(p.v_pq || 0) + Number(p.v_inner || 0) + Number(p.v_master || 0), 0);
                                    const progreso = total > 0 ? Math.round((surtido / total) * 100) : 0;
                                    const yaAsignado = !!getAssignedUserIdFromPedido(pedido) || !!getAssignedUserNameFromPedido(pedido, usuariosPaqueteria);
                                    const nombreAsignado = getAssignedUserNameFromPedido(pedido, usuariosPaqueteria) || '?';
                                    const liberarHabilitado = puedeLiberarPedido(pedido);

                                    return (
                                        <Card key={rowKey} sx={{ mb: 4 }}>
                                            <CardContent>
                                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                                    <Box>
                                                        <Typography variant="h6" fontWeight={600}>{pedido.tipo} : {pedido.no_orden} : {pedido.bahia}</Typography>
                                                        <Typography fontWeight={600}>Surtido por: <b>{pedido.nombre_usuario || '?'}</b></Typography>
                                                    </Box>
                                                    <Box display="flex" flexDirection="column" gap={1} alignItems="flex-end">
                                                        <Box display="flex" gap={1}>
                                                            <Button size="small" variant="outlined"
                                                                onClick={() => setExpanded(prev => ({ ...prev, [rowKey]: !prev[rowKey] }))}>
                                                                {expanded[rowKey] ? 'Ocultar' : 'Ver productos'}
                                                            </Button>
                                                            <Button size="small" variant="outlined" color="secondary"
                                                                onClick={() => verPreviaPDF(pedido.no_orden, pedido.tipo)}>
                                                                📄 Vista previa PDF
                                                            </Button>

                                                            {/* ✅ NUEVO — botón fusionar */}
                                                            <Button size="small" variant="outlined"
                                                                sx={{ color: '#7b1fa2', borderColor: '#7b1fa2' }}
                                                                onClick={() => fusionarVqEnEmbarque(pedido)}>
                                                                🔗 Fusionar orden
                                                            </Button>
                                                        </Box>

                                                        {!yaAsignado ? (
                                                            <Box>
                                                                <Typography variant="body2">Asignar usuario:</Typography>
                                                                <Box display="flex" gap={1} alignItems="center">
                                                                    <select id={`select-${rowKey}`} defaultValue="">
                                                                        <option value="">-- Selecciona --</option>
                                                                        {usuariosPaqueteria.map((u, i) => {
                                                                            const id = getUserId(u);
                                                                            const nombre = getUserName(u) || `Usuario ${i + 1}`;
                                                                            return <option key={id || i} value={id}>{nombre}</option>;
                                                                        })}
                                                                    </select>
                                                                    <Button size="small" variant="contained" color="primary"
                                                                        onClick={() => {
                                                                            const select = document.getElementById(`select-${rowKey}`);
                                                                            const selectedId = Number(select?.value);
                                                                            if (!selectedId) { Swal.fire("⚠️ Selecciona un usuario", "", "warning"); return; }
                                                                            asignarUsuarioPaqueteria(pedido.no_orden, selectedId);
                                                                        }}>
                                                                        Asignar
                                                                    </Button>
                                                                </Box>
                                                            </Box>
                                                        ) : (
                                                            <Box display="flex" alignItems="center" gap={1}>
                                                                <Typography variant="body2">Usuario asignado: <b>{nombreAsignado}</b></Typography>
                                                                <Button size="small" color="warning" variant="outlined"
                                                                    onClick={() => liberarUsuarioPaqueteria(pedido.no_orden)}
                                                                    disabled={!liberarHabilitado}
                                                                    title={liberarHabilitado ? '' : 'No se puede liberar: hay validaciones en v_pz/v_pq/v_inner/v_master'}>
                                                                    Liberar pedido
                                                                </Button>
                                                            </Box>
                                                        )}

                                                        {progreso === 100 && (
                                                            <Button size="small" variant="contained" color="success"
                                                                onClick={() => finalizarDesdeEmbarque(pedido.no_orden, pedido.tipo)}>
                                                                Finalizar Pedido
                                                            </Button>
                                                        )}
                                                    </Box>
                                                </Box>

                                                <Box mt={1} mb={2}>
                                                    <Typography variant="body2" mb={0.5}>Progreso (Validación de Surtido)</Typography>
                                                    <Box display="flex" alignItems="center">
                                                        <LinearProgress variant="determinate" value={progreso}
                                                            sx={{ flex: 1, height: 8, borderRadius: 8, mr: 2, background: '#f1f1f1', '& .MuiLinearProgress-bar': { background: '#3498db' } }}
                                                        />
                                                        <Typography width={40} fontWeight={600} textAlign="right">{progreso}%</Typography>
                                                    </Box>
                                                </Box>

                                                {expanded[rowKey] && (
                                                    <Table size="small" sx={{ mt: 2 }}>
                                                        <TableHead>
                                                            <TableRow>
                                                                <TableCell>Código</TableCell><TableCell>Cantidad</TableCell>
                                                                <TableCell>Cantidad Surtida</TableCell><TableCell>Cantidad No Surtida</TableCell>
                                                                <TableCell>PZ</TableCell><TableCell>PQ</TableCell>
                                                                <TableCell>INNER</TableCell><TableCell>MASTER</TableCell>
                                                                <TableCell>V_PZ</TableCell><TableCell>V_PQ</TableCell>
                                                                <TableCell>V_INNER</TableCell><TableCell>V_MASTER</TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {pedido.productos.map((prod, idx) => (
                                                                <TableRow key={prod.codigo_pedido + idx}>
                                                                    <TableCell>{prod.codigo_pedido}</TableCell><TableCell>{prod.cantidad}</TableCell>
                                                                    <TableCell>{prod.cant_surtida}</TableCell><TableCell>{prod.cant_no_enviada}</TableCell>
                                                                    <TableCell>{prod._pz}</TableCell><TableCell>{prod._pq}</TableCell>
                                                                    <TableCell>{prod._inner}</TableCell><TableCell>{prod._master}</TableCell>
                                                                    <TableCell>{prod.v_pz}</TableCell><TableCell>{prod.v_pq}</TableCell>
                                                                    <TableCell>{prod.v_inner}</TableCell><TableCell>{prod.v_master}</TableCell>
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

                    {/* ==================== TAB FINALIZADOS ==================== */}
                    {tabActual === 2 && (() => {
                        const abrirDetalle = (pedido) => setModalDetalle({ open: true, pedido });
                        const cerrarDetalle = () => setModalDetalle({ open: false, pedido: null });
                        const fmt = (fecha) => fecha ? new Date(fecha).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'medium' }) : '—';
                        const ultimaFechaEmbarque = (prods) => {
                            const fechas = (prods ?? []).map(p => p?.fin_embarque ? new Date(p.fin_embarque) : null).filter(Boolean);
                            return fechas.length ? new Date(Math.max(...fechas)) : null;
                        };
                        const puedePackingList = (prods) => {
                            const p0 = prods?.[0];
                            const tieneFactura = p0?.no_factura && !['---', '', '0-'].includes(p0.no_factura);
                            const tieneTotal = Number(p0?.total || 0) > 0 || Number(p0?.total_con_iva || 0) > 0;
                            return tieneFactura && tieneTotal;
                        };

                        const card = { background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, marginBottom: 10, overflow: 'hidden' };
                        const badge = (tipo) => ({ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, flexShrink: 0, background: tipo === 'VW' ? '#EAF3DE' : tipo === 'VQ' ? '#E6F1FB' : '#EEEDFE', color: tipo === 'VW' ? '#27500A' : tipo === 'VQ' ? '#0C447C' : '#3C3489' });
                        const chip = { fontSize: 12, padding: '3px 10px', borderRadius: 20, background: '#f3f3f3', color: '#555', border: '1px solid #e0e0e0' };
                        const chipRed = { fontSize: 12, padding: '3px 10px', borderRadius: 20, background: '#FCEBEB', color: '#A32D2D', border: '1px solid #F7C1C1', fontWeight: 600 };
                        const chipGrn = { fontSize: 12, padding: '3px 10px', borderRadius: 20, background: '#EAF3DE', color: '#3B6D11', border: '1px solid #C0DD97' };
                        const btnGhost = { fontSize: 12, padding: '6px 14px', border: '1px solid #ddd', background: 'transparent', borderRadius: 8, cursor: 'pointer', color: '#333', display: 'flex', alignItems: 'center', gap: 6 };
                        const btnBlue = { fontSize: 12, padding: '6px 14px', border: 'none', background: '#185FA5', color: '#fff', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
                        const btnBlueOff = { ...btnBlue, opacity: 0.35, cursor: 'not-allowed' };
                        const btnTeal = { fontSize: 12, padding: '6px 14px', border: '1px solid #0F6E56', background: 'transparent', color: '#0F6E56', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
                        const th = { padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#888', fontSize: 11, borderBottom: '1px solid #f0f0f0', background: '#fafafa', whiteSpace: 'nowrap' };
                        const td = { padding: '7px 10px', color: '#333', borderBottom: '1px solid #f5f5f5', whiteSpace: 'nowrap' };
                        const tdAlert = { padding: '7px 10px', borderBottom: '1px solid #f5f5f5', whiteSpace: 'nowrap', background: '#FCEBEB', color: '#791F1F' };

                        return (
                            <Box p={2}>
                                <Box display="flex" alignItems="center" gap={2} mb={2} flexWrap="wrap">
                                    <TextField size="small" placeholder="Buscar por No. orden, tipo o código..." value={qFin}
                                        onChange={(e) => { setQFin(e.target.value); setPageFin(1); }} sx={{ minWidth: 280 }}
                                        InputProps={{
                                            startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: '#aaa' }} /></InputAdornment>),
                                            endAdornment: qFin ? (<InputAdornment position="end"><IconButton size="small" onClick={() => { setQFin(''); setPageFin(1); }}><ClearIcon fontSize="small" /></IconButton></InputAdornment>) : null,
                                        }}
                                    />
                                    <span style={{ fontSize: 12, color: '#888', background: '#f3f3f3', padding: '4px 12px', borderRadius: 20, border: '1px solid #e0e0e0' }}>{finalizadosFiltrados.length} pedidos</span>
                                    <Box ml="auto">
                                        <Pagination count={totalPagesFin} page={pageFin} onChange={(_, p) => setPageFin(p)} size="small" color="primary" showFirstButton showLastButton />
                                    </Box>
                                </Box>

                                {finalizadosFiltrados.length === 0 && (<Box textAlign="center" py={6} sx={{ color: '#aaa', fontSize: 14 }}>No hay pedidos finalizados.</Box>)}

                                {pedidosFinPagina.map((pedido, idxPedido) => {
                                    const rowKey = pedido?.key || `${pedido?.tipo || ''}-${pedido?.no_orden || ''}-${idxPedido}`;
                                    const prods = Array.isArray(pedido?.productos) ? pedido.productos : [];
                                    const total = prods.reduce((s, p) => s + Number(p?.cantidad || 0), 0);
                                    const surtida = prods.reduce((s, p) => s + Number(p?.cant_surtida || 0), 0);
                                    const noEnv = prods.reduce((s, p) => s + Number(p?.cant_no_enviada || 0), 0);
                                    const fecha = ultimaFechaEmbarque(prods);
                                    const packing = puedePackingList(prods);

                                    return (
                                        <div key={rowKey} style={card}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
                                                <span style={badge(pedido.tipo)}>{pedido.tipo}</span>
                                                <div>
                                                    <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a' }}>{pedido.no_orden}</div>
                                                    <div style={{ fontSize: 12, color: '#888', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                                        {fecha ? <>⏱ Fin embarque: {fecha.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'medium' })}</> : <span style={{ color: '#bbb' }}>Sin fecha de embarque</span>}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginLeft: 'auto', flexShrink: 0 }}>
                                                    <span style={chip}>Total <strong>{total}</strong></span>
                                                    <span style={chip}>Surtida <strong>{surtida}</strong></span>
                                                    {noEnv > 0 ? <span style={chipRed}>No env. <strong>{noEnv}</strong></span> : <span style={chipGrn}>Completo</span>}
                                                </div>
                                            </div>
                                            <div style={{ height: 1, background: '#f0f0f0', margin: '0 16px' }} />
                                            <div style={{ display: 'flex', gap: 8, padding: '10px 16px', flexWrap: 'wrap' }}>
                                                <button style={btnGhost} onClick={() => abrirDetalle(pedido)}>👁 Ver detalle</button>
                                                {/* ✅ Vista previa PDF — fuente finalizado */}
                                                <button style={btnGhost} onClick={() => verPreviaPDF(pedido.no_orden, pedido.tipo)}>
                                                    📄 Vista previa surtido
                                                </button>
                                                <button style={packing ? btnBlue : btnBlueOff} disabled={!packing} title={!packing ? 'Necesita factura y totales para generar el Packing List' : ''} onClick={() => packing && generarPDFPackingList(pedido.no_orden, pedido.tipo)}>📄 Packing list</button>
                                                <button style={btnTeal} onClick={() => abrirModalUbicacion(pedido.no_orden, pedido.tipo)}>📍 Ver ubicación</button>
                                            </div>
                                        </div>
                                    );
                                })}

                                {modalDetalle.open && modalDetalle.pedido && (() => {
                                    const p = modalDetalle.pedido;
                                    const prods = Array.isArray(p?.productos) ? p.productos : [];
                                    const total = prods.reduce((s, x) => s + Number(x?.cantidad || 0), 0);
                                    const surtida = prods.reduce((s, x) => s + Number(x?.cant_surtida || 0), 0);
                                    const noEnv = prods.reduce((s, x) => s + Number(x?.cant_no_enviada || 0), 0);
                                    const ef = total > 0 ? Math.round((surtida / total) * 100) : 0;
                                    const fecha = ultimaFechaEmbarque(prods);
                                    const packing = puedePackingList(prods);

                                    return (
                                        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px', overflowY: 'auto' }} onClick={(e) => e.target === e.currentTarget && cerrarDetalle()}>
                                            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e0e0e0', width: '100%', maxWidth: 900, overflow: 'hidden' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid #f0f0f0' }}>
                                                    <span style={badge(p.tipo)}>{p.tipo}</span>
                                                    <div>
                                                        <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a' }}>{p.no_orden}</div>
                                                        <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{fecha ? `Fin embarque: ${fecha.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'medium' })}` : 'Sin fecha de embarque registrada'}</div>
                                                    </div>
                                                    <button onClick={cerrarDetalle} style={{ marginLeft: 'auto', background: '#f3f3f3', border: '1px solid #e0e0e0', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: '#f0f0f0', borderBottom: '1px solid #f0f0f0' }}>
                                                    {[{ label: 'Total pedido', val: total, color: '#185FA5' }, { label: 'Surtida', val: surtida, color: '#1D9E75' }, { label: 'No enviada', val: noEnv, color: noEnv > 0 ? '#A32D2D' : '#1D9E75' }, { label: 'Efectividad', val: ef + '%', color: ef === 100 ? '#1D9E75' : ef >= 80 ? '#185FA5' : '#A32D2D' }].map(m => (
                                                        <div key={m.label} style={{ background: '#fff', padding: '12px 16px' }}>
                                                            <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{m.label}</div>
                                                            <div style={{ fontSize: 20, fontWeight: 600, color: m.color }}>{m.val}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div style={{ padding: '16px 20px' }}>
                                                    <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Productos del pedido</div>
                                                    <div style={{ overflowX: 'auto', border: '1px solid #f0f0f0', borderRadius: 8 }}>
                                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                                            <thead><tr>{['Código', 'Cant.', 'Surtida', 'No env.', 'Bahía', 'Surtidor', 'Paquetería', 'Ini. surtido', 'Fin surtido', 'Ini. embarque', 'Fin embarque'].map(h => (<th key={h} style={th}>{h}</th>))}</tr></thead>
                                                            <tbody>
                                                                {prods.map((prod, i) => {
                                                                    const alerta = Number(prod?.cant_no_enviada || 0) > 0;
                                                                    const c = alerta ? tdAlert : td;
                                                                    return (
                                                                        <tr key={`${prod?.codigo_pedido || i}_${i}`}>
                                                                            <td style={c}>{prod?.codigo_pedido}</td><td style={c}>{prod?.cantidad}</td>
                                                                            <td style={c}>{prod?.cant_surtida}</td><td style={{ ...c, fontWeight: alerta ? 700 : 400 }}>{prod?.cant_no_enviada}</td>
                                                                            <td style={c}>{prod?.ubi_bahia}</td><td style={c}>{prod?.nombre_usuario}</td>
                                                                            <td style={c}>{prod?.nombre_paqueteria}</td><td style={c}>{fmt(prod?.inicio_surtido)}</td>
                                                                            <td style={c}>{fmt(prod?.fin_surtido)}</td><td style={c}>{fmt(prod?.inicio_embarque)}</td>
                                                                            <td style={c}>{fmt(prod?.fin_embarque)}</td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                                <div style={{ padding: '12px 20px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                    <button style={btnGhost} onClick={cerrarDetalle}>✕ Cerrar</button>
                                                    {/* ✅ Vista previa surtido desde modal finalizado */}
                                                    <button style={btnGhost} onClick={() => verPreviaPDF(p.no_orden, p.tipo)}>
                                                        📄 Vista previa surtido
                                                    </button>
                                                    <button style={btnTeal} onClick={() => { cerrarDetalle(); abrirModalUbicacion(p.no_orden, p.tipo); }}>
                                                        📍 Ver ubicación
                                                    </button>
                                                    <button style={packing ? btnBlue : btnBlueOff} disabled={!packing}
                                                        title={!packing ? 'Necesita factura y totales' : ''}
                                                        onClick={() => packing && generarPDFPackingList(p.no_orden, p.tipo)}>
                                                        📄 Generar packing list
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </Box>
                        );
                    })()}

                </Box>
            </Box>

            {/* ========== MODAL UBICACIÓN ========== */}
            {modalUbicacion.open && (
                <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ background: "#fff", borderRadius: "12px", padding: "24px", width: "90%", maxWidth: "700px", maxHeight: "90vh", overflowY: "auto" }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h6" fontWeight="bold">📍 {modalUbicacion.pedido?.noOrden} - {modalUbicacion.pedido?.tipo}</Typography>
                            <IconButton onClick={() => setModalUbicacion({ open: false, pedido: null, cliente: null })}><ClearIcon /></IconButton>
                        </Box>
                        {loadingModal ? (
                            <Box textAlign="center" py={4}><Typography>Cargando datos...</Typography></Box>
                        ) : (
                            <>
                                <Paper variant="outlined" sx={{ p: 2, mb: 2, background: "#f9f9f9" }}>
                                    <Typography variant="subtitle1" fontWeight="bold" mb={1}>📋 Datos Generales</Typography>
                                    <Grid container spacing={1}>
                                        <Grid item xs={6}><Typography variant="body2"><b>Cliente:</b> {modalUbicacion.cliente?.nombre_cliente || "S/D"}</Typography></Grid>
                                        <Grid item xs={6}><Typography variant="body2"><b>No. Cliente:</b> {modalUbicacion.cliente?.num_consigna || "S/D"}</Typography></Grid>
                                        <Grid item xs={6}><Typography variant="body2"><b>Factura:</b> {modalUbicacion.cliente?.no_factura || "---"}</Typography></Grid>
                                        <Grid item xs={6}><Typography variant="body2"><b>Teléfono:</b> {modalUbicacion.cliente?.telefono || "S/D"}</Typography></Grid>
                                        <Grid item xs={12}><Typography variant="body2"><b>Dirección:</b> {modalUbicacion.cliente?.direccion || "S/D"}</Typography></Grid>
                                        <Grid item xs={6}><Typography variant="body2"><b>Total:</b> ${formatMoney(modalUbicacion.cliente?.total)}</Typography></Grid>
                                        <Grid item xs={6}><Typography variant="body2"><b>Total con IVA:</b> ${formatMoney(modalUbicacion.cliente?.total_con_iva)}</Typography></Grid>
                                    </Grid>
                                </Paper>
                                <Paper variant="outlined" sx={{ p: 1, mb: 2 }}>
                                    <Typography variant="subtitle1" fontWeight="bold" mb={1}>🗺️ Mapa</Typography>
                                    {modalUbicacion.cliente?.direccion ? (
                                        <iframe title="mapa-cliente" width="100%" height="300" style={{ border: 0, borderRadius: "8px" }} loading="lazy" src={`https://www.google.com/maps?q=${encodeURIComponent(modalUbicacion.cliente.direccion)}&output=embed`} />
                                    ) : (
                                        <Typography color="textSecondary" textAlign="center" py={2}>No hay dirección disponible.</Typography>
                                    )}
                                </Paper>
                                <Box display="flex" gap={1} flexWrap="wrap">
                                    {modalUbicacion.cliente?.direccion && (
                                        <Button variant="contained" color="primary" size="small"
                                            onClick={() => {
                                                const destino = encodeURIComponent(modalUbicacion.cliente.direccion);
                                                const origen = miUbicacion ? `${miUbicacion.lat},${miUbicacion.lng}` : "";
                                                const url = origen ? `https://www.google.com/maps/dir/${origen}/${destino}` : `https://www.google.com/maps/search/${destino}`;
                                                window.open(url, "_blank");
                                            }}>
                                            🚗 Cómo llegar
                                        </Button>
                                    )}
                                    {!miUbicacion && (<Typography variant="body2" color="textSecondary" alignSelf="center">⚠️ Activa tu ubicación para ver tiempo estimado</Typography>)}
                                </Box>
                            </>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
}

export default Surtiendo;