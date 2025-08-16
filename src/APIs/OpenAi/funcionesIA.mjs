//TT MODULOS
import { BOT } from '../../config/bot.mjs'
import { EnviarTextoOpenAI } from './enviarTextoOpenAI.mjs'
import { ENUNGUIONES } from './guiones.mjs'

//TT FUNCIONES DISPONIBLES
import { IASolicitarAyuda, SolicitarAyuda } from './funciones/solicitarAyuda.mjs'
import { IAGenerarImagen, GenerarImagen } from './funciones/generarImagen.mjs'

//TT DEFINIR FUNCIONES SEGÚN GUION
export function FuncionesIA(guion) {
  switch (guion) {
    case ENUNGUIONES.INFO:
      return BOT.GENERAR_IMAGENES
        ? [IASolicitarAyuda, IAGenerarImagen]
        : [IASolicitarAyuda]

    default:
      return [] // otros guiones pueden tener otras funciones si se expanden
  }
}

//TT DETECTAR Y EJECUTAR FUNCIONES
export async function DetectarFuncion(message, userId, guion, estado) {
  if (message.function_call) {
    const nombreFuncion = message.function_call.name || 'sin_nombre'
    let functionArgs = {}

    try {
      functionArgs = JSON.parse(message.function_call.arguments || '{}')
    } catch (err) {
      console.warn('⚠️ No se pudo parsear los argumentos:', err.message)
    }

    console.log(`🧩 Se llamó a una función desde IA: ${nombreFuncion}`, functionArgs)

    let respuestaFuncion = ''

    // Ejecutar función según nombre
    if (nombreFuncion === 'SolicitarAyuda') {
      respuestaFuncion = await SolicitarAyuda(userId, functionArgs.consulta)
    } else if (nombreFuncion === 'GenerarImagen') {
      respuestaFuncion = await GenerarImagen(userId, functionArgs.prompt)
    } else {
      respuestaFuncion = '⚠️ Función no reconocida o sin implementación.'
    }

    // Enviar la respuesta al modelo como si fuera función
    const llamada = [
      message,
      {
        role: 'function',
        name: nombreFuncion,
        content: respuestaFuncion
      }
    ]

    const res = await EnviarTextoOpenAI(respuestaFuncion, userId, guion, estado, llamada)
    return res.respuesta
  }

  return message.content || ''
}