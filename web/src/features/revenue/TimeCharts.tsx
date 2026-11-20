"use client";
import { useMemo, useState } from "react";
import { ChartCard } from "@/components/ChartCard";
import { EChart, type EOption } from "@/components/EChart";
import { base, barStyle, catAxis, legend, tipHead, tipNote, tipRow, valueAxis } from "@/components/chart-kit";
import { Segmented } from "@/components/ui/segmented";
import { brl, brlAxis, dateLabel, monthLabel, num, pct, signedPct, WEEKDAYS } from "@/lib/format";
import { L } from "@/lib/prefs";
import { bucket, dayISO, monthDays, priceVolume, type Gran } from "@/lib/revenue";
import { robustAnomalies, sum } from "@/lib/stats";
import { F, regionName, SRC, type RCtx } from "./ctx";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Cmp = "none" | "prev" | "yoy";

function labelFor(c: RCtx, iso: string, gran: Gran) {
  if (gran === "month") return monthLabel(iso.slice(0, 7), c.lang);
  return dateLabel(iso, c.lang);
}

export function TrendChart({ c }: { c: RCtx }) {
  const [gran, setGran] = useState<Gran>("week");
  const [cmp, setCmp] = useState<Cmp>("prev");
  const { d, region, from, to, ct, lang, t } = c;
  const n = to - from + 1;
  const canPrev = from - n >= 0, canYoy = from - 12 >= 0;
  const effCmp: Cmp = cmp === "prev" && !canPrev ? "none" : cmp === "yoy" && !canYoy ? "none" : cmp;

  const m = useMemo(() => {
    const [a, b] = monthDays(d.calendar, from, to);
    const rev = d.daily[region].revenue, ord = d.daily[region].orders;
    const cur = bucket(d.calendar, rev, a, b, gran);
    const curO = bucket(d.calendar, ord, a, b, gran);
    let comp: number[] | null = null, compLabels: string[] = [];
    if (effCmp !== "none") {
      const [ca, cb] = effCmp === "prev" ? monthDays(d.calendar, from - n, from - 1) : monthDays(d.calendar, from - 12, to - 12);
      const cc = bucket(d.calendar, rev, ca, cb, gran);
      comp = cur.values.map((_, k) => cc.values[k] ?? NaN);
      compLabels = cur.values.map((_, k) => cc.labels[k] ?? "");
    }
    const anomalies = gran === "day" ? robustAnomalies(rev).filter((x) => x.i >= a && x.i < b) : [];
    return { a, b, cur, curO, comp, compLabels, anomalies };
  }, [d, region, from, to, gran, effCmp, n]);

  const option = useMemo<EOption>(() => {
    const labels = m.cur.labels.map((s) => labelFor(c, s, gran));
    const series: any[] = [{
      name: t(L("Período seleccionado", "Selected period")), type: "line", data: m.cur.values.map((v, k) => (m.cur.partial[k] ? null : v)), connectNulls: false, showSymbol: gran === "month", symbolSize: 7,
      lineStyle: { width: 2, color: ct.series[0] }, itemStyle: { color: ct.series[0], borderColor: ct.surface, borderWidth: 2 },
      areaStyle: { color: ct.band }, z: 3,
    }];
    if (m.comp) series.push({
      name: t(effCmp === "prev" ? L("Período anterior", "Previous period") : L("Mismo período año anterior", "Same period last year")),
      type: "line", data: m.comp, showSymbol: false, lineStyle: { width: 1.5, type: "dashed", color: ct.neutral }, itemStyle: { color: ct.neutral },
    });
    if (m.cur.partial.some(Boolean)) series.push({
      name: t(L("Semana/mes incompleto", "Incomplete week/month")), type: "scatter", symbol: "emptyCircle", symbolSize: 8, z: 4,
      itemStyle: { color: ct.series[0], borderWidth: 1.5 },
      data: m.cur.values.map((v, k) => (m.cur.partial[k] ? [k, v] : null)).filter(Boolean),
    });
    if (m.anomalies.length) series.push({
      name: t(L("Día atípico", "Anomalous day")), type: "scatter", symbolSize: 9, z: 4,
      itemStyle: { color: ct.critical, borderColor: ct.surface, borderWidth: 2 },
      data: m.anomalies.map((x) => [x.i - m.a, m.cur.values[x.i - m.a]]),
    });
    return {
      ...base(ct),
      legend: legend(ct),
      grid: { left: 8, right: 16, top: 32, bottom: 8, containLabel: true },
      xAxis: catAxis(ct, labels, { boundaryGap: gran !== "day" ? true : false, axisLabel: { color: ct.text3, fontSize: 11, hideOverlap: true } }),
      yAxis: valueAxis(ct, (v: number) => brlAxis(v, lang)),
      tooltip: {
        ...base(ct).tooltip,
        formatter: (ps: any[]) => {
          const k = ps[0].dataIndex;
          let h = tipHead(labels[k] + (m.cur.partial[k] ? ` (${t(L("parcial", "partial"))})` : ""));
          h += tipRow(ct.series[0], t(L("Ingresos", "Revenue")), brl(m.cur.values[k], lang, false));
          h += tipRow(ct.neutralSoft, t(L("Pedidos", "Orders")), num(m.curO.values[k], lang));
          if (m.comp && Number.isFinite(m.comp[k])) {
            h += tipRow(ct.neutral, `${t(L("Comparación", "Comparison"))} (${labelFor(c, m.compLabels[k], gran)})`, brl(m.comp[k], lang, false));
            h += tipNote(`${t(L("Variación", "Change"))}: ${signedPct(m.cur.values[k] / m.comp[k] - 1, lang)}`);
          }
          const an = m.anomalies.find((x) => x.i - m.a === k);
          if (an) h += tipNote(`${t(L("Atípico", "Anomalous"))}: ${(m.cur.values[k] / an.expected).toFixed(1)}× ${t(L("la mediana móvil", "the rolling median"))}`);
          return h;
        },
      },
      series,
    };
  }, [m, ct, gran, lang, t, effCmp, c]);

  const total = m.cur.values.reduce((x, y) => x + y, 0);
  const complete = m.cur.values.map((v, k) => (m.cur.partial[k] ? NaN : v));
  const iMax = complete.indexOf(Math.max(...complete.filter(Number.isFinite)));
  const iMin = complete.indexOf(Math.min(...complete.filter(Number.isFinite)));
  const compTotal = m.comp ? m.comp.filter(Number.isFinite).reduce((x, y) => x + y, 0) : 0;
  const unit = { day: L("día", "day"), week: L("semana", "week"), month: L("mes", "month") }[gran];
  const obsEs = `Entre ${monthLabel(d.calendar.months[from], "es", true)} y ${monthLabel(d.calendar.months[to], "es", true)}, ${regionName({ ...c, lang: "es" })} facturó ${brl(total, "es")}. ` +
    (iMax >= 0 ? `El punto más alto (${unit.es}) fue ${labelFor({ ...c, lang: "es" }, m.cur.labels[iMax], gran)} con ${brl(complete[iMax], "es")}; el más bajo, ${labelFor({ ...c, lang: "es" }, m.cur.labels[iMin], gran)} con ${brl(complete[iMin], "es")}. ` : "") +
    (m.comp ? `Frente a la comparación elegida, la variación es ${signedPct(total / compTotal - 1, "es")}. ` : "") +
    (gran === "day" ? `Se marcan ${m.anomalies.length} días atípicos (regla robusta mediana/MAD).` : "");
  const obsEn = `Between ${monthLabel(d.calendar.months[from], "en", true)} and ${monthLabel(d.calendar.months[to], "en", true)}, ${regionName({ ...c, lang: "en" })} generated ${brl(total, "en")}. ` +
    (iMax >= 0 ? `The best ${unit.en} was ${labelFor({ ...c, lang: "en" }, m.cur.labels[iMax], gran)} at ${brl(complete[iMax], "en")}; the lowest, ${labelFor({ ...c, lang: "en" }, m.cur.labels[iMin], gran)} at ${brl(complete[iMin], "en")}. ` : "") +
    (m.comp ? `Against the chosen comparison, the change is ${signedPct(total / compTotal - 1, "en")}. ` : "") +
    (gran === "day" ? `${m.anomalies.length} anomalous days are marked (robust median/MAD rule).` : "");

  return (
    <ChartCard
      id="chart-trend"
      title={L("Evolución de ingresos", "Revenue over time")}
      subtitle={L("Ingresos por productos (R$), pedidos válidos, por fecha de compra", "Product revenue (R$), valid orders, by purchase date")}
      filters={[F.region, F.period]}
      source={SRC}
      actions={<>
        <Segmented label={t(L("Granularidad", "Granularity"))} value={gran} onChange={setGran}
          options={[{ value: "day", label: t(L("Día", "Day")) }, { value: "week", label: t(L("Semana", "Week")) }, { value: "month", label: t(L("Mes", "Month")) }]} />
        <Segmented label={t(L("Comparar con", "Compare with"))} value={effCmp} onChange={setCmp}
          options={[
            { value: "none", label: t(L("Sin comparar", "No comparison")) },
            ...(canPrev ? [{ value: "prev" as Cmp, label: t(L("Período anterior", "Previous period")) }] : []),
            ...(canYoy ? [{ value: "yoy" as Cmp, label: t(L("Año anterior", "Last year")) }] : []),
          ]} />
      </>}
      table={{
        columns: [t(L("Período", "Period")), t(L("Ingresos (R$)", "Revenue (R$)")), t(L("Pedidos", "Orders"))],
        rows: m.cur.labels.map((s, k) => [labelFor(c, s, gran), num(m.cur.values[k], lang, 2), num(m.curO.values[k], lang)]),
      }}
      empty={total === 0}
      explain={{
        measures: L("Suma del precio de los productos (sin flete) de pedidos válidos —todos menos cancelados o no disponibles—, asignada a la fecha de compra.",
          "Sum of product prices (excluding freight) of valid orders —all but canceled or unavailable—, assigned to the purchase date."),
        observed: { es: obsEs, en: obsEn },
        implications: L("La comparación muestra si un cambio es estructural (se mantiene semanas) o puntual (un evento como Black Friday).",
          "The comparison shows whether a change is structural (persists for weeks) or one-off (an event like Black Friday)."),
        decisions: L("Cuándo reforzar stock o campañas, y qué semanas revisar con el equipo comercial.",
          "When to reinforce stock or campaigns, and which weeks to review with the sales team."),
        limits: L("Los datos de Olist se interrumpen hacia el 22-08-2018: la ventana termina en julio 2018. Semanas en los bordes pueden ser parciales (se indica en el tooltip).",
          "Olist data stops around 2018-08-22: the window ends in July 2018. Edge weeks may be partial (flagged in the tooltip)."),
      }}
    >
      <EChart option={option} height={330} label={t(L("Gráfico de líneas de ingresos en el tiempo", "Line chart of revenue over time"))} />
    </ChartCard>
  );
}

