import forgotPasswordValidator from 'App/Validators/sv-auth/forgotPasswordValidator';
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import Database from '@ioc:Adonis/Lucid/Database';
import { SendMail } from 'App/Utils/SendMail';
import Hash from '@ioc:Adonis/Core/Hash';
import { DateTime } from 'luxon';
import crypto from 'crypto';

export const forgotPassword = async ({ request, response }: HttpContextContract) => {
    const trx = await Database.transaction();

    const params: any = {
        notification: {
            state: true,
            type: 'success',
            message: 'If this email address exists, you will receive instructions to reset your password.',
        },
    }

    try {
        const { email } = await request.validate(forgotPasswordValidator)
        const temporaryPassword = generateTemporaryPassword();
        const [{ id }] = await Database.connection('pg')
            .query()
            .select('id')
            .from('users')
            .where('email', email)

        let temporary_password_insert_params = {
            user_id: id,
            temporary_password: await Hash.make(temporaryPassword),
            created_at: DateTime.local().toISO(),
            expires_at: DateTime.local().plus({ hours: 24 }).toISO()
        };

        await trx.from('contrasenhas_temporales').where('user_id', id).update({ expires_at: DateTime.local().minus({ hours: 1 }).toISO() })
        await trx.table('contrasenhas_temporales').insert(temporary_password_insert_params)
        await trx.commit();

        const htmlParam = await resetPasswordMail(temporaryPassword)
        await SendMail(email, htmlParam)

        return response.ok(params)
    } catch (e) {
        await trx.rollback();
        console.log(e);
        return response.ok(params)
    }
}

const generateTemporaryPassword = (): string => {
    return crypto.randomBytes(4).toString('hex'); // Genera 8 caracteres hexadecimales
}

const resetPasswordMail = async (temporaryPassword: string) => {
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
    html += `            color: aliceblue !important;`
    html += `        }`
    html += `        .content p {`
    html += `            color: aliceblue!important;`
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
    html += `            <p>You have requested to reset your password. Your temporary password is:</p>`
    html += `             <h1>${temporaryPassword}</h1>`
    html += `            <p>Please use this password to log in and reset your password immediately. This temporary password will be available for 24 hours.</p>`
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