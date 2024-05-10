import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

const logout = async ({ request, response, auth }: HttpContextContract) => {
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
        await auth.use('api').revoke()
        return response.json({message: "logout"})
    } catch (e) {
        console.error(e)
        renderParams.notification.message = e.message
        return response.json(renderParams)
    }
}

export { logout }
