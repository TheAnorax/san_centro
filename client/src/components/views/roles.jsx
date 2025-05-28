// --- FRONTEND (React: Modal para administrar roles) ---

import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, IconButton, List, ListItem,
  ListItemText, ListItemSecondaryAction
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SnackbarAlert from '../main/SnackbarAlert'; // ✅ reutilizable y centralizado

const ModalGestionRoles = ({ open, onClose }) => {
  const [roles, setRoles] = useState([]);
  const [nuevoRol, setNuevoRol] = useState('');
  const [editando, setEditando] = useState(null);
  const [alerta, setAlerta] = useState({ open: false, mensaje: '', tipo: 'success' });

  const mostrarAlerta = (mensaje, tipo = 'success') => {
    onClose(); // Primero cerramos el modal
    setTimeout(() => {
      setAlerta({ open: true, mensaje, tipo });
    }, 300);
  };

  const cerrarAlerta = () => {
    setAlerta({ ...alerta, open: false });
  };

  const obtenerRoles = async () => {
    const res = await fetch('http://192.168.3.23:3001/api/roles');
    const data = await res.json();
    setRoles(data);
  };

  const guardarRol = async () => {
    try {
      if (editando !== null) {
        await fetch(`http://192.168.3.23:3001/api/roles/${editando}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre: nuevoRol })
        });
        mostrarAlerta('Rol actualizado correctamente');
      } else {
        await fetch('http://192.168.3.23:3001/api/roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre: nuevoRol })
        });
        mostrarAlerta('Rol creado correctamente');
      }
      setNuevoRol('');
      setEditando(null);
      obtenerRoles();
    } catch (err) {
      mostrarAlerta('Error al guardar rol', 'error');
    }
  };

  const eliminarRol = async (id) => {
    try {
      await fetch(`http://192.168.3.23:3001/api/roles/${id}`, { method: 'DELETE' });
      mostrarAlerta('Rol eliminado correctamente');
      obtenerRoles();
    } catch (err) {
      mostrarAlerta('Error al eliminar rol', 'error');
    }
  };

  const editar = (rol) => {
    setNuevoRol(rol.nombre);
    setEditando(rol.id);
  };

  useEffect(() => {
    if (open) obtenerRoles();
  }, [open]);

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth>
        <DialogTitle>Administrar Roles</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth label="Nombre del Rol" value={nuevoRol}
            onChange={(e) => setNuevoRol(e.target.value)} margin="normal"
          />
          <List>
            {roles.map((rol) => (
              <ListItem key={rol.id}>
                <ListItemText primary={rol.nombre} />
                <ListItemSecondaryAction>
                  <IconButton onClick={() => editar(rol)}><EditIcon /></IconButton>
                  <IconButton onClick={() => eliminarRol(rol.id)} color="error"><DeleteIcon /></IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cerrar</Button>
          <Button onClick={guardarRol} variant="contained" color="primary">
            {editando ? 'Actualizar' : 'Agregar'}
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

export default ModalGestionRoles;
