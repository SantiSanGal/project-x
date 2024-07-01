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
        const htmlParam = await resetPasswordMail()
        await SendMail(email, htmlParam)

        params.notification.state = true
        params.notification.type = 'success'
        params.notification.message = 'Mail Enviado Correctamente'
        return response.ok(params)
    } catch (e) {
        console.log(e);
        return response.json(params)
    }
}

const resetPasswordMail = async () => {
    let html = ''
    html += `<!DOCTYPE html>`
    html += `<html lang="en">`
    html += `<head>`
    html += `    <meta charset="UTF-8">`
    html += `    <meta name="viewport" content="width=device-width, initial-scale=1.0">`
    html += `    <title>Reset Password</title>`
    html += `    <style>`
    html += `        body {`
    html += `            background-color: #181818;`
    html += `            color: aliceblue;`
    html += `            font-family: Arial, sans-serif;`
    html += `            padding: 20px;`
    html += `        }`
    html += `        .container {`
    html += `            max-width: 600px;`
    html += `            margin: auto;`
    html += `            padding: 20px;`
    html += `            background-color: #1f1f1f;`
    html += `            border-radius: 8px;`
    html += `        }`
    html += `        .header {`
    html += `            text-align: center;`
    html += `            margin-bottom: 20px;`
    html += `        }`
    html += `        .header h1 {`
    html += `            margin: 0;`
    html += `            font-size: 24px;`
    html += `            color: aliceblue;`
    html += `        }`
    html += `        .content {`
    html += `            line-height: 1.6;`
    html += `            color: aliceblue;`
    html += `        }`
    html += `        .button {`
    html += `            display: block;`
    html += `            width: 100%;`
    html += `            max-width: 200px;`
    html += `            margin: 20px auto;`
    html += `            padding: 10px;`
    html += `            text-align: center;`
    html += `            text-decoration: none;`
    html += `            background-color: #50623a;`
    html += `            color: aliceblue !important;`
    html += `            border-radius: 5px;`
    html += `            font-size: 18px;`
    html += `            text-decoration:none !important;`
    html += `        }`
    html += `        .footer {`
    html += `            text-align: center;`
    html += `            margin-top: 20px;`
    html += `            font-size: 12px;`
    html += `            color: #a9a9a9;`
    html += `        }`
    html += `    </style>`
    html += `</head>`
    html += `<body>`
    html += `    <div class="container">`
    html += `        <div class="header">`
    html += `            <h1>Reset Password</h1>`
    html += `        </div>`
    html += `        <div class="content">`
    html += `            <p>Hello,</p>`
    html += `            <p>You have requested to reset your password. Please click the button below to proceed with the reset.</p>`
    html += `            <a href="http://localhost:5173/login" class="button">Reset Password</a>`
    html += `            <p>If you did not request this change, you can ignore this email.</p>`
    html += `            <p>Thank you,</p>`
    html += `            <p>The Pixel War Team</p>`
    html += `        </div>`
    html += `        <!-- <div class="footer"> -->`
    html += `            <!-- <p>&copy; [YEAR] Pixel War. All rights reserved.</p> -->`
    html += `        <!-- </div> -->`
    html += `    </div>`
    html += `</body>`
    html += `</html>`
    return html;
}