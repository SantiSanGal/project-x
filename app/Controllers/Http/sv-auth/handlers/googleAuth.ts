import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import { OAuth2Client } from "google-auth-library";
import Logger from "@ioc:Adonis/Core/Logger";
import Env from "@ioc:Adonis/Core/Env";

export const googleAuth = async ({
    request,
    response
}: HttpContextContract) => {
    const { credentialResponse } = request.all();
    console.log('credentialResponse', credentialResponse);

    try {
        const CLIENT_ID = Env.get("GOOGLE_CLIENT_ID");
        const client = new OAuth2Client(CLIENT_ID);

        const ticket = await client.verifyIdToken({
            idToken: credentialResponse.credential,
            audience: CLIENT_ID
        })

        console.log('ticket', ticket);


        const payload = ticket.getPayload();

        console.log('payload', payload);

        return response.ok({ payload })
    } catch (e) {
        // 5. Errores de validación de payload
        if (e.messages?.errors) {
            const messages = e.messages.errors.map((err: any) => err.message);
            Logger.warn(`Errores de validación en login ${messages}`);
            return response.unauthorized({ messages });
        }

        // 6. Errores inesperados
        Logger.error(`Error inesperado en login ${JSON.stringify(e)}`);
        return response.internalServerError({ messages: ["Unexpected error"] });
    }
};
