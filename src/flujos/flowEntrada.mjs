// src/flujos/flowEntrada.mjs
import { addKeyword, EVENTS } from '@builderbot/bot'

// MODULOS
import { start } from './idle.mjs'
import { BOT } from '../config/bot.mjs'
import { ComprobrarListaNegra } from '../config/listaNegra.mjs'

// FLUJOS
import { flowIAinfo } from './IA/flowIAinfo.mjs'

export const flowEntrada = addKeyword(EVENTS.WELCOME).addAction(
  async (ctx, { gotoFlow }) => {
    if (!BOT.ESTADO) return
    if (ComprobrarListaNegra(ctx)) return

    start(ctx, gotoFlow, BOT.IDLE_TIME * 60)

    // 🔄 TODO se enruta primero a la IA, que luego decide si va a productos o no
    return gotoFlow(flowIAinfo)
  }
)

// El resto no cambia
export const flowEntradaAudio = addKeyword(EVENTS.VOICE_NOTE).addAction(async (ctx, { gotoFlow }) => {
  return gotoFlow(flowEntrada)
})

export const flowEntradaMedia = addKeyword(EVENTS.MEDIA).addAction(async (ctx, { gotoFlow }) => {
  return gotoFlow(flowEntrada)
})

export const flowEntradaDoc = addKeyword(EVENTS.DOCUMENT).addAction(async (ctx, { gotoFlow }) => {
  return gotoFlow(flowEntrada)
})

export const flowEntradaLoc = addKeyword(EVENTS.LOCATION).addAction(async (ctx, { gotoFlow }) => {
  return gotoFlow(flowEntrada)
})
