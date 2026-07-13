import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Card, CardContent, Typography, Box, Divider, Button, TextField, Chip, MenuItem, Select, Tooltip, Checkbox } from '@mui/material';
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
    const [modoPorPedido, setModoPorPedido] = useState({});
    const [selectedPedidos, setSelectedPedidos] = useState([]);
    const FUSION_KEY = '__fusion__';

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

    // ✅ Búsqueda siempre funciona — no interfiere con selección de fusión
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
                    setPedidos([{ ...res.data.info, productos: res.data.items, estado_proceso: 'PENDIENTE' }]);
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

    const handleUsuarioChange = (key, value) => {
        setUsuariosPorPedido(prev => ({ ...prev, [key]: value }));
    };

    const handleModoChange = (key, modo) => {
        setModoPorPedido(prev => ({ ...prev, [key]: modo }));
        if (modo === 'cuarto') {
            setUsuariosPorPedido(prev => ({ ...prev, [key]: '' }));
        }
    };

    const toggleSeleccionPedido = (pedido) => {
        setSelectedPedidos(prev => {
            const yaEsta = prev.some(p => p.no_orden === pedido.no_orden);
            if (yaEsta) return prev.filter(p => p.no_orden !== pedido.no_orden);
            return [...prev, { no_orden: pedido.no_orden, tipo: pedido.tipo }];
        });
    };

    const limpiarFusion = () => {
        setSelectedPedidos([]);
        setBahiasPorPedido(prev => { const n = { ...prev }; delete n[FUSION_KEY]; return n; });
        setUsuariosPorPedido(prev => { const n = { ...prev }; delete n[FUSION_KEY]; return n; });
        setModoPorPedido(prev => { const n = { ...prev }; delete n[FUSION_KEY]; return n; });
    };

    const handleAgregarPedido = async (pedido = null) => {
        const esFusion = pedido === null;
        const key = esFusion ? FUSION_KEY : pedido.no_orden;

        const bahiasSelec = bahiasPorPedido[key] || [];
        const usuario = usuariosPorPedido[key];
        const modo = modoPorPedido[key] || 'individual';

        if (!bahiasSelec.length) {
            Swal.fire({ icon: "warning", title: "Falta bahía", text: "Selecciona al menos una bahía.", confirmButtonColor: "#f39c12" });
            return;
        }
        if (modo === 'individual' && !usuario) {
            Swal.fire({ icon: "warning", title: "Falta usuario", text: "Selecciona un usuario para el modo individual.", confirmButtonColor: "#f39c12" });
            return;
        }

        const ordenes = esFusion
            ? selectedPedidos.map(p => ({ no_orden: p.no_orden, tipo: p.tipo }))
            : [{ no_orden: pedido.no_orden, tipo: pedido.tipo }];

        const labelOrden = esFusion
            ? selectedPedidos.map(p => p.no_orden).join(' + ')
            : pedido.no_orden;

        try {
            Swal.fire({
                title: "Asignando pedido...",
                text: `Por favor espera mientras se asigna ${esFusion ? 'la fusión' : 'el pedido'} ${labelOrden}.`,
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading(),
            });

            const res = await axios.post(
                'http://66.232.105.107:3001/api/pedidos/agregar-pedido-surtiendo',
                { ordenes, bahias: bahiasSelec, usuario: modo === 'individual' ? usuario : null, modo }
            );

            Swal.close();

            if (res.data?.ok) {
                await Swal.fire({
                    icon: "success",
                    title: esFusion ? "Pedidos fusionados correctamente" : "Pedido asignado correctamente",
                    text: `${esFusion ? 'La fusión' : 'El pedido'} ${labelOrden} fue asignado con éxito.`,
                    confirmButtonColor: "#3085d6"
                });
                if (esFusion) {
                    limpiarFusion();
                } else {
                    setBahiasPorPedido(prev => ({ ...prev, [key]: [] }));
                    setUsuariosPorPedido(prev => ({ ...prev, [key]: '' }));
                    setModoPorPedido(prev => ({ ...prev, [key]: 'individual' }));
                }
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

    const modoFusion = modoPorPedido[FUSION_KEY] || 'individual';
    const bahiasFusion = bahiasPorPedido[FUSION_KEY] || [];
    const usuarioFusion = usuariosPorPedido[FUSION_KEY];
    const puedeFusionar =
        selectedPedidos.length >= 2 &&
        bahiasFusion.length > 0 &&
        (modoFusion === 'cuarto' || usuarioFusion);

    // ✅ Vista previa de fusión: combina los productos de los pedidos
    // seleccionados y muestra, por código, si se fusiona y cuánto aporta
    // cada orden (para que se vea igual a lo que va a insertar el backend).
    const previewFusion = useMemo(() => {
        if (selectedPedidos.length < 2) return [];

        const porCodigo = {};
        selectedPedidos.forEach(sel => {
            const pedidoCompleto = pedidos.find(p => p.no_orden === sel.no_orden);
            if (!pedidoCompleto) return;
            (pedidoCompleto.productos || []).forEach(item => {
                const key = item.codigo_pedido;
                if (!porCodigo[key]) porCodigo[key] = { codigo_pedido: key, descripcion: item.descripcion, porOrden: [] };
                porCodigo[key].porOrden.push({
                    no_orden: sel.no_orden,
                    tipo: sel.tipo,
                    cantidad: Number(item.cantidad) || 0
                });
            });
        });

        return Object.values(porCodigo).map(grupo => {
            const fusion = grupo.porOrden.length > 1;
            const cantidadTotal = grupo.porOrden.reduce((sum, o) => sum + o.cantidad, 0);
            return {
                ...grupo,
                fusion,
                cantidadTotal,
                cantidadPorOrdenTexto: grupo.porOrden
                    .map(o => `${o.tipo} ${o.no_orden}: ${o.cantidad}`)
                    .join('  |  ')
            };
        });
    }, [selectedPedidos, pedidos]);

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
                    value={searchNoOrden} onChange={e => { setSearchNoOrden(e.target.value); setPage(1); }}
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

            {/* ── PANEL DE FUSIÓN ── */}
            {selectedPedidos.length >= 1 && (
                <Box sx={{
                    mx: 3, mb: 2, p: 2, borderRadius: 2,
                    border: '2px solid #7b1fa2',
                    background: '#f3e5f5',
                    display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2
                }}>
                    <Typography fontWeight={700} color="#7b1fa2" sx={{ minWidth: 200 }}>
                        🔗 {selectedPedidos.length >= 2
                            ? `Fusionar: ${selectedPedidos.map(p => `${p.tipo} ${p.no_orden}`).join(' + ')}`
                            : `Seleccionado: ${selectedPedidos.map(p => `${p.tipo} ${p.no_orden}`).join('')} — selecciona otro para fusionar`
                        }
                    </Typography>

                    {/* Solo muestra controles cuando hay 2+ seleccionados */}
                    {selectedPedidos.length >= 2 && (<>
                        <Select
                            multiple
                            value={bahiasFusion}
                            onChange={e => setBahiasPorPedido(prev => ({
                                ...prev,
                                [FUSION_KEY]: typeof e.target.value === 'string'
                                    ? e.target.value.split(',')
                                    : e.target.value
                            }))}
                            renderValue={selected => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {selected.map(v => <Chip key={v} label={v} size="small" />)}
                                </Box>
                            )}
                            sx={{ minWidth: 180, background: '#fff' }}
                            displayEmpty
                        >
                            <MenuItem disabled value=""><em>Bahía(s)</em></MenuItem>
                            {bahiasLibres.map(b => {
                                const name = nombreBahia(b);
                                return <MenuItem key={name} value={name}>{name}</MenuItem>;
                            })}
                        </Select>

                        <Box sx={{ display: 'flex', border: '1px solid #ce93d8', borderRadius: 2, overflow: 'hidden' }}>
                            {['individual', 'cuarto'].map(m => (
                                <button key={m}
                                    onClick={() => handleModoChange(FUSION_KEY, m)}
                                    style={{
                                        padding: '6px 12px', fontSize: 13, cursor: 'pointer', border: 'none',
                                        borderLeft: m === 'cuarto' ? '1px solid #ce93d8' : 'none',
                                        background: modoFusion === m ? '#7b1fa2' : '#fff',
                                        color: modoFusion === m ? '#fff' : '#7b1fa2',
                                        fontWeight: modoFusion === m ? 700 : 400,
                                    }}
                                >
                                    {m === 'individual' ? '👤 Individual' : '🏢 Por Cuarto'}
                                </button>
                            ))}
                        </Box>

                        {modoFusion === 'individual' && (
                            <select
                                value={usuarioFusion || ''}
                                onChange={e => handleUsuarioChange(FUSION_KEY, Number(e.target.value))}
                                style={{
                                    height: 38, borderRadius: 8, border: '1px solid #ce93d8',
                                    fontSize: 15, padding: '0 10px', background: '#fff', minWidth: 140
                                }}
                            >
                                <option value="">Selecciona usuario</option>
                                {usuarios.map(u => (
                                    <option key={u.id_usuario} value={u.id_usuario}>{u.nombre}</option>
                                ))}
                            </select>
                        )}

                        <Button
                            variant="contained"
                            disabled={!puedeFusionar}
                            onClick={() => handleAgregarPedido(null)}
                            sx={{ background: '#7b1fa2', '&:hover': { background: '#6a1b9a' } }}
                        >
                            🔗 Fusionar y surtir
                        </Button>
                    </>)}

                    <Button variant="outlined" color="secondary" onClick={limpiarFusion} size="small">
                        Cancelar
                    </Button>

                    {/* ✅ Vista previa de la fusión: qué código se fusiona y cuánto aporta cada orden */}
                    {selectedPedidos.length >= 2 && (
                        <Box sx={{ width: '100%', mt: 1 }}>
                            <Typography variant="subtitle2" fontWeight={700} color="#7b1fa2" sx={{ mb: 0.5 }}>
                                Vista previa de la fusión
                            </Typography>
                            <Box sx={{ overflowX: 'auto', background: '#fff', borderRadius: 1, border: '1px solid #ce93d8' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                    <thead>
                                        <tr style={{ background: '#f3e5f5' }}>
                                            <th style={{ padding: '6px', textAlign: 'center' }}>Código</th>
                                            <th style={{ padding: '6px', textAlign: 'center' }}>Descripción</th>
                                            <th style={{ padding: '6px', textAlign: 'center' }}>Cantidad total</th>
                                            <th style={{ padding: '6px', textAlign: 'center' }}>Fusión</th>
                                            <th style={{ padding: '6px', textAlign: 'center' }}>Cantidad por orden</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewFusion.map((row, idx) => (
                                            <tr key={row.codigo_pedido} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.03)' }}>
                                                <td style={{ padding: '4px 6px', textAlign: 'center' }}>{row.codigo_pedido}</td>
                                                <td style={{ padding: '4px 6px', textAlign: 'center' }}>{row.descripcion}</td>
                                                <td style={{ padding: '4px 6px', textAlign: 'center' }}>{row.cantidadTotal}</td>
                                                <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                                                    {row.fusion ? (
                                                        <Chip label="Sí" size="small" sx={{ background: '#7b1fa2', color: '#fff', fontWeight: 700 }} />
                                                    ) : (
                                                        <Chip label="No" size="small" variant="outlined" />
                                                    )}
                                                </td>
                                                <td style={{ padding: '4px 6px', textAlign: 'center' }}>{row.cantidadPorOrdenTexto}</td>
                                            </tr>
                                        ))}
                                        {previewFusion.length === 0 && (
                                            <tr><td colSpan={5} style={{ textAlign: 'center', padding: 8, color: '#888' }}>Sin productos para mostrar.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </Box>
                        </Box>
                    )}
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
                            const modo = modoPorPedido[pedido.no_orden] || 'individual';
                            const isSeleccionado = selectedPedidos.some(p => p.no_orden === pedido.no_orden);

                            const selectedBahiaDisponible =
                                bahiasSeleccionadas.length > 0 &&
                                bahiasSeleccionadas.every(bah =>
                                    bahiasLibres.some(b => nombreBahia(b) === bah && isBahiaLibre(b))
                                );

                            const puedeAgregar =
                                pedido.estado_proceso === 'PENDIENTE' &&
                                bahiasSeleccionadas.length > 0 &&
                                selectedBahiaDisponible &&
                                (modo === 'cuarto' || usuariosPorPedido[pedido.no_orden]);

                            return (
                                <Card
                                    sx={{
                                        mb: 4,
                                        boxShadow: isSeleccionado ? '0 0 0 2px #7b1fa2' : 2,
                                        background: isSeleccionado ? '#fce4ff' : '#fff'
                                    }}
                                    key={pedido.no_orden}
                                >
                                    <CardContent>
                                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>

                                            {/* Logo + Checkbox */}
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <img src={logoSantul} alt="Logo" style={{ width: 90, height: 90 }} />
                                                {pedido.estado_proceso === 'PENDIENTE' && (
                                                    <Tooltip title={isSeleccionado ? "Quitar de fusión" : "Seleccionar para fusión"} arrow>
                                                        <Checkbox
                                                            checked={isSeleccionado}
                                                            onChange={() => toggleSeleccionPedido(pedido)}
                                                            sx={{ color: '#7b1fa2', '&.Mui-checked': { color: '#7b1fa2' } }}
                                                        />
                                                    </Tooltip>
                                                )}
                                            </Box>

                                            {/* Controles — se ocultan solo si está seleccionado para fusión */}
                                            <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: 'wrap' }}>
                                                {isSeleccionado ? (
                                                    // ✅ Pedido seleccionado: solo muestra chip, controles ocultos
                                                    <Chip
                                                        label="Seleccionado para fusión 🔗"
                                                        sx={{ background: '#7b1fa2', color: '#fff', fontWeight: 700 }}
                                                    />
                                                ) : (
                                                    // ✅ Pedido normal: muestra todos los controles
                                                    <>
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
                                                            displayEmpty
                                                        >
                                                            <MenuItem disabled value=""><em>Bahía(s)</em></MenuItem>
                                                            {bahiasLibres.map(b => {
                                                                const name = nombreBahia(b);
                                                                return <MenuItem key={name} value={name}>{name}</MenuItem>;
                                                            })}
                                                        </Select>

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
                                                    </>
                                                )}
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

                                        {/* ✅ Tabla de productos — siempre visible, incluso si está seleccionado */}
                                        <Box sx={{ overflowX: 'auto', maxWidth: 1000, margin: '0 auto', mt: 1 }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.92rem', background: 'transparent', tableLayout: 'fixed' }}>
                                                <thead>
                                                    <tr style={{ background: isSeleccionado ? '#e1bee7' : '#f5f5f5' }}>
                                                        <th style={{ padding: '6px', width: '15%', textAlign: 'center' }}>Código</th>
                                                        <th style={{ padding: '6px', width: modo === 'cuarto' ? '28%' : '35%', textAlign: 'center' }}>Descripción</th>
                                                        <th style={{ padding: '6px', width: '12%', textAlign: 'center' }}>Cantidad</th>
                                                        <th style={{ padding: '6px', width: '18%', textAlign: 'center' }}>Pasillo</th>
                                                        {modo === 'cuarto' && !isSeleccionado && (
                                                            <th style={{ padding: '6px', width: '27%', textAlign: 'center' }}>Responsable</th>
                                                        )}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(productosToShow || []).map((item, idx) => {
                                                        const responsable = (modo === 'cuarto' && !isSeleccionado) ? getResponsable(item.ubicacion) : null;
                                                        return (
                                                            <tr key={idx} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.03)' }}>
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
                                                                {modo === 'cuarto' && !isSeleccionado && (
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
                                                            <td colSpan={(modo === 'cuarto' && !isSeleccionado) ? 5 : 4} style={{ textAlign: 'center', paddingTop: 8 }}>
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