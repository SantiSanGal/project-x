import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Database from "@ioc:Adonis/Lucid/Database";

export const store = async ({
  request,
  response,
  auth,
}: HttpContextContract) => {
  let params = {
    notification: {
      state: false,
      type: "error",
      message: "Error en el Servidor",
    },
  };

  const trx = await Database.transaction();

  try {
    const { grupo_pixeles, pixeles } = request.all(); //TODO: Agregar validator

    const userId = auth.user?.id;

    if (userId === undefined) {
      await trx.rollback();
      return response.status(400).json({ message: "User ID is not available" });
    }

    // let datos_compras_insert_params = {
    //     fecha: DateTime.local().toISO(),
    //     monto: 25.00,
    //     id_usuario: userId
    // }

    // const [{ id_datos_compra }] = await trx.table('datos_compras').insert(datos_compras_insert_params).returning('id_datos_compra')

    let grupo_pixel_insert_params = {
      link_adjunta: grupo_pixeles.link,
      coordenada_x_inicio: grupo_pixeles.coordenada_x_inicio,
      coordenada_y_inicio: grupo_pixeles.coordenada_y_inicio,
      coordenada_x_fin: grupo_pixeles.coordenada_x_fin,
      coordenada_y_fin: grupo_pixeles.coordenada_y_fin,
      // id_datos_compra: id_datos_compra
    };

    const [{ id_grupo_pixeles }] = await trx
      .table("grupos_pixeles")
      .insert(grupo_pixel_insert_params)
      .returning("id_grupo_pixeles");
    if (id_grupo_pixeles) {
      let pixeles_individuales_insert_params = new Array();
      for (const pixel of pixeles) {
        pixeles_individuales_insert_params.push({
          coordenada_x: pixel.coordenada_x,
          coordenada_y: pixel.coordenada_y,
          color: pixel.color,
          id_grupo_pixeles: id_grupo_pixeles,
        });
      }
      await trx
        .table("pixeles_individuales")
        .insert(pixeles_individuales_insert_params);
    }

    await trx.commit();
    params.notification.state = true;
    params.notification.type = "success";
    params.notification.message = "Grupo Registrado Correctamente";
    return response.json(params);
  } catch (error) {
    console.log("error", error);
    await trx.rollback();
    return response.status(500).json(params);
  }
};
