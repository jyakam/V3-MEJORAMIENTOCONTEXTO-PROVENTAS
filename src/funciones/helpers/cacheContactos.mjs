import { getTable } from 'appsheet-connect'
import { APPSHEETCONFIG, CONTACTOS, BOT } from '../../config/bot.mjs'

const CACHE = { LISTA_CONTACTOS: [] }
console.log('🗃️ [CACHE_CONTACTOS] Inicializando caché de contactos')

export async function cargarContactosDesdeAppSheet() {
  try {
    console.log('🔄 [CACHE_CONTACTOS] Intentando cargar contactos desde AppSheet');
    console.log(`🌐 [CACHE_CONTACTOS] Usando tabla: ${process.env.PAG_CONTACTOS || 'No definida'}`);
    if (!process.env.PAG_CONTACTOS) {
      console.error('❌ [CACHE_CONTACTOS] PAG_CONTACTOS no está definida');
      return;
    }
    const datos = await getTable(APPSHEETCONFIG, process.env.PAG_CONTACTOS);
    // console.log(`📥 [CACHE_CONTACTOS] Datos crudos recibidos:`, datos);
    if (Array.isArray(datos)) {
      CACHE.LISTA_CONTACTOS = datos;
      console.log(`🗃️ [CACHE_CONTACTOS] Cache actualizado (${CACHE.LISTA_CONTACTOS.length} registros)`);
      CONTACTOS.LISTA_CONTACTOS = [...CACHE.LISTA_CONTACTOS];
      console.log(`🗃️ [CACHE_CONTACTOS] Sincronizado con CONTACTOS: ${CONTACTOS.LISTA_CONTACTOS.length} contactos`);
    } else {
      console.warn('⚠️ [CACHE_CONTACTOS] Datos inválidos:', datos);
      CACHE.LISTA_CONTACTOS = [];
      CONTACTOS.LISTA_CONTACTOS = [];
    }
  } catch (e) {
    console.error('❌ [CACHE_CONTACTOS] Error cargando contactos:', e.message, e.stack);
    CACHE.LISTA_CONTACTOS = [];
    CONTACTOS.LISTA_CONTACTOS = [];
  }
  console.log(`🗃️ [CACHE_CONTACTOS] Estado final: ${CACHE.LISTA_CONTACTOS.length} contactos`);
}

export function getContactoByTelefono(telefono) {
  const normalizedTelefono = telefono.replace(/^\+/, '');
 // console.log(`🔍 [CACHE_CONTACTOS] Buscando ${normalizedTelefono} en caché con ${CACHE.LISTA_CONTACTOS.length} contactos`);
  const contacto = CACHE.LISTA_CONTACTOS.find(c => {
    const normalizedCTelefono = c.TELEFONO ? c.TELEFONO.replace(/^\+/, '') : '';
    return normalizedCTelefono === normalizedTelefono;
  }) || null;
  // console.log('[DEBUG][USO] Tipo de contacto:', typeof contacto, contacto);
  return contacto;
}

export function actualizarContactoEnCache(contacto) {
  // console.log(`🗃️ [CACHE_CONTACTOS] Actualizando contacto:`, contacto);
  if (!contacto?.TELEFONO) {
    console.error('❌ [CACHE_CONTACTOS] Contacto inválido, falta TELEFONO');
    return;
  }

  const idx = CACHE.LISTA_CONTACTOS.findIndex(c => c.TELEFONO === contacto.TELEFONO);

  // === LOGS DIAGNÓSTICO DE MERGE (ANTES DE ACTUALIZAR) ===
  const anterior = idx >= 0 ? CACHE.LISTA_CONTACTOS[idx] : null;
  const snapPrevio = anterior ? {
    TEL: anterior.TELEFONO,
    NOMBRE: anterior.NOMBRE,
    EMAIL: anterior.EMAIL,
    CIUDAD: anterior.CIUDAD
  } : null;
  const snapEntrante = {
    TEL: contacto.TELEFONO,
    NOMBRE: contacto.NOMBRE,
    EMAIL: contacto.EMAIL,
    CIUDAD: contacto.CIUDAD
  };
  console.log('🧩 [CACHE_CONTACTOS][MERGE] PREV → NUEVO:', snapPrevio, '→', snapEntrante);

  if (snapPrevio && snapPrevio.NOMBRE && snapEntrante.NOMBRE && snapPrevio.NOMBRE !== snapEntrante.NOMBRE) {
    console.warn('⚠️ [CACHE_CONTACTOS] CAMBIO DE NOMBRE DETECTADO', { de: snapPrevio.NOMBRE, a: snapEntrante.NOMBRE });
  }

  // --- INICIO DEL BLINDAJE ---
  // Si ya existe un nombre real, evitamos que se sobrescriba con el nombre del bot o con "Sin Nombre".
  if (snapPrevio && snapPrevio.NOMBRE && snapPrevio.NOMBRE !== 'Sin Nombre') {
    const nombreBot = BOT.NOMBRE || 'Laura'; // Usamos el nombre del bot desde la config, con un fallback
    if (snapEntrante.NOMBRE === nombreBot || snapEntrante.NOMBRE === 'Sin Nombre') {
      console.error(`🔥🔥🔥 [BLINDAJE] SE BLOQUEÓ UN INTENTO DE CORRUPCIÓN DE NOMBRE PARA ${contacto.TELEFONO} 🔥🔥🔥`);
      console.error(`- Se intentó cambiar "${snapPrevio.NOMBRE}" por "${snapEntrante.NOMBRE}". La operación fue denegada.`);
      // Restablecemos el nombre correcto en el objeto de contacto antes de continuar.
      contacto.NOMBRE = snapPrevio.NOMBRE;
    }
  }
  // --- FIN DEL BLINDAJE ---

  if (idx >= 0) {
    CACHE.LISTA_CONTACTOS[idx] = { ...CACHE.LISTA_CONTACTOS[idx], ...contacto };
  } else {
    CACHE.LISTA_CONTACTOS.push(contacto);
  }

  console.log(`✅ [CACHE_CONTACTOS] Contacto ${contacto.TELEFONO} actualizado`);
  CONTACTOS.LISTA_CONTACTOS = [...CACHE.LISTA_CONTACTOS];
  console.log(`🗃️ [CACHE_CONTACTOS] Sincronizado con CONTACTOS: ${CONTACTOS.LISTA_CONTACTOS.length} contactos`);
  console.log(`🗃️ [CACHE_CONTACTOS] Estado actual: ${CACHE.LISTA_CONTACTOS.length} contactos`);
}

export function getCacheContactos() {
  return CACHE.LISTA_CONTACTOS;
}
