// app/Middleware/SecurityHeaders.ts

import type { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";

export default class SecurityHeaders {
  public async handle(
    { response }: HttpContextContract,
    next: () => Promise<void>
  ) {
    /**
     * Estas políticas son necesarias para que la comunicación entre
     * tu web y el pop-up de autenticación de Google funcione correctamente.
     */
    response.header("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    response.header("Cross-Origin-Embedder-Policy", "require-corp");
    response.header("Referrer-Policy", "strict-origin-when-cross-origin");

    // Continúa con la petición
    await next();
  }
}