export function WeekdayChart({ c }: { c: RCtx }) {
  const { d, region, from, to, ct, lang, t } = c;
  const v = useMemo(() => {
    const [a, b] = monthDays(d.calendar, from, to);
    const s = new Array(7).fill(0), cnt = new Array(7).fill(0), o = new Array(7).fill(0);
    for (let k = a; k < b; k++) {
      const wd = (new Date(dayISO(d.calendar, k) + "T00:00:00Z").getUTCDay() + 6) % 7;
      s[wd] += d.daily[region].revenue[k]; o[wd] += d.daily[region].orders[k]; cnt[wd]++;
    }
    return { avg: s.map((x, i) => (cnt[i] ? x / cnt[i] : 0)), ord: o.map((x, i) => (cnt[i] ? x / cnt[i] : 0)), cnt };
  }, [d, region, from, to]);
  const days = WEEKDAYS[lang];
  const iMax = v.avg.indexOf(Math.max(...v.avg)), iMin = v.avg.indexOf(Math.min(...v.avg));
  const option = useMemo<EOption>(() => ({
    ...base(ct),
    xAxis: catAxis(ct, days),
    yAxis: valueAxis(ct, (x: number) => brlAxis(x, lang)),
    tooltip: { ...base(ct).tooltip, axisPointer: { type: "shadow", shadowStyle: { color: ct.grid, opacity: 0.5 } },
      formatter: (ps: any[]) => { const k = ps[0].dataIndex; return tipHead(days[k]) + tipRow(ct.series[0], t(L("Ingreso medio por día", "Average revenue per day")), brl(v.avg[k], lang, false)) + tipRow(ct.neutralSoft, t(L("Pedidos medios", "Average orders")), num(v.ord[k], lang, 1)) + tipNote(`${v.cnt[k]} ${t(L("días en el período", "days in the period"))}`); } },
    series: [{ type: "bar", barMaxWidth: 34, data: v.avg.map((x, i) => ({ value: x, itemStyle: barStyle(i === iMax ? ct.series[0] : ct.neutral) })) }],
  }), [v, ct, lang, t, days, iMax]);
  return (
    <ChartCard title={L("Ingreso promedio por día de la semana", "Average revenue by weekday")} subtitle={L("R$ por día calendario", "R$ per calendar day")}
      filters={[F.region, F.period]} source={SRC} empty={!v.avg.some((x) => x > 0)}
      table={{ columns: [t(L("Día", "Day")), t(L("Ingreso medio (R$)", "Avg revenue (R$)")), t(L("Pedidos medios", "Avg orders"))], rows: days.map((x, i) => [x, num(v.avg[i], lang, 0), num(v.ord[i], lang, 1)]) }}
      explain={{
        measures: L("Ingreso total de cada día de la semana dividido por cuántos de esos días hay en el período (corrige que no todos los días aparecen igual número de veces).",
          "Total revenue for each weekday divided by how many of those days fall in the period (corrects for unequal counts)."),
        observed: { es: `${WEEKDAYS.es[iMax]} es el día más fuerte (${brl(v.avg[iMax], "es")} promedio) y ${WEEKDAYS.es[iMin]} el más débil (${brl(v.avg[iMin], "es")}), una diferencia de ${pct(v.avg[iMax] / v.avg[iMin] - 1, "es", 0)}.`,
          en: `${WEEKDAYS.en[iMax]} is the strongest day (${brl(v.avg[iMax], "en")} on average) and ${WEEKDAYS.en[iMin]} the weakest (${brl(v.avg[iMin], "en")}), a ${pct(v.avg[iMax] / v.avg[iMin] - 1, "en", 0)} gap.` },
        implications: L("El patrón semanal define cuándo conviene lanzar campañas o reforzar atención.", "The weekly pattern indicates when to launch campaigns or reinforce support."),
        decisions: L("Calendario de promociones y turnos de atención al cliente.", "Promotion calendar and customer-service shifts."),
        limits: L("Se usa la hora de compra registrada por Olist (zona horaria no documentada).", "Uses Olist's recorded purchase time (time zone undocumented)."),
      }}>
      <EChart option={option} height={260} label={t(L("Barras de ingreso promedio por día de la semana", "Bars of average revenue by weekday"))} />
    </ChartCard>
  );
}

