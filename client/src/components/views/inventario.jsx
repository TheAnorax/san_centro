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

// #region UTILIDADES_EMPAQUE
// Calcula masters, inners y sueltas del faltante
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
// #endregion UTILIDADES_EMPAQUE

// #region COMPONENTE_IMAGEN_PRODUCTO
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
// #endregion COMPONENTE_IMAGEN_PRODUCTO

function InventarioListado() {
    // #region ESTADO_TABLA_INVENTARIO
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
    // #endregion ESTADO_TABLA_INVENTARIO

    // #region CARGA_INVENTARIO
    const cargarInventario = async () => {
        setLoading(true);
        try {
            await axios.put('http://66.232.105.107:3001/api/inventario/recalcular-inv-opt');
            const res = await axios.get('http://66.232.105.107:3001/api/inventario/Obtenerinventario');
            const datos = res.data || [];
            setInventario(datos);
            return datos; // 👈 para poder usar los datos frescos justo después (ej. sincronizarFaltantes)
        } catch (err) {
            setError("Error al cargar el inventario");
            return [];
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
    // #endregion CARGA_INVENTARIO

    // #region PAGINACION_TABLA
    const handleChangePage = (_event, newPage) => setPage(newPage);
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    // #endregion PAGINACION_TABLA

    // #region MODAL_SOLICITAR_INDIVIDUAL
    const [openModal, setOpenModal] = useState(false);
    const [cantidadSolicitada, setCantidadSolicitada] = useState("");
    const [productoSeleccionado, setProductoSeleccionado] = useState(null);
    const user = JSON.parse(localStorage.getItem("user"));
    // Por ahora, poder solicitar cualquier producto (no solo los faltantes)
    // queda solo para el rol admin.
    const userRole = user?.rol;
    // 🔒 Se valida por rol_id (estable) y no por el nombre (frágil: mayúsculas/typos).
    // #region ACCESO_TAB_SOLICITAR_INVENTARIO
    // Por el momento SOLO admin (1) puede ver la pestaña "Solicitar Inventario".
    // Los otros roles que en algún momento la van a necesitar quedan comentados
    // aquí mismo (no borrados) para reactivarlos después:
    //   - 13 = supervisor  (manda solicitudes por Excel, sin ver Master/Inner)
    //   - 20 = Planeación  (gestiona el pedido y lo manda a pedir autorización)
    const userRolId = Number(user?.rol_id);
    const puedeVerSolicitarInventario = (
        userRolId === 1
        // || userRolId === 13 // supervisor — deshabilitado temporalmente
        // || userRolId === 20 // Planeación — deshabilitado temporalmente
    );
    // #endregion ACCESO_TAB_SOLICITAR_INVENTARIO

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

        try {
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
        } catch (err) {
            // 🆕 El backend rechaza el envío si la cantidad no alcanza ni
            // para 1 empaque mínimo de venta (ya no se manda "tal cual").
            const msg = err.response?.data?.message || "No se pudo enviar la solicitud";
            Swal.fire("⚠️ No se envió", msg, "warning");
        }
    };
    // #endregion MODAL_SOLICITAR_INDIVIDUAL

    // #region STOCK_JDE
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
    // #endregion STOCK_JDE

    // #region DISPONIBLE_7050
    // 🆕 Disponibilidad en vivo del almacén 7050 (Existencia_Fisica -
    // Comprometido), SOLO para mostrar en la tabla de "Solicitar Inventario"
    // — nunca se guarda en la base. La sincronización que sí se guarda
    // (cant_stock_real) sigue siendo la del almacén 7240.
    const [disponible7050, setDisponible7050] = useState({});
    const [cargandoDisponible7050, setCargandoDisponible7050] = useState(false);

    const cargarDisponible7050 = async () => {
        setCargandoDisponible7050(true);
        try {
            const res = await axios.get("http://66.232.105.107:3001/api/inventario/disponibilidad-santul", { params: { almacen: "7050" } });
            setDisponible7050(res.data?.disponibilidad || {});
        } catch (error) {
            console.error("Error cargando disponibilidad 7050:", error);
        } finally {
            setCargandoDisponible7050(false);
        }
    };
    // #endregion DISPONIBLE_7050

    // #region EXPORTAR_EXCEL_INVENTARIO
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
    // #endregion EXPORTAR_EXCEL_INVENTARIO

    // #region CARGA_MASIVA_MIN_MAX
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
    // #endregion CARGA_MASIVA_MIN_MAX

    // #region TABS_INVENTARIO_SOLICITAR
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
    // #endregion TABS_INVENTARIO_SOLICITAR

    // #region SOLICITUD_MASIVA_EXCEL_ESTADO
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
    // #endregion SOLICITUD_MASIVA_EXCEL_ESTADO

    // #region BANDEJA_PLANEACION
    // 🆕 Bandeja de Planeación: ve las solicitudes ya mandadas (guardadas en
    // solicitudes_inventario) y las mueve en el flujo de estados
    // No Pedido -> Modificación (a esto le llamamos "revisión" en pantalla)
    // -> Autorizada. Solo Planeación (rol_id 20) y admin (rol_id 1) la ven.
    const puedeGestionarSolicitudes = userRolId === 20 || userRolId === 1;
    const [solicitudesPlaneacion, setSolicitudesPlaneacion] = useState([]);
    const [cargandoSolicitudesPlaneacion, setCargandoSolicitudesPlaneacion] = useState(false);
    // 🆕 Las cantidades ya no se editan siempre abiertas (causaba líos al
    // escribir); se activa un modo edición con un botón general y ahí sí se
    // pueden modificar todas las cantidades del pedido.
    const [editandoCantidadesPlaneacion, setEditandoCantidadesPlaneacion] = useState(false);

    const cargarSolicitudesPlaneacion = async () => {
        setCargandoSolicitudesPlaneacion(true);
        try {
            const res = await axios.get('http://66.232.105.107:3001/api/inventario/solicitudes');
            setSolicitudesPlaneacion(res.data?.data || []);
        } catch (err) {
            console.error('Error cargando solicitudes para Planeación:', err);
        } finally {
            setCargandoSolicitudesPlaneacion(false);
        }
    };

    useEffect(() => {
        if (puedeGestionarSolicitudes) {
            cargarSolicitudesPlaneacion();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [puedeGestionarSolicitudes]);

    // 🆕 Ya no se descarga/sube Excel manualmente: cada vez que se entra a la
    // pestaña "Solicitar Inventario" se sincroniza solo y se arma la vista
    // previa de faltantes automáticamente (mismo criterio que el botón
    // "Sincronizar Faltantes" de antes, ahora automático).
    useEffect(() => {
        if (activeTab === 1 && puedeVerSolicitarInventario) {
            sincronizarFaltantes();
            cargarDisponible7050();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, puedeVerSolicitarInventario]);

    // 🔒 Mismo criterio de cierre a Inner/Master que la vista previa del Excel:
    // solo aplica si el código tiene AMBOS empaques definidos (>1). Si no,
    // es informativo (solo PZ) y no bloquea nada.
    const calcularCierreSolicitud = (cantidad, masterQty, innerQty) => {
        const desglose = calcularDesglose(cantidad, masterQty, innerQty);
        const aplicaCierre = masterQty > 1 && innerQty > 1;
        let cierre = null;
        if (aplicaCierre) {
            if (cantidad % masterQty === 0) cierre = 'master';
            else if (cantidad % innerQty === 0) cierre = 'inner';
            else cierre = 'ninguno';
        }
        return { cierre, desglose };
    };

    // Cambia la cantidad solo en pantalla (mientras Planeación sigue escribiendo).
    const editarCantidadSolicitudLocal = (id, nuevaCantidad) => {
        setSolicitudesPlaneacion(prev => prev.map(s => s.id === id ? { ...s, cantidad: nuevaCantidad } : s));
    };

    // Al salir del campo, se guarda de verdad en la base de datos.
    const guardarCantidadSolicitud = async (id, cantidad) => {
        const cantidadNum = Number(cantidad);
        if (!Number.isFinite(cantidadNum) || cantidadNum <= 0) return;
        try {
            await axios.put(`http://66.232.105.107:3001/api/inventario/solicitudes/${id}/cantidad`, {
                cantidad: cantidadNum,
                modificadoPor: user?.nombre || "Usuario desconocido",
            });
        } catch (err) {
            console.error(err);
            Swal.fire('❌ Error', 'No se pudo guardar la cantidad', 'error');
        }
    };

    // 📨 Manda TODO el pedido a PEDIR autorización de un solo golpe (no uno
    // por uno). Esto NO autoriza directo: le manda un correo a Dirección con
    // el resumen (total ya recalculado) y dos botones (Autorizar/Cancelar)
    // para que resuelva desde ahí, sin entrar al sistema.
    const autorizarLoteSolicitudes = async () => {
        const pendientes = solicitudesPlaneacion.filter(s => s.estado === 'No Pedido' || s.estado === 'Modificacion');
        if (pendientes.length === 0) return;

        const { isConfirmed } = await Swal.fire({
            title: "¿Mandar este pedido a pedir autorización?",
            html: `Se mandará un correo a Dirección para autorizar <b>${pendientes.length}</b> producto(s) de esta solicitud.`,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Sí, mandar a autorizar",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#3085d6",
        });
        if (!isConfirmed) return;

        try {
            await axios.put('http://66.232.105.107:3001/api/inventario/solicitudes/autorizar-lote', {
                ids: pendientes.map(s => s.id),
                modificadoPor: user?.nombre || "Usuario desconocido",
            });
            setSolicitudesPlaneacion(prev => prev.map(s => (
                pendientes.some(p => p.id === s.id) ? { ...s, estado: 'Pendiente Autorizacion' } : s
            )));
            Swal.fire("📨 Enviado", `Se mandó a pedir autorización a Dirección (${pendientes.length} producto(s)).`, "success");
        } catch (err) {
            console.error(err);
            Swal.fire("❌ Error", "No se pudo mandar a pedir autorización", "error");
        }
    };

    // 👀 Una vez autorizado, el pedido ya salió de esta bandeja de trabajo —
    // no hace falta seguir viéndolo aquí (Cancelada sí se deja visible, por
    // si hay que revisar por qué se canceló).
    const solicitudesVisiblesPlaneacion = solicitudesPlaneacion.filter(s => s.estado !== 'Autorizada');

    // 🏭 Marca TODO el pedido (todos los SKUs con ese numero_pedido) como ya
    // registrado en CEDIS — ya no hace falta subir ningún archivo en la otra
    // aplicación para ese pedido.
    const marcarPedidoRegistradoCedis = async (numeroPedido) => {
        const { isConfirmed } = await Swal.fire({
            title: `¿Marcar el pedido #${numeroPedido} como registrado en CEDIS?`,
            html: `Todos los productos de este pedido quedarán marcados como ya registrados.`,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Sí, ya está en CEDIS",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#3085d6",
        });
        if (!isConfirmed) return;

        try {
            await axios.put(`http://66.232.105.107:3001/api/inventario/solicitudes/pedido/${numeroPedido}/registrar-cedis`, {
                modificadoPor: user?.nombre || "Usuario desconocido",
            });
            setSolicitudesPlaneacion(prev => prev.map(s => (
                s.numero_pedido === numeroPedido ? { ...s, registrado_cedis: 1 } : s
            )));
            Swal.fire("✅ Registrado", `El pedido #${numeroPedido} quedó marcado como registrado en CEDIS.`, "success");
        } catch (err) {
            console.error(err);
            Swal.fire("❌ Error", "No se pudo marcar el pedido como registrado en CEDIS", "error");
        }
    };
    // #endregion BANDEJA_PLANEACION

    // #region PLANTILLA_EXCEL_Y_CIERRE_INNER_MASTER
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

    // 🆕 Cierre automático a Inner/Master: ya no se pregunta nada ni hay que
    // elegir manualmente — la cantidad SIEMPRE se redondea hacia ARRIBA al
    // siguiente Master o Inner completo, nunca quedan piezas sueltas. Se
    // aplica en cuanto el código tenga Master O Inner definido (no hace
    // falta que tenga los DOS) — solo los códigos que de plano no manejan
    // ningún empaque (puro PZ) se dejan tal cual, sin redondear nada.
    const cerrarAutomaticoInnerMaster = (cantidad, masterQty, innerQty) => {
        const cant = Number(cantidad) || 0;
        const tieneMaster = masterQty > 1;
        const tieneInner = innerQty > 1;

        if (tieneMaster && !tieneInner) {
            // Solo maneja Master: redondea directo hacia arriba al Master completo.
            const masters = Math.ceil(cant / masterQty);
            return { cantidadFinal: masters * masterQty, cierre: 'master', desglose: { masters, inners: 0, sueltas: 0 } };
        }

        if (!tieneMaster && tieneInner) {
            // Solo maneja Inner: redondea directo hacia arriba al Inner completo.
            const inners = Math.ceil(cant / innerQty);
            return { cantidadFinal: inners * innerQty, cierre: 'inner', desglose: { masters: 0, inners, sueltas: 0 } };
        }

        // Maneja ambos: saca los Master completos que quepan, y lo que
        // sobra (aunque sea 1 pieza) siempre se redondea hacia arriba al
        // Inner completo más cercano.
        let restante = cant;
        const masters = Math.floor(restante / masterQty);
        restante -= masters * masterQty;

        let inners = 0;
        if (restante > 0) {
            inners = Math.ceil(restante / innerQty); // 👈 siempre hacia arriba
        }

        const cantidadFinal = masters * masterQty + inners * innerQty;
        const cierre = inners > 0 ? 'inner' : 'master';
        return { cantidadFinal, cierre, desglose: { masters, inners, sueltas: 0 } };
    };

    const construirFilaPreview = (codigo, cantidad, match) => {
        const masterQty = Number(match?._master) || 0;
        const innerQty = Number(match?._inner) || 0;
        // ⚠️ Se exige > 1 (no > 0): varios códigos traen _inner/_master en 1
        // como valor por catálogo (no representan un empaque real), y con
        // ">0" cualquier cantidad entera "cerraba" trivialmente contra ese 1
        // (cantidad % 1 siempre es 0), marcando como cerrado algo que en
        // realidad se maneja solo por pieza (como el 9507: Inner 0, Master 0).
        // 🆕 Basta con que tenga Master O Inner (no hace falta que tenga los
        // dos) para que se le aplique el cierre automático — solo los
        // códigos que de plano no manejan ningún empaque (puro PZ) quedan
        // sin redondear.
        const aplicaCierre = masterQty > 1 || innerQty > 1;

        let cierre = null; // null = no aplica (solo PZ o no encontrado)
        let cantidadFinal = cantidad;
        let desglose = calcularDesglose(cantidad, masterQty, innerQty);

        if (aplicaCierre) {
            const resultado = cerrarAutomaticoInnerMaster(cantidad, masterQty, innerQty);
            cierre = resultado.cierre;
            cantidadFinal = resultado.cantidadFinal;
            desglose = resultado.desglose;
        }

        return {
            codigo,
            cantidad: cantidadFinal,
            descripcion: match?.descripcion || '(no está en inventario)',
            ubicacion: match?.ubicacion || '-',
            stock: match?.cant_stock_real ?? '-',
            encontrado: Boolean(match),
            masterQty,
            innerQty,
            cierre,
            desglose,
        };
    };
    // #endregion PLANTILLA_EXCEL_Y_CIERRE_INNER_MASTER

    // #region SUBIR_EXCEL_SOLICITUD
    // 🆕 Ya no existe carga manual de Excel: la vista previa de faltantes se
    // arma sola (ver sincronizarFaltantes + useEffect de activeTab === 1).
    // #endregion SUBIR_EXCEL_SOLICITUD

    // #region ENVIAR_SOLICITUD_EXCEL_PREVIEW
    // Manda al backend justo lo que se muestra en la vista previa del Excel
    // (productosExcelPreview) — este es el momento en que de verdad se busca
    // en inventario, se manda el correo y se marca como "Solicitado".
    const enviarSolicitudExcelPreview = async () => {
        if (productosExcelPreview.length === 0) return;

        // 🆕 Ya no existe el estado "sin cerrar": el cierre a Inner/Master
        // ahora siempre se redondea automático (hacia arriba) al armar la
        // vista previa (ver cerrarAutomaticoInnerMaster), así que aquí ya
        // no hace falta advertir ni pedir que se elija nada manualmente.

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
                excluidosPorEmpaque: res.data?.excluidosPorEmpaque || [],
            });
            setCodigosSolicitados(prev => new Set([...prev, ...(res.data?.agregados || []).map(a => a.codigo)]));
            setProductosExcelPreview([]);

            Swal.fire(
                "✅ Solicitud enviada",
                `Se agregaron ${res.data?.agregados?.length || 0} producto(s). ${res.data?.faltan?.length ? `${res.data.faltan.length} no se encontraron.` : ""}${res.data?.excluidosPorEmpaque?.length ? ` ${res.data.excluidosPorEmpaque.length} no alcanzaron ni 1 empaque mínimo.` : ""}`,
                "success"
            );
        } catch (err) {
            console.error(err);
            Swal.fire("❌ Error", "No se pudo enviar la solicitud", "error");
        } finally {
            setSolicitudMasivaProcesando(false);
        }
    };
    // #endregion ENVIAR_SOLICITUD_EXCEL_PREVIEW

    // #region SINCRONIZAR_FALTANTES
    // 🔄 Sincronizar Faltantes: vuelve a calcular el faltante (inv_opt) y
    // recarga el inventario, sin mostrar ninguna tabla — solo para que los
    // datos contra los que se cruza el Excel estén al día antes de subirlo.
    const [sincronizandoFaltantes, setSincronizandoFaltantes] = useState(false);
    // 🆕 Ya no hace falta subir Excel para ver qué solicitar: sincroniza el
    // inventario (recalcula inv_opt) y arma la vista previa directo con los
    // faltantes que la propia app ya calculó (mismo criterio que "⚠️ Mostrar
    // faltantes" en la pestaña Inventario), usando inv_opt como cantidad.
    const sincronizarFaltantes = async () => {
        setSincronizandoFaltantes(true);
        try {
            const datos = await cargarInventario();

            const faltantes = (datos || []).filter(item => {
                const qty = Number(item.cant_stock_real) || 0;
                const invMin = item.inv_min !== null && item.inv_min !== "" ? Number(item.inv_min) : null;
                const invMax = item.inv_max !== null && item.inv_max !== "" ? Number(item.inv_max) : null;
                const tieneConfig = invMin !== null && invMax !== null;
                return tieneConfig && (qty <= 0 || (qty <= invMin && qty > 0));
            });

            const preview = faltantes
                .map(item => ({ codigo: item.codigo_producto, cantidad: Number(item.inv_opt) || 0, match: item }))
                .filter(p => p.cantidad > 0)
                .map(p => construirFilaPreview(p.codigo, p.cantidad, p.match));

            setProductosExcelPreview(preview);
            setSolicitudMasivaResultado(null);

            Swal.fire({ icon: 'success', title: `${preview.length} faltante(s) sincronizado(s)`, timer: 1500, showConfirmButton: false });
        } catch (err) {
            Swal.fire('❌ Error', 'No se pudo sincronizar', 'error');
        } finally {
            setSincronizandoFaltantes(false);
        }
    };
    // #endregion SINCRONIZAR_FALTANTES

    // #region SOLICITAR_TODOS_FALTANTES_LEGACY
    // ⚠️ Ya no tiene botón en pantalla (se reemplazó por el flujo de subir
    // Excel + vista previa). Se deja la función por si se vuelve a necesitar
    // un acceso directo para pedir todos los faltantes de un jalón.
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
                excluidosPorEmpaque: res.data?.excluidosPorEmpaque || [],
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
    // #endregion SOLICITAR_TODOS_FALTANTES_LEGACY

    // #region MODAL_EDICION_PRODUCTO
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
    // #endregion MODAL_EDICION_PRODUCTO

    // #region RENDER_HEADER_Y_TABS_NAV
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
                    {puedeVerSolicitarInventario && <Tab label="Solicitar Inventario" />}
                </Tabs>
            </Box>
            {/* #endregion RENDER_HEADER_Y_TABS_NAV */}

            {/* #region RENDER_TAB_SOLICITAR_INVENTARIO */}
            {activeTab === 1 && puedeVerSolicitarInventario && (
                <Box sx={{ mt: 3, mb: 2, px: { xs: 1, sm: 3 } }}>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 7 }}><CircularProgress /></Box>
                    ) : (
                        <Paper elevation={3} sx={{ borderRadius: 4, boxShadow: "0 4px 24px rgba(200,70,50,.08)", overflow: "hidden", p: 2 }}>

                            {/* #region UI_SUBIR_EXCEL_SOLICITUD */}
                            {/* 🆕 Ya no hay botones de descargar/subir Excel ni de
                                sincronizar manualmente: al entrar a esta pestaña se
                                sincroniza solo (ver useEffect de activeTab === 1) y
                                la vista previa de faltantes aparece directo abajo. */}
                            {sincronizandoFaltantes && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, color: '#777' }}>
                                    <CircularProgress size={16} />
                                    <span style={{ fontSize: '0.85rem' }}>Sincronizando faltantes...</span>
                                </Box>
                            )}
                            {/* #endregion UI_SUBIR_EXCEL_SOLICITUD */}

                                {/* #region UI_BANDEJA_PLANEACION */}
                                {/* 🆕 Bandeja de Planeación: revisar solicitudes ya mandadas y
                                    moverlas de No Pedido -> Revisión (Modificación) -> Autorizada. */}
                                {puedeGestionarSolicitudes && (
                                    <Box sx={{ mt: 3 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                                            <p style={{ margin: 0, fontWeight: "bold", color: "#333" }}>
                                                📋 Pedido de solicitudes ({solicitudesVisiblesPlaneacion.length})
                                            </p>
                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                <Button variant="outlined" size="small" disabled={cargandoSolicitudesPlaneacion} onClick={cargarSolicitudesPlaneacion}>
                                                    {cargandoSolicitudesPlaneacion ? "Cargando..." : "🔄 Actualizar"}
                                                </Button>
                                                <Button
                                                    variant={editandoCantidadesPlaneacion ? "contained" : "outlined"}
                                                    color="secondary"
                                                    size="small"
                                                    onClick={() => setEditandoCantidadesPlaneacion(v => !v)}
                                                    sx={{ textTransform: 'none' }}
                                                >
                                                    {editandoCantidadesPlaneacion ? "🔒 Terminar edición" : "✏️ Modificar cantidades"}
                                                </Button>
                                                <Button
                                                    variant="contained"
                                                    color="primary"
                                                    size="small"
                                                    disabled={!solicitudesVisiblesPlaneacion.some(s => s.estado === 'No Pedido' || s.estado === 'Modificacion')}
                                                    onClick={autorizarLoteSolicitudes}
                                                    sx={{ textTransform: 'none' }}
                                                >
                                                    📨 Mandar todo a autorizar
                                                </Button>
                                            </Box>
                                        </Box>
                                        {solicitudesVisiblesPlaneacion.length === 0 ? (
                                            <p style={{ fontSize: '0.85rem', color: '#888' }}>No hay solicitudes pendientes.</p>
                                        ) : (
                                            <TableContainer sx={{ maxHeight: '45vh', overflowY: 'auto', border: '1px solid #eee', borderRadius: 2 }}>
                                                <Table size="small" stickyHeader>
                                                    <TableHead>
                                                        <TableRow sx={{ background: "#e3f2fd" }}>
                                                            {["Pedido #", "SKU", "Descripción", "Cantidad", "Empaque (Inner/Master)", "Estado", "CEDIS"].map(col => (
                                                                <TableCell key={col} sx={{ fontWeight: "bold" }}>{col}</TableCell>
                                                            ))}
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {solicitudesVisiblesPlaneacion.map((s) => {
                                                            const masterQty = Number(s._master) || 0;
                                                            const innerQty = Number(s._inner) || 0;
                                                            const { cierre, desglose } = calcularCierreSolicitud(Number(s.cantidad) || 0, masterQty, innerQty);
                                                            const sinCerrar = cierre === 'ninguno';
                                                            const bloqueada = s.estado === 'Autorizada' || s.estado === 'Pendiente Autorizacion' || s.estado === 'Cancelada';
                                                            return (
                                                                <TableRow key={s.id} sx={sinCerrar ? { backgroundColor: '#ffebee' } : undefined}>
                                                                    <TableCell>{s.numero_pedido ?? '-'}</TableCell>
                                                                    <TableCell>{s.sku}</TableCell>
                                                                    <TableCell>{s.descripcion || '(no está en catálogo)'}</TableCell>
                                                                    <TableCell>
                                                                        {editandoCantidadesPlaneacion && !bloqueada ? (
                                                                            <TextField
                                                                                size="small"
                                                                                type="number"
                                                                                value={s.cantidad}
                                                                                onChange={(e) => editarCantidadSolicitudLocal(s.id, e.target.value)}
                                                                                onBlur={(e) => guardarCantidadSolicitud(s.id, e.target.value)}
                                                                                sx={{ width: 90 }}
                                                                            />
                                                                        ) : (
                                                                            <span>{s.cantidad} PZ</span>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {cierre === null ? (
                                                                            <span style={{ color: '#aaa' }}>—</span>
                                                                        ) : (
                                                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                                                                                <span style={{ fontSize: '0.78rem' }}>
                                                                                    {desglose?.masters > 0 && <span>📦 {desglose.masters} Master </span>}
                                                                                    {desglose?.inners > 0 && <span>📬 {desglose.inners} Inner </span>}
                                                                                    {desglose?.sueltas > 0 && <span>🔹 {desglose.sueltas} PZ</span>}
                                                                                </span>
                                                                                {sinCerrar ? (
                                                                                    <span style={{ color: '#d32f2f', fontWeight: 'bold', fontSize: '0.75rem' }}>
                                                                                        ⚠️ No cierra a Inner ({innerQty}) ni a Master ({masterQty})
                                                                                    </span>
                                                                                ) : (
                                                                                    <span style={{ color: '#2e7d32', fontWeight: 'bold', fontSize: '0.75rem' }}>
                                                                                        ✅ Cierra a {cierre === 'master' ? 'Master' : 'Inner'}
                                                                                    </span>
                                                                                )}
                                                                            </Box>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Chip
                                                                            size="small"
                                                                            label={
                                                                                s.estado === 'Modificacion' ? 'En revisión'
                                                                                    : s.estado === 'Pendiente Autorizacion' ? 'Pendiente de autorizar'
                                                                                        : s.estado === 'Cancelada' ? 'Cancelado'
                                                                                            : s.estado
                                                                            }
                                                                            color={
                                                                                s.estado === 'Autorizada' ? 'success'
                                                                                    : s.estado === 'Cancelada' ? 'error'
                                                                                        : s.estado === 'Pendiente Autorizacion' ? 'info'
                                                                                            : s.estado === 'Modificacion' ? 'warning'
                                                                                                : 'default'
                                                                            }
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {s.registrado_cedis ? (
                                                                            <span style={{ color: '#2e7d32', fontWeight: 'bold', fontSize: '0.78rem' }}>✅ Registrado</span>
                                                                        ) : (
                                                                            <Button
                                                                                size="small"
                                                                                variant="outlined"
                                                                                onClick={() => marcarPedidoRegistradoCedis(s.numero_pedido)}
                                                                                disabled={!s.numero_pedido}
                                                                                sx={{ textTransform: 'none' }}
                                                                            >
                                                                                Marcar en CEDIS
                                                                            </Button>
                                                                        )}
                                                                    </TableCell>
                                                                </TableRow>
                                                            );
                                                        })}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                        )}
                                    </Box>
                                )}
                                {/* #endregion UI_BANDEJA_PLANEACION */}

                                {/* #region UI_PREVIEW_EXCEL_ANTES_DE_ENVIAR */}
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
                                                        {[
                                                            "Código", "Descripción", "Stock", "Cantidad a solicitar",
                                                            // 🆕 Disponible en vivo del almacén 7050 (Existencia_Fisica -
                                                            // Comprometido) — solo informativo, no se guarda en la base.
                                                            "Disponible (7050)",
                                                            // 🔒 El desglose Master/Inner y la validación de cierre de
                                                            // empaque son cosas que solo el admin necesita ver/resolver;
                                                            // otros roles (ej. supervisor) solo ven qué están pidiendo
                                                            // y el botón de mandarlo.
                                                            ...(userRole === 'admin' ? ["Master / Inner solicitados", "Empaque (Inner/Master)"] : []),
                                                        ].map(col => (
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
                                                                    {cargandoDisponible7050
                                                                        ? <span style={{ color: '#aaa' }}>...</span>
                                                                        : (disponible7050[String(row.codigo).trim()] ?? <span style={{ color: '#aaa' }}>—</span>)}
                                                                </TableCell>
                                                                {userRole === 'admin' && (
                                                                    <>
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
                                                                            ) : (
                                                                                // 🆕 Ya no hay botones ni estado "no cierra": la cantidad
                                                                                // siempre se redondeó hacia arriba automáticamente al
                                                                                // armar la vista previa, así que aquí siempre cierra.
                                                                                <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>
                                                                                    ✅ Cierra a {row.cierre === 'master' ? 'Master' : 'Inner'}
                                                                                </span>
                                                                            )}
                                                                        </TableCell>
                                                                    </>
                                                                )}
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Box>
                                )}
                                {/* #endregion UI_PREVIEW_EXCEL_ANTES_DE_ENVIAR */}

                                {/* #region UI_RESULTADO_ENVIO_SOLICITUD */}
                                {solicitudMasivaResultado && (
                                    <Box sx={{ mt: 2 }}>
                                        <p style={{ margin: "0 0 8px 0", fontWeight: "bold", color: "#333" }}>
                                            Resultado de la solicitud: {solicitudMasivaResultado.agregados.length} agregado(s), {solicitudMasivaResultado.faltan.length} no encontrado(s)
                                            {solicitudMasivaResultado.excluidosPorEmpaque?.length > 0 ? `, ${solicitudMasivaResultado.excluidosPorEmpaque.length} excluido(s) por empaque incompleto` : ""}
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
                                                    {solicitudMasivaResultado.agregados.length === 0 && solicitudMasivaResultado.faltan.length === 0 && !solicitudMasivaResultado.excluidosPorEmpaque?.length ? (
                                                        <TableRow><TableCell colSpan={5} align="center">Sin resultados</TableCell></TableRow>
                                                    ) : (
                                                        <>
                                                            {solicitudMasivaResultado.agregados.map((a) => (
                                                                <TableRow key={a.codigo}>
                                                                    <TableCell>{a.codigo}</TableCell>
                                                                    <TableCell>{a.descripcion || '-'}</TableCell>
                                                                    <TableCell>{a.cantidadSolicitada} PZ</TableCell>
                                                                    <TableCell>{a.costoTotalSinIva != null ? `$${Number(a.costoTotalSinIva).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '-'}</TableCell>
                                                                    <TableCell>
                                                                        <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>✅ Agregado</span>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                            {solicitudMasivaResultado.faltan.map((codigo) => (
                                                                <TableRow key={codigo}>
                                                                    <TableCell>{codigo}</TableCell>
                                                                    <TableCell colSpan={3} sx={{ color: '#888' }}>No se encontró en inventario</TableCell>
                                                                    <TableCell><span style={{ color: '#d32f2f', fontWeight: 'bold' }}>❌ No encontrado</span></TableCell>
                                                                </TableRow>
                                                            ))}
                                                            {/* 🆕 Ya no se manda "tal cual, sin redondear": estos códigos
                                                                no alcanzaban ni para 1 empaque mínimo de venta, así que se
                                                                excluyeron por completo (no se mandaron, no se cotizaron). */}
                                                            {(solicitudMasivaResultado.excluidosPorEmpaque || []).map((e) => (
                                                                <TableRow key={`excluido-${e.codigo}`} sx={{ backgroundColor: '#ffebee' }}>
                                                                    <TableCell>{e.codigo}</TableCell>
                                                                    <TableCell colSpan={3} sx={{ color: '#888' }}>
                                                                        Pedía {e.cantidadSolicitada} PZ, pero el empaque mínimo es {e.unidadEmpaque} de {e.piezasPorEmpaque} PZ
                                                                    </TableCell>
                                                                    <TableCell><span style={{ color: '#d32f2f', fontWeight: 'bold' }}>⚠️ Excluido</span></TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Box>
                                )}
                                {/* #endregion UI_RESULTADO_ENVIO_SOLICITUD */}
                        </Paper>
                    )}
                </Box>
            )}

            {/* #endregion RENDER_TAB_SOLICITAR_INVENTARIO */}

            {/* #region RENDER_TAB_INVENTARIO */}
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

                        {/* #region MODAL_SOLICITAR_INDIVIDUAL_UI */}
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
                        {/* #endregion MODAL_SOLICITAR_INDIVIDUAL_UI */}

                        {/* #region MODAL_EDICION_PRODUCTO_UI */}
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
                        {/* #endregion MODAL_EDICION_PRODUCTO_UI */}

                        {/* #region MODAL_CARGA_MASIVA_UI */}
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
                        {/* #endregion MODAL_CARGA_MASIVA_UI */}

                        <TablePagination component="div" count={filtered.length} page={page}
                            onPageChange={handleChangePage} rowsPerPage={rowsPerPage}
                            onRowsPerPageChange={handleChangeRowsPerPage} labelRowsPerPage="Filas por página" />
                    </Paper>
                )}
            </Box>
            {/* #endregion RENDER_TAB_INVENTARIO */}
        </div>
    );
}

export default InventarioListado;