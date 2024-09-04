import GenerarPedidoValidator from 'App/Validators/sv-app/pagopar/generarPedidoValidator';
import { validar } from 'App/Utils/ValidacionUnicoRegistroProcesoCompra';
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database';
import Env from '@ioc:Adonis/Core/Env'
import { DateTime } from 'luxon';
import crypto from 'crypto'
// import axios from 'axios';

export const generarPedido = async ({ request, response, auth }: HttpContextContract) => {
    let params = {
        notification: {
            state: false,
            type: 'error',
            message: 'Error en el Servidor'
        }
    }

    const trx = await Database.transaction();

    try {

        /*
            1ro - Insertar en grupo pixeles los datos, CON ESTADO PROCESO COMPRA
            2do - Insertar en pinxeles individuales los colores
            3ro - Generar pedido pagopar
            4to - responder con url para redirigir al chekout
        */

        const { coordenada_x_inicio, coordenada_y_inicio, coordenada_x_fin, coordenada_y_fin } = await request.validate(GenerarPedidoValidator);
        const existeRegistro = await validar(coordenada_x_inicio, coordenada_y_inicio, coordenada_x_fin, coordenada_y_fin);

        const userId = auth.user?.id

        if (userId === undefined) {
            await trx.rollback();
            return response.status(400).json({ message: 'User ID is not available' });
        }

        if (existeRegistro) {
            await trx.rollback();
            return response.status(409).json({ message: 'Ya existe un registro con esas coordenadas en proceso de compra' })
        }

        const insert_rangos_proceso_compra = {
            coordenada_x_inicio,
            coordenada_y_inicio,
            coordenada_x_fin,
            coordenada_y_fin,
            created_at: DateTime.local().toISO(),
            expires_at: DateTime.local().plus({ minutes: 5 }).toISO(),
        }

        const [{ id: rango_proceso_compra_id }] = await trx.table('rangos_proceso_compra').insert(insert_rangos_proceso_compra).returning('id');

        // TODO: en caso de que se cancele, borrar o expirar
        console.log('rango_proceso_compra_id', rango_proceso_compra_id);

        const insert_datos_pedido: any = {
            id_usuario: userId,
            monto: 1000.00, //por el momento, siempre será 25
            created_at: DateTime.local().toISO(),
            updated_at: DateTime.local().toISO(),
            pagado: false,
            rango_proceso_compra_id: rango_proceso_compra_id
        };

        const [{ id_pedido }] = await trx.table('pedidos').insert(insert_datos_pedido).returning('id_pedido');

        const datos = {
            comercio_token_privado: Env.get('PAGOPAR_TOKEN_PRIVADO')
        };

        console.log('datos', datos);

        const cadenaParaHash = datos.comercio_token_privado + id_pedido + parseFloat(insert_datos_pedido.monto);
        console.log('cadenaParaHash', cadenaParaHash);
        const hash = crypto.createHash('sha1').update(cadenaParaHash.toString()).digest('hex');


        //TODO: hacer el post a pagopar y actualizar la tabla de pedido con el token que viene de respuesta en data
        // const res = await axios.post('https://api.pagopar.com/api/comercios/2.0/iniciar-transaccion')

        console.log('hash', hash);
        await trx.commit();
        return response.json({ id_pedido, hash: hash, rango_proceso_compra_id })
    } catch (e) {
        console.log(e);
        await trx.rollback();
        return response.status(500).json(params)
    }
}
