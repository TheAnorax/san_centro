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



          </Box>

          {/* Tabla de Insumos  */}
          <Box sx={{ mt: 2 }}>
            <Paper elevation={1} sx={{ width: '100%', overflow: 'auto' }}>
              <Table size="small">
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
                    insumos.map((row, idx) => (
                      <TableRow key={idx}>
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
                        </TableCell>


                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Paper>
          </Box>

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


        </Box>
      </div>


    </div>
  );
};

export default Insumos;
