import { generarPedido } from './handlers/generarPedido';
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';

export default class Controller {
    public async generarPedido(params: HttpContextContract) {
        return generarPedido(params)
    }
}
