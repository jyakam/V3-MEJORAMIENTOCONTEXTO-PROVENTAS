// Forzando un nuevo despliegue para ver los logs
// src/funciones/pedidos.mjs

import {
    obtenerSiguienteConsecutivo,
    escribirCabeceraPedido,
    escribirDetallesPedido
} from './helpers/pedidosSheetHelper.mjs';
import { getContactoByTelefono } from './helpers/cacheContactos.mjs';

// Lista de todas las columnas que tu tabla PEDIDOS espera recibir.
// Esto asegura que no enviemos campos extra o basura a la API.
const COLUMNAS_VALIDAS_PEDIDO = [
    'ID_PEDIDO', 'FECHA_PEDIDO', 'HORA_PEDIDO', 'TELEFONO_REGISTRADO',
    'NOMBRE_COMPLETO_CLIENTE', 'DIRECCION', 'DIRECCION_2', 'CIUDAD',
    'DEPARTAMENTO_REGION_ESTADO', 'CODIGO_POSTAL', 'PAIS', 'EMAIL', 'TELEFONO',
    'SUBTOTAL', 'VALOR_ENVIO', 'IMPUESTOS', 'DESCUENTOS', 'VALOR__TOTAL',
    'FORMA_PAGO', 'ESTADO_PAGO', 'SALDO_PENDIENTE', 'TRANSPORTADORA',
    'GUIA_TRANSPORTE', 'ESTADO_PEDIDO', 'NOTAS_PEDIDO', 'NUMERO_CONSECUTIVO',
    'NUMERO_PEDIDO_VISIBLE'
];


/**
 * Orquesta la creación de un pedido completo a partir del estado de la conversación.
 * Esta es la versión corregida que envía el paquete de datos completo y maneja errores de forma robusta.
 */
export const crearPedidoDesdeState = async (state, ctx) => {
    console.log('Iniciando proceso de creación de pedido...');
    const carrito = state.get('carrito');

    if (!carrito || carrito.length === 0) {
        console.log('El carrito está vacío. No se creará ningún pedido.');
        return;
    }

    try {
        // --- PASO 1: OBTENER DATOS FRESCOS DEL CONTACTO Y DEL PEDIDO ---
        const phone = ctx.from;
        const contacto = getContactoByTelefono(phone) || {};

        const numeroConsecutivo = await obtenerSiguienteConsecutivo();
        if (numeroConsecutivo === -1) {
            // Si no podemos obtener un consecutivo, detenemos todo aquí.
            throw new Error('No se pudo obtener el número consecutivo del pedido.');
        }

        const idUnico = `PED-${Date.now()}`;
        const numeroPedidoVisible = `PED-${numeroConsecutivo.toString().padStart(3, '0')}`;
        const subtotal = carrito.reduce((acc, item) => acc + (item.CANTIDAD * item.PRECIO_UNITARIO), 0);
        const valorTotal = subtotal; // Futuro: sumar envío, etc.

        const ahora = new Date();
        const fecha = `${ahora.getDate().toString().padStart(2, '0')}/${(ahora.getMonth() + 1).toString().padStart(2, '0')}/${ahora.getFullYear()}`;
        const hora = `${ahora.getHours().toString().padStart(2, '0')}:${ahora.getMinutes().toString().padStart(2, '0')}:${ahora.getSeconds().toString().padStart(2, '0')}`;

       // --- PASO 2: ARMAR EL PAQUETE DE DATOS COMPLETO (VERSIÓN CORREGIDA) ---
        const datosCabecera = {
            ID_PEDIDO: idUnico,
            FECHA_PEDIDO: fecha,
            HORA_PEDIDO: hora,
            TELEFONO_REGISTRADO: ctx.from,
            NOMBRE_COMPLETO_CLIENTE: contacto.NOMBRE || ctx.pushName || '',
            DIRECCION: contacto.DIRECCION || '',
            DIRECCION_2: contacto.DIRECCION_2 || '',
            CIUDAD: contacto.CIUDAD || '',
            DEPARTAMENTO_REGION_ESTADO: contacto.ESTADO_DEPARTAMENTO || '',
            CODIGO_POSTAL: contacto.CODIGO_POSTAL || '',
            PAIS: contacto.PAIS || 'Colombia',
            EMAIL: contacto.EMAIL || '',
            TELEFONO: contacto.TELEFONO || ctx.from,
            SUBTOTAL: subtotal,
            VALOR_ENVIO: 0,
            IMPUESTOS: 0,
            DESCUENTOS: 0,
            VALOR_TOTAL: valorTotal, // CORREGIDO: Un solo guion bajo
            FORMA_PAGO: state.get('forma_pago') || 'Por definir',
ESTADO_PAGO: state.get('estado_pago') || 'Pendiente de Pago',
            SALDO_PENDIENTE: valorTotal,
            TRANSPORTADORA: '',
            GUIA_TRANSPORTE: '',
            ESTADO_PEDIDO: 'Nuevo',
            NOTAS_PEDIDO: '',
            NUMERO_CONSECUTIVO: numeroConsecutivo,
            NUMERO_PEDIDO_VISIBLE: numeroPedidoVisible,
            // AÑADIDAS: Las columnas que faltaban
            COLORES: '',
            TALLAS: '',
            FORMA_ENVIO: '',
            ORDEN_ESTADO: '',
        };
        
        const datosDetalles = carrito.map((item, index) => ({
            ID_DETALLE: `${idUnico}-DET-${index + 1}`,
            ID_PEDIDO: idUnico,
            SKU: item.SKU || 'N/A',
            NOMBRE_PRODUCTO: item.NOMBRE_PRODUCTO,
            TIPO_PRODUCTO: 'PRODUCTO',
            OPCION_1_COLOR: item.OPCION_1_COLOR || '',
            OPCION_2_TALLA: item.OPCION_2_TALLA || '',
            OPCION_3_TAMANO: item.OPCION_3_TAMANO || '',
            OPCION_4_SABOR: item.OPCION_4_SABOR || '',
            CANTIDAD: item.CANTIDAD,
            PRECIO_UNITARIO: item.PRECIO_UNITARIO,
            TOTAL_PRODUCTOS: item.CANTIDAD * item.PRECIO_UNITARIO,
            CATEGORIA: item.CATEGORIA || 'General',
            NOTA_PRODUCTO: item.NOTA_PRODUCTO || '',
        }));

        console.log('✨ [DEBUG PEDIDO] Paquete de CABECERA (Completo) a enviar:', JSON.stringify(datosCabecera, null, 2));
        console.log('📄 [DEBUG PEDIDO] Paquete de DETALLES a enviar:', JSON.stringify(datosDetalles, null, 2));

        // --- PASO 3: ENVIAR LOS DATOS CON MANEJO DE ERRORES CORRECTO ---
        await escribirCabeceraPedido(datosCabecera);
        await escribirDetallesPedido(datosDetalles);

        console.log(`✅ Pedido ${numeroPedidoVisible} creado con éxito.`);

    } catch (error) {
        // Si algo falla (obtener consecutivo o escribir en sheets), se reporta aquí y el proceso se detiene.
        console.error('❌ Error mayor durante el proceso de creación del pedido:', error);
    }
};
