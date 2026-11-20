"use client";
import { useMemo, useState } from "react";
import { ChartCard } from "@/components/ChartCard";
import { EChart, type EOption } from "@/components/EChart";
import { base, barStyle, catAxis, legend, tipHead, tipNote, tipRow, valueAxis } from "@/components/chart-kit";
import { Segmented } from "@/components/ui/segmented";
import { brl, brlAxis, monthLabel, num, pct, signedPct } from "@/lib/format";
import { L, type Bi } from "@/lib/prefs";
import { sum } from "@/lib/stats";
import { catName, F, regionName, SRC, type RCtx } from "./ctx";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Metric = "revenue" | "orders" | "units";
const METRIC: Record<Metric, Bi> = { revenue: L("Ingresos", "Revenue"), orders: L("Pedidos", "Orders"), units: L("Unidades", "Units") };

function catTotals(c: RCtx) {
  const cm = c.d.catMonthly[c.region];
  return c.d.categories.map((k, i) => ({
    id: k.id,
    revenue: sum(cm.revenue[i], c.from, c.to + 1),
    orders: sum(cm.orders[i], c.from, c.to + 1),
    units: sum(cm.units[i], c.from, c.to + 1),
  }));
}

export function CategoryRanking({ c }: { c: RCtx }) {
  const { ct, lang, t } = c;
  const [metric, setMetric] = useState<Metric>("revenue");
  const all = useMemo(() => catTotals(c), [c]);
  const total = all.reduce((s, x) => s + x[metric], 0);
  const top = [...all].sort((a, b) => b[metric] - a[metric]).slice(0, 12);
  const active = all.filter((x) => x.revenue > 0).length;
  const top3 = top.slice(0, 3).reduce((s, x) => s + x[metric], 0) / (total || 1);
  const fmt = (v: number) => (metric === "revenue" ? brlAxis(v, lang) : num(v, lang));
  const names = top.map((x) => catName(c, x.id));
  const option = useMemo<EOption>(() => ({
    ...base(ct), grid: { left: 8, right: 64, top: 8, bottom: 8, containLabel: true },
    yAxis: catAxis(ct, names, { inverse: true, axisLabel: { color: ct.text2, fontSize: 11.5, width: 150, overflow: "truncate" } }),
    xAxis: valueAxis(ct, fmt),
    tooltip: { ...base(ct).tooltip, axisPointer: { type: "shadow", shadowStyle: { color: ct.grid, opacity: 0.5 } }, formatter: (ps: any[]) => {
      const x = top[ps[0].dataIndex];
      return tipHead(names[ps[0].dataIndex]) + tipRow(ct.series[0], t(L("Ingresos", "Revenue")), brl(x.revenue, lang, false)) + tipRow(ct.neutral, t(L("Pedidos", "Orders")), num(x.orders, lang)) + tipRow(ct.neutral, t(L("Unidades", "Units")), num(x.units, lang)) + tipNote(`${pct(x[metric] / total, lang)} ${t(L("del total", "of total"))} · ${t(L("ticket por pedido", "revenue per order"))} ${brl(x.revenue / x.orders, lang, false)}`);
    } },
    series: [{ type: "bar", barMaxWidth: 18, data: top.map((x, i) => ({ value: x[metric], itemStyle: barStyle(i === 0 ? ct.series[0] : ct.neutral, true) })),
      label: { show: true, position: "right", color: ct.text2, fontSize: 11, formatter: (p: any) => pct(p.value / total, lang) } }],
  }), [top, ct, lang, t, names, total, metric]);
  return (
    <ChartCard id="chart-categories" title={L("Ranking de categorías", "Category ranking")} subtitle={L("Top 12; la etiqueta muestra la participación en el total", "Top 12; label shows share of total")}
      filters={[F.region, F.period]} source={SRC} empty={total === 0}
      actions={<Segmented label={t(L("Métrica", "Metric"))} value={metric} onChange={setMetric} options={(Object.keys(METRIC) as Metric[]).map((m) => ({ value: m, label: t(METRIC[m]) }))} />}
      table={{ columns: [t(L("Categoría", "Category")), t(L("Ingresos (R$)", "Revenue (R$)")), t(L("Pedidos", "Orders")), t(L("Unidades", "Units")), t(L("Participación", "Share"))],
        rows: [...all].sort((a, b) => b[metric] - a[metric]).filter((x) => x.revenue > 0).map((x) => [catName(c, x.id), num(x.revenue, lang), num(x.orders, lang), num(x.units, lang), pct(x[metric] / total, lang)]) }}
      explain={{
        measures: L("Ingresos (precio de productos), pedidos que contienen la categoría y unidades vendidas. Un pedido con dos categorías cuenta en ambas para «pedidos».",
          "Revenue (product price), orders containing the category and units sold. An order with two categories counts in both for “orders”."),
        observed: { es: `Por ${METRIC[metric].es.toLowerCase()}, lidera ${catName({ ...c, lang: "es" }, top[0]?.id ?? "")} con ${pct((top[0]?.[metric] ?? 0) / total, "es")}; las tres primeras suman ${pct(top3, "es")}. ${active} categorías registran ventas en el filtro.`,
          en: `By ${METRIC[metric].en.toLowerCase()}, ${catName({ ...c, lang: "en" }, top[0]?.id ?? "")} leads with ${pct((top[0]?.[metric] ?? 0) / total, "en")}; the top three add up to ${pct(top3, "en")}. ${active} categories have sales in the filter.` },
        implications: L("Cambiar la métrica revela categorías de alto volumen y bajo ticket (y viceversa).", "Switching the metric reveals high-volume, low-ticket categories (and vice versa)."),
        decisions: L("Priorización de surtido, negociación con vendedores y foco de campañas.", "Assortment priorities, seller negotiations and campaign focus."),
        limits: L("Sin costos ni comisiones no se puede ordenar por rentabilidad.", "Without costs or commissions, categories cannot be ranked by profitability."),
      }}>
      <EChart option={option} height={380} label={t(L("Barras horizontales de categorías", "Horizontal bars of categories"))} />
    </ChartCard>
  );
}

