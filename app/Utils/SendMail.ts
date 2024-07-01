import Mail from "@ioc:Adonis/Addons/Mail";

export const SendMail = async (email, htmlParam) => {
    try {
        await Mail.use('smtp').send((message) => {
            message.from('santiago.patiasoc@gmail.com').to(email);
            message.subject('Password Recovery').html(htmlParam);
        })
    } catch (error) {
        console.log(error);
        throw new Error('Envio mail fallido')
    }
}