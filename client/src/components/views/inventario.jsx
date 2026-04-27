import React, { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import {
    Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    CircularProgress, Alert, TablePagination, TextField, InputAdornment, Button, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import Swal from "sweetalert2";
import axios from 'axios';
import * as XLSX from "xlsx";

const IMG_BASE = 'http://66.232.105.83:9101/images';
const PLACEHOLDER = 'http://66.232.105.83:9101/images/noimage.png';

// ================================================
// Calcula masters, inners y sueltas del faltante
// ================================================
function calcularEmpaques(faltante, master, inner) {
    if (!faltante || faltante <= 0) return null;
    const masterVal = Number(master) || 0;
    const innerVal = Number(inner) || 0;
    let masters = 0, inners = 0, sueltas = Number(faltante);

    if (masterVal > 0) { masters = Math.floor(sueltas / masterVal); sueltas = sueltas % masterVal; }
    if (innerVal > 0) { inners = Math.floor(sueltas / innerVal); sueltas = sueltas % innerVal; }

    return { masters, inners, sueltas };
}

function ProductImage({ code }) {
    const [src, setSrc] = useState(`${IMG_BASE}/${encodeURIComponent(code || '')}.jpg`);
    useEffect(() => { setSrc(`${IMG_BASE}/${code}.jpg`); }, [code]);
    const handleError = () => setSrc(PLACEHOLDER);
    return (
        <Box component="img" src={src} alt={`Imagen de producto ${code}`}
            loading="lazy" decoding="async" onError={handleError}
            sx={{ width: 64, height: 64, objectFit: 'contain', borderRadius: 1, border: '1px solid #e0e0e0', bgcolor: '#fafafa' }}
        />
    );
}

function InventarioListado() {
    const [inventario, setInventario] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [search, setSearch] = useState("");
    const [onlyEmpty, setOnlyEmpty] = useState(false);

    const cargarInventario = async () => {
        setLoading(true);
        try {
            await axios.put('http://66.232.105.107:3001/api/inventario/recalcular-inv-opt');
            const res = await axios.get('http://66.232.105.107:3001/api/inventario/Obtenerinventario');
            setInventario(res.data || []);
        } catch (err) {
            setError("Error al cargar el inventario");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { cargarInventario(); }, []);

    const handleChangePage = (_event, newPage) => setPage(newPage);
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const filtered = inventario
        .filter(item => item.codigo_producto?.toLowerCase().includes(search.toLowerCase()))
        .filter(item => (onlyEmpty ? (Number(item.cant_stock_real) || 0) <= 0 : true));

    const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    // ── Modal Solicitar ──
    const [openModal, setOpenModal] = useState(false);
    const [cantidadSolicitada, setCantidadSolicitada] = useState("");
    const [productoSeleccionado, setProductoSeleccionado] = useState(null);
    const user = JSON.parse(localStorage.getItem("user"));

    const abrirModalSolicitud = (row) => { setProductoSeleccionado(row); setCantidadSolicitada(""); setOpenModal(true); };

    // 🆕 Manda también el desglose al correo
    const enviarSolicitud = async () => {
        const emp = calcularEmpaques(
            productoSeleccionado?.inv_opt,
            productoSeleccionado?._master,
            productoSeleccionado?._inner
        );

        await axios.post("http://66.232.105.107:3001/api/inventario/solicitar-producto", {
            codigo: productoSeleccionado.codigo_producto,
            descripcion: productoSeleccionado.descripcion,
            ubicacion: productoSeleccionado.ubicacion,
            stock: productoSeleccionado.cant_stock_real,
            cantidadSolicitada,
            solicitante: user?.nombre || "Usuario desconocido",
            masters: emp?.masters ?? 0,
            inners: emp?.inners ?? 0,
            sueltas: emp?.sueltas ?? 0,
        });
        Swal.fire("Solicitud enviada", "Tu solicitud fue enviada correctamente", "success");
        setOpenModal(false);
    };

    // ── Stock JDE ──
    const [stockJDE, setStockJDE] = useState({});

    useEffect(() => {
        async function cargarJDE() {
            try {
                const res = await axios.get("http://66.232.105.107:3001/api/inventario/inventario-jde", { params: { almacen: "7240" } });
                const mapa = {};
                (res.data || []).forEach(item => { mapa[String(item.Clave)] = Number(item.Cant); });
                setStockJDE(mapa);
            } catch (error) { console.error("Error cargando JDE:", error); }
        }
        cargarJDE();
    }, []);

    // ── Excel ──
    const exportarExcel = () => {
        const data = filtered.map(row => {
            const qty = row.cant_stock_real !== null ? Number(row.cant_stock_real) : null;
            const invMin = row.inv_min ? Number(row.inv_min) : null;
            const invMax = row.inv_max ? Number(row.inv_max) : null;
            const invOpt = row.inv_opt ? Number(row.inv_opt) : null;
            const tieneConfig = invMin !== null && invMax !== null;
            const isEmpty = tieneConfig && qty !== null && qty <= 0;
            const bajoMinimo = tieneConfig && qty !== null && qty < invMin && qty > 0;
            const emp = (isEmpty || bajoMinimo) && invOpt ? calcularEmpaques(invOpt, row._master, row._inner) : null;
            return {
                "Código Producto": row.codigo_producto,
                "Ubicación": row.ubicacion,
                "Cantidad Stock": qty ?? 0,
                "Inv. Mínimo": invMin ?? "-",
                "Inv. Máximo": invMax ?? "-",
                "Faltante (inv_opt)": (isEmpty || bajoMinimo) && invOpt !== null ? invOpt : "OK",
                "Masters": emp?.masters ?? "-",
                "Inners": emp?.inners ?? "-",
                "Sueltas": emp?.sueltas ?? "-",
                "Cantidad Stock JDE": stockJDE[row.codigo_producto] ?? 0,
                "OC": row.oc || ""
            };
        });
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inventario");
        XLSX.writeFile(wb, "inventario.xlsx");
    };

    const handleCargaMasiva = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // 🔹 Leer el Excel
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target.result;
                const workbook = XLSX.read(bstr, { type: "binary" });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

                // 🔹 Validar columnas necesarias
                const primeraFila = jsonData[0];
                if (!primeraFila?.codigo_producto && !primeraFila?.Código && !primeraFila?.codigo) {
                    Swal.fire("❌ Error", "El archivo debe tener una columna 'codigo_producto'", "error");
                    return;
                }

                // 🔹 Mapear datos
                const datos = jsonData
                    .map(row => ({
                        codigo_producto: String(
                            row.codigo_producto || row.Código || row.codigo || ""
                        ).trim(),
                        inv_min: row.inv_min !== "" ? Number(row.inv_min) : null,
                        inv_max: row.inv_max !== "" ? Number(row.inv_max) : null,
                    }))
                    .filter(row => row.codigo_producto); // quitar filas vacías

                if (datos.length === 0) {
                    Swal.fire("⚠️ Sin datos", "No se encontraron registros válidos en el archivo", "warning");
                    return;
                }

                // 🔹 Confirmar antes de actualizar
                const { isConfirmed } = await Swal.fire({
                    title: "¿Actualizar inventario?",
                    html: `Se actualizarán <b>${datos.length}</b> productos con sus valores de mínimo y máximo.`,
                    icon: "question",
                    showCancelButton: true,
                    confirmButtonText: "Sí, actualizar",
                    cancelButtonText: "Cancelar",
                    confirmButtonColor: "#3085d6",
                });

                if (!isConfirmed) return;

                // 🔹 Enviar al backend
                Swal.fire({
                    title: "Actualizando...",
                    text: "Por favor espera",
                    didOpen: () => Swal.showLoading(),
                    allowOutsideClick: false,
                });

                const res = await axios.post(
                    "http://66.232.105.107:3001/api/inventario/carga-masiva-limites",
                    { productos: datos }
                );

                Swal.fire(
                    "✅ Actualizado",
                    `Se actualizaron ${res.data?.actualizados || datos.length} productos correctamente`,
                    "success"
                );

                // 🔹 Recargar inventario
                cargarInventario();

            } catch (err) {
                console.error(err);
                Swal.fire("❌ Error", "No se pudo procesar el archivo", "error");
            }
        };

        reader.readAsBinaryString(file);

        // 🔹 Limpiar input para poder subir el mismo archivo de nuevo
        e.target.value = "";
    };

    const [openCargaMasiva, setOpenCargaMasiva] = useState(false);

    // ── Modal Edición ──
    const [openEditModal, setOpenEditModal] = useState(false);
    const [ubicacionEdit, setUbicacionEdit] = useState("");
    const [invMinEdit, setInvMinEdit] = useState("");
    const [invMaxEdit, setInvMaxEdit] = useState("");
    const [rowEditando, setRowEditando] = useState(null);

    const guardarUbicacion = async () => {
        try {
            await axios.put("http://66.232.105.107:3001/api/inventario/actualizar-ubicacion", {
                id: rowEditando.id_ubicaccion,
                ubicacion: ubicacionEdit
            });
            await axios.put("http://66.232.105.107:3001/api/inventario/actualizar-limites", {
                id: rowEditando.id_ubicaccion,
                inv_min: invMinEdit !== "" ? Number(invMinEdit) : null,
                inv_max: invMaxEdit !== "" ? Number(invMaxEdit) : null,
            });
            Swal.fire("Actualizado", "Producto actualizado correctamente", "success");
            setOpenEditModal(false);
            cargarInventario();
        } catch (error) {
            setOpenEditModal(false);
            Swal.fire("Error", "No se pudo actualizar", "error");
        }
    };

    return (
        <div className="place_holder-container fade-in">
            <div className="place_holder-header">
                <span className="place_holder-title">Inventario</span>
                <button className="place_holder-close" onClick={() => (window.location.href = '/menu')}>
                    <FaTimes />
                </button>
            </div>

            <Box sx={{ mt: 3, mb: 2, px: { xs: 1, sm: 3 } }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 7 }}><CircularProgress /></Box>
                ) : error ? (
                    <Alert severity="error">{error}</Alert>
                ) : (
                    <Paper elevation={3} sx={{ borderRadius: 4, boxShadow: "0 4px 24px rgba(200,70,50,.08)", overflow: "hidden" }}>

                        <Box sx={{ p: 1, display: 'flex', gap: 1 }}>
                            <TextField
                                size="small" fullWidth placeholder="Buscar por código de producto..."
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                                InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>) }}
                            />
                            <Button size="small" variant={onlyEmpty ? "contained" : "outlined"}
                                onClick={() => { setOnlyEmpty(v => !v); setPage(0); }}
                                sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}>
                                {onlyEmpty ? "Ver todos" : "Mostrar vacíos (stock 0)"}
                            </Button>
                            <Button variant="contained" color="success" onClick={exportarExcel}
                                sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}>
                                Exportar Excel
                            </Button>
                            {/* Agregar después del botón "Exportar Excel" */}

                            {/* ANTES tenías esto que abría directo el file */}
                            {/* AHORA abre el modal primero */}
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={() => setOpenCargaMasiva(true)}
                                sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                            >
                                📥 Carga Masiva Min/Max
                            </Button>
                        </Box>

                        <TableContainer sx={{ maxHeight: '60vh', overflowY: 'auto' }}>
                            <Table stickyHeader sx={{ minWidth: 800, background: "#f8f1f1" }}>
                                <TableHead>
                                    <TableRow sx={{ background: "#ffe7e1" }}>
                                        {[
                                            "Código Producto", "Imagen", "Descripcion", "Ubicación",
                                            "Cantidad Stock", "Inv. Mínimo", "Inv. Máximo", "⚠️ Faltante",
                                            "Stock JDE", "Pedimento", "OC", "Ingreso", "Acciones"
                                        ].map(col => (
                                            <TableCell key={col} sx={{ fontWeight: "bold", color: "#e23b22" }}>{col}</TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>

                                <TableBody>
                                    {paginated.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={13} align="center">No se encontraron productos</TableCell>
                                        </TableRow>
                                    ) : (
                                        paginated.map((row) => {
                                            const qty = row.cant_stock_real !== null && row.cant_stock_real !== undefined ? Number(row.cant_stock_real) : null;
                                            const invMin = row.inv_min !== null && row.inv_min !== "" ? Number(row.inv_min) : null;
                                            const invMax = row.inv_max !== null && row.inv_max !== "" ? Number(row.inv_max) : null;
                                            const invOpt = row.inv_opt !== null && row.inv_opt !== "" ? Number(row.inv_opt) : null;

                                            const tieneConfig = invMin !== null && invMax !== null;
                                            const isEmpty = tieneConfig && qty !== null && qty <= 0;
                                            const bajoMinimo = tieneConfig && qty !== null && qty <= invMin && qty > 0;

                                            // 🆕 Calcula empaques para mostrar en tabla
                                            const emp = (isEmpty || bajoMinimo) && invOpt !== null
                                                ? calcularEmpaques(invOpt, row._master, row._inner)
                                                : null;

                                            return (
                                                <TableRow
                                                    key={row.id_ubicaccion || `${row.codigo_producto}-${row.lote_serie}-${row.ingreso}`}
                                                    hover
                                                    sx={{
                                                        ...(isEmpty && {
                                                            backgroundColor: '#ffe1e1',
                                                            borderLeft: '4px solid #ff0000',
                                                            '&:hover': { backgroundColor: '#f87c7c' }
                                                        }),
                                                        ...(bajoMinimo && {
                                                            backgroundColor: '#fff3cd',
                                                            borderLeft: '4px solid #ff9800',
                                                            '&:hover': { backgroundColor: '#ffe082' }
                                                        })
                                                    }}
                                                >
                                                    <TableCell>{row.codigo_producto}</TableCell>
                                                    <TableCell><ProductImage code={row.codigo_producto} /></TableCell>
                                                    <TableCell>{row.descripcion}</TableCell>
                                                    <TableCell>{row.ubicacion}</TableCell>
                                                    <TableCell>{qty ?? "-"}</TableCell>
                                                    <TableCell>{invMin ?? "-"}</TableCell>
                                                    <TableCell>{invMax ?? "-"}</TableCell>

                                                    {/* ⚠️ FALTANTE con desglose */}
                                                    <TableCell>
                                                        {(isEmpty || bajoMinimo) && invOpt !== null ? (
                                                            <Box>
                                                                <span style={{ color: isEmpty ? "#ff0000" : "#ff9800", fontWeight: "bold", display: "block" }}>
                                                                    ⚠️ Faltan {invOpt} uds
                                                                </span>
                                                                {emp && (
                                                                    <Box sx={{ fontSize: "0.72rem", mt: 0.5, color: "#555" }}>
                                                                        {emp.masters > 0 && <span>📦 {emp.masters} Master </span>}
                                                                        {emp.inners > 0 && <span>📬 {emp.inners} Inner </span>}
                                                                        {emp.sueltas > 0 && <span>🔹 {emp.sueltas} Sueltas</span>}
                                                                    </Box>
                                                                )}
                                                            </Box>
                                                        ) : tieneConfig ? (
                                                            <span style={{ color: "#4caf50", fontWeight: "bold" }}>✅ OK</span>
                                                        ) : (
                                                            <span style={{ color: "#aaa" }}>-</span>
                                                        )}
                                                    </TableCell>

                                                    <TableCell>{stockJDE[row.codigo_producto] ?? "-"}</TableCell>
                                                    <TableCell>{row.lote_serie}</TableCell>
                                                    <TableCell>{row.oc}</TableCell>
                                                    <TableCell>
                                                        {row.ingreso && <span>{new Date(row.ingreso).toLocaleString()}</span>}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                            <Button size="small" variant="outlined"
                                                                onClick={() => {
                                                                    setRowEditando(row);
                                                                    setUbicacionEdit(row.ubicacion || "");
                                                                    setInvMinEdit(row.inv_min ?? "");
                                                                    setInvMaxEdit(row.inv_max ?? "");
                                                                    setOpenEditModal(true);
                                                                }}>
                                                                Editar
                                                            </Button>
                                                            {(isEmpty || bajoMinimo) && (
                                                                <Button variant="contained" color="warning" size="small"
                                                                    onClick={() => abrirModalSolicitud(row)}>
                                                                    Solicitar
                                                                </Button>
                                                            )}
                                                        </Box>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {/* Modal Solicitar 🆕 con desglose */}
                        <Dialog open={openModal} onClose={() => setOpenModal(false)}>
                            <DialogTitle>Solicitar Producto</DialogTitle>
                            <DialogContent>
                                <p><b>Código:</b> {productoSeleccionado?.codigo_producto}</p>
                                <p><b>Descripción:</b> {productoSeleccionado?.descripcion}</p>
                                <p><b>Stock actual:</b> {productoSeleccionado?.cant_stock_real}</p>
                                <p><b>Inv. Mínimo:</b> {productoSeleccionado?.inv_min ?? "-"}</p>
                                <p><b>Inv. Máximo:</b> {productoSeleccionado?.inv_max ?? "-"}</p>
                                <p><b>Cantidad faltante:</b> {productoSeleccionado?.inv_opt ?? "-"}</p>

                                {/* 🆕 Desglose visual */}
                                {productoSeleccionado?.inv_opt && (() => {
                                    const emp = calcularEmpaques(
                                        productoSeleccionado.inv_opt,
                                        productoSeleccionado._master,
                                        productoSeleccionado._inner
                                    );
                                    if (!emp) return null;
                                    return (
                                        <Box sx={{ mt: 1, mb: 1, p: 1.5, backgroundColor: "#fff8e1", borderRadius: 2, border: "1px solid #ffb300" }}>
                                            <p style={{ margin: 0, fontWeight: "bold", color: "#e65100" }}>📦 Desglose del pedido:</p>
                                            <Box sx={{ mt: 1, display: "flex", gap: 2, flexWrap: "wrap" }}>
                                                {emp.masters > 0 && (
                                                    <Box sx={{ textAlign: "center", p: 1, backgroundColor: "#fff", borderRadius: 1, border: "1px solid #ddd", minWidth: 80 }}>
                                                        <p style={{ margin: 0, fontSize: "1.4rem", fontWeight: "bold", color: "#1565c0" }}>{emp.masters}</p>
                                                        <p style={{ margin: 0, fontSize: "0.75rem", color: "#555" }}>Master<br />({productoSeleccionado._master} uds c/u)</p>
                                                    </Box>
                                                )}
                                                {emp.inners > 0 && (
                                                    <Box sx={{ textAlign: "center", p: 1, backgroundColor: "#fff", borderRadius: 1, border: "1px solid #ddd", minWidth: 80 }}>
                                                        <p style={{ margin: 0, fontSize: "1.4rem", fontWeight: "bold", color: "#2e7d32" }}>{emp.inners}</p>
                                                        <p style={{ margin: 0, fontSize: "0.75rem", color: "#555" }}>Inner<br />({productoSeleccionado._inner} uds c/u)</p>
                                                    </Box>
                                                )}
                                                {emp.sueltas > 0 && (
                                                    <Box sx={{ textAlign: "center", p: 1, backgroundColor: "#fff", borderRadius: 1, border: "1px solid #ddd", minWidth: 80 }}>
                                                        <p style={{ margin: 0, fontSize: "1.4rem", fontWeight: "bold", color: "#f57f17" }}>{emp.sueltas}</p>
                                                        <p style={{ margin: 0, fontSize: "0.75rem", color: "#555" }}>Sueltas</p>
                                                    </Box>
                                                )}
                                            </Box>
                                        </Box>
                                    );
                                })()}

                                <TextField label="Cantidad a solicitar" type="number" fullWidth
                                    value={cantidadSolicitada}
                                    onChange={(e) => setCantidadSolicitada(e.target.value)}
                                    sx={{ mt: 2 }} />
                            </DialogContent>
                            <DialogActions>
                                <Button onClick={() => setOpenModal(false)}>Cancelar</Button>
                                <Button onClick={enviarSolicitud} variant="contained" color="primary">Enviar Solicitud</Button>
                            </DialogActions>
                        </Dialog>

                        {/* Modal Editar */}
                        <Dialog open={openEditModal} onClose={() => setOpenEditModal(false)}>
                            <DialogTitle>Editar Producto</DialogTitle>
                            <DialogContent>
                                <p><b>ID:</b> {rowEditando?.id_ubicaccion}</p>
                                <p><b>Producto:</b> {rowEditando?.codigo_producto}</p>
                                <p><b>Descripción:</b> {rowEditando?.descripcion}</p>
                                <TextField
                                    label="Ubicación" fullWidth value={ubicacionEdit}
                                    onChange={(e) => setUbicacionEdit(e.target.value)} sx={{ mt: 2 }}
                                />
                                <TextField
                                    label="Inventario Mínimo" type="number" fullWidth value={invMinEdit}
                                    onChange={(e) => setInvMinEdit(e.target.value)} sx={{ mt: 2 }}
                                    helperText="Cantidad mínima permitida en stock"
                                />
                                <TextField
                                    label="Inventario Máximo" type="number" fullWidth value={invMaxEdit}
                                    onChange={(e) => setInvMaxEdit(e.target.value)} sx={{ mt: 2 }}
                                    helperText="Al guardar se calculará automáticamente el faltante"
                                />
                            </DialogContent>
                            <DialogActions>
                                <Button onClick={() => setOpenEditModal(false)}>Cancelar</Button>
                                <Button onClick={guardarUbicacion} variant="contained">Guardar</Button>
                            </DialogActions>
                        </Dialog>

                        {/* Modal Carga Masiva */}
                        <Dialog open={openCargaMasiva} onClose={() => setOpenCargaMasiva(false)} maxWidth="sm" fullWidth>
                            <DialogTitle>📥 Carga Masiva Min/Max</DialogTitle>
                            <DialogContent>

                                {/* PASO 1 - Descargar plantilla */}
                                <Box sx={{ p: 2, mb: 2, backgroundColor: "#f0f7ff", borderRadius: 2, border: "1px solid #90caf9" }}>
                                    <p style={{ margin: 0, fontWeight: "bold", color: "#1565c0" }}>
                                        📋 Paso 1 — Descarga la plantilla
                                    </p>
                                    <p style={{ margin: "6px 0", fontSize: "0.85rem", color: "#555" }}>
                                        Descarga el archivo Excel con el formato correcto, llena los valores de
                                        <b> inv_min</b> e <b>inv_max</b> para cada código de producto.
                                    </p>
                                    <Button
                                        variant="outlined"
                                        color="primary"
                                        size="small"
                                        onClick={() => {
                                            // 🔹 Genera plantilla con los códigos actuales
                                            const data = inventario.map(row => ({
                                                codigo_producto: row.codigo_producto,
                                                inv_min: row.inv_min ?? "",
                                                inv_max: row.inv_max ?? "",
                                            }));

                                            const ws = XLSX.utils.json_to_sheet(data);
                                            ws["!cols"] = [
                                                { wch: 20 }, // codigo_producto
                                                { wch: 12 }, // inv_min
                                                { wch: 12 }, // inv_max
                                            ];
                                            const wb = XLSX.utils.book_new();
                                            XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
                                            XLSX.writeFile(wb, "plantilla_inv_min_max.xlsx");
                                        }}
                                    >
                                        ⬇️ Descargar Plantilla Excel
                                    </Button>
                                </Box>

                                {/* PASO 2 - Subir archivo */}
                                <Box sx={{ p: 2, backgroundColor: "#f9f9f9", borderRadius: 2, border: "1px solid #ddd" }}>
                                    <p style={{ margin: 0, fontWeight: "bold", color: "#333" }}>
                                        📤 Paso 2 — Sube el archivo actualizado
                                    </p>
                                    <p style={{ margin: "6px 0", fontSize: "0.85rem", color: "#555" }}>
                                        Una vez que hayas llenado los valores, sube el archivo aquí para actualizar masivamente.
                                    </p>
                                    <Button
                                        variant="contained"
                                        color="success"
                                        component="label"
                                        size="small"
                                    >
                                        📂 Seleccionar Archivo
                                        <input
                                            hidden
                                            type="file"
                                            accept=".xlsx,.xls"
                                            onChange={(e) => {
                                                setOpenCargaMasiva(false); // cierra el modal
                                                handleCargaMasiva(e);       // ejecuta la carga
                                            }}
                                        />
                                    </Button>
                                </Box>

                            </DialogContent>
                            <DialogActions>
                                <Button onClick={() => setOpenCargaMasiva(false)}>Cerrar</Button>
                            </DialogActions>
                        </Dialog>

                        <TablePagination component="div" count={filtered.length} page={page}
                            onPageChange={handleChangePage} rowsPerPage={rowsPerPage}
                            onRowsPerPageChange={handleChangeRowsPerPage} labelRowsPerPage="Filas por página" />
                    </Paper>
                )}
            </Box>
        </div>
    );
}

export default InventarioListado;