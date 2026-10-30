/**
 * preciosProducto.js
 *
 * Conecta con la misma API de precios/unidades que ya usa el módulo de
 * Muestras (Muestras.jsx -> POST http://66.232.105.79:9100/pedidoDetProd)
 * para poder mostrar, en los correos de "Solicitar Inventario", con qué
 * unidad de medida (PZ, CJ, INNER, MASTER, etc.) y a qué costo se está
 * pidiendo cada producto.
 *
 * La lógica de derivarPrecios/getUM es una réplica exacta (mismas fórmulas)
 * de la que ya vive en Muestras.jsx, para que el costo que se ve en este
 * correo cuadre con el que se ve en esa pantalla.
 */

const axios = require('axios');

const PEDIDO_DET_PROD_URL = 'http://66.232.105.79:9100/pedidoDetProd';
const IVA = 1.16;

// Mismo diccionario que getUM() en Muestras.jsx.
const getUM = (unidad) => {
    if (unidad === 'BL') return 'Bolsa';
    else if (unidad === 'CJ') return 'Caja';
    else if (unidad === 'EM') return 'Empaque';
    else if (unidad === 'PQ') return 'Paquete';
    else if (unidad === 'JG') return 'Juego';
    else if (unidad === 'AT') return 'Atado';
    else return 'Pieza';
};

// Misma fórmula que derivarPrecios() en Muestras.jsx: el precio POR PIEZA se
// toma tal cual de la API (precio_unitario/precio_promo) y solo se deriva de
// precio_list como respaldo si la API no lo trae.
const derivarPrecios = (prod) => {
    const tipo = Number(prod?.tipo_uni) || 0;
    const cantSec = Number(prod?.cant_sec) || 1;
    const lista = Number(prod?.precio_list) || 0;

    const unitApi = Number(prod?.precio_unitario) || 0;
    const promApi = Number(prod?.precio_promo) || 0;

    const pr_pz = tipo === 1 ? lista : parseFloat((tipo === 0 ? lista : lista / cantSec).toFixed(2));
    const pr_em = tipo === 1 ? lista : parseFloat((tipo === 0 ? lista * cantSec : lista).toFixed(2));

    const unit = unitApi > 0 ? unitApi : (tipo === 0 ? pr_em : pr_pz);
    const prom = promApi > 0 ? promApi : (tipo === 0 ? pr_pz : pr_em);

    // Precio POR PIEZA (con IVA si el producto no está exento).
    const precioPiezaConIva = (tipo === 2 || tipo === 3) ? unit : prom;
    const tasa = Number(prod?.tasa) === 1 ? 1 : IVA;
    const precioPiezaSinIva = parseFloat((precioPiezaConIva / tasa).toFixed(4));

    return { unit, prom, lista, precioPiezaConIva, precioPiezaSinIva, tasa };
};

/**
 * Consulta el detalle (unidad de medida + precios) de un código en la misma
 * API que usa Muestras.jsx. Si el código no existe ahí (no todos los
 * productos de `inventario` están dados de alta en el catálogo de ventas),
 * regresa null y el llamador debe mostrar el producto sin costo/UM.
 */
// Caché en memoria (10 min) SOLO de respuestas buenas: la vista previa y el envío
// consultan los mismos ~500 códigos, y sin caché se duplicaba la carga sobre la
// API de catálogo (llegaba a fallar y todo salía "sin costo" y sin empaque).
const CACHE_DETALLE_MS = 10 * 60 * 1000;
const cacheDetalle = new Map();

const obtenerDetalleProducto = async (codigo) => {
    const clave = String(codigo).trim();
    const hit = cacheDetalle.get(clave);
    if (hit && Date.now() - hit.t < CACHE_DETALLE_MS) return hit.prod;

    let ultimoError = null;
    for (let intento = 1; intento <= 2; intento++) {
        try {
            const { data } = await axios.post(
                PEDIDO_DET_PROD_URL,
                { id: 'inventario-solicitudes', codigo: clave },
                { headers: { 'Content-Type': 'application/json' }, timeout: 8000 }
            );
            // Respuesta válida pero el código no existe en el catálogo: no se reintenta.
            if (data?.error === true || !data?.prod) return null;
            cacheDetalle.set(clave, { t: Date.now(), prod: data.prod });
            return data.prod;
        } catch (err) {
            ultimoError = err;
        }
    }
    console.error(`No se pudo obtener el detalle de precio/UM del código ${codigo}:`, ultimoError?.message);
    return null;
};

// Recorre `items` con máximo `limite` llamadas a la vez (en vez de ~500 de golpe).
const mapaLimitado = async (items, limite, fn) => {
    const resultados = new Array(items.length);
    let siguiente = 0;
    const trabajadores = Array.from({ length: Math.min(limite, items.length) }, async () => {
        while (true) {
            const i = siguiente++;
            if (i >= items.length) return;
            resultados[i] = await fn(items[i], i);
        }
    });
    await Promise.all(trabajadores);
    return resultados;
};

