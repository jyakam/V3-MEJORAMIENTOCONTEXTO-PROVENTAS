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
    r2: (contactoPrevio.RESUMEN_2 || '').length
  });

  // Payload MÍNIMO (sin spread de contactoPrevio)
  const datosParaGuardarMin = {
    TELEFONO: phone,
    RESUMEN_ULTIMA_CONVERSACION: limpiarTextoParaAppSheet(nuevoResumen),
    RESUMEN_2: limpiarTextoParaAppSheet(contactoPrevio.RESUMEN_ULTIMA_CONVERSACION || ''),
    FECHA_ULTIMO_CONTACTO: ObtenerFechaActual()
  };

  try {
    const props = { Action: 'Edit' };
    const row = limpiarRowContacto(datosParaGuardarMin, 'Edit');

    console.log('[RESUMEN][ROW] Acción=Edit; claves=', Object.keys(row).sort());
    console.log('[RESUMEN][ROW] tamaños:', {
      ult: (row.RESUMEN_ULTIMA_CONVERSACION || '').length,
      r2: (row.RESUMEN_2 || '').length
    });

    const result = await addTask(() => postTableWithRetrySafe(APPSHEETCONFIG, HOJA_CONTACTOS, [row], props));

    if (result && result.ok) {
      if (result.hasBody && !result.ambiguous) {
        console.log('[RESUMEN][POST-APPSHEET] Éxito confirmado con cuerpo. Actualizando caché local.');
        actualizarContactoEnCache(datosParaGuardarMin);
                  } else {
        console.log('[RESUMEN][POST-APPSHEET] Respuesta ambigua (204/empty). Iniciamos read-after-write por TELEFONO:', phone);

        try {
          // 1) READ-AFTER-WRITE: leer remoto
          const rows = await getTable(APPSHEETCONFIG, HOJA_CONTACTOS);
          const remoto = Array.isArray(rows)
            ? rows.find(r => String(r.TELEFONO) === String(phone))
            : undefined;

          const localUlt = (datosParaGuardarMin.RESUMEN_ULTIMA_CONVERSACION || '');
          const localUltLen = localUlt.length;

          if (!remoto) {
            console.log('⚠️ [READ-AFTER-WRITE] No se encontró el contacto remoto tras Edit ambiguo.');

            // 2) DIAG Paso A: intentemos marcar ETIQUETA para verificar si la fila es editable
            const marca = `AUTO_RESUMEN_TEST_${ahoraMarca()}`;
            console.log('🧪 [DIAG] Enviando ETIQUETA de prueba:', marca);
            await editarPorTelefono({ TELEFONO: phone, ETIQUETA: marca });

            // 3) leer de nuevo
            const rows2 = await getTable(APPSHEETCONFIG, HOJA_CONTACTOS);
            const remoto2 = Array.isArray(rows2)
              ? rows2.find(r => String(r.TELEFONO) === String(phone))
              : undefined;

            if (remoto2 && remoto2.ETIQUETA === marca) {
              console.log('✅ [DIAG] ETIQUETA sí cambió → la fila es editable; el problema está en el campo de resumen.');
            } else {
              console.log('❌ [DIAG] ETIQUETA no cambió → parece que la fila no es editable con la API/Key actual o está filtrada.');
            }

            console.log('⚠️ [READ-AFTER-WRITE] Caché NO actualizada.');
            return;
          }

          const remotoLen = (remoto.RESUMEN_ULTIMA_CONVERSACION || '').length;

          if (remotoLen === localUltLen && remotoLen > 0) {
            console.log('✅ [READ-AFTER-WRITE] Confirmado en AppSheet. Actualizamos caché local.');
            actualizarContactoEnCache({
              TELEFONO: phone,
              RESUMEN_ULTIMA_CONVERSACION: remoto.RESUMEN_ULTIMA_CONVERSACION || '',
              RESUMEN_2: remoto.RESUMEN_2 || '',
              FECHA_ULTIMO_CONTACTO: remoto.FECHA_ULTIMO_CONTACTO || datosParaGuardarMin.FECHA_ULTIMO_CONTACTO
            });
          } else {
            console.log(`⚠️ [READ-AFTER-WRITE] No coincide longitud remoto(${remotoLen}) vs local(${localUltLen}).`);

            // 4) DIAG Paso B: intento con RESUMEN corto (para descartar límite de tamaño/validación)
            const pruebaCorta = `[OK] ${ahoraMarca()}`;
            console.log('🧪 [DIAG] Intento corto RESUMEN_ULTIMA_CONVERSACION:', pruebaCorta);
            await editarPorTelefono({ TELEFONO: phone, RESUMEN_ULTIMA_CONVERSACION: pruebaCorta });

            // 5) leer tercera vez
            const rows3 = await getTable(APPSHEETCONFIG, HOJA_CONTACTOS);
            const remoto3 = Array.isArray(rows3)
              ? rows3.find(r => String(r.TELEFONO) === String(phone))
              : undefined;

            const remoto3Len = (remoto3?.RESUMEN_ULTIMA_CONVERSACION || '').length;

            if (remoto3 && remoto3Len === pruebaCorta.length) {
              console.log('✅ [DIAG] El resumen corto SÍ se guardó → probable restricción de tamaño/validación en AppSheet para el largo.');
              console.log('⚠️ [READ-AFTER-WRITE] Caché NO actualizada con el largo original (revisar AppSheet: tipo LongText, Editable_If, Valid_If).');
            } else {
              console.log('❌ [DIAG] Ni siquiera el resumen corto se guardó → problema de permisos/edición/slice/Editable_If en AppSheet.');
            }
          }

        } catch (eRaw) {
          console.log('⚠️ [READ-AFTER-WRITE] Error durante diagnóstico tras 204:', eRaw?.message || eRaw);
        }
      }

      console.log(`📝 Historial de resúmenes procesado para ${phone}`);
    } else {
      console.log('❌ [RESUMEN][POST-APPSHEET] Error o respuesta no OK. Caché NO actualizada.');
    }
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
