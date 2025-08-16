import 'dotenv/config'
import fs from 'fs'
import sirv from 'sirv'

//TT MODULOS
import { LimpiarHistorial } from './OpenAi/historial.mjs'
import { ObtenerEstadoServidor } from './ApiResFunciones/estadoServidor.mjs'
import { SincronizarContactos } from '../config/contactos.mjs'
import {
  ActualizarBot,
  ActualizarContactos,
  ActualizarNotificaciones,
  ActualizarMensajes
} from '../config/bot.mjs'
import { EnviarMensaje } from '../funciones/proveedor.mjs'

//TT REST
export function APIREST(PROV) {
  PROV.server.use(sirv('.', { dev: true }))

  //TT ACTUALIZAR INFO
  PROV.server.get('/actualizar', async (req, res) => {
    const clave = req.headers['x-clave']
    const id = req.headers['x-id']

    if (clave === process.env.REST_CLAVE) {
      console.log(`DATO RECIBIDO: actualizar con clave = ${clave} y solicitud ${id}`)
      try {
        if (id === 'bot') {
          console.log('actualizar bot')
          LimpiarHistorial()
          ActualizarBot()
        } else if (id === 'contactos') {
          console.log('actualizar contactos')
          ActualizarContactos()
        } else if (id === 'notificaciones') {
          console.log('actualizar notificaciones')
          ActualizarNotificaciones()
        } else if (id === 'mensajes') {
          console.log('actualizar mensajes')
          ActualizarMensajes()
        } else if (id === 'sincronizar') {
          console.log('sincronizar')
          SincronizarContactos()
        }
        return res.end('la peticion de actualizacion se realizó con éxito.')
      } catch (error) {
        console.error('Error durante la actualización:', error)
        return res.status(500).end('ocurrió un error durante la actualización.')
      }
    } else {
      console.log(`la calve: ${clave} no es valida`)
      return res.end(`la calve: ${clave} no es valida`)
    }
  })

  //TT ACCIONES
  PROV.server.post('/accion', async (req, res) => {
    const clave = req.headers['x-clave']
    const id = req.headers['x-id']

    if (clave === process.env.REST_CLAVE) {
      console.log(`DATO RECIBIDO: accion con clave = ${clave} y solicitud ${id}`)
      try {
        if (id === 'enviar_mensaje') {
          console.log('accion crear enviar mensaje')
          console.log(req.body)

          const contenido = typeof req.body.message === 'string'
            ? { text: req.body.message }
            : req.body.message

          const estado = await EnviarMensaje(req.body.number, contenido)
          res.setHeader('Content-Type', 'application/json')

          const json = JSON.stringify({ estado: estado === 'OK' ? 'OK' : 'ERROR' })
          return res.end(json)
        }
      } catch (error) {
        console.error('Error durante la accion:', error)
        return res.status(500).end('ocurrió un error durante la accion.')
      }
    } else {
      console.log(`la calve: ${clave} no es valida`)
      return res.end(`la calve: ${clave} no es valida`)
    }
  })

  //TT IMAGEN DE ESTADO DEL SERVIDOR
  PROV.server.get('/img/estado', (req, res) => {
    const imagePath = ObtenerEstadoServidor()

    fs.readFile(imagePath, (err, data) => {
      if (err) {
        console.error('Error enviando la imagen:', err)
        return res.status(500).end('Error enviando la imagen')
      } else {
        res.setHeader('Content-Type', 'image/png')
        return res.end(data)
      }
    })
  })

  //TT HTML DE ESTADO DE LA CONEXION DEL BOT
  PROV.server.get('/vincular', (req, res) => {
    let _num = ''
    let ruta = './src/res/html/Vincular.html'
    if (PROV.store?.state?.connection === 'open') {
      _num = PROV.globalVendorArgs?.host?.phone
      ruta = './src/res/html/Conectado.html'
    }
    fs.readFile(ruta, 'utf8', (err, data) => {
      if (err) {
        console.error('Error enviando la pagina:', err)
        return res.status(500).end('Error enviando la pagina')
      } else {
        const _new = _num !== '' ? data.replaceAll('##TELEFONO##', _num) : data
        res.setHeader('Content-Type', 'text/html')
        return res.end(_new)
      }
    })
  })
}
