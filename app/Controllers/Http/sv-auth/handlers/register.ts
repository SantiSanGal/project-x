import resgisterValidator from "App/Validators/sv-auth/registerValidator";
import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Database from "@ioc:Adonis/Lucid/Database";
import Hash from "@ioc:Adonis/Core/Hash";
import { DateTime } from "luxon";
import Logger from "@ioc:Adonis/Core/Logger";
import crypto from "crypto";

export const register = async ({ request, response }: HttpContextContract) => {
  // Generar un ID de petición para correlacionar logs
  const requestId = crypto.randomBytes(8).toString("hex");
  Logger.info(
    `------------------------- Inicio handler Register ${requestId} ------------------------`
  );

  const params: any = {
    notification: {
      state: false,
      type: "error",
      message: "Server Error",
    },
  };

  try {
    // 1. Validar payload
    Logger.trace(`Validando payload de registro - requestId: ${requestId}`);
    const {
      username: rawUserName,
      password,
      name,
      last_name,
      email,
      // document,
      // type_document,
    } = await request.validate(resgisterValidator);

    const username = (rawUserName || "").toLowerCase();

    if (!/^[a-z0-9._-]{5,30}$/.test(username)) {
      return response.badRequest({
        message: {
          errors: [
            {
              message: "Invalid username it must be into lowercase",
            },
          ],
        },
      });
    }

    Logger.info(
      `Payload validado - username: ${username} - email: ${email} - requestId: ${requestId}`
    );

    // 2. Hashear contraseña
    Logger.trace(
      `Hasheando contraseña - username: ${username} - requestId: ${requestId}`
    );
    const hashedPassword = await Hash.make(password);
    Logger.trace(
      `Contraseña hasheada (longitud: ${hashedPassword.length}) - username: ${username} - requestId: ${requestId}`
    );

    // 3. Preparar datos de inserción
    const insertParams = {
      username,
      name,
      last_name,
      email,
      // document,
      // type_document,
      password: hashedPassword,
      created_at: DateTime.local().toISO(),
      updated_at: DateTime.local().toISO(),
    };
    Logger.trace(
      `Parámetros de inserción preparados (sin contraseña en texto claro) - username: ${username} - requestId: ${requestId}`
    );

    // 4. Insertar en base de datos
    Logger.info(
      `Insertando nuevo usuario en DB - username: ${username} - requestId: ${requestId}`
    );
    await Database.connection("pg").table("users").insert(insertParams);
    Logger.info(
      `Usuario registrado correctamente - username: ${username} - requestId: ${requestId}`
    );

    // 5. Responder éxito
    params.notification.state = true;
    params.notification.type = "success";
    params.notification.message = "Usuario Registrado Correctamente";
    return response.json(params);
  } catch (e) {
    // Manejo de errores de validación
    if (e.messages?.errors) {
      Logger.warn(
        `Validación fallida en register - errores: ${JSON.stringify(
          e.messages.errors
        )} - requestId: ${requestId}`
      );
      return response.badRequest({ message: e.messages });
    }

    // Otros errores inesperados
    Logger.error(
      `Error inesperado en handler REGISTER - message: ${e.message} - stack: ${e.stack} - requestId: ${requestId}`
    );
    return response.badRequest(params);
  }
};
