import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import { list } from './handlers/list';

export default class Controller {
    public async list(params: HttpContextContract){
        return list(params)
    }
}