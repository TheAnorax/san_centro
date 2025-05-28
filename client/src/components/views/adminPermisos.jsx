// AdminPermisos.jsx
import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  FormGroup, FormControlLabel, Checkbox,
  Button, MenuItem, Select, InputLabel, FormControl
} from '@mui/material';
import SnackbarAlert from '../main/SnackbarAlert';

const SECCIONES = [
  { id: 'usuarios', label: 'Usuarios' },
  { id: 'productos', label: 'Productos' },
  { id: 'place_holder', label: 'Place Holder' },
  { id: 'reportes', label: 'Reportes' },
];

const AdminPermisos = ({ open, onClose, onGuardado }) => {
  const [roles, setRoles] = useState([]);
  const [rolSeleccionado, setRolSeleccionado] = useState('');
  const [permisos, setPermisos] = useState({});
  const [alerta, setAlerta] = useState({ open: false, mensaje: '', tipo: 'success' });

  const mostrarAlerta = (mensaje, tipo = 'success') => {
    setAlerta({ open: true, mensaje, tipo });
  };

  const cerrarAlerta = () => {
    setAlerta({ ...alerta, open: false });
  };

  const obtenerRoles = async () => {
    const res = await fetch('http://192.168.3.23:3001/api/roles');
    const data = await res.json();
    setRoles(data);
  };

  const obtenerPermisos = async (rol_id) => {
    const res = await fetch(`http://192.168.3.23:3001/api/permisos/${rol_id}`);
    const data = await res.json();
    const permisosActivos = {};
    SECCIONES.forEach(sec => {
      permisosActivos[sec.id] = data.some(p => p.seccion === sec.id && p.permitido);
    });
    setPermisos(permisosActivos);
  };

  const guardarPermisos = async () => {
    const permisosArray = SECCIONES.map(sec => ({
      seccion: sec.id,
      permitido: permisos[sec.id] || false
    }));
    await fetch('http://192.168.3.23:3001/api/permisos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rol_id: rolSeleccionado, permisos: permisosArray })
    });
    mostrarAlerta('Permisos actualizados');
    if (onGuardado) onGuardado(); // ⬅️ Aquí se cierra desde el padre
  };


  useEffect(() => {
    if (open) obtenerRoles();
  }, [open]);

  useEffect(() => {
    if (rolSeleccionado) obtenerPermisos(rolSeleccionado);
  }, [rolSeleccionado]);

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth>
        <DialogTitle>Administrar Permisos por Rol</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Rol</InputLabel>
            <Select value={rolSeleccionado} onChange={e => setRolSeleccionado(e.target.value)} label="Rol">
              {roles.map(rol => (
                <MenuItem key={rol.id} value={rol.id}>{rol.nombre}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormGroup>
            {SECCIONES.map(sec => (
              <FormControlLabel
                key={sec.id}
                control={
                  <Checkbox
                    checked={!!permisos[sec.id]}
                    onChange={(e) => setPermisos({ ...permisos, [sec.id]: e.target.checked })}
                  />
                }
                label={sec.label}
              />
            ))}
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cerrar</Button>
          <Button variant="contained" color="primary" onClick={guardarPermisos} disabled={!rolSeleccionado}>
            Guardar Permisos
          </Button>
        </DialogActions>
      </Dialog>

      <SnackbarAlert
        open={alerta.open}
        mensaje={alerta.mensaje}
        tipo={alerta.tipo}
        onClose={cerrarAlerta}
      />
    </>
  );
};

export default AdminPermisos;
