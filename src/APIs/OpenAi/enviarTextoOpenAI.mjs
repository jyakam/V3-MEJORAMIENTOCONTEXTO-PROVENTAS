import 'dotenv/config'
import { OpenAI } from 'openai'

//TT MODULOS
import { ENUM_IA_RESPUESTAS } from './IAEnumRespuestas.mjs'
import { DetectarFuncion, FuncionesIA } from './funcionesIA.mjs'
import { ObtenerHistorial } from './historial.mjs'
import { Notificar, ENUM_NOTI } from '../../config/notificaciones.mjs'
import { BOT, MENSAJES } from '../../config/bot.mjs'

//TT AGREGAR CLAVE
function OpenIA() {
  return new OpenAI({
    apiKey: BOT.KEY_IA || process.env.OPENAI_API_KEY
  })
}

//TT LLAMAR IA
export async function EnviarTextoOpenAI(msj, userId, guion, estado, llamada = null) {
  try {
    const _historial = ObtenerHistorial(userId, guion, estado)

    if (!_historial.length || !_historial[0] || _historial[0].role !== 'system') {
      _historial.unshift({
        role: 'system',
        content: 'Eres un asistente virtual que ayuda a los clientes a resolver sus dudas y procesar solicitudes.'
      });
    }

    if (!llamada) {
      _historial.push({ role: 'user', content: msj })
    } else {
      if (Array.isArray(llamada)) {
        _historial.push(...llamada)
      } else if (typeof llamada === 'object') {
        _historial.push(llamada)
      }
    }

    const mensajesUserAssistant = _historial.slice(1).filter(
      m => m.role === 'user' || m.role === 'assistant'
    )
    const ultimosTurnos = mensajesUserAssistant.slice(-8)
    const historialFinal = [_historial[0], ...ultimosTurnos]

    const openai = OpenIA()
    const request = {
      model: BOT.MODELO_IA,
      messages: historialFinal,
      max_tokens: BOT.TOKENS,
      temperature: BOT.TEMPERATURA
    }

    const funciones = FuncionesIA(guion)
    if (Array.isArray(funciones) && funciones.length > 0) {
      request.functions = funciones
      request.function_call = 'auto'
    }

    // ✅✅✅ INICIO: BLOQUE DE LOGS ROBUSTO (VERSIÓN FINAL) ✅✅✅
    console.log('================= [PROMPT ENVIADO A OPENAI] =================');
    console.log(`[DEBUG] Historial final con ${historialFinal.length} mensajes.`);
    
    let totalChars = 0;
    historialFinal.forEach((m, idx) => {
        let preview = '';
        let contentLength = 0;

        // Verificamos si el contenido es texto, se procesa.
        if (typeof m.content === 'string') {
            preview = m.content.substring(0, 100).replace(/\n/g, ' ');
            contentLength = m.content.length;
        } 
        // Si es una lista (Array), es un mensaje de imagen, se busca la parte de texto de forma segura.
        else if (Array.isArray(m.content)) {
            preview = '[Mensaje con imagen]';
            const textPart = m.content.find(p => p.type === 'text');
            // IMPORTANTE: Se verifica la propiedad correcta ".text" en lugar de ".content".
            if (textPart && typeof textPart.text === 'string') {
                contentLength = textPart.text.length;
            }
        }

        totalChars += contentLength;
        const dots = contentLength > 100 ? '... [truncado]' : '';
        console.log(`[${idx}] (${m.role}) [${contentLength} chars]: "${preview}${dots}"`);
    });

    console.log('Longitud total del prompt (caracteres):', totalChars);
    console.log('===========================================================');
    // ✅✅✅ FIN: BLOQUE DE LOGS ROBUSTO (VERSIÓN FINAL) ✅✅✅

    const completion = await openai.chat.completions.create(request)

    const message = completion.choices?.[0]?.message
    if (!message) throw new Error('❌ La IA no devolvió ninguna respuesta válida.')

    const respuesta = await DetectarFuncion(message, userId, guion, estado)
    _historial.push({ role: 'assistant', content: respuesta })

    return { respuesta, tipo: ENUM_IA_RESPUESTAS.TEXTO }
  } catch (error) {
    console.error('💥 TXT - Error al llamar a la API de OpenAI:', error)
    const msj = '⚠️ No es posible conectar con *OpenAI (TXT)*. Revisa la clave de API, tokens o el saldo de la cuenta.'
    Notificar(ENUM_NOTI.ERROR, { msj })
    return { respuesta: MENSAJES.ERROR || '❌ No pude procesar tu solicitud, por favor intentá más tarde.', tipo: ENUM_IA_RESPUESTAS.TEXTO }
  }
}
