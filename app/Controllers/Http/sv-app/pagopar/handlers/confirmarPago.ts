import {HttpContextContract} from "@ioc:Adonis/Core/HttpContext";

export const confirmarPago = async ({response}: HttpContextContract) => {
  let params = {
    notification: {
      state: false,
      type: 'error',
      message: 'Error en el servidor'
    }
  }
  try {
    //recibir el id de pedido y marcar en la bd como pagado
    return response.status(200).json({ message: 'Successfully confirmed' })
  }catch(error) {
    return response.status(500).json(params)
  }
}