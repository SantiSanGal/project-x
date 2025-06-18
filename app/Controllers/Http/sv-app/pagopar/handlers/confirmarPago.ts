import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Database from "@ioc:Adonis/Lucid/Database";
import Env from "@ioc:Adonis/Core/Env";
import { DateTime } from "luxon";
import Ws from "App/Services/Ws";
import crypto from "crypto";
import Logger from "@ioc:Adonis/Core/Logger";

// Acá notifica si el pago es reversado o no
export const confirmarPago = async ({
  request,
  response,
}: HttpContextContract) => {
  const requestId = crypto.randomBytes(8).toString("hex");
  Logger.info(
    `---------------------- Inicio handler confirmarPago - resquestId: ${requestId} ----------------------`
  );
  const { resultado, respuesta } = await request.all();

  Logger.trace(
    `Payload recibido - resultado: ${JSON.stringify(
      resultado
    )} - respuesta: ${JSON.stringify(respuesta)} - resquestId: ${requestId}`
  );

  try {
    const privateToken = Env.get("PAGOPAR_TOKEN_PRIVADO");

    const [
      {
        pagado,
        numero_comprobante_interno,
        // ultimo_mensaje_error,
        forma_pago,
        fecha_pago,
        // monto,
        hash_pedido,
        numero_pedido,
        cancelado,
        forma_pago_identificador,
        token,
      },
    ] = resultado;

    Logger.trace(
      `Datos parseados - pagado: ${pagado} - numero_comprobante_interno: ${numero_comprobante_interno} - forma_pago: ${forma_pago} - fecha_pago: ${fecha_pago} - hash_pedido: ${hash_pedido} - numero_pedido: ${numero_pedido} - cancelado: ${cancelado} - forma_pago_identificador: ${forma_pago_identificador} - token: ${token} - resquestId: ${requestId}`
    );

    const hashToCompare = crypto
      .createHash("sha1")
      .update(privateToken + hash_pedido)
      .digest("hex");

    Logger.trace(
      `Hash generado: ${hashToCompare} - token recibido: ${token} - resquestId: ${requestId}`
    );

    if (hashToCompare === token) {
      Logger.info(
        `Hash válido, procediendo a actualización de pedido - resquestId: ${requestId}`
      );

      let pedido_update_params = {
        pagado: pagado,
        numero_comprobante_interno_pagopar: numero_comprobante_interno,
        forma_pago: forma_pago,
        fecha_pago: fecha_pago,
        forma_pago_identificador: forma_pago_identificador,
        updated_at: DateTime.local().toISO(),
        cancelado: cancelado,
      };

      Logger.trace(
        `Parametros para update de pedido: ${JSON.stringify(
          pedido_update_params
        )} - resquestId: ${requestId}`
      );

      const updatedPedido = await Database.connection("pg")
        .from("pedidos")
        .where("pagopar_pedido_transaccion", numero_pedido)
        .andWhere("data_token", hash_pedido)
        .update(pedido_update_params)
        .returning("id_grupo_pixeles");

      Logger.info(
        `Resultado update pedidos - count: ${updatedPedido.length} - resquestId: ${requestId}`
      );

      if (updatedPedido.length > 0 && updatedPedido[0].id_grupo_pixeles) {
        const grupoId = updatedPedido[0].id_grupo_pixeles;

        Logger.trace(
          `ID de grupo_pixeles a actualizar: ${grupoId} - resquestId: ${requestId}`
        );

        Logger.trace(
          `Actualizando estado de grupo_pixeles a 2 para id: ${grupoId} - resquestId: ${requestId}`
        );

        const grupos_pixeles = await Database.connection("pg")
          .from("grupos_pixeles")
          .where("id_grupo_pixeles", grupoId)
          .update({ id_estado: 2 });

        Logger.info(
          `grupos_pixeles actualizados: ${grupos_pixeles} - resquestId: ${requestId}`
        );

        Logger.trace(
          `Obteniendo pixeles_individuales para grupo: ${grupoId} - resquestId: ${requestId}`
        );

        const pixeles_individuales = await Database.connection("pg")
          .from("pixeles_individuales")
          .where("id_grupo_pixeles", grupoId);

        Logger.trace(
          `pixeles_individuales obtenidos - count: ${pixeles_individuales.length} - resquestId: ${requestId}`
        );

        if (pagado) {
          Logger.info(
            `Pago confirmado, emitiendo evento WebSocket 'pintar' - resquestId: ${requestId}`
          );
          Ws.io.emit("pintar", pixeles_individuales);
        } else {
          Logger.warn(
            `Pago NO confirmado, no se emitirá evento 'pintar' - resquestId: ${requestId}`
          );
        }
      } else {
        Logger.warn(
          `No se actualizó ningún pedido para pagopar_pedido_transaccion=${numero_pedido} y data_token=${hash_pedido} - resquestId: ${requestId}`
        );
      }
    } else {
      Logger.warn(
        `Token inválido: el hash generado no coincide con el token recibido - resquestId: ${requestId}`
      );
    }

    Logger.info(
      `---------------------- Fin handler confirmarPago - resquestId: ${requestId} ----------------------`
    );
    return response.status(200).json(resultado);
  } catch (e) {
    Logger.error(
      `--------------------- Inicio catch confirmarPago - resquestId: ${requestId} ---------------------`
    );
    Logger.error(
      `Error inesperado en confirmarPago - mensaje: ${e.message} - resquestId: ${requestId}`
    );
    Logger.error(`Stack trace: ${e.stack} - resquestId: ${requestId}`);
    Logger.error(
      `Datos de respuesta recibida en catch: ${JSON.stringify(
        respuesta
      )} - resquestId: ${requestId}`
    );
    Logger.error(
      `--------------------- Fin catch confirmarPago - resquestId: ${requestId} ---------------------`
    );
    return response.status(200).json(resultado);
  }
};
