// * ╔═════════════════════════════════════════════════════════════╗ * \\
// * ║                                                             ║ * \\
// * ║     ============== Componente: Combo box ==============     ║ * \\
// * ║                                                             ║ * \\
// * ╚═════════════════════════════════════════════════════════════╝ * \\

// ? ┌─────────────────────────────────────────────────────┐ ? \\
// ? │                                                     │ ? \\
// ? │         Importacion de Modulos, Iconos y Css        │ ? \\
// ? │                                                     │ ? \\
// ? └─────────────────────────────────────────────────────┘ ? \\

// ? Importar React ? \\
import React, { useState, useRef, useEffect } from "react";

// ? Importar Iconos ? \\
import { FaChevronUp, FaChevronDown } from "react-icons/fa";

// ? Importar CSS ? \\
import "./Combobox.css";

const Combobox = ({ options, selectedOption, onOptionSelect }) => {
  // * ╔═══════════════════════════════════════════════════════════╗ * \\
  // * ║                 Propiedades del combo box                 ║ * \\
  // * ╚═══════════════════════════════════════════════════════════╝ * \\

  // ? ┌────────────────────────────────────────────────────────────┐ ? \\
  // ? │                 Propiedades del combo box                  │ ? \\
  // ? └────────────────────────────────────────────────────────────┘ ? \\

  // * Abrir o cerrar la lista del CB * \\
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // * Altura maxima del CB * \\
  const [maxHeight, setMaxHeight] = useState("auto"); // Altura máxima dinámica
  const dropdownRef = useRef(null); // Referencia al contenedor de opciones

  // * Despliegue de la lista de opciones * \\
  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);
  
  // * Desplegar la lista de opciones * \\
  useEffect(() => {
    if (isDropdownOpen) {
      // Calcular el espacio disponible en la ventana
      const dropdownRect = dropdownRef.current.getBoundingClientRect();
      const availableHeight = window.innerHeight - dropdownRect.top - 20; // Espacio disponible debajo del combobox
      const fullHeight = options.length * 40; // Altura total estimada de todas las opciones (40px por opción)
      setMaxHeight(Math.min(availableHeight, fullHeight) + "px"); // Ajustar la altura máxima
    }
  }, [isDropdownOpen, options]);

  // ? ┌─────────────────────────────────────────────────────┐ ? \\
  // ? │                                                     │ ? \\
  // ? │       Despliegue del Componente en el FrontEnd      │ ? \\
  // ? │                                                     │ ? \\
  // ? └─────────────────────────────────────────────────────┘ ? \\

  return (
    <div className="combo-box-container">
      {/* Botón para desplegar las opciones */}
      <button className="combo-box-button" onClick={toggleDropdown}>
        {isDropdownOpen ? <FaChevronUp /> : <FaChevronDown />}
      </button>

      {/* Opción seleccionada */}
      <div className="combo-box-display">{selectedOption}</div>

      {/* Opciones desplegables */}
      {isDropdownOpen && (
        <div
          className="combo-box-options"
          ref={dropdownRef}
          style={{ maxHeight, overflowY: "auto" }} // Aplicar altura dinámica y scroll solo si es necesario
        >
          {options.map((option) => (
            <div
              key={option}
              className="combo-box-option"
              onClick={() => {
                onOptionSelect(option);
                setIsDropdownOpen(false);
              }}
            >
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Combobox;
