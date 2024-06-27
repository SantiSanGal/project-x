import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import { list, password, update } from './handlers';

export default class Controller {
    public async list(params: HttpContextContract) {
        return list(params)
    }

    public async update(params: HttpContextContract) { //editar datos del usuario
        return update(params)
    }

    public async password(params: HttpContextContract) { //actualizar la contraseña del usuario
        return password(params)
    }
}