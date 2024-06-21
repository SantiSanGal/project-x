import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import Database from '@ioc:Adonis/Lucid/Database';

export const update = async ({ request, response, auth }: HttpContextContract) => {
    const trx = await Database.transaction();

    let params = {
        notification: {
            state: false,
            type: 'error',
            message: 'Error en el Servidor'
        }
    }

    try {
        console.log('request', request);
        console.log('auth', auth);

        await trx.commit();
        params.notification.state = true
        params.notification.type = 'success'
        params.notification.message = 'Actualizado Correctamente'
        return response.json(params)
    } catch (e) {
        await trx.rollback();
        console.log('e', e);
        return response.status(500).json(params)
    }
}