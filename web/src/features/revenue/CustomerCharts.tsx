"use client";
import { useMemo } from "react";
import { ChartCard } from "@/components/ChartCard";
import { EChart, type EOption } from "@/components/EChart";
import { base, barStyle, catAxis, legend, tipHead, tipNote, tipRow, valueAxis } from "@/components/chart-kit";
import { Card } from "@/components/ui/card";
import { brl, num, pct } from "@/lib/format";
import { L } from "@/lib/prefs";
import { F, regionName, SRC, type RCtx } from "./ctx";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function CustomerStats({ c }: { c: RCtx }) {
  const { d, region, lang, t } = c;
  const cu = d.customers[region];
  const items: [string, string, string][] = [
    [t(L("Clientes únicos (ventana)", "Unique customers (window)")), num(cu.customers, lang), t(L("customer_unique_id con ≥ 1 pedido válido", "customer_unique_id with ≥ 1 valid order"))],
    [t(L("Clientes recurrentes", "Repeat customers")), pct(cu.repeatRate, lang), t(L("con 2 o más pedidos", "with 2 or more orders"))],
    [t(L("Ingreso del 10% con más valor", "Revenue from top 10%")), pct(cu.top10Share, lang), t(L("concentración del ingreso", "revenue concentration"))],
    [t(L("Valor histórico mediano", "Median historical value")), brl(cu.medianValue, lang), t(L("suma de compras, no CLV predictivo", "sum of purchases, not predictive CLV"))],
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map(([k, v, n]) => (
        <Card key={k} className="p-4">
          <p className="text-[12.5px] font-medium text-ink-2">{k}</p>
          <p className="num mt-1 text-2xl font-semibold tracking-tight">{v}</p>
          <p className="mt-1 text-[12px] text-ink-3">{n}</p>
        </Card>
      ))}
    </div>
  );
}

