import resgisterValidator from "App/Validators/sv-auth/registerValidator";
import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Database from "@ioc:Adonis/Lucid/Database";
import Hash from "@ioc:Adonis/Core/Hash";
import { DateTime } from "luxon";

export const register = async ({ request, response }: HttpContextContract) => {
  const params: any = {
    notification: {
      state: false,
      type: "error",
      message: "Server Error",
    },
  };
  try {
    const { username, password, name, last_name, email, document, type_document } =
      await request.validate(resgisterValidator);

    let insertParams = {
      username,
      name,
      last_name,
      email,
      document,
      type_document,
      password: await Hash.make(password),
      created_at: DateTime.local().toISO(),
      updated_at: DateTime.local().toISO(),
    };

    await Database.connection("pg").table("users").insert(insertParams);

    params.notification.state = true;
    params.notification.type = "success";
    params.notification.message = "Usuario Registrado Correctamente";
    return response.json(params);
  } catch (e) {
    if (e.message == "E_VALIDATION_FAILURE: Validation Exception") {
      return response.badRequest({ message: e.messages });
    }
    return response.badRequest(params);
  }
};
