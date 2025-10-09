import { postTable, AppSheetUser } from 'appsheet-connect' // Añadimos AppSheetUser
import { ObtenerFechaActual } from '../../funciones/tiempo.mjs'
import { appsheetId, appsheetKey } from '../../config/bot.mjs' // Cambiamos la importación
import { APPSHEETCONFIG } from '../../config/bot.mjs'
// IMPORTANTE: importa la función para actualizar la cache
import { getContactoByTelefono, actualizarContactoEnCache } from './cacheContactos.mjs'
// PASO 1: IMPORTAMOS NUESTRO NUEVO GESTOR DE LA FILA
import { addTask } from './taskQueue.mjs'
import { getTable } from 'appsheet-connect'
import { COLUMNAS_VALIDAS } from '../../config/contactos.mjs';

// --- INICIO NUEVA FUNCIÓN DE LIMPIEZA ---
// Esta función elimina caracteres que pueden causar problemas en AppSheet
const limpiarTextoParaAppSheet = (texto) => {
  if (!texto || typeof texto !== 'string') return '';
  // Reemplaza asteriscos, múltiples espacios y saltos de línea por un solo espacio
  return texto.replace(/[*]/g, '').replace(/[\n\r]+/g, ' ').replace(/\s\s+/g, ' ').trim();
};
// --- FIN NUEVA FUNCIÓN DE LIMPIEZA ---

// === Helpers de apoyo para diagnóstico ===
function ahoraMarca() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

// Edita una fila por TELEFONO con un payload arbitrario (usa Action Edit)
async function editarPorTelefono(payloadMin) {
  const props = { Action: 'Edit' };
  const row = limpiarRowContacto(payloadMin, 'Edit');
  console.log('[DIAG EDIT] Acción=Edit; claves=', Object.keys(row).sort());
  const result = await addTask(() => postTableWithRetrySafe(APPSHEETCONFIG, HOJA_CONTACTOS, [row], props));
  return result;
}

// -- utilitario local para contactosSheetHelper --
function aIso(entrada) {
  if (!entrada || typeof entrada !== 'string') return entrada
  const s = entrada.trim()
  // admite "dd/mm/yyyy" o "dd-mm-yyyy"
  const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/)
  if (m) {
    const [_, dd, mm, yyyy] = m
    const d = String(dd).padStart(2, '0')
    const M = String(mm).padStart(2, '0')
    return `${yyyy}-${M}-${d}` // ISO
  }
  // si ya viene ISO o algo distinto, lo dejamos igual
  return entrada
}

// ====== NUEVO BLOQUE DE CÓDIGO PARA PEGAR ======

