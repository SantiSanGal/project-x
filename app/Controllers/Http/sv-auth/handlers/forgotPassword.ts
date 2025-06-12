import forgotPasswordValidator from "App/Validators/sv-auth/forgotPasswordValidator";
import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Database from "@ioc:Adonis/Lucid/Database";
import { SendMail } from "App/Utils/SendMail";
import Hash from "@ioc:Adonis/Core/Hash";
import { DateTime } from "luxon";
import crypto from "crypto";
import Logger from "@ioc:Adonis/Core/Logger";

export const forgotPassword = async ({
  request,
  response,
}: HttpContextContract) => {
  // Generar un ID único para esta petición
  const requestId = crypto.randomBytes(8).toString("hex");
  Logger.info(
    `----- Inicio handler FORGOT PASSWORD - requestId: ${requestId} -----`
  );

  const trx = await Database.transaction();
  Logger.trace(`Transacción iniciada - requestId: ${requestId}`);

  const params: any = {
    notification: {
      state: true,
      type: "success",
      message:
        "If this email address exists, you will receive instructions to reset your password.",
    },
  };

  try {
    // 1. Validación del payload
    Logger.trace(`Validando payload - requestId: ${requestId}`);
    const { email } = await request.validate(forgotPasswordValidator);
    Logger.info(`Payload validado - email: ${email} - requestId: ${requestId}`);

    // 2. Generar contraseña temporal
    const temporaryPassword = generateTemporaryPassword();
    Logger.trace(
      `Contraseña temporal generada - temporaryPassword: ${temporaryPassword} - requestId: ${requestId}`
    );

    // 3. Buscar usuario por email
    Logger.trace(
      `Buscando usuario en DB - email: ${email} - requestId: ${requestId}`
    );
    const userRecord = await Database.connection("pg")
      .query()
      .select("id")
      .from("users")
      .where("email", email)
      .first();
    if (!userRecord) {
      Logger.warn(
        `Email no encontrado en usuarios - email: ${email} - requestId: ${requestId}`
      );
      // Aunque no exista, decidimos no revelar esta información al cliente
    } else {
      const userId = userRecord.id;
      Logger.info(
        `Usuario encontrado - userId: ${userId} - requestId: ${requestId}`
      );

      // 4. Preparar datos para inserción
      const hashedTemp = await Hash.make(temporaryPassword);
      const now = DateTime.local();
      const expiresAt = now.plus({ hours: 24 }).toISO();
      const temporary_password_insert_params = {
        user_id: userId,
        temporary_password: hashedTemp,
        created_at: now.toISO(),
        expires_at: expiresAt,
      };
      Logger.trace(
        `Params para contrasenhas_temporales - ${JSON.stringify(
          temporary_password_insert_params
        )} - requestId: ${requestId}`
      );

      // 5. Expirar contraseñas anteriores
      const expireOld = now.minus({ hours: 1 }).toISO();
      Logger.trace(
        `Expirando contraseñas antiguas - until: ${expireOld} - requestId: ${requestId}`
      );
      await trx
        .from("contrasenhas_temporales")
        .where("user_id", userId)
        .update({ expires_at: expireOld });
      Logger.info(
        `Contrasenhas antiguas expiradas - userId: ${userId} - requestId: ${requestId}`
      );

      // 6. Insertar nueva contraseña temporal
      await trx
        .table("contrasenhas_temporales")
        .insert(temporary_password_insert_params);
      Logger.info(
        `Contrasenha temporal insertada - userId: ${userId} - requestId: ${requestId}`
      );

      // 7. Commit de la transacción
      await trx.commit();
      Logger.info(`Transacción commit - requestId: ${requestId}`);

      // 8. Preparar y enviar correo
      Logger.trace(`Generando HTML de correo - requestId: ${requestId}`);
      const htmlParam = await resetPasswordMail(temporaryPassword);
      Logger.info(
        `Enviando correo de reset - email: ${email} - requestId: ${requestId}`
      );
      await SendMail(email, htmlParam);
      Logger.info(
        `Correo enviado satisfactoriamente - email: ${email} - requestId: ${requestId}`
      );
    }

    // 9. Responder siempre con success genérico
    return response.ok(params);
  } catch (error) {
    // Rollback y log de error
    Logger.error(
      `Error inesperado en handler FORGOT PASSWORD - requestId: ${requestId} - message: ${error.message}`
    );
    await trx.rollback();
    return response.ok(params);
  }
};

const generateTemporaryPassword = (): string => {
  return crypto.randomBytes(4).toString("hex"); // 8 caracteres hexadecimales
};

const resetPasswordMail = async (temporaryPassword: string) => {
  let html = "";
  html += `<!DOCTYPE html>`;
  html += `<html lang="en">`;
  html += `<head>`;
  html += `    <meta charset="UTF-8">`;
  html += `    <meta name="viewport" content="width=device-width, initial-scale=1.0">`;
  html += `    <title>Reset Password</title>`;
  html += `    <style>`;
  html += `        body {`;
  html += `            background-color: #181818;`;
  html += `            color: aliceblue;`;
  html += `            font-family: Arial, sans-serif;`;
  html += `            padding: 20px;`;
  html += `        }`;
  html += `        .container {`;
  html += `            max-width: 600px;`;
  html += `            margin: auto;`;
  html += `            padding: 20px;`;
  html += `            background-color: #1f1f1f;`;
  html += `            border-radius: 8px;`;
  html += `        }`;
  html += `        .header {`;
  html += `            text-align: center;`;
  html += `            margin-bottom: 20px;`;
  html += `        }`;
  html += `        .header h1 {`;
  html += `            margin: 0;`;
  html += `            font-size: 24px;`;
  html += `            color: aliceblue;`;
  html += `        }`;
  html += `        .content {`;
  html += `            line-height: 1.6;`;
  html += `            color: aliceblue !important;`;
  html += `        }`;
  html += `        .content p {`;
  html += `            color: aliceblue!important;`;
  html += `        }`;
  html += `        .button {`;
  html += `            display: block;`;
  html += `            width: 100%;`;
  html += `            max-width: 200px;`;
  html += `            margin: 20px auto;`;
  html += `            padding: 10px;`;
  html += `            text-align: center;`;
  html += `            text-decoration: none;`;
  html += `            background-color: #50623a;`;
  html += `            color: aliceblue !important;`;
  html += `            border-radius: 5px;`;
  html += `            font-size: 18px;`;
  html += `            text-decoration:none !important;`;
  html += `        }`;
  html += `        .footer {`;
  html += `            text-align: center;`;
  html += `            margin-top: 20px;`;
  html += `            font-size: 12px;`;
  html += `            color: #a9a9a9;`;
  html += `        }`;
  html += `    </style>`;
  html += `</head>`;
  html += `<body>`;
  html += `    <div class="container">`;
  html += `        <div class="header">`;
  html += `            <h1>Reset Password</h1>`;
  html += `        </div>`;
  html += `        <div class="content">`;
  html += `            <p>Hello,</p>`;
  html += `            <p>You have requested to reset your password. Your temporary password is:</p>`;
  html += `            <h1>${temporaryPassword}</h1>`;
  html += `            <p>Please use this password to log in and reset your password immediately. This temporary password will be available for 24 hours.</p>`;
  html += `            <p>If you did not request this change, you can ignore this email.</p>`;
  html += `            <p>Thank you,</p>`;
  html += `            <p>The Pixel War Team</p>`;
  html += `        </div>`;
  html += `    </div>`;
  html += `</body>`;
  html += `</html>`;
  return html;
};
