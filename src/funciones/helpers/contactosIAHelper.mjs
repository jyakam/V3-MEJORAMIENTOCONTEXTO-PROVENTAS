// src/funciones/helpers/contactosIAHelper.mjs

import { EnviarTextoOpenAI } from '../../APIs/OpenAi/enviarTextoOpenAI.mjs'
// Solo importas ActualizarContacto, que internamente usa cacheContactos
import { ActualizarContacto } from '../../config/contactos.mjs'

export async function detectarIntencionContactoIA(txt) {
  const prompt = `
Eres un asistente experto. Tu tarea es decir si el siguiente mensaje del usuario tiene la intención de entregarte datos personales como nombre, teléfono, email, dirección o cualquier dato de contacto. 
Mensaje del usuario:
"${txt}"
Responde solamente este JSON:
{
  "esDatosContacto": true o false
}
  `.trim()

  try {
    const respuesta = await EnviarTextoOpenAI(prompt, 'intencionContacto', 'INFO', {})
    let clean = respuesta.respuesta
    if (!clean) return false
    clean = clean.replace(/```json/g, '').replace(/```/g, '').trim()
    const match = clean.match(/{[\s\S]*}/)
    if (match) clean = match[0]
    const parsed = JSON.parse(clean)
    return parsed.esDatosContacto || false
  } catch (e) {
    console.log('❌ [IAINFO] Error detectando intención contacto IA:', e)
    return false
  }
}

export async function extraerDatosContactoIA(txt) {
  const prompt = `
Eres un asistente experto y tu tarea es extraer los datos personales que detectes del siguiente mensaje del usuario.

Devuelve EXCLUSIVAMENTE un JSON (sin texto adicional, sin \`\`\`) en el que:

- Para cualquier tipo de documento de identidad (sea Cédula, CI, DNI, NIT, RUT, CPF, CURP, ITIN, ID, Social Security Number, Número de Identidad, pasaporte, etc., y en cualquier idioma), usa siempre la clave "IDENTIFICACION".
- Para dirección principal, usa siempre "DIRECCION". Si hay un complemento (apartamento, torre, barrio, edificio, oficina, conjunto, lote, manzana, bloque, local, centro comercial, etc. en cualquier idioma), guárdalo en "DIRECCION_2".
- Para teléfono, móvil, celular, whatsapp, etc., usa siempre "TELEFONO".
- Para email, usa "EMAIL".
- Para país, usa "PAIS".
- Para ciudad, usa "CIUDAD".
- Para estado, departamento, provincia, región, condado, county, state, region, etc., usa siempre la clave "ESTADO_DEPARTAMENTO".
- Para nombre o nombres, usa "NOMBRE".

Si tienes duda sobre algún dato, NO asumas: devuelve el campo vacío y especifica que falta confirmar con el usuario.

Mensaje del usuario:
"${txt}"

Responde solamente el JSON limpio y usa SIEMPRE estos nombres de campos, aunque el usuario lo exprese con otros sinónimos, abreviaciones o en otro idioma.
  `.trim()

  try {
    const respuesta = await EnviarTextoOpenAI(prompt, 'extraerDatosContacto', 'INFO', {})
    let clean = respuesta.respuesta
    if (!clean) return {}
    clean = clean.replace(/```json/g, '').replace(/```/g, '').trim()
    const match = clean.match(/{[\s\S]*}/)
    if (match) clean = match[0]
    let parsed = JSON.parse(clean)
    parsed = normalizarCamposContacto(parsed)
    return parsed
  } catch (e) {
    console.log('❌ [IAINFO] Error extrayendo datos contacto IA:', e)
    return {}
  }
}

