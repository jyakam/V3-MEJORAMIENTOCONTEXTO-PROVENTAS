// /src/bc/cargarBC.mjs
import { getTxtDoc, getIdDocFromUrl } from 'googledocs-downloader'
import { BOT, ARCHIVO } from '../config/bot.mjs'

/**
 * Esta función se debe llamar UNA sola vez al iniciar el bot.
 * Descarga el documento desde Google Docs, extrae los bloques/secciones y los guarda en memoria global.
 */
export async function cargarYDividirBC() {
  try {
    if (!BOT.URLPROMPT) {
      console.error('❌ [cargarBC] No se ha configurado la URL de la Base de Conocimiento (BOT.URLPROMPT).')
      return
    }
    console.log('📥 [cargarBC] Descargando Base de Conocimiento desde Google Docs...')
    const rawText = await getTxtDoc(getIdDocFromUrl(BOT.URLPROMPT))
    const bloques = extraerBloquesBC(rawText)
    ARCHIVO.PROMPT_BLOQUES = bloques // Guarda todos los bloques en memoria global

    // Extrae los pasos de SECCION 1 como array (si tienes pasos anidados)
    const claveSeccion1 = Object.keys(bloques).find(k => k.includes('seccion_1'))
    if (claveSeccion1) {
      ARCHIVO.PROMPT_BLOQUES.PASOS_FLUJO = extraerPasosSeccion1(bloques[claveSeccion1])
      console.log('✅ [cargarBC] SECCION 1 dividida en', ARCHIVO.PROMPT_BLOQUES.PASOS_FLUJO.length, 'pasos.')
    }

    // Ya NO busca categorías, pues ahora TODO son secciones principales
    // Puedes eliminar el bloque que busca categorías

    console.log('✅ [cargarBC] Base de Conocimiento cargada y dividida en', Object.keys(bloques).length, 'bloques.')
    return bloques
  } catch (err) {
    console.error('❌ [cargarBC] Error al cargar y dividir la Base de Conocimiento:', err.message)
    ARCHIVO.PROMPT_BLOQUES = {} // Deja vacío si falla
    return {}
  }
}

/**
 * Extrae los bloques/secciones principales usando delimitadores INICIO y FIN.
 * Los nombres de los bloques se vuelven claves del objeto resultado (en minúsculas y sin espacios).
 */
function extraerBloquesBC(texto) {
  const bloques = {}
  // Regex para encontrar cada bloque completo (con nombre flexible)
  const re = /=== INICIO SECCION: (.*?) ===([\s\S]*?)=== FIN SECCION: \1 ===/gi
  let match
  while ((match = re.exec(texto)) !== null) {
    const nombreOriginal = match[1].trim()
    const nombreClave = nombreOriginal
      .toLowerCase()
      .replace(/[^a-z0-9]/gi, '_') // Solo letras, números y guiones bajos
      .replace(/_+/g, '_') // Reemplaza varios _ seguidos por uno solo
      .replace(/^_|_$/g, '') // Quita _ inicial o final
    const contenido = match[2].trim()
    bloques[nombreClave] = contenido
    console.log(`🟢 [cargarBC] Bloque cargado: "${nombreClave}" (${nombreOriginal})`)
  }
  if (Object.keys(bloques).length === 0) {
    console.warn('⚠️ [cargarBC] No se encontraron bloques en el documento. ¿Los delimitadores están bien puestos?')
  }
  return bloques
}

/**
 * Divide SECCION 1 en pasos individuales (array) usando delimitadores INICIO PASO y FIN PASO.
 * Solo si aún tienes los pasos anidados en una sección. Si los tienes como bloques sueltos, puedes eliminar esto.
 */
function extraerPasosSeccion1(textoSeccion1) {
  if (!textoSeccion1) return [];
  const pasos = [];
  // Regex para encontrar cada paso completo
  const re = /=== INICIO PASO: (.*?) ===([\s\S]*?)=== FIN PASO: \1 ===/gi;
  let match;
  while ((match = re.exec(textoSeccion1)) !== null) {
    const nombreOriginal = match[1].trim();
    const contenido = match[2].trim();
    pasos.push(contenido);
    console.log(`🟢 [cargarBC] Paso cargado: "${nombreOriginal}"`);
  }
  if (pasos.length === 0) {
    console.warn('⚠️ [cargarBC] No se encontraron pasos en la SECCIÓN 1. ¿Los delimitadores están bien puestos?');
  }
  return pasos;
}

// Ya NO necesitas la función extraerCategoriasProductos, la puedes eliminar o comentar.
