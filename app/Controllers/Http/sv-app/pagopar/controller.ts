import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import { confirmarPago } from "./handlers";

export default class Controller {
  public async confirmarPago(params: HttpContextContract) {
    console.log("confirmarPago controller");

    return confirmarPago(params);
  }

  //TODO: Si hay una petición al redirect, quiere decir que el pago fue realizado, cambiar a un estado intermedio (en proceso pago o pendiente de confirmación)
  //TODO: Consultar a pagopar el estado del pago con el hash
  public async redireccionamiento({ request, response }: HttpContextContract) {
    const peticion = request.all();
    // console.log("request confirmación pagopar peticion", peticion);

    const { hash } = await request.params();

    console.log("hash", hash);

    console.log("redireccionamiento");

    return response.status(200).json({ message: "oikoite", hash });
  }
}
