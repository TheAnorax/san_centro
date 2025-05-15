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
import React, { useState } from "react";

// ? Importar Iconos ? \\
import { FaHome, FaChevronLeft, FaChevronRight } from "react-icons/fa";

// ? Importar Iconos 2 ? \\
import { FaChartColumn } from "react-icons/fa6";

// ? Importar Rutas para comunicarse entre ventanas ? \\
import { Routes, Route, Link, useLocation } from "react-router-dom";

// ? Importar CSS ? \\
import "../../css/main_css/main/menu.css";

// ? Importar imágenes ? \\
import icono_santul from "../../img/general/icono_santul.png";
import user_pic_default from "../../img/menu/user_pic_defautl.png";
import logo_sancedch_blanco from "../../img/general/logo_SanCed_CH.png";

// ? Importar otras interfaces ? \\
import PlaceHolder from "../views/place_holder";

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

  const location = useLocation(); // Hook para obtener la ruta actual

  // * === Verificar si la barra está abierta o no === * \\
  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  // Función para determinar el contenido de la barra de opciones
  const renderOptionsContent = () => {
    switch (location.pathname) {
      case "/menu/place_holder":
        // return (
        //   <Fragment>
        //     <span className="fade-in">Opcion 1</span>
        //     <span className="fade-in">Opcion 2</span>
        //     <span className="fade-in">Opcion 3</span>
        //     <span className="fade-in">Opcion 4</span>
        //   </Fragment>
        // );
        break;
      default:
        break;
    }
  };

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
          <div className="profile-circle">
            <img src={user_pic_default} alt="Perfil" className="profile-pic" />
          </div>
        </div>
      </header>

      {/* Barra de opciones */}
      <div className="options-bar">{renderOptionsContent()}</div>

      <div className="menu-body">
        <nav className={`menu-sidebar ${isOpen ? "open" : "closed"}`}>
          <button className="toggle-btn" onClick={toggleSidebar}>
            {isOpen ? <FaChevronLeft /> : <FaChevronRight />}
          </button>
          <ul>
            <li className="menu-item">
              <Link to="/menu" className="menu-link">
                <FaHome className="menu-icon" /> {isOpen && <span>Inicio</span>}
              </Link>
            </li>
            <li className="menu-item">
              <Link to="/menu/place_holder" className="menu-link">
                <FaChartColumn className="menu-icon" />{" "}
                {isOpen && <span>Place Holder</span>}
              </Link>
            </li>
          </ul>
        </nav>

        <main
          className={`menu-content ${isOpen ? "menu-open" : "menu-closed"}`}
        >
          <Routes>
            <Route
              path="/"
              element={
                <div>
                  <img
                    src={icono_santul}
                    className="content-image"
                    alt="Logo Santul"
                  />
                </div>
              }
            />
            <Route path="/place_holder" element={<PlaceHolder />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default Menu;
