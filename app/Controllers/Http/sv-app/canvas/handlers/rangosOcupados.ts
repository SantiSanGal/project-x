import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import Database from '@ioc:Adonis/Lucid/Database';

export const rangosOcupados = async ({ request, response }: HttpContextContract) => {
    let params = {
        notification: {
            state: false,
            type: 'error',
            message: 'Error en el Servidor'
        }
    }

    try {
        const idSector = request.param('idSector')
        console.log('idSector', idSector);

        const sector1 = await Database.connection('pg')
            .query()
            .from('grupos_pixeles')
            .where('coordenada_x_inicio', '>=', 0).where('coordenada_x_fin', '<=', 999)
            .andWhere('coordenada_y_inicio', '>=', 0).where('coordenada_y_fin', '<=', 499);

        const sector2 = await Database.connection('pg')
            .query()
            .from('grupos_pixeles')
            .where('coordenada_x_inicio', '>=', 1000).where('coordenada_x_fin', '<=', 1999)
            .andWhere('coordenada_y_inicio', '>=', 0).where('coordenada_y_fin', '<=', 499);

        const sector3 = await Database.connection('pg')
            .query()
            .from('grupos_pixeles')
            .where('coordenada_x_inicio', '>=', 0).where('coordenada_x_fin', '<=', 999)
            .andWhere('coordenada_y_inicio', '>=', 500).where('coordenada_y_fin', '<=', 999);

        const sector4 = await Database.connection('pg')
            .query()
            .from('grupos_pixeles')
            .where('coordenada_x_inicio', '>=', 1000).where('coordenada_x_fin', '<=', 1999)
            .andWhere('coordenada_y_inicio', '>=', 500).where('coordenada_y_fin', '<=', 999);

        // console.log('Sector 1:', sector1);
        // console.log('Sector 2:', sector2);
        // console.log('Sector 3:', sector3);
        // console.log('Sector 4:', sector4);

        params.notification.state = true
        params.notification.type = 'success'
        params.notification.message = 'Listado Correctamente'
        return response.json(params)
    } catch (e) {
        console.log('e', e);
        return response.status(500).json(params)
    }
}