import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import { list } from './handlers/list';
import { update } from './handlers/update';
import { password } from './handlers/password';
export default class Controller {
    public async list(params: HttpContextContract) { //list de los datos del usuario
        return list(params)
    }

    public async update(params: HttpContextContract) { //editar datos del usuario
        return update(params)
    }

    public async password(params: HttpContextContract) { //actualizar la contraseña del usuario
        return password(params)
    }
}