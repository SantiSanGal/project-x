import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Database from "@ioc:Adonis/Lucid/Database";
import Env from '@ioc:Adonis/Core/Env';
import Ws from "App/Services/Ws";
import { DateTime } from "luxon";
import crypto from 'crypto';
import axios from 'axios';

export const store = async ({ request, response, auth }: HttpContextContract) => {
  let params = {
    notification: {
      state: false,
      type: "error",
      message: "Error en el Servidor",
    },
  };

  const trx = await Database.transaction();

  try {
    const { grupo_pixeles, pixeles } = request.all(); // TODO: Agregar validator
    const userId = auth.user?.id;

    if (userId === undefined) {
      await trx.rollback();
      return response.status(400).json({ message: "User ID is not available" });
    }

    // Insertar grupo de píxeles
    const grupo_pixel_insert_params = {
      link_adjunta: grupo_pixeles.link,
      coordenada_x_inicio: grupo_pixeles.coordenada_x_inicio,
      coordenada_y_inicio: grupo_pixeles.coordenada_y_inicio,
      coordenada_x_fin: grupo_pixeles.coordenada_x_fin,
      coordenada_y_fin: grupo_pixeles.coordenada_y_fin,
    };

    const [{ id_grupo_pixeles }] = await trx
      .table("grupos_pixeles")
      .insert(grupo_pixel_insert_params)
      .returning("id_grupo_pixeles");

    if (id_grupo_pixeles) {
      const pixeles_individuales_insert_params = pixeles.map((pixel: any) => ({
        coordenada_x: pixel.coordenada_x,
        coordenada_y: pixel.coordenada_y,
        color: pixel.color,
        id_grupo_pixeles: id_grupo_pixeles,
      }));
      await trx.table("pixeles_individuales").insert(pixeles_individuales_insert_params);
    }

    // Insertar el pedido con fecha máxima de pago 7 minutos después del created_at
    const pedido_insert_params = {
      id_grupo_pixeles,
      id_usuario: userId,
      created_at: DateTime.local().toISO(),
      updated_at: DateTime.local().toISO(),
      fecha_maxima_pago: DateTime.local().plus({ minutes: 7 }).toISO(),
    };

    const [{ id_pedido }] = await trx
      .table("pedidos")
      .insert(pedido_insert_params)
      .returning("id_pedido");

    console.log('id_pedido', id_pedido);

    const privateToken = Env.get("PAGOPAR_TOKEN_PRIVADO");
    const montoTotal = "1000";
    const tokenForPagopar = crypto
      .createHash("sha1")
      .update(privateToken + id_pedido.toString() + montoTotal)
      .digest("hex");

    // Construir el payload para enviar a la API de Pagopar
    const pagoparPayload = {
      token: tokenForPagopar,
      comprador: {
        ruc: "",
        email: "santiago.patiasoc@gmail.com",
        ciudad: null,
        nombre: "",
        telefono: "",
        direccion: "",
        documento: "12345678",
        coordenadas: "",
        razon_social: "",
        tipo_documento: "CI",
        direccion_referencia: null,
      },
      public_key: Env.get("PAGOPAR_TOKEN_PUBLICO"),
      monto_total: parseInt(montoTotal, 10),
      tipo_pedido: "VENTA-COMERCIO",
      compras_items: [
        {
          ciudad: "1",
          nombre: "Test 1",
          cantidad: 1,
          categoria: "909",
          public_key: Env.get("PAGOPAR_TOKEN_PUBLICO"),
          url_imagen: "",
          descripcion: "Test 1",
          id_producto: 1,
          precio_total: parseInt(montoTotal, 10),
          vendedor_telefono: "",
          vendedor_direccion: "",
          vendedor_direccion_referencia: "",
          vendedor_direccion_coordenadas: ""
        }
      ],
      fecha_maxima_pago: DateTime.local().plus({ minutes: 7 }).toISO(),
      id_pedido_comercio: id_pedido.toString(),
      descripcion_resumen: "",
      forma_pago: 9
    };

    const pagoparResponse = await axios.post(
      'https://api.pagopar.com/api/comercios/2.0/iniciar-transaccion',
      pagoparPayload,
      { headers: { 'Content-Type': 'application/json' } }
    );

    console.log('pagoparResponse', pagoparResponse.data);


    if (
      pagoparResponse.data.respuesta &&
      pagoparResponse.data.resultado &&
      pagoparResponse.data.resultado[0]
    ) {
      const dataToken = pagoparResponse.data.resultado[0].data;

      await trx
        .from("pedidos")
        .where("id_pedido", id_pedido)
        .update({ data_token: dataToken });

    } else {
      throw new Error("Error al generar pedido en Pagopar");
    }

    await trx.commit();
    params.notification.state = true;
    params.notification.type = "success";
    params.notification.message = "Grupo Registrado Correctamente";
    Ws.io.emit("nuevo_registro");
    return response.json(params);
  } catch (error) {
    console.log("error", error);
    await trx.rollback();
    return response.status(500).json(params);
  }
};
