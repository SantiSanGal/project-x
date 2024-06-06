import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import Database from '@ioc:Adonis/Lucid/Database';

export const list = async ({ response, auth }: HttpContextContract) => {
    try {
        const userId = auth.user?.id;

        if (userId === undefined) {
            return response.status(400).json({ message: 'User ID is not available' });
        }

        const data = await Database.connection('pg')
            .query()
            .select('username', 'name', 'last_name', 'email')
            .from('users')
            .where('id', '=', userId);

        return response.json(data);
    } catch (error) {
        return response.status(500).json({ message: 'Error en el servidor' })
    }
}