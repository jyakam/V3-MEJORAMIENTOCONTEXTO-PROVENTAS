import { organizarProductosAgrupados } from './organizarProductosAgrupados.mjs'
import { generarMensajesParaProductos } from './presentarProductos.mjs'

export function generarContextoProductosIA(productos = [], state = null) {
  if (!Array.isArray(productos) || productos.length === 0) {
    console.log('⚠️ [contextoIA] No hay productos para generar contexto.')
    return ''
  }

  const agrupados = organizarProductosAgrupados(productos).slice(0, 5)
  const mensajes = generarMensajesParaProductos(agrupados, state, false)

  const textoPlano = mensajes
    .map(m => {
      if (typeof m === 'string') return m
      if (typeof m === 'object' && m.media) return `📷 Imagen del producto: ${m.media}`
      return ''
    })
    .filter(Boolean)
    .join('\n\n')

  const contexto = `🧠 Estos son algunos productos reales del inventario. Úsalos como referencia para tus respuestas.\n\n${textoPlano}\n\n✅ Fin de lista de productos.`
  console.log('🧠 [contextoIA] Contexto generado:\n', contexto)
  return contexto.trim()
}
