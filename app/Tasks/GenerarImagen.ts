import Database from '@ioc:Adonis/Lucid/Database';
import { BaseTask } from 'adonis5-scheduler/build/src/Scheduler/Task'
import { createCanvas, loadImage } from 'canvas';
import { DateTime } from 'luxon';
import path from 'path';
import fs from 'fs';

export default class GenerarImagen extends BaseTask {
  public static get schedule() {
    return '0 * * * * *'
  }

  public static get useLock() {
    return false
  }

  public async handle() {
    const now = DateTime.now()
    console.log(now.toFormat('yyyy-MM-dd HH:mm:ss'));

    const data = await Database.connection('pg')
      .query()
      .select('pixeles_individuales.*')
      .from('pixeles_individuales')
      .innerJoin('grupos_pixeles', 'pixeles_individuales.id_grupo_pixeles', 'grupos_pixeles.id_grupo_pixeles')
      .where('grupos_pixeles.id_estado', 2)


    let pixelesIds = new Array();
    const imagePath = path.join(__dirname, './../../', 'public', 'actual.png')
    const previousImagesPath = path.join(__dirname, './../../', 'public', 'anteriores')

    // Crear la carpeta "Anteriores" si no existe
    if (!fs.existsSync(previousImagesPath)) {
      fs.mkdirSync(previousImagesPath);
    }

    const canvas = createCanvas(2000, 1000)
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    if (fs.existsSync(imagePath)) {
      const image = await loadImage(imagePath)
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    }

    data.forEach(item => {
      const { id_pixel_individual, coordenada_x, coordenada_y, color } = item
      pixelesIds.push(id_pixel_individual)
      // Validar color
      if (!/^#[0-9A-F]{6}$/i.test(color)) {
        console.error(`Color inválido: ${color}`)
        return
      }

      ctx.fillStyle = color
      ctx.fillRect(coordenada_x, coordenada_y, 1, 1) // Pintar un pixel en la coordenada
    })

    // Mover la imagen llamada "actual" a la carpeta "anteriores"
    if (fs.existsSync(imagePath)) {
      const oldImagePath = path.join(previousImagesPath, `${now.toFormat('yyyyMMdd_HHmmss')}.png`)
      fs.renameSync(imagePath, oldImagePath);
    }

    //creación de la imagen nueva
    const buffer = canvas.toBuffer('image/png')
    const newImagePath = path.join(__dirname, './../../', 'public', 'actual.png')
    fs.writeFileSync(newImagePath, buffer)

    // Actualizar la columna "pintado" a true para los píxeles obtenidos
    await Database.connection('pg')
      .from('pixeles_individuales')
      .whereIn('id_pixel_individual', pixelesIds)
      .update({ pintado: true });

    console.log('Pixeles actualizados:', pixelesIds);
  }
}
