import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import authValidator from 'App/Validators/sv-auth/authValidator';

export const login = async ({ request, response, auth }: HttpContextContract) => {
    const renderParams: any = {
        data: {},
        notification: {
            state: false,
            type: 'error',
            message: 'Error en servidor',
        },
    }
    try {
        const { username, password } = await request.validate(authValidator);
        const token = await auth.attempt(username, password, {
            expiresIn: '1 days'
        });
        return response.ok({ token: token })
    } catch (e) {
        if (e.message == 'E_VALIDATION_FAILURE: Validation Exception') {
            return response.unauthorized({ message: e.messages });
        }

        if (e.message === 'E_INVALID_AUTH_PASSWORD: Password mis-match') {
            return response.unauthorized({ message: 'Contraseña Incorrecta' });
        }

        if (e.message === 'E_INVALID_AUTH_UID: User not found') {
            return response.unauthorized({ message: 'Usuario no existe' });
        }

        renderParams.notification.message = e.message
        return response.json(renderParams)
    }
}