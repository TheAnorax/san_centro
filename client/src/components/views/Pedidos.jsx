import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Card, CardContent, Typography, Box, Divider, Button, TextField, Chip, MenuItem, Select, Tooltip } from '@mui/material';
import Pagination from '@mui/material/Pagination';
import { FaTimes } from "react-icons/fa";
import axios from 'axios';
import logoSantul from '../../img/general/icono_santul.png';
import Swal from "sweetalert2";

function Pedidos() {
    const [pedidos, setPedidos] = useState([]);
    const [, setLoading] = useState(true);
    const [expandedPedidos, setExpandedPedidos] = useState([]);
    const [page, setPage] = useState(1);
    const [searchNoOrden, setSearchNoOrden] = useState('');
    const [, setBuscando] = useState(false);
    const pedidosPorPagina = 6;
    const searchTimeout = useRef(null);

    const [bahias, setBahias] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [bahiasPorPedido, setBahiasPorPedido] = useState({});
    const [usuariosPorPedido, setUsuariosPorPedido] = useState({});
    const [responsablesCuarto, setResponsablesCuarto] = useState([]);

    // ✅ NUEVO — modo por pedido: 'individual' o 'cuarto'
    const [modoPorPedido, setModoPorPedido] = useState({});

    const nombreBahia = (b) =>
        (b?.bahia ?? b?.Bahia ?? b?.nombre ?? b?.codigo ?? b?.id ?? '').toString().trim();

    const isBahiaLibre = (b) => {
        const est = (b?.estado ?? b?.estatus ?? b?.status ?? '').toString().toLowerCase().trim();
        if (est) {
            if (/(ocupado|asignado|en uso|busy)/i.test(est)) return false;
            if (/(libre|disponible)/i.test(est)) return true;
            if (/(sin ingreso|n\/a|na)/i.test(est)) return true;
        }
        if (b && (b.no_orden || b.orden_actual)) return false;
        if (typeof b?.ocupado !== 'undefined') return !(!b.ocupado);
        if (typeof b?.libre !== 'undefined') return !!b.libre;
        if (typeof b?.disponible !== 'undefined') return !!b.disponible;
        return true;
    };

    const bahiasLibres = useMemo(() => {
        const libres = (bahias || []).filter(isBahiaLibre);
        return libres.length > 0 ? libres : (bahias || []);
    }, [bahias]);

    const getResponsable = (ubicacion) => {
        if (!ubicacion) return null;
        const cuarto = ubicacion.split('-')[0]?.trim();
        return responsablesCuarto.find(r => r.cuarto === cuarto) || null;
    };

    const cargarBahias = async () => {
        try {
            const res = await axios.get("http://66.232.105.107:3001/api/pedidos/bahias");
            setBahias(res.data || []);
        } catch { setBahias([]); }
    };

    const cargarTodosPedidos = (callback) => {
        setLoading(true);
        axios.get('http://66.232.105.107:3001/api/pedidos/todos-con-productos')
            .then(res => {
                const data = (res.data || []).map(p => ({ ...p, productos: p.productos || [] }));
                setPedidos(data);
            })
            .finally(() => { setLoading(false); if (callback) callback(); });
    };

    useEffect(() => {
        axios.get('http://66.232.105.107:3001/api/pedidos/usuarios-surtidor')
            .then(res => setUsuarios(res.data || []));
        cargarBahias();
        cargarTodosPedidos();
        axios.get('http://66.232.105.107:3001/api/pedidos/responsables-cuarto')
            .then(res => setResponsablesCuarto(res.data || []));
    }, []);

    useEffect(() => {
        const id = setInterval(cargarBahias, 15000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (!searchNoOrden) {
            setBuscando(true);
            cargarTodosPedidos(() => setBuscando(false));
            return;
        }
        setBuscando(true);
        searchTimeout.current = setTimeout(async () => {
            try {
                const res = await axios.get(`http://66.232.105.107:3001/api/pedidos/productos-por-orden/${searchNoOrden}`);
                if (res.data?.info && res.data?.items?.length > 0) {
                    setPedidos([{ ...res.data.info, productos: res.data.items }]);
                } else { setPedidos([]); }
            } catch { setPedidos([]); }
            setBuscando(false);
        }, 350);
    }, [searchNoOrden]);

    const toggleExpandPedido = (no_orden) => {
        setExpandedPedidos(expanded =>
            expanded.includes(no_orden)
                ? expanded.filter(id => id !== no_orden)
                : [...expanded, no_orden]
        );
    };

    const handleUsuarioChange = (no_orden, value) => {
        setUsuariosPorPedido(prev => ({ ...prev, [no_orden]: value }));
    };

    // ✅ NUEVO — cambia el modo y limpia el usuario si cambia a cuarto
    const handleModoChange = (no_orden, modo) => {
        setModoPorPedido(prev => ({ ...prev, [no_orden]: modo }));
        if (modo === 'cuarto') {
            setUsuariosPorPedido(prev => ({ ...prev, [no_orden]: '' }));
        }
    };

    const handleAgregarPedido = async (pedido) => {
        const bahias = bahiasPorPedido[pedido.no_orden] || [];
        const usuario = usuariosPorPedido[pedido.no_orden];
        const modo = modoPorPedido[pedido.no_orden] || 'individual';

        // ✅ Validación según modo
        if (!bahias.length) {
            Swal.fire({ icon: "warning", title: "Falta bahía", text: "Selecciona al menos una bahía.", confirmButtonColor: "#f39c12" });
            return;
        }
        if (modo === 'individual' && !usuario) {
            Swal.fire({ icon: "warning", title: "Falta usuario", text: "Selecciona un usuario para el modo individual.", confirmButtonColor: "#f39c12" });
            return;
        }

        try {
            Swal.fire({
                title: "Asignando pedido...",
                text: `Por favor espera mientras se asigna el pedido ${pedido.no_orden}.`,
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading(),
            });

            const res = await axios.post(
                'http://66.232.105.107:3001/api/pedidos/agregar-pedido-surtiendo',
                {
                    no_orden: pedido.no_orden,
                    tipo: pedido.tipo,
                    bahias,
                    usuario: modo === 'individual' ? usuario : null, // ✅ null = usar cuartos
                    modo // ✅ manda el modo al backend
                }
            );

            Swal.close();

            if (res.data?.ok) {
                await Swal.fire({
                    icon: "success",
                    title: "Pedido asignado correctamente",
                    text: `El pedido ${pedido.no_orden} fue asignado con éxito.`,
                    confirmButtonColor: "#3085d6"
                });
                setBahias(prev => prev.filter(b => !bahias.includes(nombreBahia(b))));
                setBahiasPorPedido(prev => ({ ...prev, [pedido.no_orden]: [] }));
                setUsuariosPorPedido(prev => ({ ...prev, [pedido.no_orden]: '' }));
                setModoPorPedido(prev => ({ ...prev, [pedido.no_orden]: 'individual' }));
                cargarTodosPedidos();
                cargarBahias();
            } else {
                await Swal.fire({ icon: "error", title: "Error al asignar", text: res.data?.message || "No se pudo enviar el pedido.", confirmButtonColor: "#e74c3c" });
                cargarBahias();
            }
        } catch {
            Swal.close();
            Swal.fire({ icon: "error", title: "Error de conexión", text: "Ocurrió un error al intentar asignar el pedido.", confirmButtonColor: "#e74c3c" });
            cargarBahias();
        }
    };

    const totalPaginas = Math.ceil(pedidos.length / pedidosPorPagina);
    const pedidosMostrados = pedidos.slice((page - 1) * pedidosPorPagina, page * pedidosPorPagina);

    return (
        <div className="place_holder-container fade-in">
            <div className="place_holder-header" style={{ background: '#e74c3c', padding: '8px 16px' }}>
                <span className="place_holder-title" style={{ color: '#fff', fontWeight: 600, fontSize: 20 }}>
                    Pedidos Faltantes
                </span>
                <button className="place_holder-close" onClick={() => (window.location.href = '/menu')}>
                    <FaTimes color="#fff" />
                </button>
            </div>

            <Box display="flex" justifyContent="center" alignItems="center" mt={3} mb={2}>
                <TextField
                    size="small" variant="outlined" label="Buscar por No. Orden"
                    value={searchNoOrden} onChange={e => setSearchNoOrden(e.target.value)}
                    sx={{ width: 240, mr: 1 }}
                />
                {searchNoOrden && <Button color="secondary" onClick={() => setSearchNoOrden('')}>Limpiar</Button>}
            </Box>

            {totalPaginas > 1 && (
                <Box align="center" mt={2} mb={2}>
                    <Pagination count={totalPaginas} page={page} onChange={(e, value) => setPage(value)}
                        color="primary" size="large" shape="rounded" siblingCount={1} boundaryCount={1} showFirstButton showLastButton />
                </Box>
            )}

            <Box p={3} sx={{ background: "#faf9f9", minHeight: "100vh" }}>
                <Box sx={{ height: '80vh', overflowY: 'auto', pb: 8, pr: 2, borderRadius: 2, border: '1px solid #eee', background: '#fff' }}>
                    {pedidosMostrados.length === 0 ? (
                        <Box textAlign="center" mt={10} color="#888" fontSize={18}>No hay pedidos.</Box>
                    ) : (
                        pedidosMostrados.map(pedido => {
                            const isExpanded = expandedPedidos.includes(pedido.no_orden);
                            const productos = pedido.productos || [];
                            const productosToShow = isExpanded ? productos : productos.slice(0, 5);
                            const bahiasSeleccionadas = bahiasPorPedido[pedido.no_orden] || [];
                            const modo = modoPorPedido[pedido.no_orden] || 'individual'; // ✅

                            const selectedBahiaDisponible =
                                bahiasSeleccionadas.length > 0 &&
                                bahiasSeleccionadas.every(bah =>
                                    bahiasLibres.some(b => nombreBahia(b) === bah && isBahiaLibre(b))
                                );

                            // ✅ Botón habilitado según modo
                            const puedeAgregar =
                                pedido.estado_proceso === 'PENDIENTE' &&
                                bahiasSeleccionadas.length > 0 &&
                                selectedBahiaDisponible &&
                                (modo === 'cuarto' || usuariosPorPedido[pedido.no_orden]);

                            return (
                                <Card sx={{ mb: 4, boxShadow: 2 }} key={pedido.no_orden}>
                                    <CardContent>
                                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                            <img src={logoSantul} alt="Logo" style={{ width: 90, height: 90 }} />

                                            <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: 'wrap' }}>

                                                {/* ✅ SELECTOR DE BAHÍAS */}
                                                <Select
                                                    multiple
                                                    value={bahiasPorPedido[pedido.no_orden] || []}
                                                    onChange={(e) =>
                                                        setBahiasPorPedido(prev => ({
                                                            ...prev,
                                                            [pedido.no_orden]: typeof e.target.value === 'string'
                                                                ? e.target.value.split(',')
                                                                : e.target.value
                                                        }))
                                                    }
                                                    renderValue={(selected) => (
                                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                            {selected.map((value) => <Chip key={value} label={value} />)}
                                                        </Box>
                                                    )}
                                                    sx={{ minWidth: 200 }}
                                                >
                                                    {bahiasLibres.map(b => {
                                                        const name = nombreBahia(b);
                                                        return <MenuItem key={name} value={name}>{name}</MenuItem>;
                                                    })}
                                                </Select>

                                                {/* ✅ BOTONES DE MODO */}
                                                <Box sx={{ display: 'flex', border: '1px solid #ddd', borderRadius: 2, overflow: 'hidden' }}>
                                                    <button
                                                        onClick={() => handleModoChange(pedido.no_orden, 'individual')}
                                                        style={{
                                                            padding: '6px 14px', fontSize: 13, cursor: 'pointer', border: 'none',
                                                            background: modo === 'individual' ? '#1565c0' : '#f5f5f5',
                                                            color: modo === 'individual' ? '#fff' : '#333',
                                                            fontWeight: modo === 'individual' ? 700 : 400,
                                                        }}
                                                    >
                                                        👤 Individual
                                                    </button>
                                                    <button
                                                        onClick={() => handleModoChange(pedido.no_orden, 'cuarto')}
                                                        style={{
                                                            padding: '6px 14px', fontSize: 13, cursor: 'pointer', border: 'none',
                                                            borderLeft: '1px solid #ddd',
                                                            background: modo === 'cuarto' ? '#2e7d32' : '#f5f5f5',
                                                            color: modo === 'cuarto' ? '#fff' : '#333',
                                                            fontWeight: modo === 'cuarto' ? 700 : 400,
                                                        }}
                                                    >
                                                        🏢 Por Cuarto
                                                    </button>
                                                </Box>

                                                {/* ✅ SELECTOR USUARIO — solo en modo individual */}
                                                {modo === 'individual' && (
                                                    <select
                                                        value={usuariosPorPedido[pedido.no_orden] || ''}
                                                        onChange={e => handleUsuarioChange(pedido.no_orden, Number(e.target.value))}
                                                        style={{
                                                            height: 38, borderRadius: 8, border: '1px solid #bbb',
                                                            fontSize: 16, padding: '0 10px', background: '#faf9f9',
                                                            minWidth: 140
                                                        }}
                                                    >
                                                        <option value="">Selecciona usuario</option>
                                                        {usuarios.map(u => (
                                                            <option key={u.id_usuario} value={u.id_usuario}>{u.nombre}</option>
                                                        ))}
                                                    </select>
                                                )}

                                                {/* ✅ BOTÓN AGREGAR */}
                                                <Tooltip
                                                    title={
                                                        pedido.estado_proceso === 'EN EMBARQUE'
                                                            ? '🚛 Este pedido ya está siendo embarcado.'
                                                            : pedido.estado_proceso === 'EN SURTIDO'
                                                                ? '📦 Este pedido ya está siendo surtido.'
                                                                : !puedeAgregar
                                                                    ? '⚠️ Selecciona bahía' + (modo === 'individual' ? ' y usuario' : '')
                                                                    : '✅ Listo para asignar'
                                                    }
                                                    arrow placement="top"
                                                >
                                                    <span>
                                                        <Button
                                                            variant="contained" size="small"
                                                            disabled={!puedeAgregar}
                                                            onClick={() => handleAgregarPedido(pedido)}
                                                            sx={{
                                                                bgcolor: modo === 'cuarto' ? '#2e7d32' : undefined,
                                                                '&:hover': { bgcolor: modo === 'cuarto' ? '#1b5e20' : undefined },
                                                                '&.Mui-disabled': {
                                                                    bgcolor: pedido.estado_proceso === 'EN EMBARQUE'
                                                                        ? '#1565c0 !important'
                                                                        : pedido.estado_proceso === 'EN SURTIDO'
                                                                            ? '#e65100 !important'
                                                                            : undefined,
                                                                    color: pedido.estado_proceso !== 'PENDIENTE' ? '#fff !important' : undefined,
                                                                }
                                                            }}
                                                        >
                                                            {pedido.estado_proceso !== 'PENDIENTE'
                                                                ? pedido.estado_proceso
                                                                : modo === 'cuarto' ? '🏢 Asignar por Cuarto' : 'Agregar'
                                                            }
                                                        </Button>
                                                    </span>
                                                </Tooltip>
                                            </Box>

                                            <Box flex={1} textAlign="center">
                                                <Typography variant="h5" fontWeight={600}>
                                                    {pedido.tipo} : {pedido.no_orden}
                                                </Typography>
                                            </Box>
                                            <Typography variant="body1" align="right">
                                                Registro: {pedido.registro ? new Date(pedido.registro).toLocaleDateString('es-MX') : ''}
                                            </Typography>
                                        </Box>

                                        <Divider sx={{ mb: 2 }} />

                                        <Box sx={{ maxWidth: 1000, margin: '0 auto', mb: 2 }}>
                                            <Typography variant="h6" align="center">Productos</Typography>
                                        </Box>

                                        <Box sx={{ overflowX: 'auto', maxWidth: 1000, margin: '0 auto', mt: 1 }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.92rem', background: '#fff', tableLayout: 'fixed' }}>
                                                <thead>
                                                    <tr style={{ background: '#f5f5f5' }}>
                                                        <th style={{ padding: '6px', width: '15%', textAlign: 'center' }}>Código</th>
                                                        <th style={{ padding: '6px', width: modo === 'cuarto' ? '28%' : '35%', textAlign: 'center' }}>Descripción</th>
                                                        <th style={{ padding: '6px', width: '12%', textAlign: 'center' }}>Cantidad</th>
                                                        <th style={{ padding: '6px', width: '18%', textAlign: 'center' }}>Pasillo</th>
                                                        {/* ✅ Columna responsable solo en modo cuarto */}
                                                        {modo === 'cuarto' && (
                                                            <th style={{ padding: '6px', width: '27%', textAlign: 'center' }}>Responsable</th>
                                                        )}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(productosToShow || []).map((item, idx) => {
                                                        const responsable = modo === 'cuarto' ? getResponsable(item.ubicacion) : null;
                                                        return (
                                                            <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                                                                <td style={{ padding: '4px 6px', textAlign: 'center' }}>{item.codigo_pedido}</td>
                                                                <td style={{ padding: '4px 6px', textAlign: 'center' }}>{item.descripcion}</td>
                                                                <td style={{ padding: '4px 6px', textAlign: 'center' }}>{item.cantidad}</td>
                                                                <td style={{
                                                                    padding: '4px 6px', textAlign: 'center',
                                                                    color: (!item.ubicacion || item.ubicacion === '' || item.ubicacion.toLowerCase().includes('sin ubicación')) ? '#d32f2f' : '#222',
                                                                    fontWeight: (!item.ubicacion || item.ubicacion === '' || item.ubicacion.toLowerCase().includes('sin ubicación')) ? 600 : 400
                                                                }}>
                                                                    {item.ubicacion || 'Sin ubicación'}
                                                                </td>
                                                                {/* ✅ Celda responsable solo en modo cuarto */}
                                                                {modo === 'cuarto' && (
                                                                    <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                                                                        {responsable ? (
                                                                            <span style={{ background: '#e8f5e9', color: '#2e7d32', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                                                                                👤 {responsable.nombre}
                                                                            </span>
                                                                        ) : (
                                                                            <span style={{ color: '#bbb', fontSize: 11 }}>Sin asignar</span>
                                                                        )}
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        );
                                                    })}

                                                    {(pedido.productos?.length || 0) > 5 && (
                                                        <tr>
                                                            <td colSpan={modo === 'cuarto' ? 5 : 4} style={{ textAlign: 'center', paddingTop: 8 }}>
                                                                <Button size="small" variant="outlined" color="primary" onClick={() => toggleExpandPedido(pedido.no_orden)}>
                                                                    {isExpanded ? "Ver menos" : `Ver todos (${pedido.productos.length})`}
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </Box>
                                    </CardContent>
                                </Card>
                            );
                        })
                    )}
                </Box>
            </Box>
        </div>
    );
}

export default Pedidos;