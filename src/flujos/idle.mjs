import { addKeyword, EVENTS } from '@builderbot/bot';
import { generarResumenConversacionGlobalIA } from '../funciones/helpers/generarResumenConversacion.mjs';
import { ActualizarResumenUltimaConversacion } from '../funciones/helpers/contactosSheetHelper.mjs';
import { getContactoByTelefono } from '../funciones/helpers/cacheContactos.mjs';
// NUEVA LÍNEA: Importamos la función de pedidos que creamos
import { crearPedidoDesdeState } from '../funciones/pedidos.mjs';

// TT Objeto para almacenar temporizadores para cada usuario
const timers = {};

// TT Flujo para manejar la inactividad
export const idleFlow = addKeyword(EVENTS.ACTION).addAction(
  async (ctx, { flowDynamic, endFlow, state }) => { // Removí gotoFlow ya que no se usa aquí
    try {
      // 1. Obtener el historial de la conversación
      const historial = state.get('historialMensajes') || [];
      const phone = ctx.from.split('@')[0];

      if (historial.length > 3) { // Solo si hubo conversación relevante
        const textoHistorial = historial.map(msg => 
          `${msg.rol === 'cliente' ? 'Cliente' : 'Bot'}: ${msg.texto}`
        ).join('\n');

        // 2. Llama a OpenAI para hacer el resumen global
        const resumenGlobal = await generarResumenConversacionGlobalIA(textoHistorial, phone);

        // 3. Guarda el resumen en AppSheet/Google Sheets
        const contacto = getContactoByTelefono(phone);
        if (resumenGlobal) {
          await ActualizarResumenUltimaConversacion(contacto, phone, resumenGlobal);
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
