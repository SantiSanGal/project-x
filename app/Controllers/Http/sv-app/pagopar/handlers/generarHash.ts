import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Env from "@ioc:Adonis/Core/Env";
import crypto from "crypto";

export const generarHash = async ({ response }: HttpContextContract) => {
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
    const cadenaParaHash = datos.comercio_token_privado + "1" + "1000"; //Token + id_pedido + monto

    console.log("cadenaParaHash", cadenaParaHash);
    const hash = crypto
      .createHash("sha1")
      .update(cadenaParaHash.toString())
      .digest("hex");

    console.log("hash", hash);
    return response.json({ hash: hash })
  } catch (e) {
    console.log(e);
    return response.status(500).json(params);
  }
};
