//TT MODULOS
import { Notificar, ENUM_NOTI } from '../../../config/notificaciones.mjs'

//TT SOLICITAR AYUDA
export async function SolicitarAyuda(datosUsuario, consulta) {
  // Se extrae el nombre y el teléfono del objeto. Se asigna 'Desconocido' si el nombre no es válido.
  const nombre = (datosUsuario && datosUsuario.nombre && datosUsuario.nombre !== 'Sin Nombre') ? datosUsuario.nombre : 'Desconocido';
  const telefono = (datosUsuario && datosUsuario.telefono) ? datosUsuario.telefono : 'No disponible';

  // Se construye el nuevo mensaje personalizado. He añadido asteriscos para resaltar los datos.
  const msj = `🤖 El usuario *${nombre}* con el número de teléfono *${telefono}* tiene la siguiente consulta:\n\n_${consulta}_`;

  Notificar(ENUM_NOTI.AYUDA, { msj });
  return 'Notificacion enviada a asesor';
}

//FF FUNCION IA
export const IASolicitarAyuda = {
  name: 'SolicitarAyuda',
  description: 'Envía una notificación al asesor para solicitar que continúe con la conversación',
  parameters: {
    type: 'object',
    properties: {
      consulta: {
        type: 'string',
        description: 'Resumen de la consulta detallada del cliente que se enviará al asesor'
      }
    },
    required: ['consulta'],
    additionalProperties: false
  }
}
