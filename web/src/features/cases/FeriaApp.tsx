"use client";
import { useMemo, useState } from "react";
import { AppShell, Section } from "@/components/AppShell";
import { CASE_NAV, CaseIntro, FilterBar, FindingsSection, ImpactSection, LimitsSection, MethodSection, SlideList, bi, ins, type Step } from "@/components/CaseKit";
import { ChartCard } from "@/components/ChartCard";
import { EChart, type EOption } from "@/components/EChart";
import { KpiCard, type Method } from "@/components/KpiCard";
import { BigStat, PresentationMode, type Slide } from "@/components/Presentation";
import { LoadError, Loading } from "@/components/States";
import { axisTip, barStyle, base, catAxis, legend, tipHead, tipNote, tipRow, valueAxis } from "@/components/chart-kit";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useDataset } from "@/lib/data";
import { WEEKDAYS, dateLabel, monthLabel, num, pct, signedPct } from "@/lib/format";
import { chartTheme, type ChartTheme } from "@/lib/palette";
import { L, usePrefs, type Bi, type Lang } from "@/lib/prefs";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Cls = "ALL" | "A" | "B" | "C";
type Model = "seasonal_naive" | "weekday_mean_8w";
type FeriaData = {
  meta: { source: string; seed: number; generatedAt: string; holdoutFrom: string; holdoutTo: string };
  metrics: Record<string, number | string>;
  months: string[]; monthly: Record<Cls, number[]>; weekday: Record<Cls, number[]>;
  pareto: number[]; classCounts: Record<"A" | "B" | "C", number>;
  origins: string[]; backtest: Record<Cls, Record<Model, { wmape: number[]; bias: number[] }>>;
  holdout: { dates: string[]; wmape: Record<Cls, Record<Model, number>>; products: { id: string; cls: "A" | "B" | "C"; units: number; actual: number[]; naive: number[]; weekday: number[] }[] };
  checks: { check: string; passed: boolean; detail: string }[];
};
const isFeria = (d: unknown): d is FeriaData => !!d && typeof d === "object" && "holdout" in d && "pareto" in d;
const SRC = L("Datos sintéticos (semilla 20260907) · 128 productos × 1.096 días · tools/build_analysis.py", "Synthetic data (seed 20260907) · 128 products × 1,096 days · tools/build_analysis.py");
const MODEL: Record<Model, Bi> = { seasonal_naive: L("Ingenuo estacional (mismo día semana pasada)", "Seasonal naive (same day last week)"), weekday_mean_8w: L("Media de 8 semanas por día", "8-week weekday mean") };
const CLS: Record<Cls, Bi> = { ALL: L("Todos los productos", "All products"), A: L("Clase A (80% del volumen)", "Class A (80% of volume)"), B: L("Clase B (siguiente 15%)", "Class B (next 15%)"), C: L("Clase C (último 5%)", "Class C (last 5%)") };
type Ctx = { d: FeriaData; ct: ChartTheme; lang: Lang; t: (b: Bi | string) => string; cls: Cls };

export default function FeriaApp() {
  const s = useDataset<FeriaData>("case-feria", isFeria);
  if (s.status === "loading") return <Loading what="Demand Baseline Planner" />;
  if (s.status === "error") return <LoadError error={s.error} dataset="case-feria" />;
  return <Feria d={s.data} />;
}

