// Productos.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaTimes } from "react-icons/fa";
import {
  Box, Typography, Paper, CircularProgress, Button, Divider, TextField,
  Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

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

  useEffect(() => {
    setAnimationClass(isSwitching ? "slide-out-down" : "fade-in");
    obtenerProductos();
  }, [isSwitching]);

  const obtenerProductos = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/productos");
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
      const res = await fetch(`http://localhost:3001/api/productos${editando ? `/${productoId}` : ""}`,
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
      await fetch(`http://localhost:3001/api/productos/${id}`, { method: "DELETE" });
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
    { field: "descripcion", headerName: "Descripción", width: 250 },
    { field: "um", headerName: "UM", width: 80 },
    { field: "clave", headerName: "Clave", width: 150 },
    { field: "_pz", headerName: "Cantida en Pieza", width: 100 },
    { field: "_inner", headerName: "Cantida en INNER", width: 100 },
    { field: "_master", headerName: "Cantida en MASTER", width: 100 },
    {
      field: "acciones",
      headerName: "Acciones",
      width: 160,
      renderCell: (params) => (
        <>
          <Button size="small" color="primary" onClick={() => abrirDialog(params.row)}><EditIcon fontSize="small" /></Button>
          <Button size="small" color="error" onClick={() => eliminarProducto(params.row.id)}><DeleteIcon fontSize="small" /></Button>
        </>
      )
    }
  ];

  return (
    <div className={`place_holder-container ${animationClass}`}>
      <div className="place_holder-header">
        <span className="place_holder-title">Catálogo de Productos</span>
        <button className="place_holder-close" onClick={() => navigate("/menu")}><FaTimes /></button>
      </div>

      <div className="place_holder-content">
        {loading ? (
          <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>
        ) : (
          <Paper elevation={4} sx={{ borderRadius: 3, p: 2 }}>
            <Box display="flex" justifyContent="space-between" mb={2}>
              <Typography variant="h6" fontWeight="bold">Lista de productos</Typography>
              <Button variant="contained" startIcon={<AddIcon />} color="primary" onClick={() => abrirDialog()}>Nuevo producto</Button>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <TextField label="Buscar" variant="outlined" size="small" value={search} onChange={handleSearchChange} sx={{ mb: 2, width: 300 }} />
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
                  "& .MuiDataGrid-cell": {
                    fontSize: "14px",
                  },
                  "& .MuiDataGrid-row:hover": {
                    backgroundColor: "#f5f5f5",
                  },
                }}
              />
            </Box>
          </Paper>
        )}
      </div>

      <Dialog
        open={openDialog}
        onClose={cerrarDialog}
        fullWidth
        maxWidth={false} // 🔴 para que puedas controlar el tamaño manualmente
        scroll="body"    // ✅ permite que el Dialog crezca con el contenido sin forzar scroll interno
        sx={{
          '& .MuiDialog-paper': {
            width: '90vw',     // ✅ hazlo más ancho (puedes poner '100vw' si quieres usar todo el ancho)
            maxHeight: '90vh', // ✅ para que crezca casi hasta el fondo sin recorte
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle>{editando ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
        <DialogContent
          sx={{
            overflow: 'unset', // 🔄 importante para evitar scroll interno
            p: 2,
          }}
        >
          {!modoEdicion && (
  <Box display="flex" justifyContent="flex-end" mt={2}>
    <Button variant="outlined" color="warning" onClick={() => setModoEdicion(true)}>
      Habilitar edición
    </Button>
  </Box>
)}


          <Divider sx={{ mt: 1, mb: 1 }}>General</Divider>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

            {/* DESCRIPCIÓN amplia arriba */}
            <TextField
              label="Descripción"
              fullWidth
              margin="dense"
              disabled={!modoEdicion}
              value={productoActual.descripcion || ""}
              onChange={(e) =>
                setProductoActual({ ...productoActual, descripcion: e.target.value })
              }
            />

            {/* Código y Clave en dos columnas */}
            <Box sx={{ display: 'flex', gap: 3}}>
              <TextField
                label="Código"
                fullWidth
                margin="dense"
                disabled={!modoEdicion}
                value={productoActual.codigo || ""}
                onChange={(e) =>
                  setProductoActual({ ...productoActual, codigo: e.target.value })
                }
              />
              <TextField
                label="Clave"
                fullWidth
                margin="dense"
                disabled={!modoEdicion}
                value={productoActual.clave || ""}
                onChange={(e) =>
                  setProductoActual({ ...productoActual, clave: e.target.value })
                }
              />
              <TextField
              label="UM"
              fullWidth
              margin="dense"
              disabled={!modoEdicion}
              value={productoActual.um || ""}
              onChange={(e) =>
                setProductoActual({ ...productoActual, um: e.target.value })
              }
            />
            </Box>


          </Box>


          {/* Contenedor principal horizontal */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>

            {/* PIEZA */}
            <Box sx={{ flex: 1, minWidth: '250px' }}>
              <Divider sx={{ mb: 1 }}>Pieza</Divider>
              {["barcode_pz", "_pz", "img_pz"].map((key) => (
                <TextField
                  key={key}
                  label={key}
                  fullWidth
                  margin="dense"
                  disabled={!modoEdicion}
                  value={productoActual[key] || ""}
                  onChange={(e) =>
                    setProductoActual({ ...productoActual, [key]: e.target.value })
                  }
                />
              ))}
            </Box>

            {/* INNER */}
            <Box sx={{ flex: 1, minWidth: '250px' }}>
              <Divider sx={{ mb: 1 }}>Inner</Divider>
              {["barcode_inner", "_inner", "img_inner"].map((key) => (
                <TextField
                  key={key}
                  label={key}
                  fullWidth
                  margin="dense"
                  disabled={!modoEdicion}
                  value={productoActual[key] || ""}
                  onChange={(e) =>
                    setProductoActual({ ...productoActual, [key]: e.target.value })
                  }
                />
              ))}
            </Box>

            {/* MASTER */}
            <Box sx={{ flex: 1, minWidth: '250px' }}>
              <Divider sx={{ mb: 1 }}>Master</Divider>
              {["barcode_master", "_master", "img_master"].map((key) => (
                <TextField
                  key={key}
                  label={key}
                  fullWidth
                  margin="dense"
                  disabled={!modoEdicion}
                  value={productoActual[key] || ""}
                  onChange={(e) =>
                    setProductoActual({ ...productoActual, [key]: e.target.value })
                  }
                />
              ))}
            </Box>

            {/* PALET */}
            <Box sx={{ flex: 1, minWidth: '250px' }}>
              <Divider sx={{ mb: 1 }}>Palet</Divider>
              {["barcode_palet", "_palet"].map((key) => (
                <TextField
                  key={key}
                  label={key}
                  fullWidth
                  margin="dense"
                  disabled={!modoEdicion}
                  value={productoActual[key] || ""}
                  onChange={(e) =>
                    setProductoActual({ ...productoActual, [key]: e.target.value })
                  }
                />
              ))}
            </Box>

          </Box>
        </DialogContent>
        <DialogActions>
  <Button onClick={cerrarDialog}>Cerrar</Button>
  {modoEdicion && (
    <Button
      onClick={guardarProducto}
      variant="contained"
      color="primary"
    >
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
        <Alert onClose={() => setAlerta({ ...alerta, open: false })} severity={alerta.tipo} sx={{ width: "100%" }}>
          {alerta.mensaje}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default Productos;
