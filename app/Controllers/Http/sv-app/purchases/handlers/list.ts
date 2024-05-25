import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import Database from '@ioc:Adonis/Lucid/Database';

export const list = async ({ request, response, auth }: HttpContextContract) => {
    let params = {
        data: {},
        notification: {
            state: false,
            type: 'error',
            message: 'Error en el Servidor'
        }
    }
    try {

        const data = await Database.connection('pg')
            .query()
            .select(
                'dc.id_datos_compra',
                'gp.link_adjunta',
                Database.raw("to_char(dc.fecha, 'YYYY-MM-DD') as fecha"),
                'dc.monto'
            )
            .from('grupos_pixeles as gp')
            .join('datos_compras as dc', 'dc.id_datos_compra', 'gp.id_datos_compra')
            .where('dc.id_usuario', `${auth.user?.id}`)

        params.data = data
        params.notification.state = true
        params.notification.type = 'success'
        params.notification.message = 'Listado Correctamente'
        return response.json(params)
    } catch (error) {
        console.log('error', error);
        return response.status(500).json(params)
    }
}