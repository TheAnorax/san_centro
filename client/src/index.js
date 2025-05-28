// * ╔════════════════════════════════════════════════════════════╗ * \\
// * ║                                                            ║ * \\
// * ║   ========= Archivo para iniciar la aplicacion =========   ║ * \\
// * ║                                                            ║ * \\
// * ╚════════════════════════════════════════════════════════════╝ * \\

// ? ┌─────────────────────────────────────────────────────┐ ? \\
// ? │                                                     │ ? \\
// ? │     Importacion de Librerias, Componentes y Css     │ ? \\
// ? │                                                     │ ? \\
// ? └─────────────────────────────────────────────────────┘ ? \\

// ? Importar React ? \\
import React from 'react';

// ? Importar el Cliente de React ? \\
import ReactDOM from 'react-dom/client';

// ? Importar Routers ? \\
import { BrowserRouter } from 'react-router-dom';

// ? Importar Provider ? \\
import { UserProvider } from './context/UserContext';

// ? Importar archivos ? \\
import App from './App'; // Archivo app (que va a abrir)

// ? FUNCION: Iniciar la app ? \\
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <UserProvider>
      <App />
    </UserProvider>
    </BrowserRouter>
  </React.StrictMode>
);
