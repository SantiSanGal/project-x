import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Database from "@ioc:Adonis/Lucid/Database";
import Logger from "@ioc:Adonis/Core/Logger";
import { DateTime } from "luxon";
import { OAuth2Client } from "google-auth-library";
import User from "App/Models/User";

function sanitizeBaseUsername(input: string) {
  const base = (input || "").toLowerCase().replace(/[^a-z0-9._-]/g, "");
  const trimmed = base.slice(0, 30);
  return trimmed || "user";
}

async function makeUniqueUsername(base: string) {
  let candidate = base;
  let suffix = 0;
  while (true) {
    const row = await Database.from("users")
      .where("username", candidate)
      .count("* as count")
      .first();
    const exists = parseInt(String(row?.count ?? "0"), 10) > 0;
    if (!exists) return candidate;
    suffix += 1;
    candidate = (base.slice(0, 28) + String(suffix)).slice(0, 30);
  }
}

export const googleAuth = async ({
  request,
  response,
  auth,
}: HttpContextContract) => {
  const requestId = Math.random().toString(36).slice(2);
  Logger.info(`[googleAuth] start ${requestId}`);

  try {
    // Aceptar credential de varias formas
    const body = request.body() || {};
    const credential =
      body.credential ??
      request.input("credential") ??
      body.id_token ??
      body.token ??
      null;

    if (!credential) {
      Logger.warn(
        `[googleAuth] missing credential. bodyKeys=${Object.keys(
          body
        )} reqId=${requestId}`
      );
      return response.badRequest({ message: "Missing Google credential" });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID as string;
    if (!clientId) {
      Logger.error(
        `[googleAuth] GOOGLE_CLIENT_ID missing in env reqId=${requestId}`
      );
      return response.internalServerError({ message: "Server misconfigured" });
    }

    const client = new OAuth2Client(clientId);
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken: credential,
        audience: clientId,
      });
    } catch (e: any) {
      Logger.warn(
        `[googleAuth] verifyIdToken failed: ${e?.message} reqId=${requestId}`
      );
      return response.unauthorized({ message: "Invalid Google token" });
    }

    const payload = ticket.getPayload();
    if (!payload) {
      return response.unauthorized({ message: "Invalid Google token payload" });
    }

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

    const existing = await Database.from("users").where("email", email).first();
    let userId: number;

    if (existing) {
      await Database.from("users").where("id", existing.id).update({
        oauth_provider_id: providerUserId,
        oauth_provider_name: "google",
        updated_at: DateTime.local().toISO(),
      });
      userId = existing.id;
    } else {
      const emailLocal = email.split("@")[0];
      const baseUsername = sanitizeBaseUsername(
        emailLocal || fullName || "user"
      );
      const username = await makeUniqueUsername(baseUsername);

      const now = DateTime.local().toISO();
      const inserted = await Database.table("users")
        .insert({
          username,
          name: givenName || fullName || "User",
          last_name: familyName || "",
          email,
          password: null,
          remember_me_token: null,
          created_at: now,
          updated_at: now,
          document: null,
          type_document: null,
          accepted_terms_and_conditions: true,
          oauth_provider_id: providerUserId,
          oauth_provider_name: "google",
        })
        .returning("id");

      userId = Array.isArray(inserted)
        ? (inserted[0] as any).id
        : (inserted as any);
    }

    const user = await User.findOrFail(userId);

    // Genera token OAT (opaque) del guard 'api'
    const apiToken = await auth.use("api").generate(user, {
      name: "google", // nombre opcional
      expiresIn: "30days", // puedes cambiarlo a '7days', '1year', etc.
    });

    return response.ok({
      notification: { state: true, type: "success", message: "Google auth OK" },
      data: {
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          last_name: user.lastName,
          email: user.email,
        },
        token: {
          type: apiToken.type, // 'bearer'
          token: apiToken.token, // <-- el valor que envías en Authorization
          expiresAt: apiToken.expiresAt,
        },
      },
    });
  } catch (err: any) {
    Logger.error(`[googleAuth] error ${err?.message}`);
    return response.internalServerError({ message: "Google auth failed" });
  }
};