export function HeatmapChart({ c }: { c: RCtx }) {
  const { d, region, from, to, ct, lang, t } = c;
  const grid = useMemo(() => {
    const g = new Array(168).fill(0);
    for (let m = from; m <= to; m++) d.heat[region][m].forEach((v, k) => { g[k] += v; });
    return g;
  }, [d, region, from, to]);
  const total = sum(grid), max = Math.max(...grid);
  const kMax = grid.indexOf(max);
  const night = [0, 1, 2, 3, 4, 5].reduce((s, h) => s + [0, 1, 2, 3, 4, 5, 6].reduce((x, w) => x + grid[w * 24 + h], 0), 0);
  const days = WEEKDAYS[lang];
  const option = useMemo<EOption>(() => ({
    ...base(ct),
    grid: { left: 8, right: 16, top: 8, bottom: 52, containLabel: true },
    tooltip: { ...base(ct).tooltip, trigger: "item", formatter: (p: any) => tipHead(`${days[p.value[1]]} ${String(p.value[0]).padStart(2, "0")}:00–${String(p.value[0]).padStart(2, "0")}:59`) + tipRow(ct.series[0], t(L("Pedidos", "Orders")), num(p.value[2], lang)) + tipNote(pct(p.value[2] / total, lang, 2) + " " + t(L("del total", "of total"))) },
    xAxis: catAxis(ct, Array.from({ length: 24 }, (_, h) => String(h)), { name: t(L("Hora del día", "Hour of day")), nameLocation: "middle", nameGap: 24, splitArea: { show: false } }),
    yAxis: catAxis(ct, days, { inverse: true }),
    visualMap: { min: 0, max, calculable: false, orient: "horizontal", left: "center", bottom: 0, itemHeight: 140, itemWidth: 10, text: [t(L("más pedidos", "more orders")), "0"], textStyle: { color: ct.text3, fontSize: 11 }, inRange: { color: ct.seq } },
    series: [{ type: "heatmap", data: grid.map((v, k) => [k % 24, Math.floor(k / 24), v]), itemStyle: { borderColor: ct.surface, borderWidth: 2, borderRadius: 2 }, emphasis: { itemStyle: { borderColor: ct.text, borderWidth: 1 } } }],
  }), [grid, ct, lang, t, days, max, total]);
  return (
    <ChartCard title={L("Pedidos por día y hora", "Orders by weekday and hour")} subtitle={L("Número de pedidos válidos", "Number of valid orders")}
      filters={[F.region, F.period]} source={SRC} empty={total === 0}
      table={{ columns: [t(L("Día", "Day")), ...Array.from({ length: 24 }, (_, h) => `${h}h`)], rows: days.map((x, w) => [x, ...grid.slice(w * 24, w * 24 + 24)]) }}
      explain={{
        measures: L("Conteo de pedidos válidos por día de la semana y hora de compra.", "Count of valid orders by weekday and purchase hour."),
        observed: { es: `El pico está el ${WEEKDAYS.es[Math.floor(kMax / 24)].toLowerCase()} a las ${kMax % 24}:00 (${num(max, "es")} pedidos). Entre las 0 y las 6 h se concentra solo ${pct(night / total, "es")} de los pedidos.`,
          en: `The peak is ${WEEKDAYS.en[Math.floor(kMax / 24)]} at ${kMax % 24}:00 (${num(max, "en")} orders). Only ${pct(night / total, "en")} of orders happen between 0 and 6 am.` },
        implications: L("La demanda se concentra en horario diurno de días laborales; la noche es marginal.", "Demand concentrates in weekday daytime; nights are marginal."),
        decisions: L("Horarios de envío de campañas, ventanas de mantenimiento y dotación de soporte.", "Campaign send times, maintenance windows and support staffing."),
        limits: L("Mide pedidos, no visitas: no muestra cuándo la gente navega sin comprar.", "Measures orders, not visits: it does not show browsing without purchase."),
      }}>
      <EChart option={option} height={300} label={t(L("Mapa de calor de pedidos por día y hora", "Heatmap of orders by weekday and hour"))} />
    </ChartCard>
  );
}