function Feria({ d }: { d: FeriaData }) {
  const { lang, theme, t } = usePrefs();
  const ct = useMemo(() => chartTheme(theme), [theme]);
  const [cls, setCls] = useState<Cls>("ALL");
  const [present, setPresent] = useState(false);
  const c: Ctx = { d, ct, lang, t, cls };
  const m = d.metrics as Record<string, number>;
  const M = (definition: Bi, formula: string, notes: Bi): Method => ({ definition, formula, source: SRC, notes });
  const hw = d.holdout.wmape[cls];
  const red = 1 - hw.weekday_mean_8w / hw.seasonal_naive;
  const mm = d.monthly[cls];
  const last12 = mm.slice(-12).reduce((s, x) => s + x, 0), prev12 = mm.slice(-24, -12).reduce((s, x) => s + x, 0);
  const wk = d.weekday[cls]; const wkAvg = wk.reduce((s, x) => s + x, 0) / 7;
  const nProd = cls === "ALL" ? 128 : d.classCounts[cls];
  const insights = [
    ins("model", "measured", L("Una regla simple supera al ingenuo en todos los cortes", "A simple rule beats naive at every cut-off"),
      bi((l) => l === "es" ? `Media de 8 semanas por día: WMAPE ${pct(m.holdout_wmape, l)} vs ${pct(m.baseline_wmape, l)} del ingenuo en los 28 días finales (−${num(m.relative_error_reduction_pct, l, 1)}% de error), y mejor en los 5 orígenes de backtest.` : `8-week weekday mean: WMAPE ${pct(m.holdout_wmape, l)} vs naive ${pct(m.baseline_wmape, l)} over the final 28 days (−${num(m.relative_error_reduction_pct, l, 1)}% error), and better at all 5 backtest origins.`),
      L("Un comercio pequeño puede operarla en una planilla, sin infraestructura de ML.", "A small business can run it in a spreadsheet, with no ML infrastructure."),
      L("Adoptarla como línea base de compras diarias.", "Adopt it as the daily purchasing baseline."),
      L("Comparar contra quiebres y merma reales al menos 4 semanas.", "Compare against real stockouts and waste for at least 4 weeks.")),
    ins("abc", "measured", bi((l) => l === "es" ? `${d.classCounts.A} productos concentran el 80% del volumen` : `${d.classCounts.A} products account for 80% of volume`),
      bi((l) => l === "es" ? `Clase A: ${d.classCounts.A} de 128 productos; B: ${d.classCounts.B}; C: ${d.classCounts.C}. El error es menor en A (${pct(d.holdout.wmape.A.weekday_mean_8w, l)}) que en C (${pct(d.holdout.wmape.C.weekday_mean_8w, l)}).` : `Class A: ${d.classCounts.A} of 128 products; B: ${d.classCounts.B}; C: ${d.classCounts.C}. Error is lower in A (${pct(d.holdout.wmape.A.weekday_mean_8w, l)}) than in C (${pct(d.holdout.wmape.C.weekday_mean_8w, l)}).`),
      L("Los productos de bajo volumen son más ruidosos: un pronóstico fino no compensa su variabilidad.", "Low-volume products are noisier: a finer forecast cannot offset their variability."),
      L("Concentrar el seguimiento diario en clase A y usar reglas de stock mínimo en C.", "Focus daily tracking on class A and use minimum-stock rules for C."),
      L("Revisar la clasificación cada trimestre.", "Review the classification quarterly.")),
    ins("weekday", "measured", L("El fin de semana vende ~50% más que un día hábil", "Weekends sell ~50% more than a weekday"),
      bi((l) => l === "es" ? `Sábado y domingo promedian ${num((wk[5] + wk[6]) / 2, l)} unidades vs ${num(wk.slice(0, 5).reduce((s, x) => s + x, 0) / 5, l)} de lunes a viernes (${CLS[cls].es.toLowerCase()}).` : `Saturday and Sunday average ${num((wk[5] + wk[6]) / 2, l)} units vs ${num(wk.slice(0, 5).reduce((s, x) => s + x, 0) / 5, l)} Monday to Friday (${CLS[cls].en.toLowerCase()}).`),
      L("Por eso un promedio por día de la semana funciona mejor que un promedio general.", "That is why a weekday average works better than an overall average."),
      L("Planificar compras y personal con perfil semanal.", "Plan purchasing and staff with a weekly profile."),
      L("Patrón del generador sintético: validar con ventas reales.", "Pattern from the synthetic generator: validate with real sales.")),
    ins("bias", "measured", L("El ingenuo exagera los peaks; la media suaviza", "Naive exaggerates peaks; the mean smooths them"),
      L("Copiar la semana pasada arrastra cualquier día atípico; promediar 8 semanas lo diluye, con un sesgo cercano a cero.", "Copying last week carries over any atypical day; averaging 8 weeks dilutes it, with near-zero bias."),
      L("Menos sobrestock después de un día excepcional.", "Less overstock after an exceptional day."),
      L("Revisar manualmente feriados y eventos conocidos.", "Manually review holidays and known events."),
      L("Feriados no modelados explícitamente.", "Holidays are not explicitly modelled.")),
    ins("buffer", "simulated", L("Escenario: colchón de 15% sobre el pronóstico", "Scenario: 15% buffer over the forecast"),
      L("Ver el simulador: muestra días con faltante y unidades sobrantes en los 28 días de prueba.", "See the simulator: it shows days short and surplus units over the 28 holdout days."),
      L("Permite elegir un nivel de servicio explícito en vez de comprar «a ojo».", "Allows choosing an explicit service level instead of buying “by eye”."),
      L("Fijar colchones distintos por clase ABC.", "Set different buffers per ABC class."),
      L("Simulación sobre datos sintéticos; sin costos de merma reales.", "Simulation on synthetic data; no real waste costs.")),
  ];
  const steps: Step[] = [
    { title: L("Comprensión del problema", "Understanding the problem"), body: L("Un comercio de feria necesita saber cuánto comprar cada día sin herramientas complejas.", "A market stall needs to know how much to buy each day without complex tools.") },
    { title: L("Datos (sintéticos)", "Data (synthetic)"), body: L("No había registros reales disponibles: se generó un dataset sintético reproducible con semilla y se declara en cada gráfico.", "No real records were available: a reproducible synthetic dataset was generated with a seed and declared on every chart."), facts: [L("140.288 filas · 128 productos · 3 años", "140,288 rows · 128 products · 3 years")] },
    { title: L("Preparación", "Preparation"), body: L("Validación de grano producto-día, sin faltantes ni negativos; clasificación ABC por volumen con SQL de ventanas.", "Product-day grain validation, no missing or negative values; ABC volume classes with window SQL.") },
    { title: L("Análisis exploratorio", "Exploratory analysis"), body: L("Tendencia mensual, perfil semanal y concentración del volumen.", "Monthly trend, weekly profile and volume concentration.") },
    { title: L("Modelos", "Models"), body: L("Dos reglas operables: ingenuo estacional y media de 8 semanas por día de la semana.", "Two operable rules: seasonal naive and 8-week weekday mean.") },
    { title: L("Evaluación", "Evaluation"), body: L("Backtest en 5 orígenes mensuales + 28 días finales reservados; WMAPE y sesgo por clase.", "Backtest at 5 monthly origins + 28 reserved final days; WMAPE and bias per class.") },
    { title: L("Implementación", "Implementation"), body: L("Excel, Tableau y esta app con filtro ABC, explorador por producto y simulador de colchón.", "Excel, Tableau and this app with ABC filter, product explorer and buffer simulator."), facts: [L(`${d.checks.length} controles aprobados`, `${d.checks.length} checks passing`)] },
  ];
  const slides: Slide[] = [
    { kicker: L("Contexto", "Context"), title: L("Un pronóstico que un comercio pequeño puede operar", "A forecast a small business can run"), body: <p className="max-w-3xl">{t(L("Datos sintéticos (declarados) de 128 productos durante 3 años. Objetivo: una regla de compra diaria simple y validada.", "Synthetic (declared) data for 128 products over 3 years. Goal: a simple, validated daily purchasing rule."))}</p> },
    { kicker: L("Resultado", "Result"), title: L("La media de 8 semanas por día gana", "The 8-week weekday mean wins"), body: <div className="grid gap-4 md:grid-cols-3">
      <BigStat value={pct(m.holdout_wmape, lang)} label="WMAPE" note={t(L("media 8 semanas", "8-week mean"))} />
      <BigStat value={pct(m.baseline_wmape, lang)} label="WMAPE" note={t(L("ingenuo estacional", "seasonal naive"))} />
      <BigStat value={`−${num(m.relative_error_reduction_pct, lang, 1)}%`} label={t(L("Error relativo", "Relative error"))} />
    </div> },
    { kicker: L("Hallazgos", "Findings"), title: L("Lo que muestran los datos", "What the data shows"), body: <SlideList items={insights.slice(0, 4).map((i) => i.evidence)} /> },
    { kicker: L("Recomendación", "Recommendation"), title: L("Adoptar la regla y medir en operación", "Adopt the rule and measure in operation"), body: <SlideList items={[L("Usarla como base de compras diarias en clase A.", "Use it as the daily purchasing base for class A."), L("Medir quiebres y merma reales durante 4 semanas.", "Measure real stockouts and waste for 4 weeks."), L("Ajustar colchones por clase ABC.", "Tune buffers per ABC class.")]} /> },
    { kicker: L("Limitaciones", "Limitations"), title: L("Datos sintéticos", "Synthetic data"), body: <SlideList items={[L("Los patrones vienen del generador, no de un comercio real.", "Patterns come from the generator, not a real business."), L("No hay precios: no se valoriza el impacto.", "No prices: impact is not valued.")]} /> },
  ];
  return (
    <>
      <AppShell app="Demand Baseline Planner" tagline={L("Pronóstico operable · datos sintéticos", "Operable forecasting · synthetic data")} nav={CASE_NAV([{ id: "modelos", label: L("Modelos y backtest", "Models and backtest") }])} onPresent={() => setPresent(true)}
        filterBar={<FilterBar><div className="w-56"><Select label={t(L("Clase de volumen (ABC)", "Volume class (ABC)"))} value={cls} onChange={(e) => setCls(e.target.value as Cls)}>{(Object.keys(CLS) as Cls[]).map((k) => <option key={k} value={k}>{t(CLS[k])}</option>)}</Select></div></FilterBar>}>
        <CaseIntro kind="synthetic" badges={[t(L("semilla 20260907", "seed 20260907")), "140.288 " + t(L("filas", "rows")), "2023–2025"]}
          summary={[
            bi((l) => l === "es" ? `La media de 8 semanas por día de la semana logra WMAPE ${pct(m.holdout_wmape, l)} frente a ${pct(m.baseline_wmape, l)} del ingenuo estacional en los 28 días finales.` : `The 8-week weekday mean reaches WMAPE ${pct(m.holdout_wmape, l)} vs ${pct(m.baseline_wmape, l)} for the seasonal naive over the final 28 days.`),
            bi((l) => l === "es" ? `${d.classCounts.A} de 128 productos explican el 80% del volumen; ahí el error es menor.` : `${d.classCounts.A} of 128 products explain 80% of volume; error is lower there.`),
            L("Los datos son sintéticos y se declaran así: sirven para demostrar el método, no resultados de un comercio real.", "The data is synthetic and declared as such: it demonstrates the method, not results from a real business."),
          ]}
          decision={L("adoptar la media de 8 semanas por día como línea base de compras y validarla 4 semanas con quiebres y merma reales.", "adopt the 8-week weekday mean as the purchasing baseline and validate it for 4 weeks with real stockouts and waste.")}
          questions={[[L("¿Cómo evoluciona la demanda?", "How does demand evolve?"), "chart-monthly"], [L("¿Qué días se vende más?", "Which days sell most?"), "chart-weekday"], [L("¿Qué productos importan más?", "Which products matter most?"), "chart-pareto"], [L("¿Qué regla pronostica mejor?", "Which rule forecasts best?"), "chart-backtest"], [L("¿Cómo se ve por producto?", "What does it look like per product?"), "chart-product"], [L("¿Cuánto colchón conviene?", "How much buffer is sensible?"), "simulator"]]} />
        <Section id="dashboard" n={3} title={L("Dashboard de demanda", "Demand dashboard")} intro={bi((l) => `${CLS[cls][l]} · ${l === "es" ? "datos sintéticos" : "synthetic data"}`)}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <KpiCard label={L("Productos", "Products")} value={num(nProd, lang)} change={null} changeLabel={t(CLS[cls])} description={L("En el filtro", "In the filter")} method={M(L("Productos en la clase ABC elegida.", "Products in the chosen ABC class."), "COUNT(DISTINCT product_id)", L("ABC por volumen histórico antes del período de prueba.", "ABC by historical volume before the holdout."))} />
            <KpiCard label={L("Unidades últimos 12 meses", "Units last 12 months")} value={num(last12, lang)} change={last12 / prev12 - 1} changeLabel={`${signedPct(last12 / prev12 - 1, lang)} ${t(L("vs 12 meses previos", "vs prior 12 months"))}`} description={L("Demanda total", "Total demand")} method={M(L("Suma de unidades demandadas en los últimos 12 meses completos.", "Sum of units demanded over the last 12 complete months."), "Σ demand_units", L("Unidades mezclan productos distintos: sirve para tendencia, no para valor.", "Units mix different products: good for trend, not value."))} />
            <KpiCard label={L("Unidades por día", "Units per day")} value={num(wkAvg, lang)} change={null} changeLabel={`${t(L("pico", "peak"))}: ${WEEKDAYS[lang][wk.indexOf(Math.max(...wk))]}`} description={L("Promedio de entrenamiento", "Training average")} method={M(L("Promedio diario antes del período de prueba.", "Daily average before the holdout."), "mean(Σ units per day)", L("Sin los 28 días finales.", "Excludes the final 28 days."))} />
            <KpiCard label={L("WMAPE · media 8 semanas", "WMAPE · 8-week mean")} value={pct(hw.weekday_mean_8w, lang)} change={-red} goodWhenUp={false} changeLabel={`${signedPct(-red, lang)} ${t(L("vs ingenuo", "vs naive"))}`} description={L("28 días finales reservados", "28 reserved final days")} method={M(L("Error absoluto total dividido por la demanda total en el período de prueba.", "Total absolute error divided by total demand in the holdout."), "Σ|y − ŷ| / Σ y", L("Pondera por volumen: los productos grandes pesan más.", "Volume-weighted: large products weigh more."))} />
            <KpiCard label={L("WMAPE · ingenuo", "WMAPE · naive")} value={pct(hw.seasonal_naive, lang)} change={null} changeLabel={t(L("línea base", "baseline"))} description={L("Mismo día de la semana anterior", "Same day last week")} method={M(L("Pronóstico = demanda del mismo día 7 días antes.", "Forecast = demand on the same day 7 days earlier."), "ŷₜ = yₜ₋₇", L("Referencia obligatoria.", "Mandatory reference."))} />
            <KpiCard label={L("Concentración", "Concentration")} value={`${d.classCounts.A} / 128`} change={null} changeLabel={t(L("productos = 80% del volumen", "products = 80% of volume"))} description={L("Clase A", "Class A")} method={M(L("Productos que acumulan el 80% de las unidades históricas.", "Products accumulating 80% of historical units."), "cumsum(units desc) ≤ 0.8", L("Clasificación por volumen, no por valor (no hay precios).", "Classification by volume, not value (no prices)."))} />
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-2"><MonthlyChart c={c} /><WeekdayChart c={c} /></div>
        </Section>
        <Section id="modelos" n={4} title={L("Modelos y backtest", "Models and backtest")} intro={L("Se reservan los últimos 28 días; los cortes anteriores simulan cómo habría funcionado la regla mes a mes.", "The last 28 days are reserved; earlier cut-offs simulate how the rule would have worked month by month.")}>
          <div className="grid gap-4 xl:grid-cols-2"><BacktestChart c={c} /><ParetoChart c={c} /></div>
          <div className="mt-4"><ProductChart c={c} /></div>
        </Section>
        <FindingsSection n={5} items={insights} />
        <ImpactSection n={6}
          measured={[bi((l) => l === "es" ? `WMAPE ${pct(m.holdout_wmape, l)} vs ${pct(m.baseline_wmape, l)} (−${num(m.relative_error_reduction_pct, l, 1)}% de error).` : `WMAPE ${pct(m.holdout_wmape, l)} vs ${pct(m.baseline_wmape, l)} (−${num(m.relative_error_reduction_pct, l, 1)}% error).`), L("Mejor en los 5 orígenes de backtest.", "Better at all 5 backtest origins."), L("Medido sobre datos sintéticos.", "Measured on synthetic data.")]}
          simulated={<p>{t(L("Días con faltante y unidades sobrantes según el colchón elegido (abajo).", "Days short and surplus units for the chosen buffer (below)."))}</p>}
          expected={[L("Compras diarias más estables", "More stable daily purchasing"), L("Menos quiebres en productos clase A", "Fewer stockouts in class A products"), L("Menos merma por sobrecompra tras días atípicos", "Less waste from over-buying after atypical days")]}>
          <BufferSim c={c} />
        </ImpactSection>
        <MethodSection n={7} steps={steps}
          stages={[{ name: L("Generador", "Generator"), tech: "Python · seed", detail: L("Datos sintéticos reproducibles", "Reproducible synthetic data") }, { name: L("SQL", "SQL"), tech: "SUM() OVER (ORDER BY …)", detail: L("Clases ABC por volumen", "ABC classes by volume") }, { name: L("Backtest", "Backtest"), tech: "pandas", detail: L("5 orígenes + 28 días", "5 origins + 28 days") }, { name: L("BI", "BI"), tech: "Excel · Tableau", detail: L("Dashboard y libro", "Dashboard and workbook") }, { name: L("App", "App"), tech: "Next.js · ECharts", detail: L("ABC, producto, colchón", "ABC, product, buffer") }]}
          defs={[["WMAPE", "Σ|y − ŷ| / Σ y", t(L("Ponderado por volumen", "Volume-weighted"))], [t(L("Sesgo", "Bias")), "Σ(ŷ − y) / Σ y", t(L("+ = sobrestima", "+ = over-forecast"))], [t(L("Ingenuo estacional", "Seasonal naive")), "ŷₜ = yₜ₋₇", ""], [t(L("Media 8 semanas", "8-week mean")), "ŷₜ = mean(yₜ₋₇, …, yₜ₋₅₆)", t(L("Mismo día de la semana", "Same weekday"))]]}
          checks={d.checks}
          decisions={[L("Se prefirió una regla operable en planilla a un modelo complejo: el objetivo es adopción.", "A spreadsheet-operable rule was preferred to a complex model: adoption is the goal."), L("ABC por volumen porque no hay precios; se declara.", "ABC by volume because there are no prices; this is declared."), L("Los datos sintéticos se etiquetan en cada vista.", "Synthetic data is labelled in every view.")]}
          repo="https://github.com/Chrov/Portfolio/tree/main/case-studies/feria-demand" generated={d.meta.generatedAt}
          links={[{ href: "../../case-studies/feria-demand/dashboard.xlsx", label: L("Dashboard Excel", "Excel dashboard") }, { href: "../../case-studies/feria-demand/dashboard.twbx", label: L("Libro Tableau (.twbx)", "Tableau workbook (.twbx)") }, { href: "../../case-studies/feria-demand/evidence-pack.zip", label: L("Paquete de evidencia (ZIP)", "Evidence pack (ZIP)") }]} />
        <LimitsSection n={8}
          limits={[L("Datos sintéticos: los patrones provienen del generador.", "Synthetic data: patterns come from the generator."), L("Sin precios ni costos: no se valoriza el impacto.", "No prices or costs: impact is not valued."), L("Feriados y eventos no modelados explícitamente.", "Holidays and events not explicitly modelled."), L("Demanda = ventas observadas; los quiebres la censuran en la realidad.", "Demand = observed sales; stockouts censor it in reality.")]}
          future={[L("Validar con 4 semanas de ventas reales.", "Validate with 4 weeks of real sales."), L("Agregar calendario de feriados.", "Add a holiday calendar."), L("Valorizar con precios y costos para optimizar el colchón.", "Value with prices and costs to optimise the buffer.")]} />
      </AppShell>
      <PresentationMode open={present} onClose={() => setPresent(false)} slides={slides} app="Demand Baseline Planner" />
    </>
  );
}

