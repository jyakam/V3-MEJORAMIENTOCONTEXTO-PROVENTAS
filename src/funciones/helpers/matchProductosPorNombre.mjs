export function matchProductosPorNombre(texto = '', productos = []) {
  if (!texto.trim() || !Array.isArray(productos)) return []

  const normalizar = (str) => {
    return (str || '').toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9 ]/gi, ' ')
  }

  const queryWords = normalizar(texto).split(/\s+/).filter(Boolean)
  console.log('🔎 [matchProductosPorNombre] Texto recibido:', texto, '→ Palabras clave:', queryWords)

  const scoreProducto = (p) => {
    const camposConPrioridad = {
      CATEGORIA: 4,
      NOMBRE: 3,
      DESCRIPCION: 2
    }

    let score = 0

    for (const [key, val] of Object.entries(p)) {
      if (typeof val !== 'string') continue

      const campoNormalizado = normalizar(val)
      const peso = camposConPrioridad[key.toUpperCase()] || 1

      for (const palabra of queryWords) {
        if (campoNormalizado.includes(palabra)) {
          score += peso
        }
      }
    }

    // Evaluar también atributos
    if (p.ATRIBUTOS && typeof p.ATRIBUTOS === 'object') {
      const atributosStr = normalizar(JSON.stringify(p.ATRIBUTOS || {}))
      for (const palabra of queryWords) {
        if (atributosStr.includes(palabra)) {
          score += 1
        }
      }
    }

    if (score > 0) {
      console.log(`✅ [matchProductosPorNombre] "${p.NOMBRE}" tiene score`, score)
    }

    return score
  }

  const resultado = productos
    .map(p => ({ ...p, _score: scoreProducto(p) }))
    .filter(p => p._score > 0)
    .sort((a, b) => b._score - a._score)

  console.log('🎯 [matchProductosPorNombre] Resultados con score > 0:', resultado.length)
  return resultado
}
