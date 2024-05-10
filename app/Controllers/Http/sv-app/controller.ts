import { list } from './handlers/list'

export default class Controller {
    public async list(request, response, auth) {
        const params: any = {
            request,
            response,
            auth
        }

        return list(params)
    }
}
