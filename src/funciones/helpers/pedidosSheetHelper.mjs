// src/funciones/helpers/pedidosSheetHelper.mjs

import { getTable, postTable } from 'appsheet-connect';
import { APPSHEETCONFIG } from '../../config/bot.mjs';

// Propiedades para la API, estándar en todo el proyecto
const propiedades = {
    UserSettings: { DETECTAR: false }
};

/**
 * Función de reintento para postTable, robusta e idéntica a la de contactos.
 * Verifica la respuesta, la parsea si es necesario y maneja errores de forma predecible.
 */
async function postTableWithRetry(config, table, data, props, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const resp = await postTable(config, table, data, props);
            // Si la respuesta es vacía, no hay nada que procesar
            if (!resp) {
                console.warn(`[postTableWithRetry] ⚠️ Respuesta vacía de la API para la tabla ${table}.`);
                return [];
            }
            // Si la respuesta es texto, intenta convertirla a JSON
            if (typeof resp === 'string') {
                try {
                    return JSON.parse(resp);
                } catch (err) {
                    console.warn(`[postTableWithRetry] ⚠️ La respuesta de la API no es un JSON válido para la tabla ${table}: ${resp}`);
                    return []; // Devuelve un array vacío para no romper el flujo
                }
            }
            // Si ya es un objeto, devuélvelo
            return resp;
        } catch (err) {
            console.warn(`[postTableWithRetry] ⚠️ Intento ${i + 1}/${retries} fallido para postTable en tabla ${table}: ${err.message}`);
            if (i === retries - 1) {
                console.error(`[postTableWithRetry] ❌ Error definitivo en postTable para tabla ${table} tras ${retries} intentos.`);
                throw err; // Lanza el error después del último intento para que sea capturado arriba.
            }
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

/**
 * Obtiene el siguiente número consecutivo para un pedido.
 * @returns {Promise<number>} El siguiente número consecutivo.
 */
export const obtenerSiguienteConsecutivo = async () => {
    try {
        const pedidos = await getTable(APPSHEETCONFIG, process.env.PAG_PEDIDOS);
        if (!pedidos || pedidos.length === 0) {
            return 1;
        }
        const numeros = pedidos.map(p => Number(p.NUMERO_CONSECUTIVO)).filter(n => !isNaN(n));
        const maximo = Math.max(...numeros) || 0;
        return maximo + 1;
    } catch (error) {
        console.error('❌ Error al obtener el consecutivo:', error);
        return -1; // Devuelve -1 para indicar un fallo
    }
};

/**
 * Escribe la fila de la cabecera de un nuevo pedido en la hoja PEDIDOS.
 * @param {object} datosCabecera - Objeto con todos los datos para la fila.
 */
export const escribirCabeceraPedido = async (datosCabecera) => {
    console.log('Escribiendo cabecera de pedido...');
    try {
        await postTableWithRetry(APPSHEETCONFIG, process.env.PAG_PEDIDOS, [datosCabecera], propiedades);
        console.log('✅ Cabecera de pedido escrita con éxito.');
    } catch (error) {
        console.error('❌ Error al escribir la cabecera del pedido:', error.message);
        // Volvemos a lanzar el error para que la función principal (crearPedidoDesdeState) sepa que algo falló.
        throw error;
    }
};

/**
 * Escribe una o más filas de detalle de un pedido en la hoja PEDIDOS_DETALLES.
 * @param {Array<object>} datosDetalles - Un array de objetos, donde cada objeto es una línea de producto.
 */
export const escribirDetallesPedido = async (datosDetalles) => {
    // Si no hay detalles, no hagas nada.
    if (!datosDetalles || datosDetalles.length === 0) {
        console.log('No hay detalles de pedido para escribir.');
        return;
    }
    console.log(`Escribiendo ${datosDetalles.length} detalles de pedido...`);
    try {
        await postTableWithRetry(APPSHEETCONFIG, process.env.PAG_PEDIDOS_DETALLES, datosDetalles, propiedades);
        console.log('✅ Detalles de pedido escritos con éxito.');
    } catch (error) {
        console.error('❌ Error al escribir los detalles del pedido:', error.message);
        throw error;
    }
};
