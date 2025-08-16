// src/funciones/helpers/detectorProductos.mjs

// Detectar si un mensaje está relacionado con productos basados dinámicamente en el catálogo
export function esMensajeRelacionadoAProducto(texto, state) {
  const productos = state.get('_productosFull') || []
  const textoMin = texto.toLowerCase()

  // 🔥 Extraer marcas y nombres de productos dinámicamente
  const marcas = [...new Set(productos.map(p => (p.MARCA || '').toLowerCase().trim()))].filter(Boolean)
  const nombres = [...new Set(productos.map(p => (p.NOMBRE || '').toLowerCase().trim()))].filter(Boolean)
  const categorias = [...new Set(productos.map(p => (p.CATEGORIA || '').toLowerCase().trim()))].filter(Boolean)

  // 🔥 Unir todo para una búsqueda más flexible
  const terminos = [...marcas, ...nombres, ...categorias].filter(Boolean)

  // Si no hay términos, asumir que no podemos detectar relación
  if (!terminos.length) {
    return false
  }

  // 🔥 Crear expresión regular de búsqueda dinámica
  const regex = new RegExp(terminos.join('|'), 'i')

  return regex.test(textoMin)
}
