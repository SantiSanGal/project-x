import Mail from "@ioc:Adonis/Addons/Mail";

export const SendMail = async (email) => {
    try {
        await Mail.use('smtp').send((message) => {
            message.from('santiago.patiasoc@gmail.com').to(email);
            message.subject('Password Recovery').html('Desde Función');
        })
    } catch (error) {
        console.log(error);
        throw new Error('Envio mail fallido')
    }
}