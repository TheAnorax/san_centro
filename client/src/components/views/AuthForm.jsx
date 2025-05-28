import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { UserContext } from '../../context/UserContext';
import logo_sancedch_blanco from "../../img/general/logo_SanCed_CH.png";
import {
    Box, Typography, TextField, Button, InputAdornment,
    IconButton, Alert, MenuItem, Paper
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import API from '../../api';

const AuthForm = () => {
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const { login } = useContext(UserContext);
    const [roles, setRoles] = useState([]);
    const [form, setForm] = useState({
        nombre: '',
        correo: '',
        password: '',
        rol: 'surtidor',
        turno: 1
    });

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleTogglePassword = () => setShowPassword((show) => !show);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isLogin) {
                const res = await API.post('/auth/login', {
                    correo: form.correo,
                    password: form.password
                });
                console.log('Respuesta completa del backend:', res);

                // Imprimir solo los datos específicos
                console.log('Datos recibidos:', res.data);
                const { token, usuario } = res.data;

                // Guardar token y usuario en contexto y localStorage
                localStorage.setItem('token', token);
                login(usuario);
                setTimeout(() => navigate('/menu'), 100); // micro delay
            } else {
                await API.post('/auth/register', form);
                alert('✅ Usuario registrado correctamente');
                setIsLogin(true);
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || 'Error al procesar la solicitud');
            setTimeout(() => setError(''), 3000);
        }
    };

    React.useEffect(() => {
        if (!isLogin) {
            API.get('/auth/roles')
                .then(res => setRoles(res.data))
                .catch(err => console.error('Error al cargar roles:', err));
        }
    }, [isLogin]);


    return (
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Encabezado estilo PlaceHolder */}
            <Box sx={{
                height: 70,
                backgroundColor: '#f44336',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                px: 3,
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}>
                <img
                    src={logo_sancedch_blanco} 
                    alt="Logo"
                    style={{ height: 40, marginRight: 15 }}
                />
                {/* <Typography variant="h6" fontWeight="bold">SanCed | Centro Histórico</Typography> */}
            </Box>

            {/* Contenido centrado */}
            <Box sx={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#f5f5f5',
                p: 2
            }}>
                <Paper elevation={4} sx={{ p: 4, width: '100%', maxWidth: 420, borderRadius: 5}}>
                    <Typography variant="h5" textAlign="center" gutterBottom>
                        {isLogin ? 'Iniciar sesión' : 'Registro de Usuario'}
                    </Typography>

                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    <form onSubmit={handleSubmit}>
                        {!isLogin && (
                            <>
                                <TextField
                                    fullWidth label="Nombre" name="nombre" margin="normal"
                                    value={form.nombre} onChange={handleChange} required
                                />
                                <TextField
                                    select
                                    fullWidth
                                    label="Rol"
                                    name="rol_id"
                                    margin="normal"
                                    value={form.rol_id || ''}
                                    onChange={handleChange}
                                    required
                                >
                                    {roles.map((rol) => (
                                        <MenuItem key={rol.id} value={rol.id}>
                                            {rol.nombre}
                                        </MenuItem>
                                    ))}
                                </TextField>

                                <TextField
                                    fullWidth label="Turno" name="turno" type="number"
                                    margin="normal" inputProps={{ min: 1, max: 3 }}
                                    value={form.turno} onChange={handleChange} required
                                />
                            </>
                        )}

                        <TextField
                            fullWidth required label="Correo" name="correo"
                            margin="normal" value={form.correo}
                            onChange={handleChange}
                        />

                        <TextField
                            fullWidth required label="Contraseña" name="password"
                            type={showPassword ? 'text' : 'password'} margin="normal"
                            value={form.password} onChange={handleChange}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={handleTogglePassword} edge="end">
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                        />

                        <Button
                            type="submit" fullWidth variant="contained"
                            sx={{ mt: 3, mb: 2, backgroundColor: '#f44336' }}
                        >
                            {isLogin ? 'Ingresar' : 'Registrar'}
                        </Button>

                        <Button
                            fullWidth onClick={() => setIsLogin(!isLogin)}
                            sx={{ textTransform: 'none', color: '#f44336' }}
                        >
                            {isLogin ? '¿No tienes cuenta? Registrar' : '¿Ya tienes cuenta? Iniciar sesión'}
                        </Button>
                    </form>
                </Paper>
            </Box>
        </Box>
    );
};

export default AuthForm;
