import ffmpeg from 'fluent-ffmpeg'
import path from 'path'

//TT CONVERTI OGG A MP3
export async function convertOggToMp3(inputPath, outputName, vel = 1.5) {
  const inputFile = inputPath // Ruta relativa para el archivo de entrada
  const outputFile = path.resolve('./temp/' + outputName) // Ruta relativa para el archivo de salida

  // Retorna una promesa y espera el resultado
  return new Promise((resolve, reject) => {
    ffmpeg(inputFile)
      .toFormat('mp3')
      .audioFilters(`atempo=${vel}`) // Acelera el audio a 1.5x
      .on('end', () => {
        resolve('./temp/' + outputName)
      })
      .on('error', (err) => {
        console.error('❌ No se logro convertir audio a mp3', err)
        reject(err)
      })
      .save(outputFile)
  })
}
