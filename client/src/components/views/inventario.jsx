import React, { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import {
    Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    CircularProgress, Alert, TablePagination, TextField, InputAdornment, Button, Dialog, DialogTitle, DialogContent, DialogActions,
    Tabs, Tab, Chip
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
const UMBRAL_REDONDEO = 0.60;

function calcularEmpaques(faltante, master, inner) {
    if (!faltante || faltante <= 0) return null;
    const masterVal = Number(master) || 0;
    const innerVal = Number(inner) || 0;
    let masters = 0, inners = 0, sueltas = Number(faltante);

    if (masterVal > 0) {
        masters = Math.floor(sueltas / masterVal);
        sueltas = sueltas % masterVal;

        if (sueltas > 0 && sueltas >= masterVal * UMBRAL_REDONDEO) {
            masters += 1;
            return { masters, inners: 0, sueltas: 0 };
        }
    }

    if (innerVal > 0) {
        inners = Math.floor(sueltas / innerVal);
        sueltas = sueltas % innerVal;

        if (sueltas > 0 && sueltas >= innerVal * UMBRAL_REDONDEO) {
            inners += 1;
            sueltas = 0;
        } else {
            sueltas = 0; // ❌ No alcanzó ni el 60% del inner → se ignora
        }
    }

    return { masters, inners, sueltas: 0 };
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
    const [onlyFaltantes, setOnlyFaltantes] = useState(false);

    const filtered = inventario
        .filter(item => item.codigo_producto?.toLowerCase().includes(search.toLowerCase()))
        .filter(item => (onlyEmpty ? (Number(item.cant_stock_real) || 0) <= 0 : true))
        .filter(item => {  // 🆕 filtro faltantes
            if (!onlyFaltantes) return true;
            const qty = Number(item.cant_stock_real) || 0;
            const invMin = item.inv_min !== null && item.inv_min !== "" ? Number(item.inv_min) : null;
            const invMax = item.inv_max !== null && item.inv_max !== "" ? Number(item.inv_max) : null;
            const tieneConfig = invMin !== null && invMax !== null;
            return tieneConfig && (qty <= 0 || (qty <= invMin && qty > 0));
        });

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

    // 📝 Carga de la base de datos qué SKUs ya tienen una solicitud
    // registrada (en cualquier estado: No Pedido / Modificación / Autorizada),
    // para que la columna "Solicitado" no dependa solo de lo que se mandó en
    // esta sesión — persiste aunque se recargue la página.
    useEffect(() => {
        const cargarSolicitudes = async () => {
            try {
                const res = await axios.get('http://66.232.105.107:3001/api/inventario/solicitudes');
                const skus = (res.data?.data || []).map(s => String(s.sku).trim());
                setCodigosSolicitados(new Set(skus));
            } catch (err) {
                console.error('Error cargando solicitudes de inventario:', err);
            }
        };
        cargarSolicitudes();
    }, []);

    const handleChangePage = (_event, newPage) => setPage(newPage);
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    // ── Modal Solicitar ──
    const [openModal, setOpenModal] = useState(false);
    const [cantidadSolicitada, setCantidadSolicitada] = useState("");
    const [productoSeleccionado, setProductoSeleccionado] = useState(null);
    const user = JSON.parse(localStorage.getItem("user"));
    // Por ahora, poder solicitar cualquier producto (no solo los faltantes)
    // queda solo para el rol admin.
    const userRole = user?.rol;

    const abrirModalSolicitud = (row) => {
        setProductoSeleccionado(row);
        setCantidadSolicitada(row.inv_opt ?? "");  // 🆕 pre-llena con el faltante
        setOpenModal(true);
    };

    // 🆕 Manda también el desglose al correo
    const enviarSolicitud = async () => {
        const emp = calcularEmpaques(
            cantidadSolicitada,
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

    // ── Tabs: Inventario / Solicitar Inventario ──
    const [activeTab, setActiveTab] = useState(0);

    // Lista de faltantes (mismo criterio que "Mostrar faltantes"), independiente
    // del buscador, para mostrarla siempre en la pestaña "Solicitar Inventario".
    const faltantesParaSolicitar = inventario.filter(item => {
        const qty = Number(item.cant_stock_real) || 0;
        const invMin = item.inv_min !== null && item.inv_min !== "" ? Number(item.inv_min) : null;
        const invMax = item.inv_max !== null && item.inv_max !== "" ? Number(item.inv_max) : null;
        const tieneConfig = invMin !== null && invMax !== null;
        return tieneConfig && (qty <= 0 || (qty <= invMin && qty > 0));
    });

    // ── Solicitud masiva por Excel (código + cantidad) ──
    const [solicitudMasivaResultado, setSolicitudMasivaResultado] = useState(null);
    const [solicitudMasivaProcesando, setSolicitudMasivaProcesando] = useState(false);
    // 🆕 Acumula (durante la sesión) todos los códigos que ya se mandaron en
    // alguna solicitud masiva (Excel o "Solicitar todos"), para pintar la
    // columna "Solicitado" en la lista de faltantes.
    const [codigosSolicitados, setCodigosSolicitados] = useState(new Set());
    // 🆕 Vista previa de lo que trae el Excel que se acaba de subir (antes de
    // mandarlo). Reemplaza el flujo anterior de "se muestran automáticamente
    // los 647 faltantes de inventario": ahora solo se ve lo que el usuario
    // sube.
    const [productosExcelPreview, setProductosExcelPreview] = useState([]);

    const descargarPlantillaSolicitudMasiva = () => {
        const data = faltantesParaSolicitar.map(row => ({
            codigo_producto: row.codigo_producto,
            cantidad: row.inv_opt ?? "",
        }));
        const ws = XLSX.utils.json_to_sheet(data.length > 0 ? data : [{ codigo_producto: "", cantidad: "" }]);
        ws["!cols"] = [{ wch: 20 }, { wch: 12 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
        XLSX.writeFile(wb, "plantilla_solicitar_inventario.xlsx");
    };

    // 🔒 Cierre a Inner/Master: solo aplica a códigos que en el catálogo
    // tienen definidos AMBOS empaques (_inner y _master, ambos > 0). Si la
    // cantidad solicitada no es múltiplo exacto de inner NI de master, ese
    // renglón queda "sin cerrar" — se marca en rojo y hay que elegir a cuál
    // de los dos empaques se redondea. Los códigos que solo manejan PZ (sin
    // inner/master) no se validan, pasan de largo y el dato es informativo.
    // 📦 Desglosa la cantidad solicitada en cuántos MASTER, cuántos INNER y
    // cuántas piezas sueltas quedan — para que se vea a cuántos master/inner
    // equivale lo que se está pidiendo, no solo el total en piezas.
    const calcularDesglose = (cantidad, masterQty, innerQty) => {
        let restante = Number(cantidad) || 0;
        let masters = 0, inners = 0;
        if (masterQty > 1) {
            masters = Math.floor(restante / masterQty);
            restante -= masters * masterQty;
        }
        if (innerQty > 1) {
            inners = Math.floor(restante / innerQty);
            restante -= inners * innerQty;
        }
        return { masters, inners, sueltas: restante };
    };

    const construirFilaPreview = (codigo, cantidad, match) => {
        const masterQty = Number(match?._master) || 0;
        const innerQty = Number(match?._inner) || 0;
        // ⚠️ Se exige > 1 (no > 0): varios códigos traen _inner/_master en 1
        // como valor por catálogo (no representan un empaque real), y con
        // ">0" cualquier cantidad entera "cerraba" trivialmente contra ese 1
        // (cantidad % 1 siempre es 0), marcando como cerrado algo que en
        // realidad se maneja solo por pieza (como el 9507: Inner 0, Master 0).
        const aplicaCierre = masterQty > 1 && innerQty > 1;

        let cierre = null; // null = no aplica (solo PZ o no encontrado)
        if (aplicaCierre) {
            if (cantidad % masterQty === 0) cierre = 'master';
            else if (cantidad % innerQty === 0) cierre = 'inner';
            else cierre = 'ninguno';
        }

        return {
            codigo,
            cantidad,
            descripcion: match?.descripcion || '(no está en inventario)',
            ubicacion: match?.ubicacion || '-',
            stock: match?.cant_stock_real ?? '-',
            encontrado: Boolean(match),
            masterQty,
            innerQty,
            cierre,
            desglose: calcularDesglose(cantidad, masterQty, innerQty),
        };
    };

    // Redondea hacia arriba al múltiplo cerrado de inner o de master elegido,
    // y recalcula el estado (y el desglose) de esa fila — debe quedar
    // resuelta, ya no en rojo.
    const cerrarFilaPreviewA = (codigo, tipo) => {
        setProductosExcelPreview(prev => prev.map(row => {
            if (row.codigo !== codigo) return row;
            const factor = tipo === 'master' ? row.masterQty : row.innerQty;
            if (!factor) return row;
            const cantidadCerrada = Math.ceil(row.cantidad / factor) * factor;
            return {
                ...row,
                cantidad: cantidadCerrada,
                cierre: tipo,
                desglose: calcularDesglose(cantidadCerrada, row.masterQty, row.innerQty),
            };
        }));
    };

    const handleSolicitudMasivaExcel = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target.result;
                const workbook = XLSX.read(bstr, { type: "binary" });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

                const primeraFila = jsonData[0];
                if (!primeraFila?.codigo_producto && !primeraFila?.sku && !primeraFila?.SKU && !primeraFila?.codigo && !primeraFila?.Código) {
                    Swal.fire("❌ Error", "El archivo debe tener una columna 'codigo_producto' (o 'sku') y una columna 'cantidad'", "error");
                    return;
                }

                const productos = jsonData
                    .map(row => ({
                        codigo: String(row.codigo_producto || row.sku || row.SKU || row.codigo || row.Código || "").trim(),
                        cantidad: Number(row.cantidad ?? row.Cantidad ?? 0),
                    }))
                    .filter(row => row.codigo && row.cantidad > 0);

                if (productos.length === 0) {
                    Swal.fire("⚠️ Sin datos", "No se encontraron filas válidas (código + cantidad) en el archivo", "warning");
                    return;
                }

                // No se envía nada todavía: se arma una vista previa con lo que
                // trae ESTE Excel (cruzando cada código contra el inventario ya
                // cargado en pantalla para mostrar descripción/ubicación/stock),
                // para que el usuario vea exactamente qué va a solicitar antes
                // de mandarlo.
                const preview = productos.map(p => {
                    const match = inventario.find(i => String(i.codigo_producto).trim() === p.codigo);
                    return construirFilaPreview(p.codigo, p.cantidad, match);
                });

                setProductosExcelPreview(preview);
                setSolicitudMasivaResultado(null);

            } catch (err) {
                console.error(err);
                Swal.fire("❌ Error", "No se pudo leer el archivo", "error");
            }
        };

        reader.readAsBinaryString(file);
        e.target.value = "";
    };

    // Manda al backend justo lo que se muestra en la vista previa del Excel
    // (productosExcelPreview) — este es el momento en que de verdad se busca
    // en inventario, se manda el correo y se marca como "Solicitado".
    const enviarSolicitudExcelPreview = async () => {
        if (productosExcelPreview.length === 0) return;

        const sinCerrar = productosExcelPreview.filter(p => p.cierre === 'ninguno');
        if (sinCerrar.length > 0) {
            const { isConfirmed: continuarSinCerrar } = await Swal.fire({
                title: "Hay códigos sin cerrar a Inner ni Master",
                html: `<b>${sinCerrar.length}</b> código(s) no cierran ni a Inner ni a Master: ${sinCerrar.map(p => p.codigo).join(", ")}.<br/><br/>Elige "Cerrar a Master" o "Cerrar a Inner" en esa fila antes de enviar, o continúa de todas formas.`,
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Enviar de todas formas",
                cancelButtonText: "Volver a revisar",
                confirmButtonColor: "#e65100",
            });
            if (!continuarSinCerrar) return;
        }

        const { isConfirmed } = await Swal.fire({
            title: "¿Enviar esta solicitud?",
            html: `Se buscarán <b>${productosExcelPreview.length}</b> código(s) en inventario y se enviará un correo con los que sí existan.`,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Sí, enviar",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#3085d6",
        });
        if (!isConfirmed) return;

        setSolicitudMasivaProcesando(true);
        setSolicitudMasivaResultado(null);

        try {
            const productos = productosExcelPreview.map(p => ({ codigo: p.codigo, cantidad: p.cantidad }));
            const res = await axios.post(
                "http://66.232.105.107:3001/api/inventario/solicitar-producto-masivo",
                { productos, solicitante: user?.nombre || "Usuario desconocido" }
            );

            setSolicitudMasivaResultado({
                agregados: res.data?.agregados || [],
                faltan: res.data?.faltan || [],
                advertenciasEmpaque: res.data?.advertenciasEmpaque || [],
            });
            setCodigosSolicitados(prev => new Set([...prev, ...(res.data?.agregados || []).map(a => a.codigo)]));
            setProductosExcelPreview([]);

            Swal.fire(
                "✅ Solicitud enviada",
                `Se agregaron ${res.data?.agregados?.length || 0} producto(s). ${res.data?.faltan?.length ? `${res.data.faltan.length} no se encontraron.` : ""}`,
                "success"
            );
        } catch (err) {
            console.error(err);
            Swal.fire("❌ Error", "No se pudo enviar la solicitud", "error");
        } finally {
            setSolicitudMasivaProcesando(false);
        }
    };

    // 🔄 Sincronizar Faltantes: vuelve a calcular el faltante (inv_opt) y
    // recarga el inventario, sin mostrar ninguna tabla — solo para que los
    // datos contra los que se cruza el Excel estén al día antes de subirlo.
    const [sincronizandoFaltantes, setSincronizandoFaltantes] = useState(false);
    const sincronizarFaltantes = async () => {
        setSincronizandoFaltantes(true);
        try {
            await cargarInventario();
            Swal.fire({ icon: 'success', title: 'Faltantes sincronizados', timer: 1500, showConfirmButton: false });
        } catch (err) {
            Swal.fire('❌ Error', 'No se pudo sincronizar', 'error');
        } finally {
            setSincronizandoFaltantes(false);
        }
    };

    // Manda de un jalón TODOS los productos que hoy aparecen en "Productos
    // para solicitar" (mismo criterio que la lista de arriba), sin necesidad
    // de subir un Excel. Usa como cantidad el faltante (inv_opt) de cada uno.
    const handleSolicitarTodos = async () => {
        if (faltantesParaSolicitar.length === 0) {
            Swal.fire("Sin pendientes", "No hay productos faltantes por solicitar ahora mismo", "info");
            return;
        }

        const productos = faltantesParaSolicitar
            .map(row => ({
                codigo: row.codigo_producto,
                cantidad: Number(row.inv_opt) > 0 ? Number(row.inv_opt) : 1,
            }))
            .filter(p => p.codigo);

        const { isConfirmed } = await Swal.fire({
            title: "¿Solicitar todos los faltantes?",
            html: `Se enviará una sola solicitud con los <b>${productos.length}</b> producto(s) que aparecen como faltantes.`,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Sí, solicitar todos",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#3085d6",
        });

        if (!isConfirmed) return;

        setSolicitudMasivaProcesando(true);
        setSolicitudMasivaResultado(null);

        try {
            const res = await axios.post(
                "http://66.232.105.107:3001/api/inventario/solicitar-producto-masivo",
                { productos, solicitante: user?.nombre || "Usuario desconocido" }
            );

            setSolicitudMasivaResultado({
                agregados: res.data?.agregados || [],
                faltan: res.data?.faltan || [],
                advertenciasEmpaque: res.data?.advertenciasEmpaque || [],
            });
            setCodigosSolicitados(prev => new Set([...prev, ...(res.data?.agregados || []).map(a => a.codigo)]));

            Swal.fire(
                "✅ Solicitud enviada",
                `Se agregaron ${res.data?.agregados?.length || 0} producto(s). ${res.data?.faltan?.length ? `${res.data.faltan.length} no se encontraron.` : ""}`,
                "success"
            );
        } catch (err) {
            console.error(err);
            Swal.fire("❌ Error", "No se pudo enviar la solicitud", "error");
        } finally {
            setSolicitudMasivaProcesando(false);
        }
    };

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

            <Box sx={{ px: { xs: 1, sm: 3 }, mt: 2 }}>
                <Tabs
                    value={activeTab}
                    onChange={(_e, v) => setActiveTab(v)}
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab label="Inventario" />
                    <Tab label="Solicitar Inventario" />
                </Tabs>
            </Box>

            {activeTab === 1 && (
                <Box sx={{ mt: 3, mb: 2, px: { xs: 1, sm: 3 } }}>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 7 }}><CircularProgress /></Box>
                    ) : (
                        <Paper elevation={3} sx={{ borderRadius: 4, boxShadow: "0 4px 24px rgba(200,70,50,.08)", overflow: "hidden", p: 2 }}>

                            {/* Sección: carga por Excel (sku + cantidad). Por ahora NO se
                                carga automáticamente la lista de faltantes de inventario —
                                solo se trabaja con lo que el usuario sube. */}
                            <Box sx={{ p: 2, backgroundColor: "#f9f9f9", borderRadius: 2, border: "1px solid #ddd" }}>
                                <p style={{ margin: 0, fontWeight: "bold", color: "#333" }}>
                                    📊 Solicitar varios productos por Excel
                                </p>
                                <p style={{ margin: "6px 0", fontSize: "0.85rem", color: "#555" }}>
                                    Sube un Excel con las columnas <b>codigo_producto</b> (o <b>sku</b>) y <b>cantidad</b>.
                                    Se buscará cada código en inventario y se enviará un correo con los que sí existan.
                                </p>
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                                    <Button variant="outlined" color="primary" size="small" onClick={descargarPlantillaSolicitudMasiva}>
                                        ⬇️ Descargar Plantilla Excel
                                    </Button>
                                    <Button variant="contained" color="success" component="label" size="small" disabled={solicitudMasivaProcesando}>
                                        📂 Subir Excel (código + cantidad)
                                        <input hidden type="file" accept=".xlsx,.xls" onChange={handleSolicitudMasivaExcel} />
                                    </Button>
                                    <Button variant="outlined" color="secondary" size="small" disabled={sincronizandoFaltantes} onClick={sincronizarFaltantes}>
                                        {sincronizandoFaltantes ? "Sincronizando..." : "🔄 Sincronizar Faltantes"}
                                    </Button>
                                </Box>

                                {productosExcelPreview.length > 0 && (
                                    <Box sx={{ mt: 2 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                                            <p style={{ margin: 0, fontWeight: "bold", color: "#333" }}>
                                                Lo que vas a solicitar ({productosExcelPreview.length})
                                            </p>
                                            <Button
                                                variant="contained"
                                                color="error"
                                                size="small"
                                                disabled={solicitudMasivaProcesando}
                                                onClick={enviarSolicitudExcelPreview}
                                                sx={{ textTransform: 'none' }}
                                            >
                                                {solicitudMasivaProcesando ? "Enviando..." : "📨 Solicitar estos productos"}
                                            </Button>
                                        </Box>
                                        <TableContainer sx={{ maxHeight: '35vh', overflowY: 'auto', border: '1px solid #eee', borderRadius: 2 }}>
                                            <Table size="small" stickyHeader>
                                                <TableHead>
                                                    <TableRow sx={{ background: "#ffe7e1" }}>
                                                        {["Código", "Descripción", "Stock", "Cantidad a solicitar", "Master / Inner solicitados", "Empaque (Inner/Master)"].map(col => (
                                                            <TableCell key={col} sx={{ fontWeight: "bold", color: "#e23b22" }}>{col}</TableCell>
                                                        ))}
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {productosExcelPreview.map((row) => {
                                                        // 🔒 Solo se valida cierre a Inner/Master si el código maneja
                                                        // AMBOS empaques. Si cierre es null (solo PZ, o no se encontró
                                                        // en inventario) es puramente informativo, se deja pasar.
                                                        const sinCerrar = row.cierre === 'ninguno';
                                                        return (
                                                            <TableRow key={row.codigo} sx={sinCerrar ? { backgroundColor: '#ffebee' } : (!row.encontrado ? { backgroundColor: '#f5f5f5' } : undefined)}>
                                                                <TableCell>{row.codigo}</TableCell>
                                                                <TableCell>{row.descripcion}</TableCell>
                                                                <TableCell>{row.stock}</TableCell>
                                                                <TableCell>{row.cantidad} PZ</TableCell>
                                                                <TableCell>
                                                                    {row.masterQty > 1 || row.innerQty > 1 ? (
                                                                        <span style={{ fontSize: '0.8rem' }}>
                                                                            {row.desglose?.masters > 0 && <span>📦 {row.desglose.masters} Master </span>}
                                                                            {row.desglose?.inners > 0 && <span>📬 {row.desglose.inners} Inner </span>}
                                                                            {row.desglose?.sueltas > 0 && <span>🔹 {row.desglose.sueltas} PZ</span>}
                                                                            {!row.desglose?.masters && !row.desglose?.inners && !row.desglose?.sueltas && <span>0</span>}
                                                                        </span>
                                                                    ) : (
                                                                        <span style={{ color: '#aaa' }}>—</span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {row.cierre === null ? (
                                                                        <span style={{ color: '#aaa' }}>—</span>
                                                                    ) : row.cierre === 'ninguno' ? (
                                                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                                            <span style={{ color: '#d32f2f', fontWeight: 'bold', fontSize: '0.78rem' }}>
                                                                                ⚠️ No cierra a Inner ({row.innerQty}) ni a Master ({row.masterQty})
                                                                            </span>
                                                                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                                                <Button size="small" variant="outlined" onClick={() => cerrarFilaPreviewA(row.codigo, 'master')}>
                                                                                    Cerrar a Master
                                                                                </Button>
                                                                                <Button size="small" variant="outlined" onClick={() => cerrarFilaPreviewA(row.codigo, 'inner')}>
                                                                                    Cerrar a Inner
                                                                                </Button>
                                                                            </Box>
                                                                        </Box>
                                                                    ) : (
                                                                        <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>
                                                                            ✅ Cierra a {row.cierre === 'master' ? 'Master' : 'Inner'}
                                                                        </span>
                                                                    )}
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Box>
                                )}

                                {solicitudMasivaResultado && (
                                    <Box sx={{ mt: 2 }}>
                                        <p style={{ margin: "0 0 8px 0", fontWeight: "bold", color: "#333" }}>
                                            Resultado de la solicitud: {solicitudMasivaResultado.agregados.length} agregado(s), {solicitudMasivaResultado.faltan.length} no encontrado(s)
                                        </p>

                                        <TableContainer sx={{ maxHeight: '35vh', overflowY: 'auto', border: '1px solid #eee', borderRadius: 2, mb: 2 }}>
                                            <Table size="small" stickyHeader>
                                                <TableHead>
                                                    <TableRow sx={{ background: "#f0f0f0" }}>
                                                        {["Código", "Descripción", "Cantidad", "Costo total (s/IVA)", "Estado"].map(col => (
                                                            <TableCell key={col} sx={{ fontWeight: "bold" }}>{col}</TableCell>
                                                        ))}
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {solicitudMasivaResultado.agregados.length === 0 && solicitudMasivaResultado.faltan.length === 0 ? (
                                                        <TableRow><TableCell colSpan={5} align="center">Sin resultados</TableCell></TableRow>
                                                    ) : (
                                                        <>
                                                            {solicitudMasivaResultado.agregados.map((a) => {
                                                                const incompleto = a.minimoVenta && !a.minimoVenta.completo;
                                                                return (
                                                                    <TableRow key={a.codigo} sx={incompleto ? { backgroundColor: '#fff8e1' } : undefined}>
                                                                        <TableCell>{a.codigo}</TableCell>
                                                                        <TableCell>{a.descripcion || '-'}</TableCell>
                                                                        <TableCell>{a.cantidadSolicitada} PZ</TableCell>
                                                                        <TableCell>{a.costoTotalSinIva != null ? `$${Number(a.costoTotalSinIva).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '-'}</TableCell>
                                                                        <TableCell>
                                                                            {incompleto
                                                                                ? <span style={{ color: '#e65100', fontWeight: 'bold' }}>⚠️ No completa empaque ({a.minimoVenta.unidadEmpaque} de {a.minimoVenta.piezasPorEmpaque} PZ)</span>
                                                                                : <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>✅ Agregado</span>}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                );
                                                            })}
                                                            {solicitudMasivaResultado.faltan.map((codigo) => (
                                                                <TableRow key={codigo}>
                                                                    <TableCell>{codigo}</TableCell>
                                                                    <TableCell colSpan={3} sx={{ color: '#888' }}>No se encontró en inventario</TableCell>
                                                                    <TableCell><span style={{ color: '#d32f2f', fontWeight: 'bold' }}>❌ No encontrado</span></TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Box>
                                )}
                            </Box>
                        </Paper>
                    )}
                </Box>
            )}

            <Box sx={{ mt: activeTab === 0 ? 0 : 0, mb: 2, px: { xs: 1, sm: 3 }, display: activeTab === 0 ? 'block' : 'none' }}>
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

                            <Button
                                size="small"
                                variant={onlyFaltantes ? "contained" : "outlined"}
                                color="warning"
                                onClick={() => { setOnlyFaltantes(v => !v); setPage(0); }}
                                sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                            >
                                {onlyFaltantes ? "Ver todos" : "⚠️ Mostrar faltantes"}
                            </Button>


                        </Box>

                        <TableContainer sx={{ maxHeight: '60vh', overflowY: 'auto' }}>
                            <Table stickyHeader sx={{ minWidth: 800, background: "#f8f1f1" }}>
                                <TableHead>
                                    <TableRow sx={{ background: "#ffe7e1" }}>
                                        {[
                                            "Código Producto", "Imagen", "Descripcion", "Ubicación",
                                            "Cantidad Stock", "Inv. Mínimo", "Inv. Máximo", "⚠️ Faltante"
                                            , "Pedimento", "OC", "Ingreso", "Acciones"
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

                                <TextField
                                    label="Cantidad a solicitar"
                                    type="number"
                                    fullWidth
                                    size="small"
                                    sx={{ mt: 1 }}
                                    value={cantidadSolicitada}
                                    onChange={(e) => setCantidadSolicitada(e.target.value)}
                                    helperText="Se prellena con el faltante si el producto está por debajo del mínimo; si no, escribe la cantidad que quieres pedir."
                                />

                                {/* 🆕 Desglose visual (según lo que se vaya a solicitar de verdad) */}
                                {cantidadSolicitada && (() => {
                                    const emp = calcularEmpaques(
                                        cantidadSolicitada,
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