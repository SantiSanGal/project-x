import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import Database from '@ioc:Adonis/Lucid/Database';

export const list = async ({ response, auth }: HttpContextContract) => {
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
                'gp.id_grupo_pixeles',
                'gp.link_adjunta',
                Database.raw("to_char(dc.fecha, 'YYYY-MM-DD') as fecha"),
                'dc.monto'
            )
            .from('grupos_pixeles as gp')
            .join('datos_compras as dc', 'dc.id_datos_compra', 'gp.id_datos_compra')
            .where('dc.id_usuario', `${auth.user?.id}`);

        const grupoPixelesIds = data.map(item => item.id_grupo_pixeles);
        const pixeles = await Database.connection('pg')
            .query()
            .select(
                'id_pixel_individual',
                'coordenada_x',
                'coordenada_y',
                'color',
                'id_grupo_pixeles',
                'pintado'
            )
            .from('pixeles_individuales')
            .whereIn('id_grupo_pixeles', grupoPixelesIds);

        const pixelesMap = {};
        pixeles.forEach(pixel => {
            if (!pixelesMap[pixel.id_grupo_pixeles]) {
                pixelesMap[pixel.id_grupo_pixeles] = [];
            }
            pixelesMap[pixel.id_grupo_pixeles].push(pixel);
        });

        const result = data.map(item => ({
            ...item,
            pixeles_individuales: pixelesMap[item.id_grupo_pixeles] || []
        }));

        params.data = result;
        params.notification.state = true;
        params.notification.type = 'success';
        params.notification.message = 'Listado Correctamente';
        return response.json(params);
    } catch (error) {
        console.log('error', error);
        return response.status(500).json(params);
    }
}