export function CategoryEvolution({ c }: { c: RCtx }) {
  const { d, region, from, to, ct, lang, t } = c;
  const [mode, setMode] = useState<"abs" | "share">("abs");
  const cm = d.catMonthly[region].revenue;
  const months = d.calendar.months.slice(from, to + 1);
  const totals = months.map((_, k) => cm.reduce((s, row) => s + row[from + k], 0));
  const top = useMemo(() => catTotals(c).sort((a, b) => b.revenue - a.revenue).slice(0, 5).map((x) => x.id), [c]);
  const series = top.map((id) => {
    const i = d.categories.findIndex((k) => k.id === id);
    const vals = cm[i].slice(from, to + 1);
    return { id, vals: mode === "abs" ? vals : vals.map((v, k) => (totals[k] ? v / totals[k] : 0)) };
  });
  const labels = months.map((m) => monthLabel(m, lang));
  const fmt = (v: number) => (mode === "abs" ? brlAxis(v, lang) : pct(v, lang, 0));
  const option = useMemo<EOption>(() => ({
    ...base(ct), legend: legend(ct, { type: "scroll" }), grid: { left: 8, right: 16, top: 34, bottom: 8, containLabel: true },
    xAxis: catAxis(ct, labels, { boundaryGap: false }), yAxis: valueAxis(ct, fmt),
    tooltip: { ...base(ct).tooltip, formatter: (ps: any[]) => tipHead(monthLabel(months[ps[0].dataIndex], lang, true)) + ps.sort((a, b) => b.value - a.value).map((p) => tipRow(p.color, p.seriesName, fmt(p.value))).join("") },
    series: series.map((s, k) => ({ name: catName(c, s.id), type: "line", data: s.vals, showSymbol: months.length < 8, symbolSize: 6, lineStyle: { width: 2 }, itemStyle: { color: ct.series[k], borderColor: ct.surface, borderWidth: 2 } })),
  }), [series, ct, lang, labels, months, c, fmt]);
  const growth = series.map((s) => ({ id: s.id, g: s.vals[0] ? s.vals[s.vals.length - 1] / s.vals[0] - 1 : NaN })).filter((x) => Number.isFinite(x.g)).sort((a, b) => b.g - a.g);
  return (
    <ChartCard title={L("Evolución de las 5 categorías principales", "Top-5 category trends")} subtitle={L("Ingresos mensuales o participación en el ingreso del mes", "Monthly revenue or share of the month's revenue")}
      filters={[F.region, F.period]} source={SRC} empty={months.length < 2 || !top.length}
      actions={<Segmented label={t(L("Escala", "Scale"))} value={mode} onChange={setMode} options={[{ value: "abs", label: "R$" }, { value: "share", label: t(L("% del mes", "% of month")) }]} />}
      table={{ columns: [t(L("Mes", "Month")), ...top.map((id) => catName(c, id))], rows: months.map((m, k) => [monthLabel(m, lang, true), ...series.map((s) => (mode === "abs" ? num(s.vals[k], lang) : pct(s.vals[k], lang)))]) }}
      explain={{
        measures: L("Ingreso mensual de las cinco categorías con más ingreso en el filtro; en «% del mes», su peso sobre el ingreso total de ese mes.", "Monthly revenue of the five top categories in the filter; in “% of month”, their weight in that month's total."),
        observed: growth.length ? { es: `Comparando el primer y último mes del filtro, ${catName({ ...c, lang: "es" }, growth[0].id)} crece más (${signedPct(growth[0].g, "es", 0)}) y ${catName({ ...c, lang: "es" }, growth[growth.length - 1].id)} menos (${signedPct(growth[growth.length - 1].g, "es", 0)}).`,
          en: `Comparing the first and last month in the filter, ${catName({ ...c, lang: "en" }, growth[0].id)} grows most (${signedPct(growth[0].g, "en", 0)}) and ${catName({ ...c, lang: "en" }, growth[growth.length - 1].id)} least (${signedPct(growth[growth.length - 1].g, "en", 0)}).` }
          : L("Selecciona al menos dos meses para ver tendencias.", "Select at least two months to see trends."),
        implications: L("La vista de participación separa el crecimiento propio de la categoría del crecimiento general del marketplace.", "The share view separates a category's own growth from overall marketplace growth."),
        decisions: L("Qué categorías ganan o pierden relevancia y merecen revisión de surtido.", "Which categories gain or lose relevance and deserve an assortment review."),
        limits: L("Comparar primer y último mes es sensible a meses atípicos (p. ej. noviembre).", "Comparing first and last month is sensitive to unusual months (e.g. November)."),
      }}>
      <EChart option={option} height={320} label={t(L("Líneas de ingreso mensual por categoría", "Lines of monthly revenue by category"))} />
    </ChartCard>
  );
}

