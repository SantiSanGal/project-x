import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Env from "@ioc:Adonis/Core/Env";
import crypto from "crypto";
import axios from "axios";

export const consultarEstadoPago = async ({
  request,
  response,
}: HttpContextContract) => {
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
    const { hashPedido } = request.all();
    const privateToken = Env.get("PAGOPAR_TOKEN_PRIVADO");

    const tokenForPagopar = crypto
      .createHash("sha1")
      .update(privateToken + "CONSULTA")
      .digest("hex");

    const consultar_estado_pago_params = {
      hash_pedido: hashPedido,
      token: tokenForPagopar,
      token_publico: Env.get("PAGOPAR_TOKEN_PUBLICO"),
    };

    const respuestaConsultaPagopar = await axios.post(
      "https://api.pagopar.com/api/pedidos/1.1/traer",
      consultar_estado_pago_params
    );

    console.log("respuestaConsultaPagopar", respuestaConsultaPagopar.data);
    params.data = respuestaConsultaPagopar.data;
    return response.status(200).json(params);
  } catch (e) {
    console.log("e", e);
    return response.status(500).json(params);
  }
};
