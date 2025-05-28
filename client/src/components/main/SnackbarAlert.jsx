// components/SnackbarAlert.jsx
import React from 'react';
import { Snackbar, Alert } from '@mui/material';

const SnackbarAlert = ({ open, mensaje, tipo = 'success', onClose, duration = 3000 }) => {
  return (
    <Snackbar
      open={open}
      autoHideDuration={duration}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert onClose={onClose} severity={tipo} variant="filled" sx={{ width: '100%' }}>
        {mensaje}
      </Alert>
    </Snackbar>
  );
};

export default SnackbarAlert;