export function CategoryScatter({ c }: { c: RCtx }) {
  const { ct, lang, t } = c;
  const pts = useMemo(() => catTotals(c).filter((x) => x.orders >= 20).sort((a, b) => b.revenue - a.revenue).slice(0, 30), [c]);
  const maxR = Math.max(...pts.map((p) => p.revenue), 1);
  const medTicket = [...pts.map((p) => p.revenue / p.orders)].sort((a, b) => a - b)[Math.floor(pts.length / 2)] ?? 0;
  const option = useMemo<EOption>(() => ({
    ...base(ct), grid: { left: 8, right: 24, top: 16, bottom: 30, containLabel: true },
    xAxis: valueAxis(ct, (v: number) => num(v, lang), { type: "log", name: t(L("Pedidos (escala log)", "Orders (log scale)")), nameLocation: "middle", nameGap: 26 }),
    yAxis: valueAxis(ct, (v: number) => brlAxis(v, lang), { name: t(L("Ingreso por pedido", "Revenue per order")), nameLocation: "end" }),
    tooltip: { ...base(ct).tooltip, trigger: "item", formatter: (p: any) => { const x = pts[p.dataIndex]; return tipHead(catName(c, x.id)) + tipRow(ct.series[0], t(L("Pedidos", "Orders")), num(x.orders, lang)) + tipRow(ct.series[0], t(L("Ingreso por pedido", "Revenue per order")), brl(x.revenue / x.orders, lang, false)) + tipRow(ct.neutral, t(L("Ingresos", "Revenue")), brl(x.revenue, lang, false)); } },
    series: [{ type: "scatter", data: pts.map((p) => [p.orders, p.revenue / p.orders]), symbolSize: (_: any, p: any) => 8 + 26 * Math.sqrt(pts[p.dataIndex].revenue / maxR),
      itemStyle: { color: ct.series[0], opacity: 0.75, borderColor: ct.surface, borderWidth: 2 },
      label: { show: true, position: "top", fontSize: 10.5, color: ct.text2, formatter: (p: any) => (p.dataIndex < 4 ? catName(c, pts[p.dataIndex].id) : "") },
      labelLayout: { hideOverlap: true },
      markLine: { silent: true, symbol: "none", lineStyle: { color: ct.axis, type: "dashed" }, label: { color: ct.text3, fontSize: 10.5, formatter: t(L("mediana", "median")) }, data: [{ yAxis: medTicket }] } }],
  }), [pts, ct, lang, t, c, maxR, medTicket]);
  const hiTicket = [...pts].sort((a, b) => b.revenue / b.orders - a.revenue / a.orders)[0];
  return (
    <ChartCard title={L("Volumen frente a ticket por categoría", "Volume vs ticket by category")} subtitle={L("Top 30 categorías por ingreso (≥ 20 pedidos); tamaño = ingreso", "Top 30 categories by revenue (≥ 20 orders); size = revenue")}
      filters={[F.region, F.period]} source={SRC} empty={pts.length < 2}
      table={{ columns: [t(L("Categoría", "Category")), t(L("Pedidos", "Orders")), t(L("Ingreso por pedido", "Revenue per order")), t(L("Ingresos", "Revenue"))], rows: pts.map((p) => [catName(c, p.id), num(p.orders, lang), num(p.revenue / p.orders, lang, 2), num(p.revenue, lang)]) }}
      explain={{
        measures: L("Cada punto es una categoría: eje X = pedidos (escala logarítmica), eje Y = ingreso de la categoría por pedido que la contiene, tamaño = ingreso total.", "Each point is a category: X = orders (log scale), Y = category revenue per order containing it, size = total revenue."),
        observed: hiTicket ? { es: `${catName({ ...c, lang: "es" }, hiTicket.id)} tiene el mayor ingreso por pedido (${brl(hiTicket.revenue / hiTicket.orders, "es")}) con ${num(hiTicket.orders, "es")} pedidos; la mediana de las categorías mostradas es ${brl(medTicket, "es")}.`,
          en: `${catName({ ...c, lang: "en" }, hiTicket.id)} has the highest revenue per order (${brl(hiTicket.revenue / hiTicket.orders, "en")}) with ${num(hiTicket.orders, "en")} orders; the median across shown categories is ${brl(medTicket, "en")}.` } : L("Sin categorías suficientes.", "Not enough categories."),
        implications: L("Distingue categorías que crecen por volumen de las que dependen de pocos pedidos caros.", "Separates categories that grow by volume from those relying on few expensive orders."),
        decisions: L("Estrategias distintas: conversión para volumen, experiencia y financiamiento para ticket alto.", "Different strategies: conversion for volume, experience and financing for high ticket."),
        limits: L("Ingreso por pedido ≠ precio unitario: un pedido puede incluir varias unidades.", "Revenue per order ≠ unit price: an order may include several units."),
      }}>
      <EChart option={option} height={340} label={t(L("Dispersión de pedidos frente a ingreso por pedido", "Scatter of orders vs revenue per order"))} />
    </ChartCard>
  );
}

