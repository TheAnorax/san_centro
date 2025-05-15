// * ╔═════════════════════════════════════════════════════════════╗ * \\
// * ║                                                             ║ * \\
// * ║     ========== Componente: Barra de busqueda ==========     ║ * \\
// * ║                                                             ║ * \\
// * ╚═════════════════════════════════════════════════════════════╝ * \\

// ? ┌─────────────────────────────────────────────────────┐ ? \\
// ? │                                                     │ ? \\
// ? │             Importacion de Modulos y Css            │ ? \\
// ? │                                                     │ ? \\
// ? └─────────────────────────────────────────────────────┘ ? \\

// ? Importar React ? \\
import React from "react";

// ? Importar CSS ? \\
import "./SearchBar.css";

// ? ┌─────────────────────────────────────────────────────┐ ? \\
// ? │                                                     │ ? \\
// ? │              Estructura del componente              │ ? \\
// ? │                                                     │ ? \\
// ? └─────────────────────────────────────────────────────┘ ? \\

const SearchBar = ({
  value,
  onChange,
  onSearch,
  isSearchActive,
  placeholder = "Escribe para buscar...",
}) => {
  return (
    <div className="searchbar-container">
      <div className="searchbar-with-button">
        <input
          type="text"
          placeholder={placeholder}
          className="searchbar-input"
          value={value} // Mostrar el valor actual del filtro
          onChange={(e) => onChange(e.target.value)} // Actualizar el filtro de búsqueda
          onKeyDown={(e) => {
            if (e.key === "Enter") onSearch(); // Ejecutar búsqueda al presionar Enter
          }}
          disabled={isSearchActive} // Deshabilitar el input si la búsqueda está activa
        />
      </div>
    </div>
  );
};

export default SearchBar;
