// app.js
import { createBot, createProvider, createFlow, MemoryDB } from '@builderbot/bot'
import { BaileysProvider } from '@builderbot/provider-baileys'
import { Inicializar, BOT } from './src/config/bot.mjs'
import { ActivarCompatLID } from './src/funciones/proveedor.mjs'

// 🔧 MODULOS DEL SISTEMA
import { APIREST } from './src/APIs/API_Rest.mjs'
import { ESTADO_CONEXION } from './src/funciones/estadoConexion.mjs'
import { PROVEEDOR, ENUNPROV } from './src/funciones/proveedor.mjs'
import { RevisarTemp, BorrarTemp } from './src/funciones/directorios.mjs'

// 💬 FLUJOS PRINCIPALES
import {
  flowEntrada,
  flowEntradaAudio,
  flowEntradaMedia,
  flowEntradaDoc,
  flowEntradaLoc
} from './src/flujos/flowEntrada.mjs'
import { idleFlow } from './src/flujos/idle.mjs'
import { flowIAinfo } from './src/flujos/IA/flowIAinfo.mjs'

// 🛍️ FLUJO DE PRODUCTOS ACTIVADO
import { flowProductos } from './src/flujos/flowProductos.mjs'

// ✅ Registro de flujos, incluyendo productos
const FLUJOS_ENTRADA = [
  flowProductos, // 🔥 Ahora sí se activa este flujo
  flowEntrada,
  flowEntradaAudio,
  flowEntradaMedia,
  flowEntradaDoc,
  flowEntradaLoc,
  idleFlow,
  flowIAinfo
]

// 🚀 ARRANQUE DE BOT
const main = async () => {
  console.log('🔧 Iniciando main()')
  const adapterDB = new MemoryDB()
  const adapterFlow = createFlow(FLUJOS_ENTRADA)
  const adapterProvider = createProvider(BaileysProvider)

  RevisarTemp()
  BorrarTemp()

  console.log('🔍 Llamando a ESTADO_CONEXION')
  ESTADO_CONEXION(adapterProvider)
  console.log('✅ ESTADO_CONEXION completado')

  PROVEEDOR.name = ENUNPROV.BAILEYS
PROVEEDOR.prov = adapterProvider

// 🔧 Activa compatibilidad LID (hotfix no intrusivo)
// Envuelve sendMessage/sendMedia con reintentos cuando el JID termine en "@lid"
ActivarCompatLID()

await Inicializar()
console.log('🚦 [app.js] BOT.PRODUCTOS después de Inicializar:', BOT.PRODUCTOS)
   console.log('🤖 Creando bot')
  const bot = await createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB
  })

  APIREST(adapterProvider)
  console.log('🌐 APIREST inicializado')

  try {
    bot.httpServer(3001)
  } catch (error) {
    console.error('❌ Error al iniciar el servidor HTTP:', error)
    throw error
  }
}

main().catch((error) => {
  console.error('❌ Error en main:', error)
  process.exit(1)
})

// Forzar redeploy - 2025-04-20 vFinalProductos
