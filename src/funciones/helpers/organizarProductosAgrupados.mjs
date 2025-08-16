// src/funciones/helpers/organizarProductosAgrupados.mjs
export function organizarProductosAgrupados(productos = []) {
  if (!Array.isArray(productos)) return []

  const agrupados = {}

  for (const producto of productos) {
    const clave = `${(producto.NOMBRE || '').toLowerCase()}|${(producto.MARCA || '').toLowerCase()}`
    const imagen = producto.IMAGEN_URL?.trim()
    const urlProducto = producto.URL_PRODUCTO?.trim()
    const archivoAdicional = producto['ARCHIVOS ADICIONALES']?.trim()

    const esImagenValida = typeof imagen === 'string' && /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(imagen)

    if (!agrupados[clave]) {
      agrupados[clave] = {
        nombre: producto.NOMBRE,
        marca: producto.MARCA,
        categoria: producto.CATEGORIA,
        descripcion: producto.DESCRIPCION,
        imagen: esImagenValida ? imagen : '',
        url: urlProducto || '',
        archivo: archivoAdicional || '',
        precios: new Set(),
        atributos: {}
      }
    }

    const agrupado = agrupados[clave]

    if (!agrupado.imagen && esImagenValida) agrupado.imagen = imagen
    if (!agrupado.url && urlProducto) agrupado.url = urlProducto
    if (!agrupado.archivo && archivoAdicional) agrupado.archivo = archivoAdicional

    if (producto.PRECIO_LISTA) agrupado.precios.add(producto.PRECIO_LISTA)
    if (producto.PRECIO_OFERTA) agrupado.precios.add(producto.PRECIO_OFERTA)

    const camposIgnorados = [
      'NOMBRE', 'MARCA', 'CATEGORIA', 'DESCRIPCION',
      'IMAGEN_URL', 'URL_PRODUCTO', 'ARCHIVOS ADICIONALES',
      'PRECIO_LISTA', 'PRECIO_OFERTA', '_RowNumber'
    ]

    for (const [clave, valor] of Object.entries(producto)) {
      if (!valor || camposIgnorados.includes(clave.toUpperCase())) continue

      const key = clave.trim().toLowerCase()
      const valores = String(valor).split(/[,;|]/).map(v => v.trim()).filter(Boolean)

      if (!agrupado.atributos[key]) agrupado.atributos[key] = new Set()
      for (const v of valores) agrupado.atributos[key].add(v)
    }
  }

  return Object.values(agrupados).map(p => ({
    ...p,
    precios: [...p.precios],
    atributos: Object.fromEntries(
      Object.entries(p.atributos).map(([k, v]) => [k, [...v]])
    )
  }))
}