import React, { useEffect, useState } from 'react';
import { Card, CardContent, Typography, Box, Button, Table, TableBody, TableCell, TableHead, TableRow, LinearProgress, Grid, Paper, Tabs, Tab } from '@mui/material';
import { FaTimes } from "react-icons/fa";
import axios from 'axios';

function calcularProgreso(productos) {
    const total = productos.reduce((sum, prod) => sum + Number(prod.cantidad || 0), 0);
    const surtido = productos.reduce((sum, prod) => sum + Number(prod.cant_surtida || 0), 0);
    const noEnviada = productos.reduce((sum, prod) => sum + Number(prod.cant_no_enviada || 0), 0);
    // Progreso = (surtido + noEnviada) / total
    return total > 0 ? Math.round(((surtido + noEnviada) / total) * 100) : 0;
}


function Surtiendo() {

    const [tabActual, setTabActual] = useState(0);

    const handleChange = (event, newValue) => {
        setTabActual(newValue);
    };

    const [pedidos, setPedidos] = useState([]);
    const [expanded, setExpanded] = useState({});
    const [usuariosResumen, setUsuariosResumen] = useState([]);

    useEffect(() => {
        cargarPedidosSurtiendo();
    }, []);

    const cargarPedidosSurtiendo = async () => {
        try {
            const res = await axios.get('http://localhost:3001/api/surtido/pedidos/pedidos-surtiendo');
            // Agrupar por no_orden + tipo
            const pedidosAgrupados = {};
            // Para el resumen
            const resumenUsuarios = {};
            // Para evitar duplicados de pedidos por usuario
            const pedidosPorUsuario = {};

            res.data.forEach(item => {
                const key = `${item.no_orden}_${item.tipo}`;
                // Agrupar pedidos
                if (!pedidosAgrupados[key]) {
                    pedidosAgrupados[key] = {
                        no_orden: item.no_orden,
                        tipo: item.tipo,
                        bahia: item.ubi_bahia,
                        nombre_usuario: item.nombre_usuario,
                        productos: []
                    };
                }
                pedidosAgrupados[key].productos.push(item);

                // --- RESUMEN USUARIOS ---
                // Inicializa usuario si no existe
                if (!resumenUsuarios[item.nombre_usuario]) {
                    resumenUsuarios[item.nombre_usuario] = {
                        nombre: item.nombre_usuario,
                        pedidos: 0,
                        piezas: 0,
                        piezas_surtidas: 0,
                        piezas_no_enviadas: 0,
                    };
                    pedidosPorUsuario[item.nombre_usuario] = new Set();
                }
                // Solo cuenta pedidos únicos (por usuario)
                pedidosPorUsuario[item.nombre_usuario].add(key);

                // Suma piezas y demás (total de productos asignados)
                resumenUsuarios[item.nombre_usuario].piezas += Number(item.cantidad || 0);
                resumenUsuarios[item.nombre_usuario].piezas_surtidas += Number(item.cant_surtida || 0);
                resumenUsuarios[item.nombre_usuario].piezas_no_enviadas += Number(item.cant_no_enviada || 0);
            });

            // Ahora sí, asigna el número real de pedidos únicos:
            Object.keys(resumenUsuarios).forEach(nombre => {
                resumenUsuarios[nombre].pedidos = pedidosPorUsuario[nombre].size;
            });

            setPedidos(Object.values(pedidosAgrupados));
            setUsuariosResumen(Object.values(resumenUsuarios));
        } catch {
            setPedidos([]);
            setUsuariosResumen([]);
        }
    };

    const liberarPedido = async (noOrden) => {
        try {
            const res = await axios.post(`http://localhost:3001/api/surtido/finalizar/${noOrden}`);
            if (res.data.ok) {
                alert(`Pedido ${noOrden} liberado con éxito`);
                cargarPedidosSurtiendo(); // Recargar la lista
            } else {
                alert(`Error al liberar: ${res.data.message}`);
            }
        } catch (err) {
            console.error(err);
            alert('Error al liberar el pedido');
        }
    };

    //funcionamiento de embarques 
    const [embarques, setEmbarques] = useState([]);

    const cargarPedidosEmbarques = async () => {
        try {
            const res = await axios.get('http://localhost:3001/api/surtido/embarque');
            const pedidosAgrupados = {};
            res.data.forEach(item => {
                const key = `${item.no_orden}_${item.tipo}`;
                if (!pedidosAgrupados[key]) {
                    pedidosAgrupados[key] = {
                        no_orden: item.no_orden,
                        tipo: item.tipo,
                        bahia: item.ubi_bahia,
                        nombre_usuario: item.nombre_usuario,
                        productos: []
                    };
                }
                pedidosAgrupados[key].productos.push(item);
            });
            setEmbarques(Object.values(pedidosAgrupados));
        } catch (err) {
            setEmbarques([]);
        }
    };

    useEffect(() => {
        if (tabActual === 1) {
            cargarPedidosEmbarques();
        }
    }, [tabActual]);



    return (
        <div className="place_holder-container fade-in" style={{ height: '100vh', overflow: 'hidden' }}>
            <div className="place_holder-header" style={{ background: '#e74c3c', padding: '8px 16px' }}>
                <span className="place_holder-title" style={{ color: '#fff', fontWeight: 600, fontSize: 20 }}>Pedidos Surtiendo</span>
                <button
                    className="place_holder-close"
                    onClick={() => (window.location.href = '/menu')} >
                    <FaTimes color="#fff" />
                </button>
            </div>


            <Box sx={{ width: '100%' }}>
                <Tabs
                    value={tabActual}
                    onChange={handleChange}
                    variant="fullWidth"
                    textColor="primary"
                    indicatorColor="primary"
                    sx={{ borderBottom: 1, borderColor: 'divider', backgroundColor: '#f9f9f9' }}
                >
                    <Tab label="Surtido" />
                    <Tab label="Embarques" />
                    <Tab label="Finalizados" />
                </Tabs>

                <Box sx={{ p: 2 }}>
                    {tabActual === 0 && <div>
                        {/* RESUMEN POR USUARIO */}
                        <Box p={2}>
                            <Grid container spacing={2}>
                                {usuariosResumen.map((u, idx) => (
                                    <Grid item key={u.nombre + idx} xs={12} sm={6} md={3}>
                                        <Paper elevation={2} sx={{ p: 2, minHeight: 90 }}>
                                            <Typography variant="h6">{u.nombre}</Typography>
                                            <Typography variant="body2">Pedidos: <b>{u.pedidos}</b></Typography>
                                            <Typography variant="body2">Cantidad de piezas: <b>{u.piezas}</b></Typography>
                                            <Typography variant="body2" color="success.main">Total surtidas: <b>{u.piezas_surtidas}</b></Typography>
                                            <Typography variant="body2" color="error.main">No enviadas: <b>{u.piezas_no_enviadas}</b></Typography>
                                        </Paper>
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>

                        {/* CONTENIDO SCROLLABLE */}
                        <Box p={3} sx={{
                            height: 'calc(100vh - 180px)',
                            overflowY: 'auto',
                            background: "#faf9f9",
                        }}>
                            {pedidos.length === 0 ? (
                                <Typography color="textSecondary" align="center" mt={4}>No hay pedidos en surtido.</Typography>
                            ) : pedidos.map(pedido => {
                                const progreso = calcularProgreso(pedido.productos);
                                return (
                                    <Card key={pedido.no_orden + pedido.tipo} sx={{ mb: 4 }}>
                                        <CardContent>
                                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                                <Box>
                                                    <Typography variant="h6" fontWeight={600}>
                                                        {pedido.tipo} : {pedido.no_orden} : {pedido.bahia}
                                                    </Typography>
                                                    <Typography fontWeight={600}>
                                                        Surtido por: <b>{pedido.nombre_usuario || "?"}</b>
                                                    </Typography>
                                                </Box>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    onClick={() =>
                                                        setExpanded(prev => ({
                                                            ...prev,
                                                            [pedido.no_orden]: !prev[pedido.no_orden]
                                                        }))
                                                    }
                                                >
                                                    {expanded[pedido.no_orden] ? "Ocultar" : "Ver productos"}
                                                </Button>

                                                {progreso === 100 && (
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        color="success"
                                                        sx={{ ml: 1 }}
                                                        onClick={() => liberarPedido(pedido.no_orden)}
                                                    >
                                                        Liberar
                                                    </Button>
                                                )}
                                            </Box>
                                            {/* Barra de progreso por pedido */}
                                            <Box mt={1} mb={2}>
                                                <Typography variant="body2" mb={0.5}>Progreso</Typography>
                                                <Box display="flex" alignItems="center">
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={progreso}
                                                        sx={{
                                                            flex: 1,
                                                            height: 8,
                                                            borderRadius: 8,
                                                            mr: 2,
                                                            background: "#d6eaff",
                                                            '& .MuiLinearProgress-bar': {
                                                                background: progreso === 100 ? '#2ecc40' : progreso > 0 ? '#82f263' : '#c4e0fc'
                                                            }
                                                        }}
                                                    />
                                                    <Typography width={40} fontWeight={600} textAlign="right">{progreso}%</Typography>
                                                </Box>
                                            </Box>
                                            {expanded[pedido.no_orden] && (
                                                <Table size="small" sx={{ mt: 2 }}>
                                                    <TableHead>
                                                        <TableRow>
                                                            <TableCell>Código</TableCell>
                                                            <TableCell>Cantidad</TableCell>
                                                            <TableCell>Cant. Surtida</TableCell>
                                                            <TableCell>Cant. No Enviada</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {pedido.productos.map((prod, idx) => (
                                                            <TableRow key={prod.codigo_pedido + idx}>
                                                                <TableCell>{prod.codigo_pedido}</TableCell>
                                                                <TableCell>{prod.cantidad}</TableCell>
                                                                <TableCell>{prod.cant_surtida}</TableCell>
                                                                <TableCell>{prod.cant_no_enviada}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </Box>

                    </div>}

                    {tabActual === 1 && (
                        <Box
                            sx={{
                                height: 'calc(100vh - 150px)', // Ajusta según tu header
                                overflowY: 'auto',
                                paddingRight: 1,
                            }}
                        >
                            {embarques.length === 0 ? (
                                <Typography color="textSecondary" align="center" mt={4}>No hay pedidos en embarques.</Typography>
                            ) : embarques.map(pedido => {
                                // Calcular progreso con pz/pq/inner/master y v_pz/v_pq/v_inner/v_master
                                const total = pedido.productos.reduce((sum, p) =>
                                    sum +
                                    Number(p._pz || 0) +
                                    Number(p._pq || 0) +
                                    Number(p._inner || 0) +
                                    Number(p._master || 0)
                                    , 0);

                                const surtido = pedido.productos.reduce((sum, p) =>
                                    sum +
                                    Number(p.v_pz || 0) +
                                    Number(p.v_pq || 0) +
                                    Number(p.v_inner || 0) +
                                    Number(p.v_master || 0)
                                    , 0);

                                const progreso = total > 0 ? Math.round((surtido / total) * 100) : 0;

                                return (
                                    <Card key={pedido.no_orden + pedido.tipo} sx={{ mb: 4 }}>
                                        <CardContent>
                                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                                <Box>
                                                    <Typography variant="h6" fontWeight={600}>
                                                        {pedido.tipo} : {pedido.no_orden} : {pedido.bahia}
                                                    </Typography>
                                                    <Typography fontWeight={600}>
                                                        Surtido por: <b>{pedido.nombre_usuario || "?"}</b>
                                                    </Typography>
                                                </Box>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    onClick={() =>
                                                        setExpanded(prev => ({
                                                            ...prev,
                                                            [pedido.no_orden]: !prev[pedido.no_orden]
                                                        }))
                                                    }
                                                >
                                                    {expanded[pedido.no_orden] ? "Ocultar" : "Ver productos"}
                                                </Button>
                                            </Box>

                                            {/* Barra de progreso */}
                                            <Box mt={1} mb={2}>
                                                <Typography variant="body2" mb={0.5}>Progreso (Validacion de Surtido)</Typography>
                                                <Box display="flex" alignItems="center">
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={progreso}
                                                        sx={{
                                                            flex: 1,
                                                            height: 8,
                                                            borderRadius: 8,
                                                            mr: 2,
                                                            background: "#f1f1f1",
                                                            '& .MuiLinearProgress-bar': {
                                                                background: '#3498db'
                                                            }
                                                        }}
                                                    />
                                                    <Typography width={40} fontWeight={600} textAlign="right">{progreso}%</Typography>
                                                </Box>
                                            </Box>

                                            {/* Tabla de productos */}
                                            {expanded[pedido.no_orden] && (
                                                <Table size="small" sx={{ mt: 2 }}>
                                                    <TableHead>
                                                        <TableRow>
                                                            <TableCell>Código</TableCell>
                                                            <TableCell>PZ</TableCell>
                                                            <TableCell>PQ</TableCell>
                                                            <TableCell>INNER</TableCell>
                                                            <TableCell>MASTER</TableCell>
                                                            <TableCell>V_PZ</TableCell>
                                                            <TableCell>V_PQ</TableCell>
                                                            <TableCell>V_INNER</TableCell>
                                                            <TableCell>V_MASTER</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {pedido.productos.map((prod, idx) => (
                                                            <TableRow key={prod.codigo_pedido + idx}>
                                                                <TableCell>{prod.codigo_pedido}</TableCell>
                                                                <TableCell>{prod._pz}</TableCell>
                                                                <TableCell>{prod._pq}</TableCell>
                                                                <TableCell>{prod._inner}</TableCell>
                                                                <TableCell>{prod._master}</TableCell>
                                                                <TableCell>{prod.v_pz}</TableCell>
                                                                <TableCell>{prod.v_pq}</TableCell>
                                                                <TableCell>{prod.v_inner}</TableCell>
                                                                <TableCell>{prod.v_master}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </Box>
                    )}


                    {tabActual === 2 && <div>Contenido Departamental</div>}

                </Box>
            </Box>


        </div>
    );
}

export default Surtiendo;