function MonthlyChart({ c }: { c: Ctx }) {
  const { d, ct, lang, t, cls } = c;
  const v = d.monthly[cls];
  const labels = d.months.map((x) => monthLabel(x, lang));
  const option = useMemo<EOption>(() => ({
    ...base(ct), xAxis: catAxis(ct, labels), yAxis: valueAxis(ct, (x: number) => num(x, lang)),
    tooltip: axisTip(ct, (k) => tipHead(monthLabel(d.months[k], lang, true)) + tipRow(ct.series[0], t(L("Unidades", "Units")), num(v[k], lang)) + (k >= 12 ? tipNote(`${signedPct(v[k] / v[k - 12] - 1, lang)} ${t(L("vs mismo mes año anterior", "vs same month last year"))}`) : "")),
    series: [{ type: "line", data: v, lineStyle: { width: 2, color: ct.series[0] }, itemStyle: { color: ct.series[0] }, symbolSize: 5, areaStyle: { color: ct.band } }],
  }), [v, labels, ct, lang, t, d]);
  const iMax = v.indexOf(Math.max(...v)), iMin = v.indexOf(Math.min(...v));
  // per-day average removes the month-length effect (February has fewer days)
  const perDay = v.map((x, k) => { const [y, mo] = d.months[k].split("-").map(Number); return x / new Date(Date.UTC(y, mo, 0)).getUTCDate(); });
  const pdMean = perDay.reduce((s, x) => s + x, 0) / perDay.length;
  const pdSpread = Math.max(...perDay.map((x) => Math.abs(x / pdMean - 1)));
  return (
    <ChartCard id="chart-monthly" title={L("Demanda mensual", "Monthly demand")} subtitle={L("Unidades por mes (sintético)", "Units per month (synthetic)")} filters={[L("Clase ABC", "ABC class")]} source={SRC}
      table={{ columns: [t(L("Mes", "Month")), t(L("Unidades", "Units"))], rows: d.months.map((x, k) => [monthLabel(x, lang, true), num(v[k], lang)]) }}
      explain={{
        measures: L("Suma mensual de unidades demandadas de los productos del filtro.", "Monthly sum of units demanded for products in the filter."),
        observed: bi((l) => l === "es" ? `Máximo en ${monthLabel(d.months[iMax], l, true)} (${num(v[iMax], l)}) y mínimo en ${monthLabel(d.months[iMin], l, true)} (${num(v[iMin], l)}). Corrigiendo por días del mes, ningún mes se aleja más de ${pct(pdSpread, l, 0)} del promedio diario: la demanda es estable, sin tendencia marcada.` : `Peak in ${monthLabel(d.months[iMax], l, true)} (${num(v[iMax], l)}) and low in ${monthLabel(d.months[iMin], l, true)} (${num(v[iMin], l)}). Adjusting for days per month, no month is more than ${pct(pdSpread, l, 0)} from the daily average: demand is stable, with no clear trend.`),
        implications: L("Con un nivel estable, lo que más pesa en el error es el patrón semanal, no la tendencia: por eso una media reciente por día funciona.", "With a stable level, the weekly pattern drives error more than trend: that is why a recent weekday mean works."),
        decisions: L("Planificar con promedio diario y ajustar febrero y meses cortos por cantidad de días.", "Plan with daily averages and adjust February and short months for day count."),
        limits: L("Unidades de productos distintos sumadas: sirve para forma, no para valor.", "Units of different products added: good for shape, not value."),
      }}>
      <EChart option={option} height={300} label={t(L("Demanda mensual", "Monthly demand"))} />
    </ChartCard>
  );
}

