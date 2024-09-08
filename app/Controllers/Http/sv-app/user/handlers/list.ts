import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import { getUserData } from 'App/Utils/getUserData';

export const list = async ({ response, auth }: HttpContextContract) => {
    let params = {
        data: {},
        notification: {
            state: false,
            type: 'error',
            message: 'Error en el Servidor'
        }
    }

    try {
        const userId = auth.user?.id;

        if (userId === undefined) {
            return response.status(400).json({ message: 'User ID is not available' });
        }

        const userData = getUserData(userId);

        params.data = userData;
        params.notification.state = true
        params.notification.type = 'success'
        params.notification.message = 'Listado Correctamente'
        return response.json(params)
    } catch (error) {
        return response.status(500).json(params)
    }
}