// src/config/contactos.mjs
import 'dotenv/config'
import { postTable } from 'appsheet-connect'
// import { ObtenerContactos } from '../funciones/proveedor.mjs'  // (¡Ya no es necesario si usas cache!)
import { APPSHEETCONFIG, ActualizarContactos, ActualizarFechas } from './bot.mjs'

// Importa helpers del cache de contactos
import {
  getContactoByTelefono,
  actualizarContactoEnCache
} from '../funciones/helpers/cacheContactos.mjs'
// ✅ NUEVA LÍNEA AÑADIDA
import { addTask } from '../funciones/helpers/taskQueue.mjs'

const propiedades = {
  UserSettings: { DETECTAR: false }
}

const COLUMNAS_VALIDAS = [
  'FECHA_PRIMER_CONTACTO',
  'FECHA_ULTIMO_CONTACTO',
  'TELEFONO',
  'NOMBRE',
  'RESP_BOT',
  'IDENTIFICACION',
  'EMAIL',
  'DIRECCION',
  'DIRECCION_2',
  'CIUDAD',
  'PAIS',
  'ESTADO_DEPARTAMENTO',
  'CODIGO_POSTAL',               // ⬅️ nueva
  'ETIQUETA',
  'TIPO_DE_CLIENTE',
  'FECHA_DE_CUMPLEANOS',         // ⬅️ nueva
  'RESUMEN_ULTIMA_CONVERSACION',
  'NUMERO_DE_TELEFONO_SECUNDARIO'
]

function aIso(entrada) {
  if (!entrada || typeof entrada !== 'string') return entrada
  const s = entrada.trim()
  const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/)
  if (m) {
    const [_, dd, mm, yyyy] = m
    const d = String(dd).padStart(2, '0')
    const M = String(mm).padStart(2, '0')
    return `${yyyy}-${M}-${d}`
  }
  return entrada
}

const CAMPOS_FECHA = ['FECHA_PRIMER_CONTACTO', 'FECHA_ULTIMO_CONTACTO', 'FECHA_DE_CUMPLEANOS']

function sanitizarContacto(obj) {
  // 1) clonar
  const base = { ...obj }

  // 2) nunca enviar _RowNumber
  delete base._RowNumber

  // 3) mapear 'TIPO DE CLIENTE' -> 'TIPO_DE_CLIENTE'
  if (base['TIPO DE CLIENTE'] && !base.TIPO_DE_CLIENTE) {
    base.TIPO_DE_CLIENTE = base['TIPO DE CLIENTE']
    delete base['TIPO DE CLIENTE']
  }

  // 4) mapear FECHA_NACIMIENTO -> FECHA_DE_CUMPLEANOS si viene con ese nombre
  if (base.FECHA_NACIMIENTO && !base.FECHA_DE_CUMPLEANOS) {
    base.FECHA_DE_CUMPLEANOS = base.FECHA_NACIMIENTO
  }
  delete base.FECHA_NACIMIENTO

  // 5) normalizar fechas a ISO si existen
  if (base.FECHA_PRIMER_CONTACTO) base.FECHA_PRIMER_CONTACTO = aIso(base.FECHA_PRIMER_CONTACTO)
  if (base.FECHA_ULTIMO_CONTACTO) base.FECHA_ULTIMO_CONTACTO = aIso(base.FECHA_ULTIMO_CONTACTO)
  if (base.FECHA_DE_CUMPLEANOS)  base.FECHA_DE_CUMPLEANOS  = aIso(base.FECHA_DE_CUMPLEANOS)

  // 6) asegurar que CODIGO_POSTAL sea string (para no perder ceros a la izquierda)
  if (base.CODIGO_POSTAL !== undefined && base.CODIGO_POSTAL !== null) {
    base.CODIGO_POSTAL = String(base.CODIGO_POSTAL).trim()
  }

  // 7) quedarnos SOLO con columnas válidas
  const limpio = {}
  for (const k of COLUMNAS_VALIDAS) {
    let v = base[k] // Usamos let para poder modificarlo

    // omitimos undefined/null siempre
    if (v === undefined || v === null) continue

    // ====== INICIO DE LA CORRECCIÓN ======
    // Si el campo es RESP_BOT, lo convertimos a texto 'TRUE' o 'FALSE'.
    // Esto soluciona el error de AppSheet.
    if (k === 'RESP_BOT') {
      v = String(v).toUpperCase(); // Convierte true a 'TRUE' y false a 'FALSE'
    }
    // ====== FIN DE LA CORRECCIÓN ======

    // si es campo de fecha y está vacío, NO lo mandamos
    if (CAMPOS_FECHA.includes(k) && (v === '' || (typeof v === 'string' && v.trim() === ''))) continue

    // para el resto:
    // - si es string, lo mandamos tal cual (incluye '', válido para campos texto como NOMBRE, DIRECCION, etc.)
    // - si no es string, lo mandamos salvo que sea '', que descartamos por arriba
    if (typeof v === 'string') {
      limpio[k] = v
    } else {
      if (v !== '') limpio[k] = v
    }
  }

  return limpio
}

