// src/funciones/helpers/generarRespuestaProductosGPT.mjs

import { filtrarProductos } from './filtrarProductos.mjs'
import { generarContextoProductosIA } from './generarContextoProductosIA.mjs'

/**
 * Genera un prompt de contexto para la IA basado en los productos disponibles.
 * Se filtran hasta 10 productos para mantener contexto conciso.
 */
export function generarPromptProductos(productos = []) {
  if (!productos || productos.length === 0) return ''

  // Filtrado suave, sin consulta para mantener contexto general
  const filtrados = filtrarProductos(productos, '').slice(0, 10)

  // Se genera el texto que la IA utilizará como referencia
  const contexto = generarContextoProductosIA(filtrados)

  return contexto
}
