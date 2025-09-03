import { BaseTask } from "adonis5-scheduler/build/src/Scheduler/Task";
import { load, CheerioAPI, Cheerio } from "cheerio";
import Database from "@ioc:Adonis/Lucid/Database";
import type { AnyNode } from "domhandler";
import { DateTime } from "luxon";
import axios from "axios";

export default class CotizacionDNITCadaMinuto extends BaseTask {
  public static get schedule() {
    // Cada minuto (en el segundo 0)
    return "0 0 0 * * *";
  }
  public static get useLock() {
    return true;
  }

  // ---------------- utilidades ----------------
  private parseGs(s: string): number {
    // "7.315,93" -> 7315.93
    const t = s
      .replace(/\./g, "")
      .replace(",", ".")
      .replace(/[^\d.]/g, "");
    const n = parseFloat(t);
    if (Number.isNaN(n)) throw new Error(`No se pudo parsear Gs desde "${s}"`);
    return n;
  }
  private norm(s: string) {
    return (s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toUpperCase();
  }

  // Detecta dónde están las columnas de DÓLAR en el thead (compra/venta)
  private findDolarColumnIndexes($: CheerioAPI, $table: Cheerio<AnyNode>) {
    const headerRows = $table.find("thead tr");
    let startIdx: number | null = null;

    headerRows.each((_, tr) => {
      const $cells = $(tr).children("td,th");
      let col = 0;
      $cells.each((__, cell) => {
        const txt = this.norm($(cell).text());
        const span = parseInt($(cell).attr("colspan") || "1", 10);
        if (txt.includes("DOLAR")) {
          startIdx = col; // compra = startIdx, venta = startIdx + 1
        }
        col += span;
      });
    });

    // Fallback a la estructura conocida: día / DÓLAR compra / DÓLAR venta
    if (startIdx == null) return { compraIdx: 1, ventaIdx: 2, detected: false };
    return { compraIdx: startIdx, ventaIdx: startIdx + 1, detected: true };
  }

  // ---------------- scraping DNIT (SET) ----------------
  private async scrapeDNIT(
    fecha: DateTime
  ): Promise<{ ventaGs: number; diaUsado: string }> {
    const url = "https://www.dnit.gov.py/web/portal-institucional/cotizaciones";
    const { data: html, status } = await axios.get<string>(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "text/html,*/*;q=0.8",
        Referer: "https://www.dnit.gov.py/",
      },
      timeout: 20000,
      validateStatus: () => true,
    });
    if (status !== 200) throw new Error(`DNIT HTTP ${status}`);

    const $ = load(html); // <- usar load()
    const $table = $("table.table").first();
    if ($table.length === 0)
      throw new Error('DNIT: no se encontró "table.table"');

    const { ventaIdx } = this.findDolarColumnIndexes($, $table);

    // Recolectar filas del cuerpo con su día (primer <td>)
    const rows: { dayInt: number; $tds: Cheerio<AnyNode> }[] = [];
    $table.find("tbody > tr").each((_, tr) => {
      const $tds = $(tr).find("td");
      const dayTxt = $tds.eq(0).text().trim();
      const dayInt = parseInt(dayTxt, 10);
      if (!Number.isNaN(dayInt)) rows.push({ dayInt, $tds });
    });
    if (!rows.length) throw new Error("DNIT: sin filas numéricas");

    const todayDayInt = parseInt(fecha.toFormat("dd"), 10);

    // Elegir mejor fila: 1) hoy; 2) máximo < hoy; 3) máximo disponible
    let chosen =
      rows.find((r) => r.dayInt === todayDayInt) ||
      rows
        .filter((r) => r.dayInt < todayDayInt)
        .sort((a, b) => b.dayInt - a.dayInt)[0] ||
      rows.sort((a, b) => b.dayInt - a.dayInt)[0];

    const ventaTxt = chosen.$tds.eq(ventaIdx).text().trim();
    if (!ventaTxt) throw new Error("DNIT: no se pudo leer USD venta");

    return {
      ventaGs: this.parseGs(ventaTxt),
      diaUsado: String(chosen.dayInt).padStart(2, "0"),
    };
  }

  // ---------------- tarea ----------------
  public async handle() {
    const zona = "America/Asuncion";
    const hoy = DateTime.now().setZone(zona);
    const hoyISO = hoy.toFormat("yyyy-LL-dd");

    try {
      // 1) Si ya existe para HOY, no insertamos
      const existe = await Database.rawQuery(
        "select 1 from public.cotizaciones where fecha = ? limit 1",
        [hoyISO]
      );
      if (existe?.rows?.length) {
        console.log(
          `[DNIT] Ya existe cotización para ${hoyISO}. No se reemplaza.`
        );
        return;
      }

      // 2) Scraping DNIT (venta USD→Gs) con fallback a día anterior/último
      const { ventaGs, diaUsado } = await this.scrapeDNIT(hoy);

      // 3) Insertar con fecha de HOY
      //    ⚠️ Usar '?' como placeholder y pasar [ventaGs, hoyISO]
      await Database.rawQuery(
        `INSERT INTO public.cotizaciones (monto_venta, fecha)
         VALUES (?, ?)
         ON CONFLICT (fecha) DO NOTHING`,
        [ventaGs, hoyISO]
      );

      console.log(
        `[DNIT] Insert OK — fecha=${hoyISO} venta=${ventaGs}₲ (usando día DNIT=${diaUsado})`
      );
    } catch (err: any) {
      console.error("[DNIT] Error:", err?.message || err);
    }
  }
}
