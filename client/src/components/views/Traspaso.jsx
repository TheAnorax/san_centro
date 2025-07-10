// src/components/views/TraspasoListado.jsx

import React, { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import TablePagination from '@mui/material/TablePagination';
import axios from 'axios';
import Swal from 'sweetalert2';

function Traspaso() {
  const [registros, setRegistros] = useState([]);
  const [loadingFetch, setLoadingFetch] = useState(false);
  const [errorFetch, setErrorFetch] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [ubicacionInput, setUbicacionInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorSave, setErrorSave] = useState('');
  const [traspasoSeleccionado, setTraspasoSeleccionado] = useState(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const [modificarCantidad, setModificarCantidad] = useState(false);
  const [cantidadModificada, setCantidadModificada] = useState('');

  useEffect(() => {
    fetchRegistros();
  }, []);

  const fetchRegistros = async () => {
    setLoadingFetch(true);
    setErrorFetch('');
    try {
      const resPendientes = await axios.get('http://66.232.105.87:3007/api/RH/ObtenerTraspaso');
      const listaPendientes = resPendientes.data;

      const resRecibidos = await axios.get('http://66.232.105.107:3001/api/traspaso/recibidos');
      const listaRecibidos = resRecibidos.data;

      const ubicacionMap = new Map(
        listaRecibidos.map(r => [`${r.Codigo}|${r.Cantidad}`, r.ubicacion])
      );
      const setRecibidosKey = new Set(
        listaRecibidos.map(r => `${r.Codigo}|${r.Cantidad}`)
      );

      const fusionado = listaPendientes.map(r => {
        const key = `${r.Codigo}|${r.Cantidad}`;
        if (setRecibidosKey.has(key)) {
          return {
            ...r,
            estado: 'F',
            ubicacion: ubicacionMap.get(key) || ''
          };
        } else {
          return {
            ...r,
            ubicacion: ''
          };
        }
      });

      setRegistros(fusionado);
    } catch (err) {
      console.error('Error al obtener traspasos:', err);
      setErrorFetch('No se pudieron cargar los registros de traspaso.');
    } finally {
      setLoadingFetch(false);
    }
  };

  const handleOpenDialog = (registro) => {
    setTraspasoSeleccionado(registro);
    setUbicacionInput('');
    setErrorSave('');
    setModificarCantidad(false);
    setCantidadModificada(registro.Cantidad || '');
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setTraspasoSeleccionado(null);
    setUbicacionInput('');
    setErrorSave('');
  };

  const handleGuardarUbicacion = async () => {
    if (!ubicacionInput.trim()) {
      setErrorSave('La ubicación es obligatoria.');
      return;
    }
    setErrorSave('');
    setSaving(true);

    try {
      const datos = traspasoSeleccionado;
      await axios.post('http://66.232.105.107:3001/api/traspaso/guardarTraspaso', {
        Codigo: datos.Codigo,
        Descripcion: datos.Descripcion,
        Clave: datos.Clave,
        um: datos.um,
        _pz: datos._pz,
        Cantidad: modificarCantidad ? Number(cantidadModificada) : datos.Cantidad,
        dia_envio: new Date(datos.dia_envio).toISOString(),
        almacen_envio: datos.almacen_envio,
        tiempo_llegada_estimado: new Date(datos.tiempo_llegada_estimado).toISOString(),
        estado: 'F',
        ubicacion: ubicacionInput.trim()
      });


      Swal.fire({
        icon: 'success',
        title: '¡Guardado!',
        text: 'El traspaso se registró correctamente.',
        timer: 2000,
        showConfirmButton: false,
      });

      await recargarPendientesYMarcar();
      handleCloseDialog();
    } catch (err) {
      console.error('Error al guardar traspaso:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo guardar el traspaso. Intenta nuevamente.',
      });
    } finally {
      setSaving(false);
    }
  };

  const recargarPendientesYMarcar = async () => {
    setLoadingFetch(true);
    setErrorFetch('');
    try {
      const resPendientes = await axios.get('http://66.232.105.107:3007/api/RH/ObtenerTraspaso');
      const listaPend = resPendientes.data;
      const resRec = await axios.get('http://66.232.105.107:3001/api/traspaso/recibidos');
      const listaRec = resRec.data;
      const setRecibidosKey = new Set(listaRec.map(r => `${r.Codigo}|${r.Cantidad}`));
      const fusionado = listaPend.map(r => {
        const key = `${r.Codigo}|${r.Cantidad}`;
        if (setRecibidosKey.has(key)) {
          return { ...r, estado: 'F' };
        } else {
          return r;
        }
      });
      setRegistros(fusionado);
    } catch (err) {
      console.error('Error al recargar traspasos:', err);
      setErrorFetch('No se pudieron recargar los registros de traspaso.');
    } finally {
      setLoadingFetch(false);
    }
  };

  const registroActual = traspasoSeleccionado || {};

  const registrosOrdenados = [...registros].sort((a, b) => {
    if ((a.estado !== 'F') && (b.estado === 'F')) return -1;
    if ((a.estado === 'F') && (b.estado !== 'F')) return 1;
    return 0;
  });

  return (
    
    <div className="place_holder-container fade-in">
      <div className="place_holder-header">
        <span className="place_holder-title">Traspasos</span>
        <button
          className="place_holder-close"
          onClick={() => (window.location.href = '/menu')} >
          <FaTimes />
        </button>
      </div>

      <Box sx={{ p: 2 }}>
        {loadingFetch && (
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        )}

        {errorFetch && (
          <Box sx={{ mt: 2 }}>
            <Alert severity="error">{errorFetch}</Alert>
          </Box>
        )}

        {!loadingFetch && !errorFetch && (

          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Código</TableCell>
                  <TableCell>Descripción</TableCell>
                  <TableCell>Clave</TableCell>
                  <TableCell>UM</TableCell>
                  <TableCell>_pz</TableCell>
                  <TableCell>Cantidad</TableCell>
                  <TableCell>Día de Envío</TableCell>
                  <TableCell>Almacén Envío</TableCell>
                  <TableCell>Llegada Estimada</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Ubicaccion Destino</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {registrosOrdenados
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((r) => {
                    const estadoUpper = (r.estado || '').toUpperCase();
                    const yaRecibido = estadoUpper === 'F';
                    return (
                      <TableRow key={`${r.Codigo}-${r.Cantidad}`}>
                        <TableCell>{r.Codigo}</TableCell>
                        <TableCell>{r.Descripcion}</TableCell>
                        <TableCell>{r.Clave}</TableCell>
                        <TableCell>{r.um || '—'}</TableCell>
                        <TableCell>{r._pz != null ? r._pz : '—'}</TableCell>
                        <TableCell>{r.Cantidad}</TableCell>
                        <TableCell>
                          {r.dia_envio
                            ? new Date(r.dia_envio).toLocaleString()
                            : '—'}
                        </TableCell>
                        <TableCell>{r.almacen_envio || '—'}</TableCell>
                        <TableCell>
                          {r.tiempo_llegada_estimado
                            ? new Date(r.tiempo_llegada_estimado).toLocaleString()
                            : '—'}
                        </TableCell>
                        <TableCell>
                          {yaRecibido ? (
                            <CheckCircleIcon sx={{ color: 'green' }} />
                          ) : (
                            <RadioButtonUncheckedIcon sx={{ color: 'gray' }} />
                          )}
                        </TableCell>
                        <TableCell>{r.ubicacion}</TableCell>
                        <TableCell>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleOpenDialog(r)}
                            disabled={yaRecibido}
                          >
                            {yaRecibido ? 'Ya Recibido' : 'Guardar Traspaso'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                {registrosOrdenados.length === 0 && !loadingFetch && (
                  <TableRow>
                    <TableCell colSpan={12} align="center">
                      No hay registros de traspaso.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {/* ← PAGINADOR AQUÍ ABAJO */}
            <TablePagination
              component="div"
              count={registrosOrdenados.length}
              page={page}
              onPageChange={(event, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(parseInt(event.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[5]}
              labelRowsPerPage="" // Oculta el label, solo deja el paginador
            />
          </TableContainer>


        )}
      </Box>

      {/* Modal para Guardar Traspaso */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Guardar Traspaso</DialogTitle>
        <DialogContent dividers>
          {errorSave && (
            <Box sx={{ mb: 2 }}>
              <Alert severity="error">{errorSave}</Alert>
            </Box>
          )}
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Datos del registro seleccionado:
          </Typography>
          <Grid container spacing={1}>
            <Grid item xs={6} md={3}>
              <TextField
                label="Código"
                fullWidth
                value={registroActual.Codigo || ''}
                InputProps={{ readOnly: true }}
                size="small"
              />
            </Grid>
            <Grid item xs={6} md={5}>
              <TextField
                label="Descripción"
                fullWidth
                value={registroActual.Descripcion || ''}
                InputProps={{ readOnly: true }}
                size="small"
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField
                label="Clave"
                fullWidth
                value={registroActual.Clave || ''}
                InputProps={{ readOnly: true }}
                size="small"
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField
                label="UM"
                fullWidth
                value={registroActual.um || ''}
                InputProps={{ readOnly: true }}
                size="small"
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField
                label="_pz"
                fullWidth
                value={registroActual._pz != null ? registroActual._pz : ''}
                InputProps={{ readOnly: true }}
                size="small"
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField
                label="Cantidad"
                fullWidth
                value={modificarCantidad ? cantidadModificada : registroActual.Cantidad || ''}
                InputProps={{
                  readOnly: !modificarCantidad
                }}
                onChange={(e) => setCantidadModificada(e.target.value.replace(/[^0-9]/g, ''))}
                size="small"
              />
              {/* Checkbox para activar la edición */}
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <input
                  type="checkbox"
                  checked={modificarCantidad}
                  onChange={() => setModificarCantidad(!modificarCantidad)}
                  id="modificar-cantidad"
                  style={{ marginRight: 6 }}
                />
                <label htmlFor="modificar-cantidad" style={{ fontSize: 13, cursor: 'pointer' }}>
                  Modificar cantidad recibida
                </label>
              </Box>
            </Grid>

            <Grid item xs={6} md={4}>
              <TextField
                label="Día de Envío"
                fullWidth
                value={
                  registroActual.dia_envio
                    ? new Date(registroActual.dia_envio).toLocaleString()
                    : ''
                }
                InputProps={{ readOnly: true }}
                size="small"
              />
            </Grid>
            <Grid item xs={6} md={4}>
              <TextField
                label="Almacén Envío"
                fullWidth
                value={registroActual.almacen_envio || ''}
                InputProps={{ readOnly: true }}
                size="small"
              />
            </Grid>
            <Grid item xs={6} md={4}>
              <TextField
                label="Llegada Estimada"
                fullWidth
                value={
                  registroActual.tiempo_llegada_estimado
                    ? new Date(registroActual.tiempo_llegada_estimado).toLocaleString()
                    : ''
                }
                InputProps={{ readOnly: true }}
                size="small"
              />
            </Grid>
          </Grid>
          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Ingresa la ubicación donde se guardó este traspaso:
            </Typography>
            <TextField
              label="Ubicación"
              fullWidth
              value={ubicacionInput}
              onChange={(e) => setUbicacionInput(e.target.value)}
              disabled={saving}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ pr: 2, pb: 2 }}>
          <Button onClick={handleCloseDialog} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleGuardarUbicacion}
            variant="contained"
            color="primary"
            disabled={saving || !ubicacionInput.trim()}
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

    </div>
  );
}

export default Traspaso;