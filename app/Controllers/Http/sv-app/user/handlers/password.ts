
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import Database from '@ioc:Adonis/Lucid/Database';
import { verify } from '../../../sv-auth/handlers/verify';
import Hash from '@ioc:Adonis/Core/Hash';
import { DateTime } from 'luxon';

export const password = async ({ request, response, auth }: HttpContextContract) => {
    const trx = await Database.transaction()
    try {
        console.log('request', request);
        console.log('auth', auth);

        const { newPassword, oldPassword } = await request.all()
        if (newPassword && !oldPassword) {
            return response.badRequest({ message: 'Contraseña Requerida' })
        }

        if (newPassword && oldPassword) {
            const { password } = await auth.use('api').verifyCredentials(auth.user?.username, oldPassword)
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
                .where('id', auth.user?.id)
                .update({ update_at: DateTime.local().toISO(), password: hashPassword })
        }

        await trx.commit()
        return response.ok({ message: 'Contraseña Actualizada' })
    } catch (error) {
        await trx.rollback()
        return response.status(500).json({ message: 'Error en el servidor' })
    }
}