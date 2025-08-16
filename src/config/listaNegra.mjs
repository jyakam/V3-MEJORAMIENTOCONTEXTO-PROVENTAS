import 'dotenv/config'
import { postTable, patchTable } from 'appsheet-connect'
//TT MODULOS
import { CONTACTOS, APPSHEETCONFIG } from './bot.mjs'
//TT COMPROBAR LISTA NEGRA
/**
 * Comprueba si un contacto está en la lista negra.
 * @param {Object} ctx - Contexto que contiene información del contacto.
 * @returns {boolean} - Retorna `true` si el contacto está en la lista negra y `false` en caso contrario.
 */
export function ComprobrarListaNegra(ctx) {
  const dato = CONTACTOS.LISTA_CONTACTOS.find((obj) => obj.TELEFONO.toString() === ctx.from.toString())
  if (dato) {
    if (dato.RESP_BOT === false) {
      console.info(`el bot no tiene permitido hablar con el numero: ${ctx.from}`)
      return true
    }
  } else {
    console.info(`contacto nuevo: ${ctx.name} con numero: ${ctx.from}`)
    const _new = {
      TELEFONO: ctx.from,
      NOMBRE: ctx.name
    }
    CONTACTOS.LISTA_CONTACTOS.push(_new)
    postTable(APPSHEETCONFIG, process.env.PAG_CONTACTOS, _new)
  }
  return false
}

//TT AGREGAR A LISTA NEGRA
/**
 * Agrega un contacto a la lista negra o actualiza su estado de permiso.
 * @param {Object} ctx - Contexto que contiene información del contacto.
 * @param {string} hablar - Estado de permiso para el bot ('SI' o 'NO'). Default es 'NO'.
 * @returns {boolean} - Retorna `true` si el contacto fue agregado o actualizado correctamente.
 */
export async function AgregarListaNegra(ctx, hablar = false) {
  const _hablar = hablar ? 'SI' : 'NO'
  const dato = CONTACTOS.LISTA_CONTACTOS.find((obj) => obj.TELEFONO.toString() === ctx.from.toString())
  console.info(`el bot ${_hablar} tiene permitido hablar con el numero: ${ctx.from}`)
  if (dato) {
    dato.RESP_BOT = hablar
    CONTACTOS.LISTA_CONTACTOS.find((obj) => obj.TELEFONO.toString() === ctx.from.toString()).RESP_BOT = hablar
    patchTable(APPSHEETCONFIG, process.env.PAG_CONTACTOS, dato)
    return true
  } else {
    console.info(`contacto nuevo: ${ctx.name} con numero: ${ctx.from}`)
    const _new = {
      TELEFONO: ctx.from,
      NOMBRE: ctx.name,
      RESP_BOT: hablar
    }
    CONTACTOS.LISTA_CONTACTOS.push(_new)
    postTable(APPSHEETCONFIG, process.env.PAG_CONTACTOS, _new)

    return true
  }
}
