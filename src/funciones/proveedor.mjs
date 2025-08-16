// src/proveedor.mjs

// Log de depuración para confirmar que el archivo se carga
console.log('🛠️ proveedor.mjs cargado en el despligue');

//TT MODULOS
import { RevisarTemp } from '../funciones/directorios.mjs'

//TT ENUN DE TIPOS DE PROVEEDOR
/**
 * Enumeración de tipos de proveedor.
 * Esta constante contiene una lista de tipos de proveedores disponibles en el sistema.
 * Actualmente, solo se incluye el proveedor "Baileys".
 * @type {Object}
 * @property {string} BAILEYS - Tipo de proveedor correspondiente a "Baileys".
 */
export const ENUNPROV = {
  BAILEYS: 'Baileys'
}
//TT PROVEEDOR
/**
 * Representación de un proveedor.
 * Esta constante define un objeto que almacena información sobre un proveedor.
 * Incluye el nombre del proveedor y el tipo de proveedor.
 * @type {Object}
 * @property {string} name - Nombre del proveedor. Inicialmente vacío.
 * @property {string|null} prov - Tipo de proveedor, que puede ser un valor definido en la enumeración `ENUNPROV` o `null`.
 */
export const PROVEEDOR = {
  name: '',
  prov: null
}

//TT ENVIAR MENSAJE DE TEXTO
/**
 * Envía un mensaje de texto a través del proveedor de servicios especificado.
 * La función verifica el proveedor configurado y, si es 'Baileys', utiliza su método para enviar un mensaje de texto al número proporcionado.
 * @param {string} dest - Número de teléfono o grupo al que se enviará el mensaje. El número debe estar en formato internacional sin el prefijo '+'.
 * @param {string} msj - Mensaje de texto que se enviará.
 * @returns {Promise<string|null>} - Retorna una promesa que se resuelve con 'OK' si el mensaje se envía correctamente, o `null` si ocurre un error o no hay un proveedor configurado.
 * @throws {Error} - Lanza una excepción si ocurre un error al intentar enviar el mensaje.
 */
export async function EnviarMensaje(dest, msj, media = {}) {
  //ss si el proveedr es Baileys
  if (PROVEEDOR.name === ENUNPROV.BAILEYS) {
    const _num = ComprobarDestinatario(dest)
    if (_num) {
      try {
        await PROVEEDOR.prov.sendMessage(_num, msj, media)
        return 'OK'
      } catch (error) {
        console.warn(`no se pudo enviar a: ${dest} el mensaje: ${msj}`, error)
        return null
      }
    } else {
      console.warn(`${dest} no es destinatario valido`)
      return null
    }
  }
  //ss si no hay proveedor asignado
  else {
    return null
  }
}

//TT ENVIAR MEDIA
/**
 * Envía una imagen a través del proveedor de servicios especificado.
 * La función verifica el proveedor configurado y, si es 'Baileys', utiliza su método para enviar una imagen al número de teléfono asociado con el contexto proporcionado.
 * @param {string} dest - Número de teléfono o grupo al que se enviará el mensaje. El número debe estar en formato internacional sin el prefijo '+'.
 * @param {string} img - URL o ruta de la imagen que se enviará.
 * @returns {Promise<string|null>} - Retorna una promesa que se resuelve con 'OK' si la imagen se envía correctamente, o `null` si ocurre un error o no hay un proveedor configurado.
 * @throws {Error} - Lanza una excepción si ocurre un error al intentar enviar la imagen.
 */
export async function EnviarMedia(dest, img) {
  //ss si el proveedr es Baileys
  if (PROVEEDOR.name === ENUNPROV.BAILEYS) {
    const _num = ComprobarDestinatario(dest)
    if (_num) {
      try {
        await PROVEEDOR.prov.sendMedia(_num, img)
        return 'OK'
      } catch (error) {
        console.warn(`no se pudo enviar imagen a: ${dest} la imagen  ${img}`, error)
        return null
      }
    } else {
      console.warn(`${dest} no es destinatario valido`)
      return null
    }
  }
  //ss si no hay proveedor asignado
  else {
    return null
  }
}

