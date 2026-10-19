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
import { FaHome } from "react-icons/fa";

// ? Importar Iconos 2 ? \\
// import { FaChartColumn } from "react-icons/fa6";

// ? Importar Rutas para comunicarse entre ventanas ? \\
import { Routes, Route, Link } from "react-router-dom";

// ? Importar CSS ? \\
import "../../css/main_css/main/menu.css";

// ? Importar imágenes ? \\
import icono_santul from "../../img/general/icono_santul.png";
import logo_sancedch from "../../img/logob2.png";
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import RouteIcon from '@mui/icons-material/Route';



// se importan los componentes a mostr en el menu y placeholder que es la base de todos
// ? Importar otras interfaces ? \\
import PlaceHolder from "../views/place_holder";
import Usuarios from "../views/usuarios";
import Productos from "../views/productos";
import Insumos from "../views/Insumos";
import Traspaso from "../views/Traspaso";
import Inventario from "../views/inventario"; // Asegúrate de la ruta
import Bahias from "../views/bahias";
import Pedidos from "../views/Pedidos";
import Surtido from "../views/Surtido";
import Avance from "../views/Avance";
import Activo from "../views/Activos";
import Plan from "../views/Plan";



import PeopleIcon from "@mui/icons-material/People"; // Para Usuarios
import Inventory2Icon from "@mui/icons-material/Inventory2"; // Para Productos
import InputIcon from '@mui/icons-material/Input';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import GridOnIcon from '@mui/icons-material/GridOn';
import BallotIcon from '@mui/icons-material/Ballot';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import BarChartIcon from '@mui/icons-material/BarChart';
import InventoryIcon from '@mui/icons-material/Inventory';
import CategoryIcon from '@mui/icons-material/Category';

// ? ┌──────────────────────────────────────────────────────┐ ? \\
// ? │                                                      │ ? \\
// ? │     Preparación del front end para el despliegue     │ ? \\
// ? │                                                      │ ? \\
// ? └──────────────────────────────────────────────────────┘ ? \\

