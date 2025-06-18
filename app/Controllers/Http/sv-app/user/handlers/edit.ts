import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Database from "@ioc:Adonis/Lucid/Database";
import userEditValidator from "App/Validators/sv-app/user/userEditValidator";

export const update = async ({
  request,
  response,
  auth,
}: HttpContextContract) => {
  const trx = await Database.transaction();

  let params = {
    notification: {
      state: false,
      type: "error",
      message: "Error en el Servidor",
    },
  };

  try {
    const userId = auth.user?.id;
    if (userId === undefined) {
      await trx.rollback();
      return response.status(400).json({ message: "User ID is not available" });
    }

    const {
      username,
      name,
      last_name,
      email,
      //  country,
      //  city
    } = await request.validate(userEditValidator);

    let update_user_params = {
      username,
      name,
      last_name,
      email,
    };

    await trx.from("users").where("id", userId).update(update_user_params);
    await trx.commit();
    params.notification.state = true;
    params.notification.type = "success";
    params.notification.message = "Actualizado Correctamente";
    return response.json(params);
  } catch (e) {
    await trx.rollback();
    console.log("e", e);
    if (e.message == "E_VALIDATION_FAILURE: Validation Exception") {
      return response.unauthorized({ message: e.messages });
    }
    return response.status(500).json(params);
  }
};
