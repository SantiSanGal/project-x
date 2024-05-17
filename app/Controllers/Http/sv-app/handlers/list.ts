import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

export const list = async ({ request, response, auth }: HttpContextContract) => {
    const renderParams: any = {
        data: {},
        notification: {
            state: false,
            type: 'error',
            message: 'Error en servidor',
        },
    }
    try {
        return response.json({ message: "list" })
    } catch (e) {
        console.error(e)
        renderParams.notification.message = e.message
        return response.json(renderParams)
    }
}