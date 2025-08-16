export async function ActualizarResumenUltimaConversacion(phone, nuevoResumen) {
  console.log(`🧠 Intentando guardar resumen para ${phone}...`)

  if (!nuevoResumen || nuevoResumen.length < 10) {
    console.log(`⛔ Resumen ignorado por ser demasiado corto para ${phone}`)
    return
  }

  // 1. Obtener el estado actual del contacto desde la caché
  const contactoPrevio = getContactoByTelefono(phone) || { TELEFONO: phone };

  // 2. Ejecutar la lógica de "corrimiento"
  const datosParaGuardar = {
    ...contactoPrevio,
    TELEFONO: phone,
    RESUMEN_ULTIMA_CONVERSACION: nuevoResumen, // El nuevo resumen siempre va al campo principal
    RESUMEN_2: contactoPrevio.RESUMEN_ULTIMA_CONVERSACION || '', // El anterior 1 pasa a ser el 2
    RESUMEN_3: contactoPrevio.RESUMEN_2 || '' // El anterior 2 pasa a ser el 3
  }

  try {
    const props = { Action: 'Edit' }
    const row = limpiarRowContacto(datosParaGuardar, 'Edit')
    
    console.log('[DEBUG RESUMEN] Encolando tarea para actualizar 3 resúmenes.');

    await addTask(() => {
      return postTableWithRetrySafe(APPSHEETCONFIG, process.env.PAG_CONTACTOS, [row], props)
    })

    console.log(`📝 Resúmenes actualizados en AppSheet para ${phone}`)
    // Actualizamos la caché local con los nuevos datos para mantener la consistencia
    actualizarContactoEnCache(datosParaGuardar)
  } catch (err) {
    console.log(`❌ Error guardando resúmenes para ${phone} via queue:`, err?.message)
    // Guardamos en caché igualmente para no perder la información localmente
    actualizarContactoEnCache(datosParaGuardar)
    console.log(`⚠️ Cache actualizada localmente para ${phone} pese a error en AppSheet`)
  }
}
