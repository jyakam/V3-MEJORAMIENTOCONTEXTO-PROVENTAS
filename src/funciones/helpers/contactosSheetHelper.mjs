import { postTable, AppSheetUser } from 'appsheet-connect' // Añadimos AppSheetUser
import { ObtenerFechaActual } from '../../funciones/tiempo.mjs'
import { appsheetId, appsheetKey } from '../../config/bot.mjs' // Cambiamos la importación
import { APPSHEETCONFIG } from '../../config/bot.mjs'
// IMPORTANTE: importa la función para actualizar la cache
import { getContactoByTelefono, actualizarContactoEnCache } from './cacheContactos.mjs'
// PASO 1: IMPORTAMOS NUESTRO NUEVO GESTOR DE LA FILA
import { addTask } from './taskQueue.mjs'
import { getTable } from 'appsheet-connect'

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

// PROPUESTA (solo logs + manejo explícito de cuerpo vacío/no-JSON)
// ¿Autorizas reemplazar la función entera por esta versión?
async function postTableWithRetrySafe(config, table, data, props, retries = 3, delay = 1000) {
  console.log('📦 [DEBUG RESUMEN] Datos enviados a AppSheet:', JSON.stringify(data, null, 2));

  const reqLen = JSON.stringify(data).length;
  console.log('[APPSHEET][REQ] Tabla:', table, 'Props=', props, 'PayloadLength=', reqLen);

  for (let i = 0; i < retries; i++) {
    try {
      const t0 = Date.now();
      const resp = await postTable(config, table, data, props);
      const dt = Date.now() - t0;
      console.log(`[APPSHEET][RESP][try=${i+1}] tipo=`, typeof resp, 'tiempoMs=', dt);

      // Respuesta vacía/undefined (p.ej., 204 No Content) => éxito ambiguo
      if (resp == null) {
        console.log(`[APPSHEET][RESP][try=${i+1}] cuerpo vacío/undefined (posible 204).`);
        return { ok: true, hasBody: false, ambiguous: true, status: undefined, data: undefined };
      }

      if (typeof resp === 'string') {
        const raw = String(resp);
        console.log(`[APPSHEET][RESP][try=${i+1}] string len=`, raw.length, 'preview=', raw.slice(0, 200));
        try {
          const json = JSON.parse(raw);
          return { ok: true, hasBody: true, ambiguous: false, status: undefined, data: json };
        } catch (e) {
          console.log(`[APPSHEET][RESP][try=${i+1}] string no-JSON; lo tratamos como vacío/ambiguo. Motivo:`, e?.message);
          return { ok: true, hasBody: false, ambiguous: true, status: undefined, data: undefined };
        }
      }

      // Objeto ya parseado
      return { ok: true, hasBody: true, ambiguous: false, status: undefined, data: resp };

    } catch (err) {
      const msg = err?.message || '';
      const isEmptyJSON = err?.name === 'SyntaxError' && /Unexpected end of JSON input/i.test(msg);
      if (isEmptyJSON) {
        console.log(`[APPSHEET][RESP][try=${i+1}] SyntaxError por cuerpo vacío (posible 204). Lo tratamos como ambiguous.`);
        return { ok: true, hasBody: false, ambiguous: true, status: undefined, data: undefined };
      }
      console.error(`[APPSHEET][ERROR][try=${i+1}]`, err?.name, msg);
      if (i === retries - 1) {
        console.error(`❌ [HELPER] Fallo definitivo tras ${retries} intentos.`);
        throw err;
      }
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

function limpiarRowContacto(row, action = 'Add') { // Le añadimos el parámetro "action"
  const out = { ...row }

  // Siempre eliminamos _RowNumber del payload para evitar inconsistencias; la Key es TELEFONO
  delete out._RowNumber

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

  const existeEnCache = !!getContactoByTelefono(phone)
  let contactoCompleto = getContactoByTelefono(phone) || contacto || {}

  // --- INICIO CORRECCIÓN: DETERMINAR ACCIÓN ---
  // Si el contacto NO tiene un _RowNumber, es una acción de 'Añadir' (Add). Si lo tiene, es 'Editar' (Edit).
  const action = contactoCompleto._RowNumber ? 'Edit' : 'Add';
  // --- FIN CORRECCIÓN: DETERMINAR ACCIÓN ---

  const datos = {
    ...contactoCompleto,
    TELEFONO: phone,
    FECHA_PRIMER_CONTACTO: contactoCompleto?.FECHA_PRIMER_CONTACTO || hoy,
    FECHA_ULTIMO_CONTACTO: hoy
  }

  console.log(`🕓 [FECHAS] Contacto ${phone} → Acción: ${action}`, datos)

  try {
    console.log(`[DEBUG FECHAS] ENCOLAR Tabla=${HOJA_CONTACTOS}`)
    
    // Pasamos la acción correcta ('Add' o 'Edit') a la función de limpieza
    const row = limpiarRowContacto(datos, action)
    console.log('[DEBUG FECHAS] Row FINAL (sanitizado):', JSON.stringify(row, null, 2))

    const propsDinamicas = { Action: action, UserSettings: { DETECTAR: false } };

    // 🔑 Capturamos la respuesta de AppSheet
    const respuesta = await addTask(() => {
      console.log('[DEBUG FECHAS] Usando la configuración global APPSHEETCONFIG para la operación')
      return postTableWithRetrySafe(APPSHEETCONFIG, HOJA_CONTACTOS, [row], propsDinamicas)
    })

    console.log(`📆 Contacto ${phone} actualizado con fechas.`)
    
    // --- INICIO CORRECCIÓN DE SINCRONIZACIÓN ---
    // Si AppSheet nos devolvió el contacto creado/actualizado (con _RowNumber), usamos esa información para actualizar el caché.
    if (respuesta && respuesta.ok && respuesta.data && respuesta.data.length > 0) {
        console.log('✅ [SYNC] Sincronizando caché con respuesta de AppSheet.');
        actualizarContactoEnCache(respuesta.data[0]);
    } else {
        console.log('⚠️ [SYNC] No hubo respuesta de AppSheet, actualizando caché con datos locales.');
        actualizarContactoEnCache({ ...contactoCompleto, ...datos });
    }
    // --- FIN CORRECCIÓN DE SINCRONIZACIÓN ---

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