//TT ENVIAR PRESENCIA ESCRIBIENDO
/**
 * Envía una notificación de presencia "escribiendo..." a través del proveedor de servicios especificado.
 * La función verifica el proveedor configurado y, si es 'Baileys', utiliza su método para enviar una actualización de presencia al número de teléfono asociado con el contexto proporcionado.
 * @param {Object} ctx - Contexto del mensaje que contiene la información del remitente. Se usa `ctx.key.remoteJid` para obtener el identificador del destinatario.
 * @returns {Promise<string|null>} - Retorna una promesa que se resuelve con 'OK' si la notificación se envía correctamente, o `null` si ocurre un error o no hay un proveedor configurado.
 * @throws {Error} - Lanza una excepción si ocurre un error al intentar enviar la notificación.
 */
export async function Escribiendo(ctx) {
  //ss si el proveedr es Baileys
  if (PROVEEDOR.name === ENUNPROV.BAILEYS) {
    try {
      await PROVEEDOR.prov.vendor.sendPresenceUpdate('composing', ctx.key.remoteJid)
    } catch (error) {
      console.warn(`no se pudo enviar (Escribiendo...) a: ${ctx.from}`, error)
      return null
    }
  }
  //ss si no hay proveedor asignado
  else {
    return null
  }
}

//TT OBTENER GRUPOS
/**
 * Obtiene una lista de grupos de WhatsApp del proveedor especificado.
 *
 * @function ObtenerGrupos
 *
 * @returns {Array<Object>|string|null} Devuelve una lista de objetos de grupos si está conectado,
 * una cadena 'DESCONECTADO' si no hay conexión, o `null` si no hay proveedor asignado.
 *
 * @description
 * La función `ObtenerGrupos`:
 * 1. Comprueba si el proveedor es `Baileys` y si está conectado.
 * 2. Si está conectado, filtra los contactos para encontrar aquellos que son grupos de WhatsApp
 * (identificados por la presencia de `'@g.us'` en el ID).
 * 3. Devuelve una lista de estos grupos. Si no está conectado, devuelve `'DESCONECTADO'`.
 * 4. Si no hay proveedor asignado, devuelve `null`.
 */
export function ObtenerGrupos() {
  //ss si el proveedr es Baileys
  if (PROVEEDOR.name === ENUNPROV.BAILEYS) {
    if (PROVEEDOR.prov.store?.state?.connection === 'open') {
      const result = []
      const obj = PROVEEDOR.prov.store?.contacts
      for (const key in obj) {
        if (obj[key].id.includes('@g.us')) {
          result.push(obj[key])
        }
      }
      return result
    } else {
      return 'DESCONECTADO'
    }
  }
  //ss si no hay proveedor asignado
  else {
    return null
  }
}

export function ObtenerContactos() {
  //ss si el proveedr es Baileys
  if (PROVEEDOR.name === ENUNPROV.BAILEYS) {
    if (PROVEEDOR.prov.store?.state?.connection === 'open') {
      const result = []
      const obj = PROVEEDOR.prov.store?.contacts
      for (const key in obj) {
        if (obj[key].id.includes('@s.whatsapp.net')) {
          result.push(obj[key])
        }
      }
      return result
    } else {
      return 'DESCONECTADO'
    }
  }
  //ss si no hay proveedor asignado
  else {
    return null
  }
}

//TT COMPROBAR DESTINATARIO
function ComprobarDestinatario(dest) {
  //si es numero de telefono
  if (/^\d+$/.test(dest)) {
    return dest + '@s.whatsapp.net'
  }
  //si es un grupos
  else {
    const grupos = ObtenerGrupos()
    if (grupos && grupos !== 'DESCONECTADO') {
      const _destino = grupos.find((obj) => obj.name === dest)
      if (_destino) {
        return _destino.id
      }
    }
  }
  return null
}

//TT GUARDAR ARCHIVOS (VERSIÓN FINAL Y CORRECTA)
export async function GuardarArchivos(ctx) {
  try {
    RevisarTemp(); 

    console.log('📄 [GuardarArchivos] Intentando guardar archivo con el método del proveedor...');
    // CORRECCIÓN FINALÍSIMA: Volvemos a pasar el 'ctx' completo, que es lo que la función espera.
    const localPath = await PROVEEDOR.prov.saveFile(ctx, { path: './temp' });
    
    console.log(`✅ [GuardarArchivos] Archivo guardado exitosamente en: ${localPath}`);
    return localPath;

  } catch (error) {
    console.error('❌ [GuardarArchivos] Error crítico al intentar guardar el archivo:', error);
    return null;
  }
}
