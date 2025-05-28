// * ╔════════════════════════════════════════════════════════════╗ * \\
// * ║                                                            ║ * \\
// * ║  ==== Ventana principal para cargar las demás vistas ====  ║ * \\
// * ║                                                            ║ * \\
// * ╚════════════════════════════════════════════════════════════╝ * \\

// ? ┌─────────────────────────────────────────────────────┐ ? \\
// ? │                                                     │ ? \\
// ? │        Importación de Librerías, Iconos y Css       │ ? \\
// ? │                                                     │ ? \\
// ? └─────────────────────────────────────────────────────┘ ? \\

// ? Importar React ? \\
import React, { useState, useEffect } from "react";
import { useContext } from "react";
import { UserContext } from "../../context/UserContext";

// ? Importar Iconos ? \\
import { FaHome, FaChevronLeft, FaChevronRight } from "react-icons/fa";

// ? Importar Iconos 2 ? \\
// import { FaChartColumn } from "react-icons/fa6";

// ? Importar Rutas para comunicarse entre ventanas ? \\
import { Routes, Route, Link } from "react-router-dom";

// ? Importar CSS ? \\
import "../../css/main_css/main/menu.css";

// ? Importar imágenes ? \\
import icono_santul from "../../img/general/icono_santul.png";
import user_pic_default from "../../img/menu/user_pic_defautl.png";
import logo_sancedch_blanco from "../../img/general/logo_SanCed_CH.png";

// se importan los componentes a mostr en el menu y placeholder que es la base de todos 
// ? Importar otras interfaces ? \\
import PlaceHolder from "../views/place_holder";
import Usuarios from "../views/usuarios";
import Productos from "../views/productos";
import {
  Menu as MuiMenu,
  MenuItem,
  Typography,
  Divider,
  ListItemIcon,
  Box,
} from "@mui/material"; // al inicio del archivo
import PeopleIcon from "@mui/icons-material/People"; // Para Usuarios
import Inventory2Icon from "@mui/icons-material/Inventory2"; // Para Productos

import LogoutIcon from "@mui/icons-material/Logout";
import BadgeIcon from "@mui/icons-material/Badge";

// ? ┌──────────────────────────────────────────────────────┐ ? \\
// ? │                                                      │ ? \\
// ? │     Preparación del front end para el despliegue     │ ? \\
// ? │                                                      │ ? \\
// ? └──────────────────────────────────────────────────────┘ ? \\

