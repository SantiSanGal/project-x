import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import { SendMail } from 'App/Utils/SendMail';
import forgotPasswordValidator from 'App/Validators/sv-auth/forgotPasswordValidator';

export const forgotPassword = async ({ request, response }: HttpContextContract) => {
    const params: any = {
        notification: {
            state: false,
            type: 'error',
            message: 'Error en servidor',
        },
    }

    try {
        //TODO: hacer que envíe un mail que redireccione a una página para recuperar la contraseña 
        const { email } = await request.validate(forgotPasswordValidator)
        await SendMail(email)

        params.notification.state = true
        params.notification.type = 'success'
        params.notification.message = 'Mail Enviado Correctamente'
        return response.ok(params)
    } catch (e) {
        console.log(e);
        return response.json(params)
    }
}