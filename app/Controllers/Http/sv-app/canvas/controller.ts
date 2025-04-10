import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import {
  list,
  edit,
  store,
  rangosOcupados,
  getGrupoPixeles,
  getImgGrupoPixeles,
  postReportarGrupoPixeles,
} from "./handlers";

export default class Controller {
  public async list(params: HttpContextContract) {
    return list(params);
  }

  public async store(params: HttpContextContract) {
    return store(params);
  }

  public async getGrupoPixeles(params: HttpContextContract) {
    return getGrupoPixeles(params);
  }

  public async edit(params: HttpContextContract) {
    return edit(params);
  }

  public async rangosOcupados(params: HttpContextContract) {
    return rangosOcupados(params);
  }

  public async getImgGrupoPixeles(params: HttpContextContract) {
    return getImgGrupoPixeles(params);
  }

  public async postReportarGrupoPixeles(params: HttpContextContract) {
    return postReportarGrupoPixeles(params);
  }
}
