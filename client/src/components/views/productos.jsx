import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaTimes } from "react-icons/fa";
import {
  Box, Typography, Paper, CircularProgress, Button, Divider, TextField,
  Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  Tabs, Tab, Chip
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import JsBarcode from "jsbarcode";
import VisibilityIcon from "@mui/icons-material/Visibility";

const Productos = ({ isSwitching }) => {
  const navigate = useNavigate();
  const [animationClass, setAnimationClass] = useState(isSwitching ? "slide-left-out" : "fade-in");
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filteredProductos, setFilteredProductos] = useState([]);
  const [alerta, setAlerta] = useState({ open: false, mensaje: "", tipo: "success" });
  const [openDialog, setOpenDialog] = useState(false);
  const [editando, setEditando] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [productoActual, setProductoActual] = useState({
    codigo: "", um: "", clave: "", descripcion: "", barcode_pz: "",
    barcode_master: "", barcode_inner: "", barcode_palet: "",
    _pz: "", _pq: "", _inner: "", _master: "", _palet: "",
    img_pz: "", img_pq: "", img_inner: "", img_master: ""
  });
  const [productoId, setProductoId] = useState(null);

  // ✅ NUEVOS ESTADOS
  const [tabIndex, setTabIndex] = useState(0);
  const [negados, setNegados] = useState([]);
  const [loadingNegados, setLoadingNegados] = useState(false);
  const [filtroNegados, setFiltroNegados] = useState('');

  const userData = JSON.parse(localStorage.getItem("user"));
  const userRole = userData?.rol;

  useEffect(() => {
    setAnimationClass(isSwitching ? "slide-out-down" : "fade-in");
    obtenerProductos();
  }, [isSwitching]);

  const obtenerProductos = async () => {
    try {
      const res = await fetch("http://66.232.105.107:3001/api/productos");
      const data = await res.json();
      const productosConId = data.map((item, index) => ({ id: item.id || index, ...item }));
      setProductos(productosConId);
      setFilteredProductos(productosConId);
    } catch (error) {
      console.error("❌ Error al obtener productos:", error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Cargar códigos negados
  const cargarNegados = async () => {
    setLoadingNegados(true);
    try {
      const res = await fetch('http://66.232.105.107:3001/api/productos/negados');
      const data = await res.json();
      setNegados(data);
    } catch (error) {
      console.error('❌ Error al obtener negados:', error);
    } finally {
      setLoadingNegados(false);
    }
  };

  const handleSearchChange = (e) => {
    const term = e.target.value.toLowerCase();
    setSearch(term);
    const filtered = productos.filter((p) =>
      p.descripcion?.toLowerCase().includes(term) ||
      p.codigo?.toString().includes(term) ||
      p.um?.toLowerCase().includes(term)
    );
    setFilteredProductos(filtered);
  };

  const abrirDialog = (producto = null) => {
    if (producto) {
      setProductoActual(producto);
      setProductoId(producto.id);
      setEditando(true);
      setModoEdicion(false);
    } else {
      setProductoActual({
        codigo: "", um: "", clave: "", descripcion: "", barcode_pz: "",
        barcode_master: "", barcode_inner: "", barcode_palet: "",
        _pz: "", _pq: "", _inner: "", _master: "", _palet: "",
        img_pz: "", img_pq: "", img_inner: "", img_master: ""
      });
      setProductoId(null);
      setEditando(false);
    }
    setOpenDialog(true);
  };

  const cerrarDialog = () => setOpenDialog(false);

  const guardarProducto = async () => {
    try {
      const res = await fetch(`http://66.232.105.107:3001/api/productos${editando ? `/${productoId}` : ""}`,
        {
          method: editando ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(productoActual)
        });
      await res.json();
      setOpenDialog(false);
      mostrarAlerta(editando ? "Producto actualizado" : "Producto creado");
      obtenerProductos();
    } catch (error) {
      console.error("❌ Error al guardar:", error);
      mostrarAlerta("Error al guardar producto", "error");
    }
  };

  const eliminarProducto = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este producto?")) return;
    try {
      await fetch(`http://66.232.105.107:3001/api/productos/${id}`, { method: "DELETE" });
      mostrarAlerta("Producto eliminado");
      obtenerProductos();
    } catch (error) {
      console.error("❌ Error al eliminar:", error);
      mostrarAlerta("Error al eliminar producto", "error");
    }
  };

  const mostrarAlerta = (mensaje, tipo = "success") => {
    setAlerta({ open: true, mensaje, tipo });
  };

  const columnas = [
    { field: "codigo", headerName: "Código", width: 100 },
    {
      field: "imagen",
      headerName: "Imagen",
      width: 100,
      sortable: false,
      renderCell: (params) => (
        <img
          src={`http://66.232.105.83:9101/images/${params.row.codigo}.jpg`}
          alt={`Imagen de ${params.row.codigo}`}
          style={{ width: 40, height: 40, objectFit: "contain" }}
          onError={(e) => { e.target.style.display = "none"; }}
        />
      ),
    },
    { field: "descripcion", headerName: "Descripción", width: 250 },
    { field: "um", headerName: "UM", width: 80 },
    { field: "clave", headerName: "Clave", width: 150 },
    { field: "_pz", headerName: "Cantidad en Pieza", width: 100 },
    { field: "_inner", headerName: "Cantidad en INNER", width: 100 },
    { field: "_master", headerName: "Cantidad en MASTER", width: 100 },
    { field: "ubicacion", headerName: "Ubicación", width: 150 },
    { field: "cant_stock_real", headerName: "Inventario", width: 100 },
    {
      field: "acciones",
      headerName: "Acciones",
      width: 160,
      renderCell: (params) => (
        <>
          <Button size="small" color="primary" onClick={() => abrirDialog(params.row)}>
            <VisibilityIcon fontSize="small" />
          </Button>
          {userRole === "admin" && (
            <Button size="small" color="error" onClick={() => eliminarProducto(params.row.id)}>
              <DeleteIcon fontSize="small" />
            </Button>
          )}
        </>
      ),
    }
  ];

  // ✅ Columnas de negados
  const columnasNegados = [
    { field: "codigo_pedido", headerName: "Código", width: 100 },
    {
      field: "imagen",
      headerName: "Imagen",
      width: 80,
      sortable: false,
      renderCell: (params) => (
        <img
          src={`http://66.232.105.83:9101/images/${params.row.codigo_pedido}.jpg`}
          alt=""
          style={{ width: 40, height: 40, objectFit: "contain" }}
          onError={(e) => { e.target.style.display = "none"; }}
        />
      ),
    },
    { field: "descripcion", headerName: "Descripción", width: 260 },
    { field: "clave", headerName: "Clave", width: 120 },
    { field: "no_orden", headerName: "No Orden", width: 100 },
    { field: "tipo", headerName: "Tipo", width: 80 },
    {
      field: "total_no_enviada",
      headerName: "Cant. No Enviada",
      width: 140,
      renderCell: (params) => (
        <Typography color="error" fontWeight={700} variant="body2">
          {params.value}
        </Typography>
      )
    },
    {
      field: "motivo",
      headerName: "Motivo",
      width: 200,
      renderCell: (params) => (
        <Chip
          label={params.value || 'Sin motivo'}
          size="small"
          sx={{
            bgcolor: '#fce4ec',
            color: '#c62828',
            fontWeight: 700
          }}
        />
      )
    },
    {
      field: "registro_fin",
      headerName: "Fecha",
      width: 130,
      renderCell: (params) => (
        params.value
          ? new Date(params.value).toLocaleDateString('es-MX')
          : '—'
      )
    },
  ];

  const generarCodigosBarras = useCallback(() => {
    const campos = ["barcode_pz", "barcode_inner", "barcode_master", "barcode_palet"];
    campos.forEach((campo) => {
      const valor = productoActual[campo];
      if (valor && document.getElementById(`${campo}-barcode`)) {
        JsBarcode(`#${campo}-barcode`, valor, {
          format: "CODE128",
          displayValue: true,
          fontSize: 14,
          height: 40,
        });
      }
    });
  }, [productoActual]);

  useEffect(() => {
    if (openDialog) {
      setTimeout(() => {
        generarCodigosBarras();
      }, 100);
    }
  }, [openDialog, generarCodigosBarras]);

  // ✅ Filtrar negados
  const negadosFiltrados = negados
    .filter(n =>
      !filtroNegados ||
      String(n.codigo_pedido).includes(filtroNegados) ||
      n.descripcion?.toLowerCase().includes(filtroNegados.toLowerCase()) ||
      n.motivo?.toLowerCase().includes(filtroNegados.toLowerCase()) ||
      String(n.no_orden).includes(filtroNegados)
    )
    .map((n, i) => ({ id: i, ...n }));

  return (
    <div className={`place_holder-container ${animationClass}`}>
      <div className="place_holder-header">
        <span className="place_holder-title">Catálogo de Productos</span>
        <button className="place_holder-close" onClick={() => navigate("/menu")}>
          <FaTimes />
        </button>
      </div>

      <div className="place_holder-content">

        {/* ===== TABS — solo admin y master ven el tab de negados ===== */}
        {(userRole === 'admin' || userRole === 'master') && (
          <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#fff' }}>
            <Tabs value={tabIndex} onChange={(e, v) => {
              setTabIndex(v);
              if (v === 1) cargarNegados();
            }}>
              <Tab label="📦 Productos" />
              <Tab label="🚫 Códigos Negados" />
            </Tabs>
          </Box>
        )}

        {/* ===== TAB 1: PRODUCTOS ===== */}
        {tabIndex === 0 && (
          loading ? (
            <Box display="flex" justifyContent="center" mt={4}>
              <CircularProgress />
            </Box>
          ) : (
            <Paper elevation={4} sx={{ borderRadius: 3, p: 2 }}>
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="h6" fontWeight="bold">Lista de productos</Typography>
                {userRole === "admin" && (
                  <Button variant="contained" startIcon={<AddIcon />}
                    color="primary" onClick={() => abrirDialog()}>
                    Nuevo producto
                  </Button>
                )}
              </Box>
              <Divider sx={{ mb: 2 }} />
              <TextField label="Buscar" variant="outlined" size="small"
                value={search} onChange={handleSearchChange}
                sx={{ mb: 2, width: 300 }} />
              <Box sx={{ width: "auto", overflowX: "auto" }}>
                <DataGrid
                  rows={filteredProductos}
                  columns={columnas}
                  autoHeight
                  pageSize={1}
                  rowsPerPageOptions={[10, 20, 50]}
                  disableSelectionOnClick
                  sx={{
                    minWidth: 800,
                    borderRadius: 2,
                    "& .MuiDataGrid-columnHeaders": {
                      backgroundColor: "#f44336",
                      color: "#000",
                      fontWeight: "bold",
                    },
                    "& .MuiDataGrid-cell": { fontSize: "14px" },
                    "& .MuiDataGrid-row:hover": { backgroundColor: "#f5f5f5" },
                  }}
                />
              </Box>
            </Paper>
          )
        )}

        {/* ===== TAB 2: CÓDIGOS NEGADOS ===== */}
        {tabIndex === 1 && (userRole === 'admin' || userRole === 'master') && (
          <Paper elevation={4} sx={{ borderRadius: 3, p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight="bold">
                🚫 Códigos Negados
              </Typography>
              <Box display="flex" gap={2} alignItems="center">
                <TextField
                  label="Buscar código / descripción / motivo"
                  variant="outlined"
                  size="small"
                  value={filtroNegados}
                  onChange={e => setFiltroNegados(e.target.value)}
                  sx={{ width: 320 }}
                />
                <Button variant="outlined" size="small"
                  onClick={cargarNegados}
                  disabled={loadingNegados}>
                  🔄 Actualizar
                </Button>
              </Box>
            </Box>
            <Divider sx={{ mb: 2 }} />

            {loadingNegados ? (
              <Box display="flex" justifyContent="center" mt={4}>
                <CircularProgress />
              </Box>
            ) : (
              <Box sx={{ width: "auto", overflowX: "auto" }}>
                <DataGrid
                  rows={negadosFiltrados}
                  columns={columnasNegados}
                  autoHeight
                  pageSize={10}
                  rowsPerPageOptions={[10, 25, 50]}
                  disableSelectionOnClick
                  sx={{
                    minWidth: 800,
                    borderRadius: 2,
                    "& .MuiDataGrid-columnHeaders": {
                      backgroundColor: "#f44336",
                      color: "#000",
                      fontWeight: "bold",
                    },
                    "& .MuiDataGrid-cell": { fontSize: "14px" },
                    "& .MuiDataGrid-row:hover": { backgroundColor: "#fff3e0" },
                  }}
                />
              </Box>
            )}
          </Paper>
        )}
      </div>

      {/* ===== DIALOG igual que antes ===== */}
      <Dialog
        open={openDialog}
        onClose={cerrarDialog}
        fullWidth
        maxWidth={false}
        scroll="body"
        sx={{
          '& .MuiDialog-paper': {
            width: '90vw',
            maxHeight: '90vh',
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle>{editando ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>

        {productoActual.codigo && (
          <Box display="flex" justifyContent="center" mt={1}>
            <img
              src={`http://66.232.105.83:9101/images/${productoActual.codigo}.jpg`}
              alt={`Imagen de producto ${productoActual.codigo}`}
              style={{
                width: "150px", height: "150px", objectFit: "contain",
                borderRadius: "8px", border: "1px solid #ccc", backgroundColor: "#f9f9f9",
              }}
              onError={(e) => { e.target.style.display = "none"; }}
            />
          </Box>
        )}

        <DialogContent sx={{ overflow: 'unset', p: 2 }}>
          {!modoEdicion && (
            <Box display="flex" justifyContent="flex-end" mt={2}>
              {userRole === "admin" && (
                <Button variant="outlined" color="warning" onClick={() => setModoEdicion(true)}>
                  Habilitar edición
                </Button>
              )}
            </Box>
          )}

          <Divider sx={{ mt: 1, mb: 1 }}>General</Divider>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Descripción" fullWidth margin="dense"
              disabled={!modoEdicion} value={productoActual.descripcion || ""}
              onChange={(e) => setProductoActual({ ...productoActual, descripcion: e.target.value })} />

            <Box sx={{ display: 'flex', gap: 3 }}>
              <TextField label="Código" fullWidth margin="dense"
                disabled={!modoEdicion} value={productoActual.codigo || ""}
                onChange={(e) => setProductoActual({ ...productoActual, codigo: e.target.value })} />
              <TextField label="Clave" fullWidth margin="dense"
                disabled={!modoEdicion} value={productoActual.clave || ""}
                onChange={(e) => setProductoActual({ ...productoActual, clave: e.target.value })} />
              <TextField label="UM" fullWidth margin="dense"
                disabled={!modoEdicion} value={productoActual.um || ""}
                onChange={(e) => setProductoActual({ ...productoActual, um: e.target.value })} />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
            {/* PIEZA */}
            <Box sx={{ flex: 1, minWidth: '250px' }}>
              <Divider sx={{ mb: 1 }}>Pieza</Divider>
              {["barcode_pz", "_pz", "img_pz"].map((key) => (
                <React.Fragment key={key}>
                  <TextField label={key} fullWidth margin="dense"
                    disabled={!modoEdicion} value={productoActual[key] || ""}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setProductoActual((prev) => {
                        const updated = { ...prev, [key]: newValue };
                        if (key.includes("barcode") && newValue && newValue !== "NULL") {
                          setTimeout(() => {
                            if (document.getElementById(`${key}-barcode`)) {
                              JsBarcode(`#${key}-barcode`, newValue, { format: "CODE128", displayValue: true, fontSize: 14, height: 40 });
                            }
                          }, 50);
                        }
                        return updated;
                      });
                    }} />
                  {key.includes("barcode") && productoActual[key] && productoActual[key] !== "NULL" && (
                    <Box display="flex" justifyContent="center" mt={1}>
                      <svg id={`${key}-barcode`} style={{ height: 40, backgroundColor: "#fff" }} />
                    </Box>
                  )}
                </React.Fragment>
              ))}
            </Box>

            {/* INNER */}
            <Box sx={{ flex: 1, minWidth: '250px' }}>
              <Divider sx={{ mb: 1 }}>Inner</Divider>
              {["barcode_inner", "_inner", "img_inner"].map((key) => (
                <React.Fragment key={key}>
                  <TextField label={key} fullWidth margin="dense"
                    disabled={!modoEdicion} value={productoActual[key] || ""}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setProductoActual((prev) => {
                        const updated = { ...prev, [key]: newValue };
                        if (key.includes("barcode") && newValue && newValue !== "NULL") {
                          setTimeout(() => {
                            if (document.getElementById(`${key}-barcode`)) {
                              JsBarcode(`#${key}-barcode`, newValue, { format: "CODE128", displayValue: true, fontSize: 14, height: 40 });
                            }
                          }, 50);
                        }
                        return updated;
                      });
                    }} />
                  {key.includes("barcode") && productoActual[key] && productoActual[key] !== "NULL" && (
                    <Box display="flex" justifyContent="center" mt={1}>
                      <svg id={`${key}-barcode`} style={{ height: 40, backgroundColor: "#fff" }} />
                    </Box>
                  )}
                </React.Fragment>
              ))}
            </Box>

            {/* MASTER */}
            <Box sx={{ flex: 1, minWidth: '250px' }}>
              <Divider sx={{ mb: 1 }}>Master</Divider>
              {["barcode_master", "_master", "img_master"].map((key) => (
                <React.Fragment key={key}>
                  <TextField label={key} fullWidth margin="dense"
                    disabled={!modoEdicion} value={productoActual[key] || ""}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setProductoActual((prev) => {
                        const updated = { ...prev, [key]: newValue };
                        if (key.includes("barcode") && newValue && newValue !== "NULL") {
                          setTimeout(() => {
                            if (document.getElementById(`${key}-barcode`)) {
                              JsBarcode(`#${key}-barcode`, newValue, { format: "CODE128", displayValue: true, fontSize: 14, height: 40 });
                            }
                          }, 50);
                        }
                        return updated;
                      });
                    }} />
                  {key.includes("barcode") && productoActual[key] && productoActual[key] !== "NULL" && (
                    <Box display="flex" justifyContent="center" mt={1}>
                      <svg id={`${key}-barcode`} style={{ height: 40, backgroundColor: "#fff" }} />
                    </Box>
                  )}
                </React.Fragment>
              ))}
            </Box>

            {/* PALET */}
            <Box sx={{ flex: 1, minWidth: '250px' }}>
              <Divider sx={{ mb: 1 }}>Palet</Divider>
              {["barcode_palet", "_palet"].map((key) => (
                <React.Fragment key={key}>
                  <TextField label={key} fullWidth margin="dense"
                    disabled={!modoEdicion} value={productoActual[key] || ""}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setProductoActual((prev) => {
                        const updated = { ...prev, [key]: newValue };
                        if (key.includes("barcode") && newValue && newValue !== "NULL") {
                          setTimeout(() => {
                            if (document.getElementById(`${key}-barcode`)) {
                              JsBarcode(`#${key}-barcode`, newValue, { format: "CODE128", displayValue: true, fontSize: 14, height: 40 });
                            }
                          }, 50);
                        }
                        return updated;
                      });
                    }} />
                  {key.includes("barcode") && productoActual[key] && productoActual[key] !== "NULL" && (
                    <Box display="flex" justifyContent="center" mt={1}>
                      <svg id={`${key}-barcode`} style={{ height: 40, backgroundColor: "#fff" }} />
                    </Box>
                  )}
                </React.Fragment>
              ))}
            </Box>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={cerrarDialog}>Cerrar</Button>
          {modoEdicion && (
            <Button onClick={guardarProducto} variant="contained" color="primary">
              Guardar
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={alerta.open}
        autoHideDuration={4000}
        onClose={() => setAlerta({ ...alerta, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setAlerta({ ...alerta, open: false })}
          severity={alerta.tipo} sx={{ width: "100%" }}>
          {alerta.mensaje}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default Productos;