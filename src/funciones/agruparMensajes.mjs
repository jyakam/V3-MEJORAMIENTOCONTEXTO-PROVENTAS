//TT MODULOS
import { BOT } from '../config/bot.mjs'

const ESTADOS = {}

function EstadoInicial(id) {
  if (!ESTADOS[id]) {
    ESTADOS[id] = {
      queue: [],
      timer: null,
      callback: null
    }
  }
  return ESTADOS[id]
}

function BorrarEstado(id) {
  ESTADOS[id] = null
}

function ReiniciarTemporizador(state) {
  if (state.timer) {
    clearTimeout(state.timer)
  }
  state.timer = null
}

function ProcesarCola(state) {
  const resultado = state.queue.join(' ')
  console.log('Mensajes acumulados:', resultado)
  return resultado
}

//TT ENCOLAR MENSAJES
export function AgruparMensaje(ctx, callback) {
  let state = EstadoInicial(ctx.from)

  console.log(`num: ${ctx.from} Encolando mjs:`, ctx.body)

  ReiniciarTemporizador(state)
  state.queue.push(ctx.body)
  state.callback = callback

  state.timer = setTimeout(() => {
    const resultado = ProcesarCola(state)
    if (state.callback) {
      state.callback(resultado, ctx)
      state.callback = null
      state = null
      BorrarEstado(ctx.from)
    }
  }, BOT.ESPERA_MJS * 1000 || 5000)
}
