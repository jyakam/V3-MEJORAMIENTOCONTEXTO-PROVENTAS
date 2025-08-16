import 'dotenv/config'

//TT ESPERAR
/**
 * Retorna una promesa que se resuelve después de un período de espera especificado en segundos.
 * La función utiliza `setTimeout` para crear un retraso en la ejecución del código. La promesa se resuelve automáticamente después del tiempo de espera especificado.
 * @param {number} sg - El número de segundos para esperar antes de resolver la promesa.
 * @returns {Promise<void>} - Una promesa que se resuelve después del tiempo de espera especificado.
 * @example
 * Esperar(5).then(() => {
 *   console.log('Han pasado 5 segundos');
 * });
 */
export function Esperar(sg) {
  return new Promise((resolve) => setTimeout(resolve, sg * 1000))
}

//TT OBTENER FECHA ACTUAL
/**
 * Obtiene la fecha actual en formato DD/MM/AAAA.
 *
 * La función utiliza el objeto `Date` de JavaScript para obtener la fecha actual. Luego, formatea el día y el mes para asegurarse de que siempre tengan dos dígitos, añadiendo ceros a la izquierda si es necesario. Finalmente, construye y retorna la fecha en el formato `DD/MM/AAAA`.
 *
 * @returns {string} - La fecha actual en formato DD/MM/AAAA.
 *
 * @example
 * const fechaActual = ObtenerFechaActual();
 * console.log(fechaActual); // "04/08/2024" (por ejemplo, si la fecha actual es 4 de agosto de 2024)
 */
export function ObtenerFechaActual() {
  const fecha = new Date()

  // Obteniendo día, mes y año
  let dia = fecha.getDate().toString().padStart(2, '0') // Dos dígitos con cero a la izquierda si es necesario
  let mes = (fecha.getMonth() + 1).toString().padStart(2, '0') // Meses van de 0 a 11, sumamos 1 para obtener el mes actual
  const año = fecha.getFullYear()

  dia = parseInt(dia, 10)
  mes = parseInt(mes, 10)

  // Construyendo la fecha en formato DD/MM/AAAA
  const fechaFormateada = `${dia}/${mes}/${año}`

  return fechaFormateada
}

//TT OBTENER HORA ACTUAL
/**
 * Obtiene la hora actual en formato HH:MM:SS.
 *
 * La función utiliza el objeto `Date` de JavaScript para obtener la hora actual, incluyendo horas, minutos y segundos. Luego, formatea cada componente para que siempre tenga dos dígitos, añadiendo ceros a la izquierda si es necesario. Finalmente, construye y retorna la hora en el formato `HH:MM:SS`.
 *
 * @returns {string} - La hora actual en formato HH:MM:SS.
 *
 * @example
 * const horaActual = ObtenerHoraActual();
 * console.log(horaActual); // "14:05:09" (por ejemplo, si la hora actual es 14 horas, 5 minutos y 9 segundos)
 */
export function ObtenerHoraActual() {
  const fecha = new Date()

  // Obteniendo horas, minutos y segundos
  const horas = fecha.getHours().toString().padStart(2, '0') // Dos dígitos con cero a la izquierda si es necesario
  const minutos = fecha.getMinutes().toString().padStart(2, '0')
  const segundos = fecha.getSeconds().toString().padStart(2, '0')

  // Construyendo la hora en formato HH:MM:SS
  const horaFormateada = `${horas}:${minutos}:${segundos}`

  return horaFormateada
}

//TT OBTENER DIA DE LA SEMANA
/**
 * Obtiene el día de la semana a partir de una fecha en formato DD/MM/AAAA.
 *
 * La función recibe una fecha en formato `DD/MM/AAAA`, la convierte a un objeto `Date` en JavaScript, y utiliza el método `getDay()` para obtener el día de la semana. Luego, convierte el número del día de la semana en un nombre de día en español usando un array de nombres de días.
 *
 * @param {string} dateStr - La fecha en formato `DD/MM/AAAA`.
 * @returns {string} - El nombre del día de la semana en español (por ejemplo, "Lunes").
 *
 * @example
 * const diaSemana = ObtenerDiaSemana('04/08/2024');
 * console.log(diaSemana); // "Domingo" (si el 4 de agosto de 2024 es un domingo)
 */
