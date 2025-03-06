import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Database from "@ioc:Adonis/Lucid/Database";
import Env from "@ioc:Adonis/Core/Env";
import { DateTime } from "luxon";
import crypto from "crypto";

//acá notifica si el pago es reversado o no
//todo: actualizar estados de tablas
//todo: actualizar pedido a pagado
export const confirmarPago = async ({
  request,
  response,
}: HttpContextContract) => {
  console.log("confirmarPago handler");
  let params = {
    notification: {
      state: false,
      type: "error",
      message: "Error en el servidor",
    },
  };

  try {
    const { resultado, respuesta } = await request.all();

    console.log("resultado", resultado);
    const privateToken = Env.get("PAGOPAR_TOKEN_PRIVADO");
    const [
      {
        pagado, // viene booleano
        numero_comprobante_interno,
        ultimo_mensaje_error,
        forma_pago,
        fecha_pago,
        monto,
        fecha_maxima_pago,
        hash_pedido,
        numero_pedido,
        cancelado,
        forma_pago_identificador,
        token,
      },
    ] = resultado;

    console.log("--------------------");
    console.log(
      "pagado",
      pagado,
      "\n",
      "numero_comprobante_interno",
      numero_comprobante_interno,
      "\n",
      "ultimo_mensaje_error",
      ultimo_mensaje_error,
      "\n",
      "forma_pago",
      forma_pago,
      "\n",
      "fecha_pago",
      fecha_pago,
      "\n",
      "monto",
      monto,
      "\n",
      "fecha_maxima_pago",
      fecha_maxima_pago,
      "\n",
      "hash_pedido",
      hash_pedido,
      "\n",
      "numero_pedido",
      numero_pedido,
      "\n",
      "cancelado",
      cancelado,
      "\n",
      "forma_pago_identificador",
      forma_pago_identificador,
      "\n",
      "token",
      token
    );
    console.log("--------------------");

    console.log("hash_pedido", hash_pedido);
    console.log("privateToken", privateToken);
    console.log(
      "token?",
      "privateToken",
      crypto
        .createHash("sha1")
        .update(privateToken + hash_pedido)
        .digest("hex")
    );
    console.log("pagado", pagado);
    console.log("numero_comprobante_interno", numero_comprobante_interno);
    console.log("forma_pago", forma_pago);
    console.log("fecha_pago", fecha_pago);
    console.log("forma_pago_identificador", forma_pago_identificador);

    let pedido_update_params = {
      pagado: pagado,
      numero_comprobante_interno_pagopar: numero_comprobante_interno,
      forma_pago: forma_pago,
      fecha_pago: fecha_pago,
      forma_pago_identificador: forma_pago_identificador,
      updated_at: DateTime.local().toISO(),
    };

    await Database.connection("pg")
      .from("pedidos")
      .where("pagopar_pedido_transaccion", numero_pedido)
      .andWhere("data_token", hash_pedido)
      .update(pedido_update_params);

    return response.status(200).json(resultado);
  } catch (e) {
    console.log("e", e);
    // logger.error(e);
    return response.status(500).json(params);
  }
};
