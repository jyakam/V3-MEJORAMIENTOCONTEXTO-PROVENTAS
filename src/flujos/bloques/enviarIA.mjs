import fs from 'fs';
import { BOT } from '../../config/bot.mjs';
import { ENUM_TIPO_ARCHIVO } from './detectarArchivos.mjs';
import { EnviarTextoOpenAI } from '../../APIs/OpenAi/enviarTextoOpenAI.mjs';
import { EnviarImagenOpenAI } from '../../APIs/OpenAi/enviarImagenOpenAI.mjs';
import { convertOggToMp3 } from '../../funciones/convertirMp3.mjs';
import { EnviarAudioOpenAI } from '../../APIs/OpenAi/enviarAudioOpenAI.mjs';

export async function EnviarIA(msj, guion, funciones, estado = {}) {
    const tipoMensaje = funciones.state.get('tipoMensaje');
    const promptExtra = funciones.promptExtra || '';

    // --- INICIO: LÓGICA MEJORADA ---
    // 1. Se valida que el contexto sea un texto.
    let contextoAdicional = '';
    if (estado.contextoAdicional && typeof estado.contextoAdicional === 'string') {
        contextoAdicional = estado.contextoAdicional;
    }

    // 2. Se unifica la construcción del mensaje final.
    const mensajeFinal = `${contextoAdicional} ${promptExtra} ${msj}`.trim().replace(/\s+/g, ' ');
    // --- FIN: LÓGICA MEJORADA ---


    // --- INICIO: LOGS DE AUDITORÍA RESTAURADOS ---
    console.log('📊 [AUDITORIA] → Inicia EnviarIA()');
    console.log('📊 [AUDITORIA] Tipo de mensaje:', tipoMensaje);
    console.log('📊 [AUDITORIA] Prompt extra incluido:', !!promptExtra);
    // console.log('📊 [AUDITORIA] Estado cliente:', estado); // Mantenemos este comentado como acordamos
    if (contextoAdicional) {
        console.log(`🗣️ [CONTEXTO] Se usará contexto adicional: "${contextoAdicional}"`);
    }
    // --- FIN: LOGS DE AUDITORÍA RESTAURADOS ---


    // --- 📸 IMAGEN ---
    if (tipoMensaje === ENUM_TIPO_ARCHIVO.IMAGEN) {
        console.log('📤 🌄 Enviando imagen a OpenAI...');
        const objeto = { role: 'user', content: [{ type: 'text', text: mensajeFinal }] };
        const datos = funciones.state.get('archivos') || [];
        const imagenes = datos.filter(item => item.tipo === ENUM_TIPO_ARCHIVO.IMAGEN);

        for (const img of imagenes) {
            const imagenBase64 = fs.readFileSync(img.ruta, { encoding: 'base64' });
            objeto.content.push({
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${imagenBase64}`, detail: BOT.CALIDA_IMAGENES }
            });
        }
        await funciones.state.update({ archivos: [], tipoMensaje: undefined });
        const res = await EnviarImagenOpenAI(objeto, funciones.ctx.from, guion, estado);
        console.log('📥 RESPUESTA IA IMAGEN:', res); // LOG RESTAURADO
        return res;
    }

    // --- 🎙️ AUDIO ---
    if (tipoMensaje === ENUM_TIPO_ARCHIVO.NOTA_VOZ) {
        console.log('📤 🎵 [PASO 1 de 2] Iniciando transcripción de nota de voz...');
        const datos = funciones.state.get('archivos') || [];
        const audios = datos.filter(item => item.tipo === ENUM_TIPO_ARCHIVO.NOTA_VOZ);
        let textoDeAudio = '';

        if (audios.length > 0) {
            for (const aud of audios) {
                const id = generateUniqueFileName('mp3');
                const mp3 = await convertOggToMp3(aud.ruta, id, BOT.VELOCIDAD);
                textoDeAudio += (await EnviarAudioOpenAI(mp3)) + ' ';
            }
            textoDeAudio = textoDeAudio.trim();
            console.log(`✅ 🔊 [PASO 1 de 2] Transcripción completada: "${textoDeAudio}"`);
        }

        // Limpiamos el estado para la siguiente interacción
        await funciones.state.update({ archivos: [], tipoMensaje: undefined });

        // AHORA, el paso clave que faltaba: tomamos el texto transcrito y lo enviamos a la IA conversacional.
        console.log('📤 📄 [PASO 2 de 2] Enviando texto transcrito a la IA para respuesta...');
        const mensajeFinalAudio = `${contextoAdicional} ${promptExtra} ${textoDeAudio}`.trim().replace(/\s+/g, ' ');

        // Log que querías ver para confirmar el "hand-off"
        console.log(`🧠 Texto final (del audio) enviado a la IA: "${mensajeFinalAudio}"`);
        
        // Llamamos a la función de texto con el resultado de la transcripción
        const res = await EnviarTextoOpenAI(mensajeFinalAudio, funciones.ctx.from, guion, estado);
        
        console.log('📥 RESPUESTA IA (desde AUDIO):', res);
        return res;
    }

    // --- 📝 TEXTO NORMAL ---
    console.log('📤 📄 Enviando texto plano:', msj);
    console.log('🧠 [SNIP] Inicio del MENSAJE FINAL A LA IA (TEXTO):', mensajeFinal.substring(0, 80) + '...');
    console.log('🟣 [DEBUG] GUION O PROMPT DEL SISTEMA QUE SE ENVÍA A LA IA: [Largo:', guion.length, 'caracteres]'); // LOG RESTAURADO
    const res = await EnviarTextoOpenAI(mensajeFinal, funciones.ctx.from, guion, estado);
    console.log('📥 RESPUESTA IA TEXTO:', res); // LOG RESTAURADO
    return res;
}

function generateUniqueFileName(extension) {
    const timestamp = Date.now();
    const randomNumber = Math.floor(Math.random() * 1000);
    return `file_${timestamp}_${randomNumber}.${extension}`;
}
