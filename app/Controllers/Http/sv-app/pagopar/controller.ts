import { generarPedido } from './handlers/generarPedido';
import {confirmarPago} from "./handlers/confirmarPago";
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';


export default class Controller {
    public async generarPedido(params: HttpContextContract) {
        return generarPedido(params)
    }

    public async confirmarPago(params: HttpContextContract) {
      return confirmarPago(params)
    }
}
