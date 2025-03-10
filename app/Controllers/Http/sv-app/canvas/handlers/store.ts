import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Database from "@ioc:Adonis/Lucid/Database";
import Env from "@ioc:Adonis/Core/Env";
import Ws from "App/Services/Ws";
import { DateTime } from "luxon";
import crypto from "crypto";
import axios from "axios";

//TODO: Una vez que se confirme el pago, actualizar el estado de los grupos pixeles a pagado

export const store = async ({
  request,
  response,
  auth,
}: HttpContextContract) => {
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
    const { grupo_pixeles, pixeles } = request.all();
    const userId = auth.user?.id;
    if (!userId) {
      await trx.rollback();
      return response.status(401).json({ message: "User ID is not available" });
    }
    const newExpiration = DateTime.local().plus({ minutes: 7 }).toISO();

    // Buscar grupo por coordenadas y estado "en proceso compra" (id_estado = 1)
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
      // El grupo existe, verificar si está expirado
      const fechaExpiracionGrupo = DateTime.fromJSDate(
        new Date(grupoExistente.fecha_expiracion)
      );
      const estaExpirado = DateTime.local() > fechaExpiracionGrupo;

      if (!estaExpirado) {
        // Si el grupo existe y no está expirado, no se hace nada
        await trx.commit();
        params.notification.state = true;
        params.notification.type = "info";
        params.notification.message =
          "El grupo se encuentra activo, sin cambios.";
        return response.json(params);
      } else {
        // Si el grupo existe y está expirado, se renueva la fecha y se actualizan los colores de los píxeles
        grupoId = grupoExistente.id_grupo_pixeles;
        // Renovar fecha de expiración
        await trx
          .from("grupos_pixeles")
          .where("id_grupo_pixeles", grupoId)
          .update({ fecha_expiracion: newExpiration });

        await Promise.all(
          pixeles.map((pixel) => {
            return trx
              .from("pixeles_individuales")
              .where({
                id_grupo_pixeles: grupoId,
                coordenada_x: pixel.coordenada_x,
                coordenada_y: pixel.coordenada_y,
              })
              .update({ color: pixel.color });
          })
        );

        params.notification.state = true;
        params.notification.type = "success";
        params.notification.message =
          "Grupo expirado actualizado correctamente.";
      }
    } else {
      // El grupo no existe, se crea uno nuevo
      const grupoInsert = {
        link_adjunta: grupo_pixeles.link,
        coordenada_x_inicio: grupo_pixeles.coordenada_x_inicio,
        coordenada_y_inicio: grupo_pixeles.coordenada_y_inicio,
        coordenada_x_fin: grupo_pixeles.coordenada_x_fin,
        coordenada_y_fin: grupo_pixeles.coordenada_y_fin,
        id_estado: 1,
        fecha_expiracion: newExpiration,
      };

      const result = await trx
        .table("grupos_pixeles")
        .insert(grupoInsert)
        .returning("id_grupo_pixeles");
      grupoId = result[0].id_grupo_pixeles;

      // Insertar de forma masiva los píxeles individuales del grupo
      const pixelesData = pixeles.map((pixel: any) => ({
        coordenada_x: pixel.coordenada_x,
        coordenada_y: pixel.coordenada_y,
        color: pixel.color,
        id_grupo_pixeles: grupoId,
      }));

      await trx.table("pixeles_individuales").insert(pixelesData);

      params.notification.state = true;
      params.notification.type = "success";
      params.notification.message = "Grupo registrado correctamente.";
    }

    // Insertar el pedido con fecha máxima de pago 7 minutos después del created_at
    const pedido_insert_params = {
      id_grupo_pixeles: grupoId,
      id_usuario: userId,
      monto: 1000, // o monto usd 25
      moneda: 1, //1 gs, 2 usd,
      pagado: false,
      created_at: DateTime.local().toISO(),
      updated_at: DateTime.local().toISO(),
      fecha_maxima_pago: DateTime.local().plus({ minutes: 7 }).toISO(),
    };

    const [{ id_pedido }] = await trx
      .table("pedidos")
      .insert(pedido_insert_params)
      .returning("id_pedido");

    const privateToken = Env.get("PAGOPAR_TOKEN_PRIVADO");
    const montoTotal = "1";

    const tokenForPagopar = crypto
      .createHash("sha1")
      .update(privateToken + id_pedido.toString() + montoTotal)
      .digest("hex");

    const pagoparPayload = {
      token: tokenForPagopar,
      comprador: {
        ruc: "",
        email: "juanperez@gmail.com",
        nombre: "Juan Perez",
        telefono: "+595972200055",
        documento: "1234567",
        razon_social: "",
      },
      public_key: Env.get("PAGOPAR_TOKEN_PUBLICO"),
      monto_total: "1",
      moneda: "USD",
      comision_transladada_comprador: true,
      compras_items: [
        {
          nombre: "Cuota 1/10",
          cantidad: 1,
          url_imagen:
            "https://grupocyc.pe/11674-large_default/cable-de-poder-generico-negro.jpg",
          descripcion: "descripcion del producto",
          id_producto: "1",
          precio_total: "1",
        },
      ],
      id_pedido_comercio: id_pedido.toString(),
      descripcion_resumen: "resumen del producto",
      forma_pago: 9,
    };

    const pagoparResponse = await axios.post(
      // "https://api.pagopar.com/api/comercios/2.0/iniciar-transaccion",
      "https://api.pagopar.com/api/comercios/2.0/iniciar-transaccion-divisa",
      pagoparPayload,
      { headers: { "Content-Type": "application/json" } }
    );

    console.log('=============================');
    console.log('pagopar', pagoparResponse.data)
    console.log('=============================');

    if (
      pagoparResponse.data.respuesta &&
      pagoparResponse.data.resultado &&
      pagoparResponse.data.resultado[0]
    ) {
      const dataToken = pagoparResponse.data.resultado[0].data;
      //número de referencia de pagopar
      const pagopar_pedido_transaccion =
        pagoparResponse.data.resultado[0].pedido;
      params.data = {
        dataToken,
      };

      await trx.from("pedidos").where("id_pedido", id_pedido).update({
        data_token: dataToken,
        pagopar_pedido_transaccion: pagopar_pedido_transaccion,
        token_generado: tokenForPagopar,
      });
    } else {
      throw new Error("Error al generar pedido en Pagopar");
    }

    await trx.commit();
    //para que en el canvas bloquee ocupado
    Ws.io.emit("nuevo_registro");
    params.notification.state = true
    params.notification.type = 'success'
    params.notification.message = 'Pedido Registrado con exito'
    return response.json(params);
  } catch (error) {
    console.log("error", error);
    await trx.rollback();
    return response.status(500).json(params);
  }
};