function WeekdayChart({ c }: { c: Ctx }) {
  const { d, ct, lang, t, cls } = c;
  const v = d.weekday[cls]; const days = WEEKDAYS[lang]; const avg = v.reduce((s, x) => s + x, 0) / 7;
  const option = useMemo<EOption>(() => ({
    ...base(ct), xAxis: catAxis(ct, days), yAxis: valueAxis(ct, (x: number) => num(x, lang)),
    tooltip: axisTip(ct, (k) => tipHead(days[k]) + tipRow(ct.series[0], t(L("Unidades por día", "Units per day")), num(v[k], lang)) + tipNote(`${signedPct(v[k] / avg - 1, lang)} ${t(L("vs promedio", "vs average"))}`), true),
    series: [{ type: "bar", data: v.map((x, k) => ({ value: x, itemStyle: barStyle(k >= 5 ? ct.series[1] : ct.series[0]) })), barMaxWidth: 34 }],
  }), [v, days, avg, ct, lang, t]);
  return (
    <ChartCard id="chart-weekday" title={L("Perfil semanal", "Weekly profile")} subtitle={L("Unidades promedio por día de la semana (antes de la prueba)", "Average units per weekday (before the holdout)")} filters={[L("Clase ABC", "ABC class")]} source={SRC}
      table={{ columns: [t(L("Día", "Day")), t(L("Unidades", "Units"))], rows: days.map((x, k) => [x, num(v[k], lang, 1)]) }}
      explain={{
        measures: L("Promedio de unidades diarias por día de la semana en el período de entrenamiento.", "Average daily units per weekday in the training period."),
        observed: bi((l) => l === "es" ? `Sábado y domingo superan el promedio en ${pct((v[5] + v[6]) / 2 / avg - 1, l, 0)}; de lunes a viernes la demanda es casi plana.` : `Saturday and Sunday exceed the average by ${pct((v[5] + v[6]) / 2 / avg - 1, l, 0)}; Monday to Friday demand is nearly flat.`),
        implications: L("Un promedio general subestimaría fines de semana y sobrestimaría días hábiles.", "An overall average would under-forecast weekends and over-forecast weekdays."),
        decisions: L("Pronosticar por día de la semana; reforzar compras viernes y sábado.", "Forecast by weekday; reinforce purchasing on Friday and Saturday."),
        limits: L("Patrón del generador: confirmar con ventas reales.", "Generator pattern: confirm with real sales."),
      }}>
      <EChart option={option} height={300} label={t(L("Perfil semanal", "Weekly profile"))} />
    </ChartCard>
  );
}

