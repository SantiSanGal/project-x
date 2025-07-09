import { forgotPassword, googleAuth, login, logout, register } from "./handlers";
import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";

export default class Controller {
  public async login(params: HttpContextContract) {
    return login(params);
  }

  public async register(params: HttpContextContract) {
    return register(params);
  }

  public async logout(params: HttpContextContract) {
    return logout(params);
  }

  public async forgotPassword(params: HttpContextContract) {
    return forgotPassword(params);
  }

  public async googleAuth(params: HttpContextContract) {
    return googleAuth(params)
  }
}
