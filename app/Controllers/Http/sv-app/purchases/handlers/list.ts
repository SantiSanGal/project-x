import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Database from "@ioc:Adonis/Lucid/Database";
import Logger from "@ioc:Adonis/Core/Logger";
import crypto from "crypto";

export const list = async ({ response, auth }: HttpContextContract) => {
  // Generar un ID único para correlacionar logs de esta petición
  const requestId = crypto.randomBytes(8).toString("hex");
  Logger.info(
    `---------- Inicio handler List Pedidos - requestId: ${requestId} ---------`
  );

  try {
    // 1. Verificar autenticación
    const { user } = auth;
    if (!user) {
      Logger.warn(`Usuario no autenticado - requestId: ${requestId}`);
      return response.status(401).json({ message: "User not authenticated" });
    }
    if (!user.id) {
      Logger.warn(`Usuario autenticado sin ID - requestId: ${requestId}`);
      return response.status(401).json({ message: "User ID is not available" });
    }
    Logger.info(
      `Usuario autenticado - userId: ${user.id} - requestId: ${requestId}`
    );

    // 2. Ejecutar consulta de pedidos con estados completados
    Logger.trace(
      `Ejecutando consulta DB para listar pedidos - userId: ${user.id} - requestId: ${requestId}`
    );
    const groups = await Database.from("pedidos as p")
      .join("grupos_pixeles as gp", "p.id_grupo_pixeles", "gp.id_grupo_pixeles")
      .leftJoin(
        "pixeles_individuales as pi",
        "pi.id_grupo_pixeles",
        "gp.id_grupo_pixeles"
      )
      .where("p.id_usuario", user.id)
      .whereIn("gp.id_estado", [2, 3])
      .select([
        "gp.id_grupo_pixeles as grupo_pixeles_id",
        "gp.link_adjunta as link_adjunta",
        Database.raw(`
          COALESCE(
            json_agg(
              json_build_object(
                'coordenada_x', pi.coordenada_x,
                'coordenada_y', pi.coordenada_y,
                'color',         pi.color
              )
            ) FILTER (WHERE pi.id_pixel_individual IS NOT NULL),
            '[]'
          ) as pixeles_individuales
        `),
      ])
      .groupBy("gp.id_grupo_pixeles", "gp.link_adjunta");

    Logger.info(
      `Pedidos obtenidos - count: ${groups.length} - userId: ${user.id} - requestId: ${requestId}`
    );

    // 3. Responder al cliente
    return response.json({
      data: groups,
      notification: {
        state: true,
        type: "success",
        message: "Listado Correctamente",
      },
    });
  } catch (error) {
    // 4. Manejo de errores inesperados
    Logger.error(
      `Error inesperado en handler LIST - message: ${error.message} - stack: ${error.stack} - requestId: ${requestId}`
    );
    return response.status(500).json({
      notification: {
        state: false,
        type: "error",
        message: "Error en el Servidor",
      },
    });
  }
};
