export function actualizarHistorialConversacion(texto, rol, state) {
  if (!texto || !state) return;
  // rol: "cliente" o "bot"
  const historial = state.get('historialMensajes') || [];
  const nuevoHistorial = [...historial, { texto: texto.trim(), rol }].slice(-30); // Últimos 30 mensajes
  state.update({ historialMensajes: nuevoHistorial });
}

export function obtenerHistorialReciente(state) {
  const historial = state.get('historialMensajes') || [];
  // Si quieres, puedes ajustar este a 30 o dejarlo en 5, según te convenga.
  return historial.slice(-5).map(m => m.texto).join(' ').toLowerCase();
}