function BacktestChart({ c }: { c: Ctx }) {
  const { d, ct, lang, t, cls } = c;
  const bt = d.backtest[cls];
  const labels = d.origins.map((o) => monthLabel(o.slice(0, 7), lang, true));
  const option = useMemo<EOption>(() => ({
    ...base(ct), legend: legend(ct), xAxis: catAxis(ct, labels), yAxis: valueAxis(ct, (x: number) => pct(x, lang, 0), { min: 0 }),
    tooltip: axisTip(ct, (k) => tipHead(`${t(L("Origen", "Origin"))} ${labels[k]}`) + tipRow(ct.neutral, t(MODEL.seasonal_naive), `${pct(bt.seasonal_naive.wmape[k], lang)} · ${t(L("sesgo", "bias"))} ${signedPct(bt.seasonal_naive.bias[k], lang)}`) + tipRow(ct.series[0], t(MODEL.weekday_mean_8w), `${pct(bt.weekday_mean_8w.wmape[k], lang)} · ${t(L("sesgo", "bias"))} ${signedPct(bt.weekday_mean_8w.bias[k], lang)}`), true),
    series: [
      { name: t(MODEL.seasonal_naive), type: "bar", data: bt.seasonal_naive.wmape, itemStyle: barStyle(ct.neutral), barMaxWidth: 22 },
      { name: t(MODEL.weekday_mean_8w), type: "bar", data: bt.weekday_mean_8w.wmape, itemStyle: barStyle(ct.series[0]), barMaxWidth: 22 },
    ],
  }), [bt, labels, ct, lang, t]);
  const wins = bt.weekday_mean_8w.wmape.filter((x, k) => x < bt.seasonal_naive.wmape[k]).length;
  return (
    <ChartCard id="chart-backtest" title={L("Backtest: error por origen", "Backtest: error by origin")} subtitle={L("WMAPE de cada regla en 5 cortes mensuales (el último = prueba final)", "WMAPE of each rule at 5 monthly cut-offs (the last = final holdout)")} filters={[L("Clase ABC", "ABC class")]} source={SRC}
      table={{ columns: [t(L("Origen", "Origin")), t(L("Ingenuo", "Naive")), t(L("Media 8 sem.", "8-wk mean")), t(L("Sesgo media", "Mean bias"))], rows: labels.map((x, k) => [x, pct(bt.seasonal_naive.wmape[k], lang), pct(bt.weekday_mean_8w.wmape[k], lang), signedPct(bt.weekday_mean_8w.bias[k], lang)]) }}
      explain={{
        measures: L("En cada origen, cada regla usa solo datos anteriores y pronostica el período siguiente; se mide WMAPE (menor es mejor).", "At each origin, each rule uses only earlier data and forecasts the next period; WMAPE is measured (lower is better)."),
        observed: bi((l) => l === "es" ? `La media de 8 semanas gana en ${wins} de ${labels.length} orígenes para ${CLS[cls].es.toLowerCase()}, con sesgo entre ${signedPct(Math.min(...bt.weekday_mean_8w.bias), l)} y ${signedPct(Math.max(...bt.weekday_mean_8w.bias), l)}.` : `The 8-week mean wins at ${wins} of ${labels.length} origins for ${CLS[cls].en.toLowerCase()}, with bias between ${signedPct(Math.min(...bt.weekday_mean_8w.bias), l)} and ${signedPct(Math.max(...bt.weekday_mean_8w.bias), l)}.`),
        implications: L("La ventaja es consistente en el tiempo, no un golpe de suerte en un mes.", "The advantage is consistent over time, not a one-month fluke."),
        decisions: L("Elegir la regla con evidencia de varios cortes, no de uno solo.", "Choose the rule on evidence from several cut-offs, not one."),
        limits: L("5 orígenes; en datos reales conviene más historia.", "5 origins; real data would warrant more history."),
      }}>
      <EChart option={option} height={300} label={t(L("Error por origen de backtest", "Error by backtest origin"))} />
    </ChartCard>
  );
}

