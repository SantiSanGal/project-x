import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database';
import axios from 'axios';
import crypto from 'crypto'

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
            return response.status(400).json({ message: 'User ID is not available' });
        }

        const datos = {
            comercio_token_privado: 'tu_token_privado'
        };

        const datos_pedido = {}

        const [{ id_pedido }] = await trx.table('pedidos').insert(datos_pedido).returning('id_pedido')
        await trx.commit();

        const idPedido = id_pedido;
        const monto_total = 25.00; //siempre va a ser 25

        const cadenaParaHash = datos.comercio_token_privado + idPedido + String(monto_total);
        const hash = crypto.createHash('sha1').update(cadenaParaHash).digest('hex');

        //hacer el post a pagopar y actualizar la tabla de pedido con el token que viene de respuesta en data
        const res = await axios.post('test')

      console.log('res', res);

        console.log('hash', hash);
    } catch (e) {
        console.log(e);
        await trx.rollback();
        return response.status(500).json(params)
    }
}
