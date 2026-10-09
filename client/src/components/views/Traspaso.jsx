// src/components/views/TraspasoListado.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { FaTimes } from 'react-icons/fa';
import { BsFileEarmarkExcel, BsFileEarmarkPdf } from "react-icons/bs";
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, CircularProgress, Alert, Typography, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Grid, Stack, IconButton
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import TablePagination from '@mui/material/TablePagination';
import Pagination from '@mui/material/Pagination';
import axios from 'axios';
import Swal from 'sweetalert2';
import { generarPalletTraspaso } from "../../utils/generarPalletTraspaso";
import * as XLSX from "xlsx";

const API_TRASPASO = 'http://66.232.105.107:3001/api/traspaso';


function SmartImage({ code, size = 56 }) {
  const base = 'http://66.232.105.83:9101/images';
  const candidates = [
    `${base}/${code}.jpg`,
    `${base}/noimage.png`,
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

// Une pendientes + recibidos. Los recibidos que ya NO vienen en /pendientes
// (el backend los saca de esa lista al recibirse) también se muestran, si no
// "Ver recibidos" salía vacío.
const fusionarTraspasos = (listaPendientes, listaRecibidos) => {
  const keyOf = (r) => `${r.No_Orden}|${r.Codigo}|${r.Cantidad}`;
  const recibidosMap = new Map(listaRecibidos.map(r => [keyOf(r), r]));
  const usados = new Set();

  const resultado = listaPendientes.map(r => {
    const key = keyOf(r);
    if (recibidosMap.has(key)) {
      const rec = recibidosMap.get(key);
      usados.add(key);
      return { ...r, estado: 'F', created_at: rec.created_at || null, ubicacion: rec.ubicacion || '' };
    }
    return { ...r, created_at: null, ubicacion: '' };
  });

  listaRecibidos.forEach(rec => {
    if (!usados.has(keyOf(rec))) {
      resultado.push({ ...rec, estado: 'F', created_at: rec.created_at || null, ubicacion: rec.ubicacion || '' });
    }
  });

  return resultado;
};

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


  const [modificarCantidad, setModificarCantidad] = useState(false);
  const [cantidadModificada, setCantidadModificada] = useState('');

  const [ocInput, setOcInput] = useState('');

  const CHUNK_SIZE = 50;
  const [visibleCount, setVisibleCount] = useState(CHUNK_SIZE);

  const [modoUbicacion, setModoUbicacion] = useState('SUMAR'); // 'SUMAR' | 'NUEVA'


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

      const fusionado = fusionarTraspasos(listaPendientes, listaRecibidos);
      setRegistros(fusionado);
    } catch (err) {
      console.error('Error al obtener traspasos:', err);
      setErrorFetch('No se pudieron cargar los registros de traspaso.');
    } finally {
      setLoadingFetch(false);
    }
  };

  const handleOpenDialog = async (registro) => {
    setTraspasoSeleccionado(registro);
    setErrorSave('');
    setModificarCantidad(false);
    setCantidadModificada(registro.Cantidad || '');

    try {
      const res = await axios.get(
        `${API_TRASPASO}/inventario-por-codigo/${registro.Codigo}`
      );

      if (res.data.ok && res.data.data) {
        setUbicacionInput(res.data.data.ubicacion || '');
        setOcInput(res.data.data.oc || '');
      } else {
        setUbicacionInput('');
        setOcInput('');
      }

    } catch (error) {
      console.error('Error al consultar inventario:', error);
      setUbicacionInput('');
      setOcInput('');
    }

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
        usuario_id: usuarioId,
        lote_serie: d.lote_serie || null,
        lote: d.lote_serie || null,
        oc: ocInput
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

      const fusionado = fusionarTraspasos(listaPend, listaRec);
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

  const TOTAL_COLS = 14;

  //mostrar los que ya se recibieron o ocultarlos 
  const [verRecibidos, setVerRecibidos] = useState(false);

  const gruposPendientes = grupos.map(([noOrden, items]) => [
    noOrden,
    items.filter(r => (r.estado || '').toUpperCase() !== 'F')
  ]).filter(([_, items]) => items.length > 0);

  const gruposRecibidos = grupos.map(([noOrden, items]) => [
    noOrden,
    items.filter(r => (r.estado || '').toUpperCase() === 'F')
  ]).filter(([_, items]) => items.length > 0).reverse(); // más recientes primero

  const [pagina, setPagina] = useState(1);
  useEffect(() => { setPagina(1); }, [verRecibidos]);

  // Paginación: cada página junta órdenes completas hasta ~CHUNK_SIZE filas
  const paginas = (() => {
    const source = verRecibidos ? gruposRecibidos : gruposPendientes;
    const out = [];
    let actual = [];
    let count = 0;
    for (const g of source) {
      actual.push(g);
      count += g[1].length;
      if (count >= CHUNK_SIZE) { out.push(actual); actual = []; count = 0; }
    }
    if (actual.length) out.push(actual);
    return out;
  })();
  const totalPaginas = paginas.length;
  const paginaSegura = Math.min(pagina, Math.max(totalPaginas, 1));
  const gruposVisibles = paginas[paginaSegura - 1] || [];


  const exportarExcel = () => {
    const source = verRecibidos ? gruposRecibidos : gruposPendientes;

    const data = [];

    source.forEach(([noOrden, items]) => {
      items.forEach(r => {
        data.push({
          "No Orden": r.No_Orden,
          "Código": r.Codigo,
          "Cantidad": r.Cantidad,
          "Pedimento": r.lote_serie || "",
          "Ubicaccion": r.ubicacion || "",
          "Fecha": r.created_at
            ? new Date(r.created_at).toLocaleString('es-MX', {
              timeZone: 'America/Mexico_City',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })
            : ""
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Traspasos");
    XLSX.writeFile(wb, "traspasos.xlsx");
  };

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

            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={() => setVerRecibidos(false)}
              >
                Ver pendientes
              </Button>

              <Button
                variant="outlined"
                color="success"
                onClick={() => setVerRecibidos(true)}
              >
                Ver recibidos
              </Button>

              <Button
                variant="contained"
                color="success"
                onClick={exportarExcel}
              >
                <BsFileEarmarkExcel style={{ verticalAlign: "-2px", marginRight: 8, fontSize: "1.15em" }} />Exportar Excel
              </Button>
            </Stack>

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
                    <TableCell>Pedimento</TableCell>
                    <TableCell>UM</TableCell>
                    <TableCell>_pz</TableCell>
                    <TableCell>Cantidad</TableCell>
                    <TableCell>Día de Envío</TableCell>
                    <TableCell>Almacén Envío</TableCell>
                    <TableCell>Llegada</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Ubicación Destino</TableCell>
                    <TableCell>Acciones</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {gruposVisibles.map(([noOrden, items]) => (

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
                            <TableCell>{r.lote_serie}</TableCell>
                            <TableCell>{r.um || '—'}</TableCell>
                            <TableCell>{r._pz != null ? r._pz : '—'}</TableCell>
                            <TableCell>{r.Cantidad}</TableCell>
                            <TableCell>{r.dia_envio ? new Date(r.dia_envio).toLocaleString() : '—'}</TableCell>
                            <TableCell>{r.almacen_envio || '—'}</TableCell>
                            <TableCell>{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</TableCell>
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

                                <IconButton
                                  title="Generar pallet (PDF)"
                                  aria-label="Generar pallet (PDF)"
                                  sx={{ color: '#e53935', '&:hover': { backgroundColor: '#fff5f4' } }}
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
                                  <BsFileEarmarkPdf style={{ fontSize: "1.5rem" }} />
                                </IconButton>
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

            {totalPaginas > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <Pagination
                  count={totalPaginas}
                  page={paginaSegura}
                  onChange={(_, p) => setPagina(p)}
                  showFirstButton
                  showLastButton
                  siblingCount={1}
                  boundaryCount={1}
                  sx={{
                    '& .MuiPaginationItem-root': {
                      width: 44, height: 44, minWidth: 44, borderRadius: '50%',
                      margin: '0 4px', border: 'none', backgroundColor: 'transparent',
                      color: '#5b6478', fontSize: '1rem', fontWeight: 400,
                      '&:hover': { backgroundColor: '#f3f4f8' },
                    },
                    '& .MuiPaginationItem-previousNext, & .MuiPaginationItem-firstLast': {
                      color: '#6b7280',
                    },
                    '& .MuiPaginationItem-root.Mui-selected': {
                      backgroundColor: '#eceffd', color: '#3b4cca', fontWeight: 500,
                      '&:hover': { backgroundColor: '#e2e7fb' },
                    },
                    '& .MuiPaginationItem-root.Mui-disabled': { opacity: 0.45 },
                  }}
                />
              </Box>
            )}

          </>
        )}
      </Box>


      {/* Modal Guardar Traspaso (dos columnas) */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
        <Box sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eceff3' }}>
          <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#1f2937' }}>Guardar traspaso</Typography>
          <Box onClick={handleCloseDialog} sx={{ cursor: 'pointer', color: '#6b7280', display: 'flex' }}><FaTimes /></Box>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
          {/* Columna izquierda: datos del producto */}
          <Box sx={{ width: { xs: '100%', md: 280 }, flexShrink: 0, p: 2.5, backgroundColor: '#f7f9fc', borderRight: { md: '1px solid #eceff3' }, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {registroActual.Codigo && (
              <Box sx={{ height: 150, backgroundColor: '#fff', borderRadius: 2, border: '1px solid #eceff3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <SmartImage code={registroActual.Codigo} size={130} />
              </Box>
            )}

            {[
              ['Código', registroActual.Codigo],
              ['Descripción', registroActual.Descripcion],
              ['Clave', registroActual.Clave],
              ['Pedimento', registroActual.lote_serie],
              ['Almacén envío', registroActual.almacen_envio],
              ['Día de envío', registroActual.dia_envio ? new Date(registroActual.dia_envio).toLocaleString() : ''],
              ['Llegada estimada', registroActual.tiempo_llegada_estimado ? new Date(registroActual.tiempo_llegada_estimado).toLocaleString() : ''],
            ].filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => (
              <Box key={k}>
                <Typography sx={{ fontSize: '0.7rem', color: '#9ca3af' }}>{k}</Typography>
                <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: '#1f2937', wordBreak: 'break-word' }}>{v}</Typography>
              </Box>
            ))}

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: '0.7rem', color: '#9ca3af' }}>UM</Typography>
                <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: '#1f2937' }}>{registroActual.um || '—'}</Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: '0.7rem', color: '#9ca3af' }}>_pz</Typography>
                <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: '#1f2937' }}>{registroActual._pz != null ? registroActual._pz : '—'}</Typography>
              </Box>
            </Box>

            <TextField
              label="Cantidad"
              size="small"
              fullWidth
              value={modificarCantidad ? cantidadModificada : registroActual.Cantidad || ''}
              InputProps={{ readOnly: !modificarCantidad }}
              onChange={(e) => setCantidadModificada(e.target.value.replace(/[^0-9]/g, ''))}
              sx={{ backgroundColor: '#fff' }}
            />
          </Box>

          {/* Columna derecha: cómo guardar */}
          <Box sx={{ flex: 1, p: 3 }}>
            {errorSave && (
              <Box sx={{ mb: 2 }}>
                <Alert severity="error">{errorSave}</Alert>
              </Box>
            )}

            <Typography sx={{ fontWeight: 600, color: '#1f2937', mb: 1.5 }}>¿Cómo deseas guardarlo?</Typography>

            {[
              ['SUMAR', 'Sumar en misma ubicación', 'Se suma a la ubicación existente'],
              ['NUEVA', 'Guardar en nueva ubicación', 'Captura una ubicación distinta'],
            ].map(([valor, titulo, sub]) => {
              const activo = modoUbicacion === valor;
              return (
                <Box
                  key={valor}
                  onClick={() => {
                    setModoUbicacion(valor);
                    if (valor === 'NUEVA') setUbicacionInput('');
                  }}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, mb: 1.5, borderRadius: 2.5, cursor: 'pointer',
                    border: activo ? '1.5px solid #2f6fed' : '1px solid #d1d5db',
                    backgroundColor: activo ? '#eef4ff' : '#fff',
                  }}
                >
                  {activo
                    ? <CheckCircleIcon sx={{ color: '#2f6fed' }} />
                    : <RadioButtonUncheckedIcon sx={{ color: '#9ca3af' }} />}
                  <Box>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: '#1f2937' }}>{titulo}</Typography>
                    <Typography sx={{ fontSize: '0.78rem', color: '#6b7280' }}>{sub}</Typography>
                  </Box>
                </Box>
              );
            })}

            <TextField
              label="Ubicación"
              fullWidth
              value={ubicacionInput}
              onChange={(e) => setUbicacionInput(e.target.value)}
              disabled={saving || modoUbicacion === 'SUMAR'}
              helperText={modoUbicacion === 'SUMAR' ? 'Se usará la ubicación existente' : 'Ingresa la nueva ubicación'}
              sx={{ mt: 1 }}
            />

            <TextField
              label="Orden de compra (OC)"
              fullWidth
              value={ocInput}
              onChange={(e) => setOcInput(e.target.value)}
              disabled={saving}
              placeholder="Ej. 3321"
              sx={{ mt: 2 }}
            />
          </Box>
        </Box>

        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #eceff3' }}>
          <Button onClick={handleCloseDialog} disabled={saving}>Cancelar</Button>
          <Button
            onClick={handleGuardarUbicacion}
            variant="contained"
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