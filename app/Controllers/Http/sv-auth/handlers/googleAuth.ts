import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import User from 'App/Models/User'
import { validator, schema } from '@ioc:Adonis/Core/Validator'

export const googleAuth = async ({ request, response, auth, ally }: HttpContextContract) => {
    console.log('handleGoogleAuth');

    /**
     * Valida que el frontend envíe el 'credential'
     */
    const payload = await request.validate({
        schema: schema.create({
            credentialResponse: schema.object().members({
                credential: schema.string([validator.required()]),
            }),
        }),
    })

    const google = ally.use('google')

    /**
     * Verifica que el token de Google sea válido
     */
    const googleUser = await google.userFromToken(payload.credentialResponse.credential)

    if (!googleUser) {
        return response.unauthorized({ message: 'Invalid Google token' })
    }

    try {
        /**
         * Busca un usuario con el email de Google o crea uno nuevo.
         * `updateOrCreate` es perfecto para esto:
         * 1. Busca un usuario que coincida con { email: googleUser.email }.
         * 2. Si lo encuentra, actualiza sus datos (nombre, avatar, etc.).
         * 3. Si no lo encuentra, crea un nuevo usuario con todos los datos.
         */
        const user = await User.updateOrCreate(
            {
                email: googleUser.email,
            },
            {
                name: googleUser.name,
                lastName: googleUser.original.family_name || ' ',
                oauthProviderId: googleUser.id,
                oauthProviderName: 'google',
                username: googleUser.email, // O puedes generar un username único
                // La contraseña será null para este usuario
            }
        )

        /**
         * Genera un token de API para el usuario.
         * Esto usa tu guard 'api' configurado en config/auth.ts
         */
        const oat = await auth.use('api').generate(user, {
            expiresIn: '7days',
            name: 'google-login-token',
        })

        return response.ok({
            token: oat.token,
            user: user.serialize(), // Envía los datos del usuario al frontend
        })
    } catch (error) {
        console.log('error', error);
        console.error('Error durante la autenticación de Google:', error)
        return response.internalServerError({
            message: 'An error occurred during Google authentication.',
            error: error.message,
        })
    }
}