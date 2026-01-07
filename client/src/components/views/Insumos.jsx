import React, { useState, useEffect } from "react";
import Autocomplete from '@mui/material/Autocomplete';
import { FaTimes, FaEdit, FaPlus, FaMinusCircle } from "react-icons/fa";
import Swal from 'sweetalert2';
import axios from 'axios';

import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, Tabs, Tab, Divider,
  TextField, Grid, Box, Typography, Table, TableHead, TableBody, TableRow, TableCell, Paper
} from '@mui/material';

const initialFormState = {
  codigopropuesto: '', minimofabricacion: '', descripcion: '', caracteristicas: '',
  inventario: '', tiempodefabricacion: '', um: '', consumomensual: '',
  inventarioptimo: '', inventariominimo: '', requerimiento: '', area: ''
};

const unidadesMedida = [
  { label: "PZ" },
  { label: "KG" },
  { label: "ROLLO" },
  { label: "CJ" },
];

const areas = [
  { label: "EMBARQUES" },
  { label: "RECIBO" },
  { label: "INVENTARIO" },
  { label: "SURTIDO" },
  { label: "PAQUETERIA" },
  { label: "DEPARTAMENTAL" },
  { label: "EXPORTACION" },
  { label: "ECOMMERCE" },
  { label: "MAQUILA" },
  { label: "MONTACARGAS" },
];

