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
      message: "Error en servidor",
    },
  };

  try {
    const { username, password } = await request.validate(authValidator);

    // Buscar usuario en la tabla de contraseñas temporales
    const tempPasswordEntry = await Database.from("contrasenhas_temporales")
      .innerJoin("users", "users.id", "contrasenhas_temporales.user_id")
      .where("users.username", username)
      .andWhere("contrasenhas_temporales.expires_at", ">", new Date())
      .select("users.id", "contrasenhas_temporales.temporary_password")
      .first();

    if (
      tempPasswordEntry &&
      (await Hash.verify(tempPasswordEntry.temporary_password, password))
    ) {
      // Contraseña temporal válida
      const user = await auth.use("api").loginViaId(tempPasswordEntry.id, {
        expiresIn: "1 days",
      });

      params.data.token = user.token;
      params.notification.state = true;
      params.notification.type = "success";
      params.notification.message =
        "Inicio Sesión Correctamente con Contraseña Temporal";
      return response.ok(params);
    }

    // Si no hay una contraseña temporal válida, intentar autenticación normal
    const token = await auth.attempt(username, password, {
      expiresIn: "1 days",
    });

    params.data.token = token;
    params.notification.state = true;
    params.notification.type = "success";
    params.notification.message = "Inicio Sesión Correctamente";
    return response.ok(params);
  } catch (e) {
    if (e.messages && e.messages.errors) {
      // Extraer solo los mensajes de error en un array
      const messages = e.messages.errors.map((err: any) => err.message);
      return response.unauthorized({ messages });
    }

    if (
      e.message === "E_INVALID_AUTH_PASSWORD: Password mis-match" ||
      e.message === "E_INVALID_AUTH_UID: User not found"
    ) {
      return response.unauthorized({
        messages: ["Incorrect username or password"],
      });
    }

    return response.internalServerError({ messages: ["Unexpected error"] });
  }
};
