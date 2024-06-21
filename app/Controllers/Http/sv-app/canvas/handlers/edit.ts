import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import Database from '@ioc:Adonis/Lucid/Database';
import { DateTime } from 'luxon';

//para editar los colores del canvas que ya son del usuario
export const edit = async ({ request, response, auth }: HttpContextContract) => {
    const trx = await Database.transaction();

    let params = {
        notification: {
            state: false,
            type: 'error',
            message: 'Error en el Servidor'
        }
    }

    try {
        const idGrupoPixeles = request.param('idGrupoPixeles')
        const { pixeles } = request.all()

        const userId = auth.user?.id
        if (userId === undefined) {
            await trx.rollback();
            return response.status(400).json({ message: 'User ID is not available' });
        }

        let grupo_pixeles_update_params = {
            updated_at: DateTime.local().toISO()
        }

        if (idGrupoPixeles) {
            await trx.from('grupos_pixeles').where('id_grupo_pixeles', idGrupoPixeles).update(grupo_pixeles_update_params)

            let pixeles_individuales_update_params = new Array()
            for (const pixel of pixeles) {
                pixeles_individuales_update_params.push({
                    coordenada_x: pixel.coordenada_x,
                    coordenada_y: pixel.coordenada_y,
                    color: pixel.color,

                })
            }
            await trx.from('pixeles_individuales').update(pixeles_individuales_update_params)
        }

        await trx.commit();
        params.notification.state = true
        params.notification.type = 'success'
        params.notification.message = 'Grupo Actualizado Correctamente'
        return response.json(params)
    } catch (e) {
        console.log('e', e);
        await trx.rollback();
        return response.status(500).json(params)
    }
}