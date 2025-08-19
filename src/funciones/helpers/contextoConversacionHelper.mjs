// Archivo: src/funciones/helpers/contextoConversacionHelper.mjs

import { getContactoByTelefono } from './cacheContactos.mjs'
import { EnviarTextoOpenAI } from '../../APIs/OpenAi/enviarTextoOpenAI.mjs'

/**
 * Carga el contexto anterior de un cliente, incluyendo los 3 últimos resúmenes.
 * @param {string} phone - El número de teléfono del cliente.
 * @returns {object|null} Un objeto con los resúmenes y datos del cliente, o null si no hay nada que cargar.
 */
export async function cargarContextoAnterior(phone) {
  console.log(`🧠 [CONTEXTO] Cargando contexto para el cliente: ${phone}`)
  const contacto = getContactoByTelefono(phone)

  if (!contacto) {
    console.log(`- [CONTEXTO] No se encontró contacto en caché para ${phone}. Es un cliente nuevo.`)
    return null
  }

  // Extraemos los datos y los 3 resúmenes
  const datosCliente = { ...contacto }
  delete datosCliente.RESUMEN_ULTIMA_CONVERSACION
  delete datosCliente.RESUMEN_2
  delete datosCliente.RESUMEN_3
  delete datosCliente._RowNumber

  const datosLimpios = Object.fromEntries(
    Object.entries(datosCliente).filter(
      ([_, valor]) =>
        valor &&
        String(valor).trim() !== '' &&
        String(valor).trim().toLowerCase() !== 'sin nombre'
    )
  )

  const contexto = {
    resumen1: contacto.RESUMEN_ULTIMA_CONVERSACION || '',
    resumen2: contacto.RESUMEN_2 || '',
    resumen3: contacto.RESUMEN_3 || '',
    datosCliente: datosLimpios
  }

  // Solo retornamos contexto si realmente hay algo que recordar
  if (!contexto.resumen1 && !contexto.resumen2 && !contexto.resumen3 && Object.keys(contexto.datosCliente).length === 0) {
    console.log(`- [CONTEXTO] El cliente ${phone} existe pero no tiene historial o datos relevantes para recordar.`)
    return null
  }

  console.log(`- [CONTEXTO] Contexto cargado para ${phone}.`)
  return contexto
}

/**
 * Formatea el contexto cargado en un texto claro para ser inyectado en el prompt de la IA.
 * Incluye las frases introductorias que solicitaste.
 * @param {object} contexto - El objeto de contexto devuelto por cargarContextoAnterior.
 * @returns {string} Un string formateado para añadir al prompt, o un string vacío si no hay contexto.
 */
export function inyectarContextoAlPrompt(contexto) {
  if (!contexto) {
    return '' // No hay nada que inyectar
  }

  let promptAdicional = '\n\n--- INICIO CONTEXTO DEL CLIENTE ---\n'

  // Frase introductoria para los datos del cliente
  if (contexto.datosCliente && Object.keys(contexto.datosCliente).length > 0) {
    promptAdicional += 'El cliente que estás atendiendo en este momento tiene los siguientes datos en sistema:\n'
    for (const [clave, valor] of Object.entries(contexto.datosCliente)) {
      promptAdicional += `- ${clave.replace(/_/g, ' ')}: ${valor}\n`
    }
    promptAdicional += 'Usa estos datos para personalizar la conversación y para confirmar con el cliente si es necesario. No los pidas de nuevo si ya los tienes.\n'
  }

  // Frase introductoria para el historial de resúmenes
  const tieneResumenes = contexto.resumen1 || contexto.resumen2 || contexto.resumen3
  if (tieneResumenes) {
    promptAdicional += '\nEste cliente es antiguo. Las últimas veces que hablaste con él ha sido de esto:\n'
    if (contexto.resumen1) {
      promptAdicional += `\n--- RESUMEN MÁS RECIENTE ---\n${contexto.resumen1}\n`
    }
    if (contexto.resumen2) {
      promptAdicional += `\n--- RESUMEN INTERMEDIO ---\n${contexto.resumen2}\n`
    }
    if (contexto.resumen3) {
      promptAdicional += `\n--- RESUMEN MÁS ANTIGUO ---\n${contexto.resumen3}\n`
    }
    promptAdicional += '\nUsa estos resúmenes para entender el historial del cliente y retomar la conversación donde la dejaron.\n'
  }

  promptAdicional += '--- FIN CONTEXTO DEL CLIENTE ---\n'

  console.log(`- [CONTEXTO] Prompt de contexto generado para la IA.`)
  return promptAdicional
}

/**
 * Utiliza la IA para generar un resumen mejorado y detallado, añadiéndole la fecha actual.
 * @param {string} historial - El historial completo de la conversación en formato de texto.
 * @param {string} phone - El número de teléfono del cliente.
 * @returns {string} El resumen generado por la IA con fecha.
 */
// BLOQUE DE CÓDIGO TEMPORAL PARA DIAGNÓSTICO
export async function generarResumenMejorado(historial, phone) {
  console.log(`🚧 [PRUEBA DE DIAGNÓSTICO] Generando resumen de prueba simple para ${phone}...`)
  
  // En lugar de llamar a la IA, devolvemos un texto simple y plano.
  const resumenDePrueba = "Resumen de prueba exitoso. No se encontraron errores."
  
  console.log(`- [PRUEBA DE DIAGNÓSTICO] Resumen de prueba generado.`)
  return resumenDePrueba
}
