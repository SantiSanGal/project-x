import Database from '@ioc:Adonis/Lucid/Database'
// import { DateTime } from 'luxon';

export const validar = async (coordenada_x_inicio: any, coordenada_y_inicio: any, coordenada_x_fin: any, coordenada_y_fin: any) => {
    // const now = DateTime.now().toSQL();
    
    // const existsInRangoProcesoCompra = await Database.connection('pg').query()
    //     .from('rangos_proceso_compra')
    //     .where('coordenada_x_inicio', coordenada_x_inicio)
    //     .andWhere('coordenada_y_inicio', coordenada_y_inicio)
    //     .andWhere('coordenada_x_fin', coordenada_x_fin)
    //     .andWhere('coordenada_y_fin', coordenada_y_fin)
    //     .andWhere('expires_at', '>', now)
    //     .first()

    const existsInGruposPixeles = await Database.connection('pg').query()
        .from('grupos_pixeles')
        .where('coordenada_x_inicio', coordenada_x_inicio)
        .andWhere('coordenada_y_inicio', coordenada_y_inicio)
        .andWhere('coordenada_x_fin', coordenada_x_fin)
        .andWhere('coordenada_y_fin', coordenada_y_fin)
        .first()

    if (existsInGruposPixeles) {
        console.log('validar: true - ya existe un registro');
        return true
    } else {
        console.log('validar: false - aún no existe un registro');
        return false
    }
}