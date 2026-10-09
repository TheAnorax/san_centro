import React, { useEffect, useState, useMemo } from "react";
import { Typography, Box } from "@mui/material";
import { FaTimes } from "react-icons/fa";

import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";

import "../../css/main_css/views/place_holder.css";

const MEDALLAS = [
    { bg: "#fff1b8", fg: "#8a6d00" }, // 1°
    { bg: "#e8eaee", fg: "#555b66" }, // 2°
    { bg: "#fde0cc", fg: "#9a4a12" }, // 3°
];

const num = (v) => Number(v || 0);
const fmt = (v) => num(v).toLocaleString("es-MX");

// Tarjeta de resumen (número grande + etiqueta)
const Kpi = ({ label, valor }) => (
    <Box sx={{ flex: "1 1 140px", background: "#f3f5f9", borderRadius: 2.5, px: 2, py: 1.4 }}>
        <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#8b93a7" }}>
            {label}
        </Typography>
        <Typography sx={{ fontSize: "1.6rem", fontWeight: 800, color: "#111827", lineHeight: 1.2 }}>
            {valor}
        </Typography>
    </Box>
);

// Ranking Top 3 general con barras comparativas (mezcla surtido y embarques)
const Ranking = ({ titulo, items, campo, color }) => {
    const top = [...items].sort((a, b) => num(b[campo]) - num(a[campo])).slice(0, 3);
    const max = Math.max(1, ...top.map((i) => num(i[campo])));

    return (
        <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#8b93a7", mb: 1.2 }}>
                {titulo}
            </Typography>
            {top.length === 0 && (
                <Typography sx={{ fontSize: "0.85rem", color: "#b6bcc9" }}>Sin datos en esta fecha.</Typography>
            )}
            {top.map((item, idx) => (
                <Box key={`${item.area}-${item.nombre}-${idx}`} sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.2 }}>
                    <Box sx={{
                        width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "0.8rem", fontWeight: 700,
                        background: MEDALLAS[idx].bg, color: MEDALLAS[idx].fg,
                    }}>
                        {idx + 1}
                    </Box>
                    <Box sx={{ width: { xs: 130, sm: 210 }, minWidth: 0 }}>
                        <Typography sx={{ fontSize: "0.9rem", color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.nombre}>
                            {item.nombre}
                        </Typography>
                        <Typography sx={{ fontSize: "0.68rem", color: item.area === "Surtido" ? "#1d4ed8" : "#a16207", fontWeight: 600 }}>
                            {item.area}
                        </Typography>
                    </Box>
                    <Box sx={{ flex: 1, height: 9, borderRadius: 99, background: "#eceff3", overflow: "hidden" }}>
                        <Box sx={{ width: `${(num(item[campo]) / max) * 100}%`, height: "100%", borderRadius: 99, background: color, transition: "width .4s ease" }} />
                    </Box>
                    <Typography sx={{ minWidth: 48, textAlign: "right", fontWeight: 700, color: "#111827" }}>
                        {fmt(item[campo])}
                    </Typography>
                </Box>
            ))}
        </Box>
    );
};