export function PriceVolumeChart({ c }: { c: RCtx }) {
  const { d, region, from, to, ct, lang, t } = c;
  const rows = useMemo(() => priceVolume(d, region, from, to), [d, region, from, to]);
  const labels = rows.map((r) => monthLabel(r.month, lang));
  const volMonths = rows.filter((r) => Math.abs(r.volume) >= Math.abs(r.ticket)).length;
  const option = useMemo<EOption>(() => ({
    ...base(ct), legend: legend(ct), grid: { left: 8, right: 16, top: 34, bottom: 8, containLabel: true },
    xAxis: catAxis(ct, labels), yAxis: valueAxis(ct, (x: number) => brlAxis(x, lang)),
    tooltip: { ...base(ct).tooltip, axisPointer: { type: "shadow", shadowStyle: { color: ct.grid, opacity: 0.5 } }, formatter: (ps: any[]) => {
      const r = rows[ps[0].dataIndex];
      return tipHead(monthLabel(r.month, lang, true)) + tipRow(ct.series[0], t(L("Efecto volumen", "Volume effect")), brl(r.volume, lang, false)) + tipRow(ct.series[1], t(L("Efecto ticket", "Ticket effect")), brl(r.ticket, lang, false)) + tipRow(ct.text, t(L("Cambio total vs mes anterior", "Total change vs prior month")), brl(r.total, lang, false));
    } },
    series: [
      { name: t(L("Efecto volumen (más/menos pedidos)", "Volume effect (more/fewer orders)")), type: "bar", stack: "pv", data: rows.map((r) => r.volume), itemStyle: { color: ct.series[0], borderColor: ct.surface, borderWidth: 1 }, barMaxWidth: 28 },
      { name: t(L("Efecto ticket (pedido más/menos caro)", "Ticket effect (pricier/cheaper orders)")), type: "bar", stack: "pv", data: rows.map((r) => r.ticket), itemStyle: { color: ct.series[1], borderColor: ct.surface, borderWidth: 1 }, barMaxWidth: 28 },
      { name: t(L("Cambio total", "Total change")), type: "line", data: rows.map((r) => r.total), symbol: "circle", symbolSize: 7, lineStyle: { width: 0 }, itemStyle: { color: ct.text, borderColor: ct.surface, borderWidth: 2 } },
    ],
  }), [rows, ct, lang, t, labels]);
  return (
    <ChartCard id="chart-drivers" title={L("¿Qué explica la variación mensual del ingreso?", "What drives month-to-month revenue change?")}
      subtitle={L("Descomposición precio-volumen, R$ vs mes anterior", "Price-volume decomposition, R$ vs prior month")}
      filters={[F.region, F.period]} source={SRC} empty={!rows.length}
      table={{ columns: [t(L("Mes", "Month")), t(L("Volumen", "Volume")), t(L("Ticket", "Ticket")), t(L("Total", "Total"))], rows: rows.map((r) => [monthLabel(r.month, lang, true), num(r.volume, lang), num(r.ticket, lang), num(r.total, lang)]) }}
      explain={{
        measures: L("ΔIngreso = ΔPedidos × Ticket₀ + Pedidos₁ × ΔTicket. Separa cuánto del cambio viene de vender más pedidos y cuánto de pedidos más caros.",
          "ΔRevenue = ΔOrders × Ticket₀ + Orders₁ × ΔTicket. Splits change into more orders vs pricier orders."),
        observed: { es: `En ${volMonths} de ${rows.length} meses el efecto volumen pesa más que el efecto ticket: el ingreso se mueve principalmente por cantidad de pedidos.`,
          en: `In ${volMonths} of ${rows.length} months the volume effect outweighs the ticket effect: revenue moves mainly with order count.` },
        implications: L("Si el volumen domina, las palancas son adquisición y conversión más que precio.", "If volume dominates, the levers are acquisition and conversion rather than price."),
        decisions: L("Dónde enfocar: campañas de tráfico vs. estrategia de surtido y precio.", "Where to focus: traffic campaigns vs. assortment and pricing strategy."),
        limits: L("Es una identidad contable, no un modelo causal: no dice por qué cambió el volumen.", "It is an accounting identity, not a causal model: it does not say why volume changed."),
      }}>
      <EChart option={option} height={300} label={t(L("Barras apiladas de efectos volumen y ticket por mes", "Stacked bars of volume and ticket effects by month"))} />
    </ChartCard>
  );
}

