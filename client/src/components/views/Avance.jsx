import React, { useEffect, useState } from "react";
import { Typography, Grid, Paper } from "@mui/material";
import { FaTimes } from "react-icons/fa";

import GridViewOutlinedIcon from "@mui/icons-material/GridViewOutlined";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import TimerIcon from "@mui/icons-material/Timer";
import ContentPasteIcon from '@mui/icons-material/ContentPaste';

import "../../css/main_css/views/place_holder.css";

const Avance = ({ isSwitching }) => {

    const [kpiSurtido, setKpiSurtido] = useState([]);
    const [kpiEmbarques, setKpiEmbarques] = useState([]);

    const [fecha, setFecha] = useState(
        new Date().toISOString().substring(0, 10)
    );

    const [animationClass, setAnimationClass] = useState(
        isSwitching ? "slide-left-out" : "fade-in"
    );

    // 🔥 Cada vez que la fecha cambia, recarga los datos
    useEffect(() => {

        // SURTIDO
        fetch(`http://66.232.105.107:3001/api/kpi/productividad?fecha=${fecha}`)
            .then(res => res.json())
            .then(json => setKpiSurtido(Array.isArray(json) ? json : []))
            .catch(err => console.log("❌ Error KPI SURTIDO:", err));

        // EMBARQUES
        fetch(`http://66.232.105.107:3001/api/kpi/embarques?fecha=${fecha}`)
            .then(res => res.json())
            .then(json => setKpiEmbarques(Array.isArray(json.data) ? json.data : []))
            .catch(err => console.log("❌ Error KPI EMBARQUES:", err));


    }, [fecha]);



    const handleClose = () => {
        setAnimationClass("slide-out-down");
        setTimeout(() => window.location.href = "/menu", 300);
    };

    return (
        <div className={`place_holder-container ${animationClass}`}>

            {/* 🔴 BARRA ROJA */}
            <div className="place_holder-header">
                <span className="place_holder-title">Avance General</span>
                <button className="place_holder-close" onClick={handleClose}>
                    <FaTimes />
                </button>
            </div>

            <div className="place_holder-content">

                {/* 📅 CALENDARIO */}
                <div style={{ marginBottom: "20px", textAlign: "center" }}>
                    <label style={{ fontWeight: "bold", marginRight: "10px" }}>
                        Seleccionar fecha:
                    </label>
                    <input
                        type="date"
                        value={fecha}
                        onChange={(e) => setFecha(e.target.value)}
                        style={{
                            padding: "8px",
                            borderRadius: "6px",
                            border: "1px solid #888",
                            fontSize: "16px",
                        }}
                    />
                </div>

                {/* ============================
                   🟦 SURTIDO
                ============================ */}
                <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
                    Surtidores
                </Typography>

                <Grid
                    container
                    spacing={3}
                    sx={{
                        mb: 5,
                        maxWidth: "1200px",
                        justifyContent: "center",
                    }}
                >
                    {kpiSurtido.map((user, index) => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                            <Paper elevation={4} sx={{ p: 2, borderRadius: 3 }}>
                                <Typography
                                    variant="h6"
                                    fontWeight="bold"
                                    sx={{ mb: 2, textAlign: "center" }}
                                >
                                    {user.nombre}
                                </Typography>

                                <Grid container spacing={1}>
                                    <Grid item xs={12}>
                                        <Paper sx={{ p: 2, textAlign: "center", borderRadius: 2 }}>
                                            <ContentPasteIcon sx={{ fontSize: 28, color: "#00c853" }} />
                                            <Typography fontWeight="bold">Pedidos</Typography>
                                            <Typography sx={{ color: "#0d47a1", fontSize: 22 }}>
                                                {user.pedidos_del_dia}
                                            </Typography>
                                        </Paper>
                                    </Grid>

                                    <Grid item xs={12}>
                                        <Paper sx={{ p: 2, textAlign: "center", borderRadius: 2 }}>
                                            <GridViewOutlinedIcon sx={{ fontSize: 28, color: "#ff9800" }} />
                                            <Typography fontWeight="bold">Partidas</Typography>
                                            <Typography sx={{ color: "#0d47a1", fontSize: 22 }}>
                                                {user.total_partidas}
                                            </Typography>
                                        </Paper>
                                    </Grid>

                                    <Grid item xs={12}>
                                        <Paper sx={{ p: 2, textAlign: "center", borderRadius: 2 }}>
                                            <LocalShippingIcon sx={{ fontSize: 28, color: "#9c27b0" }} />
                                            <Typography fontWeight="bold">Piezas</Typography>
                                            <Typography sx={{ color: "#0d47a1", fontSize: 22 }}>
                                                {user.total_piezas}
                                            </Typography>
                                        </Paper>
                                    </Grid>

                                    <Grid item xs={12}>
                                        <Paper sx={{ p: 2, textAlign: "center", borderRadius: 2 }}>
                                            <TimerIcon sx={{ fontSize: 28, color: "#e53935" }} />
                                            <Typography fontWeight="bold">Tiempo</Typography>
                                            <Typography sx={{ color: "#0d47a1", fontSize: 22 }}>
                                                {user.tiempo_total}
                                            </Typography>
                                        </Paper>
                                    </Grid>
                                </Grid>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>

                {/* ============================
                   🟣 EMBARQUES
                ============================ */}
                <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
                    Embarques
                </Typography>

                <Grid
                    container
                    spacing={3}
                    sx={{
                        mb: 5,
                        maxWidth: "1200px",
                        justifyContent: "center",
                    }}
                >
                    {kpiEmbarques.map((user, index) => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                            <Paper elevation={4} sx={{ p: 2, borderRadius: 3 }}>
                                <Typography
                                    variant="h6"
                                    fontWeight="bold"
                                    sx={{ mb: 2, textAlign: "center" }}
                                >
                                    {user.nombre_usuario}
                                </Typography>

                                <Grid container spacing={1}>
                                    <Grid item xs={12}>
                                        <Paper sx={{ p: 2, textAlign: "center", borderRadius: 2 }}>
                                            <ContentPasteIcon sx={{ fontSize: 28, color: "#00c853" }} />
                                            <Typography fontWeight="bold">Pedidos</Typography>
                                            <Typography sx={{ color: "#0d47a1", fontSize: 22 }}>
                                                {user.pedidos_del_dia}
                                            </Typography>
                                        </Paper>
                                    </Grid>

                                    <Grid item xs={12}>
                                        <Paper sx={{ p: 2, textAlign: "center", borderRadius: 2 }}>
                                            <GridViewOutlinedIcon sx={{ fontSize: 28, color: "#ff9800" }} />
                                            <Typography fontWeight="bold">Partidas</Typography>
                                            <Typography sx={{ color: "#0d47a1", fontSize: 22 }}>
                                                {user.total_partidas}
                                            </Typography>
                                        </Paper>
                                    </Grid>

                                    <Grid item xs={12}>
                                        <Paper sx={{ p: 2, textAlign: "center", borderRadius: 2 }}>
                                            <LocalShippingIcon sx={{ fontSize: 28, color: "#9c27b0" }} />
                                            <Typography fontWeight="bold">Piezas</Typography>
                                            <Typography sx={{ color: "#0d47a1", fontSize: 22 }}>
                                                {user.total_piezas}
                                            </Typography>
                                        </Paper>
                                    </Grid>

                                    <Grid item xs={12}>
                                        <Paper sx={{ p: 2, textAlign: "center", borderRadius: 2 }}>
                                            <TimerIcon sx={{ fontSize: 28, color: "#e53935" }} />
                                            <Typography fontWeight="bold">Tiempo</Typography>
                                            <Typography sx={{ color: "#0d47a1", fontSize: 22 }}>
                                                {user.tiempo_total}
                                            </Typography>
                                        </Paper>
                                    </Grid>
                                </Grid>

                            </Paper>
                        </Grid>
                    ))}
                </Grid>

            </div>
        </div>
    );
};

export default Avance;
