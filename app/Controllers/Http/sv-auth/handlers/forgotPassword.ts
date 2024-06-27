import Mail from '@ioc:Adonis/Addons/Mail';
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import forgotPasswordValidator from 'App/Validators/sv-auth/forgotPasswordValidator';

export const forgotPassword = async ({ request, response }: HttpContextContract) => {
    const renderParams: any = {
        data: {},
        notification: {
            state: false,
            type: 'error',
            message: 'Error en servidor',
        },
    }

    try {
        //TODO: hacer que envíe un mail que redireccione a una página para recuperar la contraseña 
        const { email } = await request.validate(forgotPasswordValidator)
        await Mail.use('smtp').send((message) => {
            message.from('santiago.patiasoc@gmail.com').to(email);
            message.subject('test subject').html('test html');
        })
        return response.ok({ message: 'forgot Password' })
    } catch (e) {
        console.log(e);
        return response.json(renderParams)
    }
}