import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
export const store = async ({ request, response, auth }: HttpContextContract) => {
    let params = {
        data: {},
        notification: {
            state: false,
            type: 'error',
            message: 'Error en el Servidor'
        }
    }

    try {
        console.log('xd desde store canvas');
        return response.json({ message: 'xd oiko\'i' })
    } catch (error) {
        return response.json(params)
    }
}