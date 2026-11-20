"use client";
import { useMemo, useState } from "react";
import { ChartCard } from "@/components/ChartCard";
import { EChart, type EOption } from "@/components/EChart";
import { base, barStyle, catAxis, legend, tipHead, tipNote, tipRow, valueAxis } from "@/components/chart-kit";
import { Slider } from "@/components/ui/slider";
import { brl, brlAxis, dateLabel, pct, signedPct } from "@/lib/format";
import { L } from "@/lib/prefs";
import { F, SRC, type RCtx } from "./ctx";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function ForecastChart({ c }: { c: RCtx }) {
  const { d, ct, lang, t } = c;
  const f = d.forecast;
  const sel = f.metrics.find((m) => m.model === f.selected)!;
  const baseM = f.metrics.find((m) => m.model === f.bestBaseline)!;
  const hist = 30;
  const aw = f.weeks.slice(-hist), av = f.actual.slice(-hist);
  const labels = [...aw, ...f.future.weeks].map((w) => dateLabel(w, lang));
  const option = useMemo<EOption>(() => {
    const lastActual = av[av.length - 1];
    const join = (arr: number[]) => [...new Array(hist - 1).fill(null), lastActual, ...arr];
    return {
      ...base(ct),
      legend: legend(ct, { data: [t(L("Real (semanal)", "Actual (weekly)")), t(L("Intervalo 80%", "80% interval")), t(sel.label), t(baseM.label)] }),
      grid: { left: 8, right: 16, top: 34, bottom: 8, containLabel: true },
      xAxis: catAxis(ct, labels, { boundaryGap: false, axisLabel: { color: ct.text3, fontSize: 10.5, hideOverlap: true } }),
      yAxis: valueAxis(ct, (v: number) => brlAxis(v, lang)),
      tooltip: { ...base(ct).tooltip, formatter: (ps: any[]) => {
        const k = ps[0].dataIndex;
        if (k < hist) return tipHead(`${t(L("Semana del", "Week of"))} ${labels[k]}`) + tipRow(ct.text, t(L("Real", "Actual")), brl(av[k], lang, false));
        const j = k - hist;
        return tipHead(`${t(L("Semana del", "Week of"))} ${labels[k]}`) + tipRow(ct.series[0], t(sel.label), brl(f.future.pred[j], lang, false)) + tipRow(ct.band, t(L("Intervalo 80%", "80% interval")), `${brl(f.future.lo[j], lang)} – ${brl(f.future.hi[j], lang)}`) + tipRow(ct.neutral, t(baseM.label), brl(f.future.baseline[j], lang, false)) + tipNote(t(L("Proyección estadística, no meta", "Statistical projection, not a target")));
      } },
      series: [
        { name: t(L("Real (semanal)", "Actual (weekly)")), type: "line", data: [...av, ...new Array(f.horizon).fill(null)], showSymbol: false, lineStyle: { width: 2, color: ct.text }, itemStyle: { color: ct.text } },
        { name: "lo", type: "line", data: join(f.future.lo), stack: "band", lineStyle: { opacity: 0 }, showSymbol: false, silent: true, tooltip: { show: false } },
        { name: t(L("Intervalo 80%", "80% interval")), type: "line", data: [...new Array(hist - 1).fill(null), 0, ...f.future.hi.map((h, i) => h - f.future.lo[i])], stack: "band", lineStyle: { opacity: 0 }, areaStyle: { color: ct.band }, showSymbol: false, silent: true, itemStyle: { color: ct.band } },
        { name: t(sel.label), type: "line", data: join(f.future.pred), symbolSize: 6, lineStyle: { width: 2, color: ct.series[0] }, itemStyle: { color: ct.series[0], borderColor: ct.surface, borderWidth: 2 } },
        { name: t(baseM.label), type: "line", data: join(f.future.baseline), showSymbol: false, lineStyle: { width: 1.5, type: "dashed", color: ct.neutral }, itemStyle: { color: ct.neutral } },
      ],
    };
  }, [av, labels, ct, lang, t, f, sel, baseM]);
  const next = f.future.pred.reduce((a, b) => a + b, 0), last = f.actual.slice(-f.horizon).reduce((a, b) => a + b, 0);
  const lo = f.future.lo.reduce((a, b) => a + b, 0), hi = f.future.hi.reduce((a, b) => a + b, 0);
  return (
    <ChartCard id="chart-forecast" title={L("Pronóstico de ingresos: 8 semanas", "Revenue forecast: 8 weeks")} subtitle={L("Ingreso semanal (R$), histórico frente a proyección con intervalo empírico del 80%", "Weekly revenue (R$), history vs projection with an empirical 80% interval")}
      filters={[F.none]} source={SRC}
      table={{ columns: [t(L("Semana", "Week")), t(L("Pronóstico", "Forecast")), t(L("Mín. 80%", "Low 80%")), t(L("Máx. 80%", "High 80%")), t(baseM.label)], rows: f.future.weeks.map((w, i) => [dateLabel(w, lang), Math.round(f.future.pred[i]), Math.round(f.future.lo[i]), Math.round(f.future.hi[i]), Math.round(f.future.baseline[i])]) }}
      explain={{
        measures: L("Modelo directo por horizonte (Ridge sobre log-ingreso con 4 rezagos, media móvil, tendencia y marca de Black Friday). El intervalo usa los errores relativos del backtest (percentiles 10 y 90).",
          "Direct per-horizon model (Ridge on log revenue with 4 lags, moving average, trend and a Black Friday flag). The interval uses relative backtest errors (10th and 90th percentiles)."),
        observed: { es: `Para las 8 semanas desde ${dateLabel(f.future.weeks[0], "es")} se proyectan ${brl(next, "es")} (rango 80%: ${brl(lo, "es")} – ${brl(hi, "es")}), ${signedPct(next / last - 1, "es")} frente a las 8 semanas previas. El intervalo cubrió ${pct(f.interval.holdoutCoverage, "es", 0)} de los casos fuera de muestra (objetivo 80%).`,
          en: `For the 8 weeks from ${dateLabel(f.future.weeks[0], "en")} the projection is ${brl(next, "en")} (80% range: ${brl(lo, "en")} – ${brl(hi, "en")}), ${signedPct(next / last - 1, "en")} vs the previous 8 weeks. The interval covered ${pct(f.interval.holdoutCoverage, "en", 0)} of out-of-sample cases (target 80%).` },
        implications: L("El rango importa más que el punto: planificar con el escenario bajo protege inventario y caja.", "The range matters more than the point: planning on the low scenario protects inventory and cash."),
        decisions: L("Compras de inventario, dotación logística y presupuesto de campañas del próximo bimestre.", "Inventory purchases, logistics staffing and next two months' campaign budget."),
        limits: L("Solo 81 semanas de historia: sin estacionalidad anual. La cobertura real del intervalo fue menor que la nominal, así que el rango es optimista. No hay datos reales posteriores para contrastar.",
          "Only 81 weeks of history: no yearly seasonality. Actual interval coverage was below nominal, so the range is optimistic. No later actuals exist to check against."),
      }}>
      <EChart option={option} height={320} label={t(L("Líneas de ingreso semanal real y pronosticado con banda de intervalo", "Lines of actual and forecast weekly revenue with interval band"))} />
    </ChartCard>
  );
}

