// app/Controllers/Http/sv-auth/handlers/googleAuth.ts
import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import { OAuth2Client } from "google-auth-library";
import Database from "@ioc:Adonis/Lucid/Database";
import Logger from "@ioc:Adonis/Core/Logger";
import { DateTime } from "luxon";

/** Username sólo minúsculas, números, . _ - (y recorta a 30 chars) */
function sanitizeBaseUsername(input: string) {
  const base = (input || "").toLowerCase().replace(/[^a-z0-9._-]/g, "");
  const trimmed = base.slice(0, 30);
  return trimmed || "user";
}

async function makeUniqueUsername(base: string) {
  let candidate = base;
  let suffix = 0;

  // intenta base, base1, base2, ...
  // usa COUNT(*) para evitar traer filas
  // (en Postgres el COUNT devuelve string, conviene parseInt)
  while (true) {
    const { count } = await Database.from("users")
      .where("username", candidate)
      .count("* as count")
      .first();
    const exists = parseInt((count as unknown as string) || "0", 10) > 0;
    if (!exists) return candidate;
    suffix += 1;
    candidate = (base.slice(0, 28) + String(suffix)).slice(0, 30);
  }
}

export const googleAuth = async ({
  request,
  response,
}: HttpContextContract) => {
  console.log("xd");
  const requestId = Math.random().toString(36).slice(2);
  Logger.info(`[googleAuth] start ${requestId}`);

  try {
    const { credential } = request.only(["credential"]);
    if (!credential) {
      return response.badRequest({ message: "Missing Google credential" });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID as string;
    const client = new OAuth2Client(clientId);

    // Verificar el ID Token de Google
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });
    const payload = ticket.getPayload();
    if (!payload)
      return response.unauthorized({ message: "Invalid Google token" });

    const email = payload.email;
    const emailVerified = payload.email_verified;
    const providerUserId = payload.sub;
    const givenName = payload.given_name || "";
    const familyName = payload.family_name || "";
    const fullName = payload.name || `${givenName} ${familyName}`.trim();

    if (!email || !emailVerified) {
      return response.unauthorized({
        message: "Google account email not verified",
      });
    }

    // Buscar usuario por email (si ya existe, lo vinculamos)
    const existing = await Database.from("users").where("email", email).first();

    let userId: number;

    if (existing) {
      // Si existe, sólo actualizamos provider (id + name) y updated_at
      await Database.from("users").where("id", existing.id).update({
        oauth_provider_id: providerUserId,
        oauth_provider_name: "google",
        updated_at: DateTime.local().toISO(),
      });
      userId = existing.id;
    } else {
      // Crear username a partir del email (parte antes de @) o del nombre
      const emailLocal = email.split("@")[0];
      const baseUsername = sanitizeBaseUsername(
        emailLocal || fullName || "user"
      );
      const username = await makeUniqueUsername(baseUsername);

      const now = DateTime.local().toISO();
      const inserting = {
        username,
        name: givenName || fullName || "User",
        last_name: familyName || "",
        email,
        password: null, // social login: sin password
        remember_me_token: null,
        created_at: now,
        updated_at: now,
        document: null,
        type_document: null,
        accepted_terms_and_conditions: true, // o false si quieres forzar aceptar luego
        oauth_provider_id: providerUserId,
        oauth_provider_name: "google",
      };

      const inserted = await Database.table("users")
        .insert(inserting)
        .returning("id");
      // en PG con Adonis v5, returning puede devolver array o valor; maneja ambos
      userId = Array.isArray(inserted)
        ? (inserted[0] as any).id
        : (inserted as any);
    }

    // Si quieres además iniciar sesión con Adonis Auth (opcional y sólo si usas modelo User):
    // try {
    //   const User = (await import('App/Models/User')).default
    //   const user = await User.findOrFail(userId)
    //   const apiToken = await (auth.use('api') as any).generate(user) // si usas guard api
    //   return response.ok({ message: 'Google auth OK', userId, token: apiToken })
    // } catch {} // si no usas modelo, sigue abajo

    return response.ok({
      notification: { state: true, type: "success", message: "Google auth OK" },
      data: { userId },
    });
  } catch (err) {
    Logger.error(`[googleAuth] error ${err?.message}`);
    return response.internalServerError({ message: "Google auth failed" });
  }
};
