import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Database from "@ioc:Adonis/Lucid/Database";
import Logger from "@ioc:Adonis/Core/Logger";
import crypto from "crypto";

export const rangosOcupados = async ({
  request,
  response,
}: HttpContextContract) => {
  // Generar un ID único para co-relacionar logs de esta petición
  const requestId = crypto.randomBytes(8).toString("hex");
  Logger.info(
    `-------- Inicio handler Rangos Ocupados - requestId: ${requestId} --------`
  );

  const params: any = {
    data: {},
    notification: {
      state: false,
      type: "error" as const,
      message: "Error en el Servidor",
    },
  };

  const consultar: Record<
    number,
    { x: [number, number]; y: [number, number] }
  > = {
    1: { x: [0, 999], y: [0, 499] },
    2: { x: [1000, 1999], y: [0, 499] },
    3: { x: [0, 999], y: [500, 999] },
    4: { x: [1000, 1999], y: [500, 999] },
  };

  try {
    // 1. Leer y validar parámetro idSector
    const idSectorParam = request.param("idSector");
    Logger.trace(
      `Parámetro idSector recibido - idSectorParam: ${idSectorParam} - requestId: ${requestId}`
    );
    const idSector = Number(idSectorParam);
    if (!consultar[idSector]) {
      Logger.warn(
        `Sector inválido - idSector: ${idSector} - requestId: ${requestId}`
      );
      return response.status(400).json({ message: "Sector inválido" });
    }

    const {
      x: [xMin, xMax],
      y: [yMin, yMax],
    } = consultar[idSector];
    Logger.info(
      `Rango de coordenadas seleccionado - sector: ${idSector} - x: [${xMin}, ${xMax}] - y: [${yMin}, ${yMax}] - requestId: ${requestId}`
    );

    // 2. Ejecutar consulta de rangos ocupados
    Logger.trace(`Ejecutando consulta DB - requestId: ${requestId}`);
    const data = await Database.connection("pg")
      .query()
      .select(
        "grupos_pixeles.id_grupo_pixeles",
        "grupos_pixeles.coordenada_x_inicio",
        "grupos_pixeles.coordenada_x_fin",
        "grupos_pixeles.coordenada_y_inicio",
        "grupos_pixeles.coordenada_y_fin",
        "grupos_pixeles.id_estado"
      )
      .from("grupos_pixeles")
      .join("estados", "grupos_pixeles.id_estado", "=", "estados.estado_id")
      .where("coordenada_x_inicio", ">=", xMin)
      .andWhere("coordenada_x_fin", "<=", xMax)
      .andWhere("coordenada_y_inicio", ">=", yMin)
      .andWhere("coordenada_y_fin", "<=", yMax)
      .andWhere((query) => {
        query
          .whereIn("estados.nombre_estado", ["pintado", "pagado"])
          .orWhere((qb) => {
            qb.where("estados.nombre_estado", "en proceso compra").andWhere(
              "grupos_pixeles.fecha_expiracion",
              ">",
              Database.raw("CURRENT_TIMESTAMP")
            );
          });
      });

    Logger.info(
      `Consulta completada - registros obtenidos: ${data.length} - requestId: ${requestId}`
    );

    // 3. Preparar y enviar respuesta
    params.data = data;
    params.notification = {
      state: true,
      type: "success" as const,
      message: "Listado Correctamente",
    };
    Logger.info(`Respuesta éxitos - requestId: ${requestId}`);
    return response.json(params);
  } catch (error: any) {
    // 4. Manejo de errores inesperados
    Logger.error(
      `Error inesperado en handler RANGOS OCUPADOS - message: ${error.message} - stack: ${error.stack} - requestId: ${requestId}`
    );
    return response.status(500).json(params);
  }
};
