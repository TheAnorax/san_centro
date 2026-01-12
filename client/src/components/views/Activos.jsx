// src/components/views/Activo.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { FaTimes } from 'react-icons/fa';
import {
    Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, CircularProgress, Alert, Typography, Button, Dialog, DialogTitle,
    DialogContent, DialogActions, TextField, Grid, Stack, IconButton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import InventoryIcon from '@mui/icons-material/Inventory2';
import axios from 'axios';
import Swal from 'sweetalert2';

const API_ACTIVOS = 'http://66.232.105.107:3001/api/activos';

function Activo({ isSwitching }) {

    const navigate = useNavigate();
    const [animationClass, setAnimationClass] = useState(
        isSwitching ? "slide-left-out" : "fade-in"
    );

    const [activos, setActivos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [dialogOpen, setDialogOpen] = useState(false);
    const [modo, setModo] = useState('crear'); // crear | editar | sumar | restar
    const [activoSeleccionado, setActivoSeleccionado] = useState(null);

    const [form, setForm] = useState({
        nombre: '',
        categoria: '',
        descripcion: '',
        cantidad: '',
        foto: null
    });

    const [preview, setPreview] = useState(null);

    const [openImg, setOpenImg] = useState(false);
    const [imgSeleccionada, setImgSeleccionada] = useState(null);



    useEffect(() => {
        setAnimationClass(isSwitching ? "slide-out-down" : "fade-in");
    }, [isSwitching]);

    useEffect(() => {
        fetchActivos();
    }, []);

    const handleClose = () => {
        setAnimationClass("slide-out-down");
        setTimeout(() => {
            navigate("/menu");
        }, 500);
    };

    const fetchActivos = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await axios.get(API_ACTIVOS);
            setActivos(res.data || []);
        } catch (err) {
            console.error(err);
            setError('Error al cargar activos');
        } finally {
            setLoading(false);
        }
    };

    const abrirModalCrear = () => {
        setModo('crear');
        setActivoSeleccionado(null);
        setForm({
            nombre: '',
            categoria: '',
            descripcion: '',
            cantidad: '',
            foto: null
        });
        setPreview(null);
        setDialogOpen(true);
    };


    const abrirModalEditar = (activo) => {
        setModo('editar');
        setActivoSeleccionado(activo);
        setForm({
            nombre: activo.nombre,
            categoria: activo.categoria,
            descripcion: activo.descripcion || '',
            cantidad: activo.cantidad,
            foto: null
        });
        setPreview(null);
        setDialogOpen(true);
    };


    const abrirModalSumar = (activo) => {
        setModo('sumar');
        setActivoSeleccionado(activo);
        setForm({ cantidad: '' });
        setDialogOpen(true);
    };

    const abrirModalRestar = (activo) => {
        setModo('restar');
        setActivoSeleccionado(activo);
        setForm({ cantidad: '' });
        setDialogOpen(true);
    };

    const handleGuardar = async () => {
        try {
            const formData = new FormData();

            formData.append('nombre', form.nombre);
            formData.append('categoria', form.categoria);
            formData.append('descripcion', form.descripcion);
            formData.append('cantidad', form.cantidad);

            if (form.foto) {
                formData.append('foto', form.foto); // 👈 el nombre debe ser "foto"
            }

            if (modo === 'crear') {
                await axios.post(API_ACTIVOS, formData);
            }

            if (modo === 'editar') {
                await axios.put(`${API_ACTIVOS}/${activoSeleccionado.id_tipo}`, formData);
            }

            if (modo === 'sumar') {
                await axios.post(`${API_ACTIVOS}/sumar/${activoSeleccionado.id_tipo}`, { cantidad: form.cantidad });
            }

            if (modo === 'restar') {
                await axios.post(`${API_ACTIVOS}/restar/${activoSeleccionado.id_tipo}`, { cantidad: form.cantidad });
            }


            Swal.fire('Éxito', 'Operación realizada correctamente', 'success');
            setDialogOpen(false);
            fetchActivos();

        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'Ocurrió un error al guardar', 'error');
        }
    };


    const handleEliminar = async (activo) => {
        const confirm = await Swal.fire({
            title: '¿Eliminar activo?',
            text: activo.nombre,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (confirm.isConfirmed) {
            try {
                await axios.delete(`${API_ACTIVOS}/${activo.id_tipo}`);
                Swal.fire('Eliminado', 'Activo eliminado correctamente', 'success');
                fetchActivos();
            } catch (err) {
                console.error(err);
                Swal.fire('Error', 'No se pudo eliminar', 'error');
            }
        }
    };

    return (
        <div className={`place_holder-container ${animationClass}`}>

            {/* HEADER */}
            <div className="place_holder-header">
                <span className="place_holder-title">
                    Activos
                </span>
                <button className="place_holder-close" onClick={handleClose}>
                    <FaTimes />
                </button>
            </div>

            {/* BODY */}
            <Box sx={{ p: 2, height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>

                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={abrirModalCrear}
                    >
                        Nuevo Activo
                    </Button>
                </Stack>

                {loading && <CircularProgress />}
                {error && <Alert severity="error">{error}</Alert>}

                {!loading && !error && (
                    <TableContainer component={Paper} sx={{ flex: 1 }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Marca</TableCell>
                                    <TableCell>Categoría</TableCell>
                                    <TableCell>Descripción</TableCell>
                                    <TableCell>Imagen</TableCell>
                                    <TableCell align="center">Cantidad</TableCell>
                                    <TableCell align="center">Acciones</TableCell>
                                </TableRow>
                            </TableHead>

                            <TableBody>
                                {activos.map((a) => (
                                    <TableRow key={a.id_tipo}>
                                        <TableCell>{a.nombre}</TableCell>
                                        <TableCell>{a.categoria}</TableCell>
                                        <TableCell>{a.descripcion || '—'}</TableCell>
                                        <TableCell>
                                            {a.foto_referencia && (
                                                <img
                                                    src={`http://66.232.105.107:3001/uploads/activos/${a.foto_referencia}`}
                                                    alt={a.nombre}
                                                    style={{ width: 50, height: 50, objectFit: 'cover', cursor: 'pointer' }}
                                                    onClick={() => {
                                                        setImgSeleccionada(a.foto_referencia);
                                                        setOpenImg(true);
                                                    }}
                                                />
                                            )}
                                        </TableCell>



                                        <TableCell align="center">{a.cantidad}</TableCell>
                                        <TableCell align="center">
                                            <Stack direction="row" spacing={1} justifyContent="center">

                                                <IconButton color="primary" onClick={() => abrirModalEditar(a)}>
                                                    <EditIcon />
                                                </IconButton>

                                                <IconButton color="success" onClick={() => abrirModalSumar(a)}>
                                                    <AddCircleOutlineIcon />
                                                </IconButton>

                                                <IconButton color="warning" onClick={() => abrirModalRestar(a)}>
                                                    <RemoveCircleOutlineIcon />
                                                </IconButton>

                                                <IconButton color="error" onClick={() => handleEliminar(a)}>
                                                    <DeleteIcon />
                                                </IconButton>

                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))}

                                {activos.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center">
                                            No hay activos registrados
                                        </TableCell>
                                    </TableRow>
                                )}

                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Box>



            <Dialog open={openImg} onClose={() => setOpenImg(false)} maxWidth="md">
                <DialogContent sx={{ p: 0 }}>
                    {imgSeleccionada && (
                        <img
                            src={`http://66.232.105.107:3001/uploads/activos/${imgSeleccionada}`}
                            alt="Activo"
                            style={{ width: '100%', height: 'auto' }}
                        />
                    )}
                </DialogContent>
            </Dialog>


            {/* MODAL */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>
                    {modo === 'crear' && 'Nuevo Activo'}
                    {modo === 'editar' && 'Editar Activo'}
                    {modo === 'sumar' && 'Sumar Cantidad'}
                    {modo === 'restar' && 'Restar Cantidad'}
                </DialogTitle>

                <DialogContent dividers>

                    {(modo === 'crear' || modo === 'editar') && (
                        <Grid container spacing={2}>

                            <Grid item xs={12}>
                                <TextField
                                    label="Nombre"
                                    fullWidth
                                    value={form.nombre}
                                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <TextField
                                    label="Categoría"
                                    fullWidth
                                    value={form.categoria}
                                    onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <TextField
                                    label="Descripción"
                                    fullWidth
                                    value={form.descripcion}
                                    onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                                />
                            </Grid>

                            {/* =========================
                                    FOTO (ARCHIVO REAL)
                                ========================= */}
                            <Grid item xs={12}>
                                <Button
                                    variant="outlined"
                                    component="label"
                                    fullWidth
                                >
                                    Seleccionar Foto
                                    <input
                                        type="file"
                                        hidden
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                setForm({ ...form, foto: file });
                                                setPreview(URL.createObjectURL(file));
                                            }
                                        }}
                                    />
                                </Button>
                            </Grid>

                            {/* PREVIEW */}
                            {preview && (
                                <Grid item xs={12} sx={{ textAlign: 'center' }}>
                                    <img
                                        src={preview}
                                        alt="preview"
                                        style={{
                                            maxWidth: '100%',
                                            maxHeight: 200,
                                            borderRadius: 8,
                                            border: '1px solid #ddd',
                                            marginTop: 10
                                        }}
                                    />
                                </Grid>
                            )}

                            <Grid item xs={12}>
                                <TextField
                                    label="Cantidad"
                                    type="number"
                                    fullWidth
                                    value={form.cantidad}
                                    onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
                                />
                            </Grid>

                        </Grid>
                    )}

                    {(modo === 'sumar' || modo === 'restar') && (
                        <TextField
                            label="Cantidad"
                            type="number"
                            fullWidth
                            value={form.cantidad}
                            onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
                        />
                    )}

                </DialogContent>

                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
                    <Button variant="contained" onClick={handleGuardar}>
                        Guardar
                    </Button>
                </DialogActions>
            </Dialog>



        </div>
    );
}

export default Activo;
