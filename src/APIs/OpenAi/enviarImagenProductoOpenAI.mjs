import { OpenAI } from 'openai'
import { BOT } from '../../config/bot.mjs'

function OpenIA() {
  return new OpenAI({
    apiKey: BOT.KEY_IA || process.env.OPENAI_API_KEY
  })
}

export async function enviarImagenProductoOpenAI(fileBuffer) {
  try {
    if (!fileBuffer) {
      console.error('❌ [enviarImagenProductoOpenAI] Imagen vacía.')
      return ''
    }

    const base64Image = fileBuffer.toString('base64')

    const openai = OpenIA()
    const completion = await openai.chat.completions.create({
      model: BOT.MODELO_IA_IMAGENES,
      messages: [
        { role: "system", content: "Identifica el nombre exacto del producto en la imagen enviada. Si no es un producto, responde exactamente: 'No es un producto'." },
        { role: "user", content: [{ type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }] }
      ],
      max_tokens: 100,
      temperature: 0.2
    })

    const respuesta = completion.choices?.[0]?.message?.content?.trim() || ''
    if (respuesta.toLowerCase().includes('no es un producto')) {
      return ''
    }

    console.log('📷 [enviarImagenProductoOpenAI] Producto detectado:', respuesta)
    return respuesta

  } catch (error) {
    console.error('❌ [enviarImagenProductoOpenAI] Error:', error)
    return ''
  }
}
