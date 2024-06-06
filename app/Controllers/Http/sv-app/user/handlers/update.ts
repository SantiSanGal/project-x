import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';

export const update = async ({ request, response, auth }: HttpContextContract) => {
    try {
        console.log('request', request);
        console.log('auth', auth);
        return response.json({ message: 'update' })
    } catch (error) {
        return response.status(500).json({ message: 'Error en el servidor' })
    }
}