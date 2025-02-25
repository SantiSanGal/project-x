// import GenerarPedidoValidator from 'App/Validators/sv-app/pagopar/generarPedidoValidator';
import { validar } from "App/Utils/ValidacionUnicoRegistroProcesoCompra";
import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import { getUserData } from "App/Utils/getUserData";
import Database from "@ioc:Adonis/Lucid/Database";
import Env from "@ioc:Adonis/Core/Env";
import { DateTime } from "luxon";
import crypto from "crypto";

export const generarPedido = async ({
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
    /*
            OK 1ro - Insertar en grupo pixeles los datos, CON ESTADO PROCESO COMPRA
            OK 2do - Insertar en pinxeles individuales los colores
            OK 3ro - Insertar un pedido en la bd
            4to - Generar pedido pagopar
            5to - responder con url para redirigir al chekout
        */

    // const { coordenada_x_inicio, coordenada_y_inicio, coordenada_x_fin, coordenada_y_fin } = await request.validate(GenerarPedidoValidator);
    const { grupo_pixeles, pixeles } = await request.all();
    const {
      coordenada_x_inicio,
      coordenada_y_inicio,
      coordenada_x_fin,
      coordenada_y_fin,
    } = grupo_pixeles;
    const existeRegistro = await validar(
      coordenada_x_inicio,
      coordenada_y_inicio,
      coordenada_x_fin,
      coordenada_y_fin
    );

    const userId = auth.user?.id;

    if (userId === undefined || userId === null) {
      await trx.rollback();
      return response.status(400).json({ message: "User ID is not available" });
    }

    if (existeRegistro) {
      await trx.rollback();
      return response.status(409).json({
        message:
          "Ya existe un registro con esas coordenadas en proceso de compra",
      });
    }

    let grupo_pixel_insert_params = {
      link_adjunta: grupo_pixeles.link,
      coordenada_x_inicio: grupo_pixeles.coordenada_x_inicio,
      coordenada_y_inicio: grupo_pixeles.coordenada_y_inicio,
      coordenada_x_fin: grupo_pixeles.coordenada_x_fin,
      coordenada_y_fin: grupo_pixeles.coordenada_y_fin,
      id_estado: 1, //inicia con estado proceso compra
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

    const insert_datos_pedido: any = {
      id_usuario: userId,
      monto: 1000.0, //por el momento, siempre será 25
      created_at: DateTime.local().toISO(),
      updated_at: DateTime.local().toISO(),
      pagado: false,
      id_grupo_pixeles,
    };

    const [{ id_pedido }] = await trx
      .table("pedidos")
      .insert(insert_datos_pedido)
      .returning("id_pedido");

    const datos = {
      comercio_token_privado: Env.get("PAGOPAR_TOKEN_PRIVADO"),
    };

    console.log("datos", datos);

    const cadenaParaHash =
      datos.comercio_token_privado +
      id_pedido +
      parseFloat(insert_datos_pedido.monto);
    console.log("cadenaParaHash", cadenaParaHash);
    const hash = crypto
      .createHash("sha1")
      .update(cadenaParaHash.toString())
      .digest("hex");

    const userData = await getUserData(userId);
    console.log("userData", userData);

    //TODO: hacer el post a pagopar y actualizar la tabla de pedido con el token que viene de respuesta en data
    // const res = await axios.post('https://api.pagopar.com/api/comercios/2.0/iniciar-transaccion')

    // console.log('hash', hash);
    await trx.commit();
    return response.json({ id_pedido, hash: hash });
  } catch (e) {
    console.log(e);
    await trx.rollback();
    return response.status(500).json(params);
  }
};
