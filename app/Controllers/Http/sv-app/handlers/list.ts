import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

const list = async ({ request, response, auth }: HttpContextContract) => {
    // render generico
    const renderParams: any = {
        data: {},
        notification: {
            state: false,
            type: 'error',
            message: 'Error en servidor',
        },
    }
    try {
        console.log('xd');
        
        return response.json({message: "list"})
    } catch (e) {
        console.error(e)
        renderParams.notification.message = e.message
        return response.json(renderParams)
    }
}

export { list }