// Wrapper local para que la respuesta vacía de AppSheet no rompa la ejecución
async function postTableWithRetrySafe(config, table, data, props, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      // usamos la misma firma que postTable, pero tolerante a cuerpo vacío / string
      const resp = await postTable(config, table, data, props);
      if (!resp) return []; // AppSheet a veces responde sin cuerpo (204), lo tratamos como éxito sin datos.
      if (typeof resp === 'string') {
        try { 
          return JSON.parse(resp); 
        } catch { 
          return []; // Si la respuesta es un string no-JSON, lo tratamos como éxito sin datos.
        }
      }
      return resp;
    } catch (err) {
      // El error SyntaxError por cuerpo vacío será capturado aquí y se reintentará.
      console.error(`[APPSHEET][ERROR][try=${i+1}]`, err?.name, err?.message);
      if (i === retries - 1) {
        console.error(`❌ [HELPER] Fallo definitivo en postTable tras ${retries} intentos.`);
        throw err; // Solo lanzamos el error en el último reintento.
      }
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

// ====== FIN DEL NUEVO BLOQUE ======

function limpiarRowContacto(row, action = 'Add') { // Le añadimos el parámetro "action"
  const out = { ...row }

  // 1) Solo borramos el _RowNumber si la acción es 'Add' (añadir nuevo)
  // Si es 'Edit', lo necesitamos para que AppSheet sepa a quién editar.
  if (action === 'Add') {
    delete out._RowNumber
  }

  // 2) mapear 'TIPO DE CLIENTE' -> 'TIPO_DE_CLIENTE' si llega con espacio
  if (out['TIPO DE CLIENTE'] && !out.TIPO_DE_CLIENTE) {
    out.TIPO_DE_CLIENTE = out['TIPO DE CLIENTE']
    delete out['TIPO DE CLIENTE']
  }
  // 3) no mandar columnas inexistentes aquí (ej: FECHA_NACIMIENTO)
  delete out.FECHA_NACIMIENTO

  // Aseguramos que RESP_BOT se envíe como texto 'TRUE' o 'FALSE'
  if (out.RESP_BOT !== undefined) {
    out.RESP_BOT = String(out.RESP_BOT).toUpperCase();
  }

  // 4) fechas a ISO cuando existan
  if (out.FECHA_PRIMER_CONTACTO) out.FECHA_PRIMER_CONTACTO = aIso(out.FECHA_PRIMER_CONTACTO)
  if (out.FECHA_ULTIMO_CONTACTO) out.FECHA_ULTIMO_CONTACTO = aIso(out.FECHA_ULTIMO_CONTACTO)
  if (out.FECHA_DE_CUMPLEANOS) out.FECHA_DE_CUMPLEANOS = aIso(out.FECHA_DE_CUMPLEANOS)

  return out
}

// Todas las actualizaciones desde este helper son EDICIONES a una fila existente
const PROPIEDADES = { Action: 'Edit', UserSettings: { DETECTAR: false } }
const HOJA_CONTACTOS = process.env.PAG_CONTACTOS

// NUEVO BLOQUE CORREGIDO
export async function ActualizarFechasContacto(contacto, phone) {
  const hoy = ObtenerFechaActual()

  let contactoPrevio = getContactoByTelefono(phone) || contacto || {}
  const action = contactoPrevio._RowNumber ? 'Edit' : 'Add';

  let datosAEnviar = {
    ...contactoPrevio,
    TELEFONO: phone,
    FECHA_PRIMER_CONTACTO: contactoPrevio?.FECHA_PRIMER_CONTACTO || hoy,
    FECHA_ULTIMO_CONTACTO: hoy
  }

  // --- INICIO DE LA CORRECCIÓN FINAL ---
  // Si es una acción de 'Añadir', nos aseguramos de que el objeto tenga todas las columnas y valores por defecto válidos.
  if (action === 'Add') {
    console.log('📝 [FECHAS] Acción "Add" detectada. Construyendo esqueleto completo y válido...');
    const esqueleto = COLUMNAS_VALIDAS.reduce((acc, col) => {
        acc[col] = ''; // 1. Inicializa todas las columnas como vacías
        return acc;
    }, {});
    
    // 2. Fusionamos el esqueleto con los datos que tenemos y AÑADIMOS los valores por defecto REQUERIDOS.
    datosAEnviar = {
        ...esqueleto,
        ...datosAEnviar,
        ETIQUETA: 'Nuevo', // Valor por defecto para nuevos contactos
        RESP_BOT: 'TRUE'   // Valor por defecto para que el bot responda
    };
  }
  // --- FIN DE LA CORRECCIÓN FINAL ---

  console.log(`🕓 [FECHAS] Contacto ${phone} → Acción: ${action}`)

  try {
    const row = limpiarRowContacto(datosAEnviar, action)
    console.log('[DEBUG FECHAS] Row FINAL (sanitizado):', JSON.stringify(row, null, 2))

    const propsDinamicas = { Action: action, UserSettings: { DETECTAR: false } };

    const respuesta = await addTask(() => {
      console.log('[DEBUG FECHAS] Usando la configuración global APPSHEETCONFIG para la operación')
      return postTableWithRetrySafe(APPSHEETCONFIG, HOJA_CONTACTOS, [row], propsDinamicas)
    })

    console.log(`📆 Contacto ${phone} actualizado con fechas.`)
    
    if (respuesta && respuesta.ok && respuesta.data && respuesta.data.length > 0) {
        console.log('✅ [SYNC] Sincronizando caché con respuesta de AppSheet.');
        actualizarContactoEnCache(respuesta.data[0]);
    } else {
        console.log('⚠️ [SYNC] No hubo respuesta de AppSheet, actualizando caché con datos locales.');
        actualizarContactoEnCache(datosAEnviar);
    }

  } catch (err) {
    console.log(`❌ Error actualizando fechas para ${phone} via queue:`, err?.message)
    if (err?.response) {
      console.log('[DEBUG FECHAS] ERROR STATUS:', err.response.status)
      const body = err.response.data ?? err.response.body ?? {}
      try { console.log('[DEBUG FECHAS] ERROR BODY:', JSON.stringify(body, null, 2)) }
      catch { console.log('[DEBUG FECHAS] ERROR BODY (raw):', body) }
    } else if (err?.body) {
      console.log('[DEBUG FECHAS] ERROR BODY (body):', err.body)
    } else if (err?.stack) {
      console.log('[DEBUG FECHAS] ERROR STACK:', err.stack)
    }
  }
}

export async function ActualizarResumenUltimaConversacion(contacto, phone, resumen) {
  console.log(`🧠 Intentando guardar resumen para ${phone}:`, resumen)

  // Validaciones para guardar solo resúmenes útiles
  if (
    !resumen ||
    resumen.length < 5 ||
    resumen.trim().startsWith('{') ||
    resumen.trim().startsWith('```json')
  ) {
    console.log(`⛔ Resumen ignorado por formato inválido para ${phone}`)
    return
  }

  // --- INICIO DE LA CORRECCIÓN CLAVE ---
  // Construimos el "paquete completo" fusionando el contacto existente con el nuevo resumen.
  let contactoCompleto = getContactoByTelefono(phone) || contacto || {};

  const datos = {
    ...contactoCompleto,
    TELEFONO: phone,
    RESUMEN_ULTIMA_CONVERSACION: resumen.trim(),
    FECHA_ULTIMO_CONTACTO: ObtenerFechaActual() // Aseguramos actualizar la fecha
  }
  // --- FIN DE LA CORRECCIÓN CLAVE ---

  try {
    const propsDinamicas = { Action: 'Edit', UserSettings: { DETECTAR: false } }
    
    // Usamos 'Edit' porque esta función siempre actualiza un contacto existente.
    const row = limpiarRowContacto(datos, 'Edit')
    console.log('[DEBUG RESUMEN] Row FINAL (sanitizado):', JSON.stringify(row, null, 2))

    // Instancia FRESCA por operación
    await addTask(() => {
      console.log('[DEBUG RESUMEN] Usando la configuración global APPSHEETCONFIG para la operación')
      return postTableWithRetrySafe(APPSHEETCONFIG, HOJA_CONTACTOS, [row], propsDinamicas)
    })

    console.log(`📝 Resumen actualizado para ${phone}`)
    actualizarContactoEnCache({ ...contactoCompleto, ...datos })
  } catch (err) {
    console.log(`❌ Error guardando resumen para ${phone} via queue:`, err?.message)
    
    actualizarContactoEnCache({ ...contactoCompleto, ...datos })
    console.log(`⚠️ Cache actualizada localmente para ${phone} pese a error en AppSheet`)
  }
}

// NUEVO BLOQUE CORREGIDO
// Esta es la nueva función centralizada para guardar cualquier tipo de actualización de contacto.
export async function GuardarContacto(datosContacto) {
  const phone = datosContacto.TELEFONO;
  if (!phone) {
    console.error('❌ [GuardarContacto] Se intentó guardar un contacto sin TELEFONO.');
    return;
  }

  // Determinamos si es 'Add' o 'Edit' basado en si tiene _RowNumber
  const action = datosContacto._RowNumber ? 'Edit' : 'Add';

  try {
    const props = { UserSettings: { DETECTAR: false } }; // Propiedades simplificadas

    // Limpiamos la fila usando nuestra función inteligente
    const row = limpiarRowContacto(datosContacto, action);

    console.log(`[GUARDAR CONTACTO] Encolando Tarea. Acción=${action} para ${phone}`);

    await addTask(() => {
      console.log(`[GUARDAR CONTACTO] Ejecutando tarea desde la fila...`);
      return postTableWithRetrySafe(APPSHEETCONFIG, HOJA_CONTACTOS, [row], props);
    });

    console.log(`✅ [GuardarContacto] Tarea para ${phone} completada.`);
    // Siempre actualizamos la caché local para mantener la consistencia
    actualizarContactoEnCache(row);
  } catch (err) {
    console.error(`❌ [GuardarContacto] Error fatal en la tarea para ${phone}:`, err.message);
    // LA LÍNEA PROBLEMÁTICA HA SIDO ELIMINADA DE AQUÍ.
    // Ya no se actualiza la caché si hay un error de guardado.
  }
}
