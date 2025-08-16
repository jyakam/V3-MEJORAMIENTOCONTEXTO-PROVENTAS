//TT MODULOS
import { ConstrurGuion } from './guiones.mjs'

// TT HISTORIAL
let HistorialConv = {}

/**
 * Devuelve el historial de conversación para un usuario.
 * Si no existe, lo crea con el system prompt generado por el guion.
 */
export function ObtenerHistorial(userId, guion, estado) {
  // Ahora 'guion' ES el system prompt real (con el paso correcto de la BC)
  const _txt = guion || 'Eres un asistente conversacional.'
  if (!HistorialConv[userId] || !Array.isArray(HistorialConv[userId])) {
    HistorialConv[userId] = []
    HistorialConv[userId].push({ role: 'system', content: _txt })
  } else {
    HistorialConv[userId][0] = { role: 'system', content: _txt }
  }
  return HistorialConv[userId]
}

/**
 * Borra los últimos 2 mensajes del historial del usuario.
 */
export function BorrarMensajes(userId) {
  if (HistorialConv[userId] && HistorialConv[userId].length > 1) {
    HistorialConv[userId].splice(-2)
  }
}

/**
 * Limpia el historial completo de un usuario o de todos.
 */
export function LimpiarHistorial(userId = 'all') {
  if (userId === 'all') {
    HistorialConv = {}
    return
  }
  console.log('🧼 Limpieza de historial para:', userId)
  delete HistorialConv[userId]
}
