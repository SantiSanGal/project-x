import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import Database from '@ioc:Adonis/Lucid/Database';

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

        const [data] = await Database.connection('pg')
            .query()
            .select('username', 'name', 'last_name', 'email')
            .from('users')
            .where('id', '=', userId);

        params.data = data
        params.notification.state = true
        params.notification.type = 'success'
        params.notification.message = 'Listado Correctamente'
        return response.json(params)
    } catch (error) {
        return response.status(500).json(params)
    }
}