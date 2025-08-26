import { addKeyword, EVENTS } from '@builderbot/bot';
import { generarResumenConversacionGlobalIA } from '../funciones/helpers/generarResumenConversacion.mjs';
import { generarResumenMejorado } from '../funciones/helpers/contextoConversacionHelper.mjs';
import { ActualizarResumenUltimaConversacion } from '../funciones/helpers/contactosSheetHelper.mjs';
import { getContactoByTelefono } from '../funciones/helpers/cacheContactos.mjs';
// NUEVA LÍNEA: Importamos la función de pedidos que creamos
import { crearPedidoDesdeState } from '../funciones/pedidos.mjs';

// TT Objeto para almacenar temporizadores para cada usuario
const timers = {};

// TT Flujo para manejar la inactividad
export const idleFlow = addKeyword(EVENTS.ACTION).addAction(
  async (ctx, { flowDynamic, endFlow, state }) => { // Removí gotoFlow ya que no se usa aquí
  const phone = ctx.from.split('@')[0];
  const OP_ID = `[OP:${phone}:${Date.now()}]`; // <-- CORRECCIÓN: Movido aquí arriba

   try {
  // 1. Obtener el historial de la conversación
  const historial = state.get('historialMensajes') || [];
  
  // --- NUEVO LOG DE DEPURACIÓN ---
  // Esta "cámara" nos muestra los datos del contacto ANTES de hacer cualquier cosa.
  console.log('📸 [DEBUG IDLE] Estado del contacto en CACHÉ ANTES de guardar:', JSON.stringify(getContactoByTelefono(phone), null, 2));
  // --- FIN DEL NUEVO LOG ---

  // === LOGS DE CORRELACIÓN Y SANIDAD (solo lectura) ===
const contactoCacheAntes = getContactoByTelefono(phone) || null;

console.log(`${OP_ID} [IDLE] INICIO CIERRE. Historial mensajes:`, historial.length);
if (contactoCacheAntes) {
  const { TELEFONO, NOMBRE, EMAIL, CIUDAD, _RowNumber } = contactoCacheAntes;
  console.log(`${OP_ID} [IDLE] CONTACTO EN CACHÉ (ANTES):`, { TELEFONO, NOMBRE, EMAIL, CIUDAD, _RowNumber });
    const t1 = (contactoCacheAntes.RESUMEN_ULTIMA_CONVERSACION || '').length;
  const t2 = (contactoCacheAntes.RESUMEN_2 || '').length;
  console.log(`${OP_ID} [IDLE] LONGITUDES RESÚMENES (ANTES):`, { t1, t2 });
}

  if (historial.length > 3) { // Solo si hubo conversación relevante
        const textoHistorial = historial.map(msg => 
          `${msg.rol === 'cliente' ? 'Cliente' : 'Bot'}: ${msg.texto}`
        ).join('\n');

        // 2. Llama a OpenAI para hacer el resumen global
        const resumenGlobal = await generarResumenMejorado(textoHistorial, phone);

       // 3. Guarda el resumen en AppSheet/Google Sheets
      if (resumenGlobal) {
  console.log(`${OP_ID} [IDLE] Resumen global generado. Longitud=`, resumenGlobal.length, 
              'Preview=', resumenGlobal.slice(0, 150), '...');

  await ActualizarResumenUltimaConversacion(phone, resumenGlobal);

  // Verificar cómo queda la caché inmediatamente después del intento
  const contactoCacheDespues = getContactoByTelefono(phone) || null;
  if (contactoCacheDespues) {
    const { TELEFONO, NOMBRE, EMAIL, CIUDAD, _RowNumber } = contactoCacheDespues;
    console.log(`${OP_ID} [IDLE] CONTACTO EN CACHÉ (DESPUÉS):`, { TELEFONO, NOMBRE, EMAIL, CIUDAD, _RowNumber });
        const d1 = (contactoCacheDespues.RESUMEN_ULTIMA_CONVERSACION || '').length;
    const d2 = (contactoCacheDespues.RESUMEN_2 || '').length;
    console.log(`${OP_ID} [IDLE] LONGITUDES RESÚMENES (DESPUÉS):`, { d1, d2 });
  }

  console.log(`✅ [IDLE] Resumen global de sesión guardado para ${phone}`);
}
      }

      // --- INICIO DE LA NUEVA LÓGICA PARA CREAR PEDIDO ---
      try {
        const carrito = state.get('carrito');
        if (carrito && carrito.length > 0) {
          console.log(`[IDLE] Carrito detectado con ${carrito.length} items. Creando pedido para ${ctx.from}...`);
          await crearPedidoDesdeState(state, ctx);
        } else {
          console.log(`[IDLE] Carrito vacío o no existe para ${ctx.from}. No se creará pedido.`);
        }
      } catch (e) {
        console.error('❌ [IDLE] Error durante la creación del pedido:', e);
      }
      // --- FIN DE LA NUEVA LÓGICA ---

    } catch (e) {
      console.log('❌ [IDLE] Error generando o guardando resumen global:', e);
    }
    stop(ctx);
    // Fuente del "nombre" que imprimimos en cierre
console.log(`${OP_ID} [IDLE] FUENTES NOMBRE CIERRE`, {
  ctx_name: ctx?.name,
  cache_name: (getContactoByTelefono(phone) || {}).NOMBRE
});
    console.log(`Sesion Cerrada para ${ctx.name} con el numero: ${ctx.from}`);
    state.clear();
    return endFlow();
  }
);

// TT Función para iniciar el temporizador de inactividad para un usuario
/**
 * Inicia un temporizador de inactividad para un usuario específico.
 * @param {Object} ctx - Contexto que contiene la información del usuario.
 * @param {Function} gotoFlow - Función para cambiar al flujo deseado.
 * @param {number} sgs - Tiempo de inactividad permitido en segundos.
 */
export const start = (ctx, gotoFlow, sgs) => {
  timers[ctx.from] = setTimeout(() => {
    return gotoFlow(idleFlow);
  }, sgs * 1000);
};

// TT Función para reiniciar el temporizador de inactividad para un usuario
/**
 * Detiene y reinicia el temporizador de inactividad para un usuario específico.
 * @param {Object} ctx - Contexto que contiene la información del usuario.
 * @param {Function} gotoFlow - Función para cambiar al flujo deseado.
 * @param {Function} sgs - cantidad de segundos  del temporizador.
 */
export const reset = (ctx, gotoFlow, sgs) => {
  stop(ctx);
  if (timers[ctx.from]) {
    clearTimeout(timers[ctx.from]);
  }
  start(ctx, gotoFlow, sgs);
};

// TT Función para detener el temporizador de inactividad para un usuario
/**
 * Detiene el temporizador de inactividad para un usuario específico.
 * @param {Object} ctx - Contexto que contiene la información del usuario.
 */
export const stop = (ctx) => {
  if (timers[ctx.from]) {
    clearTimeout(timers[ctx.from]);
  }
};
