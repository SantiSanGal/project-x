import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

const verify = async ({ request, response, auth }: HttpContextContract) => {
    const renderParams: any = {
        data: {},
        notification: {
            state: false,
            type: 'error',
            message: 'Error en servidor',
        },
    }
    try {
        const { username, password } = await request.all();        
        const token = await auth.attempt(username, password);
        return response.ok({ token: token })
    } catch (e) {
        console.error(e)
        renderParams.notification.message = e.message
        return response.json(renderParams)
    }
}

export { verify }