export function ObtenerDiaSemana(dateStr) {
  const [day, month, year] = dateStr.split('/').map(Number)
  const date = new Date(year, month - 1, day) // Restamos 1 al mes porque los meses en JavaScript son 0-indexados
  const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const dayOfWeek = date.getDay()
  return daysOfWeek[dayOfWeek]
}

//TT CONSTRUIR TIEMPO EXPLICCITO EJE: 4 HORAS 30 MINUTOS
/**
 * Convierte un tiempo en formato `HH:MM` a una descripción explícita en español.
 *
 * La función toma un tiempo en formato `HH:MM` y construye una cadena que describe el tiempo en términos de horas y minutos. Si el tiempo no incluye minutos, solo se devolverá la descripción de las horas, y si no incluye horas, solo se devolverá la descripción de los minutos.
 *
 * @param {string} tiempo - El tiempo en formato `HH:MM`.
 * @returns {string} - Una descripción explícita del tiempo en español (por ejemplo, "4 horas 30 minutos").
 *
 * @example
 * const tiempoExplicito = ConstruirTiempoExplicito('04:30');
 * console.log(tiempoExplicito); // "4 horas 30 minutos"
 */
export function ConstruirTiempoExplicito(tiempo) {
  let _txt = ''
  if (tiempo.includes(':')) {
    const [horas, minutos] = tiempo.split(':').map(Number)
    if (horas > 0) {
      _txt = `${horas} horas`
    }
    if (minutos > 0) {
      _txt = `${_txt} ${minutos} minutos`
    }
  } else {
    _txt = `${_txt} horas`
  }
  return _txt
}

//TT CONVERTIR A FORMATO 12 HORAS EJE: 4:30 PM
/**
 * Convierte un tiempo en formato de 24 horas a formato de 12 horas con indicador AM/PM.
 *
 * La función toma un tiempo en formato de 24 horas (`HH:MM`) y lo convierte a un formato de 12 horas con un indicador AM o PM. Si el tiempo proporcionado no está en el formato esperado, se devuelve el tiempo tal cual.
 *
 * @param {string} time - El tiempo en formato de 24 horas (`HH:MM`).
 * @returns {string} - El tiempo convertido a formato de 12 horas con indicador AM/PM (por ejemplo, "4:30 PM").
 *
 * @example
 * const tiempo12Horas = ConvertirA12Horas('16:30');
 * console.log(tiempo12Horas); // "4:30 PM"
 */
export function ConvertirA12Horas(time) {
  if (time.includes(':')) {
    let [horas, minutos] = time.split(':').map(Number)
    const ampm = horas >= 12 ? 'pm' : 'am'
    horas = horas % 12 || 12
    return `${horas}:${minutos.toString().padStart(2, '0')} ${ampm}`
  } else {
    return time
  }
}

//TT CONVERTIR A FORMATO FECHA EXPLICITA EJE: 7 DE AGOSTO, 2024
/**
 * Convierte una fecha en formato `DD/MM/AAAA` a un formato de fecha explícita en español.
 *
 * La función toma una fecha en formato `DD/MM/AAAA` y la convierte a un formato más legible que incluye el nombre del mes en lugar del número del mes (por ejemplo, "7 de Agosto, 2024"). Si la fecha no está en el formato esperado, se devuelve la fecha tal cual.
 *
 * @param {string} date - La fecha en formato `DD/MM/AAAA`.
 * @returns {string} - La fecha convertida a formato explícito (por ejemplo, "7 de Agosto, 2024").
 *
 * @example
 * const fechaExplicita = ConvertirFechaExplicita('07/08/2024');
 * console.log(fechaExplicita); // "7 de Agosto, 2024"
 */