export function AnomalyCard({ c }: { c: RCtx }) {
  const { d, region, from, to, ct, lang, t } = c;
  const list = useMemo(() => {
    const [a, b] = monthDays(d.calendar, from, to);
    const rev = d.daily[region].revenue;
    return robustAnomalies(rev).filter((x) => x.i >= a && x.i < b).map((x) => ({ date: dayISO(d.calendar, x.i), value: rev[x.i], expected: x.expected, z: x.z }));
  }, [d, region, from, to]);
  const labels = list.map((x) => dateLabel(x.date, lang));
  const option = useMemo<EOption>(() => ({
    ...base(ct), legend: legend(ct), grid: { left: 8, right: 24, top: 32, bottom: 8, containLabel: true },
    yAxis: catAxis(ct, labels, { inverse: true }), xAxis: valueAxis(ct, (x: number) => brlAxis(x, lang)),
    tooltip: { ...base(ct).tooltip, axisPointer: { type: "shadow", shadowStyle: { color: ct.grid, opacity: 0.5 } }, formatter: (ps: any[]) => { const x = list[ps[0].dataIndex]; return tipHead(dateLabel(x.date, lang)) + tipRow(ct.series[7], t(L("Real", "Actual")), brl(x.value, lang, false)) + tipRow(ct.neutral, t(L("Esperado (mediana 28 días)", "Expected (28-day median)")), brl(x.expected, lang, false)) + tipNote(`z robusto ${x.z.toFixed(1)}`); } },
    series: [
      { name: t(L("Esperado", "Expected")), type: "bar", data: list.map((x) => x.expected), itemStyle: barStyle(ct.neutral, true), barGap: "15%", barMaxWidth: 14 },
      { name: t(L("Real", "Actual")), type: "bar", data: list.map((x) => x.value), itemStyle: barStyle(ct.series[7], true), barMaxWidth: 14 },
    ],
  }), [list, labels, ct, lang, t]);
  const top = [...list].sort((a, b) => b.value / b.expected - a.value / a.expected)[0];
  return (
    <ChartCard title={L("Cambios inusuales en los ingresos", "Unusual revenue changes")} subtitle={L("Días cuyo ingreso se aleja de la mediana móvil de 28 días (|z robusto| > 3,5)", "Days whose revenue departs from the 28-day rolling median (|robust z| > 3.5)")}
      filters={[F.region, F.period]} source={SRC} empty={!list.length}
      table={{ columns: [t(L("Fecha", "Date")), t(L("Real", "Actual")), t(L("Esperado", "Expected")), "z"], rows: list.map((x) => [dateLabel(x.date, lang), num(x.value, lang), num(x.expected, lang), x.z.toFixed(1)]) }}
      explain={{
        measures: L("Detección robusta: z = 0,6745·(x − mediana)/MAD sobre una ventana centrada de 28 días. La misma regla corre en el pipeline Python y en el navegador (probado).",
          "Robust detection: z = 0.6745·(x − median)/MAD over a centred 28-day window. The same rule runs in the Python pipeline and in the browser (tested)."),
        observed: top ? { es: `${list.length} días atípicos en el filtro. El mayor: ${dateLabel(top.date, "es")}, ${(top.value / top.expected).toFixed(1)} veces lo esperado.`, en: `${list.length} anomalous days in the filter. Largest: ${dateLabel(top.date, "en")}, ${(top.value / top.expected).toFixed(1)}× expected.` }
          : L("No hay días atípicos con esta combinación de filtros.", "No anomalous days for this filter combination."),
        implications: L("Separa eventos (Black Friday, promociones) de la tendencia, para no confundir un pico con crecimiento.", "Separates events (Black Friday, promotions) from trend, so a spike is not mistaken for growth."),
        decisions: L("Qué días investigar: campañas, fallas de registro o eventos externos.", "Which days to investigate: campaigns, logging issues or external events."),
        limits: L("Una regla estadística no sabe la causa; los primeros y últimos 14 días tienen ventana incompleta.", "A statistical rule does not know the cause; the first and last 14 days have an incomplete window."),
      }}>
      <EChart option={option} height={Math.max(180, 40 + list.length * 34)} label={t(L("Barras de días atípicos: real frente a esperado", "Bars of anomalous days: actual vs expected"))} />
    </ChartCard>
  );
}
