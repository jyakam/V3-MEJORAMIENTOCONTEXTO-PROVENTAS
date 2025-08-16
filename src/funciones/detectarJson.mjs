//TT CAPTURAR JSON
/**
 * Extrae y parsea un objeto JSON de una cadena de texto.
 * La función busca una cadena que comience con `json` seguida de un objeto JSON dentro de llaves `{}`.
 * Si encuentra un objeto JSON válido, lo parsea y lo devuelve. Si hay un error en el proceso de parseo,
 * se muestra un mensaje de error en la consola.
 * @param {string} str - La cadena de texto que puede contener un objeto JSON.
 * @returns {Object|null} - El objeto JSON parseado si se encuentra y es válido, o `null` si no se encuentra un JSON válido.
 */
export function CapturarJSON(str) {
  const regex = /json\s+({[\s\S]*})/
  const match = str.match(regex)
  if (match && match[1]) {
    const jsonStr = match[1].trim()
    try {
      const jsonObj = JSON.parse(jsonStr)
      console.log(jsonObj)
      return jsonObj
    } catch (error) {
      console.error('Error al parsear JSON:', error)
    }
  }
  return null
}

export function EliminarDeStringJSON(str) {
  return str.replace(/```[\s\S]*?```/, '').trim()
}