function ParetoChart({ c }: { c: Ctx }) {
  const { d, ct, lang, t } = c;
  const labels = d.pareto.map((_, i) => String(i + 1));
  const nA = d.classCounts.A, nB = d.classCounts.B;
  const option = useMemo<EOption>(() => ({
    ...base(ct), xAxis: catAxis(ct, labels, { boundaryGap: false, name: t(L("Productos ordenados por volumen", "Products ranked by volume")), nameLocation: "middle", nameGap: 26, axisLabel: { color: ct.text3, fontSize: 10, interval: 15 } }), yAxis: valueAxis(ct, (x: number) => pct(x, lang, 0), { max: 1 }),
    grid: { left: 8, right: 16, top: 16, bottom: 28, containLabel: true },
    tooltip: axisTip(ct, (k) => tipHead(`${t(L("Top", "Top"))} ${k + 1}`) + tipRow(ct.series[0], t(L("Volumen acumulado", "Cumulative volume")), pct(d.pareto[k], lang)) + tipNote(k < nA ? "A" : k < nA + nB ? "B" : "C")),
    series: [{ type: "line", data: d.pareto, lineStyle: { width: 2, color: ct.series[0] }, itemStyle: { color: ct.series[0] }, symbol: "none", areaStyle: { color: ct.band },
      markArea: { silent: true, itemStyle: { color: ct.neutralSoft, opacity: 0.3 }, label: { color: ct.text3, fontSize: 10 }, data: [[{ xAxis: 0, name: "A" }, { xAxis: nA - 1 }], [{ xAxis: nA + nB - 1, name: "C" }, { xAxis: 127 }]] } }],
  }), [labels, ct, lang, t, d, nA, nB]);
  return (
    <ChartCard id="chart-pareto" title={L("¿Qué productos importan más? Curva ABC", "Which products matter most? ABC curve")} subtitle={L("Volumen acumulado por producto", "Cumulative volume by product")} filters={[L("Todos los productos", "All products")]} source={SRC}
      explain={{
        measures: L("Productos ordenados de mayor a menor volumen histórico; la curva muestra la proporción acumulada del total.", "Products sorted by historical volume; the curve shows the cumulative share of the total."),
        observed: bi((l) => l === "es" ? `${nA} productos (${pct(nA / 128, l, 0)} del catálogo) acumulan el 80%; los ${d.classCounts.C} de clase C suman solo el 5%.` : `${nA} products (${pct(nA / 128, l, 0)} of the catalogue) reach 80%; the ${d.classCounts.C} class-C items add only 5%.`),
        implications: L("La concentración es moderada: el esfuerzo de pronóstico puede enfocarse en la mitad del catálogo.", "Concentration is moderate: forecasting effort can focus on half the catalogue."),
        decisions: L("Seguimiento diario en A, semanal en B, stock mínimo en C.", "Daily tracking for A, weekly for B, minimum stock for C."),
        limits: L("Volumen en unidades, no en valor.", "Volume in units, not value."),
      }}>
      <EChart option={option} height={300} label={t(L("Curva ABC", "ABC curve"))} />
    </ChartCard>
  );
}

