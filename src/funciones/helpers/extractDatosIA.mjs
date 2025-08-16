import { BOT } from '../../config/bot.mjs'

const promptBase = `
Eres un extractor de datos de contacto en lenguaje natural. Tu tarea es identificar datos de contacto en un mensaje, incluso si se proporcionan parcialmente o en cualquier momento de la conversación. Los datos a extraer son:

- nombre: Nombre de persona o empresa (primera línea si no es email, número, ni dirección, o identificado contextualmente).
- email: Dirección de correo electrónico válida (contiene '@').
- ciudad: Nombre de una ciudad, puede estar en una línea con país (ej. "Barranquilla, Colombia").
- pais: Nombre de un país, puede estar con ciudad.
- direccion: Dirección completa, puede incluir formatos como "Cra", "Calle", "Av", o sitios conocidos como "Portal de Genoves Manzana 10" o "Barrio Manzanares, Lote 3".
- direccion_2: Datos adicionales de la dirección (apartamento, torre, edificio, conjunto, condominio, piso, etc.).
- identificacion: Número de identificación (si aplica).
- tipo_cliente: "Empresa" si el nombre parece una empresa (contiene "SAS", "LTDA", o es largo), "Persona" si parece un nombre personal, o vacío si no se puede determinar.
- codigo_postal: Código postal, hasta 7 caracteres, puede incluir espacios (ej. "H2B 2S9").
- estado_departamento: Estado o departamento (ej. "Atlántico").
- numero_de_telefono_secundario: Número de teléfono de 10 dígitos, diferente al número de contacto principal.
- fecha_de_cumpleanos: Fecha en formato DD/MM/AAAA (ej. "14/10/1980").

Reglas:
- Identifica datos contextualmente, sin depender de frases como "mi nombre es" o "me llamo".
- Si el mensaje no contiene datos de contacto (ej. "Hola buenas"), devuelve un texto vacío.
- Responde solo con líneas en este formato, incluyendo solo los campos encontrados:
  nombre: Pedro Gómez
  email: pedro@email.com
  ciudad: Medellín
  pais: Colombia
- Maneja mensajes estructurados (líneas separadas) o narrativos.
- Para mensajes parciales, extrae solo los datos presentes sin asumir valores faltantes.

MENSAJE:
"{mensaje}"
`

// 🧠 MAIN FUNCTION
export async function extraerDatosContactoIA(mensaje, telefono) {
  try {
    console.log(`🧠 [IA] Extrayendo datos para ${telefono}...`)
    console.log('🔐 Longitud de BOT.KEY_IA:', BOT.KEY_IA?.length)

    if (!BOT.KEY_IA || BOT.KEY_IA.length < 20) {
      console.error('❌ BOT.KEY_IA inválida o no cargada.')
      return {}
    }

    const promptFinal = promptBase.replace('{mensaje}', mensaje)

    // 🔁 Reintentos por problemas temporales
    const fetchWithRetry = async (url, options, retries = 3, delay = 1000) => {
      for (let i = 0; i < retries; i++) {
        try {
          const res = await fetch(url, options)
          if (!res.ok) {
            const errText = await res.text()
            console.error(`❌ HTTP ${res.status} - ${res.statusText}`)
            console.error(`🪵 Body recibido: ${errText}`)
            throw new Error(`Respuesta HTTP no válida: ${res.status}`)
          }
          return res
        } catch (err) {
          if (i === retries - 1) throw err
          console.warn(`🔁 Reintentando (${i + 1}/${retries})...`)
          await new Promise(r => setTimeout(r, delay * Math.pow(2, i)))
        }
      }
    }

    // 🔐 Llamado a OpenAI
    const response = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${BOT.KEY_IA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: BOT.MODELO_IA,
        messages: [
          { role: 'system', content: 'Eres un extractor de datos de contacto.' },
          { role: 'user', content: promptFinal }
        ],
        temperature: 0.2
      })
    })

    const raw = await response.text()

    let json
    try {
      json = JSON.parse(raw)
    } catch (err) {
      console.error(`❌ Error parseando JSON: ${err.message}`)
      console.error(`🧾 Cuerpo de respuesta recibido:\n${raw}`)
      return {}
    }

    const texto = json.choices?.[0]?.message?.content || ''
    console.log(`📤 [IA RAW] Respuesta OpenAI:\n${texto}`)

    const datos = {}

    // 🧠 Extractores por regex
    const extract = (label, regex) => {
      const match = texto.match(regex)
      if (match) {
        const val = match[1].trim()
        if (val && val.length > 1 && !/^[^\w\s]+$/.test(val)) {
          datos[label] = val
        }
      }
    }

    extract('nombre', /nombre\s*[:\-]\s*(.+)/i)
    extract('email', /email\s*[:\-]\s*([\w.\-+]+@\w+\.\w+)/i)
    extract('ciudad', /ciudad\s*[:\-]\s*(.+)/i)
    extract('pais', /pa[ií]s\s*[:\-]\s*(.+)/i)
    extract('direccion', /direcci[oó]n\s*[:\-]\s*(.+)/i)
    extract('direccion_2', /direcci[oó]n_2\s*[:\-]\s*(.+)/i)
    extract('identificacion', /identificaci[oó]n\s*[:\-]\s*(.+)/i)
    extract('tipo_cliente', /tipo[_\s]?cliente\s*[:\-]\s*(persona|empresa)/i)
    extract('codigo_postal', /codigo_postal\s*[:\-]\s*([\w\s]{3,7})/i)
    extract('estado_departamento', /estado_departamento\s*[:\-]\s*(.+)/i)
    extract('numero_de_telefono_secundario', /numero_de_telefono_secundario\s*[:\-]\s*(\d{10})/i)
    extract('fecha_de_cumpleanos', /fecha_de_cumpleanos\s*[:\-]\s*(\d{2}\/\d{2}\/\d{4})/i)

    // Validación adicional para respuestas mal formateadas
    if (Object.keys(datos).length === 0 && texto.trim() !== '') {
      const lineas = texto.split('\n').map(l => l.trim()).filter(l => l)
      for (const linea of lineas) {
        if (/[\w.\-+]+@\w+\.\w+/i.test(linea)) datos.email = linea
        else if (/^\d{2}\/\d{2}\/\d{4}$/.test(linea)) datos.fecha_de_cumpleanos = linea
        else if (/^[\w\s]{3,7}$/.test(linea)) datos.codigo_postal = linea
        else if (/^\d{10}$/.test(linea) && linea !== telefono) datos.numero_de_telefono_secundario = linea
      }
    }

    if (Object.keys(datos).length === 0) {
      console.log('⚠️ No se detectaron datos útiles en la respuesta.')
    } else {
      console.log(`📦 [IA EXTRAÍDOS] ${telefono}:`, datos)
    }

    return datos
  } catch (err) {
    console.error(`❌ Error extrayendo datos con IA para ${telefono}: ${err.message}`)
    return {}
  }
}
