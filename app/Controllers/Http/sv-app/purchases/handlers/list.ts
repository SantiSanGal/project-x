import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';

export const list = async ({ request, response, auth }: HttpContextContract) => {
    let params = {
        data: {},
        notification: {
            state: false,
            type: 'error',
            message: 'Error en el Servidor'
        }
    }
    try {
        
        // params.data = data
        params.notification.state = true
        params.notification.type = 'success'
        params.notification.message = 'Listado Correctamente'
        return response.json(params)
    } catch (error) {
        return response.json(params)
    }
}