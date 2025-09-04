import { BaseTask } from "adonis5-scheduler/build/src/Scheduler/Task";
import Database from "@ioc:Adonis/Lucid/Database";
import { createCanvas, loadImage } from "canvas";
import { DateTime } from "luxon";
import path from "path";
import fs from "fs";

export default class GenerarImagen extends BaseTask {
  public static get schedule() {
    // return '0 * * * * *' // para cada 1min
    return "0 0 */6 * * *"; // Cada 6 horas
  }

  public static get useLock() {
    return false;
  }

  public async handle() {
    const now = DateTime.now();
    // Selecciono los grupos de píxeles que están pagados, pero no pintados
    const data = await Database.connection("pg")
      .query()
      .select("pixeles_individuales.*")
      .from("pixeles_individuales")
      .innerJoin(
        "grupos_pixeles",
        "pixeles_individuales.id_grupo_pixeles",
        "grupos_pixeles.id_grupo_pixeles"
      )
      .where("grupos_pixeles.id_estado", 2);

    let pixelesIds: number[] = [];
    const imagePath = path.join(__dirname, "./../../", "public", "actual.png");
    const previousImagesPath = path.join(
      __dirname,
      "./../../",
      "public",
      "anteriores"
    );

    // Crear la carpeta "anteriores" si no existe
    if (!fs.existsSync(previousImagesPath)) {
      fs.mkdirSync(previousImagesPath);
    }

    const canvas = createCanvas(1000, 1000);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (fs.existsSync(imagePath)) {
      const image = await loadImage(imagePath);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    }

    // Extraer id_grupo_pixeles y pintar cada pixel
    const gruposSet = new Set<number>();
    data.forEach((item) => {
      const {
        id_pixel_individual,
        id_grupo_pixeles,
        coordenada_x,
        coordenada_y,
        color,
      } = item;
      pixelesIds.push(id_pixel_individual);
      gruposSet.add(id_grupo_pixeles);

      // Validar color
      if (!/^#[0-9A-F]{6}$/i.test(color)) {
        console.error(`Color inválido: ${color}`);
        return;
      }

      ctx.fillStyle = color;
      ctx.fillRect(coordenada_x, coordenada_y, 1, 1); // Pintar un pixel en la coordenada
    });

    // Mover la imagen "actual.png" a la carpeta "anteriores" con timestamp
    if (fs.existsSync(imagePath)) {
      const oldImagePath = path.join(
        previousImagesPath,
        `${now.toFormat("yyyyMMdd_HHmmss")}.png`
      );
      fs.renameSync(imagePath, oldImagePath);
    }

    // Creación de la imagen nueva
    const buffer = canvas.toBuffer("image/png");
    const newImagePath = path.join(
      __dirname,
      "./../../",
      "public",
      "actual.png"
    );
    fs.writeFileSync(newImagePath, buffer);

    // Actualizar el estado de los grupos de píxeles a 3 (pintado)
    const groupIds = Array.from(gruposSet);
    if (groupIds.length > 0) {
      await Database.connection("pg")
        .from("grupos_pixeles")
        .whereIn("id_grupo_pixeles", groupIds)
        .update({ id_estado: 3, updated_at: now.toISO() });
    }
  }
}