export function ModelComparison({ c }: { c: RCtx }) {
  const { d, ct, lang, t } = c;
  const f = d.forecast;
  const ms = f.metrics;
  const names = ms.map((m) => t(m.label));
  const option = useMemo<EOption>(() => ({
    ...base(ct), grid: { left: 8, right: 56, top: 8, bottom: 8, containLabel: true },
    yAxis: catAxis(ct, names, { inverse: true, axisLabel: { color: ct.text2, fontSize: 11.5 } }),
    xAxis: valueAxis(ct, (v: number) => pct(v, lang, 0)),
    tooltip: { ...base(ct).tooltip, axisPointer: { type: "shadow", shadowStyle: { color: ct.grid, opacity: 0.5 } }, formatter: (ps: any[]) => { const m = ms[ps[0].dataIndex]; return tipHead(t(m.label)) + tipRow(ct.series[0], "WMAPE", pct(m.wmape, lang)) + tipRow(ct.neutral, "MAE", brl(m.mae, lang, false)) + tipRow(ct.neutral, t(L("Sesgo", "Bias")), signedPct(m.bias, lang)) + tipNote(m.baseline ? t(L("Modelo base sencillo", "Simple baseline")) : m.model === f.selected ? t(L("Seleccionado (menor WMAPE)", "Selected (lowest WMAPE)")) : ""); } },
    series: [{ type: "bar", barMaxWidth: 18, data: ms.map((m) => ({ value: m.wmape, itemStyle: barStyle(m.model === f.selected ? ct.series[0] : m.baseline ? ct.series[1] : ct.neutral, true) })),
      label: { show: true, position: "right", fontSize: 11, color: ct.text2, formatter: (p: any) => pct(p.value, lang) } }],
  }), [ms, names, ct, lang, t, f.selected]);
  const sel = ms[0], b = ms.find((m) => m.model === f.bestBaseline)!;
  return (
    <ChartCard title={L("Comparación de modelos (backtest)", "Model comparison (backtest)")} subtitle={L("WMAPE en 15 orígenes × 8 semanas; menor es mejor. Azul = elegido, naranja = modelos base", "WMAPE over 15 origins × 8 weeks; lower is better. Blue = selected, orange = baselines")}
      filters={[F.none]} source={SRC}
      table={{ columns: [t(L("Modelo", "Model")), "WMAPE", "MAE (R$)", t(L("Sesgo", "Bias"))], rows: ms.map((m) => [t(m.label), pct(m.wmape, lang), Math.round(m.mae), signedPct(m.bias, lang)]) }}
      explain={{
        measures: L("Backtest con origen móvil: cada modelo se entrena solo con semanas anteriores al origen y predice las 8 siguientes (sin fuga de información; hay una prueba automática que lo verifica). WMAPE = Σ|error| / Σ real.",
          "Rolling-origin backtest: each model trains only on weeks before the origin and predicts the next 8 (no leakage; an automated test checks it). WMAPE = Σ|error| / Σ actual."),
        observed: { es: `${t(sel.label)} logra WMAPE ${pct(sel.wmape, "es")} frente a ${pct(b.wmape, "es")} del mejor modelo base (${b.label.es}): ${pct(f.improvementVsBaseline, "es", 0)} menos error. El gradient boosting no supera a la media móvil con tan poca historia.`,
          en: `${t(sel.label)} reaches WMAPE ${pct(sel.wmape, "en")} vs ${pct(b.wmape, "en")} for the best baseline (${b.label.en}): ${pct(f.improvementVsBaseline, "en", 0)} less error. Gradient boosting does not beat the moving average with so little history.` },
        implications: L("La complejidad se justifica solo cuando mejora a una regla simple medida en las mismas condiciones.", "Complexity is justified only when it beats a simple rule measured under the same conditions."),
        decisions: L("Qué modelo poner en producción y cuándo reentrenarlo.", "Which model to deploy and when to retrain it."),
        limits: L("15 orígenes es una muestra pequeña; el Black Friday cae dentro de varias ventanas y pesa en el error.", "15 origins is a small sample; Black Friday falls inside several windows and weighs on the error."),
      }}>
      <EChart option={option} height={230} label={t(L("Barras de error por modelo", "Bars of error by model"))} />
    </ChartCard>
  );
}

