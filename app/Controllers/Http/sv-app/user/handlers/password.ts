import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';

export const password = async ({ request, response, auth }: HttpContextContract) => {
    try {
        console.log('request', request);
        console.log('auth', auth);
        return response.json({ message: 'password' })
    } catch (error) {
        return response.status(500).json({ message: 'password' })
    }
}