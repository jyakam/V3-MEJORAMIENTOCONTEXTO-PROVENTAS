// Archivo: src/funciones/helpers/contextoConversacionHelper.mjs

import { getContactoByTelefono } from './cacheContactos.mjs'
import { EnviarTextoOpenAI } from '../../APIs/OpenAi/enviarTextoOpenAI.mjs'

/**
 * Carga el contexto anterior de un cliente desde la caché.
 * @param {string} phone - El número de teléfono del cliente.
 * @returns {object|null} Un objeto con el resumen anterior y los datos del cliente, o null si no hay nada que cargar.
 */
export async function cargarContextoAnterior(phone) {
  console.log(`🧠 [CONTEXTO] Cargando contexto para el cliente: ${phone}`)
  const contacto = getContactoByTelefono(phone)

  if (!contacto) {
    console.log(`- [CONTEXTO] No se encontró contacto en caché para ${phone}. Es un cliente nuevo.`)
    return null
  }

  // Extraemos el resumen y los datos del cliente, excluyendo campos técnicos o vacíos
  const datosCliente = { ...contacto }
  delete datosCliente.RESUMEN_ULTIMA_CONVERSACION
  delete datosCliente._RowNumber
  delete datosCliente.FECHA_PRIMER_CONTACTO
  delete datosCliente.FECHA_ULTIMO_CONTACTO

  const datosLimpios = Object.fromEntries(
    Object.entries(datosCliente).filter(
      ([_, valor]) =>
        valor &&
        String(valor).trim() !== '' &&
        String(valor).trim().toLowerCase() !== 'sin nombre'
    )
  )

  const contexto = {
    resumenAnterior: contacto.RESUMEN_ULTIMA_CONVERSACION || '',
    datosCliente: datosLimpios
  }

  // Solo retornamos contexto si realmente hay algo que recordar
  if (!contexto.resumenAnterior && Object.keys(contexto.datosCliente).length === 0) {
    console.log(`- [CONTEXTO] El cliente ${phone} existe pero no tiene historial o datos relevantes para recordar.`)
    return null
  }

  console.log(`- [CONTEXTO] Contexto cargado para ${phone}:`, {
    resumen: contexto.resumenAnterior ? 'Sí' : 'No',
    datos: Object.keys(contexto.datosCliente).length > 0 ? 'Sí' : 'No'
  })

  return contexto
}

/**
 * Formatea el contexto cargado en un texto claro para ser inyectado en el prompt de la IA.
 * @param {object} contexto - El objeto de contexto devuelto por cargarContextoAnterior.
 * @returns {string} Un string formateado para añadir al prompt, o un string vacío si no hay contexto.
 */
export function inyectarContextoAlPrompt(contexto) {
  if (!contexto) {
    return '' // No hay nada que inyectar
  }

  let promptAdicional = '\n\n--- INICIO CONTEXTO DEL CLIENTE ---\n'

  if (contexto.datosCliente && Object.keys(contexto.datosCliente).length > 0) {
    promptAdicional += '### DATOS DEL CLIENTE EN SISTEMA ###\n'
    for (const [clave, valor] of Object.entries(contexto.datosCliente)) {
      promptAdicional += `- ${clave.replace(/_/g, ' ')}: ${valor}\n`
    }
    promptAdicional += 'Usa estos datos para personalizar la conversación y para confirmar con el cliente si es necesario. No los pidas de nuevo si ya los tienes.\n'
  }

  if (contexto.resumenAnterior) {
    promptAdicional += '\n### RESUMEN DE LA CONVERSACIÓN ANTERIOR ###\n'
    promptAdicional += `${contexto.resumenAnterior}\n`
    promptAdicional += 'Usa este resumen para entender el historial del cliente y retomar la conversación donde la dejaron.\n'
  }

  promptAdicional += '--- FIN CONTEXTO DEL CLIENTE ---\n'

  console.log(`- [CONTEXTO] Prompt de contexto generado para la IA.`)
  return promptAdicional
}

/**
 * Utiliza la IA para generar un resumen mejorado y detallado de la conversación.
 * @param {string} historial - El historial completo de la conversación en formato de texto.
 * @param {string} phone - El número de teléfono del cliente.
 * @returns {string} El resumen generado por la IA.
 */
export async function generarResumenMejorado(historial, phone) {
  console.log(`🧠 [CONTEXTO] Generando resumen mejorado para ${phone}...`)
  const contacto = getContactoByTelefono(phone) || {}

  const prompt = `
    Eres un analista de CRM experto. Tu tarea es crear un resumen detallado y estructurado de la siguiente conversación de WhatsApp para guardarlo en el historial del cliente.

    **Historial de la Conversación:**
    ---
    ${historial}
    ---

    **Datos actuales del cliente:**
    - Nombre: ${contacto.NOMBRE || 'No disponible'}
    - Etiqueta: ${contacto.ETIQUETA || 'No disponible'}

    **Instrucciones para el Resumen:**
    1.  **Motivo Principal:** ¿Cuál fue la razón principal del contacto? (Ej: Consulta de producto, soporte, realizar un pedido).
    2.  **Productos/Servicios Discutidos:** Menciona específicamente qué productos o servicios se hablaron, incluyendo nombres, colores, tallas si aplica.
    3.  **Decisiones Clave:** ¿El cliente tomó alguna decisión? (Ej: Decidió comprar, pidió tiempo para pensar, descartó una opción).
    4.  **Acciones Pendientes:** ¿Quedó alguna tarea pendiente para el negocio o para el cliente? (Ej: El negocio debe confirmar stock, el cliente debe enviar comprobante de pago).
    5.  **Sentimiento General:** Describe brevemente el tono del cliente (Ej: Interesado, decidido, confundido, frustrado, agradecido).

    **Formato de Salida:**
    Proporciona el resumen en un formato claro y conciso, usando viñetas. NO uses formato JSON.

    **Ejemplo de Salida:**
    * **Motivo:** Cliente contactó para realizar un pedido de Zapatillas Nike.
    * **Discusión:** Se habló de las Zapatillas Nike Air Max (color rojo, talla 42) y las Adidas Ultraboost (negras).
    * **Decisión:** Confirmó la compra de las Nike Air Max.
    * **Pendientes:** El cliente quedó de enviar el comprobante de pago por Bancolombia.
    * **Sentimiento:** Decidido y amable.
  `.trim()

  try {
    const respuestaIA = await EnviarTextoOpenAI(prompt, `resumen-${phone}`, 'INFO', {})
    if (respuestaIA && respuestaIA.respuesta) {
      console.log(`- [CONTEXTO] Resumen mejorado generado exitosamente.`)
      return respuestaIA.respuesta
    }
    throw new Error('La IA no devolvió un resumen válido.')
  } catch (error) {
    console.error(`❌ [CONTEXTO] Error al generar resumen mejorado para ${phone}:`, error)
    return 'Error al generar el resumen de la conversación.'
  }
}