const Insumos = () => {
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [insumos, setInsumos] = useState([]);
  const [mostrarCeros, setMostrarCeros] = useState(false);

  // 👉 Solicitudes de insumos
  const [solicitudes, setSolicitudes] = useState([]);
  const [openModalSolicitudes, setOpenModalSolicitudes] = useState(false);


  // 👉 ESTADOS PARA SOLICITAR INSUMOS
  const [openSolicitud, setOpenSolicitud] = useState(false);
  const [insumoParaSolicitar, setInsumoParaSolicitar] = useState(null);
  const [cantidadSolicitud, setCantidadSolicitud] = useState("");


  const insumosFiltrados = mostrarCeros
    ? insumos.filter(i => Number(i.inventario) === 0)
    : insumos;

  const abrirModalSolicitud = (insumo) => {
    setInsumoParaSolicitar(insumo);
    setCantidadSolicitud("");
    setOpenSolicitud(true);
  };

  const cerrarModalSolicitud = () => {
    setOpenSolicitud(false);
    setInsumoParaSolicitar(null);
    setCantidadSolicitud("");
  };

  const handleClose = () => {
    setOpen(false);
    setEditMode(false);
    setEditId(null);
    setFormData(initialFormState);
  };

  const handleEdit = (row) => {
    console.log('EDITAR:', row);
    setFormData(row);
    setEditId(row.id_insumos);

    setEditMode(true);
    setOpen(true);
  };

  const handleOpen = () => {
    setFormData(initialFormState);
    setEditMode(false);
    setEditId(null);
    setOpen(true);
  };

  const handleSubmit = async () => {
    handleClose();

    const confirmar = await Swal.fire({
      title: editMode ? "¿Guardar cambios?" : "¿Registrar nuevo insumo?",
      text: editMode
        ? "¿Estás seguro de actualizar este insumo?"
        : "¿Estás seguro de guardar este insumo?",
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: editMode ? 'Actualizar' : 'Guardar',
      cancelButtonText: 'Cancelar',
    });

    if (!confirmar.isConfirmed) return;

    try {
      if (editMode) {
        await axios.put(`http://66.232.105.107:3001/api/insumos/Editar_insumo/${editId}`, formData);
        await Swal.fire("Actualizado", "El insumo fue actualizado", "success");
      } else {
        await axios.post('http://66.232.105.107:3001/api/insumos/Insertar_insumo', formData);
        await Swal.fire("Guardado", "El insumo fue guardado", "success");
      }
      setFormData(initialFormState);
      setEditId(null);
      cargarInsumos();
    } catch (e) {
      await Swal.fire("Error", "No se pudo guardar/actualizar el insumo", "error");
    }
  };

  const cargarInsumos = async () => {
    try {
      const res = await axios.get('http://66.232.105.107:3001/api/insumos/Obtener_insumos');
      setInsumos(res.data);
    } catch (error) {
      setInsumos([]);
      Swal.fire("Error", "Error al cargar insumos", "error");
    }
  };

  useEffect(() => {
    cargarInsumos();
  }, []);

  //Consumo de insumos 
  const [openMovimiento, setOpenMovimiento] = useState(false);
  const [, setTipoMovimiento] = useState("entrada");
  const [insumoSeleccionado, setInsumoSeleccionado] = useState(null);

  const handleMovimiento = (insumo, tipo) => {
    setInsumoSeleccionado(insumo);
    setTipoMovimiento(tipo);
    setOpenMovimiento(true);

  };

  const handleCloseMovimiento = () => {
    setOpenMovimiento(false);
    setInsumoSeleccionado(null);
  };

  const [tabIndex, setTabIndex] = useState(0);

  function SalidaInsumoForm({ insumo, onClose }) {
    const [cantidad, setCantidad] = useState('');
    const [area, setArea] = useState('');
    const [entregadoA, setEntregadoA] = useState('');
    const usuarioData = JSON.parse(localStorage.getItem('user') || '{}');
    const usuario = usuarioData.nombre || 'N/A';
    const handleReset = async () => {
      if (!cantidad || isNaN(cantidad) || parseInt(cantidad) <= 0) {
        Swal.fire("Error", "Debes ingresar una cantidad válida", "warning");
        return;
      }
      try {
        await axios.post('http://66.232.105.107:3001/api/insumos/movimientos', {

          id_insumos: insumo.id_insumos,
          tipo: "SALIDA",
          cantidad,
          usuario,
          area,
          entregado_a: entregadoA,
          comentario: ""
        });
        Swal.fire("Éxito", "Salida registrada", "success");
        onClose();
      } catch {
        Swal.fire("Error", "No se pudo registrar la salida", "error");
        onClose();
      }
    };
    return (
      <Box sx={{ mt: 2 }}>
        <TextField
          fullWidth
          label="Cantidad Reducida"
          value={cantidad}
          onChange={e => setCantidad(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Autocomplete
          fullWidth
          options={areas}
          value={area ? { label: area } : null}
          onChange={(e, newValue) => setArea(newValue ? newValue.label : "")}
          renderInput={params => <TextField {...params} label="Área/Departamento" />}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          label="Entregado a"
          value={entregadoA}
          onChange={e => setEntregadoA(e.target.value)}
          sx={{ mb: 2 }}
        />
        <DialogActions>
          <Button onClick={onClose} color="error">Cancelar</Button>
          <Button onClick={handleReset} variant="contained" color="primary">Consumir</Button>
        </DialogActions>
      </Box>
    );
  }

  function EntradaInsumoForm({ insumo, onClose }) {

    const [cantidad, setCantidad] = useState('');
    const usuarioData = JSON.parse(localStorage.getItem('user') || '{}');
    const usuario = usuarioData.nombre || 'N/A';

    const handleAdd = async () => {
      if (!cantidad || isNaN(cantidad) || parseInt(cantidad) <= 0) {
        Swal.fire("Error", "Debes ingresar una cantidad válida", "warning");
        return;
      }
      try {
        await axios.post('http://66.232.105.107:3001/api/insumos/movimientos', {
          id_insumos: insumo.id_insumos,
          tipo: "ENTRADA",
          cantidad,
          usuario,
          area: "",
          entregado_a: "",
          comentario: ""
        });
        Swal.fire("Éxito", "Entrada registrada", "success");
        onClose();
      } catch {
        Swal.fire("Error", "No se pudo registrar la entrada", "error");
        onClose();
      }
    };

    return (
      <Box sx={{ mt: 2 }}>
        <TextField
          fullWidth
          label="Cantidad de Entrada"
          value={cantidad}
          onChange={e => setCantidad(e.target.value)}
          sx={{ mb: 2 }}
        />
        <DialogActions>
          <Button onClick={onClose} color="error">Cancelar</Button>
          <Button onClick={handleAdd} variant="contained" color="success">Ingresar</Button>
        </DialogActions>
      </Box>
    );
  }
  

  //Mostrar Los datos que se an realizados
  const [openMovimientos, setOpenMovimientos] = useState(false);
  const [movimientos, setMovimientos] = useState([]);
  const [movimientosCargando, setMovimientosCargando] = useState(false);
  const [descInsumo, setDescInsumo] = useState("");


  const handleVerMovimientos = async () => {
    setOpenMovimientos(true);
    setDescInsumo("Todos los Insumos");
    setMovimientosCargando(true);
    try {
      const res = await axios.get('http://66.232.105.107:3001/api/insumos/Mostrar_movimientos');
      setMovimientos(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setMovimientos([]);
    }
    setMovimientosCargando(false);
  };

  const handleCerrarMovimientos = () => {
    setOpenMovimientos(false);
    setMovimientos([]);
    setDescInsumo("");
  };


  // INSERCCION DE INSUMOS 

  const solicitarInsumo = async (insumo, cantidad) => {
    const usuarioData = JSON.parse(localStorage.getItem("user") || "{}");

    try {
      await axios.post("http://66.232.105.107:3001/api/insumos/enviar-solicitud", {
        codigo: insumo.codigopropuesto,
        descripcion: insumo.descripcion,
        cantidad,
        area: insumo.area,
        usuario: JSON.stringify(usuarioData)
      });

      Swal.fire("Enviado", "La solicitud fue enviada correctamente", "success");
    } catch (e) {
      Swal.fire("Error", "No se pudo enviar la solicitud", "error");
    }
  };


  const cargarSolicitudes = async () => {
    try {
      const res = await axios.get("http://66.232.105.107:3001/api/insumos/solicitudes");
      setSolicitudes(res.data);
    } catch (error) {
      Swal.fire("Error", "No se pudieron cargar las solicitudes", "error");
    }
  };


  const actualizarEstado = async (id, nuevoEstado) => {
    try {
      await axios.put(`http://66.232.105.107:3001/api/insumos/solicitudes/${id}/${nuevoEstado}`);

      Swal.fire("Correcto", `Solicitud marcada como ${nuevoEstado}`, "success");

      // ⬇⬇⬇ Agregar estas DOS líneas ⬇⬇⬇
      cargarSolicitudes();           // refresca la tabla
      setOpenModalSolicitudes(false); // Cierra el modal

    } catch (e) {
      Swal.fire("Error", "No se pudo actualizar la solicitud", "error");
    }
  };





  return (

    <div className="place_holder-container fade-in">

      <div className="place_holder-header">
        <span className="place_holder-title">Insumos</span>
        <button className="place_holder-close" onClick={() => window.location.href = "/menu"}>
          <FaTimes />
        </button>
      </div>

      <div className="place_holder-content">
        <Box sx={{ p: 3 }}>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>

            <Button
              variant="outlined"
              startIcon={<FaPlus />}
              sx={{
                color: '#22723D',
                borderColor: '#22723D',
                backgroundColor: '#f8fbf8',
                fontWeight: 'bold',
                '&:hover': {
                  backgroundColor: '#e6f2e6',
                  borderColor: '#22723D',
                  color: '#1a5b2e',
                }
              }}
              onClick={handleOpen}
            >
              NUEVO INSUMO
            </Button>

            <Button
              variant="outlined"
              color="secondary"
              onClick={() => handleVerMovimientos()}
            >
              Ver Movimientos
            </Button>

            <Button
              variant="outlined"
              color={mostrarCeros ? "error" : "success"}
              onClick={() => setMostrarCeros(!mostrarCeros)}
            >
              {mostrarCeros ? "Mostrar Todos" : "Inventario en 0"}
            </Button>


            <Button
              variant="outlined"
              color="primary"
              onClick={() => {
                cargarSolicitudes();
                setOpenModalSolicitudes(true);
              }}
            >
              Ver Solicitudes
            </Button>


          </Box>

          {/* Tabla de Insumos  */}
          <Paper elevation={1} sx={{ width: '100%' }}>
            <Box sx={{ maxHeight: 820, overflowY: 'auto' }}>   {/* 👈 SCROLL */}
              <Table size="small" stickyHeader>

                <TableHead>
                  <TableRow>
                    <TableCell>Código</TableCell>
                    <TableCell>Descripción</TableCell>
                    <TableCell>UM</TableCell>
                    <TableCell>Inventario</TableCell>
                    <TableCell>Área</TableCell>
                    <TableCell>Editar</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {insumos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">Sin registros</TableCell>
                    </TableRow>
                  ) : (
                    insumosFiltrados.map((row, idx) => (

                      <TableRow
                        key={idx}
                        sx={{
                          backgroundColor: Number(row.inventario) === 0 ? "#ffc0c0ff" : "inherit",
                        }}
                      >

                        <TableCell>{row.codigopropuesto}</TableCell>
                        <TableCell>{row.descripcion}</TableCell>
                        <TableCell>{row.um}</TableCell>
                        <TableCell>{row.inventario}</TableCell>
                        <TableCell>{row.area}</TableCell>
                        <TableCell>
                          <Button
                            variant="outlined"
                            size="small"
                            color="primary"
                            onClick={() => handleEdit(row)}
                            startIcon={<FaEdit />}
                            sx={{ mr: 1, mb: 1 }}
                          >
                            EDITAR
                          </Button>

                          <Button
                            variant="outlined"
                            size="small"
                            color="error"
                            startIcon={<FaMinusCircle />}
                            onClick={() => handleMovimiento(row, "salida")}
                            sx={{ mr: 1, mb: 1 }}
                          >
                            CONSUMIR
                          </Button>


                          <Button
                            variant="contained"
                            size="small"
                            color="primary"
                            onClick={() => abrirModalSolicitud(row)}
                            sx={{ mr: 1, mb: 1 }}
                          >
                            SOLICITAR
                          </Button>


                        </TableCell>


                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Box>
          </Paper>


          {/* Modal para crear/editar insumo */}
          <Dialog open={open} onClose={handleClose} PaperProps={{ sx: { minWidth: 400 } }}>
            <DialogTitle sx={{ fontWeight: 'bold', textAlign: 'center' }}>
              {editMode ? "Editar insumo" : "Registrar nuevo insumo"}
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2} direction="column" justifyContent="center">
                <Grid item xs={12}>
                  <TextField variant="standard" fullWidth label="Código Propuesto" name="codigopropuesto" value={formData.codigopropuesto} onChange={e => setFormData(prev => ({ ...prev, codigopropuesto: e.target.value }))} />
                </Grid>
                <Grid item xs={12}>
                  <TextField variant="standard" fullWidth label="Mínimo de Fabricación" name="minimofabricacion" value={formData.minimofabricacion} onChange={e => setFormData(prev => ({ ...prev, minimofabricacion: e.target.value }))} />
                </Grid>
                <Grid item xs={12}>
                  <TextField variant="standard" fullWidth label="Descripción" name="descripcion" value={formData.descripcion} onChange={e => setFormData(prev => ({ ...prev, descripcion: e.target.value }))} />
                </Grid>
                <Grid item xs={12}>
                  <TextField variant="standard" fullWidth label="Características" name="caracteristicas" value={formData.caracteristicas} onChange={e => setFormData(prev => ({ ...prev, caracteristicas: e.target.value }))} />
                </Grid>
                <Grid item xs={12}>
                  <TextField variant="standard" fullWidth label="Inventario" name="inventario" value={formData.inventario} onChange={e => setFormData(prev => ({ ...prev, inventario: e.target.value }))} />
                </Grid>
                <Grid item xs={12}>
                  <TextField variant="standard" fullWidth label="Tiempo de Fabricación" name="tiempodefabricacion" value={formData.tiempodefabricacion} onChange={e => setFormData(prev => ({ ...prev, tiempodefabricacion: e.target.value }))} />
                </Grid>
                <Grid item xs={12}>
                  <Autocomplete
                    fullWidth
                    options={unidadesMedida}
                    value={formData.um ? { label: formData.um } : null}
                    onChange={(event, newValue) =>
                      setFormData(prev => ({ ...prev, um: newValue ? newValue.label : "" }))
                    }
                    renderInput={params => (
                      <TextField {...params} label="Unidad de Medida" variant="standard" fullWidth />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField variant="standard" fullWidth label="Consumo Mensual" name="consumomensual" value={formData.consumomensual} onChange={e => setFormData(prev => ({ ...prev, consumomensual: e.target.value }))} />
                </Grid>
                <Grid item xs={12}>
                  <TextField variant="standard" fullWidth label="Inventario Óptimo" name="inventarioptimo" value={formData.inventarioptimo} onChange={e => setFormData(prev => ({ ...prev, inventarioptimo: e.target.value }))} />
                </Grid>
                <Grid item xs={12}>
                  <TextField variant="standard" fullWidth label="Inventario Mínimo" name="inventariominimo" value={formData.inventariominimo} onChange={e => setFormData(prev => ({ ...prev, inventariominimo: e.target.value }))} />
                </Grid>
                <Grid item xs={12}>
                  <TextField variant="standard" fullWidth label="Requerimiento" name="requerimiento" value={formData.requerimiento} onChange={e => setFormData(prev => ({ ...prev, requerimiento: e.target.value }))} />
                </Grid>
                <Grid item xs={12}>
                  <Autocomplete
                    fullWidth
                    options={areas}
                    value={formData.area ? { label: formData.area } : null}
                    onChange={(event, newValue) =>
                      setFormData(prev => ({ ...prev, area: newValue ? newValue.label : "" }))
                    }
                    renderInput={params => (
                      <TextField {...params} label="Área" variant="standard" fullWidth />
                    )}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose} color="error">Cancelar</Button>
              <Button onClick={handleSubmit} variant="contained" color={editMode ? "primary" : "success"}>
                {editMode ? "Actualizar" : "Guardar"}
              </Button>
            </DialogActions>
          </Dialog>


          {/* Entrada y salida de insumos*/}
          <Dialog open={openMovimiento} onClose={handleCloseMovimiento} maxWidth="xs">
            <DialogTitle>
              Movimiento de Insumo: {insumoSeleccionado?.codigopropuesto}
            </DialogTitle>
            <DialogContent>
              <Tabs value={tabIndex} onChange={(e, v) => setTabIndex(v)} centered>
                <Tab label="SALIDA INSUMOS" />
                <Tab label="ENTRADA INSUMOS" />
              </Tabs>
              {tabIndex === 0 && (
                <SalidaInsumoForm insumo={insumoSeleccionado} onClose={handleCloseMovimiento} />
              )}
              {tabIndex === 1 && (
                <EntradaInsumoForm insumo={insumoSeleccionado} onClose={handleCloseMovimiento} />
              )}
            </DialogContent>
          </Dialog>


          {/* Mostrar Movimientos realizados*/}
          <Dialog
            open={openMovimientos}
            onClose={handleCerrarMovimientos}
            PaperProps={{
              sx: {
                minWidth: 780,
                borderRadius: 3,
                boxShadow: 10,
                p: 2,
                backgroundColor: "#fafafb"
              }
            }}
          >
            <DialogTitle sx={{ display: "flex", alignItems: "center", mb: 1 }}>
              <span role="img" aria-label="history" style={{ marginRight: 8, fontSize: 28 }}>📊</span>
              <Typography variant="h6" fontWeight="bold">
                Movimientos de: {descInsumo || "Todos los Insumos"}
              </Typography>
            </DialogTitle>
            <DialogContent dividers sx={{ pt: 1 }}>
              {movimientosCargando ? (
                <Typography>Cargando...</Typography>
              ) : (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle1" fontWeight="bold" color="primary" sx={{ mt: 2 }}>
                    Entradas
                  </Typography>
                  {movimientos.filter(m => m.tipo === "ENTRADA").length === 0 ? (
                    <Typography color="textSecondary">Sin movimientos de entrada</Typography>
                  ) : (
                    <Table size="small" sx={{ mb: 2 }}>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: "#f1f1f1" }}>
                          <TableCell>Fecha</TableCell>
                          <TableCell>Codigo</TableCell>
                          <TableCell>Cantidad</TableCell>
                          <TableCell>Usuario responsable de Entrada</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {movimientos.filter(m => m.tipo === "ENTRADA").map((mov, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{new Date(mov.fecha).toLocaleString()}</TableCell>
                            <TableCell>{mov.codigopropuesto || "-"}</TableCell>
                            <TableCell>{mov.cantidad}</TableCell>
                            <TableCell>{mov.usuario}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle1" fontWeight="bold" color="secondary" sx={{ mt: 2 }}>
                    Salidas
                  </Typography>
                  {movimientos.filter(m => m.tipo === "SALIDA").length === 0 ? (
                    <Typography color="textSecondary">Sin movimientos de salida</Typography>
                  ) : (

                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: "#f1f1f1" }}>
                          <TableCell sx={{ minWidth: 180 }}>Fecha</TableCell>
                          <TableCell>Codigo</TableCell>
                          <TableCell>Cantidad</TableCell>
                          <TableCell>Entregado a</TableCell>
                          <TableCell>Área</TableCell>
                          <TableCell>Usuario responsable de Salida</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {movimientos.filter(m => m.tipo === "SALIDA").map((mov, idx) => (
                          <TableRow key={idx}>
                            <TableCell sx={{ whiteSpace: 'nowrap', minWidth: 180 }}>
                              {new Date(mov.fecha).toLocaleString()}
                            </TableCell>
                            <TableCell>{mov.codigopropuesto}</TableCell>
                            <TableCell>{mov.cantidad}</TableCell>
                            <TableCell>{mov.entregado_a}</TableCell>
                            <TableCell>{mov.area}</TableCell>
                            <TableCell>{mov.usuario}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                  )}
                </>
              )}
              <DialogActions>
                <Button
                  onClick={handleCerrarMovimientos}
                  variant="contained"
                  sx={{
                    backgroundColor: "#e74c3c",
                    color: "white",
                    fontWeight: "bold",
                    borderRadius: 2,
                    px: 3,
                    my: 2,
                    '&:hover': {
                      backgroundColor: "#c0392b"
                    }
                  }}
                >
                  CERRAR
                </Button>
              </DialogActions>
            </DialogContent>
          </Dialog>



          {/* SOLICITUD DE INSUMOS  */}
          <Dialog open={openSolicitud} onClose={cerrarModalSolicitud} maxWidth="xs" fullWidth>
            <DialogTitle>Solicitar Insumo</DialogTitle>

            <DialogContent>
              {insumoParaSolicitar && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body1"><strong>Código:</strong> {insumoParaSolicitar.codigopropuesto}</Typography>
                  <Typography variant="body1"><strong>Descripción:</strong> {insumoParaSolicitar.descripcion}</Typography>
                  <Typography variant="body1"><strong>Área:</strong> {insumoParaSolicitar.area}</Typography>

                  <TextField
                    fullWidth
                    label="Cantidad a solicitar"
                    type="number"
                    value={cantidadSolicitud}
                    onChange={(e) => setCantidadSolicitud(e.target.value)}
                    sx={{ mt: 2 }}
                  />
                </Box>
              )}
            </DialogContent>

            <DialogActions>
              <Button onClick={cerrarModalSolicitud} color="error">
                Cancelar
              </Button>

              <Button
                variant="contained"
                color="primary"
                onClick={async () => {
                  if (!cantidadSolicitud || Number(cantidadSolicitud) <= 0) {
                    Swal.fire("Error", "Ingresa una cantidad válida", "warning");
                    return;
                  }

                  await solicitarInsumo(insumoParaSolicitar, cantidadSolicitud);
                  cerrarModalSolicitud();
                }}
              >
                ENVIAR SOLICITUD
              </Button>
            </DialogActions>
          </Dialog>


          {/* MODAL DE SOLICITUDES */}
          <Dialog open={openModalSolicitudes} onClose={() => setOpenModalSolicitudes(false)} maxWidth="md" fullWidth>
            <DialogTitle>Solicitudes de Insumos</DialogTitle>

            <DialogContent>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Código</TableCell>
                    <TableCell>Descripción</TableCell>
                    <TableCell>Cantidad</TableCell>
                    <TableCell>Área</TableCell>
                    <TableCell>Solicitante</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Acciones</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {solicitudes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">No hay solicitudes</TableCell>
                    </TableRow>
                  ) : (
                    solicitudes.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>{s.codigo}</TableCell>
                        <TableCell>{s.descripcion}</TableCell>
                        <TableCell>{s.cantidad}</TableCell>
                        <TableCell>{s.area}</TableCell>
                        <TableCell>{s.solicitante}</TableCell>

                        <TableCell>
                          {s.estado === "SOLICITADO" && (
                            <span style={{ color: "orange", fontWeight: "bold" }}>SOLICITADO</span>
                          )}
                          {s.estado === "APROBADO" && (
                            <span style={{ color: "blue", fontWeight: "bold" }}>APROBADO</span>
                          )}
                          {s.estado === "RECIBIDO" && (
                            <span style={{ color: "green", fontWeight: "bold" }}>RECIBIDO</span>
                          )}
                        </TableCell>

                        <TableCell>
                          {s.estado === "SOLICITADO" && (
                            <Button
                              variant="contained"
                              color="primary"
                              onClick={() => actualizarEstado(s.id, "APROBADO")}
                              sx={{ mr: 1 }}
                            >
                              Aprobar
                            </Button>
                          )}

                          {s.estado === "APROBADO" && (
                            <Button
                              variant="contained"
                              color="success"
                              onClick={() => actualizarEstado(s.id, "RECIBIDO")}
                            >
                              Recibido
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </DialogContent>

            <DialogActions>
              <Button onClick={() => setOpenModalSolicitudes(false)} color="error">
                Cerrar
              </Button>
            </DialogActions>
          </Dialog>



        </Box>
      </div>


    </div>

  );
};

export default Insumos;
