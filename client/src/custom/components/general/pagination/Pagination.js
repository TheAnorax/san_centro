// * ╔════════════════════════════════════════════════════════════╗ * \\
// * ║                                                            ║ * \\
// * ║     ======= Componente: Botones personalizados =======     ║ * \\
// * ║                                                            ║ * \\
// * ╚════════════════════════════════════════════════════════════╝ * \\

// ? ┌─────────────────────────────────────────────────────┐ ? \\
// ? │                                                     │ ? \\
// ? │             Importacion de Modulos y Css            │ ? \\
// ? │                                                     │ ? \\
// ? └─────────────────────────────────────────────────────┘ ? \\

// ? Importar React ? \\
import React from "react";

// ? Importar CSS ? \\
import "./Pagination.css";

// ? ┌─────────────────────────────────────────────────────┐ ? \\
// ? │                                                     │ ? \\
// ? │              Estructura del componente              │ ? \\
// ? │                                                     │ ? \\
// ? └─────────────────────────────────────────────────────┘ ? \\

const Pagination = ({ currentPage, totalPages, onPageChange, disabled }) => {
  return (
    <div className="pagination">
      <button onClick={() => onPageChange(1)} disabled={disabled || currentPage === 1}>
        Inicio
      </button>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={disabled || currentPage === 1}
      >
        Anterior
      </button>
      <span>
        {currentPage} de {totalPages}
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={disabled || currentPage === totalPages}
      >
        Siguiente
      </button>
      <button
        onClick={() => onPageChange(totalPages)}
        disabled={disabled || currentPage === totalPages}
      >
        Fin
      </button>
    </div>
  );
};

export default Pagination;