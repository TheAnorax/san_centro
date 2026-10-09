import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Card, Typography, Box, Button, TextField, Chip, MenuItem, Select, Tooltip, Checkbox, InputAdornment, IconButton } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import Pagination from '@mui/material/Pagination';
import { FaTimes } from "react-icons/fa";
import axios from 'axios';
import Swal from "sweetalert2";
import logoSantul from '../../img/general/icono_santul.png';

function Pedidos() {
    const [pedidos, setPedidos] = useState([]);
    const [, setLoading] = useState(true);
    const [expandedPedidos, setExpandedPedidos] = useState([]);
    const [page, setPage] = useState(1);
    const [searchNoOrden, setSearchNoOrden] = useState('');
    const [, setBuscando] = useState(false);
    const pedidosPorPagina = 4;
    const searchTimeout = useRef(null);

    const [bahias, setBahias] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const nombreBonito = (n) => (n || '').toString().trim().toLowerCase()
        .replace(/(^|\s)\S/g, (c) => c.toUpperCase());
    const usuariosOrdenados = useMemo(
        () => [...usuarios].sort((a, b) => nombreBonito(a.nombre).localeCompare(nombreBonito(b.nombre), 'es')),
        [usuarios]
    );
    const menuUsuarios = {
        PaperProps: { sx: { borderRadius: '12px', mt: 0.5, maxHeight: 320, boxShadow: '0 8px 24px rgba(16,24,40,0.15)' } },
        MenuListProps: { sx: { py: 0.5 } },
    };
    const itemUsuarioSx = {
        fontSize: '0.88rem', mx: 0.5, borderRadius: '8px', py: 0.8,
        '&.Mui-selected': { backgroundColor: '#eaf1ff', color: '#1d4ed8', fontWeight: 600 },
        '&.Mui-selected:hover': { backgroundColor: '#dde8ff' },
    };
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
            <div className="place_holder-header">
                <span className="place_holder-title">
                    Pedidos Faltantes
                </span>
                <button className="place_holder-close" onClick={() => (window.location.href = '/menu')}>
                    <FaTimes />
                </button>
            </div>

            <Box display="flex" justifyContent="center" alignItems="center" mt={3} mb={2}>
                <TextField
                    size="small" variant="outlined" placeholder="Buscar por No. Orden"
                    value={searchNoOrden} onChange={e => { setSearchNoOrden(e.target.value); setPage(1); }}
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
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon fontSize="small" sx={{ color: '#9aa3b2' }} />
                            </InputAdornment>
                        ),
                        endAdornment: searchNoOrden ? (
                            <InputAdornment position="end">
                                <IconButton size="small" onClick={() => setSearchNoOrden('')}>
                                    <ClearIcon fontSize="small" />
                                </IconButton>
                            </InputAdornment>
                        ) : null,
                    }}
                />
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
                            MenuProps={menuUsuarios}
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
                            <MenuItem disabled value="" sx={itemUsuarioSx}><em>Bahía(s)</em></MenuItem>
                            {bahiasLibres.map(b => {
                                const name = nombreBahia(b);
                                return <MenuItem key={name} value={name} sx={itemUsuarioSx}>{name}</MenuItem>;
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
                            <Select
                                size="small"
                                displayEmpty
                                value={usuarioFusion || ''}
                                onChange={e => handleUsuarioChange(FUSION_KEY, Number(e.target.value))}
                                MenuProps={menuUsuarios}
                                renderValue={(v) => v === '' ? <span style={{ color: '#9ca3af' }}>Selecciona usuario</span> : nombreBonito((usuarios.find(u => u.id_usuario === v) || {}).nombre)}
                                sx={{ background: '#fff', borderRadius: '10px', fontSize: '0.85rem', minWidth: 190, '& .MuiSelect-select': { py: 0.7 } }}
                            >
                                <MenuItem disabled value="" sx={itemUsuarioSx}><em>Selecciona usuario</em></MenuItem>
                                {usuariosOrdenados.map(u => (
                                    <MenuItem key={u.id_usuario} value={u.id_usuario} sx={itemUsuarioSx}>{nombreBonito(u.nombre)}</MenuItem>
                                ))}
                            </Select>
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
                                        mb: 2.5,
                                        overflow: 'hidden',
                                        borderRadius: '16px',
                                        border: isSeleccionado ? '2px solid #7b1fa2' : '1px solid #e6e9ef',
                                        boxShadow: '0 2px 10px rgba(16,24,40,0.06)',
                                        background: isSeleccionado ? '#fdf4ff' : '#fff',
                                        transition: 'box-shadow .2s ease, transform .2s ease',
                                        '&:hover': { boxShadow: '0 8px 24px rgba(16,24,40,0.10)' },
                                    }}
                                    key={pedido.no_orden}
                                >
                                    {/* ── Encabezado: pedido + asignación ── */}
                                    <Box sx={{
                                        px: 2.5, py: 1.5, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5,
                                        background: isSeleccionado ? '#f6e3fa' : 'linear-gradient(180deg, #fafbff 0%, #f3f5fb 100%)',
                                        borderBottom: '1px solid #e6e9ef',
                                    }}>
                                        {pedido.estado_proceso === 'PENDIENTE' && (
                                            <Tooltip title={isSeleccionado ? "Quitar de fusión" : "Seleccionar para fusión"} arrow>
                                                <Checkbox
                                                    checked={isSeleccionado}
                                                    onChange={() => toggleSeleccionPedido(pedido)}
                                                    sx={{ p: 0.5, color: '#9aa3b2', '&.Mui-checked': { color: '#7b1fa2' }, '& .MuiSvgIcon-root': { fontSize: 32 } }}
                                                />
                                            </Tooltip>
                                        )}

                                        <Box sx={{
                                            width: 46, height: 46, borderRadius: '14px', background: '#fff',
                                            border: '1px solid #e6e9ef', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            boxShadow: '0 1px 3px rgba(16,24,40,0.06)',
                                        }}>
                                            <img src={logoSantul} alt="Logo" style={{ width: 30, height: 30 }} />
                                        </Box>

                                        <Box sx={{ flex: '1 1 220px', minWidth: 200 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                                <Typography sx={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.3px', lineHeight: 1.1 }}>
                                                    {pedido.tipo} : {pedido.no_orden}
                                                </Typography>
                                                {pedido.estado_proceso !== 'PENDIENTE' && (
                                                <Chip
                                                    size="small"
                                                    label={pedido.estado_proceso}
                                                    sx={{
                                                        fontWeight: 700, fontSize: '0.68rem', height: 22,
                                                        background: pedido.estado_proceso === 'EN SURTIDO' ? '#fff1e6'
                                                            : pedido.estado_proceso === 'EN EMBARQUE' ? '#e7f0ff' : '#fff8e1',
                                                        color: pedido.estado_proceso === 'EN SURTIDO' ? '#c2410c'
                                                            : pedido.estado_proceso === 'EN EMBARQUE' ? '#1d4ed8' : '#a16207',
                                                    }}
                                                />
                                                )}
                                                {isSeleccionado && (
                                                    <Chip size="small" label="Fusión 🔗" sx={{ background: '#7b1fa2', color: '#fff', fontWeight: 700, height: 22 }} />
                                                )}
                                            </Box>
                                            <Typography sx={{ fontSize: '0.78rem', color: '#6b7280', mt: 0.4 }}>
                                                Registro {pedido.registro ? new Date(pedido.registro).toLocaleDateString('es-MX') : ''} · {productos.length} productos
                                            </Typography>
                                        </Box>

                                        {!isSeleccionado && (
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                                                <Select
                                                    multiple
                                                    MenuProps={menuUsuarios}
                                                    size="small"
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
                                                        selected.length === 0
                                                            ? <span style={{ color: '#9ca3af' }}>Bahía(s)</span>
                                                            : (
                                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                                    {selected.map((value) => <Chip key={value} label={value} size="small" />)}
                                                                </Box>
                                                            )
                                                    )}
                                                    sx={{ background: '#fff', borderRadius: '10px', fontSize: '0.85rem', minWidth: 150, '& .MuiSelect-select': { py: 0.7 } }}
                                                    displayEmpty
                                                >
                                                    <MenuItem disabled value="" sx={itemUsuarioSx}><em>Bahía(s)</em></MenuItem>
                                                    {bahiasLibres.map(b => {
                                                        const name = nombreBahia(b);
                                                        return <MenuItem key={name} value={name} sx={itemUsuarioSx}>{name}</MenuItem>;
                                                    })}
                                                </Select>

                                                <Box sx={{ display: 'flex', background: '#e9ecf3', borderRadius: '10px', p: '3px', gap: '3px' }}>
                                                    {[['individual', 'Individual'], ['cuarto', 'Por cuarto']].map(([m, texto]) => (
                                                        <Box
                                                            key={m}
                                                            onClick={() => handleModoChange(pedido.no_orden, m)}
                                                            sx={{
                                                                px: 1.6, py: 0.55, borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', whiteSpace: 'nowrap',
                                                                fontWeight: modo === m ? 700 : 500,
                                                                color: modo === m ? '#111827' : '#6b7280',
                                                                background: modo === m ? '#fff' : 'transparent',
                                                                boxShadow: modo === m ? '0 1px 3px rgba(16,24,40,0.15)' : 'none',
                                                                transition: 'all .15s ease',
                                                            }}
                                                        >
                                                            {texto}
                                                        </Box>
                                                    ))}
                                                </Box>

                                                {modo === 'individual' && (
                                                    <Select
                                                        size="small"
                                                        displayEmpty
                                                        value={usuariosPorPedido[pedido.no_orden] || ''}
                                                        onChange={e => handleUsuarioChange(pedido.no_orden, Number(e.target.value))}
                                                        MenuProps={menuUsuarios}
                                                        renderValue={(v) => v === '' ? <span style={{ color: '#9ca3af' }}>Selecciona usuario</span> : nombreBonito((usuarios.find(u => u.id_usuario === v) || {}).nombre)}
                                                        sx={{ background: '#fff', borderRadius: '10px', fontSize: '0.85rem', minWidth: 190, '& .MuiSelect-select': { py: 0.7 } }}
                                                    >
                                                        <MenuItem disabled value="" sx={itemUsuarioSx}><em>Selecciona usuario</em></MenuItem>
                                                        {usuariosOrdenados.map(u => (
                                                            <MenuItem key={u.id_usuario} value={u.id_usuario} sx={itemUsuarioSx}>{nombreBonito(u.nombre)}</MenuItem>
                                                        ))}
                                                    </Select>
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
                                                                height: 36, borderRadius: '10px', px: 2.5,
                                                                bgcolor: modo === 'cuarto' ? '#2e7d32' : undefined,
                                                                ...(modo === 'cuarto' && { color: '#fff', borderColor: '#2e7d32' }),
                                                                '&:hover': {
                                                                    bgcolor: modo === 'cuarto' ? '#1b5e20' : undefined,
                                                                    ...(modo === 'cuarto' && { color: '#fff', borderColor: '#1b5e20' }),
                                                                },
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
                                                                : modo === 'cuarto' ? 'Asignar por cuarto' : 'Agregar'
                                                            }
                                                        </Button>
                                                    </span>
                                                </Tooltip>
                                            </Box>
                                        )}
                                    </Box>

                                    {/* ── Tabla de productos ── */}
                                    <Box sx={{ overflowX: 'auto', px: 1 }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', tableLayout: 'fixed' }}>
                                            <thead>
                                                <tr>
                                                    {[
                                                        ['Código', modo === 'cuarto' && !isSeleccionado ? '11%' : '12%', 'left'],
                                                        ['Descripción', modo === 'cuarto' && !isSeleccionado ? '34%' : '50%', 'left'],
                                                        ['Cantidad', '12%', 'center'],
                                                        ['Pasillo', '20%', 'center'],
                                                        ...(modo === 'cuarto' && !isSeleccionado ? [['Responsable', '23%', 'center']] : []),
                                                    ].map(([titulo, ancho, align]) => (
                                                        <th key={titulo} style={{
                                                            padding: '10px 12px', width: ancho, textAlign: align,
                                                            color: '#8b93a7', fontWeight: 700, fontSize: '0.7rem',
                                                            textTransform: 'uppercase', letterSpacing: '0.6px',
                                                        }}>{titulo}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(productosToShow || []).map((item, idx) => {
                                                    const responsable = (modo === 'cuarto' && !isSeleccionado) ? getResponsable(item.ubicacion) : null;
                                                    const sinUbic = (!item.ubicacion || item.ubicacion === '' || item.ubicacion.toLowerCase().includes('sin ubicación'));
                                                    return (
                                                        <tr key={idx} style={{ borderTop: '1px solid #f0f2f6' }}>
                                                            <td style={{ padding: '8px 12px', fontWeight: 700, color: '#111827' }}>{item.codigo_pedido}</td>
                                                            <td style={{ padding: '8px 12px', color: '#4b5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.descripcion}>{item.descripcion}</td>
                                                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                                                <span style={{ background: '#eaf1ff', color: '#1d4ed8', fontWeight: 700, borderRadius: 8, padding: '3px 10px', fontSize: '0.82rem' }}>
                                                                    {item.cantidad}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                                                <span style={{
                                                                    background: sinUbic ? '#fdecea' : '#f1f3f7',
                                                                    color: sinUbic ? '#d32f2f' : '#374151',
                                                                    fontWeight: sinUbic ? 700 : 500,
                                                                    borderRadius: 99, padding: '3px 12px', fontSize: '0.8rem', whiteSpace: 'nowrap',
                                                                }}>
                                                                    {item.ubicacion || 'Sin ubicación'}
                                                                </span>
                                                            </td>
                                                            {modo === 'cuarto' && !isSeleccionado && (
                                                                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                                                    {responsable ? (
                                                                        <span style={{ background: '#e8f5e9', color: '#2e7d32', borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
                                                                            {responsable.nombre}
                                                                        </span>
                                                                    ) : (
                                                                        <span style={{ color: '#b6bcc9', fontSize: 11 }}>Sin asignar</span>
                                                                    )}
                                                                </td>
                                                            )}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </Box>

                                    {productos.length > 5 && (
                                        <Box
                                            onClick={() => toggleExpandPedido(pedido.no_orden)}
                                            sx={{
                                                textAlign: 'center', py: 1, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700,
                                                color: '#2f6fed', borderTop: '1px solid #f0f2f6', '&:hover': { background: '#f5f8ff' },
                                            }}
                                        >
                                            {isExpanded ? 'Ver menos ▲' : `Ver todos (${productos.length}) ▼`}
                                        </Box>
                                    )}
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