import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'

//Get de los pixeles sin pintar
export const list = async ({ response }: HttpContextContract) => {
    let params = {
        data: {},
        notification: {
            state: false,
            type: 'error',
            message: 'Error en el Servidor'
        }
    }

    try {
        const data = await Database.connection('pg')
            .query()
            .from('pixeles_individuales')
            .where('pintado', '!=', true)
            .orWhereNull('pintado');

        params.data = data
        params.notification.state = true
        params.notification.type = 'success'
        params.notification.message = 'Listado Correctamente'
        return response.json(params)
    } catch (e) {
        console.error(e)
        params.notification.message = e.message
        return response.status(500).json(params)
    }
}