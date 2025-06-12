import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import path from "path";
import fs from "fs";
import Logger from "@ioc:Adonis/Core/Logger";
import crypto from "crypto";

export const getImgGrupoPixeles = async ({
  params,
  response,
}: HttpContextContract) => {
  // Generar un ID único para esta petición
  const requestId = crypto.randomBytes(8).toString("hex");
  Logger.info(
    `----- Inicio handler Get Img Grupo Pixeles – requestId: ${requestId} -----`
  );

  try {
    // 1. Leer parámetro grupoId
    const grupoId = params.id;
    Logger.trace(
      `Parámetro grupoId recibido – grupoId: ${grupoId} – requestId: ${requestId}`
    );

    // 2. Definir directorio de imágenes
    const imageDir = path.join(
      __dirname,
      "./../../../../../../public/individuales"
    );
    Logger.trace(
      `Directorio de imágenes definido – imageDir: ${imageDir} – requestId: ${requestId}`
    );

    // 3. Verificar existencia del directorio
    if (!fs.existsSync(imageDir)) {
      Logger.warn(
        `Directorio de imágenes no encontrado – imageDir: ${imageDir} – requestId: ${requestId}`
      );
      return response
        .status(404)
        .json({ message: "Directorio de imágenes no encontrado" });
    }
    Logger.info(`Directorio de imágenes existe – requestId: ${requestId}`);

    // 4. Leer archivos del directorio
    const files = fs.readdirSync(imageDir);
    Logger.trace(
      `Archivos en directorio – count: ${files.length} – requestId: ${requestId}`
    );

    // 5. Buscar el archivo correspondiente
    const fileName = files.find((file) => file === `${grupoId}.png`);
    if (!fileName) {
      Logger.warn(
        `Imagen no encontrada para grupoId – grupoId: ${grupoId} – requestId: ${requestId}`
      );
      return response.status(404).json({ message: "Imagen no encontrada" });
    }
    Logger.info(
      `Imagen encontrada – fileName: ${fileName} – requestId: ${requestId}`
    );

    // 6. Leer y enviar la imagen
    const filePath = path.join(imageDir, fileName);
    Logger.trace(
      `Ruta de archivo – filePath: ${filePath} – requestId: ${requestId}`
    );
    const fileBuffer = fs.readFileSync(filePath);
    Logger.info(
      `Enviando imagen – fileName: ${fileName} – requestId: ${requestId}`
    );

    response.header("Content-Type", "image/png");
    return response.send(fileBuffer);
  } catch (error: any) {
    Logger.error(
      `Error inesperado en handler GET IMG GRUPO PIXELES – requestId: ${requestId} – message: ${error.message}`
    );
    return response.status(500).json({ message: error.message });
  }
};
