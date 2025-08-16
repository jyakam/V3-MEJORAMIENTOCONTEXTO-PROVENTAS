const imageRegex = /(https?:\/\/.*\.(?:png|jpg|jpeg|gif|svg|webp))/gi

//TT EXTRAER IMAGENES DE RESPUESTA
export function DetectarImagenes(text) {
  const imageRegex = /(https?:\/\/.*\.(?:png|jpg|jpeg|gif|svg|webp))/gi
  const urls = text.match(imageRegex)
  return urls || null // Devuelve un array con las URLs o un NULL si no hay coincidencias
}
//TT REMPLAZAR URLS DE LAS IMAGENES
export function ReemplazarEnlaces(text) {
  let imageCounter = 1
  // Usamos replace con una función para ir reemplazando cada URL con un número
  return text.replace(imageRegex, () => `*Imagen ${imageCounter++}*`)
}