function ProductChart({ c }: { c: Ctx }) {
  const { d, ct, lang, t, cls } = c;
  const list = useMemo(() => d.holdout.products.filter((p) => cls === "ALL" || p.cls === cls), [d, cls]);
  const [pid, setPid] = useState(list[0]?.id);
  const p = list.find((x) => x.id === pid) ?? list[0];
  const labels = d.holdout.dates.map((x) => dateLabel(x, lang).replace(/ 20\d\d|, 20\d\d/, ""));
  const option = useMemo<EOption>(() => !p ? {} : ({
    ...base(ct), legend: legend(ct), xAxis: catAxis(ct, labels, { boundaryGap: false }), yAxis: valueAxis(ct, (x: number) => num(x, lang)),
    tooltip: axisTip(ct, (k) => tipHead(dateLabel(d.holdout.dates[k], lang)) + tipRow(ct.text, t(L("Real", "Actual")), num(p.actual[k], lang)) + tipRow(ct.series[0], t(MODEL.weekday_mean_8w), num(p.weekday[k], lang, 1)) + tipRow(ct.neutral, t(MODEL.seasonal_naive), num(p.naive[k], lang))),
    series: [
      { name: t(L("Real", "Actual")), type: "line", data: p.actual, lineStyle: { width: 2, color: ct.text2 }, itemStyle: { color: ct.text2 }, symbolSize: 5 },
      { name: t(L("Media 8 semanas", "8-week mean")), type: "line", data: p.weekday, lineStyle: { width: 2, color: ct.series[0] }, itemStyle: { color: ct.series[0] }, symbol: "none" },
      { name: t(L("Ingenuo", "Naive")), type: "line", data: p.naive, lineStyle: { width: 1.5, type: "dashed", color: ct.neutral }, itemStyle: { color: ct.neutral }, symbol: "none" },
    ],
  }), [p, labels, ct, lang, t, d]);
  if (!p) return null;
  const err = (f: number[]) => f.reduce((s, x, k) => s + Math.abs(x - p.actual[k]), 0) / Math.max(1, p.actual.reduce((s, x) => s + x, 0));
  return (
    <ChartCard id="chart-product" title={L("Explorador por producto: real vs pronóstico", "Product explorer: actual vs forecast")} subtitle={bi((l) => l === "es" ? `${p.id} · clase ${p.cls} · 28 días de prueba` : `${p.id} · class ${p.cls} · 28 holdout days`)}
      actions={<div className="w-40"><Select label={t(L("Producto", "Product"))} value={p.id} onChange={(e) => setPid(e.target.value)}>{list.map((x) => <option key={x.id} value={x.id}>{x.id} ({x.cls})</option>)}</Select></div>}
      filters={[L("Clase ABC", "ABC class"), L("Producto", "Product")]} source={SRC}
      table={{ columns: [t(L("Fecha", "Date")), t(L("Real", "Actual")), t(L("Media 8 sem.", "8-wk mean")), t(L("Ingenuo", "Naive"))], rows: d.holdout.dates.map((x, k) => [dateLabel(x, lang), p.actual[k], num(p.weekday[k], lang, 1), num(p.naive[k], lang)]) }}
      explain={{
        measures: L("Demanda diaria real del producto en los 28 días reservados, frente a ambas reglas calculadas sin ver esos días.", "Actual daily demand of the product over the 28 reserved days, against both rules computed without seeing those days."),
        observed: bi((l) => l === "es" ? `Para ${p.id}, WMAPE ${pct(err(p.weekday), l)} con la media de 8 semanas vs ${pct(err(p.naive), l)} con el ingenuo. La media sigue el patrón semanal sin copiar los picos aislados.` : `For ${p.id}, WMAPE ${pct(err(p.weekday), l)} with the 8-week mean vs ${pct(err(p.naive), l)} with naive. The mean follows the weekly pattern without copying isolated spikes.`),
        implications: L("A nivel de producto el error es mayor que el agregado: hay variabilidad que ninguna regla capta.", "At product level error is higher than in aggregate: some variability no rule captures."),
        decisions: L("Usar el pronóstico como base y ajustar manualmente eventos conocidos.", "Use the forecast as a base and manually adjust known events."),
        limits: L("Datos sintéticos.", "Synthetic data."),
      }}>
      <EChart option={option} height={300} label={t(L("Real vs pronóstico", "Actual vs forecast"))} />
    </ChartCard>
  );
}

