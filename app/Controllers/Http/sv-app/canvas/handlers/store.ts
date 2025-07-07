import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Database from "@ioc:Adonis/Lucid/Database";
import Env from "@ioc:Adonis/Core/Env";
import { createCanvas } from "canvas";
import Ws from "App/Services/Ws";
import { DateTime } from "luxon";
import crypto from "crypto";
import axios from "axios";
import path from "path";
import fs from "fs";
import Logger from "@ioc:Adonis/Core/Logger";

const montoTotal = "25";

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
    const { grupo_pixeles, pixeles, refer_code } = request.all();
    Logger.trace(
      `Payload recibido - grupo_pixeles: ${JSON.stringify(
        grupo_pixeles
      )} - pixeles: ${JSON.stringify(pixeles)} - refer_code: ${refer_code}`
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

    /* ------------------------- 3 - Parse de refer_code ------------------------ */
    let referCode: string | null = null;
    if (refer_code) {
      try {
        const parts = refer_code.split("-");
        if (parts.length < 2) {
          Logger.warn(
            `Formato de refer_code inesperado - refer_code: ${refer_code}`
          );
        } else {
          referCode = parts[1];
          Logger.trace(`refer_code parseado - referCode: ${referCode}`);
        }
      } catch (err: any) {
        Logger.error(
          `Error al parsear refer_code - refer_code: ${refer_code} - error: ${err.message}`
        );
      }
    } else {
      Logger.trace(`No se proporcionó refer_code`);
    }

    /* ------------------- 4 - Detectar si es Auto-referencia ------------------ */
    let isSelfReferral = false;
    if (referCode) {
      Logger.trace(
        `Buscando pedido referido existente - referCode: ${referCode}`
      );
      const pedidoReferido = await trx
        .from("pedidos")
        .select("id_usuario")
        .where("id_grupo_pixeles", referCode)
        .first();

      if (pedidoReferido?.id_usuario === user.id) {
        isSelfReferral = true;
        Logger.trace(
          `Autorreferencia detectada, se ignorará referCode - userId: ${user.id} - referCode: ${referCode}`
        );
      }
    }

    /* ---------------------- 5 - Preparar nueva expiración --------------------- */
    const newExpiration = DateTime.local().plus({ minutes: 7 }).toISO();
    Logger.trace(
      `Fecha de expiración calculada - newExpiration: ${newExpiration}`
    );

    /* ----------------------- 6 - Buscar grupo existente ----------------------- */
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

      /* ----------------------- 6.1 - Verificar expiración ----------------------- */
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

      /* -------------- 6.2 - Renovar Expiración y actualizar colores ------------- */
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

      if (!referCode || isSelfReferral) {
        await trx.table("puntos").insert({
          id_grupo_pixeles: grupoId,
          id_grupo_pixeles_referido: null,
        });
      } else {
        await trx.table("puntos").insert([
          { id_grupo_pixeles: grupoId, id_grupo_pixeles_referido: null },
          {
            id_grupo_pixeles: grupoId,
            id_grupo_pixeles_referido: referCode!,
          },
        ]);
      }
      Logger.info(
        `Puntos insertados (grupo expirado) - grupoId: ${grupoId} - referCode: ${
          referCode ?? "null"
        }`
      );

      params.notification = {
        state: true,
        type: "success",
        message: "Grupo expirado actualizado correctamente.",
      };
    } else {
      /* -------------------------- 7. Crear nuevo Grupo -------------------------- */
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

      if (!referCode || isSelfReferral) {
        await trx.table("puntos").insert({
          id_grupo_pixeles: grupoId,
          id_grupo_pixeles_referido: null,
        });
      } else {
        await trx.table("puntos").insert([
          { id_grupo_pixeles: grupoId, id_grupo_pixeles_referido: null },
          {
            id_grupo_pixeles: grupoId,
            id_grupo_pixeles_referido: referCode,
          },
        ]);
      }
      Logger.info(
        `Puntos insertados (nuevo grupo) - grupoId: ${grupoId} - referCode: ${
          referCode ?? "null"
        } - isSelfReferral: ${isSelfReferral}`
      );

      params.notification = {
        state: true,
        type: "success",
        message: "Grupo registrado correctamente.",
      };
    }

    /* --------------------------- 8 - Insertar pedido -------------------------- */
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

    /* --------------------------- 9 - Generar imagen --------------------------- */
    Logger.info(`Generando imagen de pixeles - grupoId: ${grupoId}`);

    // --- INICIO: CÓDIGO MODIFICADO ---

    // Define el tamaño de cada bloque de color. Cada pixel original será un cuadrado de 100x100.
    const pixelBlockSize = 100;

    // Calcula las dimensiones base de la grilla de píxeles (ej: 5x5)
    const xs = pixeles.map((p: any) => p.coordenada_x);
    const ys = pixeles.map((p: any) => p.coordenada_y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);

    const baseWidth = maxX - minX + 1;
    const baseHeight = maxY - minY + 1;

    // Calcula las dimensiones finales del canvas multiplicando por el tamaño del bloque
    const canvasWidth = baseWidth * pixelBlockSize;
    const canvasHeight = baseHeight * pixelBlockSize;

    Logger.trace(
      `Dimensiones base de la grilla - width: ${baseWidth} - height: ${baseHeight}`
    );
    Logger.trace(
      `Dimensiones canvas final - width: ${canvasWidth} - height: ${canvasHeight}`
    );

    // Crea el canvas con las nuevas dimensiones
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext("2d");

    // Itera sobre cada pixel para dibujarlo como un bloque grande
    pixeles.forEach((pixel: any) => {
      // Calcula la posición relativa del bloque en la grilla (ej: 0,0, 1,0, etc.)
      const x = pixel.coordenada_x - minX;
      const y = pixel.coordenada_y - minY;

      // Valida el formato del color
      if (!/^#[0-9A-F]{6}$/i.test(pixel.color)) {
        Logger.warn(
          `Color inválido en pixel, se omite - ${JSON.stringify(pixel)}`
        );
        return;
      }

      ctx.fillStyle = pixel.color;

      // Dibuja un rectángulo grande (100x100) en la posición escalada correspondiente
      ctx.fillRect(
        x * pixelBlockSize,
        y * pixelBlockSize,
        pixelBlockSize,
        pixelBlockSize
      );
    });

    // --- FIN: CÓDIGO MODIFICADO ---

    Logger.trace(`Canvas pintado - grupoId: ${grupoId}`);

    const hash = crypto
      .createHash("sha1")
      .update(DateTime.local().toISO() + grupoId)
      .digest("hex");
    const fileName = `${grupoId}_${hash}.png`;
    Logger.trace(
      `Hash para imagen generado - hash: ${hash} - fileName: ${fileName}`
    );

    const individualesDir = path.join(
      __dirname,
      "./../../../../../../",
      "public",
      "individuales"
    );
    if (!fs.existsSync(individualesDir)) {
      Logger.trace(
        `Directorio de imágenes no existe, creando - individualesDir: ${individualesDir}`
      );
      fs.mkdirSync(individualesDir, { recursive: true });
      Logger.trace(
        `Directorio de imágenes creado - individualesDir: ${individualesDir}`
      );
    }

    const imagePath = path.join(individualesDir, fileName);
    const buffer = canvas.toBuffer("image/png");
    fs.writeFileSync(imagePath, buffer);
    Logger.info(`Imagen guardada en disco - imagePath: ${imagePath}`);

    /* -------------------- 10 - Preparar y llamar a Pagopar -------------------- */
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

    const tokenForPagopar = crypto
      .createHash("sha1")
      .update(privateToken + id_pedido.toString() + montoTotal)
      .digest("hex");

    const [justName] = fileName.split(".");

    const pagoparPayload = {
      token: tokenForPagopar,
      comprador: {
        ruc: user.document || "5688386-2",
        email: user.email || "santiago.patiasoc@gmail.com",
        nombre: user.name || "santiago",
        telefono: "+595985507615",
        documento: user.document || "5688386",
        razon_social: "",
      },
      public_key: publicToken,
      monto_total: montoTotal,
      moneda: "USD",
      comision_transladada_comprador: true,
      compras_items: [
        {
          nombre: `Coordenadas (${grupo_pixeles.coordenada_x_inicio}, ${grupo_pixeles.coordenada_y_inicio})`,
          cantidad: 1,
          url_imagen: `${Env.get("URL_BACK")}/canvas/img/${justName}`,
          descripcion: `Coordenadas (${grupo_pixeles.coordenada_x_inicio}, ${grupo_pixeles.coordenada_y_inicio})`,
          id_producto: "1",
          precio_total: montoTotal,
        },
      ],
      id_pedido_comercio: id_pedido.toString(),
      descripcion_resumen: `Coordenadas (${grupo_pixeles.coordenada_x_inicio}, ${grupo_pixeles.coordenada_y_inicio})`,
      forma_pago: 26,
    };

    Logger.trace(
      `Payload para Pagopar preparado - ${JSON.stringify(pagoparPayload)}`
    );

    Logger.info(`Enviando petición a Pagopar`);

    const pagoparResponse = await axios.post(
      "https://api.pagopar.com/api/comercios/2.0/iniciar-transaccion-divisa",
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

    // 11. Finalizar transacción y notificar
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
