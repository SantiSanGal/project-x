import Database from '@ioc:Adonis/Lucid/Database';
import { BaseTask, CronTimeV2 } from 'adonis5-scheduler/build/src/Scheduler/Task'
import { createCanvas } from 'canvas';
import { DateTime } from 'luxon';
import path from 'path';
import fs from 'fs';

export default class GenerarImagen extends BaseTask {
  public static get schedule() {
    return '0 * * * * *'
    // return CronTimeV2.everySecond()
  }

  /**
   * Set enable use .lock file for block run retry task
   * Lock file save to `build/tmp/adonis5-scheduler/locks/your-class-name`
   */
  public static get useLock() {
    return false
  }

  public async handle() {
    console.log('hola soy el job');
    const now = DateTime.now()
    console.log(now.toFormat('yyyy-MM-dd HH:mm:ss'));

    const data = await Database.connection('pg')
      .query()
      .from('pixeles_individuales')

    const canvas = createCanvas(2000, 1000)
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    data.forEach(item => {
      const { coordenada_x, coordenada_y, color } = item

      // Validar color
      if (!/^#[0-9A-F]{6}$/i.test(color)) {
        console.error(`Color inválido: ${color}`)
        return
      }

      ctx.fillStyle = color
      ctx.fillRect(coordenada_x, coordenada_y, 1, 1) // Pintar un pixel en la coordenada
    })


    const buffer = canvas.toBuffer('image/png')
    const imagePath = path.join(__dirname, './../../', 'public', 'images', 'outputScheduler.png')
    fs.writeFileSync(imagePath, buffer)

    // Remove this promise and insert your code:
    await new Promise((res) => setTimeout(res, 2000))
  }
}
