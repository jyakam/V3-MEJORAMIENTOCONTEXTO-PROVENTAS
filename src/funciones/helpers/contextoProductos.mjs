// src/funciones/helpers/contextoProductos.mjs

export function esAclaracionContextual(texto, historial = [], productoActivo = null) {
  if (!texto) return false;

  console.log('🔍 [contextoProductos] Texto recibido:', texto);
  const palabras = texto.trim().split(/\s+/);

  // 🔥 Si es una frase muy corta, probablemente sigue preguntando sobre lo anterior
  if (palabras.length <= 8) {
    console.log('🧠 [contextoProductos] Frase corta detectada, se considera aclaración.');
    return true;
  }

  const textoLower = texto.toLowerCase();

  // 🔥 Si existe productoActivo, verificar atributos relevantes
  if (productoActivo) {
    console.log('🧪 [contextoProductos] Verificando contra producto activo:', productoActivo.NOMBRE || '[Sin nombre]');
    const atributosRelacionados = [
      'color', 'talla', 'sabor', 'medida', 'peso', 'material', 'estilo',
      'dimensiones', 'acabado', 'capacidad', 'formato', 'presentación', 'tipo',
      'ancho', 'alto', 'largo', 'volumen', 'densidad', 'textura', 'ubicacion'
    ];

    for (const atributo of atributosRelacionados) {
      if (productoActivo[atributo]) {
        const valores = productoActivo[atributo]
          .toString()
          .split(/[,|\/]/)
          .map(v => v.trim().toLowerCase());

        if (valores.some(valor => textoLower.includes(valor))) {
          console.log(`✅ [contextoProductos] Coincidencia por atributo "${atributo}" con valor "${valor}"`);
          return true; // 🔥 Cliente menciona valor de un atributo del productoActivo
        }
      }
    }
  }

  // 🔥 Si no, analizar historial reciente como respaldo
  const mensajesRecientes = historial.slice(-3);
  const contextoHistorial = mensajesRecientes.some(msg =>
    /(producto|marca|modelo|precio|sabor|tamaño|habitacion|color|talla|peso|material)/i.test(msg.texto)
  );

  if (contextoHistorial) {
    console.log('📜 [contextoProductos] Historial reciente sugiere que hay contexto de producto.');
  }

  return contextoHistorial;
}
