import { login } from './handlers/login';
import { logout } from './handlers/logout'
import { register } from './handlers/register'
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import { verify } from './handlers/verify';

export default class Controller {
  public async login(params: HttpContextContract) {
    return login(params)
  }

  public async register(params: HttpContextContract) {
    return register(params)
  }

  public async logout(params: HttpContextContract) {
    console.log('entra controller');
    return logout(params)
  }

  public async verify(params: HttpContextContract) {
    return verify(params)
  }
}
