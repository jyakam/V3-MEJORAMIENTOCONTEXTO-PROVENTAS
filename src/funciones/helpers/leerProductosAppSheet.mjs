// src/funciones/helpers/leerProductosAppSheet.mjs
import { getTable } from 'appsheet-connect'
import { APPSHEETCONFIG, BOT } from '../../config/bot.mjs'

export async function obtenerTodosLosProductosAppSheet() {
  try {
    // 👉 Aquí agregamos el log sugerido
    console.log('🚦 [leerProductosAppSheet] BOT.PRODUCTOS al intentar cargar:', BOT.PRODUCTOS);

    // 🔒 Chequeo de flag PRODUCTOS: si está desactivado, no cargar productos
    if (!BOT.PRODUCTOS) {
      console.log('🛑 [leerProductosAppSheet] Flag PRODUCTOS está en FALSE, no se solicitan productos a AppSheet.')
      return []
    }
    
    console.log('📦 Iniciando obtenerTodosLosProductosAppSheet')
    console.log('📦 Configuración:', { APPSHEETCONFIG, PAG_PRODUCTOS: BOT.PAG_PRODUCTOS })

    if (!APPSHEETCONFIG || !BOT.PAG_PRODUCTOS) {
      console.error('❌ Configuración incompleta: APPSHEETCONFIG o PAG_PRODUCTOS no están definidos')
      return []
    }

    const data = await getTable(APPSHEETCONFIG, BOT.PAG_PRODUCTOS)
    console.log(`📦 Registros brutos recibidos: ${Array.isArray(data) ? data.length : 0}`)

    if (!Array.isArray(data)) {
      console.warn('⚠️ Resultado no es un array. Retornando array vacío.')
      return []
    }

    // Limpiar campos duplicados por AppSheet
    const limpiarProducto = (p) => {
      const limpio = { ...p }
      if (Array.isArray(limpio.IMAGEN_URL)) {
        limpio.IMAGEN_URL = limpio.IMAGEN_URL.find(Boolean)
      }
      if (Array.isArray(limpio.URL_PRODUCTO)) {
        limpio.URL_PRODUCTO = limpio.URL_PRODUCTO.find(Boolean)
      }
      return limpio
    }

    const productos = data
      .filter(p => p?.NOMBRE && typeof p.NOMBRE === 'string' && p.NOMBRE.trim() !== '')
      .map(limpiarProducto)

    console.log('✅ Productos procesados y filtrados:', productos.length)
    return productos
  } catch (err) {
    console.error('❌ Error al obtener productos desde AppSheet:', err.message)
    console.error('❌ Detalle del error:', err.stack)
    return []
  }
}
