import React, { useState, useMemo, useEffect } from 'react';
import {
    Box, Button, Typography, Table, TableHead, TableBody,
    TableRow, TableCell, TableContainer, Paper, Select,
    MenuItem, FormControl, InputLabel, Chip, Checkbox,
    TextField, IconButton, Tooltip, Modal, Tabs, Tab, Divider
} from '@mui/material';
import { FaTimes } from "react-icons/fa";
import DeleteIcon from '@mui/icons-material/Delete';
import BorderColorIcon from '@mui/icons-material/BorderColor';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import axios from 'axios';

const LS_KEY = 'plan_rutas_data';
const LS_EXPIRY = 10 * 365 * 24 * 60 * 60 * 1000;

const guardarLS = (rutas, pedidos) => {
    const payload = {
        rutas,
        pedidos,
        timestamp: Date.now(),
        expiry: Date.now() + LS_EXPIRY
    };
    localStorage.setItem(LS_KEY, JSON.stringify(payload));
};

const cargarLS = () => {
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (Date.now() > data.expiry) {
            localStorage.removeItem(LS_KEY);
            return null;
        }
        return data;
    } catch {
        return null;
    }
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

    // ✅ TABS
    const [tabIndex, setTabIndex] = useState(0);
    const [rutasDB, setRutasDB] = useState([]);
    const [cargandoRutas, setCargandoRutas] = useState(false);

    // ✅ Fecha filtro (hoy por default)
    const [fechaFiltro, setFechaFiltro] = useState(
        new Date().toISOString().split('T')[0]
    );

    // Modal detalles
    const [modalOpen, setModalOpen] = useState(false);
    const [rutaSeleccionada, setRutaSeleccionada] = useState(null);
    const [editandoRuta, setEditandoRuta] = useState(false);
    const [nuevoNombreRuta, setNuevoNombreRuta] = useState('');
    const [filtroModal, setFiltroModal] = useState('');
    const [editRouteIndex, setEditRouteIndex] = useState(null);

    // ✅ Cargar desde localStorage al iniciar
    useEffect(() => {
        const data = cargarLS();
        if (data) {
            setRutas(data.rutas || {});
            setPedidos(data.pedidos || []);
        }
    }, []);

    // ✅ Guardar en localStorage cada vez que cambian rutas o pedidos
    useEffect(() => {
        if (Object.keys(rutas).length > 0 || pedidos.length > 0) {
            guardarLS(rutas, pedidos);
        }
    }, [rutas, pedidos]);

    // ✅ Cargar rutas de BD con fecha
    const cargarRutasDB = async (fecha) => {
        setCargandoRutas(true);
        try {
            const fechaParam = fecha || fechaFiltro;
            const res = await axios.get(
                `http://66.232.105.107:3001/api/Plan/rutas?fecha=${fechaParam}`
            );
            setRutasDB(res.data || []);
        } catch (err) {
            console.error('Error al cargar rutas:', err);
            Swal.fire({ icon: 'error', title: 'Error al cargar rutas', timer: 2000 });
        } finally {
            setCargandoRutas(false);
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
        if (typeof valor === 'number') {
            return new Date(Math.round((valor - 25569) * 86400 * 1000));
        }
        if (typeof valor === 'string') {
            const partes = valor.split('/');
            if (partes.length === 3) {
                return new Date(partes[2], partes[1] - 1, partes[0]);
            }
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

            const jsonData = XLSX.utils.sheet_to_json(ws, {
                defval: '',
                range: 6
            });

            const diasHabiles = getUltimos3DiasHabiles();
            const yaAsignados = new Set(
                Object.values(rutas).flat().map(p => p.NO_ORDEN)
            );

            const mapeado = jsonData
                .filter(row => {
                    if (!row['No Orden'] || row['No Orden'] === 'No Orden') return false;
                    if (row['Estatus'] !== 'Lista Surtido') return false;
                    if (yaAsignados.has(String(row['No Orden']).trim())) return false;

                    // ✅ Solo tipos CD y VQ
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
                const nuevos = mapeado.filter(
                    m => !prev.some(p => p.NO_ORDEN === m.NO_ORDEN)
                );
                return [...prev, ...nuevos];
            });

            Swal.fire({
                icon: 'success',
                title: `${mapeado.length} pedidos cargados`,
                text: 'Filtrados: Lista Surtido — últimos 3 días hábiles (CD y VQ)',
                timer: 2500,
                showConfirmButton: false
            });
        };
        reader.readAsBinaryString(file);
        e.target.value = '';
    };

    const agregarRuta = () => {
        if (!nuevaRuta.trim()) {
            Swal.fire({ icon: 'warning', title: 'Escribe el nombre de la ruta' });
            return;
        }
        if (rutas[nuevaRuta]) {
            Swal.fire({ icon: 'warning', title: 'Esa ruta ya existe' });
            return;
        }
        setRutas(prev => ({ ...prev, [nuevaRuta]: [] }));
        setNuevaRuta('');
    };

    const asignarPedidoARuta = (pedido, nombreRuta) => {
        if (!nombreRuta) return;
        setRutas(prev => {
            const nuevas = { ...prev };
            Object.keys(nuevas).forEach(r => {
                nuevas[r] = nuevas[r].filter(p => p.NO_ORDEN !== pedido.NO_ORDEN);
            });
            nuevas[nombreRuta] = [...(nuevas[nombreRuta] || []), pedido];
            return nuevas;
        });
        setPedidos(prev => prev.filter(p => p.NO_ORDEN !== pedido.NO_ORDEN));
    };

    const asignarMasivo = () => {
        if (!rutaAsignar) {
            Swal.fire({ icon: 'warning', title: 'Selecciona una ruta' });
            return;
        }
        if (seleccionados.length === 0) {
            Swal.fire({ icon: 'warning', title: 'Selecciona al menos un pedido' });
            return;
        }

        const pedidosAAsignar = pedidos.filter(p => seleccionados.includes(p.NO_ORDEN));

        setRutas(prev => {
            const nuevas = { ...prev };
            Object.keys(nuevas).forEach(r => {
                nuevas[r] = nuevas[r].filter(p => !seleccionados.includes(p.NO_ORDEN));
            });
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
        setRutas(prev => ({
            ...prev,
            [nombreRuta]: prev[nombreRuta].filter(p => p.NO_ORDEN !== noOrden)
        }));
        setPedidos(prev => [...prev, { ...pedido, rutaAsignada: null }]);
    };

    const eliminarRuta = (nombreRuta) => {
        Swal.fire({
            icon: 'warning',
            title: `¿Eliminar ruta "${nombreRuta}"?`,
            text: 'Los pedidos regresarán a la tabla principal',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then(result => {
            if (!result.isConfirmed) return;
            const pedidosDeRuta = rutas[nombreRuta] || [];
            setPedidos(prev => [...prev, ...pedidosDeRuta.map(p => ({ ...p, rutaAsignada: null }))]);
            setRutas(prev => {
                const nuevas = { ...prev };
                delete nuevas[nombreRuta];
                return nuevas;
            });
        });
    };

    const moverPedido = (nombreRuta, index, direccion) => {
        setRutas(prev => {
            const items = [...prev[nombreRuta]];
            if (direccion === 'arriba' && index > 0) {
                [items[index - 1], items[index]] = [items[index], items[index - 1]];
            }
            if (direccion === 'abajo' && index < items.length - 1) {
                [items[index], items[index + 1]] = [items[index + 1], items[index]];
            }
            return { ...prev, [nombreRuta]: items };
        });
    };

    const renombrarRuta = (oldName, newName) => {
        if (!newName.trim() || rutas[newName]) return;
        setRutas(prev => {
            const nuevas = {};
            Object.keys(prev).forEach(k => {
                nuevas[k === oldName ? newName : k] = prev[k];
            });
            return nuevas;
        });
        if (rutaSeleccionada === oldName) setRutaSeleccionada(newName);
        setEditandoRuta(false);
    };

    const handleEnviar = async () => {
        if (!tipoRuta) {
            Swal.fire({ icon: 'warning', title: 'Selecciona un tipo de ruta' });
            return;
        }

        const rutasConPedidos = Object.entries(rutas).filter(([, peds]) => peds.length > 0);

        if (rutasConPedidos.length === 0) {
            Swal.fire({ icon: 'warning', title: 'No hay pedidos asignados a ninguna ruta' });
            return;
        }

        const confirm = await Swal.fire({
            icon: 'question',
            title: '¿Enviar rutas?',
            html: rutasConPedidos.map(([nombre, peds]) =>
                `<b>${nombre}</b>: ${peds.length} pedidos`
            ).join('<br/>'),
            showCancelButton: true,
            confirmButtonText: 'Sí, enviar',
            cancelButtonText: 'Cancelar'
        });

        if (!confirm.isConfirmed) return;

        setCargando(true);

        const rutasArray = [];
        rutasConPedidos.forEach(([nombreRuta, peds]) => {
            peds.forEach(p => {
                rutasArray.push({
                    ...p,
                    routeName: nombreRuta,
                    TIPO: tipoRuta,
                    tipo_original: p.tipo_original || tipoRuta,
                    GUIA: '',
                    OBSERVACIONES: '',
                });
            });
        });

        try {
            const res = await axios.post(
                'http://66.232.105.107:3001/api/Plan/insertar',
                { rutas: rutasArray }
            );

            Swal.fire({
                icon: 'success',
                title: '✅ Rutas enviadas',
                text: res.data.message
            });

            setRutas(prev => {
                const nuevas = { ...prev };
                rutasConPedidos.forEach(([nombre]) => {
                    delete nuevas[nombre];
                });
                return nuevas;
            });

        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Error al enviar',
                text: err.response?.data?.message || 'Error de conexión'
            });
        } finally {
            setCargando(false);
        }
    };

    const pedidosFiltrados = useMemo(() => {
        return pedidos.filter(p => {
            const cumpleCliente = !filtroCliente ||
                p.NOMBRE_DEL_CLIENTE?.toLowerCase().includes(filtroCliente.toLowerCase()) ||
                p.NO_ORDEN?.includes(filtroCliente);
            const cumpleEstado = !filtroEstado ||
                p.ESTADO?.toLowerCase().includes(filtroEstado.toLowerCase());
            return cumpleCliente && cumpleEstado;
        });
    }, [pedidos, filtroCliente, filtroEstado]);

    const pedidosModalFiltrados = useMemo(() => {
        if (!rutaSeleccionada || !rutas[rutaSeleccionada]) return [];
        return rutas[rutaSeleccionada].filter(p =>
            !filtroModal ||
            p.NO_ORDEN?.includes(filtroModal) ||
            p.NOMBRE_DEL_CLIENTE?.toLowerCase().includes(filtroModal.toLowerCase())
        );
    }, [rutas, rutaSeleccionada, filtroModal]);

    const toggleSeleccion = (noOrden) => {
        setSeleccionados(prev =>
            prev.includes(noOrden)
                ? prev.filter(id => id !== noOrden)
                : [...prev, noOrden]
        );
    };

    const toggleTodos = () => {
        const disponibles = pedidosFiltrados.map(p => p.NO_ORDEN);
        setSeleccionados(prev =>
            prev.length === disponibles.length ? [] : disponibles
        );
    };

    const formatCurrency = (v) =>
        new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v || 0);

    const calcularTotales = (peds = []) => ({
        total: peds.reduce((s, p) => s + (p.TOTAL || 0), 0),
        partidas: peds.reduce((s, p) => s + (p.PARTIDAS || 0), 0),
        piezas: peds.reduce((s, p) => s + (p.PIEZAS || 0), 0),
    });

    return (
        <div className="place_holder-container fade-in">
            <div className="place_holder-header" style={{ background: '#e74c3c', padding: '8px 16px' }}>
                <span className="place_holder-title" style={{ color: '#fff', fontWeight: 600, fontSize: 20 }}>
                    Plan de Rutas
                </span>
                <button className="place_holder-close" onClick={() => (window.location.href = '/menu')}>
                    <FaTimes color="#fff" />
                </button>
            </div>

            {/* ===== TABS ===== */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#fff' }}>
                <Tabs value={tabIndex} onChange={(e, v) => {
                    setTabIndex(v);
                    if (v === 1) cargarRutasDB();
                }}>
                    <Tab label="📋 Plan" />
                    <Tab label="🚛 Rutas Guardadas" />
                </Tabs>
            </Box>

            {/* ===== TAB 1: PLAN ===== */}
            {tabIndex === 0 && (
                <Box p={2}>
                    <Paper sx={{ p: 2, mb: 2 }}>
                        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
                            <Button variant="contained" component="label"
                                sx={{ bgcolor: '#1976d2', textTransform: 'none' }}>
                                📂 Subir Excel
                                <input hidden type="file" accept=".xlsx,.xls" onChange={handleFileUpload} />
                            </Button>

                            <TextField size="small" placeholder="Nombre de Ruta"
                                value={nuevaRuta}
                                onChange={e => setNuevaRuta(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && agregarRuta()}
                                sx={{ minWidth: 160 }} />

                            <Button variant="contained" onClick={agregarRuta}
                                sx={{ bgcolor: '#fb8c00', textTransform: 'none' }}>
                                + Agregar Ruta
                            </Button>

                            <FormControl size="small" sx={{ minWidth: 160 }}>
                                <InputLabel>Tipo de Ruta</InputLabel>
                                <Select value={tipoRuta} label="Tipo de Ruta"
                                    onChange={e => setTipoRuta(e.target.value)}>
                                    <MenuItem value="cross">Cross</MenuItem>
                                </Select>
                            </FormControl>

                            <Button variant="contained" color="success"
                                disabled={cargando} onClick={handleEnviar}
                                sx={{ textTransform: 'none' }}>
                                {cargando ? 'Enviando...' : '✅ Enviar Rutas'}
                            </Button>

                            <Button variant="contained" color="error"
                                onClick={() => {
                                    Swal.fire({
                                        icon: 'warning',
                                        title: '¿Limpiar tabla?',
                                        text: 'Se eliminarán todos los pedidos de la lista principal.',
                                        showCancelButton: true,
                                        confirmButtonText: 'Sí, limpiar',
                                        cancelButtonText: 'Cancelar'
                                    }).then(result => {
                                        if (!result.isConfirmed) return;
                                        setPedidos([]);
                                        setSeleccionados([]);
                                        // ✅ También actualiza el localStorage
                                        guardarLS(rutas, []);
                                    });
                                }}
                                sx={{ textTransform: 'none' }}>
                                🗑 Limpiar Tabla
                            </Button>

                        </Box>

                        {seleccionados.length > 0 && (
                            <Box display="flex" gap={2} alignItems="center" mt={2}
                                sx={{ bgcolor: '#e3f2fd', p: 1.5, borderRadius: 1 }}>
                                <Typography variant="body2">
                                    <b>{seleccionados.length}</b> pedidos seleccionados
                                </Typography>
                                <FormControl size="small" sx={{ minWidth: 160 }}>
                                    <InputLabel>Asignar a Ruta</InputLabel>
                                    <Select value={rutaAsignar} label="Asignar a Ruta"
                                        onChange={e => setRutaAsignar(e.target.value)}>
                                        {Object.keys(rutas).map(r => (
                                            <MenuItem key={r} value={r}>{r}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <Button variant="contained" size="small"
                                    onClick={asignarMasivo}
                                    sx={{ textTransform: 'none' }}>
                                    Asignar
                                </Button>
                                <Button variant="outlined" size="small" color="error"
                                    onClick={() => setSeleccionados([])}
                                    sx={{ textTransform: 'none' }}>
                                    Limpiar
                                </Button>
                            </Box>
                        )}
                    </Paper>

                    {Object.keys(rutas).length > 0 && (
                        <Box display="flex" gap={2} flexWrap="wrap" mb={2}>
                            {Object.entries(rutas).map(([nombre, peds]) => {
                                const tots = calcularTotales(peds);
                                return (
                                    <Paper key={nombre} variant="outlined"
                                        sx={{ minWidth: 200, maxWidth: 230, p: 1.5, borderRadius: 2, position: 'relative' }}>
                                        <Box position="absolute" top={6} right={6} display="flex" gap={0.5}>
                                            <Tooltip title="Eliminar ruta">
                                                <IconButton size="small" color="error"
                                                    onClick={() => eliminarRuta(nombre)}>
                                                    <FaTimes size={12} />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                        <Checkbox size="small" sx={{ p: 0, mb: 0.5 }} />
                                        <Typography fontWeight={700} fontSize={14}>
                                            Ruta: {nombre}
                                        </Typography>
                                        <Typography variant="body2">
                                            Total: {formatCurrency(tots.total)}
                                        </Typography>
                                        <Typography variant="body2">
                                            Partidas: {tots.partidas}
                                        </Typography>
                                        <Typography variant="body2">
                                            Piezas: {tots.piezas}
                                        </Typography>
                                        <Button size="small"
                                            onClick={() => {
                                                setRutaSeleccionada(nombre);
                                                setFiltroModal('');
                                                setModalOpen(true);
                                            }}
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
                                <Typography variant="h6">
                                    Pedidos disponibles ({pedidosFiltrados.length})
                                </Typography>
                                <TextField size="small" placeholder="Buscar cliente / No Orden"
                                    value={filtroCliente}
                                    onChange={e => setFiltroCliente(e.target.value)}
                                    sx={{ minWidth: 220 }} />
                                <TextField size="small" placeholder="Filtrar por Estado"
                                    value={filtroEstado}
                                    onChange={e => setFiltroEstado(e.target.value)}
                                    sx={{ minWidth: 160 }} />
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
                                                <TableCell>
                                                    <Chip label={row.tipo_original} size="small"
                                                        sx={{ bgcolor: '#e3f2fd' }} />
                                                </TableCell>
                                                <TableCell>{row.FECHA}</TableCell>
                                                <TableCell>{row.NOMBRE_DEL_CLIENTE}</TableCell>
                                                <TableCell>{row.MUNICIPIO}</TableCell>
                                                <TableCell>{row.ESTADO}</TableCell>
                                                <TableCell>{formatCurrency(row.TOTAL)}</TableCell>
                                                <TableCell>{row.PARTIDAS}</TableCell>
                                                <TableCell>{row.PIEZAS}</TableCell>
                                                <TableCell>
                                                    <Select size="small" value=""
                                                        displayEmpty
                                                        onChange={e => asignarPedidoARuta(row, e.target.value)}
                                                        sx={{ minWidth: 130 }}>
                                                        <MenuItem value="" disabled>Seleccionar</MenuItem>
                                                        {Object.keys(rutas).map(r => (
                                                            <MenuItem key={r} value={r}>{r}</MenuItem>
                                                        ))}
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
                            <Typography variant="h6">
                                📂 Sube un archivo Excel para comenzar
                            </Typography>
                        </Box>
                    )}
                </Box>
            )}

            {/* ===== TAB 2: RUTAS GUARDADAS ===== */}
            {tabIndex === 1 && (
                <Box p={2}>
                    {/* ✅ Header con selector de fecha */}
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6">Rutas Guardadas</Typography>
                        <Box display="flex" gap={2} alignItems="center">
                            <TextField
                                type="date"
                                size="small"
                                label="Fecha"
                                value={fechaFiltro}
                                onChange={e => {
                                    setFechaFiltro(e.target.value);
                                    cargarRutasDB(e.target.value);
                                }}
                                InputLabelProps={{ shrink: true }}
                            />
                            <Button variant="outlined"
                                onClick={() => cargarRutasDB()}
                                disabled={cargandoRutas}
                                size="small">
                                🔄 Actualizar
                            </Button>
                        </Box>
                    </Box>

                    {cargandoRutas ? (
                        <Box textAlign="center" mt={5}>
                            <Typography>Cargando rutas...</Typography>
                        </Box>
                    ) : rutasDB.length === 0 ? (
                        <Box textAlign="center" mt={5} color="#888">
                            <Typography>No hay rutas guardadas para esta fecha.</Typography>
                        </Box>
                    ) : (
                        rutasDB.map(ruta => (
                            <Box key={ruta.routeName} mb={4}>
                                <Box display="flex" alignItems="center" gap={2} mb={1}
                                    sx={{ bgcolor: '#f5f5f5', p: 1.5, borderRadius: 1 }}>
                                    <Typography variant="h6" fontWeight={700}>
                                        Ruta: {ruta.routeName}
                                    </Typography>
                                    <Chip label={`Total: ${formatCurrency(ruta.total)}`}
                                        sx={{ bgcolor: '#e8f5e9' }} />
                                    <Chip label={`Partidas: ${ruta.partidas}`}
                                        sx={{ bgcolor: '#e3f2fd' }} />
                                    <Chip label={`Piezas: ${ruta.piezas}`}
                                        sx={{ bgcolor: '#fce4ec' }} />
                                    <Chip label={`${ruta.pedidos.length} pedidos`}
                                        sx={{ bgcolor: '#fff3e0' }} />
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
                                                    <TableCell>
                                                        <Chip label={pedido.tipo_original || pedido.TIPO}
                                                            size="small" sx={{ bgcolor: '#e3f2fd' }} />
                                                    </TableCell>
                                                    <TableCell>{pedido.NO_FACTURA || '—'}</TableCell>
                                                    <TableCell>{pedido.NOMBRE_DEL_CLIENTE}</TableCell>
                                                    <TableCell>{pedido.MUNICIPIO}</TableCell>
                                                    <TableCell>{pedido.ESTADO}</TableCell>
                                                    <TableCell>{formatCurrency(pedido.TOTAL)}</TableCell>
                                                    <TableCell>{pedido.PARTIDAS}</TableCell>
                                                    <TableCell>{pedido.PIEZAS}</TableCell>
                                                    <TableCell>
                                                        {pedido.GUIA && pedido.GUIA !== ''
                                                            ? <Chip label={pedido.GUIA} size="small" color="success" />
                                                            : '—'
                                                        }
                                                    </TableCell>
                                                    <TableCell>{pedido.TRANSPORTE || '—'}</TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" fontWeight={700}
                                                            sx={{
                                                                color:
                                                                    pedido.status_pedido === 'FINALIZADO' ? '#2e7d32' :
                                                                        pedido.status_pedido === 'EMBARQUE' ? '#1565c0' :
                                                                            pedido.status_pedido === 'SURTIDO' ? '#e65100' :
                                                                                '#c62828'
                                                            }}>
                                                            {pedido.status_pedido}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        {pedido.created_at
                                                            ? new Date(pedido.created_at).toLocaleDateString('es-MX')
                                                            : '—'
                                                        }
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

            {/* ===== MODAL DETALLES ===== */}
            <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
                <Box sx={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '95%', maxWidth: 1200,
                    maxHeight: '85vh', overflowY: 'auto',
                    bgcolor: 'background.paper',
                    boxShadow: 24, p: 3, borderRadius: 2
                }}>
                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                        {editandoRuta ? (
                            <>
                                <TextField size="small" value={nuevoNombreRuta}
                                    onChange={e => setNuevoNombreRuta(e.target.value)}
                                    autoFocus />
                                <Button size="small" variant="contained"
                                    onClick={() => renombrarRuta(rutaSeleccionada, nuevoNombreRuta)}>
                                    Guardar
                                </Button>
                            </>
                        ) : (
                            <>
                                <Typography variant="h6">
                                    Detalles de la Ruta: {rutaSeleccionada}
                                </Typography>
                                <IconButton size="small"
                                    onClick={() => {
                                        setEditandoRuta(true);
                                        setNuevoNombreRuta(rutaSeleccionada);
                                    }}>
                                    <BorderColorIcon fontSize="small" />
                                </IconButton>
                            </>
                        )}
                    </Box>

                    <TextField size="small" placeholder="Buscar por No Orden"
                        value={filtroModal}
                        onChange={e => setFiltroModal(e.target.value)}
                        sx={{ mb: 2, minWidth: 240 }} />

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
                                                    <IconButton size="small"
                                                        onClick={() => moverPedido(rutaSeleccionada, realIndex, 'arriba')}>
                                                        <ArrowUpwardIcon fontSize="small" color="primary" />
                                                    </IconButton>
                                                )}
                                                {realIndex < listaCompleta.length - 1 && (
                                                    <IconButton size="small"
                                                        onClick={() => moverPedido(rutaSeleccionada, realIndex, 'abajo')}>
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
                                                        {Object.keys(rutas)
                                                            .filter(r => r !== rutaSeleccionada)
                                                            .map(r => (
                                                                <MenuItem key={r} value={r}>{r}</MenuItem>
                                                            ))}
                                                    </Select>
                                                ) : (
                                                    <IconButton size="small"
                                                        onClick={() => setEditRouteIndex(realIndex)}>
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
                            onClick={() => {
                                setModalOpen(false);
                                setEditandoRuta(false);
                                setEditRouteIndex(null);
                            }}>
                            CERRAR
                        </Button>
                    </Box>
                </Box>
            </Modal>
        </div>
    );
}

export default Plan;