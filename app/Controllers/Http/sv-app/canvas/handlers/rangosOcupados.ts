import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import Database from '@ioc:Adonis/Lucid/Database';

export const rangosOcupados = async ({ request, response }: HttpContextContract) => {
    let params = {
        data: {},
        notification: {
            state: false,
            type: 'error',
            message: 'Error en el Servidor'
        }
    }

    const consultar = {
        1: {
            x: [0, 999],
            y: [0, 499]
        },
        2: {
            x: [1000, 1999],
            y: [0, 499]
        },
        3: {
            x: [0, 999],
            y: [500, 999]
        },
        4: {
            x: [1000, 1999],
            y: [500, 999]
        }
    }

    try {
        const idSector = request.param('idSector')

        //trae los ocupados y que no se hayan expirado
        const data = await Database.connection('pg')
            .query()
            .select('grupos_pixeles.*')
            .from('grupos_pixeles')
            .join('estados', 'grupos_pixeles.id_estado', '=', 'estados.estado_id')
            .where('coordenada_x_inicio', '>=', consultar[idSector].x[0])
            .andWhere('coordenada_x_fin', '<=', consultar[idSector].x[1])
            .andWhere('coordenada_y_inicio', '>=', consultar[idSector].y[0])
            .andWhere('coordenada_y_fin', '<=', consultar[idSector].y[1])
            .andWhere((query) => {
                query.whereIn('estados.nombre_estado', ['pintado', 'pagado'])
                    .orWhere((qb) => {
                        qb.where('estados.nombre_estado', 'en proceso compra')
                            .andWhere('grupos_pixeles.fecha_expiracion', '>', Database.raw('CURRENT_TIMESTAMP'));
                    });
            });


        params.data = data
        params.notification.state = true
        params.notification.type = 'success'
        params.notification.message = 'Listado Correctamente'
        return response.json(params)
    } catch (e) {
        console.log('e', e);
        return response.status(500).json(params)
    }
}