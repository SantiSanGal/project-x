// app/Exceptions/Handler.ts
import Logger from "@ioc:Adonis/Core/Logger";
import HttpExceptionHandler from "@ioc:Adonis/Core/HttpExceptionHandler";
import Application from "@ioc:Adonis/Core/Application";
import type { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";

export default class ExceptionHandler extends HttpExceptionHandler {
  constructor() {
    super(Logger);
  }

  public async handle(error: any, ctx: HttpContextContract) {
    // 404 genérico para rutas inexistentes
    if (error.code === "E_ROUTE_NOT_FOUND") {
      return ctx.response.status(404).send({ message: "Not Found" });
    }

    // En producción, oculta stack y detalles
    if (Application.inProduction) {
      const status = error.status || 500;
      const body =
        status === 500
          ? { message: "Internal Server Error" }
          : { message: error.message || "Error" };

      return ctx.response.status(status).send(body);
    }

    // En dev, usa el manejador por defecto (con stack)
    return super.handle(error, ctx);
  }
}
