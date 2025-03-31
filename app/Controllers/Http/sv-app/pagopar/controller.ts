import { consultarEstadoPago } from "./handlers/consultarEstadoPago";
import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import { confirmarPago } from "./handlers";
import Env from "@ioc:Adonis/Core/Env";
export default class Controller {
  public async confirmarPago(params: HttpContextContract) {
    return confirmarPago(params);
  }

  public async redireccionamiento({ request, response }: HttpContextContract) {
    const { hash } = await request.params();
    // Redirige al frontend, pasando el hash como parámetro de query (opcional)
    return response.redirect(`${Env.get("URL_FRONT")}/redirect/${hash}`);
  }

  public async consultarEstadoPago(params: HttpContextContract) {
    return consultarEstadoPago(params);
  }
}
