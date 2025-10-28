import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Card, CardContent, Typography, Box, Divider, Button, TextField } from '@mui/material';
import Pagination from '@mui/material/Pagination';
import { FaTimes } from "react-icons/fa";
import axios from 'axios';
import logoSantul from '../../img/general/icono_santul.png';

function Pedidos() {
    // Pedidos
    const [pedidos, setPedidos] = useState([]);
    const [, setLoading] = useState(true);
    const [expandedPedidos, setExpandedPedidos] = useState([]);
    const [page, setPage] = useState(1);
    const [searchNoOrden, setSearchNoOrden] = useState('');
    const [, setBuscando] = useState(false);
    const pedidosPorPagina = 10;
    const searchTimeout = useRef(null);

    // Bahías y usuarios
    const [bahias, setBahias] = useState([]);
    const [usuarios, setUsuarios] = useState([]);

    // Selects por pedido
    const [bahiasPorPedido, setBahiasPorPedido] = useState({});
    const [usuariosPorPedido, setUsuariosPorPedido] = useState({});

    // --- Helpers ---

    // 1) Normaliza el nombre de bahía (por si el backend cambia el campo)
    const nombreBahia = (b) =>
        (b?.bahia ?? b?.Bahia ?? b?.nombre ?? b?.codigo ?? b?.id ?? '').toString().trim();

    // 2) Define si está libre con múltiples señales (texto/flags)
    const isBahiaLibre = (b) => {
        const est = (b?.estado ?? b?.estatus ?? b?.status ?? '').toString().toLowerCase().trim();

        // Textos típicos
        if (est) {
            if (/(ocupado|asignado|en uso|busy)/i.test(est)) return false;
            if (/(libre|disponible)/i.test(est)) return true;
            if (/(sin ingreso|n\/a|na)/i.test(est)) return true;
        }

        // Flags/campos que delatan ocupación
        if (b && (b.no_orden || b.orden_actual)) return false;
        if (typeof b?.ocupado !== 'undefined') return !(!b.ocupado); // true si ocupado => NO libre
        if (typeof b?.libre !== 'undefined') return !!b.libre;
        if (typeof b?.disponible !== 'undefined') return !!b.disponible;

        // Si no hay señales claras, asumimos libre para no ocultar opciones válidas
        return true;
    };

    // 3) Fallback: si el filtro deja 0, mostramos todas para no vaciar el select
    const bahiasLibres = useMemo(() => {
        const libres = (bahias || []).filter(isBahiaLibre);
        return libres.length > 0 ? libres : (bahias || []);
    }, [bahias]);

    const cargarBahias = async () => {
        try {
            const res = await axios.get("http://66.232.105.107:3001/api/pedidos/bahias");
            setBahias(res.data || []);
        } catch {
            setBahias([]);
        }
    };

    const cargarTodosPedidos = (callback) => {
        setLoading(true);
        axios
            .get('http://66.232.105.107:3001/api/pedidos/todos-con-productos')
            .then(res => setPedidos(res.data || []))
            .finally(() => {
                setLoading(false);
                if (callback) callback();
            });
    };

    // --- Effects ---

    useEffect(() => {
        axios
            .get('http://66.232.105.107:3001/api/pedidos/usuarios-surtidor')
            .then(res => setUsuarios(res.data || []));
        cargarBahias();
        cargarTodosPedidos();
    }, []);

    // Polling ligero para mantener bahías frescas
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
                if (res.data && res.data.info && res.data.items && res.data.items.length > 0) {
                    setPedidos([{ ...res.data.info, productos: res.data.items }]);
                } else {
                    setPedidos([]);
                }
            } catch {
                setPedidos([]);
            }
            setBuscando(false);
        }, 350);
    }, [searchNoOrden]);

    // --- UI handlers ---

    const toggleExpandPedido = (no_orden) => {
        setExpandedPedidos(expanded =>
            expanded.includes(no_orden)
                ? expanded.filter(id => id !== no_orden)
                : [...expanded, no_orden]
        );
    };

    const handleBahiaChange = (no_orden, value) => {
        setBahiasPorPedido(prev => ({ ...prev, [no_orden]: value }));
    };

    const handleUsuarioChange = (no_orden, value) => {
        setUsuariosPorPedido(prev => ({ ...prev, [no_orden]: value }));
    };

    const handleAgregarPedido = async (pedido) => {
        const bahia = bahiasPorPedido[pedido.no_orden];
        const usuario = usuariosPorPedido[pedido.no_orden];

        if (!bahia || !usuario) {
            alert("Selecciona bahía y usuario.");
            return;
        }

        try {
            const res = await axios.post('http://66.232.105.107:3001/api/pedidos/agregar-pedido-surtiendo', {
                no_orden: pedido.no_orden,
                tipo: pedido.tipo,
                bahia,
                usuario // id_usuario numérico
            });

            if (res.data && res.data.ok) {
                alert("Pedido enviado correctamente.");

                // 1) Optimista: quitar bahía localmente
                setBahias(prev => prev.filter(b => nombreBahia(b) !== bahia));

                // 2) Limpiar selects
                setBahiasPorPedido(prev => ({ ...prev, [pedido.no_orden]: '' }));
                setUsuariosPorPedido(prev => ({ ...prev, [pedido.no_orden]: '' }));

                // 3) Re-sincronizar desde backend
                cargarTodosPedidos();
                cargarBahias();
            } else {
                alert("Error: " + (res.data?.message || "No se pudo enviar el pedido."));
                cargarBahias();
            }
        } catch {
            alert("Error al enviar el pedido.");
            cargarBahias();
        }
    };

    // --- Paginación ---

    const totalPaginas = Math.ceil(pedidos.length / pedidosPorPagina);
    const pedidosMostrados = pedidos.slice(
        (page - 1) * pedidosPorPagina,
        page * pedidosPorPagina
    );

    // --- Render ---

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

            {/* Buscador */}
            <Box display="flex" justifyContent="center" alignItems="center" mt={3} mb={2}>
                <TextField
                    size="small"
                    variant="outlined"
                    label="Buscar por No. Orden"
                    value={searchNoOrden}
                    onChange={e => setSearchNoOrden(e.target.value)}
                    sx={{ width: 240, mr: 1 }}
                />
                {searchNoOrden && (
                    <Button color="secondary" onClick={() => setSearchNoOrden('')}>
                        Limpiar
                    </Button>
                )}
            </Box>

            <Box p={3} sx={{ background: "#faf9f9", minHeight: "100vh" }}>
                <Box
                    sx={{
                        height: '80vh',
                        overflowY: 'auto',
                        pr: 2,
                        borderRadius: 2,
                        border: '1px solid #eee',
                        background: '#fff'
                    }}
                >
                    {pedidosMostrados.length === 0 ? (
                        <Box textAlign="center" mt={10} color="#888" fontSize={18}>
                            No hay pedidos.
                        </Box>
                    ) : (
                        pedidosMostrados.map(pedido => {
                            const isExpanded = expandedPedidos.includes(pedido.no_orden);
                            const productosToShow = isExpanded ? pedido.productos : pedido.productos.slice(0, 5);

                            // Cálculo por pedido
                            const selectedBahia = bahiasPorPedido[pedido.no_orden];

                            // Si hay lista de libres usamos esa; si no, permitimos cualquier selección (fallback)
                            const selectedBahiaDisponible =
                                bahiasLibres.length > 0
                                    ? (!!selectedBahia && bahiasLibres.some(b => nombreBahia(b) === selectedBahia && isBahiaLibre(b)))
                                    : !!selectedBahia;

                            return (
                                <Card sx={{ mb: 4, boxShadow: 2 }} key={pedido.no_orden}>
                                    <CardContent>
                                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                            <img src={logoSantul} alt="Logo" style={{ width: 90, height: 90 }} />

                                            {/* Selects y Botón */}
                                            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                                                <select
                                                    value={bahiasPorPedido[pedido.no_orden] || ''}
                                                    onChange={e => handleBahiaChange(pedido.no_orden, e.target.value)}
                                                    style={{
                                                        height: 38,
                                                        borderRadius: 8,
                                                        border: '1px solid #bbb',
                                                        fontSize: 16,
                                                        padding: '0 10px',
                                                        background: '#faf9f9',
                                                        minWidth: 140,
                                                        marginRight: 16
                                                    }}
                                                >
                                                    <option value="">Selecciona bahía</option>
                                                    {bahiasLibres.map(b => {
                                                        const name = nombreBahia(b);
                                                        return (
                                                            <option key={name} value={name}>{name}</option>
                                                        );
                                                    })}
                                                </select>

                                                <select
                                                    value={usuariosPorPedido[pedido.no_orden] || ''}
                                                    onChange={e => handleUsuarioChange(pedido.no_orden, Number(e.target.value))}
                                                    style={{
                                                        height: 38,
                                                        borderRadius: 8,
                                                        border: '1px solid #bbb',
                                                        fontSize: 16,
                                                        padding: '0 10px',
                                                        background: '#faf9f9',
                                                        minWidth: 140,
                                                        marginRight: 16
                                                    }}
                                                >
                                                    <option value="">Selecciona usuario</option>
                                                    {usuarios.map(u => (
                                                        <option key={u.id_usuario} value={u.id_usuario}>{u.nombre}</option>
                                                    ))}
                                                </select>

                                                <Button
                                                    variant="contained"
                                                    color="primary"
                                                    size="small"
                                                    disabled={!(selectedBahiaDisponible && usuariosPorPedido[pedido.no_orden])}
                                                    title={
                                                        !(selectedBahiaDisponible && usuariosPorPedido[pedido.no_orden])
                                                            ? "Selecciona primero una bahía libre y un usuario"
                                                            : ""
                                                    }
                                                    onClick={() => handleAgregarPedido(pedido)}
                                                >
                                                    Agregar
                                                </Button>
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

                                        <Box sx={{ maxWidth: 900, margin: '0 auto', mb: 2 }}>
                                            <Typography variant="h6" align="center">Productos</Typography>
                                        </Box>

                                        <Box sx={{ overflowX: 'auto', maxWidth: 900, margin: '0 auto', mt: 1 }}>
                                            <table
                                                style={{
                                                    width: '100%',
                                                    borderCollapse: 'collapse',
                                                    fontSize: '0.92rem',
                                                    background: '#fff',
                                                    tableLayout: 'fixed'
                                                }}
                                            >
                                                <thead>
                                                    <tr>
                                                        <th style={{ padding: '2px 6px', width: '20%', textAlign: 'center' }}>Código</th>
                                                        <th style={{ padding: '2px 6px', width: '40%', textAlign: 'center' }}>Descripción</th>
                                                        <th style={{ padding: '2px 6px', width: '20%', textAlign: 'center' }}>Cantidad</th>
                                                        <th style={{ padding: '2px 6px', width: '20%', textAlign: 'center' }}>Pasillo</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {productosToShow.map((item, idx) => (
                                                        <tr key={idx}>
                                                            <td style={{ padding: '2px 6px', textAlign: 'center' }}>{item.codigo_pedido}</td>
                                                            <td style={{ padding: '2px 6px', textAlign: 'center' }}>{item.descripcion}</td>
                                                            <td style={{ padding: '2px 6px', textAlign: 'center' }}>{item.cantidad}</td>
                                                            <td
                                                                style={{
                                                                    padding: '2px 6px',
                                                                    textAlign: 'center',
                                                                    color: (!item.ubicacion || item.ubicacion === '' || item.ubicacion.toLowerCase().includes('sin ubicación'))
                                                                        ? '#d32f2f'
                                                                        : '#222',
                                                                    fontWeight: (!item.ubicacion || item.ubicacion === '' || item.ubicacion.toLowerCase().includes('sin ubicación'))
                                                                        ? 600
                                                                        : 400
                                                                }}
                                                            >
                                                                {item.ubicacion || 'Sin ubicación'}
                                                            </td>
                                                        </tr>
                                                    ))}

                                                    {pedido.productos.length > 5 && (
                                                        <tr>
                                                            <td colSpan={4} style={{ textAlign: 'center', paddingTop: 8 }}>
                                                                <Button
                                                                    size="small"
                                                                    variant="outlined"
                                                                    color="primary"
                                                                    onClick={() => toggleExpandPedido(pedido.no_orden)}
                                                                >
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

                    {totalPaginas > 1 && (
                        <Box align="center" mt={2} mb={2}>
                            <Pagination
                                count={totalPaginas}
                                page={page}
                                onChange={(e, value) => setPage(value)}
                                color="primary"
                                size="large"
                                shape="rounded"
                                siblingCount={1}
                                boundaryCount={1}
                                showFirstButton
                                showLastButton
                            />
                        </Box>
                    )}
                </Box>
            </Box>
        </div>
    );
}

export default Pedidos;