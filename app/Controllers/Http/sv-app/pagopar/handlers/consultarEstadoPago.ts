import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Database from "@ioc:Adonis/Lucid/Database";
import Env from "@ioc:Adonis/Core/Env";
import { DateTime } from "luxon";
import Ws from "App/Services/Ws";
import crypto from "crypto";
import axios from "axios";
import Logger from "@ioc:Adonis/Core/Logger";

export const consultarEstadoPago = async ({
  request,
  response,
}: HttpContextContract) => {
  // Generar un ID único para correlacionar logs de esta petición
  const requestId = crypto.randomBytes(8).toString("hex");
  Logger.info(
    `-------- Inicio handler consultarEstadoPago - requestId: ${requestId} --------`
  );

  let params = {
    data: {},
    notification: {
      state: false,
      type: "error",
      message: "Error en el servidor",
    },
  };

  try {
    // 1. Leer parámetro hashPedido
    const { hashPedido } = request.params();
    Logger.trace(
      `Parámetro recibido - hashPedido: ${hashPedido} - requestId: ${requestId}`
    );

    // 2. Obtener tokens
    const privateToken = Env.get("PAGOPAR_TOKEN_PRIVADO");
    const publicToken = Env.get("PAGOPAR_TOKEN_PUBLICO");

    // 3. Crear token de consulta para Pagopar
    const tokenForPagopar = crypto
      .createHash("sha1")
      .update(privateToken + "CONSULTA")
      .digest("hex");

    Logger.trace(
      `Token generado para consulta Pagopar: ${tokenForPagopar} - requestId: ${requestId}`
    );

    const consultar_estado_pago_params = {
      hash_pedido: hashPedido,
      token: tokenForPagopar,
      token_publico: publicToken,
    };

    Logger.trace(
      `Payload para Pagopar (consultar estado) - ${JSON.stringify(
        consultar_estado_pago_params
      )} - requestId: ${requestId}`
    );

    // 4. Llamada a Pagopar
    Logger.info(`Enviando petición a Pagopar /traer - requestId: ${requestId}`);

    const { data } = await axios.post(
      "https://api.pagopar.com/api/pedidos/1.1/traer",
      consultar_estado_pago_params
    );

    Logger.info(
      `Respuesta de Pagopar recibida - respuesta: ${data.respuesta} - requestId: ${requestId}`
    );

    Logger.trace(
      `Respuesta completa de Pagopar - ${JSON.stringify(
        data
      )} - requestId: ${requestId}`
    );

    if (data && data.respuesta) {
      Logger.info(
        `data.respuesta OK, procesando resultado - requestId: ${requestId}`
      );

      const { resultado } = data;

      Logger.trace(
        `Resultado parseado: ${JSON.stringify(
          resultado
        )} - requestId: ${requestId}`
      );

      const [
        {
          pagado,
          numero_comprobante_interno,
          forma_pago,
          fecha_pago,
          hash_pedido,
          numero_pedido,
          cancelado,
          forma_pago_identificador,
          token,
        },
      ] = resultado;

      Logger.trace(
        `Campos de resultado - pagado: ${pagado} - numero_comprobante_interno: ${numero_comprobante_interno} - forma_pago: ${forma_pago} - fecha_pago: ${fecha_pago} - hash_pedido: ${hash_pedido} - numero_pedido: ${numero_pedido} - cancelado: ${cancelado} - forma_pago_identificador: ${forma_pago_identificador} - token: ${token} - requestId: ${requestId}`
      );

      // 5. Validar integridad del token
      const hashToCompare = crypto
        .createHash("sha1")
        .update(privateToken + hash_pedido)
        .digest("hex");

      Logger.trace(
        `Hash generado para comparar: ${hashToCompare} - token recibido: ${token} - requestId: ${requestId}`
      );

      if (hashToCompare === token) {
        Logger.info(
          `Token válido, procediendo a actualizar pedido - requestId: ${requestId}`
        );

        const pedido_update_params = {
          pagado,
          numero_comprobante_interno_pagopar: numero_comprobante_interno,
          forma_pago,
          fecha_pago,
          forma_pago_identificador,
          updated_at: DateTime.local().toISO(),
          cancelado,
        };

        Logger.trace(
          `Parámetros update pedido: ${JSON.stringify(
            pedido_update_params
          )} - requestId: ${requestId}`
        );

        // 6. Actualizar tabla pedidos
        const updatedPedido = await Database.connection("pg")
          .from("pedidos")
          .where("pagopar_pedido_transaccion", numero_pedido)
          .andWhere("data_token", hash_pedido)
          .update(pedido_update_params)
          .returning("id_grupo_pixeles");

        Logger.info(
          `Update en pedidos completado - filas afectadas: ${updatedPedido.length} - requestId: ${requestId}`
        );

        if (updatedPedido.length > 0 && updatedPedido[0].id_grupo_pixeles) {
          const grupoId = updatedPedido[0].id_grupo_pixeles;

          Logger.trace(
            `ID grupo_pixeles a actualizar: ${grupoId} - requestId: ${requestId}`
          );

          // 7. Actualizar estado en grupos_pixeles
          Logger.trace(
            `Actualizando id_estado=2 en grupos_pixeles para id: ${grupoId} - requestId: ${requestId}`
          );

          const grupos_pixeles = await Database.connection("pg")
            .from("grupos_pixeles")
            .where("id_grupo_pixeles", grupoId)
            .update({ id_estado: 2 });

          Logger.info(
            `Update en grupos_pixeles completado - filas afectadas: ${grupos_pixeles} - requestId: ${requestId}`
          );

          // 8. Obtener pixeles individuales
          Logger.trace(
            `Consultando pixeles_individuales para grupo: ${grupoId} - requestId: ${requestId}`
          );

          const pixeles_individuales = await Database.connection("pg")
            .from("pixeles_individuales")
            .where("id_grupo_pixeles", grupoId);

          Logger.info(
            `pixeles_individuales obtenidos - count: ${pixeles_individuales.length} - requestId: ${requestId}`
          );

          // 9. Emitir evento si fue pagado
          if (pagado) {
            Logger.info(
              `Pago confirmado, emitiendo evento WebSocket 'pintar' - requestId: ${requestId}`
            );
            Ws.io.emit("pintar", pixeles_individuales);
          } else {
            Logger.warn(
              `Pago NO confirmado, no se emitirá evento 'pintar' - requestId: ${requestId}`
            );
          }
        } else {
          Logger.warn(
            `No se encontró pedido para actualizar con pagopar_pedido_transaccion=${numero_pedido} y data_token=${hash_pedido} - requestId: ${requestId}`
          );
        }
      } else {
        Logger.warn(
          `Token inválido: hash no coincide - requestId: ${requestId}`
        );
      }

      params.data = {
        pagado: data.resultado[0].pagado,
      };
    } else {
      Logger.warn(
        `data.respuesta no presente o false - requestId: ${requestId}`
      );
    }

    // 10. Responder éxito
    params.notification.state = true;
    params.notification.type = "success";
    params.notification.message = "Pedido consultado con éxito";
    Logger.info(
      `-------- Fin handler consultarEstadoPago - requestId: ${requestId} --------`
    );
    return response.status(200).json(params);
  } catch (e: any) {
    Logger.error(
      `-------- Inicio catch consultarEstadoPago - requestId: ${requestId} --------`
    );
    Logger.error(
      `Error inesperado - mensaje: ${e.message} - requestId: ${requestId}`
    );
    Logger.error(`Stack trace: ${e.stack} - requestId: ${requestId}`);
    Logger.error(
      `-------- Fin catch consultarEstadoPago - requestId: ${requestId} --------`
    );
    return response.status(500).json(params);
  }
};
