import 'dotenv/config'
//TT MODULOS
import { Esperar } from '../funciones/tiempo.mjs'
import { NOTIFICACIONES } from './bot.mjs'
import { EnviarMensaje } from '../funciones/proveedor.mjs'

//FF ENUM NOTIFICACIONES A HUMANOS
/**
 * Enumeración de tipos de notificaciones a humanos.
 * @readonly
 * @type {Object}
 */
export const ENUM_NOTI = {
  AYUDA: 'AYUDA',
  ERROR: 'ERROR'
}

//TT NOTIFICAR A HUMANO
/**
 * Envía una notificación a los contactos humanos según el tipo de notificación.
 * @param {string} tipo - Tipo de notificación (ej: 'ERROR').
 * @param {Object} obj - Información que se incluirá en la notificación.
 */
export async function Notificar(tipo, datos) {
  //ss AYUDA
  if (tipo === ENUM_NOTI.AYUDA && NOTIFICACIONES.AYUDA) {
    for (let i = 0; i < NOTIFICACIONES.DEST_AYUDA.length; i++) {
      await EnviarMensaje(NOTIFICACIONES.DEST_AYUDA[i], datos.msj)

      await Esperar(10)
    }
    console.log(`🔔 Notificacion de ayuda enviada a los contactos  👤 ${NOTIFICACIONES.DEST_AYUDA.length}`)
  }
  //ss ERROR
  else if (tipo === ENUM_NOTI.ERROR && NOTIFICACIONES.ERROR) {
    for (let i = 0; i < NOTIFICACIONES.DEST_ERROR.length; i++) {
      await EnviarMensaje(NOTIFICACIONES.DEST_ERROR[i], datos.msj)
      await Esperar(10)
    }
    console.log(`🔔 Notificacion de error enviada a los contactos  👤 ${NOTIFICACIONES.DEST_ERROR.length}`)
  }
}