export function BacktestExplorer({ c }: { c: RCtx }) {
  const { d, ct, lang, t } = c;
  const f = d.forecast;
  const [k, setK] = useState(f.origins.length - 1);
  const o = f.origins[k];
  const ctx = 12;
  const idx = Array.from({ length: ctx + f.horizon }, (_, i) => o - ctx + 1 + i);
  const labels = idx.map((i) => dateLabel(f.weeks[i], lang));
  const show = [f.selected, f.bestBaseline];
  const err = (m: string) => { const p = f.backtestPred[m][String(o)]; let e = 0, s = 0; p.forEach((v, h) => { e += Math.abs(f.actual[o + 1 + h] - v); s += f.actual[o + 1 + h]; }); return e / s; };
  const option = useMemo<EOption>(() => ({
    ...base(ct), legend: legend(ct), grid: { left: 8, right: 16, top: 34, bottom: 8, containLabel: true },
    xAxis: catAxis(ct, labels, { boundaryGap: false, axisLabel: { color: ct.text3, fontSize: 10.5, hideOverlap: true } }),
    yAxis: valueAxis(ct, (v: number) => brlAxis(v, lang)),
    tooltip: { ...base(ct).tooltip, formatter: (ps: any[]) => tipHead(labels[ps[0].dataIndex]) + ps.filter((p) => p.value != null).map((p) => tipRow(p.color, p.seriesName, brl(p.value, lang, false))).join("") },
    series: [
      { name: t(L("Real", "Actual")), type: "line", data: idx.map((i) => f.actual[i]), showSymbol: false, lineStyle: { width: 2, color: ct.text }, itemStyle: { color: ct.text },
        markLine: { silent: true, symbol: "none", lineStyle: { color: ct.axis, type: "dashed" }, label: { color: ct.text3, fontSize: 10.5, formatter: t(L("origen", "origin")) }, data: [{ xAxis: ctx - 1 }] } },
      ...show.map((m, j) => ({ name: t(f.metrics.find((x) => x.model === m)!.label), type: "line", data: [...new Array(ctx - 1).fill(null), f.actual[o], ...f.backtestPred[m][String(o)]], symbolSize: 6,
        lineStyle: { width: 2, type: j ? "dashed" : "solid", color: j ? ct.series[1] : ct.series[0] }, itemStyle: { color: j ? ct.series[1] : ct.series[0], borderColor: ct.surface, borderWidth: 2 } })),
    ],
  }), [idx, labels, ct, lang, t, f, o, show]);
  return (
    <ChartCard title={L("Explorador del backtest", "Backtest explorer")} subtitle={L("Elige un origen: el modelo solo vio los datos a la izquierda de la línea", "Pick an origin: the model only saw data left of the line")}
      filters={[F.none]} source={SRC}
      table={{ columns: [t(L("Semana", "Week")), t(L("Real", "Actual")), ...show.map((m) => t(f.metrics.find((x) => x.model === m)!.label))], rows: f.backtestPred[f.selected][String(o)].map((_, h) => [dateLabel(f.weeks[o + 1 + h], lang), Math.round(f.actual[o + 1 + h]), ...show.map((m) => Math.round(f.backtestPred[m][String(o)][h]))]) }}
      explain={{
        measures: L("Predicciones guardadas de cada origen del backtest frente a lo que ocurrió.", "Stored predictions from each backtest origin vs what happened."),
        observed: { es: `Con origen ${dateLabel(f.weeks[o], "es")}, el WMAPE de las 8 semanas siguientes fue ${pct(err(f.selected), "es")} para el modelo elegido y ${pct(err(f.bestBaseline), "es")} para el modelo base.`,
          en: `With origin ${dateLabel(f.weeks[o], "en")}, the next 8 weeks' WMAPE was ${pct(err(f.selected), "en")} for the selected model and ${pct(err(f.bestBaseline), "en")} for the baseline.` },
        implications: L("El error varía mucho entre orígenes; un solo promedio oculta semanas difíciles como noviembre.", "Error varies a lot between origins; a single average hides hard weeks such as November."),
        decisions: L("Cuándo confiar en el pronóstico y cuándo añadir juicio comercial (eventos conocidos).", "When to trust the forecast and when to add commercial judgment (known events)."),
        limits: L("Orígenes cada 2 semanas desde la semana 44; los primeros tienen menos historia para entrenar.", "Origins every 2 weeks from week 44; early ones have less training history."),
      }}>
      <div className="px-2 pb-2">
        <Slider label={t(L("Origen del backtest", "Backtest origin"))} value={k} min={0} max={f.origins.length - 1} onChange={setK} format={() => dateLabel(f.weeks[o], lang)} />
      </div>
      <EChart option={option} height={280} label={t(L("Líneas de backtest para un origen", "Backtest lines for one origin"))} />
    </ChartCard>
  );
}
