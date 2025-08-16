export function generarMensajesParaProductos(productos = [], state = null, mostrarDetalles = false) {
  const mensajes = []

  for (const p of productos) {
    const nombre = p.nombre || p.NOMBRE || 'Producto sin nombre'
    const descripcion = p.descripcion || p.DESCRIPCION || 'Producto disponible en nuestro catálogo.'
    const precios = Array.isArray(p.precios) ? p.precios : (p.precios ? [p.precios] : [])
    const imagen = p.imagen || p.IMAGEN_URL || ''
    const url = p.url || p.URL_PRODUCTO || ''
    const archivo = p.archivo || p['ARCHIVOS ADICIONALES'] || ''

    // 🏷️ Procesar precio
    let precioTexto = ''
    if (precios.length) {
      const min = Math.min(...precios.map(x => parseFloat(x)))
      if (!isNaN(min)) {
        precioTexto = min.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })
      }
    } else if (p.PRECIO_MEMBRSIA || p.PRECIO_OFERTA || p.PRECIO_LISTA) {
      const raw = parseFloat(p.PRECIO_MEMBRSIA || p.PRECIO_OFERTA || p.PRECIO_LISTA)
      if (!isNaN(raw)) {
        precioTexto = raw.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })
      }
    }

    // 🧩 Mensaje base
    let mensaje = `🛍️ *${nombre}*`
    if (descripcion) mensaje += `\n📝 ${descripcion}`
    if (p.RAZON_PARA_COMPRARLO) mensaje += `\n💡 ¿Por qué comprarlo?: ${p.RAZON_PARA_COMPRARLO}`
    if (p.RESULTADO_ESPERADO) mensaje += `\n🎯 Resultado esperado: ${p.RESULTADO_ESPERADO}`
    if (p.MODO_DE_USO) mensaje += `\n📘 Modo de uso: ${p.MODO_DE_USO}`
    if (p.INGREDIENTES_DESTACADOS) mensaje += `\n🧪 Ingredientes: ${p.INGREDIENTES_DESTACADOS}`
    if (p.PUNTOS_QUE_ACUMULA) mensaje += `\n🎁 Puntos acumulables: ${p.PUNTOS_QUE_ACUMULA}`
    if (precioTexto) mensaje += `\n💲 Precio: ${precioTexto}`

    // 🔎 Mostrar TODOS los campos restantes
    const omitidas = [
      'NOMBRE', 'nombre', 'DESCRIPCION', 'descripcion', 'IMAGEN_URL', 'imagen',
      'PRECIO_LISTA', 'PRECIO_OFERTA', 'PRECIO_MEMBRSIA', 'precios',
      'RAZON_PARA_COMPRARLO', 'RESULTADO_ESPERADO', 'MODO_DE_USO', 'INGREDIENTES_DESTACADOS',
      'PUNTOS_QUE_ACUMULA', 'ARCHIVOS ADICIONALES', 'archivo', 'URL_PRODUCTO', 'url'
    ]

    const claves = Object.keys(p).filter(k => !omitidas.includes(k.toUpperCase()) && p[k])

    for (const clave of claves) {
      const label = formatearClave(clave)
      mensaje += `\n🔸 ${label}: ${p[clave]}`
    }

    if (url && typeof url === 'string' && url.startsWith('http')) {
      mensaje += `\n📎 Página del producto disponible si el cliente lo solicita.`
    }

    if (archivo && /\.(pdf)$/i.test(archivo)) {
      mensaje += `\n📄 Ficha técnica disponible si se solicita.`
    }

    if (archivo && /youtu\.?be|vimeo/i.test(archivo)) {
      mensaje += `\n🎥 Video disponible si deseas verlo.`
    }

    const esImagenValida = typeof imagen === 'string' && /\.(jpg|jpeg|png|gif|webp)$/i.test(imagen)
    if (esImagenValida) mensajes.push({ body: '', media: imagen })

    mensajes.push(mensaje.trim())
  }

  return mensajes
}

function formatearClave(clave) {
  return clave
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
}
