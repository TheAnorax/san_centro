import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { UserContext } from '../../context/UserContext';
import logo_sancedch_blanco from "../../img/logob2.png";
import foto_almacen from "../../img/general/login_almacen.jpg";
import {
    Box, Typography, TextField, Button, Alert, MenuItem,
    Checkbox, FormControlLabel
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import API from '../../api';

const ROJO = '#e84c43';
const ROJO_TITULO = '#c62f2f';

// Patrón de red (nodos + líneas rosas) que se repite de fondo en el lado derecho.
const PATRON_RED = `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='260' height='240' viewBox='0 0 260 240'>
        <g stroke='#f7bdb7' stroke-width='1.6' fill='none' stroke-linecap='round'>
            <path d='M20 10 L50 70 L110 90 L150 40 L130 10'/>
            <path d='M150 40 L210 30 L240 80 L200 130'/>
            <path d='M110 90 L90 150 L40 200 L20 240'/>
            <path d='M90 150 L170 170 L200 130'/>
            <path d='M170 170 L210 230'/>
            <path d='M240 80 L260 60'/>
        </g>
        <g fill='#f5a9a2'>
            <circle cx='50' cy='70' r='5'/><circle cx='110' cy='90' r='4'/>
            <circle cx='150' cy='40' r='5'/><circle cx='210' cy='30' r='4'/>
            <circle cx='200' cy='130' r='5'/><circle cx='90' cy='150' r='4'/>
            <circle cx='170' cy='170' r='4'/><circle cx='40' cy='200' r='5'/>
            <circle cx='240' cy='80' r='4'/>
        </g>
        <g fill='#f9cfca'>
            <circle cx='20' cy='10' r='7'/><circle cx='130' cy='10' r='6'/>
            <circle cx='20' cy='240' r='7'/><circle cx='210' cy='230' r='6'/>
        </g>
    </svg>`
)}")`;

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

    const campoSx = {
        '& .MuiOutlinedInput-root': { borderRadius: 1, backgroundColor: '#fff' },
        '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: ROJO },
        '& .MuiInputLabel-root.Mui-focused': { color: ROJO },
        // El autocompletado del navegador pintaba los campos de azul.
        '& input:-webkit-autofill': {
            WebkitBoxShadow: '0 0 0 100px #fff inset',
            WebkitTextFillColor: '#222',
        },
    };

    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', backgroundColor: '#fff' }}>
            {/* Foto del almacén (se oculta en pantallas chicas) */}
            <Box sx={{
                display: { xs: 'none', md: 'block' },
                width: '50%',
                backgroundImage: `url(${foto_almacen})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
            }} />

            {/* Lado derecho: patrón de red + tarjeta */}
            <Box sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#fff',
                backgroundImage: PATRON_RED,
                backgroundRepeat: 'repeat',
                p: 2
            }}>
                {/* Logo SanCen (letras blancas → va sobre fondo oscuro) */}
                <Box sx={{
                    borderRadius: 3,
                    px: 3.5,
                    py: 1,
                    mb: 3,
                }}>
                    <img
                        src={logo_sancedch_blanco}
                        alt="SanCen Centro Histórico"
                        style={{ height: 90, display: 'block' }}
                    />
                </Box>

                <Box sx={{
                    width: '100%',
                    maxWidth: 400,
                    backgroundColor: '#fff',
                    borderRadius: 3,
                    boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                    px: 5,
                    py: 5,
                    boxSizing: 'border-box'
                }}>
                    <Box sx={{ textAlign: 'center', mb: 4 }}>
                        <LockOutlinedIcon sx={{ color: ROJO_TITULO, fontSize: 30 }} />
                        <Typography sx={{
                            color: ROJO_TITULO, fontWeight: 800, fontSize: '1.7rem',
                            letterSpacing: 1, mt: 1
                        }}>
                            {isLogin ? 'BIENVENIDO' : 'REGISTRO'}
                        </Typography>
                    </Box>

                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    <form onSubmit={handleSubmit}>
                        {!isLogin && (
                            <>
                                <TextField
                                    fullWidth label="Nombre" name="nombre" margin="dense"
                                    value={form.nombre} onChange={handleChange} required sx={campoSx}
                                />
                                <TextField
                                    select
                                    fullWidth
                                    label="Rol"
                                    name="rol_id"
                                    margin="dense"
                                    value={form.rol_id || ''}
                                    onChange={handleChange}
                                    required
                                    sx={campoSx}
                                >
                                    {roles.map((rol) => (
                                        <MenuItem key={rol.id} value={rol.id}>
                                            {rol.nombre}
                                        </MenuItem>
                                    ))}
                                </TextField>
                                <TextField
                                    fullWidth label="Turno" name="turno" type="number"
                                    margin="dense" inputProps={{ min: 1, max: 3 }}
                                    value={form.turno} onChange={handleChange} required sx={campoSx}
                                />
                            </>
                        )}

                        <TextField
                            fullWidth required label="Correo" name="correo"
                            margin="dense" value={form.correo}
                            onChange={handleChange} sx={campoSx}
                        />

                        <TextField
                            fullWidth required label="Contraseña" name="password"
                            type={showPassword ? 'text' : 'password'} margin="dense"
                            value={form.password} onChange={handleChange} sx={campoSx}
                        />

                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={showPassword}
                                    onChange={handleTogglePassword}
                                    size="small"
                                    sx={{ color: '#555', '&.Mui-checked': { color: ROJO } }}
                                />
                            }
                            label="Mostrar Contraseña"
                            sx={{ mt: 0.5, mb: 1 }}
                        />

                        <Button
                            type="submit" fullWidth variant="contained"
                            disableRipple disableFocusRipple
                            sx={{
                                outline: 'none',
                                border: 'none',
                                WebkitTapHighlightColor: 'transparent',
                                '&:focus, &:focus-visible, &:active': {
                                    outline: 'none',
                                    backgroundColor: ROJO,
                                    color: '#fff',
                                },
                                backgroundColor: ROJO, color: '#fff !important', borderRadius: 8, py: 1.5,
                                fontWeight: 700, fontSize: '0.95rem', letterSpacing: 0.5,
                                boxShadow: '0 4px 10px rgba(232,76,67,0.4)',
                                '&:hover': { backgroundColor: '#d63f37', color: '#fff' }
                            }}
                        >
                            {isLogin ? 'Iniciar sesión' : 'Registrar'}
                        </Button>

                        {/* <Button
                            fullWidth onClick={() => setIsLogin(!isLogin)}
                            sx={{ textTransform: 'none', color: '#f44336' }}
                        >
                            {isLogin ? '¿No tienes cuenta? Registrar' : '¿Ya tienes cuenta? Iniciar sesión'}
                        </Button> */}
                    </form>
                </Box>
            </Box>
        </Box>
    );
};

export default AuthForm;