// Mismo criterio que obtenerMinimo() en Muestras.jsx: el mínimo de venta
// (empaque cerrado) es SIEMPRE cant_sec, y tipo_uni === 1 (pieza suelta)
// queda exento (no tiene empaque mínimo, se puede pedir cualquier cantidad).
const obtenerMinimoVenta = (prod) => {
    const tipo = Number(prod?.tipo_uni) || 0;
    if (tipo === 1) return 0;
    const cantSec = Number(prod?.cant_sec) || 0;
    return cantSec > 0 ? cantSec : 0;
};

/**
 * Dado un código + cantidad (SIEMPRE en piezas: así es como se maneja hoy
 * `inv_opt`/la columna "cantidad" del Excel en el módulo de inventario),
 * regresa el costeo (unitario y total) ya resuelto y, si el producto tiene
 * un empaque mínimo de venta (cant_sec, igual que en Muestras.jsx), si la
 * cantidad pedida lo completa o no — para AVISAR en el correo, sin redondear
 * ni bloquear el envío.
 *
 * La cantidad que maneja este módulo va y viene en PIEZAS, nunca en la
 * unidad de venta principal del catálogo (uni_prin puede ser "Caja",
 * "Empaque", etc.) — por eso `um` siempre es "Pieza": mostrar la cantidad
 * con la etiqueta de uni_prin sería engañoso (ej. decir "23 Empaque" cuando
 * en realidad son 23 piezas sueltas).
 */
const resolverUnidadYCosto = async (codigo, cantidad, tope = null) => {
    // `tope` (opcional): máximo de piezas que se pueden pedir (disponible en 7050).
    // El redondeo al empaque nunca lo rebasa: si al cerrar hacia arriba se pasa,
    // se baja al múltiplo completo que sí cabe (y si ni 1 empaque cabe, se excluye).
    const prod = await obtenerDetalleProducto(codigo);
    const cantOriginal = Number(cantidad) || 0;
    const hayTope = tope !== null && tope !== undefined && Number.isFinite(Number(tope));

    if (!prod) {
        return {
            um: 'Pieza',
            precioUnitarioSinIva: null,
            costoTotalSinIva: null,
            conCatalogo: false,
            minimoVenta: null,
            cantidadAjustada: hayTope ? Math.min(cantOriginal, Math.max(Number(tope), 0)) : cantOriginal,
            excluidoPorEmpaqueIncompleto: false,
        };
    }

    const { precioPiezaSinIva } = derivarPrecios(prod);
    const uniPrin = prod.uni_prin || 'PZ';
    const minimo = obtenerMinimoVenta(prod);

    let minimoVenta = null;
    let cantidadAjustada = cantOriginal;
    let excluidoPorEmpaqueIncompleto = false;

    if (minimo > 0) {
        const completo = cantOriginal > 0 && cantOriginal % minimo === 0;
        minimoVenta = {
            piezasPorEmpaque: minimo,
            unidadEmpaque: getUM(uniPrin),
            completo,
            faltantePiezas: completo ? 0 : minimo - (cantOriginal % minimo),
        };

        // 🆕 Ya no se manda "tal cual, sin redondear": si no completa el
        // empaque mínimo de venta, se redondea hacia ABAJO al múltiplo
        // completo más cercano (se descartan las piezas sueltas que no
        // alcanzan a formar otro empaque completo). Si ni siquiera alcanza
        // para 1 empaque completo, el producto se excluye por completo de
        // la solicitud — nunca se manda con cantidad 0. Los productos
        // exentos (tipo_uni === 1, pieza suelta → minimo === 0) no entran
        // aquí y se piden tal cual, sin tocar nada.
        if (!completo) {
            // Si las piezas sueltas son la MITAD O MÁS del empaque, se cierra
            // hacia ARRIBA al empaque completo (6 de 10 -> 10, 10 de 20 -> 20).
            // Si son menos de la mitad, se descartan (1 de 10 -> excluido, 23 de 10 -> 20).
            const sobrante = cantOriginal % minimo;
            const base = Math.floor(cantOriginal / minimo) * minimo;
            cantidadAjustada = sobrante * 2 >= minimo ? base + minimo : base;
            if (cantidadAjustada <= 0) {
                excluidoPorEmpaqueIncompleto = true;
            }
        }

        // Tope por disponible: si cerrar al empaque se pasa de lo que hay, se baja
        // al múltiplo completo que sí cabe; si no cabe ni 1 empaque, se excluye.
        if (hayTope && cantidadAjustada > Number(tope)) {
            cantidadAjustada = Math.floor(Math.max(Number(tope), 0) / minimo) * minimo;
            excluidoPorEmpaqueIncompleto = cantidadAjustada <= 0;
        }
    } else if (hayTope && cantidadAjustada > Number(tope)) {
        cantidadAjustada = Math.max(Number(tope), 0);
    }

    return {
        um: 'Pieza',
        precioUnitarioSinIva: precioPiezaSinIva,
        costoTotalSinIva: parseFloat((precioPiezaSinIva * cantidadAjustada).toFixed(2)),
        conCatalogo: true,
        minimoVenta,
        cantidadAjustada,
        excluidoPorEmpaqueIncompleto,
    };
};

module.exports = {
    getUM,
    derivarPrecios,
    obtenerDetalleProducto,
    obtenerMinimoVenta,
    resolverUnidadYCosto,
    mapaLimitado,
    IVA,
};
