import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Database from "@ioc:Adonis/Lucid/Database";
import Logger from "@ioc:Adonis/Core/Logger";
import Env from "@ioc:Adonis/Core/Env";
import Ws from "App/Services/Ws";
import { DateTime } from "luxon";
import crypto from "crypto";
import axios from "axios";

const montoTotal = "100000";

export const store = async ({
  request,
  response,
  auth,
}: HttpContextContract) => {
  Logger.info(
    "---------------------- Inicio handler Store Pedidos ----------------------"
  );

  let params = {
    data: {},
    notification: {
      state: false,
      type: "error",
      message: "Error en el Servidor",
    },
  };

  const trx = await Database.transaction();

  try {
    // 1. Leer y validar payload básico
    const { grupo_pixeles, pixeles } = request.all();
    Logger.trace(
      `Payload recibido - grupo_pixeles: ${JSON.stringify(
        grupo_pixeles
      )} - pixeles: ${JSON.stringify(pixeles)}`
    );

    if (!grupo_pixeles) {
      Logger.warn(`Falta parámetro grupo_pixeles en request`);
      await trx.rollback();
      return response.badRequest({ message: "Missing grupo_pixeles" });
    }

    if (!Array.isArray(pixeles) || pixeles.length === 0) {
      Logger.warn(
        `Pixeles inválidos o faltantes - pixeles: ${JSON.stringify(pixeles)}`
      );
      await trx.rollback();
      return response.badRequest({ message: "Pixeles inválidos" });
    }

    /* ------------------------- 2 - Usuario Autenticado ------------------------ */
    const { user } = auth;

    if (!user) {
      Logger.warn(`Usuario no autenticado`);
      await trx.rollback();
      return response.status(401).json({ message: "User not authenticated" });
    }

    if (!user.id) {
      Logger.warn(`Usuario autenticado sin ID`);
      await trx.rollback();
      return response.status(401).json({ message: "User ID is not available" });
    }

    Logger.info(`Usuario autenticado - userId: ${user.id}`);

    /* ---------------------- 3 - Preparar nueva expiración --------------------- */
    const newExpiration = DateTime.local().plus({ minutes: 7 }).toISO();
    Logger.trace(
      `Fecha de expiración calculada - newExpiration: ${newExpiration}`
    );

    /* ----------------------- 4 - Buscar grupo existente ----------------------- */
    Logger.trace(
      `Buscando grupo existente en DB - grupo_pixeles: ${JSON.stringify(
        grupo_pixeles
      )}`
    );

    const grupoExistente = await trx
      .from("grupos_pixeles")
      .where("coordenada_x_inicio", grupo_pixeles.coordenada_x_inicio)
      .andWhere("coordenada_x_fin", grupo_pixeles.coordenada_x_fin)
      .andWhere("coordenada_y_inicio", grupo_pixeles.coordenada_y_inicio)
      .andWhere("coordenada_y_fin", grupo_pixeles.coordenada_y_fin)
      .andWhere("id_estado", 1)
      .first();

    let grupoId: number;

    if (grupoExistente) {
      grupoId = grupoExistente.id_grupo_pixeles;
      Logger.info(`Grupo existente encontrado - grupoId: ${grupoId}`);

      /* ----------------------- 4.1 - Verificar expiración ----------------------- */
      const fechaExpiracionGrupo = DateTime.fromJSDate(
        new Date(grupoExistente.fecha_expiracion)
      );
      const estaExpirado = DateTime.local() > fechaExpiracionGrupo;
      Logger.trace(
        `Verificando expiración de grupo - grupoId: ${grupoId} - fechaExpiracion: ${fechaExpiracionGrupo.toISO()} - isExpired: ${estaExpirado}`
      );

      if (!estaExpirado) {
        Logger.info(`Grupo activo sin cambios - grupoId: ${grupoId}`);
        await trx.commit();
        params.notification = {
          state: true,
          type: "info",
          message: "El grupo se encuentra activo, sin cambios.",
        };
        return response.json(params);
      }

      /* -------------- 4.2 - Renovar Expiración y actualizar colores ------------- */
      Logger.info(
        `Grupo expirado, renovando fechas y colores - grupoId: ${grupoId}`
      );
      await trx
        .from("grupos_pixeles")
        .where("id_grupo_pixeles", grupoId)
        .update({ fecha_expiracion: newExpiration });
      Logger.trace(
        `Fecha de expiración actualizada - grupoId: ${grupoId} - newExpiration: ${newExpiration}`
      );

      await Promise.all(
        pixeles.map((pixel) =>
          trx
            .from("pixeles_individuales")
            .where({
              id_grupo_pixeles: grupoId,
              coordenada_x: pixel.coordenada_x,
              coordenada_y: pixel.coordenada_y,
            })
            .update({ color: pixel.color })
        )
      );
      Logger.trace(
        `Colores de píxeles actualizados - grupoId: ${grupoId} - count: ${pixeles.length}`
      );

      await trx.from("puntos").where("id_grupo_pixeles", grupoId).del();
      Logger.trace(
        `Registros de puntos anteriores eliminados - grupoId: ${grupoId}`
      );

      Logger.trace(
        `Grupo expirado actualizado correctamente - grupoId: ${grupoId}`
      );

      params.notification = {
        state: true,
        type: "success",
        message: "Grupo expirado actualizado correctamente.",
      };
    } else {
      /* -------------------------- 5. Crear nuevo Grupo -------------------------- */
      Logger.info(`No existe grupo, creando uno nuevo`);
      const grupoInsert = {
        link_adjunta: grupo_pixeles.link,
        coordenada_x_inicio: grupo_pixeles.coordenada_x_inicio,
        coordenada_y_inicio: grupo_pixeles.coordenada_y_inicio,
        coordenada_x_fin: grupo_pixeles.coordenada_x_fin,
        coordenada_y_fin: grupo_pixeles.coordenada_y_fin,
        id_estado: 1,
        fecha_expiracion: newExpiration,
      };
      Logger.trace(`Datos para nuevo grupo - ${JSON.stringify(grupoInsert)}`);

      const result = await trx
        .table("grupos_pixeles")
        .insert(grupoInsert)
        .returning("id_grupo_pixeles");
      grupoId = result[0].id_grupo_pixeles;
      Logger.info(`Grupo insertado con ID - grupoId: ${grupoId}`);

      const pixelesData = pixeles.map((p: any) => ({
        coordenada_x: p.coordenada_x,
        coordenada_y: p.coordenada_y,
        color: p.color,
        id_grupo_pixeles: grupoId,
      }));
      await trx.table("pixeles_individuales").insert(pixelesData);
      Logger.trace(
        `Píxeles individuales insertados - grupoId: ${grupoId} - count: ${pixelesData.length}`
      );

      params.notification = {
        state: true,
        type: "success",
        message: "Grupo registrado correctamente.",
      };
    }

    /* --------------------------- 6 - Insertar pedido -------------------------- */
    const pedido_insert_params = {
      id_grupo_pixeles: grupoId,
      id_usuario: user.id,
      monto: montoTotal,
      pagado: false,
      created_at: DateTime.local().toISO(),
      updated_at: DateTime.local().toISO(),
      fecha_maxima_pago: DateTime.local().plus({ minutes: 7 }).toISO(),
    };
    Logger.trace(
      `Datos para insertar pedido - ${JSON.stringify(pedido_insert_params)}`
    );

    const [{ id_pedido }] = await trx
      .table("pedidos")
      .insert(pedido_insert_params)
      .returning("id_pedido");
    Logger.info(`Pedido insertado con ID - id_pedido: ${id_pedido}`);

    /* -------------------- 7 - Preparar y llamar a Pagopar -------------------- */
    const privateToken = Env.get("PAGOPAR_TOKEN_PRIVADO");
    if (!privateToken) {
      Logger.error(`PAGOPAR_TOKEN_PRIVADO no definido en Env`);
      throw new Error("Missing PAGOPAR_TOKEN_PRIVADO");
    }

    const publicToken = Env.get("PAGOPAR_TOKEN_PUBLICO");
    if (!publicToken) {
      Logger.error(`PAGOPAR_TOKEN_PUBLICO no definido en Env`);
      throw new Error("Missing PAGOPAR_TOKEN_PUBLICO");
    }

    const fechaMaximaPagoStr = DateTime.local()
      .plus({ minutes: 7 })
      .toFormat("yyyy-LL-dd HH:mm:ss");

    // Recalcular el token con el monto en PYG exacto que enviarás
    const tokenForPagopar = crypto
      .createHash("sha1")
      .update(privateToken + id_pedido.toString() + String(montoTotal))
      .digest("hex");

    const pagoparPayload = {
      token: tokenForPagopar,
      comprador: {
        ruc: user.document || "5688386-2", // si no tiene, enviar ""
        email: user.email, // obligatorio
        ciudad: "1", // si NO usás courier, enviar "1"
        nombre: user.name || "Santiago",
        telefono: "+595985507615", // en formato internacional
        direccion: "", // si no hay, enviar ""
        documento: user.document || "5688386", // obligatorio
        coordenadas: "", // si no hay, enviar ""
        razon_social: user.name || "", // si no hay, enviar ""
        tipo_documento: "CI", // según doc, siempre "CI"
        direccion_referencia: "", // si no hay, enviar ""
      },
      public_key: publicToken,
      monto_total: montoTotal, // ENTERO en PYG
      tipo_pedido: "VENTA-COMERCIO", // requerido por doc
      compras_items: [
        {
          ciudad: "1", // si NO usás courier, "1"
          nombre: `Coordenadas (${grupo_pixeles.coordenada_x_inicio}, ${grupo_pixeles.coordenada_y_inicio})`,
          cantidad: 1,
          categoria: "909", // si NO usás courier, "909"
          public_key: publicToken, // mismo public_key si no hay split
          // url_imagen: `${Env.get("URL_BACK")}/canvas/img/${justName}`,
          url_imagen: "",
          descripcion: `Coordenadas (${grupo_pixeles.coordenada_x_inicio}, ${grupo_pixeles.coordenada_y_inicio})`,
          id_producto: "1",
          precio_total: montoTotal, // total del ítem (no unitario)
          vendedor_telefono: "", // si no hay, enviar ""
          vendedor_direccion: "",
          vendedor_direccion_referencia: "",
          vendedor_direccion_coordenadas: "",
        },
      ],
      fecha_maxima_pago: fechaMaximaPagoStr, // "YYYY-MM-DD HH:mm:ss"
      id_pedido_comercio: id_pedido.toString(), // único por ambiente
      descripcion_resumen: `Coordenadas (${grupo_pixeles.coordenada_x_inicio}, ${grupo_pixeles.coordenada_y_inicio})`,
      forma_pago: 26, // mantenés tu forma de pago elegida
    };

    // LOG opcional
    Logger.trace(
      `Payload para Pagopar (PYG) - ${JSON.stringify(pagoparPayload)}`
    );

    const pagoparResponse = await axios.post(
      "https://api.pagopar.com/api/comercios/2.0/iniciar-transaccion",
      pagoparPayload,
      { headers: { "Content-Type": "application/json" } }
    );

    Logger.info(
      `Respuesta recibida de Pagopar - status: ${
        pagoparResponse.status
      } - data: ${JSON.stringify(pagoparResponse.data)}`
    );

    if (
      pagoparResponse.data.respuesta &&
      pagoparResponse.data.resultado &&
      pagoparResponse.data.resultado[0]
    ) {
      const dataToken = pagoparResponse.data.resultado[0].data;
      const pagopar_pedido_transaccion =
        pagoparResponse.data.resultado[0].pedido;

      Logger.info(
        `Transacción Pagopar exitosa - id_pedido: ${id_pedido} - dataToken: ${dataToken} - pagopar_pedido_transaccion: ${pagopar_pedido_transaccion}`
      );

      params.data = {
        dataToken,
        code_for_refer: `TP-${grupoId}`,
      };

      await trx.from("pedidos").where("id_pedido", id_pedido).update({
        data_token: dataToken,
        pagopar_pedido_transaccion,
        token_generado: tokenForPagopar,
      });

      Logger.trace(
        `Pedido actualizado con datos de Pagopar - id_pedido: ${id_pedido}`
      );
    } else {
      Logger.warn(
        `Respuesta Pagopar sin resultado esperado - responseData: ${JSON.stringify(
          pagoparResponse.data
        )}`
      );
      await trx.rollback();
      throw new Error("Error al generar pedido en Pagopar");
    }

    /* ----------------- 8 - Finalizar transacción y notificar ----------------- */
    await trx.commit();
    Logger.info(`Transacción confirmada (commit) - pedidoId: ${id_pedido}`);
    Ws.io.emit("nuevo_registro");
    Logger.trace(`Evento WebSocket emitido - event: nuevo_registro`);

    params.notification = {
      state: true,
      type: "success",
      message: "Pedido Registrado con éxito",
    };
    return response.json(params);
  } catch (error) {
    Logger.error(
      `Error inesperado en handler STORE - message: ${error.message} - stack: ${error.stack}`
    );
    await trx.rollback();
    return response.status(500).json(params);
  }
};
