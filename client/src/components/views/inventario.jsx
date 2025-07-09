import React, { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import {
    Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    CircularProgress, Alert, TablePagination
} from '@mui/material';
import axios from 'axios';

function InventarioListado() {
    const [inventario, setInventario] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    useEffect(() => {
        setLoading(true);
        axios.get('http://192.168.3.154:3001/api/inventario/Obtenerinventario')
            .then(res => {
                setInventario(res.data);
                setLoading(false);
            })
            .catch(err => {
                setError("Error al cargar el inventario");
                setLoading(false);
            });
    }, []);

    const handleChangePage = (event, newPage) => setPage(newPage);
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    return (
        
        <div className="place_holder-container fade-in">
            <div className="place_holder-header">
                <span className="place_holder-title">Invetario</span>
                <button
                    className="place_holder-close"
                    onClick={() => (window.location.href = '/menu')} >
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
                    <Paper elevation={3} sx={{ borderRadius: 4, boxShadow: "0 4px 24px rgba(200,70,50,.08)", overflow: "hidden" }}>
                        <TableContainer>
                            <Table sx={{
                                minWidth: 650,
                                background: "#fff"
                            }}>
                                <TableHead>
                                    <TableRow sx={{
                                        background: "#ffe7e1"
                                    }}>
                                        <TableCell sx={{ fontWeight: "bold", color: "#e23b22", fontSize: "1.07em" }}>Ubicación</TableCell>
                                        <TableCell sx={{ fontWeight: "bold", color: "#e23b22", fontSize: "1.07em" }}>Código Producto</TableCell>
                                        <TableCell sx={{ fontWeight: "bold", color: "#e23b22", fontSize: "1.07em" }}>Almacén</TableCell>
                                        <TableCell sx={{ fontWeight: "bold", color: "#e23b22", fontSize: "1.07em" }}>Cantidad Real</TableCell>
                                        <TableCell sx={{ fontWeight: "bold", color: "#e23b22", fontSize: "1.07em" }}>Ingreso</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {inventario
                                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                        .map((row, idx) => (
                                            <TableRow
                                                key={row.id_ubicacion || idx}
                                                sx={{
                                                    "&:hover": {
                                                        background: "#fbe6e0"
                                                    }
                                                }}>
                                                <TableCell>{row.ubicacion}</TableCell>
                                                <TableCell>{row.codigo_producto}</TableCell>
                                                <TableCell>{row.almacen}</TableCell>
                                                <TableCell>
                                                    <b>{row.cant_stock_real}</b>
                                                </TableCell>
                                                <TableCell>
                                                    {row.ingreso ? (
                                                        <span style={{ color: "#555", fontWeight: 500 }}>
                                                            {new Date(row.ingreso).toLocaleString()}
                                                        </span>
                                                    ) : ''}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <TablePagination
                            component="div"
                            count={inventario.length}
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
