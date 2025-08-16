// src/funciones/helpers/taskQueue.mjs
// Este es el nuevo "Gestor de la Fila". Su única responsabilidad es
// asegurar que las tareas de base de datos se ejecuten una por una, evitando colisiones.

const queue = []; // La fila de espera donde vivirán las tareas.
let isProcessing = false; // Una bandera para saber si el "recepcionista" está ocupado.

/**
 * Procesa la siguiente tarea en la fila, si la hay.
 * Esta función es el corazón del sistema de turnos.
 */
async function processQueue() {
    // Si ya hay una tarea en ejecución o si la fila está vacía, no hacemos nada.
    if (isProcessing || queue.length === 0) {
        return;
    }

    isProcessing = true; // Levantamos la bandera: "estoy ocupado".

    // Sacamos la primera tarea de la fila, que incluye la tarea y sus manejadores de promesa.
    const { task, resolve, reject } = queue.shift();

    try {
        console.log(`🔵 [QUEUE] Iniciando nueva tarea. Tareas pendientes: ${queue.length}`);
        // Ejecutamos la tarea (ej: la llamada a postTable) y esperamos el resultado.
        const result = await task();
        console.log(`🟢 [QUEUE] Tarea completada con éxito.`);
        // Devolvemos el resultado exitoso a quien originalmente llamó la tarea.
        resolve(result);
    } catch (error) {
        // Si la tarea falla, lo registramos y le informamos del error a quien la llamó.
        console.error('🔴 [QUEUE] La tarea en la fila falló:', error);
        reject(error);
    } finally {
        // Haya éxito o error, la tarea ha terminado.
        isProcessing = false; // Bajamos la bandera: "estoy libre".
        console.log(`⚪ [QUEUE] Procesador libre. Verificando si hay más tareas en la fila...`);
        // Volvemos a llamar a la función para ver si hay más tareas esperando su turno.
        processQueue();
    }
}

/**
 * Añade una nueva tarea a la fila de procesamiento.
 * Esta es la única función que el resto de la aplicación usará para interactuar con la fila.
 * Devuelve una promesa que permite que el código que la llama pueda esperar (await) a que su tarea se complete.
 * @param {Function} task - La función asíncrona que se debe ejecutar (ej. la llamada a postTable).
 * @returns {Promise<any>}
 */
export function addTask(task) {
    return new Promise((resolve, reject) => {
        try {
            const now = new Date().toISOString();
            console.log(`📥 [QUEUE] Nueva tarea añadida a la fila. Total en fila ahora: ${queue.length + 1} @ ${now}`);
        } catch (e) {
            console.log('[DEBUG QUEUE] Error log addTask:', e?.message);
        }

        // Añadimos la tarea y sus manejadores de promesa a la fila (MISMA LÓGICA)
        queue.push({ task, resolve, reject });

        // Intentamos iniciar el procesamiento. Si ya está ocupado, la tarea simplemente esperará su turno (MISMA LÓGICA)
        processQueue();
    });
}

