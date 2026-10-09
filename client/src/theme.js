// Tema global de MUI: botones y tablas con el mismo diseño en toda la web.
// Cada tipo de botón tiene su propio color (azul, morado, verde, naranja, turquesa, rojo)
// para que la pantalla no se vea toda en rojo.
import { createTheme } from '@mui/material/styles';

// color principal, tono suave de fondo, tono de fondo al pasar el mouse
const COLORES = {
    primary:   { main: '#2f6fed', suave: '#eef4ff', hover: '#dce8ff' },   // azul
    secondary: { main: '#7c3aed', suave: '#f5f0ff', hover: '#eadfff' },   // morado
    success:   { main: '#16a34a', suave: '#effaf3', hover: '#d9f3e2' },   // verde
    warning:   { main: '#ea7a12', suave: '#fff6ec', hover: '#ffe9d1' },   // naranja
    info:      { main: '#0891b2', suave: '#ecfafd', hover: '#d4f2f9' },   // turquesa
    error:     { main: '#e53935', suave: '#fff5f4', hover: '#ffe5e3' },   // rojo (solo para acciones de peligro)
};

// Genera los estilos "contained" (fondo suave + borde) y "outlined" (fondo blanco + borde) por color.
const variantesBoton = Object.entries(COLORES).flatMap(([color, c]) => ([
    {
        props: { variant: 'contained', color },
        style: {
            backgroundColor: c.suave,
            color: c.main,
            border: `1px solid ${c.main}`,
            boxShadow: 'none',
            '&:hover': { backgroundColor: c.hover, boxShadow: 'none' },
            '&.Mui-disabled': { backgroundColor: '#f5f5f5', color: '#aaa', borderColor: '#e0e0e0' },
        },
    },
    {
        props: { variant: 'outlined', color },
        style: {
            color: c.main,
            borderColor: c.main,
            backgroundColor: '#fff',
            '&:hover': { backgroundColor: c.suave, borderColor: c.main },
        },
    },
]));

const theme = createTheme({
    palette: {
        primary:   { main: COLORES.primary.main },
        secondary: { main: COLORES.secondary.main },
        success:   { main: COLORES.success.main },
        warning:   { main: COLORES.warning.main },
        info:      { main: COLORES.info.main },
        error:     { main: COLORES.error.main },
    },
    components: {
        // ── Botones: borde del color, texto del color en negritas, esquinas redondeadas ──
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    fontWeight: 700,
                    borderRadius: 8,
                    boxShadow: 'none',
                },
            },
            variants: variantesBoton,
        },

        // ── Tablas: encabezado en negritas (sin mayúsculas), filas altas, rayado suave ──
        MuiTableCell: {
            styleOverrides: {
                root: {
                    borderBottom: '1px solid #eceff3',
                    fontSize: '0.95rem',
                    color: '#4b5563',
                    padding: '20px 16px',
                },
                sizeSmall: { padding: '18px 16px' },
                head: {
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    color: '#1f2937',
                    borderBottom: '1px solid #e0e4ea',
                },
            },
        },
        MuiTableBody: {
            styleOverrides: {
                root: {
                    // Rayado: se sobrepone un velo muy tenue para que no tape colores propios de cada fila.
                    '& > tr:nth-of-type(even)': {
                        backgroundImage: 'linear-gradient(rgba(15, 23, 42, 0.03), rgba(15, 23, 42, 0.03))',
                    },
                },
            },
        },
    },
});

export default theme;
