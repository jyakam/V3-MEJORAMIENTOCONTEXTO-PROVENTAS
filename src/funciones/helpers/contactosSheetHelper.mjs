import { postTable, AppSheetUser } from 'appsheet-connect' // Añadimos AppSheetUser
import { ObtenerFechaActual } from '../../funciones/tiempo.mjs'
import { appsheetId, appsheetKey } from '../../config/bot.mjs' // Cambiamos la importación
import { APPSHEETCONFIG } from '../../config/bot.mjs'
// IMPORTANTE: importa la función para actualizar la cache
import { getContactoByTelefono, actualizarContactoEnCache } from './cacheContactos.mjs'
// PASO 1: IMPORTAMOS NUESTRO NUEVO GESTOR DE LA FILA
import { addTask } from './taskQueue.mjs'

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
  // Mantenemos tu log de depuración existente
  console.log('📦 [DEBUG RESUMEN] Datos enviados a AppSheet:', JSON.stringify(data, null, 2));

  // === LOGS DIAGNÓSTICO REQUEST ===
  const reqLen = JSON.stringify(data).length;
  console.log('[APPSHEET][REQ] Tabla:', table, 'Props=', props, 'PayloadLength=', reqLen);

  // Bucle de reintentos (único)
  for (let i = 0; i < retries; i++) {
    try {
      const t0 = Date.now();
      const resp = await postTable(config, table, data, props);
      const dt = Date.now() - t0;

      // === LOGS DIAGNÓSTICO RESPONSE ===
      console.log(`[APPSHEET][RESP][try=${i+1}] tipo=`, typeof resp, 'tiempoMs=', dt);

      // Caso: respuesta vacía/undefined (p. ej., 204 No Content)
      if (!resp) {
        console.log(`[APPSHEET][RESP][try=${i+1}] cuerpo vacío/undefined (posible 204). Lo tratamos como éxito vacío.`);
        return [];
      }

      // Caso: string (intentar parsear; si no es JSON, tratar como éxito vacío)
      if (typeof resp === 'string') {
        const raw = String(resp);
        console.log(`[APPSHEET][RESP][try=${i+1}] string len=`, raw.length, 'preview=', raw.slice(0, 200));
        try {
          const json = JSON.parse(raw);
          return json;
        } catch (e) {
          console.log(`[APPSHEET][RESP][try=${i+1}] string no-JSON. Lo tratamos como éxito vacío. Motivo:`, e?.message);
          return [];
        }
      }

      // Caso: objeto/array JSON ya parseado
      return resp;

    } catch (err) {
      console.error(`[APPSHEET][ERROR][try=${i+1}]`, err?.name, err?.message);
      if (err?.stack) console.error('[APPSHEET][STACK]', err.stack);

      // Último intento: propagar error (no lo ocultamos)
      if (i === retries - 1) {
        console.error(`❌ [HELPER] Fallo definitivo tras ${retries} intentos.`);
        throw err;
      }
      // Backoff simple
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

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

  // ¿Existe ya en la caché?
  const existeEnCache = !!getContactoByTelefono(phone)
  let contactoCompleto = getContactoByTelefono(phone) || contacto || {}

  const datos = {
    ...contactoCompleto,
    TELEFONO: phone,
    // Si ya existía, conservamos la primera; si es nuevo, la fijamos hoy
    FECHA_PRIMER_CONTACTO: contactoCompleto?.FECHA_PRIMER_CONTACTO || hoy,
    FECHA_ULTIMO_CONTACTO: hoy
  }

  console.log(`🕓 [FECHAS] Contacto ${phone} →`, datos)

  try {
    console.log(`[DEBUG FECHAS] ENCOLAR Tabla=${HOJA_CONTACTOS}`)
    console.log('[DEBUG FECHAS] Row ENCOLADO (crudo):', JSON.stringify(datos, null, 2))

    // ====== INICIO DE LA CORRECCIÓN ======
    // Movemos este bloque aquí arriba para que la variable exista antes de usarla.
    const propsDinamicas = { UserSettings: { DETECTAR: false } }
    // ====== FIN DE la CORRECCIÓN ======

    // Sanitizar/normalizar antes de enviar (fechas a ISO, sin _RowNumber, etc.)
    const row = limpiarRowContacto(datos, propsDinamicas.Action)
    console.log('[DEBUG FECHAS] Row FINAL (sanitizado):', JSON.stringify(row, null, 2))

    console.log(`[DEBUG FECHAS] Acción AppSheet = ${propsDinamicas.Action}`)
    console.log('[FECHAS][ROW] claves=', Object.keys(row).sort());
console.log('[FECHAS][ROW] snapshot:', { TELEFONO: row.TELEFONO, NOMBRE: row.NOMBRE, EMAIL: row.EMAIL, CIUDAD: row.CIUDAD, _RowNumber: row._RowNumber });

    // 🔑 Instancia FRESCA de AppSheet por operación (evita estado raro)
    await addTask(() => {
      // Ya no creamos una configuración local. Usamos la que sabemos que funciona.
      console.log('[DEBUG FECHAS] Usando la configuración global APPSHEETCONFIG para la operación')
      return postTableWithRetrySafe(APPSHEETCONFIG, HOJA_CONTACTOS, [row], propsDinamicas)
    })

    console.log(`📆 Contacto ${phone} actualizado con fechas.`)
    actualizarContactoEnCache({ ...contactoCompleto, ...datos })
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
    // LAS LÍNEAS PROBLEMÁTICAS HAN SIDO ELIMINADAS DE AQUÍ
  }
}

// VERSIÓN FINAL CORREGIDA - REEMPLAZAR LA FUNCIÓN COMPLETA
export async function ActualizarResumenUltimaConversacion(phone, nuevoResumen) {
  console.log(`🧠 Intentando guardar resumen para ${phone}...`);

  if (
    !nuevoResumen ||
    nuevoResumen.length < 10 ||
    nuevoResumen.trim().startsWith('{') ||
    nuevoResumen.trim().startsWith('```json')
  ) {
    console.log(`⛔ Resumen ignorado por formato inválido o de baja calidad para ${phone}`);
    return;
  }

  const contactoPrevio = getContactoByTelefono(phone) || { TELEFONO: phone };

  // --- INICIO DE LA NUEVA LIMPIEZA ROBUSTA (DESACTIVADA PARA NO CAMBIAR LÓGICA) ---
  // const limpiarTexto = (texto) => (texto || '').replace(/\s\s+/g, ' ').trim();
  // const resumenLimpio1 = limpiarTexto(nuevoResumen);
  // const resumenLimpio2 = limpiarTexto(contactoPrevio.RESUMEN_ULTIMA_CONVERSACION);
  // const resumenLimpio3 = limpiarTexto(contactoPrevio.RESUMEN_2);
  // --- FIN DE LA NUEVA LIMPIEZA ROBUSTA (DESACTIVADA) ---

  // === LOGS DIAGNÓSTICO (ANTES DE ARMAR ROW) ===
  const prevN = (contactoPrevio.NOMBRE || '');
  const prevE = (contactoPrevio.EMAIL || '');
  const prevC = (contactoPrevio.CIUDAD || '');
  console.log('[RESUMEN][ANTES] contactoPrevio (claves):', {
    TELEFONO: phone, NOMBRE: prevN, EMAIL: prevE, CIUDAD: prevC, _RowNumber: contactoPrevio?._RowNumber
  });
  console.log('[RESUMEN][ANTES] tamaños:', {
    nuevo: (nuevoResumen || '').length,
    ult: (contactoPrevio.RESUMEN_ULTIMA_CONVERSACION || '').length,
    r2: (contactoPrevio.RESUMEN_2 || '').length,
    r3: (contactoPrevio.RESUMEN_3 || '').length
  });

  // Construcción de datos SIN alterar lógica existente (usamos valores originales)
  const datosParaGuardar = {
    ...contactoPrevio,
    TELEFONO: phone,
    RESUMEN_ULTIMA_CONVERSACION: nuevoResumen, // sin limpieza para no cambiar semántica
    RESUMEN_2: (contactoPrevio.RESUMEN_ULTIMA_CONVERSACION || ''),
    RESUMEN_3: (contactoPrevio.RESUMEN_2 || '')
  };

  try {
    const props = { Action: 'Edit' };
    const row = limpiarRowContacto(datosParaGuardar, 'Edit');

    // LOGS del row final que se enviará a AppSheet
    console.log('[RESUMEN][ROW] Acción=Edit; claves=', Object.keys(row).sort());
    console.log('[RESUMEN][ROW] tamaños:', {
      ult: (row.RESUMEN_ULTIMA_CONVERSACION || '').length,
      r2: (row.RESUMEN_2 || '').length,
      r3: (row.RESUMEN_3 || '').length
    });

    await addTask(() => postTableWithRetrySafe(APPSHEETCONFIG, HOJA_CONTACTOS, [row], props));

    console.log('[RESUMEN][POST-APPSHEET] Update aparente OK. Procediendo a cache con datosParaGuardar (no respuesta remota).');
    console.log(`📝 Historial de resúmenes actualizado en AppSheet para ${phone}`);
    actualizarContactoEnCache(datosParaGuardar);
  } catch (err) {
    console.log(`❌ Error definitivo guardando historial de resúmenes para ${phone}. La caché no será actualizada.`);
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
