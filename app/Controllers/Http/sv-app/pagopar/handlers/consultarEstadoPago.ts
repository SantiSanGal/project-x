import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Database from "@ioc:Adonis/Lucid/Database";
import Env from "@ioc:Adonis/Core/Env";
import { DateTime } from "luxon";
import Ws from "App/Services/Ws";
import crypto from "crypto";
import axios from "axios";

export const consultarEstadoPago = async ({
  request,
  response,
}: HttpContextContract) => {

  let params = {
    data: {},
    notification: {
      state: false,
      type: "error",
      message: "Error en el servidor",
    },
  };

  try {
    const { hashPedido } = request.params();

    const privateToken = Env.get("PAGOPAR_TOKEN_PRIVADO");
    const publicToken = Env.get("PAGOPAR_TOKEN_PUBLICO");

    const tokenForPagopar = crypto
      .createHash("sha1")
      .update(privateToken + "CONSULTA")
      .digest("hex");

    const consultar_estado_pago_params = {
      hash_pedido: hashPedido,
      token: tokenForPagopar,
      token_publico: publicToken,
    };

    const { data } = await axios.post(
      "https://api.pagopar.com/api/pedidos/1.1/traer",
      consultar_estado_pago_params
    );

    if (data && data.respuesta) {
      const { resultado } = data

      const [
        {
          pagado,
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
          cancelado: cancelado
        };

        const updatedPedido = await Database.connection("pg")
          .from("pedidos")
          .where("pagopar_pedido_transaccion", numero_pedido)
          .andWhere("data_token", hash_pedido)
          .update(pedido_update_params)
          .returning("id_grupo_pixeles");

        if (updatedPedido.length > 0 && updatedPedido[0].id_grupo_pixeles) {
          await Database.connection("pg")
            .from("grupos_pixeles")
            .where("id_grupo_pixeles", updatedPedido[0].id_grupo_pixeles)
            .update({ id_estado: 2 });

          const pixeles_individuales = await Database.connection('pg')
            .from('pixeles_individuales')
            .where('id_grupo_pixeles', updatedPedido[0].id_grupo_pixeles)

          if (pagado) {
            Ws.io.emit('pintar', pixeles_individuales)
          }
        }
      }

      params.data = {
        pagado: data.resultado.pagado,
      };
    }

    params.notification.state = true;
    params.notification.type = "success";
    params.notification.message = "Pedido consultado con exito";
    return response.status(200).json(params);
  } catch (e) {
    console.log("*****************************");
    console.log("e", e);
    console.log("*****************************");
    return response.status(500).json(params);
  }
};
