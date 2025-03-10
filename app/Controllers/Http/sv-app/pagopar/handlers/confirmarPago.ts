import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Database from "@ioc:Adonis/Lucid/Database";
import Env from "@ioc:Adonis/Core/Env";
import { DateTime } from "luxon";
import crypto from "crypto";
// import axios from "axios";

//acá notifica si el pago es reversado o no
//todo: actualizar estados de tablas
//todo: actualizar pedido a pagado
export const confirmarPago = async ({
  request,
  response,
}: HttpContextContract) => {
  console.log('=============================');
  console.log("confirmarPago handler");

  const { resultado, respuesta } = await request.all();
  console.log("resultado", resultado);
  try {
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

    const hashToCompare = crypto
      .createHash("sha1")
      .update(privateToken + hash_pedido)
      .digest("hex");

    console.log('hashToCompare', hashToCompare);
    console.log('token', token);

    if (hashToCompare === token) {
      console.log('los hashes son iguales');
      console.log('ultimo_mensaje_error', ultimo_mensaje_error);
      console.log('monto', monto);
      console.log('fecha_maxima_pago', fecha_maxima_pago);
      console.log('cancelado', cancelado);

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

    } else {
      return response.status(200).json(resultado);
    }

    // const tokenForPagopar = crypto
    //   .createHash("sha1")
    //   .update(privateToken + "CONSULTA")
    //   .digest("hex");

    // const consultar_estado_pago_params = {
    //   hash_pedido: hash_pedido,
    //   token: tokenForPagopar,
    //   token_publico: Env.get("PAGOPAR_TOKEN_PUBLICO"),
    // };

    // console.log('consultar_estado_pago_params', consultar_estado_pago_params)

    // const respuestaConsultaPagopar = await axios.post(
    //   "https://api.pagopar.com/api/pedidos/1.1/traer",
    //   consultar_estado_pago_params
    // );

    // console.log("respuestaConsultaPagopar", respuestaConsultaPagopar.data);
    // params.data = respuestaConsultaPagopar.data;
    // return response.status(200).json(params);

    console.log('=============================');
    return response.status(200).json(resultado);
  } catch (e) {
    console.log('*****************************');
    console.log("e", e);
    console.log('catch respuesta', respuesta);
    console.log('*****************************');
    return response.status(200).json(resultado);
  }
};
