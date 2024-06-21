import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database';
// import axios from 'axios';
import crypto from 'crypto'
import { DateTime } from 'luxon';

export const generarPedido = async ({ response, auth }: HttpContextContract) => {
    let params = {
        notification: {
            state: false,
            type: 'error',
            message: 'Error en el Servidor'
        }
    }

    const trx = await Database.transaction();

    try {
        const userId = auth.user?.id
        if (userId === undefined) {
            await trx.rollback();
            return response.status(400).json({ message: 'User ID is not available' });
        }

        const insert_datos_pedido = {
            id_usuario: userId,
            monto: 25.00, //por el momento, siempre será 25
            created_at: DateTime.local().toISO(),
            updated_at: DateTime.local().toISO(),
            pagado: false
        }

        const [{ id_pedido }] = await trx.table('pedidos').insert(insert_datos_pedido).returning('id_pedido')
        await trx.commit();

        const datos = {
            comercio_token_privado: 'tu_token_privado'
        };

        const cadenaParaHash = datos.comercio_token_privado + id_pedido + String(insert_datos_pedido.monto);
        const hash = crypto.createHash('sha1').update(cadenaParaHash).digest('hex');

        //hacer el post a pagopar y actualizar la tabla de pedido con el token que viene de respuesta en data
        // const res = await axios.post('https://api.pagopar.com/api/comercios/2.0/iniciar-transaccion')

        console.log('hash', hash);
        return response.json({ hash: hash })
    } catch (e) {
        console.log(e);
        await trx.rollback();
        return response.status(500).json(params)
    }
}
