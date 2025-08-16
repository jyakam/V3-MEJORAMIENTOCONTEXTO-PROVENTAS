import { AppSheetUser, postTable } from 'appsheet-connect'

//TT APSHEET CREDENCIALES
const appsheetId = process.env.APPSHEET_ID
const appsheetKey = process.env.APPSHEET_KEY
const propiedades = { Timezone: 'Pacific Standard Time' }
const APPSHEETCONFIG = new AppSheetUser(appsheetId, appsheetKey)

export async function MensajeEntrante(ctx) {
  const userId = ctx.from
  const mensaje = ctx.body
  await postTable(
    APPSHEETCONFIG,
    process.env.PAG_CHATS,
    {
      TELEFONO: userId,
      MENSAJE: mensaje,
      ROL: 'USER',
      ESTADO: 'OK'
    },
    propiedades
  )
}

export async function MensajeSaliente(mensaje, userId) {
  await postTable(
    APPSHEETCONFIG,
    process.env.PAG_CHATS,
    {
      TELEFONO: userId,
      MENSAJE: mensaje,
      ROL: 'BOT',
      ESTADO: 'OK'
    },
    propiedades
  )
}
