// src/funciones/helpers/extractNombreProducto.mjs
import { EnviarTextoOpenAI } from '../../APIs/OpenAi/enviarTextoOpenAI.mjs'

export async function extraerNombreProducto(respuesta = '') {
  try {
    if (!respuesta.trim()) return ''

    // Prompt para OpenAI que detecta el nombre del producto en cualquier idioma y contexto
    const prompt = `
      Dado el siguiente texto, identifica el nombre del producto mencionado, si lo hay. 
      El texto puede estar en cualquier idioma y puede incluir preguntas sobre precio, tamaño, sabores, preparación, etc.
      Devuelve solo el nombre del producto (sin descripciones ni detalles adicionales). 
      Si no se menciona un producto, devuelve una cadena vacía.
      
      Texto: "${respuesta}"
      
      Respuesta esperada: <nombre del producto o "" si no hay producto>
    `

    // Enviar el prompt a OpenAI con guion explícito
    const res = await EnviarTextoOpenAI(prompt, 'system', { system: 'Eres un asistente que identifica nombres de productos.' }, {})
    const nombreProducto = res?.respuesta?.trim() || ''
    const cleanResult = nombreProducto.replace(/^["']|["']$/g, '').trim()

    // Validar que el resultado sea razonable (mínimo 3, máximo 100 caracteres)
    if (cleanResult.length >= 3 && cleanResult.length <= 100) {
      console.log(`✅ [extractNombreProducto] Producto detectado: ${cleanResult}`)
      return cleanResult
    }

    console.log('⚠️ [extractNombreProducto] No se detectó producto en:', respuesta)
    return ''
  } catch (error) {
    console.error('❌ [extractNombreProducto] Error al procesar respuesta:', error)
    return ''
  }
}
