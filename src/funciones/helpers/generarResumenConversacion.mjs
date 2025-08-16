// src/funciones/helpers/generarResumenConversacion.mjs

import { EnviarTextoOpenAI } from '../../APIs/OpenAi/enviarTextoOpenAI.mjs';

export async function generarResumenConversacionIA(mensaje, telefono) {
  try {
    const prompt = `
Eres un asistente que analiza conversaciones para resumir la intención del cliente.
A partir del siguiente mensaje, responde con UNA SOLA FRASE que resuma qué buscaba el cliente, sin inventar datos y sin dar contexto innecesario.
Ejemplo de salida: "El cliente preguntó por tipos de tenis deportivos y quedó a la espera de modelos."
MENSAJE:
"${mensaje}"
`;

    const response = await EnviarTextoOpenAI(prompt, 'resumen', 'INFO', { telefono });
    if (!response || !response.respuesta) {
      throw new Error('No se obtuvo respuesta válida de EnviarTextoOpenAI');
    }
    return response.respuesta.trim();
  } catch (err) {
    console.error('❌ Error generando resumen contextual IA:', {
      message: err.message,
      stack: err.stack
    });
    return '';
  }
}

export async function generarResumenConversacionGlobalIA(historial, telefono) {
  try {
    const prompt = `
Eres un asistente experto que analiza todo el historial de una conversación de WhatsApp entre un cliente y un agente AI de ventas.
Tu tarea es resumir en UNA o DOS frases el motivo de la consulta, lo que pidió el cliente, si compró o no, y cualquier dato clave relevante.
No inventes datos y especifica solo lo que realmente ocurrió.
Historial de la conversación:
${historial}
    `.trim();

    const response = await EnviarTextoOpenAI(prompt, 'resumenGlobal', 'INFO', { telefono });
    if (!response || !response.respuesta) {
      throw new Error('No se obtuvo respuesta válida de EnviarTextoOpenAI');
    }
    return response.respuesta.trim();
  } catch (err) {
    console.error('❌ Error generando resumen global IA:', {
      message: err.message,
      stack: err.stack
    });
    return '';
  }
}
