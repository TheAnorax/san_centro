// src/components/views/Usuarios.jsx
import React, { useState, useEffect, useMemo } from "react";
import PrintIcon from "@mui/icons-material/Print";
import { useNavigate } from "react-router-dom";
import { FaTimes } from "react-icons/fa";
import {
    Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, CircularProgress,
    Typography, Box, Button, Dialog, DialogTitle,
    DialogContent, DialogActions, TextField, MenuItem,
    IconButton, DialogContentText
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import AddIcon from "@mui/icons-material/PersonAdd";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import QRCode from "qrcode";

import "../../css/main_css/views/place_holder.css";
import SnackbarAlert from "../main/SnackbarAlert";
import AdminPermisos from "./adminPermisos";
import ModalGestionRoles from "./roles";

const API_BASE = "http://66.232.105.107:3001";

const Usuarios = ({ isSwitching }) => {
    const navigate = useNavigate();
    const [animationClass, setAnimationClass] = useState(isSwitching ? "slide-left-out" : "fade-in");

    const [rolesDisponibles, setRolesDisponibles] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);

    const [openDialog, setOpenDialog] = useState(false);
    const [editando, setEditando] = useState(false);
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);

    const [alerta, setAlerta] = useState({ open: false, mensaje: "", tipo: "success" });
    const [confirmarEliminar, setConfirmarEliminar] = useState({ open: false, id: null });

    const [openRolesModal, setOpenRolesModal] = useState(false);
    const [openPermisos, setOpenPermisos] = useState(false);

    const [nuevoUsuario, setNuevoUsuario] = useState({
        nombre: "",
        correo: "",
        password: "",
        rol_id: "",
        turno: 1,
    });

    // ---------- QR modal ----------
    const [openCred, setOpenCred] = useState(false);
    const [credenciales, setCredenciales] = useState(null);
    const [loadingCred, setLoadingCred] = useState(false);
    const [errorCred, setErrorCred] = useState("");
    const [qrEmailUrl, setQrEmailUrl] = useState("");
    const [qrPassUrl, setQrPassUrl] = useState("");

    const mostrarAlerta = (mensaje, tipo = "success") => setAlerta({ open: true, mensaje, tipo });
    const cerrarAlerta = () => setAlerta((a) => ({ ...a, open: false }));

    useEffect(() => {
        setAnimationClass(isSwitching ? "slide-out-down" : "fade-in");
        obtenerUsuarios();
        obtenerRoles();
    }, [isSwitching]);

    const obtenerUsuarios = () => {
        setLoading(true);
        fetch(`${API_BASE}/api/usuarios`)
            .then((res) => res.json())
            .then((data) => setUsuarios(data))
            .catch((err) => console.error("❌ Error al obtener usuarios:", err))
            .finally(() => setLoading(false));
    };

    const obtenerRoles = () => {
        fetch(`${API_BASE}/api/usuarios/roles`)
            .then((res) => res.json())
            .then((data) => (Array.isArray(data) ? setRolesDisponibles(data) : setRolesDisponibles([])))
            .catch(() => setRolesDisponibles([]));
    };

    const handleClose = () => {
        setAnimationClass("slide-out-down");
        setTimeout(() => navigate("/menu"), 500);
    };

    const handleOpenDialog = (usuario = null) => {
        if (usuario) {
            setNuevoUsuario({ ...usuario, rol_id: usuario.rol_id });
            setEditando(true);
            setUsuarioSeleccionado(usuario);
        } else {
            setNuevoUsuario({ nombre: "", correo: "", password: "", rol_id: "", turno: 1 });
            setEditando(false);
            setUsuarioSeleccionado(null);
        }
        setOpenDialog(true);
    };
    const handleCloseDialog = () => setOpenDialog(false);
    const handleChange = (e) => setNuevoUsuario({ ...nuevoUsuario, [e.target.name]: e.target.value });

    const handleGuardarUsuario = () => {
        const url = editando
            ? `${API_BASE}/api/usuarios/${usuarioSeleccionado.id}`
            : `${API_BASE}/api/usuarios`;
        const method = editando ? "PUT" : "POST";

        fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(nuevoUsuario),
        })
            .then((res) => res.json())
            .then(() => {
                obtenerUsuarios();
                handleCloseDialog();
                mostrarAlerta(editando ? "Usuario actualizado" : "Usuario creado");
            })
            .catch((error) => console.error("Error al guardar usuario:", error));
    };

    const handleEliminarUsuario = (id) => setConfirmarEliminar({ open: true, id });

    const confirmarEliminacion = () => {
        fetch(`${API_BASE}/api/usuarios/${confirmarEliminar.id}`, { method: "DELETE" })
            .then((res) => res.json())
            .then(() => {
                obtenerUsuarios();
                mostrarAlerta("Usuario eliminado correctamente");
            })
            .catch(() => mostrarAlerta("Error al eliminar usuario", "error"))
            .finally(() => setConfirmarEliminar({ open: false, id: null }));
    };

    // ---------- Credenciales (QR) ----------
    const handleVerQR = async (user) => {
        setOpenCred(true);
        setCredenciales(null);
        setErrorCred("");
        setLoadingCred(true);
        setQrEmailUrl("");
        setQrPassUrl("");

        try {
            const res = await fetch(`${API_BASE}/api/usuarios/${user.id}/credenciales`, {
                headers: { Accept: "application/json" },
            });
            const raw = await res.text();
            if (!res.ok) {
                let msg = `HTTP ${res.status}`;
                try {
                    msg = JSON.parse(raw).message || msg;
                } catch { }
                throw new Error(msg);
            }
            const data = JSON.parse(raw);
            if (!data?.correo || !data?.password) throw new Error("La API no devolvió {correo, password}");
            setCredenciales({ correo: data.correo, password: data.password });
        } catch (e) {
            setErrorCred(e.message);
        } finally {
            setLoadingCred(false);
        }
    };

    useEffect(() => {
        (async () => {
            try {
                if (!credenciales) {
                    setQrEmailUrl("");
                    setQrPassUrl("");
                    return;
                }
                const emailQR = await QRCode.toDataURL(String(credenciales.correo || ""), {
                    errorCorrectionLevel: "M",
                    margin: 2,
                    width: 200,
                });
                const passQR = await QRCode.toDataURL(String(credenciales.password || ""), {
                    errorCorrectionLevel: "M",
                    margin: 2,
                    width: 200,
                });
                setQrEmailUrl(emailQR);
                setQrPassUrl(passQR);
            } catch {
                setQrEmailUrl("");
                setQrPassUrl("");
            }
        })();
    }, [credenciales]);

    // ---------- ordenar por roles ----------
    const ordenRoles = ["admin", "Supervisor", "Embarques", "Paqueteria", "surtidor"];

    const usuariosPorRol = useMemo(() => {
        const grupos = usuarios.reduce((acc, u) => {
            const key = u.rol || "Sin rol";
            if (!acc[key]) acc[key] = [];
            acc[key].push(u);
            return acc;
        }, {});
        Object.values(grupos).forEach((arr) => arr.sort((a, b) => a.nombre.localeCompare(b.nombre)));
        const entries = Object.entries(grupos);
        entries.sort((a, b) => {
            const ai = ordenRoles.indexOf(a[0]);
            const bi = ordenRoles.indexOf(b[0]);
            if (ai === -1 && bi === -1) return a[0].localeCompare(b[0]);
            if (ai === -1) return 1;
            if (bi === -1) return -1;
            return ai - bi;
        });
        return entries;
    }, [usuarios]);

    // ---------- Impresoras (seleccionar existente y sólo vincular) ----------
    const ROLES_CON_IMPRESORA = ["Embarques", "Paqueteria"];

    const [openPrinter, setOpenPrinter] = useState(false);
    const [printerUser, setPrinterUser] = useState(null);

    const [printers, setPrinters] = useState([]); // [{id_print, name, mac_print, hand, id_usu}]
    const [printersLoading, setPrintersLoading] = useState(false);
    const [selectedPrinter, setSelectedPrinter] = useState(null);
    const [assigning, setAssigning] = useState(false);
    const [unassigning, setUnassigning] = useState(false);
    const [printerError, setPrinterError] = useState("");

    // Abre modal y carga todas las impresoras; preselecciona la del usuario si existe
    const handleOpenPrinter = async (user) => {
        setPrinterUser(user);
        setOpenPrinter(true);
        setPrinterError("");
        setSelectedPrinter(null);
        setPrinters([]);
        setPrintersLoading(true);

        try {
            const r = await fetch(`${API_BASE}/api/usuarios/impresoras`);
            const data = await r.json();
            const list = Array.isArray(data) ? data : [];
            setPrinters(list);

            // preseleccionar la impresora de este usuario (si tiene)
            const yaAsignada = list.find((p) => p.id_usu === user.id);
            if (yaAsignada) setSelectedPrinter(yaAsignada);
        } catch (e) {
            setPrinters([]);
        } finally {
            setPrintersLoading(false);
        }
    };

    // Sólo mostrar disponibles y la que ya pudiera tener este usuario
    const printerOptions = useMemo(() => {
        return printers.filter((p) => !p.id_usu || (printerUser && p.id_usu === printerUser.id));
    }, [printers, printerUser]);

    const handleAssignPrinter = async () => {
        if (!selectedPrinter) {
            setPrinterError("Selecciona una impresora.");
            return;
        }
        setAssigning(true);
        setPrinterError("");
        try {
            const res = await fetch(`${API_BASE}/api/usuarios/impresoras/asignar`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id_print: selectedPrinter.id_print,
                    id_usu: printerUser.id,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message || "Error al asignar impresora");
            mostrarAlerta("Impresora asignada");
            setOpenPrinter(false);
        } catch (e) {
            setPrinterError(e.message);
        } finally {
            setAssigning(false);
        }
    };

    const handleUnassignPrinter = async () => {
        setUnassigning(true);
        setPrinterError("");
        try {
            const res = await fetch(`${API_BASE}/api/usuarios/impresoras/quitar`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id_usu: printerUser.id }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message || "Error al quitar asignación");
            mostrarAlerta("Asignación eliminada");
            setOpenPrinter(false);
        } catch (e) {
            setPrinterError(e.message);
        } finally {
            setUnassigning(false);
        }
    };

    return (
        <div className={`place_holder-container ${animationClass}`}>
            <div className="place_holder-header">
                <span className="place_holder-title">Usuarios</span>
                <button className="place_holder-close" onClick={handleClose}>
                    <FaTimes />
                </button>
            </div>

            <ModalGestionRoles open={openRolesModal} onClose={() => setOpenRolesModal(false)} />

            <div className="place_holder-content">
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" fontWeight="bold">
                        Lista de usuarios registrados
                    </Typography>
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
                    <Box display="flex" flexDirection="column" gap={3}>
                        {usuariosPorRol.map(([rol, lista]) => (
                            <Paper key={rol} elevation={4} sx={{ borderRadius: 3, overflow: "hidden" }}>
                                <Box sx={{ px: 2, py: 1.5, bgcolor: "#f44336" }}>
                                    <Typography variant="subtitle1" sx={{ color: "#fff", fontWeight: 700 }}>
                                        {rol}{" "}
                                        <Typography component="span" sx={{ ml: 1, fontWeight: 400 }}>
                                            ({lista.length})
                                        </Typography>
                                    </Typography>
                                </Box>

                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                {["ID", "Nombre", "Correo", "Rol", "Turno", "Acciones"].map((title) => (
                                                    <TableCell key={title} sx={{ fontWeight: 600, fontSize: 14 }}>
                                                        {title}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {lista.map((user) => (
                                                <TableRow
                                                    key={user.id}
                                                    hover
                                                    sx={{ "&:hover": { backgroundColor: "#f5f5f5" }, transition: "background-color 0.3s" }}
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
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleEliminarUsuario(user.id)}
                                                                sx={{ color: "#d32f2f" }}
                                                            >
                                                                <DeleteIcon />
                                                            </IconButton>

                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleVerQR(user)}
                                                                sx={{ color: "#2f00ffff" }}
                                                                title="Ver QR de acceso"
                                                            >
                                                                <VisibilityIcon />
                                                            </IconButton>

                                                            {ROLES_CON_IMPRESORA.includes(user.rol) && (
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => handleOpenPrinter(user)}
                                                                    sx={{ color: "#000000ff" }}
                                                                    title="Asignar impresora"
                                                                >
                                                                    <PrintIcon />
                                                                </IconButton>
                                                            )}
                                                        </Box>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Paper>
                        ))}
                    </Box>
                )}
            </div>

            {/* Modal Crear/Editar */}
            <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth>
                <DialogTitle>{editando ? "Editar Usuario" : "Nuevo Usuario"}</DialogTitle>
                <DialogContent>
                    <TextField fullWidth label="Nombre" name="nombre" value={nuevoUsuario.nombre} onChange={handleChange} margin="normal" />
                    <TextField fullWidth label="Correo" name="correo" value={nuevoUsuario.correo} onChange={handleChange} margin="normal" />
                    {!editando && (
                        <TextField fullWidth label="Contraseña" name="password" type="password" value={nuevoUsuario.password} onChange={handleChange} margin="normal" />
                    )}
                    <TextField select fullWidth label="Rol" name="rol_id" margin="normal" value={nuevoUsuario.rol_id || ""} onChange={handleChange} required>
                        {rolesDisponibles.map((rol) => (
                            <MenuItem key={rol.id} value={rol.id}>
                                {rol.nombre}
                            </MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        fullWidth
                        label="Turno"
                        name="turno"
                        type="number"
                        value={nuevoUsuario.turno}
                        onChange={handleChange}
                        margin="normal"
                        inputProps={{ min: 1, max: 3 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancelar</Button>
                    <Button variant="contained" color="primary" onClick={handleGuardarUsuario}>
                        Guardar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal Confirmar Eliminación */}
            <Dialog open={confirmarEliminar.open} onClose={() => setConfirmarEliminar({ open: false, id: null })}>
                <DialogTitle>Confirmar eliminación</DialogTitle>
                <DialogContent>
                    <DialogContentText>¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmarEliminar({ open: false, id: null })}>Cancelar</Button>
                    <Button onClick={confirmarEliminacion} color="error" variant="contained">
                        Eliminar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal Credenciales / 2 QR */}
            <Dialog
                open={openCred}
                onClose={() => setOpenCred(false)}
                fullWidth
                maxWidth="sm"
                BackdropProps={{ sx: { backgroundColor: "transparent" }, invisible: true }}
                PaperProps={{ elevation: 8, sx: { borderRadius: 2 } }}
            >
                <DialogTitle>Credenciales de acceso</DialogTitle>
                <DialogContent dividers>
                    {loadingCred && (
                        <Box display="flex" justifyContent="center" py={3}>
                            <CircularProgress />
                        </Box>
                    )}

                    {!loadingCred && errorCred && <Typography color="error">{errorCred}</Typography>}

                    {!loadingCred && !errorCred && credenciales && (
                        <Box display="flex" flexDirection="column" gap={2}>
                            <Box display="flex" justifyContent="center" gap={6} py={2}>
                                <Box textAlign="center">
                                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                                        QR del correo
                                    </Typography>
                                    {qrEmailUrl ? (
                                        <img src={qrEmailUrl} alt="QR correo" width={200} height={200} />
                                    ) : (
                                        <Typography variant="caption">No se pudo generar</Typography>
                                    )}
                                </Box>
                                <Box textAlign="center">
                                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                                        QR de la contraseña
                                    </Typography>
                                    {qrPassUrl ? (
                                        <img src={qrPassUrl} alt="QR password" width={200} height={200} />
                                    ) : (
                                        <Typography variant="caption">No se pudo generar</Typography>
                                    )}
                                </Box>
                            </Box>

                            <Typography variant="caption" sx={{ mt: 1, color: "text.secondary", textAlign: "center" }}>
                                Escanea el QR del dato que necesites desde la app.
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenCred(false)}>Cerrar</Button>
                </DialogActions>
            </Dialog>

            {/* Modal Asignar Impresora */}
            <Dialog open={openPrinter} onClose={() => setOpenPrinter(false)} fullWidth maxWidth="sm">
                <DialogTitle>Asignar impresora</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        Usuario: <b>{printerUser?.nombre}</b> (ID: {printerUser?.id})
                    </Typography>

                    {printersLoading ? (
                        <Box display="flex" justifyContent="center" py={2}>
                            <CircularProgress size={24} />
                        </Box>
                    ) : (
                        <Autocomplete
                            options={printerOptions}
                            value={selectedPrinter}
                            onChange={(_, v) => setSelectedPrinter(v)}
                            getOptionLabel={(o) => (o ? `${o.name} — ${o.mac_print}${o.hand ? ` (${o.hand})` : ""}` : "")}
                            renderInput={(params) => (
                                <TextField {...params} label="Selecciona una impresora" placeholder="Buscar..." />
                            )}
                            noOptionsText="Sin impresoras disponibles"
                            isOptionEqualToValue={(a, b) => a.id_print === b.id_print}
                        />
                    )}

                    {printerError && (
                        <Typography color="error" sx={{ mt: 1 }}>
                            {printerError}
                        </Typography>
                    )}

                    {selectedPrinter?.id_usu && printerUser && selectedPrinter.id_usu !== printerUser.id && (
                        <Typography variant="caption" sx={{ mt: 1, display: "block", color: "text.secondary" }}>
                            Nota: esta impresora está asignada a otro usuario; al guardar se reasignará.
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenPrinter(false)}>Cancelar</Button>
                    <Button onClick={handleUnassignPrinter} disabled={unassigning} color="warning">
                        {unassigning ? "Quitando..." : "Quitar asignación"}
                    </Button>
                    <Button variant="contained" onClick={handleAssignPrinter} disabled={assigning || !selectedPrinter}>
                        {assigning ? "Guardando..." : "Guardar"}
                    </Button>
                </DialogActions>
            </Dialog>

            <SnackbarAlert open={alerta.open} mensaje={alerta.mensaje} tipo={alerta.tipo} onClose={cerrarAlerta} />
            <AdminPermisos open={openPermisos} onClose={() => setOpenPermisos(false)} onGuardado={() => setOpenPermisos(false)} />
                
        </div>
    );
};

export default Usuarios;
