import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Database from "@ioc:Adonis/Lucid/Database";

export const getGrupoPixeles = async ({
  request,
  response,
}: HttpContextContract) => {
  let params = {
    data: {},
    notification: {
      state: false,
      type: "error",
      message: "Error en el Servidor",
    },
  };

  try {
    const idGrupoPixeles = request.param("idGrupoPixeles");
    const data = await Database.connection("pg")
      .query()
      .select("gp.id_grupo_pixeles", "gp.link_adjunta", "gp.id_estado")
      .from("grupos_pixeles as gp")
      .leftJoin(
        "pixeles_individuales as pi",
        "gp.id_grupo_pixeles",
        "=",
        "pi.id_grupo_pixeles"
      )
      .where("gp.id_grupo_pixeles", idGrupoPixeles)
      .groupBy("gp.id_grupo_pixeles", "gp.link_adjunta", "gp.id_estado") // Es necesario agrupar correctamente
      .select(
        Database.raw("json_agg(pi) as pixeles_individuales") // Agrupar pixeles en un array JSON
      );

    // Verificamos si se obtuvo el dato
    if (data.length > 0) {
      params.data = data[0]; // Tomamos el primer (y único) registro
      params.notification.state = true;
      params.notification.type = "success";
      params.notification.message = "Listado Correctamente";
    } else {
      params.notification.message = "No se encontró el grupo de pixeles";
    }

    return response.json(params);
  } catch (e) {
    console.log("e", e);
    return response.status(500).json(params);
  }
};
