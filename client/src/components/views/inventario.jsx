import React, { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import {
    Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    CircularProgress, Alert, TablePagination, TextField, InputAdornment, Button
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import axios from 'axios';

const IMG_BASE = 'https://sanced.santulconnect.com:3011/imagenes/img_pz';
const PLACEHOLDER = 'https://sanced.santulconnect.com:3011/imagenes/placeholder.png';

function ProductImage({ code }) {
    const [src, setSrc] = useState(`${IMG_BASE}/${encodeURIComponent(code || '')}.jpg`);

    useEffect(() => {
        setSrc(`${IMG_BASE}/${encodeURIComponent(code || '')}.jpg`);
    }, [code]);

    const handleError = () => setSrc(PLACEHOLDER);

    return (
        <Box
            component="img"
            src={src}
            alt={`Imagen de producto ${code}`}
            loading="lazy"
            decoding="async"
            onError={handleError}
            sx={{
                width: 64, height: 64, objectFit: 'contain',
                borderRadius: 1, border: '1px solid #e0e0e0', bgcolor: '#fafafa'
            }}
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

    useEffect(() => {
        setLoading(true);
        axios.get('http://66.232.105.107:3001/api/inventario/Obtenerinventario')
            .then(res => {
                setInventario(res.data || []);
                setLoading(false);
            })
            .catch(() => {
                setError("Error al cargar el inventario");
                setLoading(false);
            });
    }, []);

    const handleChangePage = (_event, newPage) => setPage(newPage);
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    // 🔍 Filtrado por código + filtro de vacíos
    const filtered = inventario
        .filter(item =>
            item.codigo_producto?.toLowerCase().includes(search.toLowerCase())
        )
        .filter(item => (onlyEmpty ? (Number(item.cant_stock_real) || 0) <= 0 : true));

    const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    return (
        <div className="place_holder-container fade-in">
            <div className="place_holder-header">
                <span className="place_holder-title">Inventario</span>
                <button
                    className="place_holder-close"
                    onClick={() => (window.location.href = '/menu')}
                >
                    <FaTimes />
                </button>
            </div>

            <Box sx={{ mt: 3, mb: 2, px: { xs: 1, sm: 3 } }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 7 }}>
                        <CircularProgress />
                    </Box>
                ) : error ? (
                    <Alert severity="error">{error}</Alert>
                ) : (
                    <Paper
                        elevation={3}
                        sx={{
                            borderRadius: 4,
                            boxShadow: "0 4px 24px rgba(200,70,50,.08)",
                            overflow: "hidden",
                        }}
                    >
                        {/* Buscador + botón de vacíos */}
                        <Box sx={{ p: 1, display: 'flex', gap: 1 }}>
                            <TextField
                                size="small"
                                fullWidth
                                placeholder="Buscar por código de producto..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(0);
                                }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <Button
                                size="small"
                                variant={onlyEmpty ? "contained" : "outlined"}
                                onClick={() => {
                                    setOnlyEmpty(v => !v);
                                    setPage(0);
                                }}
                                sx={{
                                    textTransform: 'none',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {onlyEmpty ? "Ver todos" : "Mostrar vacíos (stock 0)"}
                            </Button>
                        </Box>

                        <TableContainer sx={{ maxHeight: '60vh', overflowY: 'auto' }}>
                            <Table stickyHeader sx={{ minWidth: 800, background: "#fff" }}>
                                <TableHead>
                                    <TableRow sx={{ background: "#ffe7e1" }}>
                                        <TableCell sx={{ fontWeight: "bold", color: "#e23b22" }}>Código Producto</TableCell>
                                        <TableCell sx={{ fontWeight: "bold", color: "#e23b22" }}>Imagen</TableCell>
                                        <TableCell sx={{ fontWeight: "bold", color: "#e23b22" }}>Descripcion</TableCell>
                                        <TableCell sx={{ fontWeight: "bold", color: "#e23b22" }}>Ubicación</TableCell>
                                        <TableCell sx={{ fontWeight: "bold", color: "#e23b22" }}>Cantidad Stock</TableCell>
                                        <TableCell sx={{ fontWeight: "bold", color: "#e23b22" }}>Ingreso</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {paginated.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} align="center">
                                                No se encontraron productos
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        paginated.map((row) => {
                                            const qty = Number(row.cant_stock_real) || 0;
                                            const isEmpty = qty <= 0;

                                            return (
                                                <TableRow
                                                    key={`${row.codigo_producto}-${row.id_ubicacion ?? row.ubicacion ?? 'x'}`}
                                                    hover
                                                    sx={{
                                                        ...(isEmpty && {
                                                            backgroundColor: '#ffe1e1ff',              // ámbar claro
                                                            borderLeft: '4px solid #ff0000ff',         // barra dorada
                                                            '&:hover': { backgroundColor: '#f87c7cff' }
                                                        })
                                                    }}
                                                >
                                                    <TableCell>{row.codigo_producto}</TableCell>
                                                    <TableCell><ProductImage code={row.codigo_producto} /></TableCell>
                                                    <TableCell>{row.descripcion}</TableCell>
                                                    <TableCell>{row.ubicacion}</TableCell>
                                                    <TableCell sx={{ fontWeight: isEmpty ? 700 : 500, color: isEmpty ? '#8a6d3b' : 'inherit' }}>
                                                        {qty}
                                                    </TableCell>
                                                    <TableCell>
                                                        {row.ingreso && (
                                                            <span style={{ color: "#555", fontWeight: 500 }}>
                                                                {new Date(row.ingreso).toLocaleString()}
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        <TablePagination
                            component="div"
                            count={filtered.length}
                            page={page}
                            onPageChange={handleChangePage}
                            rowsPerPage={rowsPerPage}
                            onRowsPerPageChange={handleChangeRowsPerPage}
                            labelRowsPerPage="Filas por página"
                        />
                    </Paper>
                )}
            </Box>
        </div>
    );
}

export default InventarioListado;