export function SegmentChart({ c }: { c: RCtx }) {
  const { d, region, ct, lang, t } = c;
  const cu = d.customers[region];
  const segs = cu.segments;
  const names = segs.map((s) => t(s.label));
  const option = useMemo<EOption>(() => ({
    ...base(ct), legend: legend(ct), grid: { left: 8, right: 40, top: 32, bottom: 8, containLabel: true },
    yAxis: catAxis(ct, names, { inverse: true, axisLabel: { color: ct.text2, fontSize: 11.5 } }),
    xAxis: valueAxis(ct, (v: number) => pct(v, lang, 0)),
    tooltip: { ...base(ct).tooltip, axisPointer: { type: "shadow", shadowStyle: { color: ct.grid, opacity: 0.5 } }, formatter: (ps: any[]) => {
      const s = segs[ps[0].dataIndex];
      return tipHead(t(s.label)) + tipRow(ct.series[0], t(L("Clientes", "Customers")), `${num(s.customers, lang)} (${pct(s.customers / cu.customers, lang)})`) + tipRow(ct.series[1], t(L("Ingresos", "Revenue")), `${brl(s.revenue, lang, false)} (${pct(s.share, lang)})`) + tipNote(`${t(L("Valor medio", "Avg value"))} ${brl(s.avgValue, lang, false)} · ${t(L("recencia media", "avg recency"))} ${num(s.avgRecency, lang)} ${t(L("días", "days"))} · ${num(s.avgOrders, lang, 2)} ${t(L("pedidos", "orders"))}`);
    } },
    series: [
      { name: t(L("% de clientes", "% of customers")), type: "bar", barMaxWidth: 12, barGap: "20%", data: segs.map((s) => s.customers / cu.customers), itemStyle: barStyle(ct.series[0], true) },
      { name: t(L("% del ingreso", "% of revenue")), type: "bar", barMaxWidth: 12, data: segs.map((s) => s.share), itemStyle: barStyle(ct.series[1], true) },
    ],
  }), [segs, names, ct, lang, t, cu.customers]);
  const hi = segs.find((s) => s.id === "lapsed_high")!;
  return (
    <ChartCard id="chart-rfm" title={L("Segmentación RFM", "RFM segmentation")} subtitle={L("Peso de cada segmento en clientes y en ingresos", "Each segment's weight in customers and revenue")}
      filters={[F.regionOnly]} source={SRC}
      table={{ columns: [t(L("Segmento", "Segment")), t(L("Clientes", "Customers")), t(L("Ingresos (R$)", "Revenue (R$)")), t(L("% ingreso", "% revenue")), t(L("Valor medio", "Avg value")), t(L("Recencia (días)", "Recency (days)"))],
        rows: segs.map((s) => [t(s.label), num(s.customers, lang), num(s.revenue, lang), pct(s.share, lang), num(s.avgValue, lang, 2), num(s.avgRecency, lang)]) }}
      explain={{
        measures: L("Recencia (días desde la última compra al 01-08-2018), Frecuencia (pedidos) y Monto (R$). R y M en quintiles; como casi nadie repite, la frecuencia se usa como 1 vs 2+. Reglas: recurrentes activos (F≥2, R≥3), en riesgo (F≥2, R≤2), nuevos de alto valor (F=1, R≥4, M≥4), nuevos (F=1, R≥4), alto valor sin recompra (F=1, R≤3, M≥4), hibernando (resto).",
          "Recency (days since last purchase as of 2018-08-01), Frequency (orders) and Monetary (R$). R and M in quintiles; since almost nobody repeats, frequency is 1 vs 2+. Rules: active repeat (F≥2, R≥3), at risk (F≥2, R≤2), new high value (F=1, R≥4, M≥4), new (F=1, R≥4), high value no repeat (F=1, R≤3, M≥4), hibernating (rest)."),
        observed: { es: `En ${regionName({ ...c, lang: "es" })}, «Alto valor sin recompra» reúne ${pct(hi.customers / cu.customers, "es")} de los clientes y ${pct(hi.share, "es")} del ingreso histórico; los recurrentes (activos + en riesgo) son solo ${pct(cu.repeatRate, "es")}.`,
          en: `In ${regionName({ ...c, lang: "en" })}, “High value, no repeat” holds ${pct(hi.customers / cu.customers, "en")} of customers and ${pct(hi.share, "en")} of historical revenue; repeat buyers (active + at risk) are only ${pct(cu.repeatRate, "en")}.` },
        implications: L("La mayor parte del valor está en clientes que compraron una vez y no volvieron.", "Most value sits with customers who bought once and did not return."),
        decisions: L("A qué segmento dirigir un piloto de reactivación y cuál proteger.", "Which segment to target with a reactivation pilot and which to protect."),
        limits: L("Segmentos descriptivos con reglas fijas, no un modelo de propensión. Responde solo al filtro de región.", "Descriptive rule-based segments, not a propensity model. Responds only to the region filter."),
      }}>
      <EChart option={option} height={300} label={t(L("Barras de segmentos RFM", "Bars of RFM segments"))} />
    </ChartCard>
  );
}