function BufferSim({ c }: { c: Ctx }) {
  const { d, ct, lang, t, cls } = c;
  const [buf, setBuf] = useState(15);
  const list = useMemo(() => d.holdout.products.filter((p) => cls === "ALL" || p.cls === cls), [d, cls]);
  const curve = useMemo(() => [0, 5, 10, 15, 20, 25, 30, 40, 50].map((b) => {
    let short = 0, cells = 0, surplus = 0, demand = 0, unmet = 0;
    for (const p of list) p.actual.forEach((y, k) => { const f = p.weekday[k] * (1 + b / 100); cells++; demand += y; if (y > f) { short++; unmet += y - f; } else surplus += f - y; });
    return { b, shortRate: short / cells, surplus: surplus / demand, fill: 1 - unmet / demand };
  }), [list]);
  const cur = curve.reduce((best, x) => (Math.abs(x.b - buf) < Math.abs(best.b - buf) ? x : best), curve[0]);
  const option = useMemo<EOption>(() => ({
    ...base(ct), legend: legend(ct), xAxis: catAxis(ct, curve.map((x) => `+${x.b}%`), { name: t(L("Colchón sobre el pronóstico", "Buffer over forecast")), nameLocation: "middle", nameGap: 26 }), yAxis: valueAxis(ct, (x: number) => pct(x, lang, 0)),
    grid: { left: 8, right: 16, top: 32, bottom: 28, containLabel: true },
    tooltip: axisTip(ct, (k) => tipHead(`+${curve[k].b}%`) + tipRow(ct.series[1], t(L("Producto-días con faltante", "Product-days short")), pct(curve[k].shortRate, lang)) + tipRow(ct.series[6], t(L("Sobrante / demanda", "Surplus / demand")), pct(curve[k].surplus, lang)) + tipRow(ct.series[2], t(L("Demanda cubierta", "Demand covered")), pct(curve[k].fill, lang))),
    series: [
      { name: t(L("Producto-días con faltante", "Product-days short")), type: "line", data: curve.map((x) => x.shortRate), lineStyle: { width: 2, color: ct.series[1] }, itemStyle: { color: ct.series[1] } },
      { name: t(L("Sobrante / demanda", "Surplus / demand")), type: "line", data: curve.map((x) => x.surplus), lineStyle: { width: 2, color: ct.series[6] }, itemStyle: { color: ct.series[6] } },
    ],
  }), [curve, ct, lang, t]);
  return (
    <Card id="simulator" className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-sim-bg px-5 py-3">
        <div><Badge tone="simulated">{t(L("SIMULACIÓN · 28 días de prueba, datos sintéticos", "SIMULATION · 28 holdout days, synthetic data"))}</Badge>
          <h3 className="mt-1 text-[15px] font-semibold">{t(L("¿Cuánto colchón agregar sobre el pronóstico?", "How much buffer to add over the forecast?"))}</h3></div>
        <p className="max-w-xl text-[12.5px] text-sim-text">{t(L("Compra = pronóstico × (1 + colchón). Cuenta faltantes y sobrantes frente a la demanda de prueba. Sin costos reales.", "Purchase = forecast × (1 + buffer). Counts shortfalls and surplus against holdout demand. No real costs."))}</p>
      </div>
      <div className="grid gap-6 p-5 lg:grid-cols-[300px_1fr]">
        <div className="flex flex-col gap-4">
          <Slider label={t(L("Colchón", "Buffer"))} value={buf} min={0} max={50} step={5} onChange={setBuf} format={(v) => `+${v}%`} />
          <div className="rounded-lg bg-surface-2 p-3 text-[13px]">
            <p className="text-ink-3">{t(L("Producto-días con faltante", "Product-days short"))}: <b className="num text-ink">{pct(cur.shortRate, lang)}</b></p>
            <p className="text-ink-3">{t(L("Demanda cubierta", "Demand covered"))}: <b className="num text-ink">{pct(cur.fill, lang)}</b></p>
            <p className="text-ink-3">{t(L("Sobrante sobre demanda", "Surplus over demand"))}: <b className="num text-ink">{pct(cur.surplus, lang)}</b></p>
          </div>
          <p className="text-[12px] text-ink-3">{t(CLS[cls])} · {num(list.length, lang)} {t(L("productos", "products"))}</p>
        </div>
        <EChart option={option} height={280} label={t(L("Faltantes vs sobrantes", "Shortfalls vs surplus"))} />
      </div>
    </Card>
  );
}
