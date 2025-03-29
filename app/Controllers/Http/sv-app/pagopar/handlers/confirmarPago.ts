import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Database from "@ioc:Adonis/Lucid/Database";
import Env from "@ioc:Adonis/Core/Env";
import { DateTime } from "luxon";
import Ws from "App/Services/Ws";
import crypto from "crypto";

//Acá notifica si el pago es reversado o no
//todo: actualizar estados de tablas
//todo: actualizar pedido a pagado
export const confirmarPago = async ({
  request,
  response,
}: HttpContextContract) => {
  const { resultado, respuesta } = await request.all();
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
        hash_pedido,
        numero_pedido,
        cancelado,
        forma_pago_identificador,
        token,
      },
    ] = resultado;

    console.log('ultimo_mensaje_error', ultimo_mensaje_error);
    console.log('monto', monto);
    console.log('cancelado', cancelado);

    const hashToCompare = crypto
      .createHash("sha1")
      .update(privateToken + hash_pedido)
      .digest("hex");

    if (hashToCompare === token) {
      let pedido_update_params = {
        pagado: pagado,
        numero_comprobante_interno_pagopar: numero_comprobante_interno,
        forma_pago: forma_pago,
        fecha_pago: fecha_pago,
        forma_pago_identificador: forma_pago_identificador,
        updated_at: DateTime.local().toISO(),
      };

      const updatedPedido = await Database.connection("pg")
        .from("pedidos")
        .where("pagopar_pedido_transaccion", numero_pedido)
        .andWhere("data_token", hash_pedido)
        .update(pedido_update_params)
        .returning("id_grupo_pixeles");

      console.log('updatedPedido', updatedPedido);

      if (updatedPedido.length > 0 && updatedPedido[0].id_grupo_pixeles) {
        const grupos_pixeles = await Database.connection("pg")
          .from("grupos_pixeles")
          .where("id_grupo_pixeles", updatedPedido[0].id_grupo_pixeles)
          .update({ id_estado: 2 });

        console.log('grupos_pixeles', grupos_pixeles);

        const pixeles_individuales = await Database.connection('pg')
          .from('pixeles_individuales')
          .where('id_grupo_pixeles', updatedPedido[0].id_grupo_pixeles)

        console.log('pixeles_individuales', pixeles_individuales);

        if (pagado) {
          Ws.io.emit('pintar', pixeles_individuales)
        }
      }
    }

    return response.status(200).json(resultado);
  } catch (e) {
    console.log("*****************************");
    console.log("e", e);
    console.log("catch respuesta", respuesta);
    console.log("*****************************");
    return response.status(200).json(resultado);
  }
};