export function PriceBoxplot({ c }: { c: RCtx }) {
  const { d, region, ct, lang, t } = c;
  const rows = d.priceBox[region];
  const names = rows.map((r) => catName(c, r.category));
  const option = useMemo<EOption>(() => ({
    ...base(ct), grid: { left: 8, right: 16, top: 8, bottom: 8, containLabel: true },
    yAxis: catAxis(ct, names, { inverse: true, axisLabel: { color: ct.text2, fontSize: 11.5, width: 150, overflow: "truncate" } }),
    xAxis: valueAxis(ct, (v: number) => brlAxis(v, lang)),
    tooltip: { ...base(ct).tooltip, trigger: "item", formatter: (p: any) => { const r = rows[p.dataIndex]; return tipHead(names[p.dataIndex]) + tipRow(ct.series[0], t(L("Mediana", "Median")), brl(r.median, lang, false)) + tipRow(ct.neutral, "Q1 – Q3", `${brl(r.q1, lang, false)} – ${brl(r.q3, lang, false)}`) + tipRow(ct.neutral, t(L("Bigotes", "Whiskers")), `${brl(r.lo, lang, false)} – ${brl(r.hi, lang, false)}`) + tipNote(`n = ${num(r.n, lang)} · ${num(r.outliers, lang)} ${t(L("valores atípicos fuera de bigotes", "outliers beyond whiskers"))}`); } },
    series: [{ type: "boxplot", data: rows.map((r) => [r.lo, r.q1, r.median, r.q3, r.hi]), boxWidth: [8, 16], itemStyle: { color: ct.band, borderColor: ct.series[0], borderWidth: 1.5 } }],
  }), [rows, names, ct, lang, t]);
  const widest = [...rows].sort((a, b) => b.q3 - b.q1 - (a.q3 - a.q1))[0];
  const cheapest = [...rows].sort((a, b) => a.median - b.median)[0];
  return (
    <ChartCard title={L("Distribución del precio unitario por categoría", "Unit price distribution by category")} subtitle={L("Boxplot del precio por línea de pedido, 10 categorías con más ingreso", "Boxplot of price per order line, 10 top-revenue categories")}
      filters={[F.regionOnly]} source={SRC} empty={!rows.length}
      table={{ columns: [t(L("Categoría", "Category")), "Q1", t(L("Mediana", "Median")), "Q3", "n"], rows: rows.map((r, i) => [names[i], num(r.q1, lang, 2), num(r.median, lang, 2), num(r.q3, lang, 2), num(r.n, lang)]) }}
      explain={{
        measures: L("Caja = 50% central de precios (Q1–Q3), línea = mediana, bigotes = 1,5×RIC. Se calcula por línea de pedido.", "Box = middle 50% of prices (Q1–Q3), line = median, whiskers = 1.5×IQR. Computed per order line."),
        observed: widest ? { es: `${catName({ ...c, lang: "es" }, widest.category)} tiene la mayor dispersión (RIC ${brl(widest.q3 - widest.q1, "es")}); ${catName({ ...c, lang: "es" }, cheapest.category)} la mediana más baja (${brl(cheapest.median, "es")}).`,
          en: `${catName({ ...c, lang: "en" }, widest.category)} shows the widest spread (IQR ${brl(widest.q3 - widest.q1, "en")}); ${catName({ ...c, lang: "en" }, cheapest.category)} the lowest median (${brl(cheapest.median, "en")}).` } : L("Sin datos.", "No data."),
        implications: L("Mucha dispersión indica surtido heterogéneo: un promedio sería engañoso.", "High spread signals a heterogeneous assortment: an average would mislead."),
        decisions: L("Segmentar precios dentro de la categoría antes de fijar descuentos.", "Segment prices within the category before setting discounts."),
        limits: L("Este gráfico responde solo al filtro de región (se precalcula para toda la ventana).", "This chart responds only to the region filter (precomputed for the full window)."),
      }}>
      <EChart option={option} height={360} label={t(L("Diagramas de caja del precio por categoría", "Boxplots of price by category"))} />
    </ChartCard>
  );
}

