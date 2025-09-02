import { BaseTask } from "adonis5-scheduler/build/src/Scheduler/Task";
import Database from "@ioc:Adonis/Lucid/Database";
import * as cheerio from "cheerio";
import { DateTime } from "luxon";
import axios from "axios";

/**
 * ScrapCotizacion
 * - Corre 1 vez por día (15:00 America/Asuncion por seguridad: la referencia del BCP
 *   se publica tras el cierre del tramo 13:00 aprox).
 * - Extrae la fila USD del cuadro y guarda ₲/ME en la tabla `cotizaciones`.
 * - Si ya existe la fecha, actualiza `monto_venta`.
 */
export default class ScrapCotizacion extends BaseTask {
  // 15:00 todos los días (segundos, minutos, hora, día, mes, día-semana)
  // Ajusta si querés otra hora: '0 0 0 * * *' = medianoche, '0 0 6 * * *' = 06:00, etc.
  public static get schedule() {
    return "0 0 0 * * *";
  }

  public static get useLock() {
    // Evita doble ejecución si por accidente levantás 2 schedulers
    return true;
  }

  private parseGs(texto: string): number {
    // Ej: "7.302,80" -> 7302.80
    const normalizado = texto
      .replace(/\./g, "")
      .replace(",", ".")
      .replace(/[^\d.]/g, "");
    const valor = parseFloat(normalizado);
    if (Number.isNaN(valor)) {
      throw new Error(`No se pudo parsear monto Gs desde "${texto}"`);
    }
    return valor;
  }

  public async handle() {
    const zona = "America/Asuncion";
    const url = "https://www.bcp.gov.py/webapps/web/cotizacion/monedas";

    try {
      const { data: html } = await axios.get<string>(url, {
        timeout: 20000,
        headers: {
          "User-Agent": "project-x-scraper/1.0 (+production)",
        },
      });

      const $ = cheerio.load(html);

      // 1) Tomamos la fecha que renderiza el servidor (dd/mm/yyyy)
      const fechaTexto =
        $("#fecha").attr("value") || $("#dp_cotizacion").attr("value") || ""; // fallback

      if (!fechaTexto) {
        throw new Error("No se encontró la fecha en la página");
      }

      // dd/mm/yyyy -> yyyy-MM-dd
      const [dd, mm, yyyy] = fechaTexto.split("/");
      const fechaISO = `${yyyy}-${mm}-${dd}`;

      // 2) Buscamos la fila del USD en el cuadro
      const usdRow = $("#cotizacion-interbancaria tbody tr")
        .filter((_, el) => {
          const celdas = $(el).find("td");
          // Hay filas de encabezado sin <td>; filtramos
          if (celdas.length < 4) return false;
          const code = celdas.eq(1).text().trim();
          return code === "USD";
        })
        .first();

      if (usdRow.length === 0) {
        throw new Error("No se encontró la fila del USD en la tabla");
      }

      // 3) La 4ta columna (índice 3) es "₲ / ME"
      const valorGsTexto = usdRow.find("td").eq(3).text().trim();
      const montoGs = this.parseGs(valorGsTexto);

      // 4) Insertar/actualizar en DB
      await Database.connection("pg").transaction(async (trx) => {
        // Si tenés UNIQUE(fecha) en la tabla, podés hacer UPSERT directo.
        // Como no sabemos tu constraint, hacemos "merge" manual.
        const existente = await trx
          .from("cotizaciones")
          .where("fecha", fechaISO)
          .first();

        if (existente) {
          await trx
            .from("cotizaciones")
            .where("id", existente.id)
            .update({
              monto_venta: montoGs,
              fecha: fechaISO,
              updated_at: DateTime.now().setZone(zona).toISO(),
            });
        } else {
          // Siguiendo tu SQL: usa la secuencia y CURRENT_DATE si querés,
          // pero insertamos la fecha de la página (fechaISO) para coherencia.
          await trx.rawQuery(
            `INSERT INTO public.cotizaciones (id, monto_venta, fecha)
             VALUES (nextval('cotizaciones_id_seq'), $1, $2)`,
            [montoGs, fechaISO]
          );
        }
      });

      console.log(
        `[ScrapCotizacion] Guardado OK — fecha=${fechaISO} monto_venta=${montoGs}₲`
      );
    } catch (err: any) {
      console.error("[ScrapCotizacion] Error:", err?.message || err);
    }
  }
}
