import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    Box, Button, Typography, Table, TableHead, TableBody,
    TableRow, TableCell, TableContainer, Paper, Select,
    MenuItem, FormControl, InputLabel, Chip, Checkbox,
    TextField, IconButton, Tooltip, Modal, Tabs, Tab, Divider, TableFooter, Popover
} from '@mui/material';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { FaTimes } from "react-icons/fa";
import { BsFileEarmarkExcel } from "react-icons/bs";
// import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
// import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import SyncOutlinedIcon from '@mui/icons-material/SyncOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import BorderColorIcon from '@mui/icons-material/BorderColor';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import SaveIcon from '@mui/icons-material/Save';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import axios from 'axios';

const LS_KEY = 'plan_rutas_data';
const LS_EXPIRY = 10 * 365 * 24 * 60 * 60 * 1000;

const guardarLS = (rutas, pedidos) => {
    const payload = { rutas, pedidos, timestamp: Date.now(), expiry: Date.now() + LS_EXPIRY };
    localStorage.setItem(LS_KEY, JSON.stringify(payload));
};

const cargarLS = () => {
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (Date.now() > data.expiry) { localStorage.removeItem(LS_KEY); return null; }
        return data;
    } catch { return null; }
};

const formatMoney = (value) => {
    const num = parseFloat(value || 0);
    return num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};


// 📅 Calendario personalizado (selector de día)
const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS_ES = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const pad2 = n => String(n).padStart(2, '0');