async function postTableWithRetry(config, table, data, props, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      // [DEBUG] Payload que REALMENTE se manda a AppSheet (pre-llamada)
      try {
        const accion = (props && (props.Action || props.action)) || 'Add';
        const primerRow = Array.isArray(data) ? data[0] : data;
        console.log(`[DEBUG AppSheet] PRE-POST Acción=${accion} Tabla=${table}`);
        if (Array.isArray(data)) {
          console.log(`[DEBUG AppSheet] PRE-POST TotalRows=${data.length}`);
        }
        console.log('[DEBUG AppSheet] PRE-POST Row[0]:', JSON.stringify(primerRow, null, 2));
      } catch (e) {
        console.log('[DEBUG AppSheet] Error log PRE-POST:', e?.message);
      }

      // 👇 Llamada original SIN cambios funcionales
      const resp = await postTable(JSON.parse(JSON.stringify(config)), table, data, props);

      // [DEBUG] Respuesta OK de AppSheet
      try {
        const printable = typeof resp === 'string' ? resp : JSON.stringify(resp, null, 2);
        console.log(`[DEBUG AppSheet] RESP OK Tabla=${table} ->`, printable);
      } catch (e) {
        console.log('[DEBUG AppSheet] Error log RESP OK:', e?.message);
      }

      if (!resp) {
        console.warn(`⚠️ Respuesta vacía de postTable para tabla ${table}`)
        return []
      }
      if (typeof resp === 'string') {
        try { return JSON.parse(resp) }
        catch (err) {
          console.warn(`⚠️ Respuesta no-JSON de postTable: ${resp}`)
          return []
        }
      }
      return resp

    } catch (err) {
      // [DEBUG] Respuesta de error detallada (cuerpo y status si vienen)
      try {
        console.log(`[DEBUG AppSheet] RESP ERROR Tabla=${table} ->`, err?.message);
        if (err?.response) {
          console.log('[DEBUG AppSheet] ERROR STATUS:', err.response.status);
          try {
            console.log('[DEBUG AppSheet] ERROR BODY:', JSON.stringify(err.response.data, null, 2));
          } catch (_) {
            console.log('[DEBUG AppSheet] ERROR BODY (raw):', err.response.data);
          }
        } else if (err?.body) {
          console.log('[DEBUG AppSheet] ERROR BODY (body):', err.body);
        } else if (err?.stack) {
          console.log('[DEBUG AppSheet] ERROR STACK:', err.stack);
        }
      } catch (e) {
        console.log('[DEBUG AppSheet] Error log RESP ERROR:', e?.message);
      }

      console.warn(`⚠️ Intento ${i + 1} fallido para postTable: ${err.message}, reintentando en ${delay}ms...`)
      if (i === retries - 1) {
        console.error(`❌ Error en postTable tras ${retries} intentos: ${err.message}`)
        // ✅ CAMBIO: Relanzamos el error para que la fila se entere de que la tarea falló definitivamente.
        throw err;
      }
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}


export function SincronizarContactos() {
  // ... igual a tu versión, sin cambios ...
}

//=============== INICIA EL BLOQUE FINAL Y MÁS SEGURO ===============

export async function ActualizarContacto(phone, datosNuevos = {}) {
    console.log(`📥 [CONTACTOS] Preparando datos para ${phone}.`);

    try {
        // 1. OBTENER EL CONTACTO MÁS RECIENTE DE LA CACHÉ
        const contactoPrevio = getContactoByTelefono(phone);

        let contactoParaEnviar;

        if (contactoPrevio) {
            // Si existe, fusionamos los datos nuevos con los viejos
            contactoParaEnviar = { ...contactoPrevio, ...datosNuevos };
        } else {
            // Si no existe, creamos la estructura base para el nuevo contacto
            contactoParaEnviar = {
                ...datosNuevos,
                TELEFONO: phone,
                FECHA_PRIMER_CONTACTO: new Date().toLocaleDate-String('es-CO'),
                ETIQUETA: 'Nuevo',
                RESP_BOT: 'TRUE'
            };
        }

        // 2. ASEGURAR SIEMPRE LA FECHA DE ÚLTIMO CONTACTO
        contactoParaEnviar.FECHA_ULTIMO_CONTACTO = new Date().toLocaleDateString('es-CO');

        // 3. ACTUALIZAR LA CACHÉ LOCALMENTE
        // El guardado final en AppSheet lo hará la próxima ejecución de ActualizarFechasContacto
        actualizarContactoEnCache(contactoParaEnviar);
        console.log(`✅ [CONTACTOS] Contacto para ${phone} actualizado en caché. El guardado en AppSheet es inminente.`);

    } catch (error) {
        console.error(`❌ [CONTACTOS] Error preparando datos para ${phone}:`, error.message);
    }
}