export function StateChart({ c }: { c: RCtx }) {
  const { d, region, from, to, ct, lang, t } = c;
  const rows = useMemo(() => d.states.filter((s) => region === "ALL" || s.region === region)
    .map((s) => ({ id: s.id, region: s.region, revenue: sum(s.revenue, from, to + 1), orders: sum(s.orders, from, to + 1) }))
    .filter((s) => s.orders > 0).sort((a, b) => b.revenue - a.revenue), [d, region, from, to]);
  const shown = rows.slice(0, 15), total = rows.reduce((s, x) => s + x.revenue, 0);
  const option = useMemo<EOption>(() => ({
    ...base(ct), grid: { left: 8, right: 56, top: 8, bottom: 8, containLabel: true },
    yAxis: catAxis(ct, shown.map((s) => s.id), { inverse: true }), xAxis: valueAxis(ct, (v: number) => brlAxis(v, lang)),
    tooltip: { ...base(ct).tooltip, axisPointer: { type: "shadow", shadowStyle: { color: ct.grid, opacity: 0.5 } }, formatter: (ps: any[]) => { const s = shown[ps[0].dataIndex]; return tipHead(s.id) + tipRow(ct.series[0], t(L("Ingresos", "Revenue")), brl(s.revenue, lang, false)) + tipRow(ct.neutral, t(L("Pedidos", "Orders")), num(s.orders, lang)) + tipRow(ct.neutral, t(L("Ticket", "Ticket")), brl(s.revenue / s.orders, lang, false)); } },
    series: [{ type: "bar", barMaxWidth: 16, data: shown.map((s, i) => ({ value: s.revenue, itemStyle: barStyle(i === 0 ? ct.series[0] : ct.neutral, true) })), label: { show: true, position: "right", fontSize: 11, color: ct.text2, formatter: (p: any) => pct(p.value / total, lang) } }],
  }), [shown, ct, lang, t, total]);
  return (
    <ChartCard title={L("Ingresos por estado", "Revenue by state")} subtitle={L("Estado del cliente; etiqueta = participación dentro del filtro", "Customer state; label = share within the filter")}
      filters={[F.region, F.period]} source={SRC} empty={!rows.length}
      table={{ columns: [t(L("Estado", "State")), t(L("Ingresos (R$)", "Revenue (R$)")), t(L("Pedidos", "Orders")), t(L("Ticket (R$)", "Ticket (R$)"))], rows: rows.map((s) => [s.id, num(s.revenue, lang), num(s.orders, lang), num(s.revenue / s.orders, lang, 2)]) }}
      explain={{
        measures: L("Ingresos y pedidos según el estado de residencia del cliente.", "Revenue and orders by the customer's state of residence."),
        observed: rows[0] ? { es: `${rows[0].id} aporta ${pct(rows[0].revenue / total, "es")} del ingreso de ${regionName({ ...c, lang: "es" })}; los 3 primeros estados suman ${pct(rows.slice(0, 3).reduce((s, x) => s + x.revenue, 0) / total, "es")}.`,
          en: `${rows[0].id} brings ${pct(rows[0].revenue / total, "en")} of ${regionName({ ...c, lang: "en" })}'s revenue; the top 3 states add up to ${pct(rows.slice(0, 3).reduce((s, x) => s + x.revenue, 0) / total, "en")}.` } : L("Sin datos.", "No data."),
        implications: L("Una alta concentración geográfica expone el negocio a la logística y economía de pocos estados.", "High geographic concentration exposes the business to a few states' logistics and economy."),
        decisions: L("Dónde abrir centros de distribución o reforzar vendedores locales.", "Where to open distribution centres or strengthen local sellers."),
        limits: L("Refleja población y cobertura de vendedores; no es una medida de potencial de mercado.", "Reflects population and seller coverage; not a measure of market potential."),
      }}>
      <EChart option={option} height={Math.max(200, 30 + shown.length * 24)} label={t(L("Barras de ingresos por estado", "Bars of revenue by state"))} />
    </ChartCard>
  );
}