const CalendarioDia = ({ value, onChange }) => {
    const [anchor, setAnchor] = useState(null);
    const hoy = new Date().toLocaleDateString('en-CA');
    const base = value || hoy;
    const [vista, setVista] = useState({ y: +base.slice(0, 4), m: +base.slice(5, 7) - 1 });

    const abrir = (e) => {
        const b = value || hoy;
        setVista({ y: +b.slice(0, 4), m: +b.slice(5, 7) - 1 });
        setAnchor(e.currentTarget);
    };
    const mover = (d) => setVista(v => {
        const n = new Date(v.y, v.m + d, 1);
        return { y: n.getFullYear(), m: n.getMonth() };
    });
    const elegir = (iso) => { onChange(iso); setAnchor(null); };

    const primero = new Date(vista.y, vista.m, 1).getDay();
    const diasMes = new Date(vista.y, vista.m + 1, 0).getDate();
    const celdas = [];
    for (let i = 0; i < primero; i++) celdas.push(null);
    for (let d = 1; d <= diasMes; d++) celdas.push(`${vista.y}-${pad2(vista.m + 1)}-${pad2(d)}`);

    const sel = value ? new Date(+value.slice(0, 4), +value.slice(5, 7) - 1, +value.slice(8, 10)) : null;
    const textoBoton = value ? `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}` : 'Elegir día';

    return (
        <>
            <Box onClick={abrir} sx={{
                display: 'inline-flex', alignItems: 'center', gap: 0.8, cursor: 'pointer', userSelect: 'none',
            }}>
                <CalendarMonthOutlinedIcon fontSize="small" sx={{ color: value ? '#2f6fed' : '#9aa3b2' }} />
                <Typography sx={{ fontSize: 14, color: '#374151' }}>{textoBoton}</Typography>
            </Box>
            <Popover open={!!anchor} anchorEl={anchor} onClose={() => setAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                slotProps={{ paper: { sx: { mt: 1, borderRadius: 4, width: 290, overflow: 'hidden', boxShadow: '0 12px 32px rgba(16,24,40,0.18)' } } }}>
                <Box sx={{ bgcolor: '#6c4fd1', color: '#fff', px: 2, py: 1.5 }}>
                    <Typography sx={{ fontSize: 12, opacity: 0.85 }}>{sel ? DIAS_ES[sel.getDay()] : 'Sin día elegido'}</Typography>
                    <Typography sx={{ fontSize: 20, fontWeight: 600 }}>
                        {sel ? `${sel.getDate()} ${MESES_ES[sel.getMonth()].slice(0, 3).toLowerCase()} ${sel.getFullYear()}` : 'Todo el mes'}
                    </Typography>
                </Box>
                <Box sx={{ p: 1.5 }}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                        <IconButton size="small" onClick={() => mover(-1)}><ChevronLeftIcon fontSize="small" /></IconButton>
                        <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{MESES_ES[vista.m]} {vista.y}</Typography>
                        <IconButton size="small" onClick={() => mover(1)}><ChevronRightIcon fontSize="small" /></IconButton>
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', rowGap: 0.3, textAlign: 'center' }}>
                        {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
                            <Typography key={i} sx={{ fontSize: 11, color: '#9aa3b2', py: 0.5 }}>{d}</Typography>
                        ))}
                        {celdas.map((iso, i) => {
                            if (!iso) return <Box key={i} />;
                            const esSel = iso === value;
                            const esHoy = iso === hoy;
                            return (
                                <Box key={iso} onClick={() => elegir(iso)} sx={{
                                    mx: 'auto', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    borderRadius: 2.5, cursor: 'pointer', fontSize: 13,
                                    fontWeight: esSel || esHoy ? 700 : 400,
                                    bgcolor: esSel ? '#6c4fd1' : esHoy ? '#ece8fb' : 'transparent',
                                    color: esSel ? '#fff' : esHoy ? '#4b35a8' : '#374151',
                                    '&:hover': { bgcolor: esSel ? '#5a3fc0' : '#f3f0fd' },
                                }}>{+iso.slice(8, 10)}</Box>
                            );
                        })}
                    </Box>
                    <Box display="flex" justifyContent="space-between" mt={1.5} px={0.5}>
                        <Box onClick={() => { onChange(''); setAnchor(null); }}
                            sx={{ cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#6c4fd1' }}>Ver todo el mes</Box>
                        <Box onClick={() => elegir(hoy)}
                            sx={{ cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#6c4fd1' }}>Hoy</Box>
                    </Box>
                </Box>
            </Popover>
        </>
    );
};

function Plan() {
    const [pedidos, setPedidos] = useState([]);
    const [rutas, setRutas] = useState({});
    const [nuevaRuta, setNuevaRuta] = useState('');
    const [tipoRuta, setTipoRuta] = useState('cross');
    const [cargando, setCargando] = useState(false);
    const [seleccionados, setSeleccionados] = useState([]);
    const [rutaAsignar, setRutaAsignar] = useState('');
    const [filtroCliente, setFiltroCliente] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('');

    // Solo se muestra la pestaña "Pedidos del día" (índice 2). Plan y Rutas guardadas quedan comentadas.
    const [tabIndex, setTabIndex] = useState(2);
    const [rutasDB, setRutasDB] = useState([]);
    const [cargandoRutas, setCargandoRutas] = useState(false);

    const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0]);


    const [modalOpen, setModalOpen] = useState(false);
    const [rutaSeleccionada, setRutaSeleccionada] = useState(null);
    const [editandoRuta, setEditandoRuta] = useState(false);
    const [nuevoNombreRuta, setNuevoNombreRuta] = useState('');
    const [filtroModal, setFiltroModal] = useState('');
    const [editRouteIndex, setEditRouteIndex] = useState(null);

    useEffect(() => {
        const data = cargarLS();
        if (data) { setRutas(data.rutas || {}); setPedidos(data.pedidos || []); }
    }, []);

    // ✅ Reemplaza los estados anteriores de sanced por estos
    const [pedidosSanced, setPedidosSanced] = useState([]);
    const [cargandoSanced, setCargandoSanced] = useState(false);
    const [cambiosSanced, setCambiosSanced] = useState({});
    // Fecha local de hoy (YYYY-MM-DD): la pantalla abre mostrando los pedidos de HOY
    const hoyLocal = new Date().toLocaleDateString('en-CA');
    const [mesSanced, setMesSanced] = useState(hoyLocal.slice(0, 7)); // '2026-10'

    const [diaSanced, setDiaSanced] = useState(hoyLocal);
    const [soloSinFecha, setSoloSinFecha] = useState(false);

    const [modalPaqueteria, setModalPaqueteria] = useState({ open: false, pedido: null });

    // #region SUBIR_EXCEL_ENTREGAS
    // Sube el Excel/xlsb de "concentrado de entregas" (columnas PEDIDO, ENTEGA,
    // FECHA ENTREGA) y actualiza fecha_entrega + entrega en lote, buscando por
    // no_orden. ENTEGA = "CROSS" -> entrega "santul"; cualquier otro valor
    // (ej. "CARRANZA") -> entrega "paqueteria". Filas "CANCELADO" o sin fecha
    // de entrega se ignoran.
    const [subiendoEntregas, setSubiendoEntregas] = useState(false);
    const inputExcelEntregasRef = useRef(null);
    // #endregion SUBIR_EXCEL_ENTREGAS

    const [datosPaqueteria, setDatosPaqueteria] = useState({
        monto: '', observaciones: '',
        fecha_entrega: new Date().toISOString().split('T')[0]
    });


    useEffect(() => {
        if (Object.keys(rutas).length > 0 || pedidos.length > 0) guardarLS(rutas, pedidos);
    }, [rutas, pedidos]);

    const cargarRutasDB = async (fecha) => {
        setCargandoRutas(true);
        try {
            const fechaParam = fecha || fechaFiltro;
            const res = await axios.get(`http://66.232.105.107:3001/api/Plan/rutas?fecha=${fechaParam}`);
            setRutasDB(res.data || []);
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error al cargar rutas', timer: 2000 });
        } finally {
            setCargandoRutas(false);
        }
    };


    // ✅ NUEVO - Manejar cambios en status/entrega
    const handleCambioSanced = (no_orden, field, value) => {
        setCambiosSanced(prev => ({
            ...prev,
            [no_orden]: { ...prev[no_orden], [field]: value }
        }));
    };

    // ✅ NUEVO - Guardar cambios de un pedido
    const guardarCambioSanced = async (pedido) => {
        const datos = cambiosSanced[pedido.no_orden] || {};
        const status = datos.status ?? pedido.status;
        const entrega = datos.entrega ?? pedido.entrega;
        const fecha_entrega = datos.fecha_entrega ?? pedido.fecha_entrega?.slice(0, 10) ?? null;
        const costos = datos.costos ?? pedido.costos ?? null; // 👈

        try {
            await axios.put(`http://66.232.105.107:3001/api/Plan/actualizar-status`, {
                no_orden: pedido.no_orden, status, entrega, fecha_entrega, costos // 👈
            });
            Swal.fire({ title: '✅ Guardado', icon: 'success', timer: 1500, showConfirmButton: false });
            cargarPedidosSanced(mesSanced);
        } catch {
            Swal.fire('❌ Error', 'No se pudo guardar', 'error');
        }
    };

    const getUltimos3DiasHabiles = () => {
        const dias = [];
        let fecha = new Date();
        fecha.setHours(0, 0, 0, 0);
        while (dias.length < 3) {
            const dia = fecha.getDay();
            if (dia !== 0 && dia !== 6) dias.push(new Date(fecha));
            fecha.setDate(fecha.getDate() - 1);
        }
        return dias;
    };

    const parsearFecha = (valor) => {
        if (!valor) return null;
        if (typeof valor === 'number') return new Date(Math.round((valor - 25569) * 86400 * 1000));
        if (typeof valor === 'string') {
            const partes = valor.split('/');
            if (partes.length === 3) return new Date(partes[2], partes[1] - 1, partes[0]);
        }
        return new Date(valor);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const workbook = XLSX.read(bstr, { type: 'binary' });
            const ws = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(ws, { defval: '', range: 6 });
            const diasHabiles = getUltimos3DiasHabiles();
            const yaAsignados = new Set(Object.values(rutas).flat().map(p => p.NO_ORDEN));
            const mapeado = jsonData
                .filter(row => {
                    if (!row['No Orden'] || row['No Orden'] === 'No Orden') return false;
                    if (row['Estatus'] !== 'Lista Surtido') return false;
                    if (yaAsignados.has(String(row['No Orden']).trim())) return false;
                    const tipo = String(row['Tipo'] || '').trim().toUpperCase();
                    if (!['CD', 'VQ'].includes(tipo)) return false;
                    const fecha = parsearFecha(row['Fecha Lista Surtido']);
                    if (!fecha || isNaN(fecha)) return false;
                    fecha.setHours(0, 0, 0, 0);
                    return diasHabiles.some(d => d.toDateString() === fecha.toDateString());
                })
                .map(row => ({
                    NO_ORDEN: String(row['No Orden'] || '').trim(),
                    tipo_original: String(row['Tipo'] || '').trim(),
                    FECHA: row['Fecha Lista Surtido'] || '',
                    ESTATUS: row['Estatus'] || '',
                    NUM_CLIENTE: String(row['No Dir Entrega'] || '').trim(),
                    NOMBRE_DEL_CLIENTE: String(row['Nombre Cliente'] || '').trim(),
                    ZONA: String(row['Zona'] || '').trim(),
                    TELEFONO: String(row['No. Telefonico'] || '').trim(),
                    CORREO: String(row['E-mail'] || '').trim(),
                    MUNICIPIO: String(row['Municipo'] || '').trim(),
                    ESTADO: String(row['Estado'] || '').trim(),
                    EJECUTIVO_VTAS: String(row['Ejecutico Vtas'] || '').trim(),
                    TOTAL: parseFloat(String(row['Total'] || '0').replace(/,/g, '')) || 0,
                    PARTIDAS: parseInt(row['Partidas'] || 0),
                    PIEZAS: parseInt(row['Cantidad'] || 0),
                    DIRECCION: `${row['Calle'] || ''} ${row['NO.'] || ''} ${row['Colonia'] || ''} ${row['Municipo'] || ''} ${row['Estado'] || ''}`.trim(),
                    NO_FACTURA: String(row['No Factura'] || '0').trim(),
                    rutaAsignada: null,
                }));
            setPedidos(prev => {
                const nuevos = mapeado.filter(m => !prev.some(p => p.NO_ORDEN === m.NO_ORDEN));
                return [...prev, ...nuevos];
            });
            Swal.fire({
                icon: 'success', title: `${mapeado.length} pedidos cargados`,
                text: 'Filtrados: Lista Surtido — últimos 3 días hábiles (CD y VQ)',
                timer: 2500, showConfirmButton: false
            });
        };
        reader.readAsBinaryString(file);
        e.target.value = '';
    };

    // ✅ NUEVO: trae en vivo todos los pedidos CD directamente de la API de
    // Sanced (mismo origen que ya usa el cron de Surtido), sin necesidad de
    // subir el Excel. Usa el mismo shape de objeto que handleFileUpload para
    // que la tabla "Pedidos disponibles" y todo lo demás (asignar a ruta,
    // modal de detalle, etc.) funcione igual sin importar de dónde vinieron
    // los datos.
    const [cargandoCD, setCargandoCD] = useState(false);

    const cargarPedidosCDDesdeAPI = async () => {
        setCargandoCD(true);
        try {
            const res = await axios.get('http://66.232.105.107:3001/api/Plan/pedidos-cd');
            const datos = Array.isArray(res.data?.data) ? res.data.data : [];

            const yaAsignados = new Set(Object.values(rutas).flat().map(p => p.NO_ORDEN));

            const mapeado = datos
                .filter(item => {
                    const noOrden = String(item.NoOrden || '').trim();
                    if (!noOrden) return false;
                    if (yaAsignados.has(noOrden)) return false;
                    return true;
                })
                .map(item => ({
                    NO_ORDEN: String(item.NoOrden || '').trim(),
                    tipo_original: String(item.TpoOriginal || '').trim(),
                    FECHA: item.Fecha || '',
                    ESTATUS: '',
                    NUM_CLIENTE: String(item.NumConsigna || '').trim(),
                    NOMBRE_DEL_CLIENTE: String(item.Nombre_Cliente || '').trim(),
                    ZONA: String(item.Zona || '').trim(),
                    TELEFONO: String(item.Telefono || '').trim(),
                    CORREO: String(item.Correo || '').trim(),
                    MUNICIPIO: String(item.Municipio || '').trim(),
                    ESTADO: String(item.Estado || '').trim(),
                    EJECUTIVO_VTAS: String(item.Ejecutivo || '').trim(),
                    TOTAL: parseFloat(item.Total || 0) || 0,
                    PARTIDAS: parseInt(item.Partidas || 0),
                    PIEZAS: parseInt(item.Piezas || 0),
                    DIRECCION: String(item.Direccion || '').trim(),
                    NO_FACTURA: String(item.NoFactura || '0').trim(),
                    rutaAsignada: null,
                }));

            setPedidos(prev => {
                const nuevos = mapeado.filter(m => !prev.some(p => p.NO_ORDEN === m.NO_ORDEN));
                return [...prev, ...nuevos];
            });

            Swal.fire({
                icon: 'success',
                title: `${mapeado.length} pedidos CD cargados`,
                text: `${datos.length - mapeado.length} ya estaban en la tabla o ya tenían ruta asignada`,
                timer: 2500, showConfirmButton: false
            });
        } catch (err) {
            console.error('Error cargando pedidos CD:', err);
            Swal.fire('❌ Error', 'No se pudieron cargar los pedidos CD de la API', 'error');
        } finally {
            setCargandoCD(false);
        }
    };

    const agregarRuta = () => {
        if (!nuevaRuta.trim()) { Swal.fire({ icon: 'warning', title: 'Escribe el nombre de la ruta' }); return; }
        if (rutas[nuevaRuta]) { Swal.fire({ icon: 'warning', title: 'Esa ruta ya existe' }); return; }
        setRutas(prev => ({ ...prev, [nuevaRuta]: [] }));
        setNuevaRuta('');
    };

    const asignarPedidoARuta = (pedido, nombreRuta) => {
        if (!nombreRuta) return;
        setRutas(prev => {
            const nuevas = { ...prev };
            Object.keys(nuevas).forEach(r => { nuevas[r] = nuevas[r].filter(p => p.NO_ORDEN !== pedido.NO_ORDEN); });
            nuevas[nombreRuta] = [...(nuevas[nombreRuta] || []), pedido];
            return nuevas;
        });
        setPedidos(prev => prev.filter(p => p.NO_ORDEN !== pedido.NO_ORDEN));
    };

    const asignarMasivo = () => {
        if (!rutaAsignar) { Swal.fire({ icon: 'warning', title: 'Selecciona una ruta' }); return; }
        if (seleccionados.length === 0) { Swal.fire({ icon: 'warning', title: 'Selecciona al menos un pedido' }); return; }
        const pedidosAAsignar = pedidos.filter(p => seleccionados.includes(p.NO_ORDEN));
        setRutas(prev => {
            const nuevas = { ...prev };
            Object.keys(nuevas).forEach(r => { nuevas[r] = nuevas[r].filter(p => !seleccionados.includes(p.NO_ORDEN)); });
            nuevas[rutaAsignar] = [...(nuevas[rutaAsignar] || []), ...pedidosAAsignar];
            return nuevas;
        });
        setPedidos(prev => prev.filter(p => !seleccionados.includes(p.NO_ORDEN)));
        setSeleccionados([]);
        setRutaAsignar('');
    };

    const quitarDeRuta = (nombreRuta, noOrden) => {
        const pedido = rutas[nombreRuta]?.find(p => p.NO_ORDEN === noOrden);
        if (!pedido) return;
        setRutas(prev => ({ ...prev, [nombreRuta]: prev[nombreRuta].filter(p => p.NO_ORDEN !== noOrden) }));
        setPedidos(prev => [...prev, { ...pedido, rutaAsignada: null }]);
    };

    const eliminarRuta = (nombreRuta) => {
        Swal.fire({
            icon: 'warning', title: `¿Eliminar ruta "${nombreRuta}"?`,
            text: 'Los pedidos regresarán a la tabla principal',
            showCancelButton: true, confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar'
        }).then(result => {
            if (!result.isConfirmed) return;
            const pedidosDeRuta = rutas[nombreRuta] || [];
            setPedidos(prev => [...prev, ...pedidosDeRuta.map(p => ({ ...p, rutaAsignada: null }))]);
            setRutas(prev => { const nuevas = { ...prev }; delete nuevas[nombreRuta]; return nuevas; });
        });
    };

    const moverPedido = (nombreRuta, index, direccion) => {
        setRutas(prev => {
            const items = [...prev[nombreRuta]];
            if (direccion === 'arriba' && index > 0) [items[index - 1], items[index]] = [items[index], items[index - 1]];
            if (direccion === 'abajo' && index < items.length - 1) [items[index], items[index + 1]] = [items[index + 1], items[index]];
            return { ...prev, [nombreRuta]: items };
        });
    };

    const renombrarRuta = (oldName, newName) => {
        if (!newName.trim() || rutas[newName]) return;
        setRutas(prev => {
            const nuevas = {};
            Object.keys(prev).forEach(k => { nuevas[k === oldName ? newName : k] = prev[k]; });
            return nuevas;
        });
        if (rutaSeleccionada === oldName) setRutaSeleccionada(newName);
        setEditandoRuta(false);
    };

    const handleEnviar = async () => {
        if (!tipoRuta) { Swal.fire({ icon: 'warning', title: 'Selecciona un tipo de ruta' }); return; }
        const rutasConPedidos = Object.entries(rutas).filter(([, peds]) => peds.length > 0);
        if (rutasConPedidos.length === 0) { Swal.fire({ icon: 'warning', title: 'No hay pedidos asignados' }); return; }
        const confirm = await Swal.fire({
            icon: 'question', title: '¿Enviar rutas?',
            html: rutasConPedidos.map(([nombre, peds]) => `<b>${nombre}</b>: ${peds.length} pedidos`).join('<br/>'),
            showCancelButton: true, confirmButtonText: 'Sí, enviar', cancelButtonText: 'Cancelar'
        });
        if (!confirm.isConfirmed) return;
        setCargando(true);
        const rutasArray = [];
        rutasConPedidos.forEach(([nombreRuta, peds]) => {
            peds.forEach(p => { rutasArray.push({ ...p, routeName: nombreRuta, TIPO: tipoRuta, tipo_original: p.tipo_original || tipoRuta, GUIA: '', OBSERVACIONES: '' }); });
        });
        try {
            const res = await axios.post('http://66.232.105.107:3001/api/Plan/insertar', { rutas: rutasArray });
            Swal.fire({ icon: 'success', title: '✅ Rutas enviadas', text: res.data.message });
            setRutas(prev => { const nuevas = { ...prev }; rutasConPedidos.forEach(([nombre]) => { delete nuevas[nombre]; }); return nuevas; });
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error al enviar', text: err.response?.data?.message || 'Error de conexión' });
        } finally {
            setCargando(false);
        }
    };

    const pedidosFiltrados = useMemo(() => {
        return pedidos.filter(p => {
            const cumpleCliente = !filtroCliente || p.NOMBRE_DEL_CLIENTE?.toLowerCase().includes(filtroCliente.toLowerCase()) || p.NO_ORDEN?.includes(filtroCliente);
            const cumpleEstado = !filtroEstado || p.ESTADO?.toLowerCase().includes(filtroEstado.toLowerCase());
            return cumpleCliente && cumpleEstado;
        });
    }, [pedidos, filtroCliente, filtroEstado]);

    const pedidosModalFiltrados = useMemo(() => {
        if (!rutaSeleccionada || !rutas[rutaSeleccionada]) return [];
        return rutas[rutaSeleccionada].filter(p =>
            !filtroModal || p.NO_ORDEN?.includes(filtroModal) || p.NOMBRE_DEL_CLIENTE?.toLowerCase().includes(filtroModal.toLowerCase())
        );
    }, [rutas, rutaSeleccionada, filtroModal]);

    const toggleSeleccion = (noOrden) => {
        setSeleccionados(prev => prev.includes(noOrden) ? prev.filter(id => id !== noOrden) : [...prev, noOrden]);
    };

    const toggleTodos = () => {
        const disponibles = pedidosFiltrados.map(p => p.NO_ORDEN);
        setSeleccionados(prev => prev.length === disponibles.length ? [] : disponibles);
    };

    const formatCurrency = (v) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v || 0);
    const calcularTotales = (peds = []) => ({
        total: peds.reduce((s, p) => s + (p.TOTAL || 0), 0),
        partidas: peds.reduce((s, p) => s + (p.PARTIDAS || 0), 0),
        piezas: peds.reduce((s, p) => s + (p.PIEZAS || 0), 0),
    });

    // ✅ Pedidos filtrados por día si se seleccionó uno
    const pedidosSancedFiltrados = useMemo(() => {
        if (!diaSanced) return pedidosSanced;
        return pedidosSanced.filter(p => (p.fecha_factura || p.fecha)?.slice(0, 10) === diaSanced);
    }, [pedidosSanced, diaSanced]);

    // ⚠️ Pedidos (no cancelados) sin fecha de entrega
    const sinFechaEntrega = useMemo(() => pedidosSanced.filter(p => {
        const c = cambiosSanced[p.no_orden] || {};
        const fecha = c.fecha_entrega ?? p.fecha_entrega?.slice(0, 10);
        return !fecha && (c.status ?? p.status) !== 'cancelado';
    }), [pedidosSanced, cambiosSanced]);
    const pedidosVisibles = soloSinFecha && sinFechaEntrega.length > 0 ? sinFechaEntrega : pedidosSancedFiltrados;

    // ✅ Cargar por mes
    // `dia`: si se manda, fija el día a mostrar ('' = todo el mes). Si no se manda, conserva el día actual.
    const cargarPedidosSanced = async (mes, dia) => {
        setCargandoSanced(true);
        try {
            const mesParam = mes || mesSanced;
            const res = await axios.get(
                `http://66.232.105.107:3001/api/Plan/pedidos-por-fecha?fecha=${mesParam}`
            );
            setPedidosSanced(res.data.data || []);
            setCambiosSanced({});
            if (dia !== undefined) setDiaSanced(dia);
        } catch {
            setPedidosSanced([]);
        } finally {
            setCargandoSanced(false);
        }
    };

    // Al abrir la pantalla ya estamos en "Pedidos del día": carga los datos
    useEffect(() => {
        cargarPedidosSanced();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // #region DESCARGAR_EXCEL_PEDIDOS
    // Descarga lo que se está viendo en "Pedidos del día/mes": son los pedidos
    // de `sanced` que ya están en `pedido_finalizado` (la consulta del servidor
    // hace esa validación), con no_orden, tipo original, factura, cliente,
    // total y fecha.
    // Trae TODOS los meses (fecha=todos), no solo el que está en pantalla.
    const descargarExcelPedidos = async () => {
        let lista = [];
        try {
            Swal.fire({ title: 'Preparando Excel...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
            const res = await axios.get('http://66.232.105.107:3001/api/Plan/pedidos-por-fecha?fecha=todos');
            lista = res.data.data || [];
            Swal.close();
        } catch {
            Swal.fire('❌ Error', 'No se pudieron traer los pedidos', 'error');
            return;
        }
        if (lista.length === 0) {
            Swal.fire({ icon: 'info', title: 'No hay pedidos para descargar' });
            return;
        }
        const filas = lista.map(p => ({
            no_orden: p.no_orden,
            tipo_original: p.tpo_original ?? '',
            no_factura: p.no_factura ?? '',
            nombre_cliente: p.nombre_cliente ?? '',
            total: Number(p.total) || 0,
            fecha: (p.fecha_factura || p.fecha || '').toString().slice(0, 10),
        }));
        const ws = XLSX.utils.json_to_sheet(filas, {
            header: ['no_orden', 'tipo_original', 'no_factura', 'nombre_cliente', 'total', 'fecha'],
        });
        ws['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 40 }, { wch: 14 }, { wch: 12 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');
        XLSX.writeFile(wb, `pedidos_finalizados_todos.xlsx`);
    };
    // #endregion DESCARGAR_EXCEL_PEDIDOS

    // #region SUBIR_EXCEL_ENTREGAS
    const excelSerialAFecha = (valor) => {
        if (valor instanceof Date) {
            const y = valor.getFullYear(), m = String(valor.getMonth() + 1).padStart(2, '0'), d = String(valor.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
        const serial = Number(valor);
        if (!serial || isNaN(serial)) return null;
        // Excel cuenta los días desde 1899-12-30
        const base = new Date(Date.UTC(1899, 11, 30));
        base.setUTCDate(base.getUTCDate() + Math.round(serial));
        const y = base.getUTCFullYear(), m = String(base.getUTCMonth() + 1).padStart(2, '0'), d = String(base.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const handleSubirExcelEntregas = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSubiendoEntregas(true);
        try {
            const buffer = await file.arrayBuffer();
            const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
            const nombreHoja = wb.SheetNames.includes('RESUMEN') ? 'RESUMEN' : wb.SheetNames[0];
            const hoja = wb.Sheets[nombreHoja];
            const filas = XLSX.utils.sheet_to_json(hoja, { header: 1, raw: true, defval: null });

            // Busca la fila de encabezados (la que trae la columna "PEDIDO")
            const idxEncabezado = filas.findIndex(fila =>
                Array.isArray(fila) && fila.some(c => String(c || '').trim().toUpperCase() === 'PEDIDO')
            );
            if (idxEncabezado === -1) {
                throw new Error('No se encontró la columna "PEDIDO" en el archivo.');
            }

            const encabezados = filas[idxEncabezado].map(c => String(c || '').trim().toUpperCase());
            const idxPedido = encabezados.indexOf('PEDIDO');
            const idxFactura = encabezados.indexOf('FACTURA');
            const idxEntega = encabezados.indexOf('ENTEGA');
            const idxFechaEntrega = encabezados.findIndex(h => h.startsWith('FECHA ENTREGA'));

            if (idxFechaEntrega === -1) {
                throw new Error('No se encontró la columna "FECHA ENTREGA" en el archivo.');
            }

            const registros = [];
            for (let i = idxEncabezado + 1; i < filas.length; i++) {
                const fila = filas[i];
                if (!fila || fila.every(c => c === null || c === '')) continue;

                const pedido = fila[idxPedido];
                const factura = fila[idxFactura];
                const fechaEntregaRaw = fila[idxFechaEntrega];
                const entegaTexto = String(fila[idxEntega] || '').trim().toUpperCase();

                if (pedido === null || pedido === '' || String(factura).trim().toUpperCase() === 'CANCELADO') continue;
                if (!fechaEntregaRaw) continue;

                const noOrden = String(pedido).trim().replace(/\.0$/, '');
                const fechaEntrega = excelSerialAFecha(fechaEntregaRaw);
                if (!fechaEntrega) continue;

                const entrega = entegaTexto === 'CROSS' ? 'santul' : (entegaTexto ? 'paqueteria' : null);

                registros.push({ no_orden: noOrden, fecha_entrega: fechaEntrega, entrega });
            }

            if (registros.length === 0) {
                Swal.fire({ icon: 'warning', title: 'Sin registros válidos', text: 'No se encontraron filas con PEDIDO y FECHA ENTREGA.' });
                return;
            }

            const { data } = await axios.put(
                'http://66.232.105.107:3001/api/Plan/actualizar-entrega-masivo',
                { registros }
            );

            Swal.fire({
                icon: 'success',
                title: 'Entregas actualizadas',
                html: `Actualizados: <b>${data.actualizados}</b> de ${data.total}.` +
                    (data.noEncontrados?.length ? `<br>No encontrados (${data.noEncontrados.length}): ${data.noEncontrados.slice(0, 20).join(', ')}${data.noEncontrados.length > 20 ? '…' : ''}` : ''),
            });

            cargarPedidosSanced(mesSanced);
        } catch (err) {
            Swal.fire('❌ Error', err.message || 'No se pudo procesar el archivo.', 'error');
        } finally {
            setSubiendoEntregas(false);
            if (inputExcelEntregasRef.current) inputExcelEntregasRef.current.value = '';
        }
    };
    // #endregion SUBIR_EXCEL_ENTREGAS

    const guardarEntregaPaqueteria = async () => {
        if (!datosPaqueteria.monto) {
            Swal.fire({ icon: 'warning', title: 'El monto es requerido' });
            return;
        }
        try {
            await axios.post(`http://66.232.105.107:3001/api/Plan/registrar-paqueteria`, {
                no_orden: modalPaqueteria.pedido?.no_orden,
                nombre_cliente: modalPaqueteria.pedido?.nombre_cliente,
                monto: datosPaqueteria.monto,
                observaciones: datosPaqueteria.observaciones,
                fecha_entrega: datosPaqueteria.fecha_entrega,
            });
            await axios.put(`http://66.232.105.107:3001/api/Plan/actualizar-status`, {
                no_orden: modalPaqueteria.pedido?.no_orden,
                status: modalPaqueteria.pedido?.status,
                entrega: 'paqueteria'
            });
            Swal.fire({ title: '✅ Registrado', icon: 'success', timer: 1500, showConfirmButton: false });
            setModalPaqueteria({ open: false, pedido: null });
            setDatosPaqueteria({ monto: '', cantidad: '', observaciones: '', fecha_entrega: new Date().toISOString().split('T')[0] });
            cargarPedidosSanced(mesSanced);
        } catch {
            Swal.fire('❌ Error', 'No se pudo registrar la entrega', 'error');
        }
    };



    return (
        <div className="place_holder-container fade-in">
            <div className="place_holder-header">
                <span className="place_holder-title">
                    Plan de Rutas
                </span>
                <button className="place_holder-close" onClick={() => (window.location.href = '/menu')}>
                    <FaTimes />
                </button>
            </div>

            {/* ===== TABS ===== */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#fff' }}>
                <Tabs value={tabIndex} onChange={(e, v) => {
                    setTabIndex(v);
                    if (v === 1) cargarRutasDB();
                    if (v === 2) cargarPedidosSanced(); // ✅ NUEVO TAB
                }}>
                    {/* <Tab icon={<AssignmentOutlinedIcon fontSize="small" />} iconPosition="start" label="Plan" sx={{ minHeight: 52, textTransform: 'none', fontWeight: 600, fontSize: '0.95rem' }} /> */}
                    {/* <Tab icon={<LocalShippingOutlinedIcon fontSize="small" />} iconPosition="start" label="Rutas guardadas" sx={{ minHeight: 52, textTransform: 'none', fontWeight: 600, fontSize: '0.95rem' }} /> */}
                    <Tab value={2} icon={<Inventory2OutlinedIcon fontSize="small" />} iconPosition="start" label="Pedidos del día" sx={{ minHeight: 52, textTransform: 'none', fontWeight: 600, fontSize: '0.95rem' }} />
                </Tabs>
            </Box>

            {/* ===== TAB 1: PLAN ===== */}
            {tabIndex === 0 && (
                <Box p={2}>
                    <Paper sx={{ p: 2, mb: 2 }}>
                        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
                            <Button variant="contained" component="label" sx={{ bgcolor: '#1976d2', color: '#fff', borderColor: '#1976d2', textTransform: 'none', '&:hover': { bgcolor: '#1565c0', color: '#fff' } }}>
                                <BsFileEarmarkExcel style={{ verticalAlign: "-2px", marginRight: 8, fontSize: "1.15em" }} />Subir Excel
                                <input hidden type="file" accept=".xlsx,.xls" onChange={handleFileUpload} />
                            </Button>
                            <Button variant="contained" disabled={cargandoCD} onClick={cargarPedidosCDDesdeAPI}
                                sx={{ bgcolor: '#00897b', color: '#fff', borderColor: '#00897b', textTransform: 'none', '&:hover': { bgcolor: '#00796b', color: '#fff' } }}>
                                {cargandoCD ? 'Cargando...' : <><SyncOutlinedIcon fontSize="small" sx={{ mr: 1 }} />Cargar CD (API)</>}
                            </Button>
                            <TextField size="small" placeholder="Nombre de Ruta" value={nuevaRuta}
                                onChange={e => setNuevaRuta(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && agregarRuta()}
                                sx={{ minWidth: 160 }} />
                            <Button variant="contained" onClick={agregarRuta} sx={{ bgcolor: '#fb8c00', color: '#fff', borderColor: '#fb8c00', textTransform: 'none', '&:hover': { bgcolor: '#ef6c00', color: '#fff' } }}>
                                <AddIcon fontSize="small" sx={{ mr: 0.5 }} />Agregar ruta
                            </Button>
                            <FormControl size="small" sx={{ minWidth: 160 }}>
                                <InputLabel>Tipo de Ruta</InputLabel>
                                <Select value={tipoRuta} label="Tipo de Ruta" onChange={e => setTipoRuta(e.target.value)}>
                                    <MenuItem value="cross">Cross</MenuItem>
                                </Select>
                            </FormControl>
                            <Button variant="contained" color="success" disabled={cargando} onClick={handleEnviar} sx={{ textTransform: 'none' }}>
                                {cargando ? 'Enviando...' : <><CheckCircleOutlineIcon fontSize="small" sx={{ mr: 1 }} />Enviar rutas</>}
                            </Button>
                            <Button variant="contained" color="error"
                                onClick={() => {
                                    Swal.fire({
                                        icon: 'warning', title: '¿Limpiar tabla?',
                                        text: 'Se eliminarán todos los pedidos de la lista principal.',
                                        showCancelButton: true, confirmButtonText: 'Sí, limpiar', cancelButtonText: 'Cancelar'
                                    }).then(result => {
                                        if (!result.isConfirmed) return;
                                        setPedidos([]); setSeleccionados([]);
                                        guardarLS(rutas, []);
                                    });
                                }} sx={{ textTransform: 'none' }}>
                                <DeleteOutlineIcon fontSize="small" sx={{ mr: 1 }} />Limpiar tabla
                            </Button>
                        </Box>

                        {seleccionados.length > 0 && (
                            <Box display="flex" gap={2} alignItems="center" mt={2} sx={{ bgcolor: '#e3f2fd', p: 1.5, borderRadius: 1 }}>
                                <Typography variant="body2"><b>{seleccionados.length}</b> pedidos seleccionados</Typography>
                                <FormControl size="small" sx={{ minWidth: 160 }}>
                                    <InputLabel>Asignar a Ruta</InputLabel>
                                    <Select value={rutaAsignar} label="Asignar a Ruta" onChange={e => setRutaAsignar(e.target.value)}>
                                        {Object.keys(rutas).map(r => (<MenuItem key={r} value={r}>{r}</MenuItem>))}
                                    </Select>
                                </FormControl>
                                <Button variant="contained" size="small" onClick={asignarMasivo} sx={{ textTransform: 'none' }}>Asignar</Button>
                                <Button variant="outlined" size="small" color="error" onClick={() => setSeleccionados([])} sx={{ textTransform: 'none' }}>Limpiar</Button>
                            </Box>
                        )}
                    </Paper>

                    {Object.keys(rutas).length > 0 && (
                        <Box display="flex" gap={2} flexWrap="wrap" mb={2}>
                            {Object.entries(rutas).map(([nombre, peds]) => {
                                const tots = calcularTotales(peds);
                                return (
                                    <Paper key={nombre} variant="outlined" sx={{ minWidth: 200, maxWidth: 230, p: 1.5, borderRadius: 2, position: 'relative' }}>
                                        <Box position="absolute" top={6} right={6}>
                                            <Tooltip title="Eliminar ruta">
                                                <IconButton size="small" color="error" onClick={() => eliminarRuta(nombre)}>
                                                    <FaTimes size={12} />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                        <Typography fontWeight={700} fontSize={14}>Ruta: {nombre}</Typography>
                                        <Typography variant="body2">Total: {formatCurrency(tots.total)}</Typography>
                                        <Typography variant="body2">Partidas: {tots.partidas}</Typography>
                                        <Typography variant="body2">Piezas: {tots.piezas}</Typography>
                                        <Button size="small"
                                            onClick={() => { setRutaSeleccionada(nombre); setFiltroModal(''); setModalOpen(true); }}
                                            sx={{ color: '#e74c3c', textTransform: 'none', p: 0, mt: 0.5 }}>
                                            VER DETALLES
                                        </Button>
                                    </Paper>
                                );
                            })}
                        </Box>
                    )}

                    {pedidos.length > 0 ? (
                        <Paper sx={{ p: 2 }}>
                            <Box display="flex" gap={2} mb={2} flexWrap="wrap" alignItems="center">
                                <Typography variant="h6">Pedidos disponibles ({pedidosFiltrados.length})</Typography>
                                <TextField size="small" placeholder="Buscar cliente / No Orden"
                                    value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} sx={{ minWidth: 220 }} />
                                <TextField size="small" placeholder="Filtrar por Estado"
                                    value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} sx={{ minWidth: 160 }} />
                            </Box>
                            <TableContainer sx={{ maxHeight: '55vh' }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell padding="checkbox">
                                                <Checkbox size="small"
                                                    checked={seleccionados.length === pedidosFiltrados.length && pedidosFiltrados.length > 0}
                                                    onChange={toggleTodos} />
                                            </TableCell>
                                            <TableCell>No Orden</TableCell>
                                            <TableCell>Tipo</TableCell>
                                            <TableCell>Fecha</TableCell>
                                            <TableCell>Nombre Cliente</TableCell>
                                            <TableCell>Municipio</TableCell>
                                            <TableCell>Estado</TableCell>
                                            <TableCell>Total</TableCell>
                                            <TableCell>Partidas</TableCell>
                                            <TableCell>Piezas</TableCell>
                                            <TableCell>Asignar a Ruta</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {pedidosFiltrados.map((row) => (
                                            <TableRow key={row.NO_ORDEN}>
                                                <TableCell padding="checkbox">
                                                    <Checkbox size="small"
                                                        checked={seleccionados.includes(row.NO_ORDEN)}
                                                        onChange={() => toggleSeleccion(row.NO_ORDEN)} />
                                                </TableCell>
                                                <TableCell>{row.NO_ORDEN}</TableCell>
                                                <TableCell><Chip label={row.tipo_original} size="small" sx={{ bgcolor: '#e3f2fd' }} /></TableCell>
                                                <TableCell>{row.FECHA}</TableCell>
                                                <TableCell>{row.NOMBRE_DEL_CLIENTE}</TableCell>
                                                <TableCell>{row.MUNICIPIO}</TableCell>
                                                <TableCell>{row.ESTADO}</TableCell>
                                                <TableCell>{formatCurrency(row.TOTAL)}</TableCell>
                                                <TableCell>{row.PARTIDAS}</TableCell>
                                                <TableCell>{row.PIEZAS}</TableCell>
                                                <TableCell>
                                                    <Select size="small" value="" displayEmpty
                                                        onChange={e => asignarPedidoARuta(row, e.target.value)} sx={{ minWidth: 130 }}>
                                                        <MenuItem value="" disabled>Seleccionar</MenuItem>
                                                        {Object.keys(rutas).map(r => (<MenuItem key={r} value={r}>{r}</MenuItem>))}
                                                    </Select>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    ) : (
                        <Box textAlign="center" mt={6} color="#888">
                            <Typography variant="h6"><BsFileEarmarkExcel style={{ verticalAlign: "-2px", marginRight: 8, fontSize: "1.15em" }} />Sube un archivo Excel para comenzar</Typography>
                        </Box>
                    )}
                </Box>
            )}

            {/* ===== TAB 2: RUTAS GUARDADAS ===== */}
            {tabIndex === 1 && (
                <Box p={2}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6">Rutas Guardadas</Typography>
                        <Box display="flex" gap={2} alignItems="center">
                            <TextField type="date" size="small" label="Fecha" value={fechaFiltro}
                                onChange={e => { setFechaFiltro(e.target.value); cargarRutasDB(e.target.value); }}
                                InputLabelProps={{ shrink: true }} />
                            <Button variant="outlined" onClick={() => cargarRutasDB()} disabled={cargandoRutas} size="small">
                                🔄 Actualizar
                            </Button>
                        </Box>
                    </Box>

                    {cargandoRutas ? (
                        <Box textAlign="center" mt={5}><Typography>Cargando rutas...</Typography></Box>
                    ) : rutasDB.length === 0 ? (
                        <Box textAlign="center" mt={5} color="#888">
                            <Typography>No hay rutas guardadas para esta fecha.</Typography>
                        </Box>
                    ) : (
                        rutasDB.map(ruta => (
                            <Box key={ruta.routeName} mb={4}>
                                <Box display="flex" alignItems="center" gap={2} mb={1} sx={{ bgcolor: '#f5f5f5', p: 1.5, borderRadius: 1 }}>
                                    <Typography variant="h6" fontWeight={700}>Ruta: {ruta.routeName}</Typography>
                                    <Chip label={`Total: ${formatCurrency(ruta.total)}`} sx={{ bgcolor: '#e8f5e9' }} />
                                    <Chip label={`Partidas: ${ruta.partidas}`} sx={{ bgcolor: '#e3f2fd' }} />
                                    <Chip label={`Piezas: ${ruta.piezas}`} sx={{ bgcolor: '#fce4ec' }} />
                                    <Chip label={`${ruta.pedidos.length} pedidos`} sx={{ bgcolor: '#fff3e0' }} />
                                </Box>
                                <TableContainer component={Paper}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow sx={{ bgcolor: '#fafafa' }}>
                                                <TableCell>Orden</TableCell>
                                                <TableCell>Tipo</TableCell>
                                                <TableCell>Factura</TableCell>
                                                <TableCell>Cliente</TableCell>
                                                <TableCell>Municipio</TableCell>
                                                <TableCell>Estado</TableCell>
                                                <TableCell>Total</TableCell>
                                                <TableCell>Partidas</TableCell>
                                                <TableCell>Piezas</TableCell>
                                                <TableCell>Guía</TableCell>
                                                <TableCell>Transporte</TableCell>
                                                <TableCell>Status</TableCell>
                                                <TableCell>Fecha Creación</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {ruta.pedidos.map(pedido => (
                                                <TableRow key={pedido.id}>
                                                    <TableCell>{pedido.NO_ORDEN}</TableCell>
                                                    <TableCell><Chip label={pedido.tipo_original || pedido.TIPO} size="small" sx={{ bgcolor: '#e3f2fd' }} /></TableCell>
                                                    <TableCell>{pedido.NO_FACTURA || '—'}</TableCell>
                                                    <TableCell>{pedido.NOMBRE_DEL_CLIENTE}</TableCell>
                                                    <TableCell>{pedido.MUNICIPIO}</TableCell>
                                                    <TableCell>{pedido.ESTADO}</TableCell>
                                                    <TableCell>{formatCurrency(pedido.TOTAL)}</TableCell>
                                                    <TableCell>{pedido.PARTIDAS}</TableCell>
                                                    <TableCell>{pedido.PIEZAS}</TableCell>
                                                    <TableCell>
                                                        {pedido.GUIA && pedido.GUIA !== ''
                                                            ? <Chip label={pedido.GUIA} size="small" color="success" /> : '—'}
                                                    </TableCell>
                                                    <TableCell>{pedido.TRANSPORTE || '—'}</TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" fontWeight={700} sx={{
                                                            color: pedido.status_pedido === 'FINALIZADO' ? '#2e7d32' :
                                                                pedido.status_pedido === 'EMBARQUE' ? '#1565c0' :
                                                                    pedido.status_pedido === 'SURTIDO' ? '#e65100' : '#c62828'
                                                        }}>
                                                            {pedido.status_pedido}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        {pedido.created_at ? new Date(pedido.created_at).toLocaleDateString('es-MX') : '—'}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                                <Divider sx={{ mt: 2 }} />
                            </Box>
                        ))
                    )}
                </Box>
            )}

            {/* ===== TAB 3: PEDIDOS DEL DÍA (sanced) ===== */}
            {tabIndex === 2 && (
                <Box p={2}>
                    {/* HEADER */}
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}
                        sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 2 }}>
                        <Typography variant="h6" fontWeight="bold">{diaSanced ? 'Pedidos del día' : 'Pedidos del mes'}</Typography>

                        <Box display="flex" gap={2} alignItems="center">
                            {/* Calendario para filtrar por día (limitado al mes elegido) */}
                            <Box sx={{
                                display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1.5, height: 40,
                                border: diaSanced ? '1px solid #2f6fed' : '1px solid #d9dde6', borderRadius: 99, background: '#fff',
                                boxShadow: '0 1px 3px rgba(16,24,40,0.06)',
                            }}>
                                <CalendarioDia
                                    value={diaSanced}
                                    onChange={v => {
                                        if (!v) { setDiaSanced(''); return; }
                                        const mesNuevo = v.slice(0, 7);
                                        if (mesNuevo !== mesSanced) {
                                            setMesSanced(mesNuevo);
                                            cargarPedidosSanced(mesNuevo, v);
                                        } else {
                                            setDiaSanced(v);
                                        }
                                    }}
                                />
                            </Box>

                            <Button variant="outlined" size="small"
                                onClick={() => cargarPedidosSanced(mesSanced)}
                                disabled={cargandoSanced}>
                                🔄 Actualizar
                            </Button>

                            {sinFechaEntrega.length > 0 && (
                                <Button variant={soloSinFecha ? 'contained' : 'outlined'} size="small" color="warning"
                                    onClick={() => setSoloSinFecha(v => !v)}
                                    startIcon={<WarningAmberOutlinedIcon />}>
                                    {soloSinFecha ? 'Ver todos' : `${sinFechaEntrega.length} sin fecha de entrega (mes)`}
                                </Button>
                            )}

                            {/* #region SUBIR_EXCEL_ENTREGAS - UI */}
                            <input
                                type="file"
                                accept=".xlsx,.xlsb,.xls"
                                ref={inputExcelEntregasRef}
                                style={{ display: 'none' }}
                                onChange={handleSubirExcelEntregas}
                            />
                            <Button variant="outlined" size="small" color="secondary"
                                onClick={() => inputExcelEntregasRef.current?.click()}
                                disabled={subiendoEntregas}>
                                {subiendoEntregas ? 'Procesando…' : <><BsFileEarmarkExcel style={{ verticalAlign: "-2px", marginRight: 8, fontSize: "1.15em" }} />Subir Excel de Entregas</>}
                            </Button>
                            {/* #endregion SUBIR_EXCEL_ENTREGAS - UI */}

                            <Button variant="outlined" size="small" color="success"
                                onClick={descargarExcelPedidos}
                                disabled={cargandoSanced}>
                                <BsFileEarmarkExcel style={{ verticalAlign: "-2px", marginRight: 8, fontSize: "1.15em" }} />Descargar Excel
                            </Button>

                            <Chip
                                label={`${pedidosVisibles.length} pedidos`}
                                sx={{ bgcolor: '#e3f2fd', fontWeight: 'bold' }} />
                        </Box>
                    </Box>

                    {/* TABLA */}
                    {cargandoSanced ? (
                        <Box textAlign="center" mt={5}><Typography>Cargando pedidos...</Typography></Box>
                    ) : pedidosSancedFiltrados.length === 0 ? (
                        <Box textAlign="center" mt={5} color="#888">
                            <Typography>No hay pedidos para este período.</Typography>
                        </Box>
                    ) : (
                        <>
                            <TableContainer component={Paper} sx={{ maxHeight: '65vh' }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: '#fafafa' }}>
                                            <TableCell><b>Fecha Factura</b></TableCell>
                                            <TableCell><b>No. Orden</b></TableCell>
                                            <TableCell><b>Cliente</b></TableCell>
                                            <TableCell><b>No. Cliente</b></TableCell>
                                            <TableCell><b>Factura</b></TableCell>
                                            <TableCell><b>Dirección</b></TableCell>
                                            <TableCell><b>Total</b></TableCell>
                                            <TableCell><b>Total c/IVA</b></TableCell>
                                            <TableCell><b>Status</b></TableCell>
                                            <TableCell><b>Fecha Entrega</b></TableCell>
                                            <TableCell><b>Costo</b></TableCell>
                                            <TableCell><b>Entrega</b></TableCell>
                                            <TableCell><b>Guardar</b></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {pedidosVisibles.map((p) => {
                                            const cambio = cambiosSanced[p.no_orden] || {};
                                            const sinFecha = !(cambio.fecha_entrega ?? p.fecha_entrega?.slice(0, 10)) && (cambio.status ?? p.status) !== 'cancelado';
                                            const statusActual = cambio.status ?? p.status;
                                            const entregaActual = cambio.entrega ?? p.entrega;
                                            const hayPendiente = cambiosSanced[p.no_orden] !== undefined;

                                            return (
                                                <TableRow key={p.no_orden}
                                                    sx={{
                                                        bgcolor: statusActual === 'cancelado' ? '#fff5f5' :
                                                            statusActual === 'finalizado' ? '#f1fff1' : 'inherit'
                                                    }}>
                                                    <TableCell>
                                                        {(() => {
                                                            const f = String(p.fecha_factura || p.fecha || '').slice(0, 10);
                                                            if (!f) return '---';
                                                            const [y, m, d] = f.split('-');
                                                            return `${d}/${m}/${y}`;
                                                        })()}
                                                    </TableCell>
                                                    <TableCell><Typography fontWeight="bold">{p.no_orden}</Typography></TableCell>
                                                    <TableCell>{p.nombre_cliente}</TableCell>
                                                    <TableCell>{p.num_consigna}</TableCell>
                                                    <TableCell>{p.no_factura || '---'}</TableCell>
                                                    <TableCell sx={{ maxWidth: 180 }}>
                                                        <Tooltip title={p.direccion || ''}>
                                                            <Typography variant="body2" noWrap>{p.direccion}</Typography>
                                                        </Tooltip>
                                                    </TableCell>
                                                    <TableCell>${formatMoney(p.total)}</TableCell>
                                                    <TableCell>${formatMoney(p.total_con_iva)}</TableCell>
                                                    <TableCell>
                                                        <Select size="small"
                                                            value={statusActual || ''}
                                                            onChange={e => handleCambioSanced(p.no_orden, 'status', e.target.value)}
                                                            displayEmpty sx={{ minWidth: 140 }}>
                                                            <MenuItem value=""><em>-- Sin status --</em></MenuItem>
                                                            <MenuItem value="finalizado">✅ Finalizado</MenuItem>
                                                            <MenuItem value="cancelado">❌ Cancelado</MenuItem>
                                                        </Select>
                                                    </TableCell>
                                                    <TableCell>
                                                        <TextField
                                                            size="small"
                                                            type="date"
                                                            value={cambio.fecha_entrega ?? p.fecha_entrega?.slice(0, 10) ?? ''}
                                                            onChange={e => handleCambioSanced(p.no_orden, 'fecha_entrega', e.target.value)}
                                                            InputLabelProps={{ shrink: true }}
                                                            error={sinFecha}
                                                            sx={{ minWidth: 145 }}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        {cambio.costos !== undefined ? (
                                                            // Modo edición: cuando el usuario está modificando
                                                            <TextField
                                                                size="small"
                                                                type="number"
                                                                autoFocus
                                                                value={cambio.costos}
                                                                onChange={e => handleCambioSanced(p.no_orden, 'costos', e.target.value)}
                                                                onBlur={() => {
                                                                    // Si no cambió nada y era vacío, limpiar el cambio
                                                                    if (cambio.costos === '' && !p.costos) {
                                                                        setCambiosSanced(prev => {
                                                                            const nuevo = { ...prev };
                                                                            if (nuevo[p.no_orden]) {
                                                                                delete nuevo[p.no_orden].costos;
                                                                                if (Object.keys(nuevo[p.no_orden]).length === 0) delete nuevo[p.no_orden];
                                                                            }
                                                                            return nuevo;
                                                                        });
                                                                    }
                                                                }}
                                                                sx={{ minWidth: 110 }}
                                                                inputProps={{ min: 0, step: '0.01' }}
                                                            />
                                                        ) : (
                                                            // Modo visualización: muestra el valor o un botón para editar
                                                            <Box
                                                                onClick={() => handleCambioSanced(p.no_orden, 'costos', p.costos ?? '')}
                                                                sx={{
                                                                    minWidth: 110,
                                                                    px: 1.5, py: 0.5,
                                                                    border: '1px solid #e0e0e0',
                                                                    borderRadius: 1,
                                                                    cursor: 'pointer',
                                                                    bgcolor: p.costos ? '#f0f7ff' : '#fafafa',
                                                                    color: p.costos ? '#1976d2' : '#aaa',
                                                                    fontWeight: p.costos ? 'bold' : 'normal',
                                                                    fontSize: 13,
                                                                    '&:hover': { borderColor: '#1976d2', bgcolor: '#e3f2fd' }
                                                                }}
                                                            >
                                                                {p.costos ? `$${formatMoney(p.costos)}` : '+ Agregar'}
                                                            </Box>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Select size="small"
                                                            value={entregaActual || ''}
                                                            onChange={e => {
                                                                const val = e.target.value;
                                                                if (val === 'paqueteria') {
                                                                    setModalPaqueteria({ open: true, pedido: p });
                                                                    setDatosPaqueteria({
                                                                        monto: '', observaciones: '',
                                                                        fecha_entrega: new Date().toISOString().split('T')[0]
                                                                    });
                                                                } else {
                                                                    handleCambioSanced(p.no_orden, 'entrega', val);
                                                                }
                                                            }}
                                                            displayEmpty sx={{ minWidth: 150 }}>
                                                            <MenuItem value=""><em>-- Sin asignar --</em></MenuItem>
                                                            <MenuItem value="paqueteria">🚚 Paquetería</MenuItem>
                                                            <MenuItem value="santul">🏭 Santul</MenuItem>
                                                        </Select>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Tooltip title={hayPendiente ? 'Guardar cambios' : 'Sin cambios'}>
                                                            <span>
                                                                <IconButton color="primary"
                                                                    onClick={() => guardarCambioSanced(p)}
                                                                    disabled={!hayPendiente}>
                                                                    <SaveIcon />
                                                                </IconButton>
                                                            </span>
                                                        </Tooltip>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            {/* ✅ TOTALES FIJOS FUERA DEL SCROLL */}
                            <Box sx={{
                                display: 'flex',
                                borderTop: '2px solid #1976d2',
                                bgcolor: '#f0f4ff',
                                p: 1,
                                borderRadius: '0 0 4px 4px',
                                alignItems: 'center'
                            }}>
                                <Box sx={{ flex: 1 }} />
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
                                    <Typography fontWeight="bold" variant="body2" color="textSecondary">
                                        TOTAL {diaSanced ? 'DEL DÍA' : 'DEL MES'}:
                                    </Typography>
                                </Box>
                                <Box sx={{ minWidth: 120, mr: 4 }}>
                                    <Typography fontWeight="bold" color="#1976d2">
                                        ${formatMoney(
                                            pedidosSancedFiltrados.reduce((sum, p) => sum + parseFloat(p.total || 0), 0)
                                        )}
                                    </Typography>
                                </Box>
                                <Box sx={{ minWidth: 120, mr: 4 }}>
                                    <Typography fontWeight="bold" color="#2e7d32">
                                        ${formatMoney(
                                            pedidosSancedFiltrados.reduce((sum, p) => sum + parseFloat(p.total_con_iva || 0), 0)
                                        )}
                                    </Typography>
                                </Box>
                                <Box sx={{ minWidth: 400 }} />
                            </Box>
                        </>
                    )}
                </Box>
            )}


            {/* ===== MODAL DETALLES ===== */}
            <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
                <Box sx={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '95%', maxWidth: 1200, maxHeight: '85vh', overflowY: 'auto',
                    bgcolor: 'background.paper', boxShadow: 24, p: 3, borderRadius: 2
                }}>
                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                        {editandoRuta ? (
                            <>
                                <TextField size="small" value={nuevoNombreRuta}
                                    onChange={e => setNuevoNombreRuta(e.target.value)} autoFocus />
                                <Button size="small" variant="contained"
                                    onClick={() => renombrarRuta(rutaSeleccionada, nuevoNombreRuta)}>
                                    Guardar
                                </Button>
                            </>
                        ) : (
                            <>
                                <Typography variant="h6">Detalles de la Ruta: {rutaSeleccionada}</Typography>
                                <IconButton size="small" onClick={() => { setEditandoRuta(true); setNuevoNombreRuta(rutaSeleccionada); }}>
                                    <BorderColorIcon fontSize="small" />
                                </IconButton>
                            </>
                        )}
                    </Box>

                    <TextField size="small" placeholder="Buscar por No Orden"
                        value={filtroModal} onChange={e => setFiltroModal(e.target.value)} sx={{ mb: 2, minWidth: 240 }} />

                    <TableContainer component={Paper}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Movimientos</TableCell>
                                    <TableCell>FECHA</TableCell>
                                    <TableCell>NO ORDEN</TableCell>
                                    <TableCell>TIPO ORDEN</TableCell>
                                    <TableCell>NO FACTURA</TableCell>
                                    <TableCell>NUM. CLIENTE</TableCell>
                                    <TableCell>NOMBRE DEL CLIENTE</TableCell>
                                    <TableCell>ZONA</TableCell>
                                    <TableCell>MUNICIPIO</TableCell>
                                    <TableCell>ESTADO</TableCell>
                                    <TableCell>OBSERVACIONES</TableCell>
                                    <TableCell>TOTAL</TableCell>
                                    <TableCell>PARTIDAS</TableCell>
                                    <TableCell>PIEZAS</TableCell>
                                    <TableCell>ACCIONES</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {pedidosModalFiltrados.map((row) => {
                                    const listaCompleta = rutas[rutaSeleccionada] || [];
                                    const realIndex = listaCompleta.findIndex(p => p.NO_ORDEN === row.NO_ORDEN);
                                    return (
                                        <TableRow key={row.NO_ORDEN}>
                                            <TableCell>
                                                {realIndex > 0 && (
                                                    <IconButton size="small" onClick={() => moverPedido(rutaSeleccionada, realIndex, 'arriba')}>
                                                        <ArrowUpwardIcon fontSize="small" color="primary" />
                                                    </IconButton>
                                                )}
                                                {realIndex < listaCompleta.length - 1 && (
                                                    <IconButton size="small" onClick={() => moverPedido(rutaSeleccionada, realIndex, 'abajo')}>
                                                        <ArrowDownwardIcon fontSize="small" color="primary" />
                                                    </IconButton>
                                                )}
                                            </TableCell>
                                            <TableCell>{row.FECHA}</TableCell>
                                            <TableCell>{row.NO_ORDEN}</TableCell>
                                            <TableCell>{row.tipo_original}</TableCell>
                                            <TableCell>{row.NO_FACTURA || '0'}</TableCell>
                                            <TableCell>{row.NUM_CLIENTE}</TableCell>
                                            <TableCell>{row.NOMBRE_DEL_CLIENTE}</TableCell>
                                            <TableCell>{row.ZONA}</TableCell>
                                            <TableCell>{row.MUNICIPIO}</TableCell>
                                            <TableCell>{row.ESTADO}</TableCell>
                                            <TableCell>Sin observaciones</TableCell>
                                            <TableCell>{formatCurrency(row.TOTAL)}</TableCell>
                                            <TableCell>{row.PARTIDAS}</TableCell>
                                            <TableCell>{row.PIEZAS}</TableCell>
                                            <TableCell>
                                                {editRouteIndex === realIndex ? (
                                                    <Select size="small" value=""
                                                        onChange={e => {
                                                            asignarPedidoARuta(row, e.target.value);
                                                            setRutas(prev => ({
                                                                ...prev,
                                                                [rutaSeleccionada]: prev[rutaSeleccionada].filter(p => p.NO_ORDEN !== row.NO_ORDEN)
                                                            }));
                                                            setEditRouteIndex(null);
                                                        }}
                                                        displayEmpty sx={{ minWidth: 120 }}>
                                                        <MenuItem disabled value="">Mover a...</MenuItem>
                                                        {Object.keys(rutas).filter(r => r !== rutaSeleccionada).map(r => (
                                                            <MenuItem key={r} value={r}>{r}</MenuItem>
                                                        ))}
                                                    </Select>
                                                ) : (
                                                    <IconButton size="small" onClick={() => setEditRouteIndex(realIndex)}>
                                                        <CompareArrowsIcon fontSize="small" />
                                                    </IconButton>
                                                )}
                                                <IconButton size="small" color="error"
                                                    onClick={() => quitarDeRuta(rutaSeleccionada, row.NO_ORDEN)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <Box textAlign="right" mt={2}>
                        <Button variant="contained" color="error"
                            onClick={() => { setModalOpen(false); setEditandoRuta(false); setEditRouteIndex(null); }}>
                            CERRAR
                        </Button>
                    </Box>
                </Box>
            </Modal>

            {modalPaqueteria.open && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.5)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <Paper sx={{ p: 3, width: 420, borderRadius: 2 }}>
                        <Typography variant="h6" fontWeight="bold" mb={1}>
                            🚚 Registrar Entrega por Paquetería
                        </Typography>
                        <Typography variant="body2" color="textSecondary" mb={2}>
                            <b>Pedido:</b> {modalPaqueteria.pedido?.no_orden} — {modalPaqueteria.pedido?.nombre_cliente}
                        </Typography>

                        <Box display="flex" flexDirection="column" gap={2}>
                            <TextField label="Monto *" size="small" type="number"
                                value={datosPaqueteria.monto}
                                onChange={e => setDatosPaqueteria(prev => ({ ...prev, monto: e.target.value }))}
                                fullWidth />
                            <TextField label="Fecha de entrega" size="small" type="date"
                                value={datosPaqueteria.fecha_entrega}
                                onChange={e => setDatosPaqueteria(prev => ({ ...prev, fecha_entrega: e.target.value }))}
                                InputLabelProps={{ shrink: true }}
                                fullWidth />
                            <TextField label="Observaciones" size="small" multiline rows={3}
                                value={datosPaqueteria.observaciones}
                                onChange={e => setDatosPaqueteria(prev => ({ ...prev, observaciones: e.target.value }))}
                                fullWidth />
                        </Box>

                        <Box display="flex" gap={2} justifyContent="flex-end" mt={3}>
                            <Button variant="outlined" color="error"
                                onClick={() => setModalPaqueteria({ open: false, pedido: null })}>
                                Cancelar
                            </Button>
                            <Button variant="contained" color="success"
                                onClick={guardarEntregaPaqueteria}>
                                💾 Guardar
                            </Button>
                        </Box>
                    </Paper>
                </div>
            )}

        </div>
    );
}

export default Plan;