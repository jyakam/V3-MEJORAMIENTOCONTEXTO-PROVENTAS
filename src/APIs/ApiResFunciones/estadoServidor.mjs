import 'dotenv/config'

//TT OBTENER IMAGEN DE SERVIDOR
export function ObtenerEstadoServidor() {
  if (process.env.RUNNING_IN_DOCKER === 'true') {
    return './src/res/bot/cloudServer.png'
  } else {
    return './src/res/bot/localServer.png'
  }
}
