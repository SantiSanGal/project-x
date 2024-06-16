import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import { list } from './handlers/list'
import { store } from './handlers/store';
import { edit } from './handlers/edit';


export default class Controller {
    public async list(params: HttpContextContract) {
        return list(params)
    }

    public async store(params: HttpContextContract) {
        return store(params)
    }

    public async edit(params: HttpContextContract) {
        return edit(params)
    }
}
