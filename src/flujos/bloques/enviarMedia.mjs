import 'dotenv/config'
// TT MODULOS
import { Esperar } from '../../funciones/tiempo.mjs'
import { DetectarImagenes, ReemplazarEnlaces } from '../../funciones/detectarImagenes.mjs'
import { EnviarMedia } from '../../funciones/proveedor.mjs'
//TT FLUJOS

//TT ENVIAR IMAGENES
export async function EnviarImagenes(res, flowDynamic, ctx) {
  const urls = DetectarImagenes(res)
  if (urls) {
    console.log('🌄 imagenes encontradas')
    for (let i = 0; i < urls.length; i++) {
      await EnviarMedia(ctx.from, urls[i])
      await Esperar(1)
    }
    return ReemplazarEnlaces(res)
  }
  return res
}
