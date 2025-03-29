import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import { edit, list, rangosOcupados, store } from './handlers';
import { getImgGrupoPixeles } from './handlers/getImgGrupoPixeles';

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

    public async rangosOcupados(params: HttpContextContract) {
        return rangosOcupados(params)
    }

    public async getImgGrupoPixeles(params: HttpContextContract) {
        return getImgGrupoPixeles(params)
    }
}
