// src/flujos/IA/flowIAImagen.mjs
import 'dotenv/config'
import { addKeyword, EVENTS } from '@builderbot/bot'
import { CONTACTOS, BOT } from '../../config/bot.mjs'
import { ENUM_IA_RESPUESTAS } from '../../APIs/OpenAi/IAEnumRespuestas.mjs'
import { Escribiendo } from '../../funciones/proveedor.mjs'
import { Esperar } from '../../funciones/tiempo.mjs'
import { ENUNGUIONES } from '../../APIs/OpenAi/guiones.mjs'
import { DetectarArchivos } from '../bloques/detectarArchivos.mjs'
import { EnviarIA } from '../bloques/enviarIA.mjs'
import { cargarProductosAlState } from '../../funciones/helpers/cacheProductos.mjs'
import { filtrarPorTextoLibre } from '../../funciones/helpers/filtrarPorTextoLibre.mjs'
import { generarContextoProductosIA } from '../../funciones/helpers/generarContextoProductosIA.mjs'
import { flowProductos } from '../flowProductos.mjs'
import { flowDetallesProducto } from '../flowDetallesProducto.mjs'
import { ActualizarFechasContacto } from '../../funciones/helpers/contactosSheetHelper.mjs'
import { obtenerIntencionConsulta } from '../../funciones/helpers/obtenerIntencionConsulta.mjs'
import { flowIAinfo } from './flowIAinfo.mjs'
import { extraerNombreProducto } from '../../funciones/helpers/extractNombreProducto.mjs'

console.log('🚀 [IAIMAGEN] Cargando flowIAImagen.mjs...')

// Función para esperar productoReconocidoPorIA
async function esperarProductoReconocido(state, intentos = 20, delay = 100) {
  for (let i = 0; i < intentos; i++) {
    const reconocido = state.get('productoReconocidoPorIA') || ''
    if (reconocido.trim().length > 3) {
      console.log('✅ [esperarProductoReconocido] productoReconocidoPorIA listo:', reconocido)
      return reconocido
    }
    await Esperar(delay)
  }
  console.log('⚠️ [esperarProductoReconocido] Tiempo agotado.')
  return ''
}

// Función para limpiar productoReconocidoPorIA
async function limpiarProductoReconocido(state) {
  await state.update({ productoReconocidoPorIA: '' })
  console.log('🧹 [IAIMAGEN] productoReconocidoPorIA limpiado.')
}

