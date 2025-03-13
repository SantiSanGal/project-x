import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Env from "@ioc:Adonis/Core/Env";
import crypto from "crypto";
import axios from "axios";

export const consultarEstadoPago = async ({
  request,
  response,
}: HttpContextContract) => {
  console.log("=============================");
  console.log("ConsultarEstadoPago handler");

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
    console.log("trae hashPedido", hashPedido);

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

    console.log("consultar_estado_pago_params", consultar_estado_pago_params);

    const { data } = await axios.post(
      "https://api.pagopar.com/api/pedidos/1.1/traer",
      consultar_estado_pago_params
    );

    if (data) {
      //TODO: Actualizar en la bd?
      params.data = {
        pagado: data.resultado.pagado,
      };
    }
    console.log("respuestaConsultaPagopar", data);

    params.notification.state = true;
    params.notification.type = "success";
    params.notification.message = "Pedido consultado con exito";
    console.log("=============================");
    return response.status(200).json(params);
  } catch (e) {
    console.log("*****************************");
    console.log("e", e);
    console.log("*****************************");
    return response.status(500).json(params);
  }
};