export function ConcentrationChart({ c }: { c: RCtx }) {
  const { d, region, ct, lang, t } = c;
  const cu = d.customers[region];
  const xs = cu.concentration.map((_, i) => i);
  const option = useMemo<EOption>(() => ({
    ...base(ct), legend: legend(ct), grid: { left: 8, right: 16, top: 32, bottom: 28, containLabel: true },
    xAxis: valueAxis(ct, (v: number) => `${v}%`, { type: "value", min: 0, max: 100, name: t(L("% de clientes (de mayor a menor valor)", "% of customers (highest value first)")), nameLocation: "middle", nameGap: 24 }),
    yAxis: valueAxis(ct, (v: number) => pct(v, lang, 0), { min: 0, max: 1 }),
    tooltip: { ...base(ct).tooltip, formatter: (ps: any[]) => { const k = ps[0].dataIndex; return tipHead(t(L(`El ${k}% de clientes con más valor`, `Top ${k}% of customers by value`))) + tipRow(ct.series[0], t(L("concentra", "holds")), pct(cu.concentration[k], lang)) + tipRow(ct.neutral, t(L("si fuera igualitario", "if perfectly even")), pct(k / 100, lang, 0)); } },
    series: [
      { name: t(L("Curva de concentración", "Concentration curve")), type: "line", data: xs.map((x) => [x, cu.concentration[x]]), showSymbol: false, lineStyle: { width: 2, color: ct.series[0] }, itemStyle: { color: ct.series[0] }, areaStyle: { color: ct.band },
        markPoint: { symbol: "circle", symbolSize: 9, itemStyle: { color: ct.series[0], borderColor: ct.surface, borderWidth: 2 }, label: { show: true, position: "right", color: ct.text, fontSize: 11, formatter: () => `10% → ${pct(cu.top10Share, lang, 0)}` }, data: [{ coord: [10, cu.top10Share] }] } },
      { name: t(L("Distribución igualitaria", "Even distribution")), type: "line", data: [[0, 0], [100, 1]], showSymbol: false, lineStyle: { width: 1, type: "dashed", color: ct.neutral }, itemStyle: { color: ct.neutral } },
    ],
  }), [cu, xs, ct, lang, t]);
  return (
    <ChartCard title={L("Concentración del ingreso por cliente", "Revenue concentration by customer")} subtitle={L("Curva acumulada de ingreso histórico", "Cumulative curve of historical revenue")}
      filters={[F.regionOnly]} source={SRC}
      table={{ columns: [t(L("% clientes", "% customers")), t(L("% ingreso acumulado", "% cumulative revenue"))], rows: [1, 5, 10, 20, 30, 50, 80, 100].map((k) => [`${k}%`, pct(cu.concentration[k], lang)]) }}
      explain={{
        measures: L("Se ordena a los clientes por su gasto total en la ventana y se acumula el ingreso.", "Customers are sorted by total spend in the window and revenue is accumulated."),
        observed: { es: `El 10% de clientes con mayor gasto concentra ${pct(cu.top10Share, "es")} del ingreso y el 1% superior, ${pct(cu.top1Share, "es")}.`, en: `The top 10% of customers by spend hold ${pct(cu.top10Share, "en")} of revenue and the top 1%, ${pct(cu.top1Share, "en")}.` },
        implications: L("Hay concentración moderada: un grupo pequeño pesa mucho, pero el negocio no depende de unos pocos clientes.", "Moderate concentration: a small group weighs a lot, yet the business does not depend on a handful of customers."),
        decisions: L("Si conviene un programa para clientes de alto valor y cuánto invertir en él.", "Whether a high-value customer programme makes sense and how much to invest."),
        limits: L("Valor histórico ≠ valor futuro (CLV). Responde solo al filtro de región.", "Historical value ≠ future value (CLV). Responds only to the region filter."),
      }}>
      <EChart option={option} height={280} label={t(L("Curva de concentración del ingreso", "Revenue concentration curve"))} />
    </ChartCard>
  );
}