function normalizarCamposContacto(datos) {
  const mapeo = {
    'cedula': 'IDENTIFICACION', 'cédula': 'IDENTIFICACION', 'dni': 'IDENTIFICACION', 'rut': 'IDENTIFICACION', 'cpf': 'IDENTIFICACION', 'curp': 'IDENTIFICACION',
    'id': 'IDENTIFICACION', 'identidad': 'IDENTIFICACION', 'identificacion': 'IDENTIFICACION', 'identificación': 'IDENTIFICACION', 'nit': 'IDENTIFICACION',
    'itin': 'IDENTIFICACION', 'ssn': 'IDENTIFICACION', 'passport': 'IDENTIFICACION', 'passaporte': 'IDENTIFICACION', 'pasaporte': 'IDENTIFICACION',

    'telefono': 'TELEFONO', 'teléfono': 'TELEFONO', 'movil': 'TELEFONO', 'celular': 'TELEFONO', 'whatsapp': 'TELEFONO', 'mobile': 'TELEFONO', 'phone': 'TELEFONO', 'cell': 'TELEFONO', 'contacto': 'TELEFONO',

    'email': 'EMAIL', 'correo': 'EMAIL', 'correo electrónico': 'EMAIL', 'correo electronico': 'EMAIL', 'mail': 'EMAIL', 'e-mail': 'EMAIL',

    'direccion': 'DIRECCION', 'dirección': 'DIRECCION', 'address': 'DIRECCION', 'endereço': 'DIRECCION', 'dirección principal': 'DIRECCION',
    'direccion_2': 'DIRECCION_2', 'dirección_2': 'DIRECCION_2', 'complemento': 'DIRECCION_2', 'address2': 'DIRECCION_2', 'apto': 'DIRECCION_2', 'apartamento': 'DIRECCION_2', 'suite': 'DIRECCION_2', 'local': 'DIRECCION_2', 'manzana': 'DIRECCION_2', 'bloque': 'DIRECCION_2', 'edificio': 'DIRECCION_2', 'torre': 'DIRECCION_2', 'oficina': 'DIRECCION_2', 'lote': 'DIRECCION_2', 'centro comercial': 'DIRECCION_2', 'barrio': 'DIRECCION_2',

    'pais': 'PAIS', 'país': 'PAIS', 'country': 'PAIS',

    'ciudad': 'CIUDAD', 'city': 'CIUDAD', 'cidade': 'CIUDAD',

    'departamento': 'ESTADO_DEPARTAMENTO', 'estado': 'ESTADO_DEPARTAMENTO', 'provincia': 'ESTADO_DEPARTAMENTO', 'region': 'ESTADO_DEPARTAMENTO', 'región': 'ESTADO_DEPARTAMENTO',
    'county': 'ESTADO_DEPARTAMENTO', 'condado': 'ESTADO_DEPARTAMENTO', 'province': 'ESTADO_DEPARTAMENTO',
    'état': 'ESTADO_DEPARTAMENTO', 'département': 'ESTADO_DEPARTAMENTO', 'région': 'ESTADO_DEPARTAMENTO',
    'regione': 'ESTADO_DEPARTAMENTO', 'provinz': 'ESTADO_DEPARTAMENTO', 'bundesland': 'ESTADO_DEPARTAMENTO', 'staat': 'ESTADO_DEPARTAMENTO', 'bezirk': 'ESTADO_DEPARTAMENTO',

    'nombre': 'NOMBRE', 'name': 'NOMBRE', 'nom': 'NOMBRE', 'nome': 'NOMBRE'
  }
  const resultado = {}
  for (const [key, valor] of Object.entries(datos)) {
    const keyLower = key.toLowerCase().replace(/\s+/g, '').replace(/[^a-zA-Z0-9_]/g, '')
    const clave = mapeo[keyLower] || mapeo[keyLower.replace(/[0-9]/g, '')] || key
    if (valor !== undefined && valor !== null && (typeof valor === 'string' ? valor.trim() !== '' : true)) {
      resultado[clave] = valor
    }
  }
  return resultado
}

// Aquí ya está todo blindado: mergea datos, respeta el cache, nunca borra info previa
export async function verificarYActualizarContactoSiEsNecesario(txt, phone, contacto = {}, datos = {}) {
  console.log(`📇 [IAINFO] Intentando extraer datos IA para ${phone}...`)

  const datosExtraidos = await extraerDatosContactoIA(txt)
  const datosFiltrados = Object.fromEntries(
    Object.entries({ ...datos, ...datosExtraidos }).filter(
      ([, valor]) => valor !== undefined && valor !== null && (typeof valor === 'string' ? valor.trim() !== '' : true)
    )
  )
  if (!Object.keys(datosFiltrados).length) return

  // console.log(`📇 [IAINFO] Datos combinados IA detectados para ${phone}:`, datosFiltrados)

  // Solo llama ActualizarContacto (que ya blinda y actualiza cache)
  await ActualizarContacto(phone, datosFiltrados)
  console.log(`✅ [IAINFO] Datos de contacto actualizados para ${phone}`)
}

export function limpiarContactoParaMostrar(contacto = {}) {
  return Object.fromEntries(
    Object.entries(contacto).filter(
      ([_, valor]) =>
        valor !== undefined &&
        valor !== null &&
        (typeof valor === 'string' ? valor.trim() !== '' : true)
    )
  )
}
