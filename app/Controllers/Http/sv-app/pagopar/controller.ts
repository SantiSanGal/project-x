import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import { confirmarPago, generarPedido } from './handlers';


export default class Controller {
  public async generarPedido(params: HttpContextContract) {
    return generarPedido(params)
  }

  public async confirmarPago(params: HttpContextContract) {
    console.log('confirmarPago controller');

    return confirmarPago(params)
  }

  public async redireccionamiento({ request, response }: HttpContextContract) {
    const { hash } = await request.params();
    console.log('hash', hash);

    console.log('redireccionamiento');

    return response.status(200).json({message: 'oikoite', hash})
  }
}
