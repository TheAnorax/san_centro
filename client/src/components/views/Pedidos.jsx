import React, { useEffect, useState } from 'react';
import { Card, CardContent, Typography, Box, Divider, Button } from '@mui/material';
import Pagination from '@mui/material/Pagination'; // Importante
import { FaTimes } from "react-icons/fa";
import axios from 'axios';
import logoSantul from '../../img/general/icono_santul.png';

function Pedidos() {
    const [pedidos, setPedidos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedPedidos, setExpandedPedidos] = useState([]);
    const [page, setPage] = useState(1); // Nuevo: página actual
    const pedidosPorPagina = 10; // Cambia este número si quieres más/menos por página

    useEffect(() => {
        axios.get('http://localhost:3001/api/pedidos/todos-con-productos')
            .then(res => setPedidos(res.data || []))
            .finally(() => setLoading(false));
    }, []);

    // Función para expandir/colapsar por pedido
    const toggleExpandPedido = (no_orden) => {
        setExpandedPedidos(expanded =>
            expanded.includes(no_orden)
                ? expanded.filter(id => id !== no_orden)
                : [...expanded, no_orden]
        );
    };

    // Cálculo para paginar
    const totalPaginas = Math.ceil(pedidos.length / pedidosPorPagina);
    const pedidosMostrados = pedidos.slice(
        (page - 1) * pedidosPorPagina,
        page * pedidosPorPagina
    );

    if (loading) return <div>Cargando...</div>;
    if (!pedidos.length) return <div>No hay pedidos.</div>;

    return (
        <div className="place_holder-container fade-in">
            <div className="place_holder-header">
                <span className="place_holder-title"><h4>Pedidos Faltantes</h4></span>
                <button
                    className="place_holder-close"
                    onClick={() => (window.location.href = '/menu')} >
                    <FaTimes />
                </button>
            </div>


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
                    {pedidosMostrados.map(pedido => {
                        const isExpanded = expandedPedidos.includes(pedido.no_orden);
                        const productosToShow = isExpanded
                            ? pedido.productos
                            : pedido.productos.slice(0, 5);

                        return (
                            <Card sx={{ mb: 4, boxShadow: 2 }} key={pedido.no_orden}>
                                <CardContent>

                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                        <img src={logoSantul} alt="Logo" style={{ width: 90, height: 90 }} />
                                        <Box flex={1} textAlign="center">
                                            <Typography variant="h5" fontWeight={600}>
                                                {pedido.tipo} : {pedido.no_orden}
                                            </Typography>
                                        </Box>
                                        <Typography variant="body1" align="right">
                                            Registro: {new Date(pedido.registro).toLocaleDateString('es-MX')}
                                        </Typography>
                                    </Box>

                                    <Divider sx={{ mb: 2 }} />

                                    <Box
                                        sx={{
                                            maxWidth: 900,
                                            margin: '0 auto',
                                            mb: 2
                                        }}
                                    >
                                        <Typography variant="h6" align="center">Productos</Typography>
                                    </Box>
                                    <Box
                                        sx={{
                                            overflowX: 'auto',
                                            maxWidth: 900,
                                            margin: '0 auto',
                                            mt: 1
                                        }}
                                    >
                                        <table style={{
                                            width: '100%',
                                            borderCollapse: 'collapse',
                                            fontSize: '0.92rem',
                                            background: '#fff',
                                            tableLayout: 'fixed' // <-- esto hace que todas las columnas tengan el mismo ancho relativo
                                        }}>
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
                                                        <td style={{ padding: '2px 6px', textAlign: 'center' }}>{item.clave}</td>
                                                        <td style={{ padding: '2px 6px', textAlign: 'center' }}>{item.cantidad}</td>
                                                        <td style={{
                                                            padding: '2px 6px',
                                                            textAlign: 'center',
                                                            color: (!item.ubi || item.ubi === '' || item.ubi.toLowerCase() === 'sin ubicación') ? '#d32f2f' : 'inherit',
                                                            fontWeight: (!item.ubi || item.ubi === '' || item.ubi.toLowerCase() === 'sin ubicación') ? 600 : 400
                                                        }}>
                                                            {item.ubi || 'Sin ubicación'}
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
                    })}

                    {/* PAGINACIÓN */}
                    <Box Align="center" mt={2} mb={2}>
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
                </Box>
            </Box>
        </div>
    );
}

export default Pedidos;