// Detalle por área (Surtidores / Embarques): una fila por persona
const Area = ({ titulo, icono, fondoIcono, colorIcono, items }) => (
    <Box sx={{ background: "#fff", border: "1px solid #e6e9ef", borderRadius: "16px", boxShadow: "0 2px 10px rgba(16,24,40,0.05)", overflow: "hidden", mb: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, px: 2.5, py: 1.6, borderBottom: "1px solid #eceff3" }}>
            <Box sx={{ width: 34, height: 34, borderRadius: 2.5, background: fondoIcono, color: colorIcono, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {icono}
            </Box>
            <Typography sx={{ fontSize: "1.1rem", fontWeight: 800, color: "#111827" }}>{titulo}</Typography>
            <Box component="span" sx={{ px: 1.4, py: 0.3, borderRadius: 99, fontSize: "0.75rem", fontWeight: 600, background: "#f1f3f7", color: "#4b5563" }}>
                {items.length} {items.length === 1 ? "activo" : "activos"}
            </Box>
        </Box>

        <Box sx={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                <thead>
                    <tr style={{ background: "#f7f9fc" }}>
                        {[["Nombre", "left"], ["Pedidos", "center"], ["Partidas", "center"], ["Piezas", "center"], ["Tiempo", "right"]].map(([h, al]) => (
                            <th key={h} style={{ padding: "10px 20px", textAlign: al, fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#8b93a7" }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {items.length === 0 && (
                        <tr><td colSpan={5} style={{ padding: 20, textAlign: "center", color: "#b6bcc9" }}>Sin datos en esta fecha.</td></tr>
                    )}
                    {items.map((u, i) => (
                        <tr key={`${u.nombre}-${i}`} style={{ borderTop: "1px solid #f0f2f6" }}>
                            <td style={{ padding: "10px 20px", fontWeight: 600, color: "#111827" }}>{u.nombre}</td>
                            <td style={{ padding: "10px 20px", textAlign: "center" }}>{fmt(u.pedidos_del_dia)}</td>
                            <td style={{ padding: "10px 20px", textAlign: "center" }}>{fmt(u.total_partidas)}</td>
                            <td style={{ padding: "10px 20px", textAlign: "center", fontWeight: 700 }}>{fmt(u.total_piezas)}</td>
                            <td style={{ padding: "10px 20px", textAlign: "right", color: "#4b5563", fontVariantNumeric: "tabular-nums" }}>{u.tiempo_total}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </Box>
    </Box>
);

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

    // Se normalizan los nombres para que ambos rankings usen el mismo campo
    const surtidores = useMemo(
        () => kpiSurtido.map(u => ({ ...u, nombre: u.nombre, area: "Surtido" })),
        [kpiSurtido]
    );
    const embarques = useMemo(
        () => kpiEmbarques.map(u => ({ ...u, nombre: u.nombre_usuario || u.nombre, area: "Embarque" })),
        [kpiEmbarques]
    );
    // Ranking general: surtido + embarques juntos
    const general = useMemo(() => [...surtidores, ...embarques], [surtidores, embarques]);

    const suma = (lista, campo) => lista.reduce((s, x) => s + num(x[campo]), 0);

    return (
        <div className={`place_holder-container ${animationClass}`}>

            <div className="place_holder-header">
                <span className="place_holder-title">Avance General</span>
                <button className="place_holder-close" onClick={handleClose}>
                    <FaTimes />
                </button>
            </div>

            <div className="place_holder-content" style={{ overflowY: "auto" }}>

                {/* Fecha */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2.5, flexWrap: "wrap" }}>
                    <Typography sx={{ fontSize: "1.3rem", fontWeight: 800, color: "#111827" }}>Resumen del día</Typography>
                    <Box sx={{ flex: 1 }} />
                    <Box sx={{
                        display: "inline-flex", alignItems: "center", gap: 1, px: 2, height: 40,
                        border: "1px solid #d9dde6", borderRadius: 99, background: "#fff",
                        boxShadow: "0 1px 3px rgba(16,24,40,0.06)",
                    }}>
                        <CalendarMonthOutlinedIcon fontSize="small" sx={{ color: "#9aa3b2" }} />
                        <input
                            type="date"
                            value={fecha}
                            onChange={(e) => setFecha(e.target.value)}
                            style={{ border: "none", outline: "none", fontSize: 14, background: "transparent", color: "#374151" }}
                        />
                    </Box>
                </Box>

                {/* Resumen general */}
                <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 2.5 }}>
                    <Kpi label="Pedidos surtidos" valor={fmt(suma(surtidores, "pedidos_del_dia"))} />
                    <Kpi label="Partidas surtidas" valor={fmt(suma(surtidores, "total_partidas"))} />
                    <Kpi label="Piezas surtidas" valor={fmt(suma(surtidores, "total_piezas"))} />
                    <Kpi label="Pedidos embarcados" valor={fmt(suma(embarques, "pedidos_del_dia"))} />
                    <Kpi label="Piezas embarcadas" valor={fmt(suma(embarques, "total_piezas"))} />
                </Box>

                {/* Top general (surtido + embarques juntos) */}
                <Box sx={{ background: "#fff", border: "1px solid #e6e9ef", borderRadius: "16px", boxShadow: "0 2px 10px rgba(16,24,40,0.05)", p: 2.5, mb: 2.5 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, mb: 2 }}>
                        <Box sx={{ width: 36, height: 36, borderRadius: 2.5, background: "#fff1b8", color: "#8a6d00", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <EmojiEventsOutlinedIcon fontSize="small" />
                        </Box>
                        <Typography sx={{ fontSize: "1.15rem", fontWeight: 800, color: "#111827" }}>Top general del día</Typography>
                    </Box>
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: { xs: 3, md: 5 } }}>
                        <Ranking titulo="Top por piezas" items={general} campo="total_piezas" color="#1D9E75" />
                        <Ranking titulo="Top por pedidos" items={general} campo="pedidos_del_dia" color="#378ADD" />
                    </Box>
                </Box>

                <Area
                    titulo="Surtidores"
                    icono={<ShoppingCartOutlinedIcon fontSize="small" />}
                    fondoIcono="#e7f0ff" colorIcono="#1d4ed8"
                    items={surtidores}
                />

                <Area
                    titulo="Embarques"
                    icono={<LocalShippingOutlinedIcon fontSize="small" />}
                    fondoIcono="#fff6e0" colorIcono="#a16207"
                    items={embarques}
                />

            </div>
        </div>
    );
};

export default Avance;
