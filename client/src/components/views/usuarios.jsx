import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaTimes } from "react-icons/fa";
import {
    Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, CircularProgress,
    Typography, Box, Button, Dialog, DialogTitle,
    DialogContent, DialogActions, TextField, MenuItem, IconButton, DialogContentText
} from "@mui/material";
import AddIcon from '@mui/icons-material/PersonAdd';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import "../../css/main_css/views/place_holder.css";
import SnackbarAlert from "../main/SnackbarAlert";
import AdminPermisos from './adminPermisos'; // ✅ nuevo componente para gestionar permisos

import ModalGestionRoles from "./roles";

const Usuarios = ({ isSwitching }) => {
    const navigate = useNavigate();
    const [animationClass, setAnimationClass] = useState(
        isSwitching ? "slide-left-out" : "fade-in"
    );
    const [rolesDisponibles, setRolesDisponibles] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [editando, setEditando] = useState(false);
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
    const [alerta, setAlerta] = useState({ open: false, mensaje: '', tipo: 'success' });
    const [confirmarEliminar, setConfirmarEliminar] = useState({ open: false, id: null });
    const [openRolesModal, setOpenRolesModal] = useState(false);
    const [openPermisos, setOpenPermisos] = useState(false); // ✅ estado para abrir modal de permisos


    const [nuevoUsuario, setNuevoUsuario] = useState({
        nombre: "",
        correo: "",
        password: "",
        rol_id: '',
        turno: 1
    });

    const mostrarAlerta = (mensaje, tipo = 'success') => {
        setAlerta({ open: true, mensaje, tipo });
    };

    const cerrarAlerta = () => {
        setAlerta({ ...alerta, open: false });
    };


    useEffect(() => {
        setAnimationClass(isSwitching ? "slide-out-down" : "fade-in");
        obtenerUsuarios();
    }, [isSwitching]);

    const obtenerUsuarios = () => {
        setLoading(true);
        fetch("http://192.168.3.23:3001/api/usuarios")
            .then((res) => res.json())
            .then((data) => {
                setUsuarios(data);
                setLoading(false);
            })
            .catch((error) => {
                console.error("❌ Error al obtener usuarios:", error);
                setLoading(false);
            });
    };

    const handleClose = () => {
        setAnimationClass("slide-out-down");
        setTimeout(() => {
            navigate("/menu");
        }, 500);
    };

    const handleOpenDialog = (usuario = null) => {
        if (usuario) {
            setNuevoUsuario({ ...usuario });
            setEditando(true);
            setUsuarioSeleccionado(usuario);
        } else {
            setNuevoUsuario({ nombre: "", correo: "", password: "", rol: "surtidor", turno: 1 });
            setEditando(false);
            setUsuarioSeleccionado(null);
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
    };

    const handleChange = (e) => {
        setNuevoUsuario({ ...nuevoUsuario, [e.target.name]: e.target.value });
    };

    const handleGuardarUsuario = () => {
        const url = editando
            ? `http://192.168.3.23:3001/api/usuarios/${usuarioSeleccionado.id}`
            : "http://192.168.3.23:3001/api/usuarios";

        const method = editando ? "PUT" : "POST";
        const body = editando
            ? JSON.stringify(nuevoUsuario)
            : JSON.stringify(nuevoUsuario);

        fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body
        })
            .then(res => res.json())
            .then(() => {
                obtenerUsuarios();
                handleCloseDialog();
                mostrarAlerta(editando ? "Usuario actualizado" : "Usuario creado");
            })
            .catch(error => console.error("Error al guardar usuario:", error));
    };

    const handleEliminarUsuario = (id) => {
        setConfirmarEliminar({ open: true, id });
    };

    const confirmarEliminacion = () => {
        fetch(`http://192.168.3.23:3001/api/usuarios/${confirmarEliminar.id}`, {
            method: "DELETE"
        })
            .then(res => res.json())
            .then(() => {
                obtenerUsuarios();
                mostrarAlerta("Usuario eliminado correctamente");
            })
            .catch(error => {
                console.error("Error al eliminar usuario:", error);
                mostrarAlerta("Error al eliminar usuario", "error");
            })
            .finally(() => {
                setConfirmarEliminar({ open: false, id: null });
            });
    };

    const obtenerRoles = () => {
        fetch("http://192.168.3.23:3001/api/usuarios/roles")
            .then(res => res.json())
            .then(data => {
                console.log("✅ Roles recibidos:", data);
                if (Array.isArray(data)) {
                    setRolesDisponibles(data);
                } else {
                    console.error("❌ Error: datos recibidos no son un array:", data);
                    setRolesDisponibles([]); // fallback seguro
                }
            })
            .catch(err => {
                console.error("❌ Error al obtener roles:", err);
                setRolesDisponibles([]); // fallback seguro
            });
    };


    useEffect(() => {
        setAnimationClass(isSwitching ? "slide-out-down" : "fade-in");
        obtenerUsuarios();
        obtenerRoles();
    }, [isSwitching]);

    return (
        <div className={`place_holder-container ${animationClass}`}>
            <div className="place_holder-header">
                <span className="place_holder-title">Usuarios</span>
                <button className="place_holder-close" onClick={handleClose}>
                    <FaTimes />
                </button>
            </div>



            <ModalGestionRoles
                open={openRolesModal}
                onClose={() => setOpenRolesModal(false)}
            />


            <div className="place_holder-content">
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" fontWeight="bold">Lista de usuarios registrados</Typography>
                    <Box display="flex" gap={1}>
                        <Button
                            variant="contained"
                            sx={{ backgroundColor: "#1976d2", color: "#fff", textTransform: "none", fontWeight: "bold" }}
                            startIcon={<AddIcon />}
                            onClick={() => handleOpenDialog()}
                        >
                            Agregar usuario
                        </Button>

                        <Button
                            variant="outlined"
                            sx={{ textTransform: "none", fontWeight: "bold" }}
                            onClick={() => setOpenRolesModal(true)}
                        >
                            Administrar Roles
                        </Button>

                        <Button
                            variant="text"
                            sx={{ textTransform: "none", fontWeight: "bold", color: "#616161" }}
                            onClick={() => setOpenPermisos(true)}
                        >
                            Permisos
                        </Button>

                    </Box>
                </Box>

                {loading ? (
                    <Box display="flex" justifyContent="center" mt={4}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Paper elevation={4} sx={{ borderRadius: 3 }}>
                        <TableContainer>
                            <Table size="small">
                                <TableHead sx={{ backgroundColor: "#f44336" }}>
                                    <TableRow>
                                        {["ID", "Nombre", "Correo", "Rol", "Turno", "Acciones"].map((title) => (
                                            <TableCell key={title} sx={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>
                                                {title}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>

                                <TableBody>
                                    {usuarios.map((user) => (
                                        <TableRow
                                            key={user.id}
                                            hover
                                            sx={{
                                                '&:hover': { backgroundColor: "#f5f5f5" },
                                                transition: "background-color 0.3s"
                                            }}
                                        >
                                            <TableCell>{user.id}</TableCell>
                                            <TableCell>{user.nombre}</TableCell>
                                            <TableCell>{user.correo}</TableCell>
                                            <TableCell>{user.rol}</TableCell>
                                            <TableCell>{user.turno}</TableCell>
                                            <TableCell>
                                                <Box display="flex" gap={1}>
                                                    <IconButton size="small" onClick={() => handleOpenDialog(user)} sx={{ color: "#1976d2" }}>
                                                        <EditIcon />
                                                    </IconButton>
                                                    <IconButton size="small" onClick={() => handleEliminarUsuario(user.id)} sx={{ color: "#d32f2f" }}>
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </Box>
                                            </TableCell>

                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                )}
            </div>

            <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth>
                <DialogTitle>{editando ? "Editar Usuario" : "Nuevo Usuario"}</DialogTitle>
                <DialogContent>
                    <TextField fullWidth label="Nombre" name="nombre" value={nuevoUsuario.nombre} onChange={handleChange} margin="normal" />
                    <TextField fullWidth label="Correo" name="correo" value={nuevoUsuario.correo} onChange={handleChange} margin="normal" />
                    {!editando && (
                        <TextField fullWidth label="Contraseña" name="password" type="password" value={nuevoUsuario.password} onChange={handleChange} margin="normal" />
                    )}
                    <TextField
                        select
                        fullWidth
                        label="Rol"
                        name="rol_id"
                        margin="normal"
                        value={nuevoUsuario.rol_id || ''}
                        onChange={handleChange}
                        required
                    >
                        {rolesDisponibles.map((rol) => (
                            <MenuItem key={rol.id} value={rol.id}>
                                {rol.nombre}
                            </MenuItem>
                        ))}
                    </TextField>



                    <TextField fullWidth label="Turno" name="turno" type="number" value={nuevoUsuario.turno} onChange={handleChange} margin="normal" inputProps={{ min: 1, max: 3 }} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancelar</Button>
                    <Button variant="contained" color="primary" onClick={handleGuardarUsuario}>Guardar</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={confirmarEliminar.open} onClose={() => setConfirmarEliminar({ open: false, id: null })}>
                <DialogTitle>Confirmar eliminación</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        ¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmarEliminar({ open: false, id: null })}>Cancelar</Button>
                    <Button onClick={confirmarEliminacion} color="error" variant="contained">Eliminar</Button>
                </DialogActions>
            </Dialog>
            <SnackbarAlert
                open={alerta.open}
                mensaje={alerta.mensaje}
                tipo={alerta.tipo}
                onClose={cerrarAlerta}
            />
            <AdminPermisos
                open={openPermisos}
                onClose={() => setOpenPermisos(false)}
                onGuardado={() => setOpenPermisos(false)} // ← Cierra modal al guardar
            />
        </div>
    );
};

export default Usuarios;
