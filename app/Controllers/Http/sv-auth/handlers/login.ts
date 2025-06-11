import Logger from "@ioc:Adonis/Core/Logger";
import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import authValidator from "App/Validators/sv-auth/authValidator";
import Database from "@ioc:Adonis/Lucid/Database";
import Hash from "@ioc:Adonis/Core/Hash";

export const login = async ({
  request,
  response,
  auth,
}: HttpContextContract) => {
  const params: any = {
    data: {},
    notification: {
      state: false,
      type: "error",
      message: "Server Error",
    },
  };

  // 1. Antes de todo, registramos que alguien intenta loguearse
  const { username, password } = request.only(["username", "password"]);

  Logger.info(
    `----------------------- Intento de Inicio de Sesión ${username} ----------------------`
  );

  try {
    // 2. Validación de esquema
    const payload = await request.validate(authValidator);
    Logger.debug("Payload de login validado", { username });

    // 3. Intento de contraseña temporal
    const tempEntry = await Database.from("contrasenhas_temporales")
      .innerJoin("users", "users.id", "contrasenhas_temporales.user_id")
      .where("users.username", username)
      .andWhere("contrasenhas_temporales.expires_at", ">", new Date())
      .select("users.id", "contrasenhas_temporales.temporary_password")
      .first();

    if (tempEntry) {
      Logger.trace("Usuario con contraseña temporal detectado", {
        userId: tempEntry.id,
      });
      const isValidTemp = await Hash.verify(
        tempEntry.temporary_password,
        password
      );
      if (isValidTemp) {
        const user = await auth.use("api").loginViaId(tempEntry.id, {
          expiresIn: "1 days",
        });
        Logger.info("Login exitoso con contraseña temporal", {
          userId: tempEntry.id,
        });

        params.data.token = user.token;
        params.notification = {
          state: true,
          type: "success",
          message: "Inicio de sesión correcto (temporal)",
        };
        return response.ok(params);
      } else {
        Logger.warn("Contraseña temporal inválida", { username });
        return response.unauthorized({
          messages: ["Usuario o contraseña incorrectos"],
        });
      }
    }

    // 4. Intento de autenticación normal
    try {
      const token = await auth.attempt(username, password, {
        expiresIn: "1 days",
      });
      Logger.info("Login exitoso", { username });

      params.data.token = token;
      params.notification = {
        state: true,
        type: "success",
        message: "Inicio de sesión correcto",
      };
      return response.ok(params);
    } catch (authError) {
      // Capturamos errores de auth.attempt
      Logger.warn("Fallo de autenticación", {
        username,
        error: authError.message,
      });
      return response.unauthorized({
        messages: ["Usuario o contraseña incorrectos"],
      });
    }
  } catch (e: any) {
    // 5. Errores de validación de payload
    if (e.messages?.errors) {
      const messages = e.messages.errors.map((err: any) => err.message);
      Logger.warn("Errores de validación en login", {
        username,
        errors: messages,
      });
      return response.unauthorized({ messages });
    }

    // 6. Errores inesperados
    Logger.error("Error inesperado en login", {
      username,
      stack: e.stack,
      message: e.message,
    });
    return response.internalServerError({ messages: ["Unexpected error"] });
  }
};