export function ConvertirFechaExplicita(date) {
  const meses = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre'
  ]
  if (date.includes('/')) {
    let [dia, mes, anno] = date.split('/').map(Number)
    mes = meses[mes - 1]
    return `${dia} de ${mes}, ${anno}`
  } else {
    return date
  }
}

//SS RESTAR TIEMPO
/**
 * Resta un período de tiempo de una hora dada.
 *
 * La función toma dos cadenas que representan una hora y un período de tiempo en formato `HH:MM` y calcula la diferencia entre ellos. Si alguna de las cadenas no está en el formato correcto, la función devuelve `00:00`.
 *
 * @param {string} hora - La hora inicial en formato `HH:MM`.
 * @param {string} tiempo - El período de tiempo a restar en formato `HH:MM`.
 * @returns {string} - La diferencia en formato `HH:MM`. Si el formato de entrada es incorrecto, devuelve `00:00`.
 *
 * @example
 * const resultado = RestarTiempo('15:30', '01:15');
 * console.log(resultado); // "14:15"
 */
export function RestarTiempo(hora, tiempo) {
  if (!hora.includes(':') || !tiempo.includes(':')) {
    return '00:00'
  }
  const _hora = convertirHorasAMinutos(hora)
  const _tiempo = convertirHorasAMinutos(tiempo)
  const _resultado = _hora - _tiempo
  return convertirMinutosAHoras(_resultado)
}

//SS SUMAR TIEMPO
/**
 * Suma un período de tiempo a una hora dada.
 *
 * La función toma dos cadenas que representan una hora y un período de tiempo en formato `HH:MM` y calcula la suma entre ellos. Si alguna de las cadenas no está en el formato correcto, la función devuelve `00:00`.
 *
 * @param {string} hora - La hora inicial en formato `HH:MM`.
 * @param {string} tiempo - El período de tiempo a sumar en formato `HH:MM`.
 * @returns {string} - La suma en formato `HH:MM`. Si el formato de entrada es incorrecto, devuelve `00:00`.
 *
 * @example
 * const resultado = SumarTiempo('10:30', '02:15');
 * console.log(resultado); // "12:45"
 */
export function SumarTiempo(hora, tiempo) {
  if (!hora.includes(':') || !tiempo.includes(':')) {
    return '00:00'
  }
  const _hora = convertirHorasAMinutos(hora)
  const _tiempo = convertirHorasAMinutos(tiempo)
  const _resultado = _hora + _tiempo
  return convertirMinutosAHoras(_resultado)
}

//SS CONVERTIR TIEMPO A MINUTOS
/**
 * Convierte una hora en formato `HH:MM` a minutos.
 *
 * La función toma una cadena que representa una hora en formato `HH:MM` y convierte esa hora a su equivalente en minutos. Si la cadena no está en el formato correcto, devuelve `0`.
 *
 * @param {string} hora - La hora en formato `HH:MM`.
 * @returns {number} - El equivalente en minutos. Si el formato de entrada es incorrecto, devuelve `0`.
 *
 * @example
 * const minutos = convertirHorasAMinutos('02:30');
 * console.log(minutos); // 150
 */
export function convertirHorasAMinutos(hora) {
  if (!hora.includes(':')) {
    return 0
  }
  const [horas, minutos] = hora.split(':').map(Number)
  return horas * 60 + minutos
}

//SS CONVERTIR MINUTOS A TIEMPO
/**
 * Convierte una cantidad de minutos a formato `HH:MM`.
 *
 * La función toma un número entero que representa una cantidad de minutos y lo convierte a formato de hora en `HH:MM`. Si el número de minutos es menor a 60, se mostrará con `00` horas.
 *
 * @param {number} minutos - La cantidad de minutos a convertir.
 * @returns {string} - La hora en formato `HH:MM`.
 *
 * @example
 * const tiempo = convertirMinutosAHoras(150);
 * console.log(tiempo); // "02:30"
 */
export function convertirMinutosAHoras(minutos) {
  const horas = Math.floor(minutos / 60)
  const minutosRestantes = minutos % 60
  return `${horas.toString().padStart(2, '0')}:${minutosRestantes.toString().padStart(2, '0')}`
}
