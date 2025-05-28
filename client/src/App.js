// * ╔═════════════════════════════════════════════════════════════╗ * \\
// * ║                                                             ║ * \\
// * ║   ====== Archivo principal para cargar el programa ======   ║ * \\
// * ║                                                             ║ * \\
// * ╚═════════════════════════════════════════════════════════════╝ * \\

// ? Importar React ? \\
import React from "react";

// ? Importar Routers ? \\
import { Routes, Route, Navigate  } from "react-router-dom";

// ? Importar Ventanas principales ? \\
import Menu from "./components/main/menu"; // Ventana principal
import Login from "./components/views/AuthForm"


const App = () => {
  return (
    <Routes>
         <Route path="/" element={<Navigate to="/login" />} />
      {/* Define Menu como un contenedor para subrutas */}
      <Route path="/login/*" element={<Login />} />

      
      {/* ✅ Ruta para el menú principal */}
      <Route path="/menu/*" element={<Menu />} />
      <Route
        path="*"
        element={
          <div>
            <h2>Página no encontrada</h2>
            <p>La ruta especificada no existe.</p>
          </div>
        }
      />
    </Routes>
  );
};

export default App;
