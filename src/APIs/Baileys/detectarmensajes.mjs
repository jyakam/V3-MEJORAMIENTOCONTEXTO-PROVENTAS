//TT MODULOS
import { MensajeEntrante, MensajeSaliente } from '../../funciones/CRM/controlMensajes.mjs'

//TT DETECTAR MENSAJES
export function DetectarMensajes(baileys, bot) {
  //console.log(baileys)
  baileys.on('message', (ctx) => {
    console.log('💬 mensaje entrante', ctx.body)
    MensajeEntrante(ctx)
  })
  bot.on('send_message', (msj) => {
    console.log('💬 mensaje saliente', msj.answer)
    MensajeSaliente(msj.answer, msj.from)
  })
  /*
  baileys.on('require_action', (req) => {
    console.log('require_action', req)
  })
  baileys.on('notice', (req) => {
    console.log('notice', req)
  })
  baileys.on('auth_failure', (req) => {
    console.log('auth_failure', req)
  })
  baileys.on('host', (req) => {
    console.log('host', req)
  })*/
}
