import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Database from "@ioc:Adonis/Lucid/Database";

export const list = async ({ response, auth }: HttpContextContract) => {
  try {
    const { user } = auth;

    if (!user) {
      return response.status(401).json({ message: "User ID is not available" });
    }

    if (!user.id) {
      return response.status(401).json({ message: "User ID is not available" });
    }

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

    return response.json({
      data: groups,
      notification: {
        state: true,
        type: "success",
        message: "Listado Correctamente",
      },
    });
  } catch (error) {
    return response.status(500).json({
      notification: {
        state: false,
        type: "error",
        message: "Error en el Servidor",
      },
    });
  }
};
