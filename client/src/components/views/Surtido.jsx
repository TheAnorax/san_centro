import React, { useEffect, useState } from 'react';
import { Card, CardContent, Typography, Box, Button, Table, TableBody, TableCell, TableHead, TableRow, LinearProgress, Grid, Paper, Tabs, Tab } from '@mui/material';
import { FaTimes } from "react-icons/fa";
import axios from 'axios';
import Pagination from '@mui/material/Pagination';


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
            const res = await axios.get('http://192.168.3.154:3001/api/surtido/pedidos/pedidos-surtiendo');
            // Agrupar por no_orden + tipo
            const pedidosAgrupados = {};
            const resumenUsuarios = {};
            const pedidosPorUsuario = {};

            data.forEach(item => {
                const noOrden = String(item.no_orden ?? '').trim();
                const tipoNorm = String(item.tipo ?? '').trim().toUpperCase(); // <-- normaliza
                const key = `${noOrden}__${tipoNorm}`;                         // <-- clave única estable

                if (!pedidosAgrupados[key]) {
                    pedidosAgrupados[key] = {
                        key,                         // guarda la clave para reusar en UI
                        no_orden: noOrden,
                        tipo: tipoNorm,              // muestra siempre normalizado
                        bahia: item.ubi_bahia ?? '',
                        nombre_usuario: item.nombre_usuario ?? '',
                        productos: []
                    };
                }
                pedidosAgrupados[key].productos.push(item);

                // --- RESUMEN USUARIOS ---
                const uname = item.nombre_usuario ?? 'SIN NOMBRE';
                if (!resumenUsuarios[uname]) {
                    resumenUsuarios[uname] = {
                        nombre: uname,
                        pedidos: 0,
                        piezas: 0,
                        piezas_surtidas: 0,
                        piezas_no_enviadas: 0,
                    };
                    pedidosPorUsuario[uname] = new Set();
                }
                pedidosPorUsuario[uname].add(key);

                resumenUsuarios[uname].piezas += Number(item.cantidad || 0);
                resumenUsuarios[uname].piezas_surtidas += Number(item.cant_surtida || 0);
                resumenUsuarios[uname].piezas_no_enviadas += Number(item.cant_no_enviada || 0);
            });

            Object.keys(resumenUsuarios).forEach(n => {
                resumenUsuarios[n].pedidos = pedidosPorUsuario[n].size;
            });

            setPedidos(Object.values(pedidosAgrupados));
            setUsuariosResumen(Object.values(resumenUsuarios));
        } catch {
            setPedidos([]);
            setUsuariosResumen([]);
        }
    };




    //funcionamiento de embarques 
    const [embarques, setEmbarques] = useState([]);

    const cargarPedidosEmbarques = async () => {
        try {
            const res = await axios.get('http://66.232.105.107:3001/api/surtido/embarque');
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
            cargarUsuariosPaqueteria();
        }
    }, [tabActual]);



    const finalizarPedido = async (noOrden) => {
        try {
            const res = await axios.post(`http://66.232.105.107:3001/api/surtido/pedido-finalizado/${noOrden}`);
            if (res.data.ok) {
                alert(`✅ Pedido ${noOrden} finalizado correctamente`);
                // Actualiza la lista de embarques para quitar el pedido finalizado
                setEmbarques(prev =>
                    prev.filter(p => p.no_orden !== noOrden)
                );
            } else {
                alert(`⚠️ Error al finalizar: ${res.data.message}`);
            }
        } catch (err) {
            console.error("❌ Error al conectar al backend:", err);
            alert('Error al finalizar el pedido');
        }
    };

    //Mostrar los pedidos ya Finalizados
    const [pedidosFinalizados, setPedidosFinalizados] = useState([]);
    const [detalleExpandido, setDetalleExpandido] = useState({});


    useEffect(() => {
        axios.get("http://192.168.3.154:3001/api/surtido/Obtener-pedidos-finalizados")
            .then(res => setPedidosFinalizados(res.data))
            .catch(err => console.error("Error al cargar pedidos finalizados", err));
    }, []);



    const [usuariosPaqueteria, setUsuariosPaqueteria] = useState([]);


    const cargarUsuariosPaqueteria = async () => {
        try {
            const res = await axios.get('http://66.232.105.107:3001/api/surtido/Obtener-usuarios'); // ✅ CORRECTO
            setUsuariosPaqueteria(res.data);
        } catch (error) {
            console.error("Error al cargar usuarios de paquetería", error);
            setUsuariosPaqueteria([]);
        }
    };

    // al inicio del componente
    const PAGE_SIZE_FIN = 5;
    const [pageFin, setPageFin] = React.useState(1);

    // cada vez que cambie la fuente, asegúrate de resetear la página (opcional)
    React.useEffect(() => { setPageFin(1); }, [pedidosFinalizados]);

    const totalPagesFin = Math.ceil(pedidosFinalizados.length / PAGE_SIZE_FIN) || 1;
    const startIdxFin = (pageFin - 1) * PAGE_SIZE_FIN;
    const endIdxFin = startIdxFin + PAGE_SIZE_FIN;
    const pedidosFinPagina = pedidosFinalizados.slice(startIdxFin, endIdxFin);




    return (
        <div className="place_holder-container fade-in" style={{ height: '95vh', overflowY: 'auto' }}>

            <Box sx={{ width: '100%' }}>
                <div
                    className="place_holder-header"
                    style={{
                        background: '#e74c3c',
                        padding: '8px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        position: 'sticky',
                        top: 0,
                        zIndex: 2500
                    }}
                >
                    <span className="place_holder-title">Progreso de Pedidos</span>
                    <button
                        style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                        onClick={() => (window.location.href = '/menu')}
                    >
                        <FaTimes color="#fff" size={18} />
                    </button>
                </div>


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

                                                <>
                                                    {progreso === 100 && (
                                                        <Button
                                                            size="small"
                                                            variant="contained"
                                                            color="success"
                                                            sx={{ ml: 1 }}
                                                            onClick={() => finalizarPedido(pedido.no_orden)}
                                                        >
                                                            Finalizar Pedido
                                                        </Button>
                                                    )}
                                                </>

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
                                height: 'calc(100vh - 150px)',
                                overflowY: 'auto',
                                paddingRight: 1,
                            }}
                        >
                            {embarques.length === 0 ? (
                                <Typography color="textSecondary" align="center" mt={4}>No hay pedidos en embarques.</Typography>
                            ) : embarques.map(pedido => {
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
                                                <Box>
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


                                                    {!pedido.productos[0]?.id_usuario_paqueteria ? (
                                                        <Box mt={1}>
                                                            <Typography variant="body2">Asignar usuario:</Typography>
                                                            <select
                                                                value=""
                                                                onChange={async (e) => {
                                                                    const id_usuario = e.target.value;
                                                                    if (!id_usuario) return;

                                                                    try {
                                                                        const res = await axios.put(`http://66.232.105.107:3001/api/surtido/asignar-usuario-paqueteria`, {
                                                                            no_orden: pedido.no_orden,
                                                                            id_usuario_paqueteria: id_usuario
                                                                        });

                                                                        if (res.data.ok) {
                                                                            alert("✅ Usuario asignado correctamente");
                                                                            cargarPedidosEmbarques(); // refresca
                                                                        } else {
                                                                            alert("⚠️ Error: " + (res.data.error || res.data.mensaje));
                                                                        }
                                                                    } catch (err) {
                                                                        console.error(err);
                                                                        alert("❌ Error al asignar el usuario");
                                                                    }
                                                                }}
                                                            >
                                                                <option value="">-- Selecciona --</option>
                                                                {usuariosPaqueteria.map((u) => (
                                                                    <option key={u.id} value={u.id}>
                                                                        {u.nombre}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </Box>
                                                    ) : (
                                                        <Typography variant="body2" sx={{ mt: 1 }}>
                                                            Usuario asignado: <b>{pedido.productos[0].nombre_usuario_paqueteria || "?"}</b>
                                                        </Typography>
                                                    )}



                                                    {progreso === 100 && (
                                                        <Button
                                                            size="small"
                                                            variant="contained"
                                                            color="success"
                                                            sx={{ ml: 1 }}
                                                            onClick={() => finalizarPedido(pedido.no_orden)}
                                                        >
                                                            Finalizar Pedido
                                                        </Button>
                                                    )}

                                                </Box>
                                            </Box>

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


                    {tabActual === 2 && (
                        <Box p={2}>
                            <Typography variant="h6" gutterBottom>Pedidos finalizados</Typography>

                            {pedidosFinalizados.length === 0 ? (
                                <Typography color="textSecondary">No hay pedidos finalizados.</Typography>
                            ) : (
                                <>
                                    {/* Controles arriba */}
                                    <Box display="flex" justifyContent="flex-end" mb={1}>
                                        <Pagination
                                            count={totalPagesFin}
                                            page={pageFin}
                                            onChange={(_, p) => {
                                                setPageFin(p);
                                                // opcional: scroll al inicio de la lista
                                                document.querySelector('#lista-finalizados')?.scrollTo({ top: 0, behavior: 'smooth' });
                                            }}
                                            size="small"
                                            color="primary"
                                            showFirstButton
                                            showLastButton
                                        />
                                    </Box>

                                    <Box id="lista-finalizados">
                                        {pedidosFinPagina.map((pedido) => {
                                            const rowKey = pedido.key; // clave estable compuesta que ya usas

                                            const total = pedido.productos.reduce((s, p) => s + Number(p.cantidad || 0), 0);
                                            const surtida = pedido.productos.reduce((s, p) => s + Number(p.cant_surtida || 0), 0);
                                            const noEnviada = pedido.productos.reduce((s, p) => s + Number(p.cant_no_enviada || 0), 0);

                                            return (
                                                <Paper key={rowKey} sx={{ mb: 2, p: 2 }}>
                                                    <Typography variant="subtitle1" fontWeight="bold">
                                                        {pedido.tipo} : {pedido.no_orden}
                                                    </Typography>

                                                    <Typography variant="body2" sx={{ mb: 1 }}>
                                                        Total: <b>{total}</b> &nbsp;|&nbsp; Surtida: <b>{surtida}</b> &nbsp;|&nbsp; No enviada: <b>{noEnviada}</b>
                                                    </Typography>

                                                    <Button
                                                        variant="outlined"
                                                        size="small"
                                                        sx={{ my: 1 }}
                                                        onClick={() =>
                                                            setDetalleExpandido(prev => ({
                                                                ...prev,
                                                                [rowKey]: !prev[rowKey],
                                                            }))
                                                        }
                                                    >
                                                        {detalleExpandido[rowKey] ? "Ocultar productos" : "Ver productos"}
                                                    </Button>

                                                    {detalleExpandido[rowKey] && (
                                                        <Box sx={{ mt: 2, maxHeight: 250, overflowY: 'auto', border: '1px solid #ccc', borderRadius: 2 }}>
                                                            <Table size="small">
                                                                <TableHead>
                                                                    <TableRow>
                                                                        <TableCell>Código</TableCell>
                                                                        <TableCell>Cantidad</TableCell>
                                                                        <TableCell>Cant. Surtida</TableCell>
                                                                        <TableCell>Cant. No Enviada</TableCell>
                                                                        <TableCell>Bahia</TableCell>
                                                                        <TableCell>Nombre Surtidor</TableCell>
                                                                        <TableCell>Cant pz</TableCell>
                                                                        <TableCell>Cant Inner</TableCell>
                                                                        <TableCell>Cant Master</TableCell>
                                                                        <TableCell>Inicio - Fin de Surtido</TableCell>
                                                                        <TableCell>Nombre Embarques / Paqueteria</TableCell>
                                                                        <TableCell>Validar pz</TableCell>
                                                                        <TableCell>Validar Inner</TableCell>
                                                                        <TableCell>Validar Master</TableCell>
                                                                        <TableCell>Inicio - Fin de Embarque</TableCell>
                                                                    </TableRow>
                                                                </TableHead>
                                                                <TableBody>
                                                                    {pedido.productos.map((prod, idx) => (
                                                                        <TableRow
                                                                            key={`${prod.codigo_pedido || idx}_${idx}`}
                                                                            sx={{
                                                                                backgroundColor: prod.cant_no_enviada > 0 ? "#ff0026ff" : "inherit" // rojo claro si hay no enviada
                                                                            }}
                                                                        >
                                                                            <TableCell>{prod.codigo_pedido}</TableCell>
                                                                            <TableCell>{prod.cantidad}</TableCell>
                                                                            <TableCell>{prod.cant_surtida}</TableCell>
                                                                            <TableCell>{prod.cant_no_enviada}</TableCell>
                                                                            <TableCell>{prod.ubi_bahia}</TableCell>
                                                                            <TableCell>{prod.nombre_usuario}</TableCell>
                                                                            <TableCell>{prod._pz}</TableCell>
                                                                            <TableCell>{prod._inner}</TableCell>
                                                                            <TableCell>{prod._master}</TableCell>
                                                                            <TableCell>
                                                                                <b>Inicio:</b> {new Date(prod.inicio_surtido).toLocaleString("es-MX", {
                                                                                    dateStyle: "short",
                                                                                    timeStyle: "medium"
                                                                                })}
                                                                                <br />
                                                                                <b>Fin:</b> {new Date(prod.fin_surtido).toLocaleString("es-MX", {
                                                                                    dateStyle: "short",
                                                                                    timeStyle: "medium"
                                                                                })}
                                                                            </TableCell>
                                                                            <TableCell>{prod.nombre_paqueteria}</TableCell>
                                                                            <TableCell>{prod.v_pz}</TableCell>
                                                                            <TableCell>{prod.v_inner}</TableCell>
                                                                            <TableCell>{prod.v_master}</TableCell>
                                                                            <TableCell>
                                                                                <b>Inicio:</b> {new Date(prod.inicio_embarque).toLocaleString("es-MX", {
                                                                                    dateStyle: "short",
                                                                                    timeStyle: "medium"
                                                                                })}
                                                                                <br />
                                                                                <b>Fin:</b> {new Date(prod.fin_embarque).toLocaleString("es-MX", {
                                                                                    dateStyle: "short",
                                                                                    timeStyle: "medium"
                                                                                })}
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>

                                                            </Table>
                                                        </Box>
                                                    )}
                                                </Paper>
                                            );
                                        })}
                                    </Box>

                                </>
                            )}
                        </Box>
                    )}



                </Box>
            </Box>


        </div>
    );
}

export default Surtiendo;