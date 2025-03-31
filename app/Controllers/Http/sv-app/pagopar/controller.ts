import { consultarEstadoPago } from "./handlers/consultarEstadoPago";
import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import { confirmarPago } from "./handlers";

export default class Controller {
  public async confirmarPago(params: HttpContextContract) {

    return confirmarPago(params);
  }

  //TODO: Si hay una petición al redirect, quiere decir que el pago fue realizado, cambiar a un estado intermedio (en proceso pago o pendiente de confirmación)
  //TODO: Consultar a pagopar el estado del pago con el hash
  public async redireccionamiento({ request, response }: HttpContextContract) {
    const { hash } = await request.params();
    // Redirige al frontend, pasando el hash como parámetro de query (opcional)
    return response.redirect(`http://localhost:3000/redirect/${hash}`);
  }

  public async consultarEstadoPago(params: HttpContextContract) {
    return consultarEstadoPago(params);
  }
}
