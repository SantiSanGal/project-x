import Hash from '@ioc:Adonis/Core/Hash';
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import { DateTime } from 'luxon';

const register = async ({ request, response, auth }: HttpContextContract) => {
    // render generico
    // const db = await Database.connection('pg')
    const renderParams: any = {
        data: {},
        notification: {
            state: false,
            type: 'error',
            message: 'Error en servidor',
        },
    }
    try {
        const { username, password } = await request.all()

        let insertParams = {
            username,
            name: 'Santiago',
            last_name: 'Galvan',
            email: 'santiagon.g.m@gmail.com',
            password: await Hash.make(password),
            created_at: DateTime.local().toISO(),
            updated_at: DateTime.local().toISO()
        }

        await Database.connection('pg')
            .table('users')
            .insert(insertParams)

        console.log('insertParams', insertParams);

        return response.json({ message: "holaa desde register" })
    } catch (e) {
        console.error(e)
        renderParams.notification.message = e.message
        return response.json(renderParams)
    }
}

export { register }
