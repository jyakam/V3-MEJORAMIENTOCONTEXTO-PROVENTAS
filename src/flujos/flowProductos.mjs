// src/flujos/flowProductos.mjs
import { addKeyword } from '@builderbot/bot'
import { obtenerTodosLosProductosAppSheet } from '../funciones/helpers/leerProductosAppSheet.mjs'
import { filtrarProductos } from '../funciones/helpers/filtrarProductos.mjs'
import { organizarProductosAgrupados } from '../funciones/helpers/organizarProductosAgrupados.mjs'
import { generarMensajesParaProductos } from '../funciones/helpers/presentarProductos.mjs'
import { Esperar } from '../funciones/tiempo.mjs'
import { BOT } from '../config/bot.mjs'

export const flowProductos = addKeyword(['🧩 MostrarProductos', '🧩 MostrarDetalles']).addAction(
  async (ctx, { flowDynamic, endFlow, state }) => {
        // 🔒 Chequeo de flag PRODUCTOS: si está desactivado, termina el flujo inmediatamente
    if (!BOT.PRODUCTOS) {
      console.log('🛑 [flowProductos] Flag PRODUCTOS está en FALSE, saltando todo el flujo de productos.')
      await flowDynamic('Esta funcionalidad no está disponible en este momento.')
      return endFlow()
    }
    try {
      const estado = state.getMyState() || {}
      const consulta = estado.ultimaConsulta || ctx.body?.toLowerCase()?.trim() || ''
      const rawText = ctx.message?.text || ''
      const token = rawText.includes('🧩 MostrarProductos') ? 'MostrarProductos'
                  : rawText.includes('🧩 MostrarDetalles') ? 'MostrarDetalles'
                  : ''

      console.log(`📥 [flowProductos] Token recibido: ${token}`)
      console.log(`📥 [flowProductos] Consulta del usuario: "${consulta}"`)

      if (!token) return endFlow()

      let productos = state.get('_productosFull')
      if (!Array.isArray(productos) || !productos.length) {
        console.log('📦 [flowProductos] Cargando productos desde AppSheet...')
        productos = await obtenerTodosLosProductosAppSheet()
        await state.update({ _productosFull: productos })
      }

      if (!productos?.length) {
        console.log('⚠️ [flowProductos] No hay productos disponibles en memoria ni en AppSheet.')
        await flowDynamic('No encontré productos disponibles en este momento. 😔')
        return endFlow()
      }

      const productosFiltrados = filtrarProductos(productos, consulta)
      const agrupados = organizarProductosAgrupados(productosFiltrados)

      console.log(`🔍 [flowProductos] Productos filtrados: ${productosFiltrados.length}`)
      console.log(`📚 [flowProductos] Grupos de productos organizados: ${agrupados.length}`)

      if (token === 'MostrarProductos') {
        if (!agrupados.length) {
          console.log('❓ [flowProductos] No hubo coincidencias exactas, mostrando sugerencias.')
          await flowDynamic('No encontré opciones exactas, pero dame un momento y te ayudo con algo parecido. 😊')
          return endFlow()
        }

        const mensajes = generarMensajesParaProductos(agrupados)
        for (const m of mensajes) {
          await flowDynamic(m)
          await Esperar(200)
        }

        await flowDynamic('¿Te gustaría que te separe alguno de estos? 😊')
      }

      if (token === 'MostrarDetalles') {
        const p = productosFiltrados[0]
        if (!p) {
          console.log('⚠️ [flowProductos] No se encontró el producto solicitado en detalles.')
          await flowDynamic('No encontré el producto que mencionas. 😔 ¿Puedes darme más detalles?')
          return endFlow()
        }

        if (p.IMAGEN_URL) await flowDynamic({ body: '', media: p.IMAGEN_URL })

        let detalles = `🧾 Detalles de *${p.NOMBRE}*:\n`
        const omitidas = ['_RowNumber', 'NOMBRE', 'IMAGEN_URL', 'URL_PRODUCTO']

        for (const [k, v] of Object.entries(p)) {
          if (!omitidas.includes(k) && v && typeof v === 'string') {
            const label = k.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
            detalles += `- ${label}: ${v}\n`
          }
        }

        await flowDynamic(detalles)
      }

      await state.update({ ultimaConsulta: consulta, productosMostrados: productosFiltrados })
      return endFlow()
    } catch (err) {
      console.error('💥 [flowProductos] Error al mostrar productos:', err)
      await flowDynamic('Ocurrió un error al buscar productos. ¿Querés intentar de nuevo? 😔')
      return endFlow()
    }
  }
)
