// src/flujos/flowDetallesProducto.mjs
import { addKeyword } from '@builderbot/bot'
import { organizarProductosAgrupados } from '../funciones/helpers/organizarProductosAgrupados.mjs'
import { generarMensajesParaProductos } from '../funciones/helpers/presentarProductos.mjs'
import { Esperar } from '../funciones/tiempo.mjs'

export const flowDetallesProducto = addKeyword([]).addAction(
  async (ctx, { state, flowDynamic, endFlow }) => {
     // 🔒 Chequeo de flag PRODUCTOS: si está desactivado, termina el flujo inmediatamente
    if (!BOT.PRODUCTOS) {
      console.log('🛑 [flowDetallesProducto] Flag PRODUCTOS está en FALSE, saltando todo el flujo de detalles.')
      await flowDynamic('Esta funcionalidad no está disponible en este momento.')
      return endFlow()
    }
    const userMsg = ctx.body?.toLowerCase()?.trim()
    const { productosMostrados = [] } = state.getMyState() || {}

    console.log('🟡 [flowDetallesProducto] Mensaje recibido:', userMsg)
    console.log('📦 [flowDetallesProducto] ProductosMostrados en state:', productosMostrados.map(p => p.NOMBRE))

    if (!productosMostrados.length) {
      await flowDynamic('Primero necesito mostrarte algunos productos antes de darte más detalles. ¿Quieres verlos?')
      console.log('⚠️ [flowDetallesProducto] No hay productosMostrados en el state.')
      return endFlow()
    }

    const producto = productosMostrados.find(p => {
      const nombre = p.NOMBRE?.toLowerCase?.() || ''
      const matchNombre = userMsg.includes(nombre)

      const matchCampos = Object.values(p)
        .filter(v => typeof v === 'string')
        .some(v => userMsg.includes(v.toLowerCase()))

      return matchNombre || matchCampos
    })

    if (!producto) {
      await flowDynamic('No encontré el producto que mencionas. 😔 ¿Puedes darme un poco más de detalle?')
      console.log('🚫 [flowDetallesProducto] No se encontró match con productosMostrados.')
      return endFlow()
    }

    console.log('✅ [flowDetallesProducto] Producto detectado para detalle:', producto.NOMBRE)

    const agrupado = organizarProductosAgrupados([producto])[0]
    const mensajes = generarMensajesParaProductos([agrupado], state, true) // detalles = true

    for (const m of mensajes) {
      await flowDynamic(m)
      await Esperar(300)
    }

    await flowDynamic('¿Te gustaría ver otras opciones también? 😊')
    return endFlow()
  }
)
