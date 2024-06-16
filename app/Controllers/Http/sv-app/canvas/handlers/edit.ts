import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';

//para editar los colores del canvas que ya son del usuario
export const edit = async ({ request, response, auth }: HttpContextContract) => {
    try {
        const idGrupoPixeles = request.param('idGrupoPixeles')
        console.log('idGrupoPixeles', idGrupoPixeles);

        return response.json({ message: 'ok' })
    } catch (e) {
        console.log('e', e);
        return response.status(500).json({ message: 'error' })
    }
}