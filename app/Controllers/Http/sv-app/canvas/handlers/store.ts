import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Database from "@ioc:Adonis/Lucid/Database";
import Logger from "@ioc:Adonis/Core/Logger";
import Env from "@ioc:Adonis/Core/Env";
import Ws from "App/Services/Ws";
import { DateTime } from "luxon";
import crypto from "crypto";
import axios from "axios";

// USD objetivo
const MONTO_USD = 100;

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

    // 2. Usuario
    const { user } = auth;

    if (!user) {
      Logger.warn(`Usuario no autenticado`);
      await trx.rollback();
      return response.status(401).json({ message: "User not authenticated" });
    }

    // 3. Expiración
    const newExpiration = DateTime.local().plus({ minutes: 7 }).toISO();

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
        pixeles.map((p) =>
          trx
            .from("pixeles_individuales")
            .where({
              id_grupo_pixeles: grupoId,
              coordenada_x: p.coordenada_x,
              coordenada_y: p.coordenada_y,
            })
            .update({ color: p.color })
        )
      );
      Logger.trace(
        `Colores de píxeles actualizados - grupoId: ${grupoId} - count: ${pixeles.length}`
      );

      await trx.from("puntos").where("id_grupo_pixeles", grupoId).del();

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

    // 5. *** COTIZACIÓN más reciente y monto en PYG equivalente a 100 USD ***
    const ultimaCot = await trx
      .from("cotizaciones")
      .select("monto_venta", "fecha")
      .orderBy("fecha", "desc")
      .first();

    if (!ultimaCot?.monto_venta) {
      await trx.rollback();
      return response.status(503).json({
        message: "No hay cotización disponible para calcular el monto en PYG",
      });
    }

    const ventaGs = Number(ultimaCot.monto_venta);
    if (!Number.isFinite(ventaGs)) {
      await trx.rollback();
      return response.status(503).json({
        message: "Cotización inválida en base de datos",
      });
    }

    const montoTotalPYG = Math.round(ventaGs * MONTO_USD); // equivalente a 100 USD
    Logger.info(
      `Cotización usada: ${ventaGs} Gs/USD (fecha=${ultimaCot.fecha}) -> monto_total=${montoTotalPYG} Gs`
    );

    // 6. Insertar pedido (guardar el monto en PYG que enviarás a Pagopar)
    const pedido_insert_params = {
      id_grupo_pixeles: grupoId,
      id_usuario: user.id,
      monto: montoTotalPYG, // <--- PYG
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

    // 7. Preparar y llamar a Pagopar con el monto PYG calculado
    const privateToken = Env.get("PAGOPAR_TOKEN_PRIVADO");
    if (!privateToken) {
      Logger.error(`PAGOPAR_TOKEN_PRIVADO no definido en Env`);
      throw new Error("Missing PAGOPAR_TOKEN_PRIVADO");
    }

    const publicToken = Env.get("PAGOPAR_TOKEN_PUBLICO");
    if (!privateToken || !publicToken) {
      await trx.rollback();
      return response
        .status(500)
        .json({ message: "Tokens de Pagopar faltantes" });
    }

    const fechaMaximaPagoStr = DateTime.local()
      .plus({ minutes: 7 })
      .toFormat("yyyy-LL-dd HH:mm:ss");

    const tokenForPagopar = crypto
      .createHash("sha1")
      .update(privateToken + id_pedido.toString() + String(montoTotalPYG))
      .digest("hex");

    const pagoparPayload = {
      token: tokenForPagopar,
      comprador: {
        ruc: user.document || "5688386-2",
        email: user.email,
        ciudad: "1",
        nombre: user.name || "Santiago",
        telefono: "+595985507615",
        direccion: "",
        documento: user.document || "5688386",
        coordenadas: "",
        razon_social: user.name || "",
        tipo_documento: "CI",
        direccion_referencia: "",
      },
      public_key: publicToken,
      monto_total: montoTotalPYG, // <--- PYG equivalente a 100 USD
      tipo_pedido: "VENTA-COMERCIO",
      compras_items: [
        {
          ciudad: "1",
          nombre: `Coordenadas (${grupo_pixeles.coordenada_x_inicio}, ${grupo_pixeles.coordenada_y_inicio})`,
          cantidad: 1,
          categoria: "909",
          public_key: publicToken,
          url_imagen: "",
          descripcion: `Coordenadas (${grupo_pixeles.coordenada_x_inicio}, ${grupo_pixeles.coordenada_y_inicio})`,
          id_producto: "1",
          precio_total: montoTotalPYG, // <--- total del ítem en PYG
          vendedor_telefono: "",
          vendedor_direccion: "",
          vendedor_direccion_referencia: "",
          vendedor_direccion_coordenadas: "",
        },
      ],
      fecha_maxima_pago: fechaMaximaPagoStr,
      id_pedido_comercio: id_pedido.toString(),
      descripcion_resumen: `Coordenadas (${grupo_pixeles.coordenada_x_inicio}, ${grupo_pixeles.coordenada_y_inicio})`,
      forma_pago: 26,
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
    params.data = {
      dataToken: pagoparResponse.data.resultado[0].data,
      code_for_refer: `TP-${grupoId}`,
    };
    return response.json(params);
  } catch (error: any) {
    console.log("error", error);

    Logger.error(
      `Error inesperado en handler STORE - message: ${error.message}`
    );
    await trx.rollback();
    return response.status(500).json(params);
  }
};
