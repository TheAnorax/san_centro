import React, { useEffect, useState, useRef } from 'react';
import {
    Card, Typography, Box, Button,
    Table, TableBody, TableCell, TableHead, TableRow,
    LinearProgress, CircularProgress, Grid, Paper, Tabs, Tab, TextField, InputAdornment, IconButton,
    Select, MenuItem
} from '@mui/material';
import { FaTimes } from "react-icons/fa";
import { BsFileEarmarkPdf } from "react-icons/bs";
import axios from 'axios';
import { io } from 'socket.io-client';
import Pagination from '@mui/material/Pagination';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import DirectionsCarOutlinedIcon from '@mui/icons-material/DirectionsCarOutlined';
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

    // ✅ Guarda siempre el mes seleccionado en Finalizados, para que el listener
    // de tiempo real (más abajo) pueda respetarlo aunque solo se cree una vez al montar.
    const mesFinRef = useRef(null);

    /* ---------- Surtido ---------- */
    const [pedidos, setPedidos] = useState([]);
    const [expanded, setExpanded] = useState({});
    const [usuarioEmbarqueSel, setUsuarioEmbarqueSel] = useState({});
    const nombreBonito = (n) => (n || '').toString().trim().toLowerCase()
        .replace(/(^|\s)\S/g, (c) => c.toUpperCase());
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

    // 🔥 Conexión en tiempo real: cuando el servidor avisa que algo cambió
    // (escaneo desde la app móvil, o un movimiento hecho aquí en la web),
    // se vuelve a pedir la información sola, sin que el usuario recargue la página.
    useEffect(() => {
        const socket = io('http://66.232.105.107:3001');

        socket.on('pedidos-actualizados', () => {
            cargarPedidosSurtiendo();
            cargarPedidosEmbarques();
            cargarUsuariosPaqueteria();
            cargarPedidosPendientes();
            // ✅ Respeta el mes que el usuario tiene seleccionado en vez de
            // volver a traer TODOS los pedidos finalizados (eso reseteaba el filtro).
            cargarPedidosFinalizados(mesFinRef.current);
        });

        return () => {
            socket.disconnect();
        };
    }, []);

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
    // eslint-disable-next-line no-unused-vars
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

        // 🔢 Cuántas PARTIDAS (renglones/códigos) traía cada pedido original
        // antes de fusionarse — ej. "CD: 46 | VQ: 42" (no es suma de piezas,
        // es el conteo de códigos de cada orden original). Un código con
        // unido = 1 cuenta como DOS partidas de ese código (no una sola).
        let resumenTotalPorTipo = "";
        if (esFusion) {
            const conteoPartidasPorTipo = {};
            for (const orden of ordenesOriginales) {
                conteoPartidasPorTipo[orden.tipo] = (orden.productos || []).reduce(
                    (acc, p) => acc + 1 + (Number(p.unido) === 1 ? 1 : 0),
                    0
                );
            }
            resumenTotalPorTipo = tiposOriginales.map((t) => `${t}: ${conteoPartidasPorTipo[t] ?? 0}`).join(" | ");
        }

        if (esFusion) {
            doc.text(`Órdenes fusionadas: ${primerProd.ordenes_unidas}`, 14, 34);
            if (resumenTotalPorTipo) {
                doc.text(`Recuento por tipo (partidas): ${resumenTotalPorTipo}`, 14, 40);
                doc.text("Detalle de productos surtidos", 14, 46);
            } else {
                doc.text("Detalle de productos surtidos", 14, 40);
            }
        } else {
            doc.text("Detalle de productos surtidos", 14, 34);
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
            ? [["Código", "Cantidad", "Cant. Surtida", "Cant. No Enviada", "Motivo", "Unificado", "Fusión", "Cant. por orden"]]
            : [["Código", "Cantidad", "Cant. Surtida", "Cant. No Enviada", "Motivo", "Unificado", "Fusión"]];

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
                Number(p.fusion) === 1 ? "Sí" : "",
            ];

            if (esFusion) fila.push(cantPorOrden);
            return fila;
        });

        const tableConfig = {
            startY: esFusion ? (resumenTotalPorTipo ? 50 : 44) : 38,
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

            setModalSurtido(prev => ({ ...prev, loading: true, error: null }));

            const { data } = await axios.get(`http://66.232.105.107:3001/api/surtido/productos-fusion/${noOrden}/${tipo}`);
            const productos = data.productos;
            if (!productos || productos.length === 0) {
                setModalSurtido(prev => ({ ...prev, loading: false }));
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
                if (!continuar) {
                    setModalSurtido(prev => ({ ...prev, loading: false }));
                    return;
                }
            }

            const doc = new jsPDF();
            buildPDFSurtido(doc, productos, noOrden, tipo, data.ordenesOriginales || []);
            const nombrePDF = `Surtido_${noOrden}_${tipo}.pdf`;
            doc.save(nombrePDF);

            await Swal.fire({ title: "📄 PDF generado", text: `Se generó el archivo ${nombrePDF} correctamente.`, icon: "success", confirmButtonText: "Continuar" });

            const res = await axios.post(`http://66.232.105.107:3001/api/surtido/finalizar/${noOrden}/${tipo}`);
            setPedidos(prev => prev.filter(p => !(p.no_orden === noOrden && p.tipo === tipo)));
            setEmbarques(prev => prev.filter(p => !(p.no_orden === noOrden && p.tipo === tipo)));
            setModalSurtido({ open: false, pedido: null, error: null, loading: false });
            Swal.fire({ title: "Liberado", text: res.data.message || "Pedido Liberado", icon: "success", confirmButtonColor: "#0ee231ff" });

        } catch (err) {
            console.error(err);
            const mensajeServidor = err.response?.data?.message;
            setModalSurtido(prev => ({
                ...prev,
                loading: false,
                error: mensajeServidor || "Ocurrió un problema al generar el PDF o finalizar el pedido."
            }));
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

    // ✅ Filtro por mes — mesFin en formato "YYYY-MM" (vacío = todos).
    // Por default siempre arranca en el mes actual, sin que el usuario tenga que elegirlo.
    const getMesActual = () => {
        const hoy = new Date();
        return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    };
    const [mesFin, setMesFin] = useState(getMesActual());
    const [mesesDisponibles, setMesesDisponibles] = useState([]);

    // ✅ Mantiene mesFinRef al día con lo que el usuario tiene seleccionado.
    useEffect(() => { mesFinRef.current = mesFin; }, [mesFin]);

    const cargarMesesDisponibles = () => {
        axios.get("http://66.232.105.107:3001/api/surtido/meses-disponibles-finalizados")
            .then(res => setMesesDisponibles(Array.isArray(res.data) ? res.data : []))
            .catch(() => setMesesDisponibles([]));
    };

    const cargarPedidosFinalizados = (mesSeleccionado) => {
        const params = {};
        if (mesSeleccionado) {
            const [anio, mes] = mesSeleccionado.split('-');
            params.anio = anio;
            params.mes = mes;
        }
        axios.get("http://66.232.105.107:3001/api/surtido/Obtener-pedidos-finalizados", { params })
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
    };

    useEffect(() => { cargarMesesDisponibles(); }, []);
    useEffect(() => { cargarPedidosFinalizados(mesFin); }, [mesFin]);

    const PAGE_SIZE_FIN = 4;
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

    // Modal de la pestaña Surtido: ver detalle del pedido y liberarlo
    const [modalSurtido, setModalSurtido] = useState({ open: false, pedido: null, error: null, loading: false });
    // Ediciones manuales de cantidad/cant_surtida/cant_no_enviada/motivo dentro del modal, por id_pedi
    const [edicionesSurtido, setEdicionesSurtido] = useState({});
    const [guardandoEdicion, setGuardandoEdicion] = useState(false);
    // Los campos de cantidad/cant_surtida/cant_no_enviada/motivo son de solo
    // lectura hasta que se toca "Modificar" — así nadie los edita sin querer.
    const [modoEdicionSurtido, setModoEdicionSurtido] = useState(false);

    // Evita que la página de fondo se desplace mientras el modal de Surtido está abierto
    useEffect(() => {
        if (modalSurtido.open) {
            const previo = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => { document.body.style.overflow = previo; };
        }
    }, [modalSurtido.open]);

    const cambiarEdicionProducto = (id_pedi, campo, valor) => {
        setEdicionesSurtido(prev => ({
            ...prev,
            [id_pedi]: { ...(prev[id_pedi] || {}), [campo]: valor }
        }));
    };

    const guardarEdicionesSurtido = async () => {
        const ids = Object.keys(edicionesSurtido);
        if (ids.length === 0) return;

        setGuardandoEdicion(true);
        setModalSurtido(prev => ({ ...prev, error: null }));

        try {
            for (const idPedi of ids) {
                const prodOriginal = (modalSurtido.pedido.productos || []).find(p => String(p.id_pedi) === String(idPedi));
                const cambios = edicionesSurtido[idPedi];
                const payload = {
                    cantidad: cambios.cantidad ?? prodOriginal?.cantidad,
                    cant_surtida: cambios.cant_surtida ?? prodOriginal?.cant_surtida,
                    cant_no_enviada: cambios.cant_no_enviada ?? prodOriginal?.cant_no_enviada,
                    motivo: cambios.motivo ?? prodOriginal?.motivo,
                };
                await axios.put(`http://66.232.105.107:3001/api/surtido/pedidos/actualizar-producto/${idPedi}`, payload);
            }

            // Refrescar datos del pedido en el modal con lo ya guardado
            const productosActualizados = (modalSurtido.pedido.productos || []).map(p => {
                const cambios = edicionesSurtido[p.id_pedi];
                return cambios ? { ...p, ...cambios } : p;
            });
            setModalSurtido(prev => ({ ...prev, pedido: { ...prev.pedido, productos: productosActualizados } }));
            setEdicionesSurtido({});
            setModoEdicionSurtido(false);
            cargarPedidosSurtiendo();
        } catch (err) {
            const mensajeServidor = err?.response?.data?.message;
            setModalSurtido(prev => ({ ...prev, error: mensajeServidor || "Ocurrió un problema al guardar los cambios." }));
        } finally {
            setGuardandoEdicion(false);
        }
    };

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
        <div className="place_holder-container fade-in" style={{ height: '95vh' }}>
            <Box sx={{ width: '100%', flex: 1, minHeight: 0, overflowY: 'auto' }}>

                <div className="place_holder-header" style={{ position: 'sticky', top: 0, zIndex: 2500 }}>
                    <span className="place_holder-title">Progreso de Pedidos</span>
                    <button className="place_holder-close" onClick={() => (window.location.href = '/menu')}>
                        <FaTimes />
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
                            <Box p={2} sx={{ height: 'calc(100vh - 180px)', overflowY: 'auto', background: "#faf9f9" }}>
                                {pedidos.length === 0 ? (
                                    <Typography color="textSecondary" align="center" mt={4}>No hay pedidos en surtido.</Typography>
                                ) : (
                                    <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', borderColor: '#e6e9ef', boxShadow: '0 2px 10px rgba(16,24,40,0.05)' }}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow sx={{ background: '#f7f9fc' }}>
                                                    {['Tipo', 'No. orden', 'Bahía', 'Surtido por', 'Avance'].map(h => (
                                                        <TableCell key={h} sx={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#8b93a7', py: 1.2 }}>{h}</TableCell>
                                                    ))}
                                                    <TableCell align="right" sx={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#8b93a7', py: 1.2 }}>Acción</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {pedidos.map(pedido => {
                                                    const progreso = calcularProgreso(pedido.productos);
                                                    const rowKey = pedido.key || (pedido.no_orden + pedido.tipo);
                                                    const esFusionado = !!pedido.ordenes_unidas;
                                                    const colorAvance = progreso === 100 ? '#16a34a' : progreso >= 40 ? '#4ade80' : progreso > 0 ? '#f59e0b' : '#d1d5db';

                                                    return (
                                                        <TableRow key={rowKey} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                                                            <TableCell sx={{ py: 1 }}>
                                                                <Box component="span" sx={{ px: 1.2, py: 0.3, borderRadius: 99, fontSize: '0.75rem', fontWeight: 700, background: '#eef2ff', color: '#3b4cca' }}>
                                                                    {pedido.tipo}
                                                                </Box>
                                                            </TableCell>
                                                            <TableCell sx={{ py: 1 }}>
                                                                <Typography sx={{ fontWeight: 700, color: '#111827' }}>{pedido.no_orden}</Typography>
                                                                {esFusionado && (
                                                                    <Typography variant="caption" display="block" sx={{ color: '#7b1fa2', fontWeight: 600 }}>
                                                                        🔗 {pedido.ordenes_unidas}
                                                                    </Typography>
                                                                )}
                                                            </TableCell>
                                                            <TableCell sx={{ py: 1 }}>
                                                                <Box component="span" sx={{ px: 1.2, py: 0.3, borderRadius: 99, fontSize: '0.8rem', background: '#f1f3f7', color: '#374151', fontWeight: 600 }}>
                                                                    {pedido.bahia}
                                                                </Box>
                                                            </TableCell>
                                                            <TableCell sx={{ py: 1 }}>{pedido.nombre_usuario || "?"}</TableCell>
                                                            <TableCell sx={{ py: 1 }}>
                                                                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                                                                    <CircularProgress variant="determinate" value={100} size={42} thickness={4} sx={{ color: '#eceff3', position: 'absolute' }} />
                                                                    <CircularProgress variant="determinate" value={progreso} size={42} thickness={4} sx={{ color: colorAvance }} />
                                                                    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                        <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: '#374151' }}>{progreso}%</Typography>
                                                                    </Box>
                                                                </Box>
                                                            </TableCell>
                                                            <TableCell align="right" sx={{ py: 1 }}>
                                                                <Button size="small" variant="contained"
                                                                    startIcon={<VisibilityOutlinedIcon fontSize="small" />}
                                                                    onClick={() => { setModalSurtido({ open: true, pedido, error: null, loading: false }); setEdicionesSurtido({}); setModoEdicionSurtido(false); }}>
                                                                    Ver / Liberar
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </Paper>
                                )}
                            </Box>
                        </div>
                    )}

                    {/* ==================== TAB EMBARQUES ==================== */}
                    {tabActual === 1 && (
                        <Box sx={{ height: 'calc(100vh - 150px)', overflowY: 'auto', paddingRight: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
                                <TextField
                                    size="small" variant="outlined" placeholder="Buscar por No. Orden"
                                    value={busqueda || ""} onChange={(e) => setBusqueda(e.target.value)}
                                    sx={{
                                        width: 320,
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 99, background: '#fff', height: 42,
                                            boxShadow: '0 1px 3px rgba(16,24,40,0.06)',
                                            '& fieldset': { borderColor: '#d9dde6' },
                                            '&:hover fieldset': { borderColor: '#b6bdcc' },
                                            '&.Mui-focused fieldset': { borderColor: '#2f6fed', borderWidth: 1 },
                                        },
                                    }}
                                    InputProps={{
                                        startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: '#9aa3b2' }} /></InputAdornment>),
                                        endAdornment: busqueda ? (<InputAdornment position="end"><IconButton size="small" onClick={() => setBusqueda("")}><ClearIcon fontSize="small" /></IconButton></InputAdornment>) : null,
                                    }}
                                />
                                <Box component="span" sx={{ px: 1.6, py: 0.6, borderRadius: 99, fontSize: '0.8rem', fontWeight: 600, background: '#f1f3f7', color: '#4b5563' }}>
                                    {embarquesFiltrados.length} {embarquesFiltrados.length === 1 ? 'resultado' : 'resultados'}
                                </Box>
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
                                        <Card key={rowKey} sx={{
                                            mb: 2.5, borderRadius: '16px', overflow: 'hidden',
                                            border: '1px solid #e6e9ef', boxShadow: '0 2px 10px rgba(16,24,40,0.06)',
                                            transition: 'box-shadow .2s ease', '&:hover': { boxShadow: '0 8px 24px rgba(16,24,40,0.10)' },
                                        }}>
                                            {/* ── Encabezado ── */}
                                            <Box sx={{ px: 2.5, py: 1.8, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                                                <Box component="span" sx={{ px: 1.4, py: 0.4, borderRadius: 99, fontSize: '0.78rem', fontWeight: 700, background: '#eef2ff', color: '#3b4cca' }}>
                                                    {pedido.tipo}
                                                </Box>
                                                <Box>
                                                    <Typography sx={{ fontSize: '1.2rem', fontWeight: 800, color: '#111827', lineHeight: 1.15 }}>
                                                        {pedido.no_orden}
                                                    </Typography>
                                                    <Typography sx={{ fontSize: '0.8rem', color: '#6b7280' }}>
                                                        Surtido por <b style={{ color: '#374151' }}>{pedido.nombre_usuario || '?'}</b>
                                                    </Typography>
                                                </Box>
                                                <Box component="span" sx={{ px: 1.2, py: 0.3, borderRadius: 99, fontSize: '0.8rem', background: '#f1f3f7', color: '#374151', fontWeight: 600 }}>
                                                    Bahía {pedido.bahia}
                                                </Box>

                                                <Box sx={{ flex: 1 }} />

                                                {(() => {
                                                    const totalProd = pedido.productos.length;
                                                    const validados = pedido.productos.filter(p => {
                                                        const esp = Number(p._pz || 0) + Number(p._pq || 0) + Number(p._inner || 0) + Number(p._master || 0);
                                                        const val = Number(p.v_pz || 0) + Number(p.v_pq || 0) + Number(p.v_inner || 0) + Number(p.v_master || 0);
                                                        return esp > 0 && val >= esp;
                                                    }).length;
                                                    const colorAnillo = progreso === 100 ? '#16a34a' : progreso >= 40 ? '#3b82f6' : progreso > 0 ? '#f59e0b' : '#d1d5db';
                                                    const estado = progreso === 100
                                                        ? { txt: 'Completo', bg: '#e8f5e9', fg: '#2e7d32' }
                                                        : progreso > 0
                                                            ? { txt: 'En proceso', bg: '#fff8e1', fg: '#a16207' }
                                                            : { txt: 'Sin iniciar', bg: '#f1f3f7', fg: '#6b7280' };
                                                    return (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, ml: 'auto' }}>
                                                            <Box sx={{ textAlign: 'right' }}>
                                                                <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827' }}>Validación de surtido</Typography>
                                                                <Typography sx={{ fontSize: '0.8rem', color: '#6b7280' }}>
                                                                    {validados} de {totalProd} productos validados{totalProd - validados > 0 ? ` · faltan ${totalProd - validados}` : ''}
                                                                </Typography>
                                                            </Box>
                                                            <Box component="span" sx={{ px: 1.5, py: 0.5, borderRadius: 99, fontSize: '0.78rem', fontWeight: 700, background: estado.bg, color: estado.fg }}>
                                                                {estado.txt}
                                                            </Box>
                                                            {progreso === 100 && (
                                                                <Button size="small" variant="contained" color="success"
                                                                    onClick={() => finalizarDesdeEmbarque(pedido.no_orden, pedido.tipo)}>
                                                                    Finalizar pedido
                                                                </Button>
                                                            )}
                                                            <Box sx={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
                                                                <CircularProgress variant="determinate" value={100} size={60} thickness={4} sx={{ color: '#eceff3', position: 'absolute' }} />
                                                                <CircularProgress variant="determinate" value={progreso} size={60} thickness={4} sx={{ color: colorAnillo }} />
                                                                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827' }}>{progreso}%</Typography>
                                                                </Box>
                                                            </Box>
                                                        </Box>
                                                    );
                                                })()}
                                            </Box>

                                            {/* ── Pie de acciones ── */}
                                            <Box sx={{
                                                px: 2.5, py: 1.3, display: 'flex', alignItems: 'center', gap: 1.2, flexWrap: 'wrap',
                                                background: '#f7f9fc', borderTop: '1px solid #eceff3',
                                            }}>
                                                <Button size="small" variant="outlined" color="error"
                                                    onClick={() => verPreviaPDF(pedido.no_orden, pedido.tipo)}>
                                                    <BsFileEarmarkPdf style={{ verticalAlign: "-2px", marginRight: 8, fontSize: "1.15em" }} />Vista previa PDF
                                                </Button>

                                                <Box sx={{ flex: 1 }} />

                                                {!yaAsignado ? (
                                                    <>
                                                        <Select
                                                            size="small"
                                                            displayEmpty
                                                            value={usuarioEmbarqueSel[rowKey] || ''}
                                                            onChange={(e) => setUsuarioEmbarqueSel(prev => ({ ...prev, [rowKey]: e.target.value }))}
                                                            MenuProps={{ PaperProps: { sx: { borderRadius: '12px', mt: 0.5, maxHeight: 320, boxShadow: '0 8px 24px rgba(16,24,40,0.15)' } } }}
                                                            renderValue={(v) => v === ''
                                                                ? <span style={{ color: '#9ca3af' }}>Asignar usuario</span>
                                                                : nombreBonito(getUserName(usuariosPaqueteria.find(u => getUserId(u) === v)))}
                                                            sx={{ background: '#fff', borderRadius: '10px', fontSize: '0.85rem', minWidth: 200, '& .MuiSelect-select': { py: 0.7 } }}
                                                        >
                                                            <MenuItem disabled value=""><em>Asignar usuario</em></MenuItem>
                                                            {[...usuariosPaqueteria]
                                                                .sort((a, b) => nombreBonito(getUserName(a)).localeCompare(nombreBonito(getUserName(b)), 'es'))
                                                                .map((u, i) => (
                                                                    <MenuItem key={getUserId(u) || i} value={getUserId(u)}
                                                                        sx={{ fontSize: '0.88rem', mx: 0.5, borderRadius: '8px', '&.Mui-selected': { backgroundColor: '#eaf1ff', color: '#1d4ed8', fontWeight: 600 } }}>
                                                                        {nombreBonito(getUserName(u)) || `Usuario ${i + 1}`}
                                                                    </MenuItem>
                                                                ))}
                                                        </Select>
                                                        <Button size="small" variant="contained" color="primary"
                                                            onClick={() => {
                                                                const selectedId = Number(usuarioEmbarqueSel[rowKey]);
                                                                if (!selectedId) { Swal.fire("⚠️ Selecciona un usuario", "", "warning"); return; }
                                                                asignarUsuarioPaqueteria(pedido.no_orden, selectedId);
                                                            }}>
                                                            Asignar
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Box component="span" sx={{ px: 1.4, py: 0.5, borderRadius: 99, fontSize: '0.82rem', background: '#e8f5e9', color: '#2e7d32', fontWeight: 700 }}>
                                                            Asignado: {nombreBonito(nombreAsignado)}
                                                        </Box>
                                                        <Button size="small" color="warning" variant="outlined"
                                                            onClick={() => liberarUsuarioPaqueteria(pedido.no_orden)}
                                                            disabled={!liberarHabilitado}
                                                            title={liberarHabilitado ? '' : 'No se puede liberar: hay validaciones en v_pz/v_pq/v_inner/v_master'}>
                                                            Liberar pedido
                                                        </Button>
                                                    </>
                                                )}
                                            </Box>

                                            {expanded[rowKey] && (
                                                <Box sx={{ px: 1.5, pb: 1.5, overflowX: 'auto' }}>
                                                    <Table size="small" sx={{ mt: 1 }}>
                                                        <TableHead>
                                                            <TableRow>
                                                                {['Código', 'Cantidad', 'Cant. surtida', 'Cant. no surtida', 'PZ', 'PQ', 'INNER', 'MASTER', 'V_PZ', 'V_PQ', 'V_INNER', 'V_MASTER'].map(h => (
                                                                    <TableCell key={h} sx={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#8b93a7' }}>{h}</TableCell>
                                                                ))}
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {pedido.productos.map((prod, idx) => (
                                                                <TableRow key={prod.codigo_pedido + idx} hover>
                                                                    <TableCell sx={{ fontWeight: 700 }}>{prod.codigo_pedido}</TableCell><TableCell>{prod.cantidad}</TableCell>
                                                                    <TableCell>{prod.cant_surtida}</TableCell><TableCell>{prod.cant_no_enviada}</TableCell>
                                                                    <TableCell>{prod._pz}</TableCell><TableCell>{prod._pq}</TableCell>
                                                                    <TableCell>{prod._inner}</TableCell><TableCell>{prod._master}</TableCell>
                                                                    <TableCell>{prod.v_pz}</TableCell><TableCell>{prod.v_pq}</TableCell>
                                                                    <TableCell>{prod.v_inner}</TableCell><TableCell>{prod.v_master}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </Box>
                                            )}
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

                        const badge = (tipo) => ({ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, flexShrink: 0, background: tipo === 'VW' ? '#EAF3DE' : tipo === 'VQ' ? '#E6F1FB' : '#EEEDFE', color: tipo === 'VW' ? '#27500A' : tipo === 'VQ' ? '#0C447C' : '#3C3489' });
                        const th = { padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#888', fontSize: 11, borderBottom: '1px solid #f0f0f0', background: '#fafafa', whiteSpace: 'nowrap' };
                        const td = { padding: '7px 10px', color: '#333', borderBottom: '1px solid #f5f5f5', whiteSpace: 'nowrap' };
                        const tdAlert = { padding: '7px 10px', borderBottom: '1px solid #f5f5f5', whiteSpace: 'nowrap', background: '#FCEBEB', color: '#791F1F' };

                        const NOMBRES_MES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

                        return (
                            <Box p={2}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
                                    <TextField size="small" placeholder="Buscar por No. orden, tipo o código" value={qFin}
                                        onChange={(e) => { setQFin(e.target.value); setPageFin(1); }}
                                        sx={{
                                            width: 340,
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 99, background: '#fff', height: 42,
                                                boxShadow: '0 1px 3px rgba(16,24,40,0.06)',
                                                '& fieldset': { borderColor: '#d9dde6' },
                                                '&:hover fieldset': { borderColor: '#b6bdcc' },
                                                '&.Mui-focused fieldset': { borderColor: '#2f6fed', borderWidth: 1 },
                                            },
                                        }}
                                        InputProps={{
                                            startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: '#9aa3b2' }} /></InputAdornment>),
                                            endAdornment: qFin ? (<InputAdornment position="end"><IconButton size="small" onClick={() => { setQFin(''); setPageFin(1); }}><ClearIcon fontSize="small" /></IconButton></InputAdornment>) : null,
                                        }}
                                    />

                                    {/* ✅ Filtro por mes — se llena con los meses que realmente tienen pedidos finalizados */}
                                    <Select
                                        size="small"
                                        displayEmpty
                                        value={mesFin}
                                        onChange={(e) => setMesFin(e.target.value)}
                                        MenuProps={{ PaperProps: { sx: { borderRadius: '12px', mt: 0.5, maxHeight: 320, boxShadow: '0 8px 24px rgba(16,24,40,0.15)' } } }}
                                        renderValue={(v) => {
                                            if (!v) return 'Todos los meses';
                                            const [anio, mes] = String(v).split('-');
                                            return `${NOMBRES_MES[Number(mes)]} ${anio}`;
                                        }}
                                        sx={{ minWidth: 190, height: 42, borderRadius: 99, background: '#fff', fontSize: '0.9rem', boxShadow: '0 1px 3px rgba(16,24,40,0.06)', '& fieldset': { borderColor: '#d9dde6' } }}
                                    >
                                        <MenuItem value="" sx={{ fontSize: '0.88rem', mx: 0.5, borderRadius: '8px' }}>Todos los meses</MenuItem>
                                        {mesesDisponibles.map(m => {
                                            const value = `${m.anio}-${String(m.mes).padStart(2, '0')}`;
                                            return (
                                                <MenuItem key={value} value={value}
                                                    sx={{ fontSize: '0.88rem', mx: 0.5, borderRadius: '8px', '&.Mui-selected': { backgroundColor: '#eaf1ff', color: '#1d4ed8', fontWeight: 600 } }}>
                                                    {NOMBRES_MES[Number(m.mes)]} {m.anio}
                                                </MenuItem>
                                            );
                                        })}
                                    </Select>

                                    <Box component="span" sx={{ px: 1.6, py: 0.6, borderRadius: 99, fontSize: '0.8rem', fontWeight: 600, background: '#f1f3f7', color: '#4b5563' }}>
                                        {finalizadosFiltrados.length} {finalizadosFiltrados.length === 1 ? 'pedido' : 'pedidos'}
                                    </Box>
                                </Box>

                                {finalizadosFiltrados.length === 0 && (<Box textAlign="center" py={6} sx={{ color: '#aaa', fontSize: 14 }}>No hay pedidos finalizados.</Box>)}

                                <Paper variant="outlined" sx={{ borderRadius: '16px', overflow: 'hidden', borderColor: '#e6e9ef', boxShadow: '0 2px 10px rgba(16,24,40,0.05)' }}>
                                {pedidosFinPagina.map((pedido, idxPedido) => {
                                    const rowKey = pedido?.key || `${pedido?.tipo || ''}-${pedido?.no_orden || ''}-${idxPedido}`;
                                    const prods = Array.isArray(pedido?.productos) ? pedido.productos : [];
                                    const total = prods.reduce((s, p) => s + Number(p?.cantidad || 0), 0);
                                    const surtida = prods.reduce((s, p) => s + Number(p?.cant_surtida || 0), 0);
                                    const noEnv = prods.reduce((s, p) => s + Number(p?.cant_no_enviada || 0), 0);
                                    const fecha = ultimaFechaEmbarque(prods);
                                    const packing = puedePackingList(prods);
                                    const completo = noEnv === 0;
                                    const fmtNum = (n) => Number(n || 0).toLocaleString('es-MX');

                                    return (
                                        <Box key={rowKey} sx={{
                                            px: 2, py: 1.4, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
                                            borderLeft: `4px solid ${completo ? '#16a34a' : '#d32f2f'}`,
                                            borderBottom: idxPedido < pedidosFinPagina.length - 1 ? '1px solid #eceff3' : 'none',
                                            '&:hover': { background: '#f9fafc' },
                                        }}>
                                            <span style={badge(pedido.tipo)}>{pedido.tipo}</span>

                                            <Box sx={{ minWidth: 190 }}>
                                                <Typography sx={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827', lineHeight: 1.15 }}>{pedido.no_orden}</Typography>
                                                <Typography sx={{ fontSize: '0.76rem', color: fecha ? '#6b7280' : '#b6bcc9' }}>
                                                    {fecha ? `Fin embarque: ${fecha.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}` : 'Sin fecha de embarque'}
                                                </Typography>
                                            </Box>

                                            <Box sx={{ display: 'flex', gap: 3, flex: 1, minWidth: 260 }}>
                                                {[['Total', total, false], ['Surtida', surtida, false], ['No enviada', noEnv, noEnv > 0]].map(([label, valor, alerta]) => (
                                                    <Box key={label}>
                                                        <Typography sx={{ fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: alerta ? '#d32f2f' : '#8b93a7' }}>{label}</Typography>
                                                        <Typography sx={{ fontSize: '0.98rem', fontWeight: 700, color: alerta ? '#d32f2f' : '#111827' }}>{fmtNum(valor)}</Typography>
                                                    </Box>
                                                ))}
                                            </Box>

                                            <Box component="span" sx={{
                                                px: 1.4, py: 0.4, borderRadius: 99, fontSize: '0.78rem', fontWeight: 700,
                                                background: completo ? '#e8f5e9' : '#fdecea', color: completo ? '#2e7d32' : '#d32f2f',
                                            }}>
                                                {completo ? 'Completo' : `No env. ${fmtNum(noEnv)}`}
                                            </Box>

                                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                                <Button size="small" variant="outlined" startIcon={<VisibilityOutlinedIcon fontSize="small" />} onClick={() => abrirDetalle(pedido)}>
                                                    Detalle
                                                </Button>
                                                <Button size="small" variant="outlined" color="secondary" onClick={() => verPreviaPDF(pedido.no_orden, pedido.tipo)}>
                                                    <BsFileEarmarkPdf style={{ verticalAlign: "-2px", marginRight: 6, fontSize: "1.15em" }} />Surtido
                                                </Button>
                                                <span title={!packing ? 'Necesita factura y totales para generar el Packing List' : ''}>
                                                    <Button size="small" variant="contained" color="error" disabled={!packing}
                                                        onClick={() => packing && generarPDFPackingList(pedido.no_orden, pedido.tipo)}>
                                                        <BsFileEarmarkPdf style={{ verticalAlign: "-2px", marginRight: 6, fontSize: "1.15em" }} />Packing list
                                                    </Button>
                                                </span>
                                                <Button size="small" variant="outlined" color="success" startIcon={<PlaceOutlinedIcon fontSize="small" />} onClick={() => abrirModalUbicacion(pedido.no_orden, pedido.tipo)}>
                                                    Ubicación
                                                </Button>
                                            </Box>
                                        </Box>
                                    );
                                })}
                                </Paper>

                                {totalPagesFin > 1 && (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2.5 }}>
                                        <Pagination
                                            count={totalPagesFin}
                                            page={pageFin}
                                            onChange={(_, p) => setPageFin(p)}
                                            showFirstButton
                                            showLastButton
                                            siblingCount={1}
                                            boundaryCount={1}
                                            sx={{
                                                '& .MuiPaginationItem-root': {
                                                    width: 44, height: 44, minWidth: 44, borderRadius: '50%',
                                                    margin: '0 4px', border: 'none', backgroundColor: 'transparent',
                                                    color: '#5b6478', fontSize: '1rem', fontWeight: 400,
                                                    '&:hover': { backgroundColor: '#f3f4f8' },
                                                },
                                                '& .MuiPaginationItem-previousNext, & .MuiPaginationItem-firstLast': { color: '#6b7280' },
                                                '& .MuiPaginationItem-root.Mui-selected': {
                                                    backgroundColor: '#eceffd', color: '#3b4cca', fontWeight: 500,
                                                    '&:hover': { backgroundColor: '#e2e7fb' },
                                                },
                                                '& .MuiPaginationItem-root.Mui-disabled': { opacity: 0.45 },
                                            }}
                                        />
                                    </Box>
                                )}

                                {modalDetalle.open && modalDetalle.pedido && (() => {
                                    const p = modalDetalle.pedido;
                                    const prods = Array.isArray(p?.productos) ? p.productos : [];
                                    const total = prods.reduce((s, x) => s + Number(x?.cantidad || 0), 0);
                                    const surtida = prods.reduce((s, x) => s + Number(x?.cant_surtida || 0), 0);
                                    const noEnv = prods.reduce((s, x) => s + Number(x?.cant_no_enviada || 0), 0);
                                    const ef = total > 0 ? Math.round((surtida / total) * 100) : 0;
                                    const fecha = ultimaFechaEmbarque(prods);
                                    const fechasDe = (campo) => prods.map(x => x?.[campo] ? new Date(x[campo]) : null).filter(Boolean);
                                    const minF = (campo) => { const f = fechasDe(campo); return f.length ? new Date(Math.min(...f)) : null; };
                                    const maxF = (campo) => { const f = fechasDe(campo); return f.length ? new Date(Math.max(...f)) : null; };
                                    const fmtCorta = (d) => d ? d.toLocaleString('es-MX', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
                                    const colorEf = ef === 100 ? '#16a34a' : ef >= 80 ? '#2563eb' : '#d32f2f';
                                    const etiqueta = { fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#9ca3af' };

                                    return (
                                        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', boxSizing: 'border-box' }} onClick={(e) => e.target === e.currentTarget && cerrarDetalle()}>
                                            <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 1400, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                                {/* Encabezado */}
                                                <Box sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid #eceff3' }}>
                                                    <span style={badge(p.tipo)}>{p.tipo}</span>
                                                    <Box>
                                                        <Typography sx={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', lineHeight: 1.15 }}>{p.no_orden}</Typography>
                                                        <Typography sx={{ fontSize: '0.78rem', color: '#6b7280' }}>
                                                            {fecha ? `Fin embarque: ${fecha.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}` : 'Sin fecha de embarque registrada'}
                                                        </Typography>
                                                    </Box>
                                                    <Box sx={{ flex: 1 }} />
                                                    <IconButton onClick={cerrarDetalle}><ClearIcon /></IconButton>
                                                </Box>

                                                {/* Cuerpo: resumen a la izquierda + lista a la derecha */}
                                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '220px minmax(0, 1fr)' }, gridTemplateRows: 'minmax(0, 1fr)', flex: 1, minHeight: 0 }}>
                                                    <Box sx={{ p: 2, background: '#f7f9fc', borderRight: { md: '1px solid #eceff3' }, display: 'flex', flexDirection: 'column', gap: 1.6, overflowY: 'auto' }}>
                                                        <Box>
                                                            <Typography sx={etiqueta}>Efectividad</Typography>
                                                            <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: colorEf, lineHeight: 1.1 }}>{ef}%</Typography>
                                                        </Box>
                                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                                            <Box sx={{ flex: 1, background: '#fff', border: '1px solid #eceff3', borderRadius: 2, px: 1.2, py: 0.7 }}>
                                                                <Typography sx={etiqueta}>Total</Typography>
                                                                <Typography sx={{ fontWeight: 700, color: '#185FA5' }}>{total}</Typography>
                                                            </Box>
                                                            <Box sx={{ flex: 1, background: '#fff', border: '1px solid #eceff3', borderRadius: 2, px: 1.2, py: 0.7 }}>
                                                                <Typography sx={etiqueta}>Surtida</Typography>
                                                                <Typography sx={{ fontWeight: 700, color: '#1D9E75' }}>{surtida}</Typography>
                                                            </Box>
                                                        </Box>
                                                        <Box sx={{ background: noEnv > 0 ? '#fdecea' : '#fff', border: `1px solid ${noEnv > 0 ? '#f7c1c1' : '#eceff3'}`, borderRadius: 2, px: 1.2, py: 0.7 }}>
                                                            <Typography sx={{ ...etiqueta, color: noEnv > 0 ? '#d32f2f' : '#9ca3af' }}>No enviada</Typography>
                                                            <Typography sx={{ fontWeight: 700, color: noEnv > 0 ? '#d32f2f' : '#111827' }}>{noEnv}</Typography>
                                                        </Box>

                                                        <Box sx={{ borderLeft: '2px solid #d1d5db', pl: 1.5, display: 'flex', flexDirection: 'column', gap: 1.2, mt: 0.5 }}>
                                                            {[['Inicio surtido', minF('inicio_surtido')], ['Fin surtido', maxF('fin_surtido')], ['Inicio embarque', minF('inicio_embarque')], ['Fin embarque', maxF('fin_embarque')]].map(([label, f]) => (
                                                                <Box key={label}>
                                                                    <Typography sx={etiqueta}>{label}</Typography>
                                                                    <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: f ? '#111827' : '#b6bcc9' }}>{fmtCorta(f)}</Typography>
                                                                </Box>
                                                            ))}
                                                        </Box>
                                                        <Typography sx={{ fontSize: '0.72rem', color: '#9ca3af', mt: 'auto' }}>{prods.length} productos</Typography>
                                                    </Box>

                                                    <div style={{ overflow: 'auto', minWidth: 0 }}>
                                                        {(() => {
                                                            const thG = (bg, fg) => ({ ...th, textAlign: 'center', background: bg, color: fg, fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', position: 'sticky', top: 0, zIndex: 2 });
                                                            const th2 = { ...th, position: 'sticky', top: 30, zIndex: 2, textTransform: 'uppercase', fontSize: 10.5 };
                                                            const th2S = { ...th2, textAlign: 'center', background: '#fffbe0', color: '#8a6d00' };
                                                            const th2V = { ...th2, textAlign: 'center', background: '#eaf2ff', color: '#1d4ed8' };
                                                            const base = (alerta) => (alerta ? tdAlert : td);
                                                            const num = (v) => (v === null || v === undefined || v === '' ? 0 : v);
                                                            return (
                                                                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 12 }}>
                                                                    <thead>
                                                                        <tr>
                                                                            <th colSpan={4} style={{ ...thG('#f7f9fc', '#6b7280'), textAlign: 'left' }}>Producto</th>
                                                                            <th colSpan={4} style={thG('#fff4b8', '#8a6d00')}>Conf. surtidor</th>
                                                                            <th colSpan={3} style={{ ...thG('#f7f9fc', '#6b7280'), textAlign: 'left' }}>Surtido</th>
                                                                            <th colSpan={4} style={thG('#d9e8ff', '#1d4ed8')}>Conf. validador</th>
                                                                            <th colSpan={4} style={{ ...thG('#f7f9fc', '#6b7280'), textAlign: 'left' }}>Embarque</th>
                                                                        </tr>
                                                                        <tr>
                                                                            {['Código', 'Cantidad', 'Surtida', 'No env.'].map(h => (<th key={h} style={th2}>{h}</th>))}
                                                                            {['PZ', 'PQ', 'Inner', 'Master'].map(h => (<th key={'s' + h} style={th2S}>{h}</th>))}
                                                                            {['Surtidor', 'Inicio surtido', 'Fin surtido'].map(h => (<th key={h} style={th2}>{h}</th>))}
                                                                            {['PZ', 'PQ', 'Inner', 'Master'].map(h => (<th key={'v' + h} style={th2V}>{h}</th>))}
                                                                            {['Validador', 'Inicio', 'Fin', 'Motivo no enviado'].map(h => (<th key={h} style={th2}>{h}</th>))}
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {prods.map((prod, i) => {
                                                                            const alerta = Number(prod?.cant_no_enviada || 0) > 0;
                                                                            const c = base(alerta);
                                                                            const cS = { ...c, textAlign: 'center', background: alerta ? '#FCEBEB' : '#fffdf0' };
                                                                            const cV = { ...c, textAlign: 'center', background: alerta ? '#FCEBEB' : '#f5f9ff' };
                                                                            return (
                                                                                <tr key={`${prod?.codigo_pedido || i}_${i}`}>
                                                                                    <td style={{ ...c, fontWeight: 700 }}>{prod?.codigo_pedido}</td>
                                                                                    <td style={c}>{prod?.cantidad}</td>
                                                                                    <td style={c}>{prod?.cant_surtida}</td>
                                                                                    <td style={{ ...c, fontWeight: alerta ? 700 : 400 }}>{prod?.cant_no_enviada}</td>
                                                                                    <td style={cS}>{num(prod?._pz)}</td><td style={cS}>{num(prod?._pq)}</td><td style={cS}>{num(prod?._inner)}</td><td style={cS}>{num(prod?._master)}</td>
                                                                                    <td style={c}>{prod?.nombre_usuario}</td>
                                                                                    <td style={c}>{fmt(prod?.inicio_surtido)}</td>
                                                                                    <td style={c}>{fmt(prod?.fin_surtido)}</td>
                                                                                    <td style={cV}>{num(prod?.v_pz)}</td><td style={cV}>{num(prod?.v_pq)}</td><td style={cV}>{num(prod?.v_inner)}</td><td style={cV}>{num(prod?.v_master)}</td>
                                                                                    <td style={c}>{prod?.nombre_paqueteria}</td>
                                                                                    <td style={c}>{fmt(prod?.inicio_embarque)}</td>
                                                                                    <td style={c}>{fmt(prod?.fin_embarque)}</td>
                                                                                    <td style={{ ...c, whiteSpace: 'normal', minWidth: 140 }}>{prod?.motivo || ''}</td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            );
                                                        })()}
                                                    </div>
                                                </Box>

                                            </div>
                                        </div>
                                    );
                                })()}
                            </Box>
                        );
                    })()}

                </Box>
            </Box>

            {/* ========== MODAL SURTIDO (ver detalle / liberar) ========== */}
            {modalSurtido.open && modalSurtido.pedido && (() => {
                const pedido = modalSurtido.pedido;
                const progreso = calcularProgreso(pedido.productos);
                const esFusionado = !!pedido.ordenes_unidas;

                const hayEdiciones = Object.keys(edicionesSurtido).length > 0;

                return (
                    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", boxSizing: "border-box" }}>
                        <div style={{ background: "#fff", borderRadius: "12px", padding: "16px", width: "95%", maxWidth: "950px", maxHeight: "88vh", display: "flex", flexDirection: "column" }}>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                <Typography variant="h6" fontWeight="bold">{pedido.tipo} : {pedido.no_orden} : {pedido.bahia}</Typography>
                                <IconButton
                                    disabled={modalSurtido.loading}
                                    onClick={() => { setModalSurtido({ open: false, pedido: null, error: null, loading: false }); setEdicionesSurtido({}); setModoEdicionSurtido(false); }}
                                >
                                    <ClearIcon />
                                </IconButton>
                            </Box>

                            <Typography variant="body2" fontWeight={600} mb={0.5}>Surtido por: <b>{pedido.nombre_usuario || "?"}</b></Typography>
                            {esFusionado && (
                                <Typography variant="body2" sx={{ color: '#7b1fa2', fontWeight: 600, mb: 0.5 }}>
                                    🔗 Órdenes fusionadas: {pedido.ordenes_unidas}
                                </Typography>
                            )}

                            <Box mt={0.5} mb={1}>
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

                            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", border: "1px solid #eee", borderRadius: 8 }}>
                                <Table size="small" sx={{ '& .MuiTableCell-root': { padding: '4px 8px', fontSize: '0.8rem' } }} stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Código</TableCell>
                                            <TableCell>Descripción</TableCell>
                                            <TableCell>Cantidad</TableCell>
                                            <TableCell>Cant. Surtida</TableCell>
                                            <TableCell>Cant. No Enviada</TableCell>
                                            <TableCell>Motivo</TableCell>
                                            <TableCell>Unificado</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(pedido.productos || []).map((prod, idx) => {
                                            const edicion = edicionesSurtido[prod.id_pedi] || {};
                                            const valCantidad = edicion.cantidad ?? prod.cantidad;
                                            const valSurtida = edicion.cant_surtida ?? prod.cant_surtida;
                                            const valNoEnviada = edicion.cant_no_enviada ?? prod.cant_no_enviada;
                                            const valMotivo = edicion.motivo ?? (prod.motivo || '');
                                            const sobreSurtido = Number(valSurtida) > Number(valCantidad);

                                            return (
                                                <TableRow key={prod.id_pedi ?? (prod.codigo_pedido + idx)}>
                                                    <TableCell sx={sobreSurtido ? { color: '#d32f2f', fontWeight: 700 } : undefined}>
                                                        {prod.codigo_pedido}
                                                    </TableCell>
                                                    <TableCell>{prod.descripcion_producto || ''}</TableCell>
                                                    <TableCell sx={sobreSurtido ? { color: '#d32f2f', fontWeight: 700 } : undefined}>
                                                        {modoEdicionSurtido ? (
                                                            <TextField
                                                                variant="standard" type="number" size="small"
                                                                value={valCantidad ?? ''}
                                                                sx={{ width: 60, input: sobreSurtido ? { color: '#d32f2f', fontWeight: 700 } : undefined }}
                                                                onChange={(e) => cambiarEdicionProducto(prod.id_pedi, 'cantidad', e.target.value)}
                                                            />
                                                        ) : (valCantidad ?? '')}
                                                    </TableCell>
                                                    <TableCell sx={sobreSurtido ? { color: '#d32f2f', fontWeight: 700 } : undefined}>
                                                        {modoEdicionSurtido ? (
                                                            <TextField
                                                                variant="standard" type="number" size="small"
                                                                value={valSurtida ?? ''}
                                                                sx={{ width: 60, input: sobreSurtido ? { color: '#d32f2f', fontWeight: 700 } : undefined }}
                                                                onChange={(e) => cambiarEdicionProducto(prod.id_pedi, 'cant_surtida', e.target.value)}
                                                            />
                                                        ) : (valSurtida ?? '')}
                                                    </TableCell>
                                                    <TableCell>
                                                        {modoEdicionSurtido ? (
                                                            <TextField
                                                                variant="standard" type="number" size="small"
                                                                value={valNoEnviada ?? ''}
                                                                sx={{ width: 60 }}
                                                                onChange={(e) => cambiarEdicionProducto(prod.id_pedi, 'cant_no_enviada', e.target.value)}
                                                            />
                                                        ) : (valNoEnviada ?? '')}
                                                    </TableCell>
                                                    <TableCell>
                                                        {modoEdicionSurtido ? (
                                                            <TextField
                                                                variant="standard" size="small"
                                                                value={valMotivo}
                                                                sx={{ width: 160 }}
                                                                onChange={(e) => cambiarEdicionProducto(prod.id_pedi, 'motivo', e.target.value)}
                                                            />
                                                        ) : (valMotivo || '')}
                                                    </TableCell>
                                                    <TableCell>
                                                        {Number(prod.unido) === 1
                                                            ? <span style={{ color: '#7b1fa2', fontWeight: 700 }}>Sí</span>
                                                            : ''}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>

                            {modalSurtido.error && (
                                <Box sx={{ background: '#fdecea', border: '1px solid #f5c6cb', color: '#611a15', borderRadius: 2, p: 1.5, mt: 1.5 }}>
                                    <Typography variant="body2" fontWeight={600}>❌ {modalSurtido.error}</Typography>
                                </Box>
                            )}

                            <Box display="flex" gap={1} flexWrap="wrap" mt={1.5}>
                                {!modoEdicionSurtido && (
                                    <Button size="small" variant="outlined" color="warning"
                                        startIcon={<EditOutlinedIcon fontSize="small" />}
                                        onClick={() => setModoEdicionSurtido(true)}>
                                        Modificar
                                    </Button>
                                )}

                                {modoEdicionSurtido && hayEdiciones && (
                                    <Button size="small" variant="contained" color="primary" disabled={guardandoEdicion}
                                        onClick={guardarEdicionesSurtido}>
                                        {guardandoEdicion ? "Guardando..." : "💾 Guardar cambios"}
                                    </Button>
                                )}

                                {modoEdicionSurtido && (
                                    <Button size="small" variant="text" color="inherit" disabled={guardandoEdicion}
                                        onClick={() => { setModoEdicionSurtido(false); setEdicionesSurtido({}); }}>
                                        Cancelar edición
                                    </Button>
                                )}

                                <Button size="small" variant="outlined" color="error"
                                    onClick={() => verPreviaPDF(pedido.no_orden, pedido.tipo)}>
                                    <BsFileEarmarkPdf style={{ verticalAlign: "-2px", marginRight: 8, fontSize: "1.15em" }} />Vista previa PDF
                                </Button>

                                {progreso === 100 && (
                                    <Button size="small" variant="contained" color="success" disabled={modalSurtido.loading}
                                        onClick={() => finalizarPedido(pedido.no_orden, pedido.tipo)}>
                                        {modalSurtido.loading ? "Procesando..." : "Autorización"}
                                    </Button>
                                )}
                            </Box>
                        </div>
                    </div>
                );
            })()}

            {/* ========== MODAL UBICACIÓN ========== */}
            {modalUbicacion.open && (
                <div
                    style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}
                    onClick={(e) => e.target === e.currentTarget && setModalUbicacion({ open: false, pedido: null, cliente: null })}
                >
                    <div style={{ background: "#fff", borderRadius: 16, width: "92%", maxWidth: 980, maxHeight: "92vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                        {/* Encabezado */}
                        <Box sx={{ px: 2.5, py: 1.6, display: 'flex', alignItems: 'center', gap: 1.2, borderBottom: '1px solid #eceff3' }}>
                            <PlaceOutlinedIcon sx={{ color: '#d32f2f' }} />
                            <Typography sx={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827' }}>
                                {modalUbicacion.pedido?.noOrden} · {modalUbicacion.pedido?.tipo}
                            </Typography>
                            <Box sx={{ flex: 1 }} />
                            <IconButton onClick={() => setModalUbicacion({ open: false, pedido: null, cliente: null })}><ClearIcon /></IconButton>
                        </Box>

                        {loadingModal ? (
                            <Box textAlign="center" py={6}><Typography>Cargando datos...</Typography></Box>
                        ) : (
                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '290px minmax(0, 1fr)' }, minHeight: 0, overflowY: 'auto' }}>
                                {/* Columna izquierda: datos */}
                                <Box sx={{ p: 2.5, background: '#f7f9fc', borderRight: { md: '1px solid #eceff3' }, display: 'flex', flexDirection: 'column', gap: 1.6 }}>
                                    <Box>
                                        <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#9ca3af' }}>Cliente</Typography>
                                        <Typography sx={{ fontWeight: 700, color: '#111827' }}>{modalUbicacion.cliente?.nombre_cliente || "S/D"}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 3 }}>
                                        <Box>
                                            <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#9ca3af' }}>No. cliente</Typography>
                                            <Typography sx={{ fontWeight: 600 }}>{modalUbicacion.cliente?.num_consigna || "S/D"}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#9ca3af' }}>Factura</Typography>
                                            <Typography sx={{ fontWeight: 600 }}>{modalUbicacion.cliente?.no_factura || "---"}</Typography>
                                        </Box>
                                    </Box>
                                    <Box>
                                        <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#9ca3af' }}>Teléfono</Typography>
                                        <Typography sx={{ fontWeight: 600 }}>{modalUbicacion.cliente?.telefono || "S/D"}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#9ca3af' }}>Dirección</Typography>
                                        <Typography sx={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.4 }}>{modalUbicacion.cliente?.direccion || "S/D"}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Box sx={{ flex: 1, background: '#fff', border: '1px solid #eceff3', borderRadius: 2, px: 1.5, py: 0.8 }}>
                                            <Typography sx={{ fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af' }}>Total</Typography>
                                            <Typography sx={{ fontWeight: 700 }}>${formatMoney(modalUbicacion.cliente?.total)}</Typography>
                                        </Box>
                                        <Box sx={{ flex: 1, background: '#fff', border: '1px solid #eceff3', borderRadius: 2, px: 1.5, py: 0.8 }}>
                                            <Typography sx={{ fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af' }}>Con IVA</Typography>
                                            <Typography sx={{ fontWeight: 700 }}>${formatMoney(modalUbicacion.cliente?.total_con_iva)}</Typography>
                                        </Box>
                                    </Box>
                                    {!miUbicacion && (
                                        <Typography sx={{ fontSize: '0.78rem', color: '#a16207' }}>⚠️ Activa tu ubicación para ver tiempo estimado</Typography>
                                    )}
                                </Box>

                                {/* Columna derecha: mapa */}
                                <Box sx={{ position: 'relative', minHeight: 360, background: '#eef0f4' }}>
                                    {modalUbicacion.cliente?.direccion ? (
                                        <iframe title="mapa-cliente" width="100%" height="100%" style={{ border: 0, position: 'absolute', inset: 0 }} loading="lazy" src={`https://www.google.com/maps?q=${encodeURIComponent(modalUbicacion.cliente.direccion)}&output=embed`} />
                                    ) : (
                                        <Typography color="textSecondary" textAlign="center" py={4}>No hay dirección disponible.</Typography>
                                    )}
                                    {modalUbicacion.cliente?.direccion && (
                                        <Button variant="contained" color="primary" size="small"
                                            startIcon={<DirectionsCarOutlinedIcon fontSize="small" />}
                                            sx={{ position: 'absolute', right: 14, bottom: 14, boxShadow: '0 4px 12px rgba(16,24,40,0.2)' }}
                                            onClick={() => {
                                                const destino = encodeURIComponent(modalUbicacion.cliente.direccion);
                                                const origen = miUbicacion ? `${miUbicacion.lat},${miUbicacion.lng}` : "";
                                                const url = origen ? `https://www.google.com/maps/dir/${origen}/${destino}` : `https://www.google.com/maps/search/${destino}`;
                                                window.open(url, "_blank");
                                            }}>
                                            Cómo llegar
                                        </Button>
                                    )}
                                </Box>
                            </Box>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
}

export default Surtiendo;