// ? FUNCIÓN: Mostrar ventana de menú ? \\
const Menu = () => {
  const [isOpen, setIsOpen] = useState(true);

  // * ╔════════════════════════════════════════════════════════════╗ * \\
  // * ║                         Dashboard                          ║ * \\
  // * ╚════════════════════════════════════════════════════════════╝ * \\

  // ? ┌────────────────────────────────────────────────────────────┐ ? \\
  // ? │                 Barra de opciones lateral                  │ ? \\
  // ? └────────────────────────────────────────────────────────────┘ ? \\

  // const location = useLocation(); // Hook para obtener la ruta actual
  const { usuario } = useContext(UserContext);
  React.useEffect(() => {
    console.log("🧾 Datos del usuario desde el contexto:", usuario);
  }, [usuario]);

  const [permisos, setPermisos] = useState([]);
  // * === Verificar si la barra está abierta o no === * \\
  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  // Función para determinar el contenido de la barra de opciones
  // const renderOptionsContent = () => {
  //   switch (location.pathname) {
  //     case "/menu/place_holder":
  // return (
  //   <Fragment>
  //     <span className="fade-in">Opcion 1</span>
  //     <span className="fade-in">Opcion 2</span>
  //     <span className="fade-in">Opcion 3</span>
  //     <span className="fade-in">Opcion 4</span>
  //   </Fragment>
  // );
  //       break;
  //     default:
  //       break;
  //   }
  // };

  // ... dentro del componente Menu
  const [anchorEl, setAnchorEl] = useState(null);

  const handleProfileClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login"; // o navigate("/login")
  };

  useEffect(() => {
    if (usuario?.rol_id) {
      fetch(`http://192.168.3.23:3001/api/permisos/${usuario.rol_id}`)
        .then(res => res.json())
        .then(data => {
          console.log("🎯 Permisos recibidos del backend:", data);
          const activos = data.filter(p => p.permitido === 1).map(p => p.seccion);
          console.log("✅ Secciones permitidas:", activos);
          setPermisos(activos);
        });
    }
  }, [usuario]);


  const puedeVer = (seccion) => permisos.includes(seccion);

  // ? ┌─────────────────────────────────────────────────────┐ ? \\
  // ? │                                                     │ ? \\
  // ? │               Despliegue del FrontEnd               │ ? \\
  // ? │                                                     │ ? \\
  // ? └─────────────────────────────────────────────────────┘S ? \\

  return (
    <div className="menu-container">
      <header className="menu-header">
        <div className="header-title">
          <img src={logo_sancedch_blanco} className="header-logo" alt="Logo" />
        </div>
        <div className="user-profile">
          <div className="profile-circle" onClick={handleProfileClick}>
            <img src={user_pic_default} alt="Perfil" className="profile-pic" />
          </div>
        </div>
      </header>

      <MuiMenu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          elevation: 4,
          sx: {
            width: 220,
            borderRadius: 2,
            mt: 1,
            boxShadow: "0px 4px 12px rgba(0,0,0,0.1)",
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            👤 {usuario?.nombre || "Usuario"}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ display: "flex", alignItems: "center", mt: 0.5 }}
          >
            <BadgeIcon sx={{ fontSize: 16, mr: 0.5 }} />
            Rol: {usuario?.rol || "..."}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ display: "flex", alignItems: "center", mt: 0.5 }}
          >
            <BadgeIcon sx={{ fontSize: 16, mr: 0.5 }} />
            Correo: {usuario?.correo || "..."}
          </Typography>
        </Box>

        <Divider />

        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <Typography variant="body2">Cerrar sesión</Typography>
        </MenuItem>
      </MuiMenu>

      {/* Barra de opciones se agregan las nuevas opciones  aqui se delimeintan los usuarios  */}
      {/* <div className="options-bar">{renderOptionsContent()}</div> */}

      <div className="menu-body">
        <nav className={`menu-sidebar ${isOpen ? "open" : "closed"}`}>
          <button className="toggle-btn" onClick={toggleSidebar}>
            {isOpen ? <FaChevronLeft /> : <FaChevronRight />}
          </button>
          <ul>
            {/* Inicio (puede mostrarse siempre o también con permiso) */}
            <li className="menu-item">
              <Link to="/menu" className="menu-link">
                <FaHome className="menu-icon" /> {isOpen && <span>Inicio</span>}
              </Link>
            </li>

            {/* Secciones condicionadas por permisos */}
            {/* {puedeVer("place_holder") && (
              <li className="menu-item">
                <Link to="/menu/place_holder" className="menu-link">
                  <FaChartColumn className="menu-icon" />
                  {isOpen && <span>Place Holder</span>}
                </Link>
              </li>
            )} */}

            {puedeVer("usuarios") && (
              <li className="menu-item">
                <Link to="/menu/usuarios" className="menu-link">
                  <PeopleIcon className="menu-icon" />
                  {isOpen && <span>Usuarios</span>}
                </Link>
              </li>
            )}

            {puedeVer("productos") && (
              <li className="menu-item">
                <Link to="/menu/productos" className="menu-link">
                  <Inventory2Icon className="menu-icon" />
                  {isOpen && <span>Productos</span>}
                </Link>
              </li>
            )}
          </ul>
        </nav>

        <main className={`menu-content ${isOpen ? "menu-open" : "menu-closed"}`}>
          <Routes>
            <Route path="/" element={
              <div><img src={icono_santul} className="content-image" alt="Logo Santul" /></div>
            } />
            {puedeVer("place_holder") && <Route path="/place_holder" element={<PlaceHolder />} />}
            {puedeVer("usuarios") && <Route path="/usuarios" element={<Usuarios />} />}
            {puedeVer("productos") && <Route path="/productos" element={<Productos />} />}
          </Routes>
        </main>
      </div>

    </div>
  );
};

export default Menu;
