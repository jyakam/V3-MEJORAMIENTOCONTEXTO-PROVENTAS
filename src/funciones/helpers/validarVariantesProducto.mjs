// src/funciones/helpers/validarVariantesProducto.mjs

const VARIANTES_PERMITIDAS = [
  // (todas las variantes que me pasaste aquí arriba)...
];

// Función para limpiar texto (lowercase, sin tildes, sin plural final simple)
function limpiar(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // eliminar acentos
    .replace(/s$/, ''); // quitar 's' final para comparar singular/plural
}

export function validarVariantesProducto(producto, textoCliente) {
  if (!producto || !textoCliente) return false;

  const texto = limpiar(textoCliente);

  let variantesDetectadas = [];

  for (const campo of VARIANTES_PERMITIDAS) {
    const valorCampo = producto[campo];
    if (!valorCampo) continue;

    const valores = valorCampo.toString().split(/[,|\/]/).map(v => limpiar(v.trim())).filter(Boolean);

    for (const valor of valores) {
      if (texto.includes(valor)) {
        variantesDetectadas.push(`${campo}: ${valor}`);
        break; // encontramos coincidencia en este campo
      }
    }
  }

  return variantesDetectadas.length > 0;
}
