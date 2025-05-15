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
import "./Button.css";

// ? ┌─────────────────────────────────────────────────────┐ ? \\
// ? │                                                     │ ? \\
// ? │              Estructura del componente              │ ? \\
// ? │                                                     │ ? \\
// ? └─────────────────────────────────────────────────────┘ ? \\

const Button = ({ onClick, label = "Botón" }) => {
  return (
    <div className="button-container">
      <button className="button" onClick={onClick}>
        {label}
      </button>
    </div>
  );
};

export default Button;