import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Database from "@ioc:Adonis/Lucid/Database";
import { DateTime } from "luxon";

export const logout = async ({ response, auth }: HttpContextContract) => {
  const trx = await Database.transaction();
  try {
    // Asegura el usuario (si no hay sesión, lanza)
    const user = auth.user ?? (await auth.authenticate());

    await trx
      .from("api_tokens")
      .where("user_id", user.id) // ya no es number | undefined
      .update({ expires_at: DateTime.now().toSQL() });

    await trx.commit();
    return response.ok({ message: "Logout" });
  } catch (e) {
    await trx.rollback();
    console.error(e);
    return response.unauthorized({ message: "Not authenticated" });
  }
};
