// src/funciones/helpers/traducirTexto.mjs
import { EnviarTextoOpenAI } from '../../APIs/OpenAi/enviarTextoOpenAI.mjs'

/**
 * Traduce un texto al español utilizando la IA ya integrada.
 *
 * @param {string} texto - El texto original a traducir.
 * @returns {Promise<string>} - Texto traducido al español.
 */
export async function traducirTexto(texto) {
    try {
        const prompt = `
Eres un traductor profesional. Recibirás un nombre de producto tal cual aparece en una etiqueta o empaque.

Tu única tarea es traducirlo de cualquier idioma al español, manteniendo su sentido comercial.

Devuelve solo el nombre traducido, sin añadir explicaciones ni texto adicional.

Texto a traducir:
"${texto}"
`.trim()

        console.log('📡 [traducirTexto] Solicitando traducción a IA...')
        const respuestaIA = await EnviarTextoOpenAI(prompt, 'traduccion', 'INFO', {})
        const traduccion = respuestaIA.respuesta?.trim() || ''
        console.log(`✅ [traducirTexto] Traducción recibida: ${traduccion}`)
        return traduccion

    } catch (error) {
        console.error('❌ [traducirTexto] Error al traducir:', error)
        return texto // fallback → devuelve el original si falla
    }
}
