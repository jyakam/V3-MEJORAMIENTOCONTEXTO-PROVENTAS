import 'dotenv/config'
import { OpenAI } from 'openai'

//TT MODULOS
import { ENUM_IA_RESPUESTAS } from './IAEnumRespuestas.mjs'
import { DetectarFuncion, FuncionesIA } from './funcionesIA.mjs'
import { ObtenerHistorial } from './historial.mjs'
import { Notificar, ENUM_NOTI } from '../../config/notificaciones.mjs'
import { BOT, MENSAJES } from '../../config/bot.mjs'

//TT INSTANCIA DE OPENAI
function OpenIA() {
  return new OpenAI({
    apiKey: BOT.KEY_IA || process.env.OPENAI_API_KEY
  })
}

//TT FUNCION PRINCIPAL
export async function EnviarImagenOpenAI(paquete, userId, guion, estado, llamada = null) {
  try {
    // Validación de entrada
    if (!paquete || typeof paquete !== 'object') {
      throw new Error('❌ El paquete de imagen está vacío o es inválido.')
    }

    const historial = ObtenerHistorial(userId, guion, estado)
    historial.push(paquete)

    const openai = OpenIA()

   const funciones = FuncionesIA(guion);

const completionParams = {
  model: BOT.MODELO_IA_IMAGENES,
  messages: historial,
  max_tokens: BOT.TOKENS_IMAGENES,
  temperature: BOT.TEMPERATURA
};

// Solo agrega "functions" y "function_call" si hay funciones disponibles
if (funciones && funciones.length > 0) {
  completionParams.functions = funciones;
  completionParams.function_call = 'auto';
}

// Aquí cierras el bloque de parámetros y haces la llamada:
const completion = await openai.chat.completions.create(completionParams);

    const message = completion.choices?.[0]?.message
    if (!message) throw new Error('❌ No se recibió mensaje de respuesta.')

    const respuesta = await DetectarFuncion(message, userId, guion, estado)

    // Guardar respuesta en historial
    historial.push({ role: 'assistant', content: respuesta })

    return { respuesta, tipo: ENUM_IA_RESPUESTAS.TEXTO }

  } catch (error) {
    console.error('🧠❌ Error al procesar imagen con OpenAI:', error)
    const msj = 'No fue posible procesar la imagen con la IA. Revisa la clave API, modelo o estructura.'
    Notificar(ENUM_NOTI.ERROR, { msj })
    return { respuesta: MENSAJES.ERROR || '⚠️ Lo siento, ocurrió un error procesando la imagen.', tipo: ENUM_IA_RESPUESTAS.TEXTO }
  }
}
