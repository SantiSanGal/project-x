import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import { forgotPassword, login, logout, register } from './handlers';

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

  public async forgotPassword(params: HttpContextContract) {
    return forgotPassword(params)
  }
}