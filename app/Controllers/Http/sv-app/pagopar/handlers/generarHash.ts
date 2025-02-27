import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Env from "@ioc:Adonis/Core/Env";
import crypto from "crypto";

export const generarPedido = async ({ response }: HttpContextContract) => {
  let params = {
    notification: {
      state: false,
      type: "error",
      message: "Error en el Servidor",
    },
  };

  try {
    const datos = {
      comercio_token_privado: Env.get("PAGOPAR_TOKEN_PRIVADO"),
    };

    console.log("datos", datos);
    const cadenaParaHash = datos.comercio_token_privado + "54" + "1"; //Token + id_pedido + monto

    console.log("cadenaParaHash", cadenaParaHash);
    const hash = crypto
      .createHash("sha1")
      .update(cadenaParaHash.toString())
      .digest("hex");

    console.log("hash", hash);
  } catch (e) {
    console.log(e);
    return response.status(500).json(params);
  }
};
