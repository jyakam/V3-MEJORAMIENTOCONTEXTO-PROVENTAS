import { postTable } from 'appsheet-connect'
//TT MODULOS
import { ObtenerGrupos } from '../funciones/proveedor.mjs'
import { APPSHEETCONFIG } from './bot.mjs'

//TT SINCRONIZAR GRUPOS
/**
 * Sincroniza grupos obtenidos con una base de datos o servicio externo.
 *
 * @async
 * @function sincronizarGrupos
 *
 * @returns {Promise<void>} No retorna valor, pero actualiza los registros de grupos de forma asíncrona.
 *
 * @description
 * La función `sincronizarGrupos`:
 * 1. Obtiene una lista de grupos usando `ObtenerGrupos`.
 * 2. Si la lista es válida (no nula y no 'DESCONECTADO'), transforma cada grupo en un objeto con
 *    `ID` y `NOMBRE`.
 * 3. Actualiza cada grupo en la base de datos mediante `ActualizarRegistro`, usando `await` para asegurar
 *    actualizaciones secuenciales.
 */
export async function sincronizarGrupos() {
  const grupos = ObtenerGrupos()
  if (grupos && grupos !== 'DESCONECTADO') {
    const lista = []
    for (let i = 0; i < grupos.length; i++) {
      const _grupo = {
        ID: grupos[i].id,
        NOMBRE: grupos[i].name
      }
      lista.push(_grupo)
    }
    console.log(lista)
    await postTable(APPSHEETCONFIG, process.env.PAG_GRUPOS, lista)
  }
}
