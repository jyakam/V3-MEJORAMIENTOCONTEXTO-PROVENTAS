import { ARCHIVO } from '../../config/bot.mjs'
import { EnviarIA } from '../../flujos/bloques/enviarIA.mjs'

function normalizarClave(txt = '') {
  return (txt || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// OPCIÓN 1: SOLO SE ACEPTA MARCADOR CON EMOJI INICIO Y FIN (🧩CLAVE🧩)
export function detectarSeccionesSolicitadas(respuesta) {
  // Solo acepta marcadores con emoji al inicio y al final, clave al medio
  const regex = /🧩([A-Za-z0-9_]+)🧩/g;
  let match;
  const secciones = [];
  console.log('🔍 [MARCADORES] Analizando respuesta para marcadores:', respuesta);

  while ((match = regex.exec(respuesta)) !== null) {
    const claveRaw = match[1].trim();
    const claveNorm = normalizarClave(claveRaw);
    console.log('🟢 [MARCADORES] Marcador VÁLIDO detectado:', claveRaw, '-> Normalizado:', claveNorm);
    secciones.push(claveNorm);
  }

  if (!secciones.length) {
    console.log('🟡 [MARCADORES] No se encontraron marcadores válidos en la respuesta.');
    return null;
  }

  console.log('✅ [MARCADORES] Secciones solicitadas VÁLIDAS:', secciones);
  return secciones;
}

export async function cicloMarcadoresIA(res, txt, state, ctx, { flowDynamic, endFlow, gotoFlow, provider }) {
  let respuesta = res.respuesta || '';
  console.log('🟢 [MARCADORES] Procesando respuesta IA:', respuesta);

  // Nuevo regex SOLO para 🧩CLAVE🧩 (delimitado)
  const marcadorRegex = /🧩([A-Za-z0-9_]+)🧩/g;
  let match;
  let marcadorProcesado = false;

  // Obtener bloques disponibles para validar secciones (opcional: puedes pasar ARCHIVO.PROMPT_BLOQUES)
  const bloquesDisponibles = new Set(Object.keys(ARCHIVO.PROMPT_BLOQUES || {}).map(normalizarClave));
  // También puedes pasar bloques extra según contexto

  while ((match = marcadorRegex.exec(respuesta)) !== null) {
    const claveRaw = match[1].trim();
    const claveNorm = normalizarClave(claveRaw);

    if (!claveNorm) {
      console.log('⚠️ [MARCADORES] Valor de marcador inválido:', match);
      continue;
    }

    // Solo procesar si existe la clave en los bloques
    if (!bloquesDisponibles.has(claveNorm) && !claveNorm.startsWith('paso_')) {
      console.log(`⚠️ [MARCADORES] Marcador detectado "${claveNorm}" pero NO existe como bloque. No se activa.`);
      continue;
    }

    marcadorProcesado = true;
    console.log(`🟢 [MARCADORES] Procesando marcador: ${claveRaw} -> ${claveNorm}`);

    if (claveNorm.startsWith('paso_') && /^\d+$/.test(claveNorm.replace('paso_', ''))) {
      const pasoNum = parseInt(claveNorm.replace('paso_', '')) - 1;
      await state.update({ pasoFlujoActual: pasoNum, seccionesActivas: [] });
      console.log(`🟢 [MARCADORES] Actualizado pasoFlujoActual a PASO ${pasoNum + 1} y limpiadas seccionesActivas`);
    } else {
      const nuevasSecciones = state.get('seccionesActivas') || [];
      if (!nuevasSecciones.includes(claveNorm)) {
        nuevasSecciones.push(claveNorm);
        await state.update({ seccionesActivas: nuevasSecciones });
        console.log(`🟢 [MARCADORES] Añadida sección activa: ${claveNorm}`);
      } else {
        console.log(`🟡 [MARCADORES] Sección ya activa, no se añade: ${claveNorm}`);
      }
    }
  }

  if (marcadorProcesado) {
    // Limpia SOLO los marcadores con emoji al inicio y fin
    const respuestaLimpia = respuesta.replace(/🧩[A-Za-z0-9_]+🧩/g, '').trim();
    console.log('🟢 [MARCADORES] Respuesta limpia tras procesar marcadores:', respuestaLimpia);
    return { respuesta: respuestaLimpia, tipo: res.tipo || 0 };
  }

  console.log('🟢 [MARCADORES] No se procesaron marcadores, devolviendo respuesta original');
  return res;
}
