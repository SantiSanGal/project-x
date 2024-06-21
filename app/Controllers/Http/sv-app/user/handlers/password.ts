import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import Database from '@ioc:Adonis/Lucid/Database';
import Hash from '@ioc:Adonis/Core/Hash';
import { DateTime } from 'luxon';

export const password = async ({ request, response, auth }: HttpContextContract) => {
    const trx = await Database.transaction()
    
    try {
        const username = auth.user?.username
        const userId = auth.user?.id

        if (username === undefined) {
            await trx.rollback();
            return response.status(400).json({ message: 'Username is not available' });
        }

        if (userId === undefined) {
            await trx.rollback();
            return response.status(400).json({ message: 'User ID is not available' });
        }

        const { newPassword, oldPassword } = await request.all()

        if (!newPassword || !oldPassword || newPassword == '' || oldPassword == '') {
            await trx.rollback();
            return response.badRequest({ message: 'Contraseñas Requerida' })
        }

        const { password } = await auth.use('api').verifyCredentials(username, oldPassword)

        if (!password) {
            await trx.rollback()
            return response.badRequest('Contraseña Incorrecta')
        }

        const samePassword = await Hash.verify(password, newPassword)

        if (samePassword) {
            await trx.rollback()
            return response.badRequest('La contraseña no puede ser igual a la anterior')
        }

        const hashPassword = await Hash.make(newPassword)

        await trx.from('users')
            .where('id', userId)
            .update({ updated_at: DateTime.local().toISO(), password: hashPassword })

        await trx.commit()
        return response.ok({ message: 'Contraseña Actualizada' })
    } catch (error) {
        console.log(error);
        await trx.rollback()
        if (error.message === 'E_INVALID_AUTH_PASSWORD: Password mis-match') {
            return response.unauthorized({ message: 'La contraseña no coincide' });
        }
        return response.status(500).json({ message: 'Error en el servidor' })
    }
}