export function BasketHistogram({ c }: { c: RCtx }) {
  const { d, region, from, to, ct, lang, t } = c;
  const edges = d.hist.edges;
  const counts = useMemo(() => {
    const out = new Array(edges.length).fill(0);
    for (let m = from; m <= to; m++) d.hist[region][m].forEach((v, k) => { out[k] += v; });
    return out;
  }, [d, region, from, to, edges.length]);
  const total = sum(counts);
  const labels = edges.map((e, k) => (k < edges.length - 1 ? `${e}–${edges[k + 1]}` : `${e}+`));
  let acc = 0, medBin = 0;
  for (let k = 0; k < counts.length; k++) { acc += counts[k]; if (acc >= total / 2) { medBin = k; break; } }
  const under100 = (counts[0] + counts[1] + counts[2] + counts[3]) / (total || 1);
  const option = useMemo<EOption>(() => ({
    ...base(ct), grid: { left: 8, right: 16, top: 16, bottom: 34, containLabel: true },
    xAxis: catAxis(ct, labels, { name: t(L("Valor del pedido en productos (R$)", "Order product value (R$)")), nameLocation: "middle", nameGap: 52, axisLabel: { color: ct.text3, fontSize: 10.5, interval: 0, rotate: 30 } }),
    yAxis: valueAxis(ct, (v: number) => num(v, lang)),
    tooltip: { ...base(ct).tooltip, axisPointer: { type: "shadow", shadowStyle: { color: ct.grid, opacity: 0.5 } }, formatter: (ps: any[]) => { const k = ps[0].dataIndex; return tipHead(`R$ ${labels[k]}`) + tipRow(ct.series[0], t(L("Pedidos", "Orders")), num(counts[k], lang)) + tipNote(pct(counts[k] / total, lang) + " " + t(L("de los pedidos", "of orders"))); } },
    series: [{ type: "bar", barCategoryGap: "8%", data: counts.map((v, k) => ({ value: v, itemStyle: barStyle(k === medBin ? ct.series[0] : ct.neutral) })) }],
  }), [counts, labels, ct, lang, t, total, medBin]);
  return (
    <ChartCard title={L("Distribución del valor del pedido", "Order value distribution")} subtitle={L("Histograma; tramos de ancho variable, la barra azul contiene la mediana", "Histogram; variable-width bins, the blue bar holds the median")}
      filters={[F.region, F.period]} source={SRC} empty={total === 0}
      table={{ columns: [t(L("Tramo (R$)", "Bin (R$)")), t(L("Pedidos", "Orders")), "%"], rows: labels.map((l, k) => [l, num(counts[k], lang), pct(counts[k] / total, lang)]) }}
      explain={{
        measures: L("Suma del precio de los productos de cada pedido (sin flete), agrupada en tramos.", "Sum of product prices per order (excluding freight), grouped into bins."),
        observed: { es: `${pct(under100, "es")} de los pedidos vale menos de R$ 100 en productos; la mediana cae en el tramo R$ ${labels[medBin]}.`, en: `${pct(under100, "en")} of orders are worth under R$ 100 in products; the median falls in the R$ ${labels[medBin]} bin.` },
        implications: L("El negocio es de tickets bajos: el flete pesa proporcionalmente mucho en la decisión de compra.", "It is a low-ticket business: freight weighs heavily in the purchase decision."),
        decisions: L("Umbrales de envío gratis y paquetes para subir el ticket.", "Free-shipping thresholds and bundles to raise the ticket."),
        limits: L("Los tramos no son de igual ancho: comparar alturas solo entre tramos vecinos.", "Bins are not equal width: compare heights only between neighbouring bins."),
      }}>
      <EChart option={option} height={280} label={t(L("Histograma del valor del pedido", "Histogram of order value"))} />
    </ChartCard>
  );
}

