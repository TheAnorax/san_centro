import React, { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import {
    Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    CircularProgress, Alert, TablePagination, TextField, InputAdornment, Button, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import Swal from "sweetalert2";
import axios from 'axios';

import * as XLSX from "xlsx";



const IMG_BASE = 'http://66.232.105.83:9101/images';
const PLACEHOLDER = 'http://66.232.105.83:9101/images/noimage.png';

function ProductImage({ code }) {
    const [src, setSrc] = useState(`${IMG_BASE}/${encodeURIComponent(code || '')}.jpg`);

    useEffect(() => {
        setSrc(`${IMG_BASE}/${code}.jpg`);
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
                console.log("DATA BACK:", res.data); // 👈 AQUÍ
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

    //  Mandar correo de inventario casi en 0


    const [openModal, setOpenModal] = useState(false);
    const [cantidadSolicitada, setCantidadSolicitada] = useState("");
    const [productoSeleccionado, setProductoSeleccionado] = useState(null);

    const user = JSON.parse(localStorage.getItem("user")); // nombre del solicitante

    const abrirModalSolicitud = (row) => {
        setProductoSeleccionado(row);
        setCantidadSolicitada("");
        setOpenModal(true);
    };

    const enviarSolicitud = async () => {
        await axios.post("http://66.232.105.107:3001/api/inventario/solicitar-producto", {
            codigo: productoSeleccionado.codigo_producto,
            descripcion: productoSeleccionado.descripcion,
            ubicacion: productoSeleccionado.ubicacion,
            stock: productoSeleccionado.cant_stock_real,
            cantidadSolicitada,
            solicitante: user?.nombre || "Usuario desconocido",

        });

        Swal.fire("Solicitud enviada", "Tu solicitud fue enviada correctamente", "success");
        setOpenModal(false);
    };

    const [stockJDE, setStockJDE] = useState({});

    useEffect(() => {

        async function cargarJDE() {

            try {

                const res = await axios.get(
                    "http://66.232.105.107:3001/api/inventario/inventario-jde",
                    {
                        params: { almacen: "7240" }
                    }
                );

                const mapa = {};

                (res.data || []).forEach(item => {
                    mapa[String(item.Clave)] = Number(item.Cant);
                });

                setStockJDE(mapa);

            } catch (error) {
                console.error("Error cargando JDE:", error);
            }

        }

        cargarJDE();

    }, []);


    const exportarExcel = () => {
        // 🔹 Mapear SOLO los campos que quieres
        const data = filtered.map(row => ({
            "Código Producto": row.codigo_producto,
            "Ubicación": row.ubicacion,
            "Cantidad Stock": Number(row.cant_stock_real) || 0,
            "Cantidad Stock JDE": stockJDE[row.codigo_producto] ?? 0,
            "OC": row.oc || ""
        }));

        // 🔹 Crear hoja
        const ws = XLSX.utils.json_to_sheet(data);

        // 🔹 Crear libro
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inventario");

        // 🔹 Descargar archivo
        XLSX.writeFile(wb, "inventario.xlsx");
    };

    //Modal de Edicion 

    const [openEditModal, setOpenEditModal] = useState(false);
    const [ubicacionEdit, setUbicacionEdit] = useState("");
    const [rowEditando, setRowEditando] = useState(null);

    const guardarUbicacion = async () => {
        try {
            await axios.put("http://66.232.105.107:3001/api/inventario/actualizar-ubicacion", {
                id: rowEditando.id_ubicaccion,
                ubicacion: ubicacionEdit
            });

            Swal.fire("Actualizado", "Ubicación actualizada correctamente", "success");

            setOpenEditModal(false);

            // 🔄 Recargar inventario
            const res = await axios.get('http://66.232.105.107:3001/api/inventario/Obtenerinventario');
            setInventario(res.data || []);

        } catch (error) {
            setOpenEditModal(false);
            Swal.fire("Error", "No se pudo actualizar", "error");
        }
    };


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

                            <Button
                                variant="contained"
                                color="success"
                                onClick={exportarExcel}
                                sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                            >
                                Exportar Excel
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
                                        <TableCell sx={{ fontWeight: "bold", color: "#e23b22" }}>Cantidad Stock EN JDE</TableCell>
                                        <TableCell sx={{ fontWeight: "bold", color: "#e23b22" }}>Pedimento</TableCell>
                                        <TableCell sx={{ fontWeight: "bold", color: "#e23b22" }}>OC</TableCell>
                                        <TableCell sx={{ fontWeight: "bold", color: "#e23b22" }}>Ingreso</TableCell>
                                        <TableCell sx={{ fontWeight: "bold", color: "#e23b22" }}>Acciones</TableCell>
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
                                                    key={row.id_ubicacion || `${row.codigo_producto}-${row.lote_serie}-${row.ingreso}`}
                                                    hover
                                                    sx={{
                                                        ...(isEmpty && {
                                                            backgroundColor: '#ffe1e1ff',
                                                            borderLeft: '4px solid #ff0000ff',
                                                            '&:hover': { backgroundColor: '#f87c7cff' }
                                                        })
                                                    }}
                                                >
                                                    <TableCell>{row.codigo_producto}</TableCell>
                                                    <TableCell><ProductImage code={row.codigo_producto} /></TableCell>
                                                    <TableCell>{row.descripcion}</TableCell>
                                                    <TableCell>{row.ubicacion}</TableCell>
                                                    <TableCell>{qty}</TableCell>
                                                    <TableCell>
                                                        {stockJDE[row.codigo_producto] ?? "-"}
                                                    </TableCell>
                                                    <TableCell>{row.lote_serie}</TableCell>
                                                    <TableCell>{row.oc}</TableCell>
                                                    <TableCell>
                                                        {row.ingreso && (
                                                            <span>{new Date(row.ingreso).toLocaleString()}</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            onClick={() => {
                                                                setRowEditando(row);
                                                                setUbicacionEdit(row.ubicacion || "");
                                                                setOpenEditModal(true);
                                                            }}
                                                        >
                                                            Editar
                                                        </Button>
                                                    </TableCell>

                                                    {/* ✔ SOLO SE MUESTRA SI EL STOCK ES 0 */}
                                                    <TableCell>
                                                        {(qty <= 0) && (
                                                            <Button
                                                                variant="contained"
                                                                color="warning"
                                                                size="small"
                                                                onClick={() => abrirModalSolicitud(row)}
                                                            >
                                                                Solicitar Producto
                                                            </Button>

                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {/* Modal para  Solicitar producto  */}
                        <Dialog open={openModal} onClose={() => setOpenModal(false)}>
                            <DialogTitle>Solicitar Producto</DialogTitle>

                            <DialogContent>
                                <p><b>Código:</b> {productoSeleccionado?.codigo_producto}</p>
                                <p><b>Descripción:</b> {productoSeleccionado?.descripcion}</p>
                                <p><b>Ubicación:</b> {productoSeleccionado?.ubicacion}</p>

                                <TextField
                                    label="Cantidad a solicitar"
                                    type="number"
                                    fullWidth
                                    value={cantidadSolicitada}
                                    onChange={(e) => setCantidadSolicitada(e.target.value)}
                                    sx={{ mt: 2 }}
                                />
                            </DialogContent>

                            <DialogActions>
                                <Button onClick={() => setOpenModal(false)}>Cancelar</Button>
                                <Button onClick={enviarSolicitud} variant="contained" color="primary">
                                    Enviar Solicitud
                                </Button>
                            </DialogActions>
                        </Dialog>


                        {/* Modal de editar informacion de producto  */}

                        <Dialog open={openEditModal} onClose={() => setOpenEditModal(false)}>
                            <DialogTitle>Editar Ubicación</DialogTitle>

                            <DialogContent>
                                <p><b>ID:</b> {rowEditando?.id_ubicaccion}</p>
                                <p><b>Producto:</b> {rowEditando?.codigo_producto}</p>
                                <p><b>Producto:</b> {rowEditando?.descripcion}</p>

                                <TextField
                                    label="Nueva ubicación"
                                    fullWidth
                                    value={ubicacionEdit}
                                    onChange={(e) => setUbicacionEdit(e.target.value)}
                                    sx={{ mt: 2 }}
                                />
                            </DialogContent>

                            <DialogActions>
                                <Button onClick={() => setOpenEditModal(false)}>Cancelar</Button>
                                <Button onClick={guardarUbicacion} variant="contained">
                                    Guardar
                                </Button>
                            </DialogActions>
                        </Dialog>


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
