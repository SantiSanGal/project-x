import { logout } from './handlers/logout'
import { register } from './handlers/register'
import { verify } from './handlers/verify'
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';

export default class Controller {
  public async verify(params: HttpContextContract) {
    return verify(params)
  }

  public async register(params: HttpContextContract) {
    return register(params)
  }

  public async logout(params: HttpContextContract) {
    return logout(params)
  }
}
