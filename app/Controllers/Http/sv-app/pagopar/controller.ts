import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import { confirmarPago, generarPedido } from './handlers';


export default class Controller {
  public async generarPedido(params: HttpContextContract) {
    return generarPedido(params)
  }

  public async confirmarPago(params: HttpContextContract) {
    return confirmarPago(params)
  }
}
