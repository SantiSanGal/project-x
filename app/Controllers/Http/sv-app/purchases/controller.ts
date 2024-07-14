import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import { list, getGroupPurchaseById } from './handlers';

export default class Controller {
    public async list(params: HttpContextContract) {
        return list(params)
    }

    public async getGroupPurchaseById(params: HttpContextContract) {
        return getGroupPurchaseById(params)
    }
}