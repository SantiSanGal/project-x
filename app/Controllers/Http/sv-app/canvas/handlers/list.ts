import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Database from "@ioc:Adonis/Lucid/Database";

//Get de los pixeles PAGADOS sin pintar
export const list = async ({ response }: HttpContextContract) => {
  let params = {
    data: {},
    notification: {
      state: false,
      type: "error",
      message: "Error en el Servidor",
    },
  };

  try {
    // TODO: consultar su estado desde el grupo_pixeles
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

    params.data = data;
    params.notification.state = true;
    params.notification.type = "success";
    params.notification.message = "Listado Correctamente";
    return response.json(params);
  } catch (e) {
    console.error(e);
    params.notification.message = e.message;
    return response.status(500).json(params);
  }
};
