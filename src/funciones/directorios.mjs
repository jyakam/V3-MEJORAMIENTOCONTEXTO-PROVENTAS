import fs from 'fs';
import fsPromises from 'fs/promises';
import cron from 'node-cron';
import path from 'path';

const tempDir = './temp';

//TT GENERAR CARPETA TEMP
/**
 * Revisa si el directorio temporal existe y lo crea si no existe.
 */
export function RevisarTemp() {
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }
}

//TT BORRAR DATOS DE CARPETA TEMP
/**
 * Programa un evento cron para borrar archivos en la carpeta temporal.
 */
export async function BorrarTemp() {
  cron.schedule('0 5 * * *', async () => {
    console.log('⏰ Ejecutando tarea programada: Borrar archivos temporales...');
    try {
      // CORRECCIÓN: Se usa fsPromises para compatibilidad con await
      const files = await fsPromises.readdir(tempDir);
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        try {
          // CORRECCIÓN: Se usa fsPromises para compatibilidad con await
          await fsPromises.unlink(filePath);
          console.log(`🗑️ Archivo ${file} borrado exitosamente`);
        } catch (err) {
          console.error(`Error borrando el archivo ${file}:`, err);
        }
      }
    } catch (err) {
      console.error('Error leyendo la carpeta temporal:', err);
    }
  });
}