// ? FUNCIÓN: Mostrar ventana de menú ? \\
const Menu = () => {
  // El menú lateral ahora es un panel que se abre encima (con el fondo en gris).
  // Se recuerda en el navegador: si lo dejas abierto, sigue abierto al cambiar
  // de pantalla (o al recargar) hasta que tú le des a cerrar (la X).
  const [isOpen, setIsOpen] = useState(() => {
    try { return localStorage.getItem("menuAbierto") === "1"; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem("menuAbierto", isOpen ? "1" : "0"); } catch { /* sin storage */ }
  }, [isOpen]);

  // * ╔════════════════════════════════════════════════════════════╗ * \\
  // * ║                         Dashboard                          ║ * \\
  // * ╚════════════════════════════════════════════════════════════╝ * \\

  // ? ┌────────────────────────────────────────────────────────────┐ ? \\
  // ? │                 Barra de opciones lateral                  │ ? \\
  // ? └────────────────────────────────────────────────────────────┘ ? \\

  // const location = useLocation(); // Hook para obtener la ruta actual
  const { usuario } = useContext(UserContext);
  React.useEffect(() => {
    // console.log("🧾 Datos del usuario desde el contexto:", usuario);
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
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login"; // o navigate("/login")
  };

  useEffect(() => {
    if (usuario?.rol_id) {
      fetch(`http://66.232.105.107:3001/api/permisos/${usuario.rol_id}`)
        .then(res => res.json())
        .then(data => {
          // console.log("🎯 Permisos recibidos del backend:", data);
          const activos = data.filter(p => p.permitido === 1).map(p => p.seccion);
          // console.log("✅ Secciones permitidas:", activos);
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
      {/* Con el panel lateral abierto el encabezado se oculta (el panel ya trae logo y usuario) */}
      <header className={`menu-header ${isOpen ? "menu-header-desplazado" : ""}`}>
        {/* Botón hamburguesa: abre/cierra el menú lateral */}
        <button className="menu-hamburger" onClick={toggleSidebar} aria-label="Abrir o cerrar menú">
          <MenuIcon />
        </button>
        <div className="header-title">
          <img src={logo_sancedch} className="header-logo" alt="SanCen Centro Histórico" />
        </div>
        {/* Solo informativo: sin clic ni menú (cerrar sesión está en el panel lateral) */}
        <div className="user-profile">
          <div className="profile-circle">
            <span className="profile-initial">
              {(usuario?.nombre || "U").trim().charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="user-info">
            <span className="user-name">{usuario?.nombre || "Usuario"}</span>
            <span className="user-role">{usuario?.rol || ""}</span>
          </div>
        </div>
      </header>

      {/* Barra de opciones se agregan las nuevas opciones  aqui se delimeintan los usuarios  */}
      {/* <div className="options-bar">{renderOptionsContent()}</div> */}

      <div className="menu-body">
        {/* Menú fijo: sin fondo gris, para poder usar la pantalla con el menú abierto */}

        <nav className={`menu-sidebar ${isOpen ? "open" : "closed"}`}>
          <div className="drawer-header">
            <img src={logo_sancedch} className="drawer-logo" alt="SanCen Centro Histórico" />
            <button className="drawer-close" onClick={() => setIsOpen(false)} aria-label="Cerrar menú">
              <CloseIcon />
            </button>
          </div>

          {/* Al elegir una opción el panel se cierra solo */}
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
                  <CategoryIcon className="menu-icon" />
                  {isOpen && <span>Productos</span>}
                </Link>
              </li>
            )}

            {puedeVer("insumos") && (
              <li className="menu-item">
                <Link to="/menu/insumos" className="menu-link">
                  <InputIcon className="menu-icon" />
                  {isOpen && <span>Insumos</span>}
                </Link>
              </li>
            )}

            {puedeVer("traspaso") && (
              <li className="menu-item">
                <Link to="/menu/traspaso" className="menu-link">
                  <FileDownloadIcon className="menu-icon" />
                  {isOpen && <span>Traspaso</span>}
                </Link>
              </li>
            )}

            {puedeVer("inventario") && (
              <li className="menu-item">
                <Link to="/menu/inventario" className="menu-link">
                  <InventoryIcon className="menu-icon" />
                  {isOpen && <span>Inventario</span>}
                </Link>
              </li>
            )}

            {puedeVer("bahias") && (
              <li className="menu-item">
                <Link to="/menu/bahias" className="menu-link">
                  <GridOnIcon className="menu-icon" />
                  {isOpen && <span>Bahias</span>}
                </Link>
              </li>
            )}

            {puedeVer("pedidos") && (
              <li className="menu-item">
                <Link to="/menu/pedidos" className="menu-link">
                  <BallotIcon className="menu-icon" />
                  {isOpen && <span>Pedidos Faltantes</span>}
                </Link>
              </li>
            )}

            {puedeVer("surtido") && (
              <li className="menu-item">
                <Link to="/menu/surtido" className="menu-link">
                  <AssignmentTurnedInIcon className="menu-icon" />
                  {isOpen && <span>Avance de Pedidos</span>}
                </Link>
              </li>
            )}

            {puedeVer("Avance") && (
              <li className="menu-item">
                <Link to="/menu/Avance" className="menu-link">
                  <BarChartIcon className="menu-icon" />
                  {isOpen && <span>Avance</span>}
                </Link>
              </li>
            )}

            {puedeVer("Activo") && (
              <li className="menu-item">
                <Link to="/menu/Activo" className="menu-link">
                  <WarehouseIcon className="menu-icon" />
                  {isOpen && <span>Activos</span>}
                </Link>
              </li>
            )}

            {puedeVer("Plan") && (
              <li className="menu-item">
                <Link to="/menu/Plan" className="menu-link">
                  <RouteIcon className="menu-icon" />  {/* ← cambiado */}
                  {isOpen && <span>Plan</span>}
                </Link>
              </li>
            )}

          </ul>

          {/* Usuario + cerrar sesión al fondo del panel */}
          <div className="drawer-footer">
            <div className="drawer-user">
              <div className="profile-circle">
                <span className="profile-initial">
                  {(usuario?.nombre || "U").trim().charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="user-info">
                <span className="user-name">{usuario?.nombre || "Usuario"}</span>
                <span className="user-role">{usuario?.rol || ""}</span>
              </div>
            </div>
            <button className="drawer-logout" onClick={handleLogout}>
              <PowerSettingsNewIcon /> CERRAR SESION
            </button>
          </div>
        </nav>

        <main className={`menu-content ${isOpen ? "menu-open" : "menu-closed"}`}>
          <Routes>
            <Route path="/" element={
              <div><img src={icono_santul} className="content-image" alt="Logo Santul" /></div>
            } />


            {puedeVer("place_holder") && <Route path="/place_holder" element={<PlaceHolder />} />}
            {puedeVer("usuarios") && <Route path="/usuarios" element={<Usuarios />} />}
            {puedeVer("productos") && <Route path="/productos" element={<Productos />} />}
            {puedeVer("insumos") && <Route path="/insumos" element={<Insumos />} />}
            {puedeVer("traspaso") && (<Route path="/traspaso" element={<Traspaso />} />)}
            {puedeVer("inventario") && (<Route path="/inventario" element={<Inventario />} />)}
            {puedeVer("bahias") && (<Route path="/bahias" element={<Bahias />} />)}
            {puedeVer("pedidos") && (<Route path="/pedidos" element={<Pedidos />} />)}
            {puedeVer("surtido") && (<Route path="/surtido" element={<Surtido />} />)}
            {puedeVer("Avance") && (<Route path="/Avance" element={<Avance />} />)}
            {puedeVer("Activo") && (<Route path="/Activo" element={<Activo />} />)}
            {puedeVer("Plan") && (<Route path="/Plan" element={<Plan />} />)}


          </Routes>
        </main>
      </div>

    </div>
  );
};

export default Menu;
