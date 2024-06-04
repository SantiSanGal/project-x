import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
export const verify = async ({ request, response, auth }: HttpContextContract) => {
    const token = request.header('Authorization');

    if (!token) {
        return response.status(401).json({ message: '/v1/auth/unauthorized' });
    }

    try {
        const authenticate = await auth.use('api').authenticate();
        response.json({ message: 'token valido' })
    } catch (error) {
        response.status(401).json({ message: 'token invalido' })
    }
}