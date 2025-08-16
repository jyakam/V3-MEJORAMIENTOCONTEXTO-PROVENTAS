import { EnviarTextoOpenAI } from '../../APIs/OpenAi/enviarTextoOpenAI.mjs'

/**
 * Evalúa si el mensaje de usuario es una consulta de productos/servicios
 * o una continuación de una conversación anterior sobre productos.
 *
 * @param {string} mensaje - Texto actual del usuario.
 * @param {string} ultimaConsulta - Texto de la última consulta hecha.
 * @param {object} state - Estado del flujo (acceder a flags de imagen).
 * @returns {Promise<{ esConsultaProductos: boolean, esContinuacion: boolean }>} Resultado de la evaluación.
 */
export async function obtenerIntencionConsulta(mensaje, ultimaConsulta, state = null) {
  try {
    // 👇 NUEVO: Priorizar si hubo producto detectado en imagen
    if (state && state.get('productoDetectadoEnImagen') === true) {
      console.log('📸 [obtenerIntencionConsulta] Producto detectado en imagen → Forzar esConsultaProductos = true')
      return { esConsultaProductos: true, esContinuacion: false }
    }

    const prompt = 
`Eres un analista experto en conversaciones de clientes por WhatsApp para una tienda que vende productos físicos (ej. tratamientos capilares, suplementos, ropa, calzado, tecnología, etc.).

Actúas como un **asesor de ventas, soporte y servicio al cliente**.

Tu tarea es:

1. Detectar si el cliente está preguntando por productos.
   Esto incluye cuando el cliente menciona:

- Nombres de productos, ingredientes, categorías o marcas
- Beneficios, síntomas, dolencias, necesidades (“me cae el cabello”, “tengo alopecia”, “piel seca”)
- Precios, promociones, membresía, puntos acumulables
- Instrucciones de uso, efectos, resultados esperados
- Solicita fotos, enlaces, más detalles

🟢 Ejemplos válidos:
✅ "Qué vitaminas tienes para la caída"
✅ "Tienes algo para el frizz?"
✅ "Cuántos puntos acumulo si compro el kit de 3 meses?"
✅ "Muestrame imágenes del tratamiento intensivo"
✅ "Cómo se usa ese shampoo que mencionaste?"

2. Detectar si el mensaje es una continuación (por ejemplo: “cuánto cuesta”, “ese sí me gusta”, “y qué contiene?”).

3. ⚠️ Solo debes marcar como "NO es consulta de productos" cuando el cliente:
- Pide hablar con el dueño
- Habla de temas administrativos (facturación, horarios, pagos, soporte de errores)
- Menciona problemas logísticos (envíos, cobertura, reclamos)
- Saluda sin contexto (“hola”, “buenas tardes”) o da datos personales

🛑 Ejemplos válidos de no-producto:
❌ “Cuál es el horario de atención?”
❌ “Necesito una factura a nombre de Juan Pérez”
❌ “Dónde está ubicada la tienda?”
❌ “Hola, soy María”

Analiza:
- Mensaje actual: "${mensaje}"
- Última consulta: "${ultimaConsulta || ''}"

Responde SOLO este JSON:
{
  "esConsultaProductos": true o false,
  "esContinuacion": true o false
}`.trim()

    console.log('📡 [obtenerIntencionConsulta] Enviando prompt a IA...')
    const respuestaIA = await EnviarTextoOpenAI(prompt, 'intencion', 'INFO', {})
    const parsed = JSON.parse(respuestaIA.respuesta || '{}')
    const result = {
      esConsultaProductos: parsed.esConsultaProductos || false,
      esContinuacion: parsed.esContinuacion || false
    }
    console.log('📥 [obtenerIntencionConsulta] Resultado IA:', result)
    return result
  } catch (error) {
    console.error('❌ [obtenerIntencionConsulta] Error procesando intención:', error)
    return { esConsultaProductos: false, esContinuacion: false }
  }
}
