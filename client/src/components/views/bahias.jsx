import React, { useEffect, useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import Swal from 'sweetalert2';

const gridMap = ['A', 'B', 'C', 'D', 'E'];
const filas = [1, 2, 3, 4, 5];

const coloresEstado = {
    1: '#e53935',   // Rojo - Ocupado
    2: '#ffb300',   // Amarillo - En tránsito
    3: '#1553ffff',   // Verde - Libre
    null: '#e0e0e0', // Gris - Sin Ingreso
    undefined: '#e0e0e0',
    '': '#e0e0e0',
};

const labelsEstado = {
    1: 'Ocupado',
    2: 'Surtido',
    3: 'Embarques',
    null: 'Sin Ingreso',
    undefined: 'Sin Ingreso',
    '': 'Sin Ingreso',
};

function getColor(bahia) {
    if (!bahia) return coloresEstado[''];
    let estado = bahia.estado;
    if (estado === null || estado === undefined || estado === '') return coloresEstado[''];
    return coloresEstado[estado] || coloresEstado[''];
}

function getLabelEstado(bahia) {
    if (!bahia) return labelsEstado[''];
    let estado = bahia.estado;
    if (estado === null || estado === undefined || estado === '') return labelsEstado[''];
    return labelsEstado[estado] || labelsEstado[''];
}

function formateaFecha(fechaStr) {
    if (!fechaStr) return '';
    const d = new Date(fechaStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-MX');
}

function BahiasTablero() {
    const [bahias, setBahias] = useState([]);

    const cargarBahias = () => {
        fetch('http://66.232.105.107:3001/api/bahia/Obtener')
            .then((res) => res.json())
            .then(setBahias);
    };

    useEffect(() => {
        cargarBahias();
    }, []);

    // Mapa rápido para buscar bahía por clave
    const bahiasMap = {};
    bahias.forEach(b => {
        if (b.bahia) bahiasMap[b.bahia] = b;
    });

    // Sólo permite liberar si estado=1 (ocupado) o 2 (en tránsito) Y hay pedido asignado
    const puedeLiberar = (bahia) => {
        return bahia && (bahia.estado === 1 || bahia.estado === 2 || bahia.estado === 3) && bahia.id_pdi && bahia.id_pdi !== "null";
    };

    const handleLiberarBahia = (bahia) => {
        if (!puedeLiberar(bahia)) return; // No hace nada si no es liberable

        Swal.fire({
            title: '¿Deseas liberar esta ubicación?',
            html: `
                <div style="margin-top:8px;font-size:18px;">
                    <b>Bahía:</b> ${bahia.bahia}<br/>
                    <b>Con el pedido:</b> ${bahia.id_pdi}
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, liberar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#2e7d32',
            cancelButtonColor: '#d33'
        }).then(async (result) => {
            if (result.isConfirmed) {
                await fetch('http://66.232.105.107:3001/api/bahia/liberar', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id_bahia: bahia.id_bahia })
                });
                Swal.fire('¡Liberada!', 'La bahía ha sido liberada.', 'success');
                cargarBahias(); // Refresca datos sin recargar página
            }
        });
    };

    return (
        <div className="place_holder-container fade-in">
            <div className="place_holder-header">
                <span className="place_holder-title">Bahías</span>
                <button
                    className="place_holder-close"
                    onClick={() => (window.location.href = '/menu')}
                >
                    <FaTimes />
                </button>
            </div>

            <div style={{ padding: 30, textAlign: 'center' }}>
                <h2>Vista de Bahías</h2>
            </div>
            {/* Encabezados */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${gridMap.length}, 90px)`,
                justifyContent: 'center',
                margin: '25px 0 8px 0'
            }}>
                {gridMap.map((col, i) => (
                    <div key={i} style={{
                        textAlign: 'center',
                        fontWeight: 'bold',
                        marginBottom: 5,
                        fontSize: 20
                    }}>{col}</div>
                ))}
            </div>

            {/* Grid de bahías */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${gridMap.length}, 90px)`,
                gridGap: '16px',
                justifyContent: 'center',
            }}>
                {filas.map(fila =>
                    gridMap.map(col => {
                        const claveBahia = `${col}-${fila.toString().padStart(2, '0')}`;
                        const bahia = bahiasMap[claveBahia];
                        const color = getColor(bahia);
                        const estadoLabel = getLabelEstado(bahia);

                        return (
                            <div
                                key={claveBahia}
                                onClick={() => handleLiberarBahia(bahia)}
                                style={{
                                    width: 90,
                                    height: 88,
                                    borderRadius: 8,
                                    background: color,
                                    color: color === '#e0e0e0' ? '#333' : '#fff',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 'bold',
                                    boxShadow: '0 2px 8px 0 rgba(100,100,100,0.07)',
                                    border: '1px solid #bbb',
                                    fontSize: 15,
                                    cursor: puedeLiberar(bahia) ? 'pointer' : 'default',
                                    opacity: puedeLiberar(bahia) ? 1 : 0.83,
                                    transition: 'box-shadow 0.2s, opacity 0.2s',
                                }}
                                title={puedeLiberar(bahia) ? 'Liberar bahía' : ''}
                            >
                                <div>
                                    <div>{bahia ? bahia.bahia : claveBahia}</div>
                                    <div style={{ fontWeight: 700 }}>
                                        {bahia && bahia.id_pdi ? bahia.id_pdi : 'N/A'}
                                    </div>
                                    <div style={{ fontWeight: 700 }}>
                                        {bahia && bahia.ingreso ? formateaFecha(bahia.ingreso) : ''}
                                    </div>
                                    <div style={{ fontSize: 14, marginTop: 2 }}>
                                        {estadoLabel}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

export default BahiasTablero;