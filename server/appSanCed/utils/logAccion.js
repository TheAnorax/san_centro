/**
 * logAccion.js
 * Envuelve una función del modelo para imprimir en consola (en colores)
 * qué se está haciendo: módulo, acción, datos que llegan y resultado.
 *
 *   SURTIDO  registrarEscaneo  → {id_pedi:14855, um:'PZ', ...}
 *   SURTIDO  registrarEscaneo  ✔ OK (12 ms) {ok:true, piezasAgregadas:1}
 *   SURTIDO  registrarEscaneo  ✘ 409 Ese escaneo excede lo pedido (...)
 *
 * Para apagarlo: variable de entorno LOG_ACCIONES=0
 */

const C = {
    reset: '\x1b[0m',
    dim: '\x1b[2m',
    bold: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
};

const COLOR_MODULO = { SURTIDO: C.cyan, EMBARQUES: C.magenta };

const activo = () => process.env.LOG_ACCIONES !== '0';

const hora = () => new Date().toLocaleTimeString('es-MX', { hour12: false });

const corto = (obj) => {
    try {
        const s = JSON.stringify(obj);
        return s && s.length > 300 ? s.slice(0, 300) + '…' : s;
    } catch {
        return String(obj);
    }
};

const conLog = (modulo, nombre, fn) => async (...args) => {
    if (!activo()) return fn(...args);

    const col = COLOR_MODULO[modulo] || C.cyan;
    const etiqueta = `${C.dim}${hora()}${C.reset} ${col}${C.bold}${modulo}${C.reset} ${C.bold}${nombre}${C.reset}`;
    console.log(`${etiqueta} ${C.yellow}→${C.reset} ${corto(args.length === 1 ? args[0] : args)}`);

    const t0 = Date.now();
    try {
        const res = await fn(...args);
        const ms = Date.now() - t0;
        if (res && res.ok === false) {
            console.log(`${etiqueta} ${C.red}✘ ${res.code || ''} ${res.message || ''}${C.reset} ${C.dim}(${ms} ms)${C.reset}`);
        } else {
            console.log(`${etiqueta} ${C.green}✔ OK${C.reset} ${C.dim}(${ms} ms)${C.reset} ${corto(res)}`);
        }
        return res;
    } catch (err) {
        console.log(`${etiqueta} ${C.red}✘ EXCEPCIÓN: ${err.message}${C.reset}`);
        throw err;
    }
};

module.exports = { conLog };
