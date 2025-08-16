import 'dotenv/config'
import { OpenAI } from 'openai'
//TT MODULOS
import { Notificar, ENUM_NOTI } from '../../../config/notificaciones.mjs'
import { BOT } from '../../../config/bot.mjs'
import { EnviarMedia } from '../../../funciones/proveedor.mjs'

//TT AGREGAR CLAVE
function OpenIA() {
  if (BOT.KEY_IA) {
    return new OpenAI({
      apiKey: BOT.KEY_IA
    })
  } else {
    return new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  }
}

//TT GENERAR IMAGE IA
export async function GenerarImagen(userId, prompt) {
  try {
    const openai = OpenIA()
    // Crear imagen con DALL·E en lugar de generar texto
    const completion = await openai.images.generate({
      prompt, // El mensaje del usuario se convierte en el prompt para DALL·E
      n: 1, // Número de imágenes a generar
      size: '1024x1024' // Tamaño de la imagen
    })

    console.log(completion)
    const imageUrl = completion.data[0].url // URL de la imagen generada
    console.log('🧬 🌄 URL de la imagen generada:', imageUrl)
    const res = await EnviarMedia(userId, imageUrl)
    if (res) {
      return 'Imagen generada y enviada al usuario'
    } else {
      return 'se genero la imagen, pero no se logro enviar'
    }
  } catch (error) {
    console.error('TXT - Error al llamar a la API de OpenAI:', error)
    const msj =
      'No es posible conectar con *OpenAI(DALL·E)*, revisa la calve de la Api, o el saldo de tu cuenta'
    Notificar(ENUM_NOTI.ERROR, { msj })
    return 'no se pudo generar la imagen'
  }
}

// FF FUNCION IA
export const IAGenerarImagen = {
  name: 'GenerarImagen',
  description: 'Genera una imagen usando la inteligencia artificial de DALL·E y la envia al usuario',
  parameters: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'Texto descriptivo (prompt) para generar la imagen'
      }
    },
    required: ['prompt'],
    additionalProperties: false
  }
}
