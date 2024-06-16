import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Database from "@ioc:Adonis/Lucid/Database";
import { DateTime } from "luxon";

export const confirmarPago = async ({ request, response }: HttpContextContract) => {
  let params = {
    notification: {
      state: false,
      type: 'error',
      message: 'Error en el servidor'
    }
  }

  // Ejemplo {
  //   pagado: true,
  //   numero_comprobante_interno: "8230473",
  //   ultimo_mensaje_error: null,
  //   forma_pago: "Tarjetas de crédito/débito",
  //   fecha_pago: "2023-06-07 09:11:49.52895",
  //   monto: "100000.00",
  //   fecha_maxima_pago: "2023-06-14 09:11:32",
  //   hash_pedido: "ad57c9c94f745fdd9bc9093bb409297607264af1a904e6300e71c24f15d618fd",
  //   numero_pedido: "1746",
  //   cancelado: false,
  //   forma_pago_identificador: "1",
  //   token: "9c2ed973536395bf3f91c43ffa925bacadcf58e5"
  // }

  try {
    const {
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
    } = await request.all()

    console.log(
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
    );

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


    //recibir el id de pedido y marcar en la bd como pagado
    return response.status(200).json({ message: 'Successfully confirmed' })
  } catch (error) {
    return response.status(500).json(params)
  }
}
