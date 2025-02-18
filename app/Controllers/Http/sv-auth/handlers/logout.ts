import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database';
import { DateTime } from 'luxon';

//TODO: reparar esto
export const logout = async ({ request, response, auth }: HttpContextContract) => {
    const trx = await Database.transaction()
    const params: any = {
        notification: {
            state: false,
            type: 'error',
            message: 'Error en servidor',
        },
    }
    try {
        await trx.from('api_tokens').where('user_id', auth.user?.id).update({ expires_at: DateTime.local().toISO() })
        await trx.commit()
        return response.ok({ message: 'Logout' });
    } catch (e) {
        await trx.rollback();
        console.error(e)
        params.notification.message = e.message
        return response.json(params)
    }
}