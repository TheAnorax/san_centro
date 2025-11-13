// src/components/views/TraspasoListado.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { FaTimes } from 'react-icons/fa';
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, CircularProgress, Alert, Typography, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Grid, Stack
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import TablePagination from '@mui/material/TablePagination';
import axios from 'axios';
import Swal from 'sweetalert2';
import { generarPalletTraspaso } from "../../utils/generarPalletTraspaso";

const API_TRASPASO = 'http://66.232.105.107:3001/api/traspaso';


function SmartImage({ code, size = 56 }) {
  const base = 'https://sanced.santulconnect.com:3011/imagenes';
  const candidates = [
    `${base}/img_pz/${code}.jpg`,
    `${base}/img_pz/${code}.png`,
    `${base}/img/${code}.jpg`,
    `${base}/img/${code}.png`,
  ];

  const [idx, setIdx] = useState(0);
  const [src, setSrc] = useState(candidates[0]);

  useEffect(() => {
    setIdx(0);
    setSrc(candidates[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const handleError = () => {
    const next = idx + 1;
    if (next < candidates.length) {
      setIdx(next);
      setSrc(candidates[next]);
    } else {
      setSrc(`https://via.placeholder.com/${size}?text=Sin+img`);
    }
  };

  return (
    <img
      src={src}
      alt={`Producto ${code}`}
      onError={handleError}
      loading="lazy"
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        borderRadius: 8,
        background: '#f6f7f8',
        border: '1px solid #eee',
        display: 'block',
      }}
    />
  );
}

/* =========================
   Traspaso (agrupado por No_Orden)
   ========================= */
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
  const [groupsPerPage, setGroupsPerPage] = useState(1);

  const [modificarCantidad, setModificarCantidad] = useState(false);
  const [cantidadModificada, setCantidadModificada] = useState('');

  useEffect(() => {
    fetchRegistros();
  }, []);

  const fetchRegistros = async () => {
    setLoadingFetch(true);
    setErrorFetch('');
    try {
      const [resPendientes, resRecibidos] = await Promise.all([
        axios.get(`${API_TRASPASO}/pendientes`),
        axios.get(`${API_TRASPASO}/recibidos`),
      ]);

      const listaPendientes = resPendientes.data || [];
      const listaRecibidos = resRecibidos.data || [];

      // clave incluye No_Orden para no mezclar órdenes distintas
      const keyRec = (r) => `${r.No_Orden}|${r.Codigo}|${r.Cantidad}`;
      const setRecibidosKey = new Set(listaRecibidos.map(keyRec));
      const ubicacionMap = new Map(
        listaRecibidos.map(r => [keyRec(r), r.ubicacion])
      );

      const fusionado = listaPendientes.map(r => {
        const key = `${r.No_Orden}|${r.Codigo}|${r.Cantidad}`;
        if (setRecibidosKey.has(key)) {
          return { ...r, estado: 'F', ubicacion: ubicacionMap.get(key) || '' };
        }
        return { ...r, ubicacion: '' };
      });

      setRegistros(fusionado);
      setPage(0);
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
      const userData = JSON.parse(localStorage.getItem('user'));
      const usuarioId = userData?.id || null;

      const d = traspasoSeleccionado;
      await axios.post(`${API_TRASPASO}/guardarTraspaso`, {
        No_Orden: d.No_Orden || null,
        tipo_orden: d.tipo_orden || null,
        Codigo: d.Codigo,
        Descripcion: d.Descripcion,
        Clave: d.Clave,
        um: d.um,
        _pz: d._pz,
        Cantidad: modificarCantidad ? Number(cantidadModificada) : d.Cantidad,
        dia_envio: new Date(d.dia_envio).toISOString(),
        almacen_envio: d.almacen_envio,
        tiempo_llegada_estimado: new Date(d.tiempo_llegada_estimado).toISOString(),
        estado: 'F',
        ubicacion: ubicacionInput.trim(),
        usuario_id: usuarioId
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
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo guardar el traspaso. Intenta nuevamente.' });
    } finally {
      setSaving(false);
    }
  };

  const recargarPendientesYMarcar = async () => {
    setLoadingFetch(true);
    setErrorFetch('');
    try {
      const [resPend, resRec] = await Promise.all([
        axios.get(`${API_TRASPASO}/pendientes`),
        axios.get(`${API_TRASPASO}/recibidos`),
      ]);
      const listaPend = resPend.data || [];
      const listaRec = resRec.data || [];

      const setRecibidosKey = new Set(
        listaRec.map(r => `${r.No_Orden}|${r.Codigo}|${r.Cantidad}`)
      );
      const fusionado = listaPend.map(r => {
        const key = `${r.No_Orden}|${r.Codigo}|${r.Cantidad}`;
        return setRecibidosKey.has(key) ? { ...r, estado: 'F' } : r;
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

  const registrosOrdenados = useMemo(() => {
    return [...registros].sort((a, b) => {
      if ((a.estado !== 'F') && (b.estado === 'F')) return -1;
      if ((a.estado === 'F') && (b.estado !== 'F')) return 1;
      const ao = String(a.No_Orden || '').localeCompare(String(b.No_Orden || ''), 'es', { numeric: true });
      if (ao !== 0) return ao;
      return String(a.Codigo).localeCompare(String(b.Codigo), 'es', { numeric: true });
    });
  }, [registros]);

  const grupos = useMemo(() => {
    const by = new Map();
    registrosOrdenados.forEach(r => {
      const key = r.No_Orden || '—';
      if (!by.has(key)) by.set(key, []);
      by.get(key).push(r);
    });
    const entries = Array.from(by.entries()).sort((a, b) =>
      String(a[0]).localeCompare(String(b[0]), 'es', { numeric: true })
    );
    entries.forEach(([, arr]) =>
      arr.sort((a, b) => String(a.Codigo).localeCompare(String(b.Codigo), 'es', { numeric: true }))
    );
    return entries; // [ [noOrden, items[]], ... ]
  }, [registrosOrdenados]);

  const paginatedGroups = useMemo(() => {
    const start = page * groupsPerPage;
    return grupos.slice(start, start + groupsPerPage);
  }, [grupos, page, groupsPerPage]);

  const TOTAL_COLS = 14;

  return (

    <div className="place_holder-container fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div className="place_holder-header">
        <span className="place_holder-title">Traspasos</span>
        <button className="place_holder-close" onClick={() => (window.location.href = '/menu')}>
          <FaTimes />
        </button>
      </div>

      {/* Área central scrollable */}
      <Box
        sx={{
          p: 2,
          height: 'calc(100vh - 120px)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
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
          <>
            {/* Tabla con scroll y header sticky */}
            <TableContainer
              component={Paper}
              sx={{ mt: 2, flex: 1, minHeight: 0, overflow: 'auto' }}
            >
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>No Orden</TableCell>
                    <TableCell>Imagen</TableCell>
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
                    <TableCell>Ubicación Destino</TableCell>
                    <TableCell>Acciones</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {paginatedGroups.map(([noOrden, items]) => (
                    <React.Fragment key={`group-${noOrden}`}>
                      {/* Cabecera de grupo */}
                      <TableRow sx={{ background: '#f7f9fc' }}>
                        <TableCell colSpan={TOTAL_COLS} sx={{ fontWeight: 700 }}>
                          No Orden: {noOrden} {items[0]?.tipo_orden ? `· ${items[0].tipo_orden}` : ''}
                        </TableCell>
                      </TableRow>

                      {/* Filas del grupo */}
                      {items.map((r, i) => {
                        const yaRecibido = (r.estado || '').toUpperCase() === 'F';
                        return (
                          <TableRow key={`${noOrden}-${r.Codigo}-${r.Cantidad}-${i}`}>
                            <TableCell>{r.No_Orden}</TableCell>
                            <TableCell><SmartImage code={r.Codigo} /></TableCell>
                            <TableCell>{r.Codigo}</TableCell>
                            <TableCell>{r.Descripcion}</TableCell>
                            <TableCell>{r.Clave}</TableCell>
                            <TableCell>{r.um || '—'}</TableCell>
                            <TableCell>{r._pz != null ? r._pz : '—'}</TableCell>
                            <TableCell>{r.Cantidad}</TableCell>
                            <TableCell>{r.dia_envio ? new Date(r.dia_envio).toLocaleString() : '—'}</TableCell>
                            <TableCell>{r.almacen_envio || '—'}</TableCell>
                            <TableCell>{r.tiempo_llegada_estimado ? new Date(r.tiempo_llegada_estimado).toLocaleString() : '—'}</TableCell>
                            <TableCell>
                              {yaRecibido ? <CheckCircleIcon sx={{ color: 'green' }} /> : <RadioButtonUncheckedIcon sx={{ color: 'gray' }} />}
                            </TableCell>
                            <TableCell>{r.ubicacion}</TableCell>
                            <TableCell>

                              <Stack direction="row" spacing={1}>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  onClick={() => handleOpenDialog(r)}
                                  disabled={yaRecibido}
                                >
                                  {yaRecibido ? "Ya Recibido" : "Guardar Traspaso"}
                                </Button>

                                <Button
                                  variant="contained"
                                  color="success"
                                  size="small"
                                  onClick={() =>
                                    generarPalletTraspaso({
                                      Codigo: r.Codigo,
                                      Descripcion: r.Descripcion,
                                      Cantidad: r.Cantidad,
                                      dia_envio: r.dia_envio,
                                      almacen_envio: r.almacen_envio,
                                      um: r.um,
                                      _pz: r._pz,
                                      cajasXCama: 7,
                                      camasXPallet: 1,
                                      ubicacion_final: r.ubicacion || "N/A",
                                    })
                                  }
                                >
                                  Pallet
                                </Button>
                              </Stack>



                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </React.Fragment>
                  ))}

                  {grupos.length === 0 && !loadingFetch && (
                    <TableRow>
                      <TableCell colSpan={TOTAL_COLS} align="center">
                        No hay registros de traspaso.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Paginación por grupos (fuera del contenedor scrollable) */}
            <TablePagination
              component="div"
              count={grupos.length}
              page={page}
              onPageChange={(event, newPage) => setPage(newPage)}
              rowsPerPage={groupsPerPage}
              onRowsPerPageChange={(event) => {
                setGroupsPerPage(parseInt(event.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[1, 2, 3, 5]}
              labelRowsPerPage="Órdenes por página:"
            />

          </>
        )}
      </Box>



      {/* Modal Guardar Traspaso */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Guardar Traspaso</DialogTitle>
        <DialogContent dividers>
          {errorSave && (
            <Box sx={{ mb: 2 }}>
              <Alert severity="error">{errorSave}</Alert>
            </Box>
          )}

          {registroActual.Codigo && (
            <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
              <SmartImage code={registroActual.Codigo} size={140} />
              <Typography variant="subtitle1">
                Código: <b>{registroActual.Codigo}</b>
              </Typography>
            </Box>
          )}

          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Datos del registro seleccionado:
          </Typography>

          <Grid container spacing={1}>
            <Grid item xs={6} md={3}>
              <TextField label="Código" fullWidth value={registroActual.Codigo || ''} InputProps={{ readOnly: true }} size="small" />
            </Grid>
            <Grid item xs={6} md={5}>
              <TextField label="Descripción" fullWidth value={registroActual.Descripcion || ''} InputProps={{ readOnly: true }} size="small" />
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField label="Clave" fullWidth value={registroActual.Clave || ''} InputProps={{ readOnly: true }} size="small" />
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField label="UM" fullWidth value={registroActual.um || ''} InputProps={{ readOnly: true }} size="small" />
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField label="_pz" fullWidth value={registroActual._pz != null ? registroActual._pz : ''} InputProps={{ readOnly: true }} size="small" />
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField
                label="Cantidad"
                fullWidth
                value={modificarCantidad ? cantidadModificada : registroActual.Cantidad || ''}
                InputProps={{ readOnly: !modificarCantidad }}
                onChange={(e) => setCantidadModificada(e.target.value.replace(/[^0-9]/g, ''))}
                size="small"
              />
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
                value={registroActual.dia_envio ? new Date(registroActual.dia_envio).toLocaleString() : ''}
                InputProps={{ readOnly: true }}
                size="small"
              />
            </Grid>
            <Grid item xs={6} md={4}>
              <TextField label="Almacén Envío" fullWidth value={registroActual.almacen_envio || ''} InputProps={{ readOnly: true }} size="small" />
            </Grid>
            <Grid item xs={6} md={4}>
              <TextField
                label="Llegada Estimada"
                fullWidth
                value={registroActual.tiempo_llegada_estimado ? new Date(registroActual.tiempo_llegada_estimado).toLocaleString() : ''}
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
          <Button onClick={handleCloseDialog} disabled={saving}>Cancelar</Button>
          <Button onClick={handleGuardarUbicacion} variant="contained" color="primary" disabled={saving || !ubicacionInput.trim()}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>

      </Dialog>

    </div>

  );
}

export default Traspaso;