export function FrequencyAndValue({ c }: { c: RCtx }) {
  const { d, region, ct, lang, t } = c;
  const cu = d.customers[region];
  const freqLabels = ["1", "2", "3", "4+"].map((x) => `${x} ${t(L("pedido(s)", "order(s)"))}`);
  const e = cu.valueHist.edges;
  const valLabels = e.map((x, k) => (k < e.length - 1 ? `${x}–${e[k + 1]}` : `${x}+`));
  const option = useMemo<EOption>(() => ({
    ...base(ct),
    grid: [{ left: 8, right: "54%", top: 30, bottom: 30, containLabel: true }, { left: "54%", right: 16, top: 30, bottom: 30, containLabel: true }],
    title: [{ text: t(L("Frecuencia de compra", "Purchase frequency")), left: 8, top: 0, textStyle: { fontSize: 12, fontWeight: 500, color: ct.text2 } }, { text: t(L("Valor histórico (R$)", "Historical value (R$)")), left: "54%", top: 0, textStyle: { fontSize: 12, fontWeight: 500, color: ct.text2 } }],
    xAxis: [catAxis(ct, freqLabels, { gridIndex: 0, axisLabel: { color: ct.text3, fontSize: 10.5, interval: 0 } }), catAxis(ct, valLabels, { gridIndex: 1, axisLabel: { color: ct.text3, fontSize: 10, interval: 0, rotate: 35 } })],
    yAxis: [valueAxis(ct, (v: number) => pct(v, lang, 0), { gridIndex: 0, max: 1 }), valueAxis(ct, (v: number) => pct(v, lang, 0), { gridIndex: 1 })],
    tooltip: { ...base(ct).tooltip, trigger: "item", formatter: (p: any) => p.seriesIndex === 0
      ? tipHead(freqLabels[p.dataIndex]) + tipRow(ct.series[0], t(L("Clientes", "Customers")), `${num(cu.freqDist[p.dataIndex], lang)} (${pct(p.value, lang, 2)})`)
      : tipHead(`R$ ${valLabels[p.dataIndex]}`) + tipRow(ct.series[0], t(L("Clientes", "Customers")), `${num(cu.valueHist.counts[p.dataIndex], lang)} (${pct(p.value, lang)})`) },
    series: [
      { type: "bar", xAxisIndex: 0, yAxisIndex: 0, barMaxWidth: 36, data: cu.freqDist.map((v) => v / cu.customers), itemStyle: barStyle(ct.series[0]), label: { show: true, position: "top", fontSize: 10.5, color: ct.text2, formatter: (p: any) => pct(p.value, lang, p.value < 0.01 ? 2 : 1) } },
      { type: "bar", xAxisIndex: 1, yAxisIndex: 1, barCategoryGap: "10%", data: cu.valueHist.counts.map((v) => v / cu.customers), itemStyle: barStyle(ct.series[0]) },
    ],
  }), [cu, freqLabels, valLabels, ct, lang, t]);
  return (
    <ChartCard title={L("Frecuencia y valor histórico del cliente", "Customer frequency and historical value")} subtitle={L("% de clientes únicos", "% of unique customers")}
      filters={[F.regionOnly]} source={SRC}
      table={{ columns: [t(L("Grupo", "Group")), t(L("Clientes", "Customers"))], rows: [...freqLabels.map((l, k) => [l, num(cu.freqDist[k], lang)]), ...valLabels.map((l, k) => [`R$ ${l}`, num(cu.valueHist.counts[k], lang)])] }}
      explain={{
        measures: L("Izquierda: número de pedidos por cliente. Derecha: suma de lo comprado por cliente en la ventana (valor histórico, no CLV predictivo).", "Left: orders per customer. Right: total spent per customer in the window (historical value, not predictive CLV)."),
        observed: { es: `${pct(cu.freqDist[0] / cu.customers, "es")} de los clientes compró una sola vez. La mediana del valor histórico es ${brl(cu.medianValue, "es")}.`, en: `${pct(cu.freqDist[0] / cu.customers, "en")} of customers bought only once. Median historical value is ${brl(cu.medianValue, "en")}.` },
        implications: L("El valor del cliente casi equivale a su primer pedido; la recompra es la palanca menos explotada.", "Customer value nearly equals the first order; repurchase is the least used lever."),
        decisions: L("Diseño de incentivos de segunda compra y su medición con grupo de control.", "Design of second-purchase incentives, measured with a control group."),
        limits: L("Olist es un marketplace: parte de la recompra puede ocurrir fuera de la plataforma.", "Olist is a marketplace: some repurchases may happen off-platform."),
      }}>
      <EChart option={option} height={300} label={t(L("Histogramas de frecuencia y valor del cliente", "Histograms of customer frequency and value"))} />
    </ChartCard>
  );
}
