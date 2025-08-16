// src/funciones/helpers/filtrarProductos.mjs

export function filtrarProductos(productos, consulta = '') {
  if (!consulta) return productos.slice(0, 10)

  const texto = consulta.toLowerCase()
  console.log('🔍 [filtrarProductos] Consulta recibida:', texto)

  const campos = [
    'NOMBRE', 'CATEGORIA', 'DESCRIPCION',
    'COLOR', 'COLORES', 'TALLA', 'MARCA', 'ATRIBUTOS',
    'RAZON_PARA_COMPRARLO', 'RESULTADO_ESPERADO', 'MODO_DE_USO', 'INGREDIENTES_DESTACADOS'
  ]

  const categoriasPrioritarias = [
    'tratamiento', 'tratamiento 1 mes', 'tratamiento 2 meses', 'tratamiento 3 meses', 'kits'
  ]

  const normalizarCategoria = (cat = '') =>
    cat.toLowerCase()
       .normalize('NFD')
       .replace(/[\u0300-\u036f]/g, '')
       .replace(/s\b/, '')
       .replace(/s$/, '')
       .trim()

  const score = (p) => {
    let s = 0
    const categoria = normalizarCategoria(p.CATEGORIA)

    for (const campo of campos) {
      const val = (p[campo] || '').toLowerCase()
      if (texto.includes(val)) s += 2
      if (val.includes(texto)) s += 1
      if (texto.split(' ').some(w => val.includes(w))) s += 0.5
    }

    if (categoriasPrioritarias.includes(categoria)) s += 20
    if (categoria === 'individual') s -= 5

    console.log(`📌 [filtrarProductos] "${p.NOMBRE}" (cat: ${categoria}) => Score: ${s}`)
    return s
  }

  return productos
    .map(p => ({ ...p, _score: score(p) }))
    .filter(p => p._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, 10)
}