export const flowIAImagen = addKeyword(EVENTS.MEDIA)
  .addAction(async (ctx, tools) => {
    const { flowDynamic, endFlow, gotoFlow, provider, state } = tools
    const phone = ctx.from.split('@')[0]
    const contacto = CONTACTOS.LISTA_CONTACTOS.find(c => c.TELEFONO === phone)

        // 🔒 Chequeo de flag PRODUCTOS: si está desactivado, salta todo el flujo especial de productos e imágenes
    if (!BOT.PRODUCTOS) {
      console.log('🛑 [IAIMAGEN] Flag PRODUCTOS está en FALSE, saltando lógica de productos e imágenes.')
      // Opcionalmente puedes dejar un mensaje especial si quieres, o simplemente responder con la IA básica:
      const res = await EnviarIA(ctx.body, ENUNGUIONES.INFO, {
        ctx, flowDynamic, endFlow, gotoFlow, provider, state, promptExtra: ''
      }, { esClienteNuevo: false, contacto: {} })
      await flowDynamic(res.respuesta || 'Mensaje recibido.')
      return endFlow()
    }

    console.log('📩 [IAIMAGEN] Mensaje de imagen recibido de:', phone)
    if (!BOT.RESPONDER_NUEVOS && !contacto) return endFlow()
    if (!contacto) {
      // Solo registra el contacto, no actualiza datos de contacto aquí
      console.log('👤 [IAIMAGEN] Contacto nuevo registrado:', phone)
    }

    if (contacto) await ActualizarFechasContacto(contacto, phone)

    if (!state.get('_productosFull')?.length) {
      await cargarProductosAlState(state)
      await state.update({ __productosCargados: true })
      console.log('📦 [IAIMAGEN] Productos cargados en cache para:', phone)
    }

    // Detectar archivos
    const detectar = await DetectarArchivos(ctx, state)
    await Esperar(100)
    const tipoMensaje = state.get('tipoMensaje')
    console.log('🔍 [IAIMAGEN] Valor de tipoMensaje obtenido:', tipoMensaje)
    console.log('🔍 [IAIMAGEN] Estado después de DetectarArchivos:', {
      tipoMensaje,
      productoReconocidoPorIA: state.get('productoReconocidoPorIA'),
      archivos: state.get('archivos')
    })

    if (tipoMensaje !== 1) {
      console.log('⚠️ [IAIMAGEN] Tipo de mensaje no es imagen, redirigiendo a flowIAinfo.')
      return gotoFlow(flowIAinfo)
    }

    console.log('📸 [IAIMAGEN] Procesando imagen de producto...')
    const estado = {
      esClienteNuevo: !contacto || contacto.NOMBRE === 'Sin Nombre',
      contacto: contacto || {}
    }

    // Procesar imagen con IA
    console.log('🔍 [DEBUG] Llamando a EnviarIA para procesar imagen...')
    const resIA = await EnviarIA(ctx.body, ENUNGUIONES.INFO, {
      ctx, flowDynamic, endFlow, gotoFlow, provider, state, promptExtra: ''
    }, estado)
    console.log('🔍 [DEBUG] EnviarIA completado, respuesta:', resIA?.respuesta)

    // Recargar _productosFull si state fue limpiado
    if (!state.get('_productosFull')?.length) {
      await cargarProductosAlState(state)
      console.log('📦 [IAIMAGEN] _productosFull recargado después de EnviarIA.')
    }

    // Esperar productoReconocidoPorIA
    const productoReconocido = await esperarProductoReconocido(state)
    console.log('🔍 [DEBUG] productoReconocidoPorIA obtenido después de espera:', productoReconocido)

    // Usar productoReconocidoPorIA, resIA.respuesta o ctx.body como fallback
    const textoFinal = productoReconocido || extraerNombreProducto(resIA?.respuesta) || ctx.body
    console.log('🧾 [IAIMAGEN] Texto agrupado final para intención:', textoFinal)

    if (!textoFinal) {
      console.log('🚫 [IAIMAGEN] No se reconoció producto en la imagen, procesando respuesta normal.')
      await manejarRespuestaIA(resIA, ctx, flowDynamic, gotoFlow, state, ctx.body)
      await limpiarProductoReconocido(state)
      // Redirigir a flowIAinfo para mensajes posteriores
      console.log('🔄 [IAIMAGEN] Imagen procesada, redirigiendo a flowIAinfo.')
      return gotoFlow(flowIAinfo)
    }

    // Procesar consulta de producto
    console.log('🔍 [DEBUG] textoFinal antes de obtenerProductosCorrectos:', textoFinal)
    const productos = await obtenerProductosCorrectos(textoFinal, state)
    if (productos.length) {
      await state.update({ productosUltimaSugerencia: productos })
      const promptExtra = generarContextoProductosIA(productos, state)
      console.log(`📦 [IAIMAGEN] ${productos.length} productos encontrados para textoFinal:`, textoFinal)
      // Reprocesar respuesta de IA con contexto de productos
      const resIAConProductos = await EnviarIA(textoFinal, ENUNGUIONES.INFO, {
        ctx, flowDynamic, endFlow, gotoFlow, provider, state, promptExtra
      }, estado)
      if (resIAConProductos) {
        await manejarRespuestaIA(resIAConProductos, ctx, flowDynamic, gotoFlow, state, textoFinal)
      } else {
        console.log('⚠️ [IAIMAGEN] resIAConProductos no válido, usando resIA como fallback.')
        await manejarRespuestaIA(resIA, ctx, flowDynamic, gotoFlow, state, textoFinal)
      }
    } else {
      await manejarRespuestaIA(resIA, ctx, flowDynamic, gotoFlow, state, textoFinal)
    }

    // Limpiar productoReconocidoPorIA
    await limpiarProductoReconocido(state)

    // Validar estado antes de redirigir
    console.log('🔍 [IAIMAGEN] Estado antes de redirigir a flowIAinfo:', {
      tipoMensaje: state.get('tipoMensaje'),
      productoReconocidoPorIA: state.get('productoReconocidoPorIA'),
      productosUltimaSugerencia: state.get('productosUltimaSugerencia')?.length
    })

    // Redirigir a flowIAinfo para mensajes posteriores
    console.log('🔄 [IAIMAGEN] Imagen procesada, redirigiendo a flowIAinfo.')
    return gotoFlow(flowIAinfo)
  })

// ... (resto igual)
