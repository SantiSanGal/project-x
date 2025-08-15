import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Database from "@ioc:Adonis/Lucid/Database";
import { DateTime } from "luxon";

export const postReportarGrupoPixeles = async ({
  request,
  response,
  auth,
}: HttpContextContract) => {
  const trx = await Database.transaction();

  let params = {
    notification: {
      state: false,
      type: "error",
      message: "Error en el Servidor",
    },
  };

  try {
    const { comentario } = request.all();
    const idGrupoPixeles = request.param("idGrupoPixeles");

    const userId = auth.user?.id;
    if (userId === undefined) {
      await trx.rollback();
      return response.status(400).json({ message: "User ID is not available" });
    }

    if (idGrupoPixeles) {
      const [grupoExistente] = await trx
        .from("grupos_pixeles")
        .where("id_grupo_pixeles", idGrupoPixeles);

      if (grupoExistente) {
        await trx.table("reportados").insert({
          id_grupo_pixeles: idGrupoPixeles,
          id_usuario_reportador: userId,
          comentario: comentario,
          fecha_reporte: DateTime.local().toISO(),
          estado_id: 5, //pendiente
        });
      }
    }

    await trx.commit();
    params.notification.state = true;
    params.notification.type = "success";
    params.notification.message = "Grupo Actualizado Correctamente";
    return response.json(params);
  } catch (e) {
    console.log("e", e);
    await trx.rollback();
    return response.status(500).json(params);
  }
};
