import 'dotenv/config'
import fs from 'fs'

//TT MODULOS
import {
  ObtenerFechaActual,
  ObtenerHoraActual,
  ConvertirFechaExplicita,
  ConvertirA12Horas
} from '../../funciones/tiempo.mjs'
import { ARCHIVO } from '../../config/bot.mjs'

//FF ENUN GIONES
/**
 * Enumeración de guiones para el promt de la IA.
 * @readonly
 * @enum {string}
 */
export const ENUNGUIONES = {
  INFO: 'INFO'
}

//TT GUIONES
export const GUIONES = {
  INFO: fs.readFileSync('./src/res/prompts/info.txt', 'utf8')
}

//TT FORMATEAR GUION
export function ConstrurGuion(guion, estado) {
  //fechas y horas
  const _fechaActual = ObtenerFechaActual()
  const _horaActual = ObtenerHoraActual()
  const _tiempoExplicito = ConvertirA12Horas(_horaActual)
  const _fechaExplicita = ConvertirFechaExplicita(_fechaActual)

  let _txt = ''
  //SS INFO
  if (guion === ENUNGUIONES.INFO) {
    //cargar guion
    _txt = GUIONES.INFO
    //info
    _txt = _txt.replaceAll('#INFO#', ARCHIVO.PROMPT_INFO)
    //fecha y hora
    _txt = _txt.replaceAll('#HORA_ACTUAL#', _tiempoExplicito)
    _txt = _txt.replaceAll('#FECHA_ACTUAL#', _fechaExplicita)
  }
  return _txt
}
