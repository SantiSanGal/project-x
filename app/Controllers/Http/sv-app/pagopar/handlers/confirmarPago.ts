import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Database from "@ioc:Adonis/Lucid/Database";
import { logger } from "Config/app";
import { DateTime } from "luxon";

export const confirmarPago = async ({ request, response }: HttpContextContract) => {
  let params = {
    notification: {
      state: false,
      type: 'error',
      message: 'Error en el servidor'
    }
  }

  try {
    const { resultado, respuesta } = await request.all()

    const { 
      pagado, // viene booleano
      numero_comprobante_interno,
      ultimo_mensaje_error,
      forma_pago,
      fecha_pago,
      monto,
      fecha_maxima_pago,
      hash_pedido,
      numero_pedido,
      cancelado,
      forma_pago_identificador,
      token
    } = resultado

    logger.info(
      pagado,
      numero_comprobante_interno,
      ultimo_mensaje_error,
      forma_pago,
      fecha_pago,
      monto,
      fecha_maxima_pago,
      hash_pedido,
      numero_pedido,
      cancelado,
      forma_pago_identificador,
      token
    )

    let pedido_update_params = {
      pagado: pagado,
      numero_comprobante_interno_pagopar: numero_comprobante_interno,
      forma_pago: forma_pago,
      fecha_pago: fecha_pago,
      forma_pago_identificador: forma_pago_identificador,
      updated_at: DateTime.local().toISO()
    }

    await Database.connection('pg')
      .from('pedidos')
      .where('id_pedido', numero_pedido)
      .andWhere('data_token', hash_pedido)
      .update(pedido_update_params)

    return response.status(200).json(resultado)
  } catch (e) {
    console.log('e', e);
    logger.error(e)
    return response.status(500).json(params)
  }
}
