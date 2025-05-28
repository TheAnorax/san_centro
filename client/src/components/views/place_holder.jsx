import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaTimes } from "react-icons/fa";
import "../../css/main_css/views/place_holder.css";

const PlaceHolder = ({ isSwitching }) => {
  const navigate = useNavigate();
  const [animationClass, setAnimationClass] = useState(
    isSwitching ? "slide-left-out" : "fade-in"
  );

  useEffect(() => {
    setAnimationClass(isSwitching ? "slide-out-down" : "fade-in");
  }, [isSwitching]);

  const handleClose = () => {
    // Animación de cierre
    setAnimationClass("slide-out-down");
    setTimeout(() => {
      navigate("/menu"); // Redirigir al menú después de la animación
    }, 500); // Duración de la animación
  };

  return (
    <div className={`place_holder-container ${animationClass}`}>
      {/* Barra superior */}
      <div className="place_holder-header">
        <span className="place_holder-title">Place holder</span>
        <button className="place_holder-close" onClick={handleClose}>
          <FaTimes />
        </button>
      </div>

      {/* Contenido principal */}
      <div className="place_holder-content">
        <p>Utilicen esta ventana como base para crear otras.</p>
      </div>
    </div>
  );
};

export default PlaceHolder;