export function DeliveryReview({ c }: { c: RCtx }) {
  const { d, region, from, to, ct, lang, t } = c;
  const v = useMemo(() => {
    const k = d.delivery.buckets.length, n = new Array(k).fill(0), s = new Array(k).fill(0);
    for (let m = from; m <= to; m++) for (let b = 0; b < k; b++) { n[b] += d.delivery[region].count[m][b]; s[b] += d.delivery[region].reviewSum[m][b]; }
    return { n, avg: s.map((x, b) => (n[b] ? x / n[b] : NaN)) };
  }, [d, region, from, to]);
  const labels = d.delivery.buckets.map((b) => t(b));
  const option = useMemo<EOption>(() => ({
    ...base(ct), grid: { left: 8, right: 16, top: 34, bottom: 8, containLabel: true },
    xAxis: catAxis(ct, labels, { axisLabel: { color: ct.text3, fontSize: 10.5, interval: 0, width: 80, overflow: "break" } }),
    yAxis: valueAxis(ct, (x: number) => x.toFixed(0), { min: 0, max: 5, interval: 1, name: t(L("Reseña promedio (1–5)", "Average review (1–5)")), nameTextStyle: { color: ct.text3, fontSize: 11, align: "left" } }),
    tooltip: { ...base(ct).tooltip, axisPointer: { type: "shadow", shadowStyle: { color: ct.grid, opacity: 0.5 } }, formatter: (ps: any[]) => { const k = ps[0].dataIndex; return tipHead(labels[k]) + tipRow(k >= 4 ? ct.divPos : ct.divNeg, t(L("Reseña promedio", "Average review")), Number.isFinite(v.avg[k]) ? v.avg[k].toFixed(2) : "—") + tipNote(`n = ${num(v.n[k], lang)} ${t(L("pedidos entregados con reseña", "delivered orders with review"))}`); } },
    series: [{ type: "bar", barMaxWidth: 40, data: v.avg.map((x, k) => ({ value: Number.isFinite(x) ? +x.toFixed(2) : null, itemStyle: barStyle(k >= 4 ? ct.divPos : k === 3 ? ct.neutral : ct.divNeg) })),
      label: { show: true, position: "top", color: ct.text2, fontSize: 11, formatter: (p: any) => (p.value == null ? "" : Number(p.value).toFixed(2)) } }],
  }), [v, labels, ct, lang, t]);
  const ok = Number.isFinite(v.avg[2]) && Number.isFinite(v.avg[5]);
  return (
    <ChartCard title={L("Puntualidad de entrega y reseñas", "Delivery punctuality and reviews")} subtitle={L("Reseña promedio según días de diferencia entre entrega real y estimada", "Average review by days between actual and estimated delivery")}
      filters={[F.region, F.period]} source={SRC} empty={!v.n.some((x) => x > 0)}
      table={{ columns: [t(L("Tramo", "Bucket")), t(L("Reseña promedio", "Average review")), "n"], rows: labels.map((l, k) => [l, Number.isFinite(v.avg[k]) ? v.avg[k].toFixed(2) : "—", num(v.n[k], lang)]) }}
      explain={{
        measures: L("Promedio de la reseña (1–5) de pedidos entregados, según cuántos días antes o después de la fecha estimada llegaron. Una reseña por pedido (la más reciente).",
          "Average review (1–5) of delivered orders by how many days before or after the estimated date they arrived. One review per order (latest)."),
        observed: ok ? { es: `Los pedidos que llegan 8+ días tarde promedian ${v.avg[5].toFixed(2)} estrellas frente a ${v.avg[2].toFixed(2)} cuando llegan 1–7 días antes (n = ${num(v.n[5], "es")} y ${num(v.n[2], "es")}).`,
          en: `Orders arriving 8+ days late average ${v.avg[5].toFixed(2)} stars vs ${v.avg[2].toFixed(2)} when they arrive 1–7 days early (n = ${num(v.n[5], "en")} and ${num(v.n[2], "en")}).` } : L("Muestra insuficiente en algún tramo.", "Insufficient sample in some bucket."),
        implications: L("La puntualidad es una de las variables asociadas más claras con la satisfacción del cliente.", "Punctuality is one of the clearest variables associated with customer satisfaction."),
        decisions: L("Revisar vendedores y rutas con más atrasos; ajustar las fechas prometidas.", "Review sellers and routes with most delays; adjust promised dates."),
        limits: L("Asociación, no causalidad: el tipo de producto o el vendedor pueden influir en ambas variables.", "Association, not causation: product type or seller may drive both."),
      }}>
      <EChart option={option} height={280} label={t(L("Barras de reseña promedio por puntualidad", "Bars of average review by punctuality"))} />
    </ChartCard>
  );
}

export function TopProducts({ c }: { c: RCtx }) {
  const { d, region, ct, lang, t } = c;
  const rows = d.topProducts[region].slice(0, 10);
  const labels = rows.map((r) => `${r.id} · ${catName(c, r.category)}`);
  const option = useMemo<EOption>(() => ({
    ...base(ct), grid: { left: 8, right: 16, top: 8, bottom: 8, containLabel: true },
    yAxis: catAxis(ct, labels, { inverse: true, axisLabel: { color: ct.text2, fontSize: 11, width: 190, overflow: "truncate", fontFamily: "IBM Plex Mono, monospace" } }),
    xAxis: valueAxis(ct, (v: number) => brlAxis(v, lang)),
    tooltip: { ...base(ct).tooltip, axisPointer: { type: "shadow", shadowStyle: { color: ct.grid, opacity: 0.5 } }, formatter: (ps: any[]) => { const r = rows[ps[0].dataIndex]; return tipHead(labels[ps[0].dataIndex]) + tipRow(ct.series[0], t(L("Ingresos", "Revenue")), brl(r.revenue, lang, false)) + tipRow(ct.neutral, t(L("Unidades", "Units")), num(r.units, lang)) + tipRow(ct.neutral, t(L("Pedidos", "Orders")), num(r.orders, lang)) + tipRow(ct.neutral, t(L("Precio medio", "Average price")), brl(r.avgPrice, lang, false)); } },
    series: [{ type: "bar", barMaxWidth: 16, data: rows.map((r) => ({ value: r.revenue, itemStyle: barStyle(ct.series[0], true) })) }],
  }), [rows, labels, ct, lang, t]);
  return (
    <ChartCard title={L("Productos con más ingresos", "Top products by revenue")} subtitle={L("ID abreviado del producto (Olist no publica nombres)", "Shortened product ID (Olist does not publish names)")}
      filters={[F.regionOnly]} source={SRC} empty={!rows.length}
      table={{ columns: ["ID", t(L("Categoría", "Category")), t(L("Ingresos", "Revenue")), t(L("Unidades", "Units")), t(L("Pedidos", "Orders")), t(L("Precio medio", "Avg price"))], rows: rows.map((r) => [r.id, catName(c, r.category), num(r.revenue, lang), num(r.units, lang), num(r.orders, lang), num(r.avgPrice, lang, 2)]) }}
      explain={{
        measures: L("Ingreso, unidades y pedidos por producto durante toda la ventana (ene 2017 – jul 2018).", "Revenue, units and orders per product over the full window (Jan 2017 – Jul 2018)."),
        observed: rows[0] ? { es: `El producto líder (${rows[0].id}, ${catName({ ...c, lang: "es" }, rows[0].category)}) suma ${brl(rows[0].revenue, "es")} con ${num(rows[0].units, "es")} unidades a ${brl(rows[0].avgPrice, "es")} promedio.`,
          en: `The leading product (${rows[0].id}, ${catName({ ...c, lang: "en" }, rows[0].category)}) totals ${brl(rows[0].revenue, "en")} from ${num(rows[0].units, "en")} units at ${brl(rows[0].avgPrice, "en")} on average.` } : L("Sin datos.", "No data."),
        implications: L("Los productos estrella justifican control de quiebres de stock.", "Star products justify stock-out monitoring."),
        decisions: L("Qué productos vigilar por disponibilidad y precio.", "Which products to monitor for availability and price."),
        limits: L("Responde solo al filtro de región. Olist anonimiza los productos: no hay nombres.", "Responds only to the region filter. Olist anonymises products: no names."),
      }}>
      <EChart option={option} height={300} label={t(L("Barras de productos con más ingreso", "Bars of top products by revenue"))} />
    </ChartCard>
  );
}
