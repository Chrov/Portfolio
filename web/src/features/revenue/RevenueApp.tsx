"use client";
import { RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell, Section, type NavItem } from "@/components/AppShell";
import { KpiCard, type Method } from "@/components/KpiCard";
import { BigStat, PresentationMode, type Slide } from "@/components/Presentation";
import { LoadError, Loading } from "@/components/States";
import { ArchitectureFlow, ChecksList, DefTable, ImpactTriad, InsightsPanel, ProcessTimeline, RepoLink, type Step } from "@/components/Story";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { useDataset } from "@/lib/data";
import { brl, monthLabel, num, pct, signedPct } from "@/lib/format";
import { chartTheme } from "@/lib/palette";
import { L, usePrefs, type Bi } from "@/lib/prefs";
import { computeKpis, isRevenueData, simulate, type RevenueData } from "@/lib/revenue";
import { ConcentrationChart, CustomerStats, FrequencyAndValue, SegmentChart } from "./CustomerCharts";
import { catName, regionName, type RCtx } from "./ctx";
import { BacktestExplorer, ForecastChart, ModelComparison } from "./ForecastCharts";
import { BasketHistogram, CategoryEvolution, CategoryRanking, CategoryScatter, DeliveryReview, PriceBoxplot, StateChart, TopProducts } from "./MixCharts";
import { Simulator } from "./Simulator";
import { AnomalyCard, HeatmapChart, PriceVolumeChart, TrendChart, WeekdayChart } from "./TimeCharts";

const NAV: NavItem[] = [
  { id: "resumen", label: L("Resumen ejecutivo", "Executive summary") },
  { id: "problema", label: L("Problema empresarial", "Business problem") },
  { id: "dashboard", label: L("Dashboard", "Dashboard") },
  { id: "exploratorio", label: L("Análisis exploratorio", "Exploratory analysis") },
  { id: "modelos", label: L("Modelos predictivos", "Predictive models") },
  { id: "hallazgos", label: L("Hallazgos", "Findings") },
  { id: "impacto", label: L("Impacto esperado", "Expected impact") },
  { id: "metodologia", label: L("Metodología y arquitectura", "Methodology & architecture") },
  { id: "limitaciones", label: L("Limitaciones", "Limitations") },
];

const SOURCE_TXT = L("Olist (Kaggle), pedidos válidos, ventana ene 2017 – jul 2018", "Olist (Kaggle), valid orders, Jan 2017 – Jul 2018 window");
const METHODS: Record<string, Method> = {
  revenue: { definition: L("Ingresos por productos: suma de order_items.price de pedidos válidos con fecha de compra en el período. No incluye flete ni es utilidad: el dataset no trae costos.", "Product revenue: sum of order_items.price for valid orders purchased in the period. Excludes freight and is not profit: the dataset has no costs."), formula: "Σ price  (order_status ∉ {canceled, unavailable})", source: SOURCE_TXT, notes: L("Los pagos (payment_value) no se usan para ingresos para evitar duplicar montos al unir con ítems; coinciden con precio + flete en 99,7% de los pedidos.", "Payments (payment_value) are not used for revenue to avoid duplicating amounts when joining with items; they match price + freight in 99.7% of orders.") },
  orders: { definition: L("Pedidos con al menos un ítem cuyo estado no es cancelado ni no disponible.", "Orders with at least one item whose status is neither canceled nor unavailable."), formula: "COUNT(DISTINCT order_id)", source: SOURCE_TXT, notes: L("Se excluyen 1.234 pedidos cancelados o no disponibles del total de 99.441.", "1,234 canceled or unavailable orders are excluded from the 99,441 total.") },
  ticket: { definition: L("Ingreso por productos dividido por pedidos válidos.", "Product revenue divided by valid orders."), formula: "Ingresos / Pedidos", source: SOURCE_TXT, notes: L("Es un promedio: la distribución es asimétrica (ver histograma del valor del pedido).", "It is a mean: the distribution is skewed (see order value histogram).") },
  customers: { definition: L("Personas distintas (customer_unique_id) con al menos un pedido válido en el período.", "Distinct people (customer_unique_id) with at least one valid order in the period."), formula: "COUNT(DISTINCT customer_unique_id)", source: SOURCE_TXT, notes: L("Se precalcula para cada rango de meses: los clientes únicos no se pueden sumar mes a mes.", "Precomputed for each month range: unique customers cannot be summed month by month.") },
  yoy: { definition: L("Crecimiento interanual: ingresos del período frente a los mismos meses del año anterior.", "Year-over-year growth: period revenue vs the same months a year earlier."), formula: "Ingresos(t) / Ingresos(t − 12 meses) − 1", source: SOURCE_TXT, notes: L("Solo disponible cuando el período empieza en 2018 (la ventana arranca en ene 2017).", "Only available when the period starts in 2018 (the window starts in Jan 2017).") },
  top: { definition: L("Categoría con mayor ingreso por productos en el período y su participación.", "Category with the highest product revenue in the period and its share."), formula: "argmax Σ price por categoría", source: SOURCE_TXT, notes: L("Categorías traducidas desde la tabla oficial de Olist; 610 productos sin categoría se agrupan como «Sin categoría».", "Categories translated from Olist's official table; 610 products without category are grouped as “Uncategorized”.") },
};

export default function RevenueApp() {
  const s = useDataset<RevenueData>("revenue", isRevenueData);
  if (s.status === "loading") return <Loading what="Revenue Intelligence" />;
  if (s.status === "error") return <LoadError error={s.error} dataset="revenue" />;
  return <Revenue d={s.data} />;
}

function Revenue({ d }: { d: RevenueData }) {
  const { lang, theme, t } = usePrefs();
  const last = d.calendar.months.length - 1;
  const [region, setRegion] = useState("ALL");
  const [from, setFrom] = useState(last - 5);
  const [to, setTo] = useState(last);
  const [present, setPresent] = useState(false);
  const ct = useMemo(() => chartTheme(theme), [theme]);
  const c: RCtx = useMemo(() => ({ d, region, from, to, ct, lang, t }), [d, region, from, to, ct, lang, t]);
  const k = useMemo(() => computeKpis(d, region, from, to), [d, region, from, to]);

  const chg = (x: number | null, vs: Bi) => (x == null ? t(L("Sin período comparable", "No comparable period")) : `${signedPct(x, lang)} ${t(vs)}`);
  const vsPrev = L("vs período anterior", "vs previous period");

  const filterBar = (
    <div className="border-t border-line bg-surface/95">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-end gap-3 px-4 py-2">
        <div className="w-44"><Select label={t(L("Región", "Region"))} value={region} onChange={(e) => setRegion(e.target.value)}>
          {d.regions.map((r) => <option key={r.id} value={r.id}>{lang === "es" ? r.es : r.en}</option>)}
        </Select></div>
        <div className="w-32"><Select label={t(L("Desde", "From"))} value={from} onChange={(e) => { const v = +e.target.value; setFrom(v); if (v > to) setTo(v); }}>
          {d.calendar.months.map((m, i) => <option key={m} value={i}>{monthLabel(m, lang, true)}</option>)}
        </Select></div>
        <div className="w-32"><Select label={t(L("Hasta", "To"))} value={to} onChange={(e) => { const v = +e.target.value; setTo(v); if (v < from) setFrom(v); }}>
          {d.calendar.months.map((m, i) => <option key={m} value={i}>{monthLabel(m, lang, true)}</option>)}
        </Select></div>
        <Button size="sm" variant="ghost" className="mb-0.5" onClick={() => { setRegion("ALL"); setFrom(last - 5); setTo(last); }}>
          <RotateCcw className="h-3.5 w-3.5" /> {t(L("Restablecer", "Reset"))}
        </Button>
        <p className="mb-1.5 ml-auto hidden text-[12px] text-ink-3 xl:block">
          {t(L("Los filtros actualizan KPIs, gráficos y sus explicaciones. Cada gráfico indica qué filtros usa.", "Filters update KPIs, charts and their explanations. Each chart states which filters it uses."))}
        </p>
      </div>
    </div>
  );

  const full = computeKpis(d, "ALL", 0, last);
  const h1 = computeKpis(d, "ALL", 12, 17);
  const fc = d.forecast;
  const selM = fc.metrics.find((m) => m.model === fc.selected)!;
  const cu = d.customers.ALL;
  const sim = simulate(d, { orders: 0.05, ticket: 0.02, region: "NE", regionBoost: 0.05 });

  const steps: Step[] = [
    { title: L("Comprensión del problema", "Understanding the problem"), body: L("Un marketplace necesita saber cuánto vende realmente, qué lo impulsa y cómo planificar. Se definieron 8 preguntas de negocio y los KPIs que las responden.", "A marketplace needs to know what it really sells, what drives it and how to plan. Eight business questions and the KPIs that answer them were defined."), facts: [L("Sin costos: no se calculan márgenes ni utilidad", "No costs: no margins or profit are computed")] },
    { title: L("Recolección de datos", "Data collection"), body: L("Dataset público de Olist descargado desde Kaggle con kagglehub; cada archivo se valida con SHA-256.", "Olist public dataset downloaded from Kaggle with kagglehub; every file is validated with SHA-256."), facts: [L(`${num(d.meta.rawOrders, "es")} pedidos, 9 tablas, sep 2016 – oct 2018`, `${num(d.meta.rawOrders, "en")} orders, 9 tables, Sep 2016 – Oct 2018`), L("Licencia CC BY-NC-SA 4.0", "CC BY-NC-SA 4.0 licence")] },
    { title: L("Preparación y limpieza", "Preparation and cleaning"), body: L("Capa staging tipada en SQL, deduplicación de reseñas (hasta 3 por pedido), traducción de categorías y marts con agregación previa a cada JOIN.", "Typed SQL staging layer, review de-duplication (up to 3 per order), category translation and marts that aggregate before every JOIN."), facts: [L(`${d.checks.length} controles de calidad, todos aprobados`, `${d.checks.length} quality checks, all passing`), L("Ventana: ene 2017 – jul 2018 (meses completos)", "Window: Jan 2017 – Jul 2018 (complete months)")] },
    { title: L("Análisis exploratorio", "Exploratory analysis"), body: L("Tendencia, estacionalidad semanal y horaria, anomalías, mezcla de categorías, geografía, valor del pedido, puntualidad y clientes (RFM, concentración).", "Trend, weekly and hourly seasonality, anomalies, category mix, geography, order value, punctuality and customers (RFM, concentration).") },
    { title: L("Desarrollo de modelos", "Model development"), body: L("Pronóstico semanal a 8 semanas con 5 modelos (2 base simples) evaluados en backtest de origen móvil sin fuga de información.", "8-week weekly forecast with 5 models (2 simple baselines) evaluated in a leakage-free rolling-origin backtest."), facts: [L(`Elegido: ${selM.label.es}, WMAPE ${pct(selM.wmape, "es")}`, `Selected: ${selM.label.en}, WMAPE ${pct(selM.wmape, "en")}`)] },
    { title: L("Implementación de la solución", "Solution implementation"), body: L("Pipeline Python + DuckDB que publica JSON; API FastAPI para despliegue en servidor; esta app Next.js estática con ECharts, filtros y simulador.", "Python + DuckDB pipeline publishing JSON; FastAPI for server deployment; this static Next.js app with ECharts, filters and a simulator.") },
    { title: L("Evaluación", "Evaluation"), body: L("Pruebas automáticas (pytest y node:test) de ingesta, integridad SQL, consistencia de KPIs, endpoints, fuga de información y paridad Python–navegador.", "Automated tests (pytest and node:test) for ingestion, SQL integrity, KPI consistency, endpoints, leakage and Python–browser parity."), facts: [L("Ver «Limitaciones» para lo que no se pudo validar", "See “Limitations” for what could not be validated")] },
  ];

  const slides: Slide[] = [
    { kicker: L("Contexto", "Context"), title: L("¿Cuánto vende realmente el marketplace y qué mueve sus ingresos?", "How much does the marketplace really sell, and what moves revenue?"),
      body: <p className="max-w-3xl">{t(L(`Analizamos ${num(d.meta.windowOrders, "es")} pedidos válidos de Olist entre enero 2017 y julio 2018 para medir ingresos, clientes y categorías, y proyectar las próximas 8 semanas. Datos públicos reales; sin costos, por lo que no hablamos de utilidad.`,
        `We analysed ${num(d.meta.windowOrders, "en")} valid Olist orders from January 2017 to July 2018 to measure revenue, customers and categories, and to project the next 8 weeks. Real public data; no costs, so we do not discuss profit.`))}</p> },
    { kicker: L("Indicadores principales", "Key indicators"), title: L("Ventana completa (19 meses)", "Full window (19 months)"),
      body: <div className="grid gap-4 md:grid-cols-4">
        <BigStat value={brl(full.revenue.value, lang)} label={t(L("Ingresos por productos", "Product revenue"))} />
        <BigStat value={num(full.orders.value, lang)} label={t(L("Pedidos válidos", "Valid orders"))} />
        <BigStat value={brl(full.ticket.value, lang)} label={t(L("Ticket promedio", "Average ticket"))} />
        <BigStat value={pct(cu.repeatRate, lang)} label={t(L("Clientes recurrentes", "Repeat customers"))} note={t(L(`de ${num(cu.customers, "es")} clientes`, `of ${num(cu.customers, "en")} customers`))} />
      </div> },
    { kicker: L("Hallazgos", "Findings"), title: L("Lo que muestran los datos", "What the data shows"),
      body: <ol className="grid gap-4 md:grid-cols-2">{d.insights.slice(0, 4).map((i, n) => <li key={i.id} className="rounded-xl border border-line bg-surface p-5"><p className="text-sm font-semibold text-accent">{n + 1}</p><p className="mt-1 font-semibold text-ink">{t(i.title)}</p><p className="mt-2 text-base">{t(i.evidence)}</p></li>)}</ol> },
    { kicker: L("Interpretación", "Interpretation"), title: L("Crecimiento por volumen, con muy poca recompra", "Volume-led growth with very little repurchase"),
      body: <ul className="max-w-4xl list-disc space-y-3 pl-6">
        <li>{t(L(`Ene–jun 2018 superó a ene–jun 2017 en ${pct((h1.yoy.change ?? 0), "es", 0)}, pero desde enero 2018 el ingreso mensual está estable.`, `Jan–Jun 2018 beat Jan–Jun 2017 by ${pct((h1.yoy.change ?? 0), "en", 0)}, but monthly revenue has been flat since January 2018.`))}</li>
        <li>{t(L("El volumen de pedidos explica la mayor parte de la variación mensual; el ticket cambia poco.", "Order volume explains most monthly variation; the ticket barely moves."))}</li>
        <li>{t(d.insights.find((i) => i.id === "delivery")!.evidence)}</li>
      </ul> },
    { kicker: L("Recomendaciones", "Recommendations"), title: L("Qué investigar a continuación", "What to investigate next"),
      body: <ol className="max-w-4xl list-decimal space-y-3 pl-6">{d.insights.slice(0, 5).map((i) => <li key={i.id}>{t(i.action)} <span className="text-ink-3">— {t(i.validate)}</span></li>)}</ol> },
    { kicker: L("Impacto potencial", "Potential impact"), title: L("Beneficios esperados, a validar", "Expected benefits, to be validated"),
      body: <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-line bg-surface p-5"><Badge tone="simulated">{t(L("Simulado", "Simulated"))}</Badge><p className="mt-2">{t(L(`Escenario moderado (+5% pedidos, +2% ticket, +5% Nordeste): ${brl(sim.sim, "es")} anual vs ${brl(sim.base, "es")} medido (${signedPct(sim.change, "es")}). Ilustrativo.`, `Moderate scenario (+5% orders, +2% ticket, +5% Northeast): ${brl(sim.sim, "en")} a year vs ${brl(sim.base, "en")} measured (${signedPct(sim.change, "en")}). Illustrative.`))}</p></div>
        <div className="rounded-xl border border-line bg-surface p-5"><Badge tone="expected">{t(L("Esperado", "Expected"))}</Badge><p className="mt-2">{t(L("Menos reporting manual, detección temprana de caídas y planificación de inventario con rangos. Requiere piloto en una empresa real para cuantificarse.", "Less manual reporting, early detection of drops and inventory planning with ranges. Needs a pilot in a real company to be quantified."))}</p></div>
      </div> },
    { kicker: L("Limitaciones", "Limitations"), title: L("Lo que este análisis no puede afirmar", "What this analysis cannot claim"),
      body: <ul className="max-w-4xl list-disc space-y-3 pl-6">
        <li>{t(L("Sin costos ni comisiones: no hay margen ni rentabilidad.", "No costs or commissions: no margin or profitability."))}</li>
        <li>{t(L("19 meses de historia: el pronóstico no capta estacionalidad anual y su intervalo resultó optimista.", "19 months of history: the forecast cannot capture yearly seasonality and its interval proved optimistic."))}</li>
        <li>{t(L("Las relaciones mostradas son asociaciones, no efectos causales.", "The relationships shown are associations, not causal effects."))}</li>
      </ul> },
  ];

  return (
    <>
      <AppShell app="Revenue Intelligence" tagline={L("Inteligencia comercial · Olist, Brasil", "Commercial intelligence · Olist, Brazil")} nav={NAV} onPresent={() => setPresent(true)} filterBar={filterBar}>
        <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
          <Section id="resumen" n={1} title={L("Resumen ejecutivo", "Executive summary")}>
            <Card className="p-5 text-[14px] leading-relaxed text-ink-2">
              <div className="mb-3 flex flex-wrap gap-1.5">
                <Badge tone="measured">{t(L("Datos reales públicos", "Real public data"))}</Badge>
                <Badge tone="outline">Olist · Kaggle v{d.meta.source.kaggleVersion}</Badge>
                <Badge tone="outline">{t(L("ene 2017 – jul 2018", "Jan 2017 – Jul 2018"))}</Badge>
              </div>
              <ul className="space-y-2">
                <li>{t(L(`El marketplace facturó ${brl(full.revenue.value, "es")} en productos con ${num(full.orders.value, "es")} pedidos válidos y ${num(full.customers.value, "es")} clientes.`, `The marketplace generated ${brl(full.revenue.value, "en")} in product revenue from ${num(full.orders.value, "en")} valid orders and ${num(full.customers.value, "en")} customers.`))}</li>
                <li>{t(L(`El primer semestre de 2018 creció ${pct(h1.yoy.change ?? 0, "es", 0)} interanual, impulsado por volumen; desde enero el ingreso mensual se estabilizó.`, `H1 2018 grew ${pct(h1.yoy.change ?? 0, "en", 0)} year over year, driven by volume; monthly revenue has levelled off since January.`))}</li>
                <li>{t(L(`Solo ${pct(cu.repeatRate, "es")} de los clientes repite compra; un pronóstico semanal reduce el error ${pct(fc.improvementVsBaseline, "es", 0)} frente a una media móvil.`, `Only ${pct(cu.repeatRate, "en")} of customers buy again; a weekly forecast cuts error by ${pct(fc.improvementVsBaseline, "en", 0)} vs a moving average.`))}</li>
              </ul>
            </Card>
          </Section>
          <Section id="problema" n={2} className="pt-0" title={L("Problema empresarial", "Business problem")}>
            <Card className="p-5">
              <p className="text-[13.5px] text-ink-2">{t(L("Hay registros de ventas, clientes y productos, pero no una herramienta que responda:", "There are sales, customer and product records, but no tool that answers:"))}</p>
              <ul className="mt-2 grid gap-x-4 gap-y-1 text-[13px] sm:grid-cols-2">
                {([
                  [L("¿Cuánto vendemos realmente?", "How much do we really sell?"), "dashboard"],
                  [L("¿Qué productos generan más ingresos?", "Which products drive revenue?"), "chart-categories"],
                  [L("¿Qué categorías crecen o caen?", "Which categories grow or decline?"), "chart-categories"],
                  [L("¿Quiénes son los clientes más valiosos?", "Who are the most valuable customers?"), "chart-rfm"],
                  [L("¿Qué patrones de compra existen?", "What purchase patterns exist?"), "exploratorio"],
                  [L("¿Cuándo se vende más?", "When do we sell most?"), "chart-trend"],
                  [L("¿Qué se asocia a las variaciones?", "What is associated with variation?"), "chart-drivers"],
                  [L("¿Cómo anticipar la demanda?", "How to anticipate demand?"), "chart-forecast"],
                ] as [Bi, string][]).map(([q, id]) => (
                  <li key={q.en}><a href={`#${id}`} className="text-accent hover:underline">{t(q)}</a></li>
                ))}
              </ul>
            </Card>
          </Section>
        </div>

        <Section id="dashboard" n={3} title={L("Dashboard ejecutivo de ingresos", "Executive revenue dashboard")}
          intro={{ es: `${regionName({ ...c, lang: "es" })} · ${monthLabel(d.calendar.months[from], "es", true)} – ${monthLabel(d.calendar.months[to], "es", true)} (${k.months} meses). Pulsa ⓘ en cada indicador para ver su metodología.`, en: `${regionName({ ...c, lang: "en" })} · ${monthLabel(d.calendar.months[from], "en", true)} – ${monthLabel(d.calendar.months[to], "en", true)} (${k.months} months). Press ⓘ on each indicator for its methodology.` }}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <KpiCard label={L("Ingresos del período", "Period revenue")} value={brl(k.revenue.value, lang)} change={k.revenue.change} changeLabel={chg(k.revenue.change, vsPrev)} description={L("Precio de productos, sin flete", "Product price, excluding freight")} method={METHODS.revenue} />
            <KpiCard label={L("Pedidos válidos", "Valid orders")} value={num(k.orders.value, lang)} change={k.orders.change} changeLabel={chg(k.orders.change, vsPrev)} description={L("Sin cancelados ni no disponibles", "Excluding canceled and unavailable")} method={METHODS.orders} />
            <KpiCard label={L("Ticket promedio", "Average ticket")} value={brl(k.ticket.value, lang, false)} change={k.ticket.change} changeLabel={chg(k.ticket.change, vsPrev)} description={L("Ingreso por pedido", "Revenue per order")} method={METHODS.ticket} />
            <KpiCard label={L("Clientes únicos", "Unique customers")} value={num(k.customers.value, lang)} change={k.customers.change} changeLabel={chg(k.customers.change, vsPrev)} description={L("Personas distintas que compraron", "Distinct people who bought")} method={METHODS.customers} />
            <KpiCard label={L("Crecimiento interanual", "Year-over-year growth")} value={k.yoy.change == null ? "—" : signedPct(k.yoy.change, lang)} change={k.yoy.change} changeLabel={k.yoy.change == null ? t(L("Requiere período desde ene 2018", "Needs a period from Jan 2018")) : `${t(L("vs", "vs"))} ${brl(k.yoy.prev ?? 0, lang)}`} description={L("Mismos meses del año anterior", "Same months a year earlier")} method={METHODS.yoy} />
            <KpiCard label={L("Categoría líder", "Top category")} value={k.topCategory ? catName(c, k.topCategory.id) : "—"} change={null} changeLabel={k.topCategory ? `${pct(k.topCategory.share, lang)} ${t(L("del ingreso", "of revenue"))}` : ""} description={L("Mayor ingreso en el período", "Highest revenue in the period")} method={METHODS.top} compact />
          </div>
          <div className="mt-4 grid gap-4">
            <TrendChart c={c} />
            <div className="grid gap-4 xl:grid-cols-2">
              <CategoryRanking c={c} />
              <StateChart c={c} />
            </div>
          </div>
        </Section>

        <Section id="exploratorio" n={4} title={L("Análisis exploratorio", "Exploratory analysis")}
          intro={L("Patrones temporales, productos y clientes. Todos los gráficos responden a los filtros, salvo los marcados «ventana completa».", "Time patterns, products and customers. All charts respond to the filters except those marked “full window”.")}>
          <h3 className="mb-3 mt-2 text-[13px] font-semibold uppercase tracking-wider text-ink-3">{t(L("Tiempo y variación", "Time and variation"))}</h3>
          <div className="grid gap-4 xl:grid-cols-2">
            <PriceVolumeChart c={c} />
            <AnomalyCard c={c} />
            <WeekdayChart c={c} />
            <HeatmapChart c={c} />
          </div>
          <h3 className="mb-3 mt-8 text-[13px] font-semibold uppercase tracking-wider text-ink-3">{t(L("Productos y categorías", "Products and categories"))}</h3>
          <div className="grid gap-4 xl:grid-cols-2">
            <CategoryEvolution c={c} />
            <CategoryScatter c={c} />
            <PriceBoxplot c={c} />
            <TopProducts c={c} />
            <BasketHistogram c={c} />
            <DeliveryReview c={c} />
          </div>
          <h3 className="mb-3 mt-8 text-[13px] font-semibold uppercase tracking-wider text-ink-3">{t(L("Customer intelligence", "Customer intelligence"))}</h3>
          <CustomerStats c={c} />
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <SegmentChart c={c} />
            <ConcentrationChart c={c} />
            <FrequencyAndValue c={c} />
          </div>
        </Section>

        <Section id="modelos" n={5} title={L("Predicción de ingresos", "Revenue forecasting")}
          intro={L("Proyección estadística a 8 semanas, comparada contra modelos base simples con un backtest sin fuga de información.", "8-week statistical projection, compared against simple baselines with a leakage-free backtest.")}>
          <div className="grid gap-4">
            <ForecastChart c={c} />
            <div className="grid gap-4 xl:grid-cols-2">
              <ModelComparison c={c} />
              <BacktestExplorer c={c} />
            </div>
          </div>
        </Section>

        <Section id="hallazgos" n={6} title={L("Insights y recomendaciones", "Insights and recommendations")}
          intro={L("Generados con reglas reproducibles a partir de los resultados calculados (analytics/revenue/build.py). Cada uno indica qué validar antes de actuar.", "Generated by reproducible rules from computed results (analytics/revenue/build.py). Each states what to validate before acting.")}>
          <InsightsPanel items={d.insights} />
        </Section>

        <Section id="impacto" n={7} title={L("Impacto empresarial esperado", "Expected business impact")}
          intro={L("Separamos lo medido, lo simulado y lo que solo puede validarse en una empresa real.", "We separate what was measured, what is simulated and what can only be validated in a real company.")}>
          <ImpactTriad
            measured={<ul className="list-disc space-y-1.5 pl-4">
              <li>{t(L(`Ingresos de la ventana: ${brl(full.revenue.value, "es")}; ticket ${brl(full.ticket.value, "es")}.`, `Window revenue: ${brl(full.revenue.value, "en")}; ticket ${brl(full.ticket.value, "en")}.`))}</li>
              <li>{t(L(`Recompra: ${pct(cu.repeatRate, "es")} de clientes; 10% superior concentra ${pct(cu.top10Share, "es")} del ingreso.`, `Repurchase: ${pct(cu.repeatRate, "en")} of customers; top 10% hold ${pct(cu.top10Share, "en")} of revenue.`))}</li>
              <li>{t(L(`Pronóstico: WMAPE ${pct(selM.wmape, "es")}, ${pct(fc.improvementVsBaseline, "es", 0)} menos error que la media móvil.`, `Forecast: WMAPE ${pct(selM.wmape, "en")}, ${pct(fc.improvementVsBaseline, "en", 0)} less error than the moving average.`))}</li>
            </ul>}
            simulated={<div className="space-y-2">
              <p>{t(L(`Escenario moderado: ${brl(sim.sim, "es")} anual frente a ${brl(sim.base, "es")} medido (${signedPct(sim.change, "es")}).`, `Moderate scenario: ${brl(sim.sim, "en")} a year vs ${brl(sim.base, "en")} measured (${signedPct(sim.change, "en")}).`))}</p>
              <p className="font-mono text-[12px] text-ink">Σᵣ Oᵣ(1+Δo+gᵣ)·Tᵣ(1+Δt)</p>
              <a href="#simulator" className="text-accent hover:underline">{t(L("Ajustar supuestos en el simulador ↓", "Adjust assumptions in the simulator ↓"))}</a>
            </div>}
            expected={<ul className="list-disc space-y-1.5 pl-4">
              {[L("Mayor visibilidad sobre los ingresos", "Better revenue visibility"), L("Mejor planificación comercial con rangos", "Better commercial planning with ranges"), L("Identificación de segmentos relevantes", "Identification of relevant segments"), L("Detección temprana de caídas de ventas", "Early detection of sales drops"), L("Menos trabajo manual de reporting", "Less manual reporting work"), L("Mejores decisiones de inventario y campañas", "Better inventory and campaign decisions")].map((x) => <li key={x.en}>{t(x)}</li>)}
              <li className="list-none pt-1 text-[12px] text-ink-3">{t(L("Sin cifras: cuantificarlo requiere un piloto con línea base en la empresa.", "No figures: quantifying it requires a pilot with a company baseline."))}</li>
            </ul>}
          />
          <div className="mt-4"><Simulator c={c} /></div>
        </Section>

        <Section id="metodologia" n={8} title={L("¿Qué se hizo? Metodología y arquitectura", "What was done? Methodology and architecture")}>
          <ProcessTimeline steps={steps} />
          <h3 className="mb-3 mt-8 text-[13px] font-semibold uppercase tracking-wider text-ink-3">{t(L("Exploración técnica", "Technical exploration"))}</h3>
          <Card className="p-5">
            <ArchitectureFlow stages={[
              { name: L("Ingesta", "Ingestion"), tech: "kagglehub · SHA-256", detail: L("Descarga versionada y verificación de integridad", "Versioned download and integrity check") },
              { name: L("Staging", "Staging"), tech: "DuckDB · SQL", detail: L("Tipado, dedup de reseñas, traducción", "Typing, review dedup, translation") },
              { name: L("Marts", "Marts"), tech: "fct_orders · fct_order_items", detail: L("Agregar antes de unir: sin duplicados", "Aggregate before joining: no duplicates") },
              { name: L("Métricas y modelos", "Metrics and models"), tech: "pandas · scikit-learn", detail: L("KPIs, RFM, anomalías, backtest", "KPIs, RFM, anomalies, backtest") },
              { name: L("Servicio", "Serving"), tech: "JSON · FastAPI", detail: L("Archivos estáticos y API local", "Static files and local API") },
              { name: L("Presentación", "Presentation"), tech: "Next.js · ECharts", detail: L("Export estático en GitHub Pages", "Static export on GitHub Pages") },
            ]} />
          </Card>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <Card className="p-5">
              <h4 className="mb-2 font-semibold">{t(L("Definiciones de KPIs", "KPI definitions"))}</h4>
              <DefTable head={["KPI", t(L("Fórmula", "Formula")), t(L("Nota", "Note"))]} rows={[
                [t(L("Ingresos", "Revenue")), "Σ order_items.price", t(L("Pedidos válidos; sin flete", "Valid orders; no freight"))],
                [t(L("Pedidos válidos", "Valid orders")), "COUNT(order_id)", t(L("estado ∉ {canceled, unavailable}", "status ∉ {canceled, unavailable}"))],
                [t(L("Ticket", "Ticket")), t(L("Ingresos / Pedidos", "Revenue / Orders")), ""],
                [t(L("Clientes únicos", "Unique customers")), "COUNT(DISTINCT customer_unique_id)", t(L("Precalculado por rango", "Precomputed per range"))],
                ["WMAPE", "Σ|y − ŷ| / Σ y", t(L("Error de pronóstico", "Forecast error"))],
                [t(L("Valor histórico", "Historical value")), t(L("Σ ingresos por cliente", "Σ revenue per customer")), t(L("No es CLV predictivo", "Not predictive CLV"))],
              ]} />
            </Card>
            <Card className="p-5">
              <h4 className="mb-2 font-semibold">{t(L("Controles de calidad (ejecutados en cada build)", "Quality checks (run on every build)"))}</h4>
              <ChecksList checks={d.checks} />
            </Card>
            <Card className="p-5">
              <h4 className="mb-2 font-semibold">{t(L("Decisiones de ingeniería", "Engineering decisions"))}</h4>
              <ul className="list-disc space-y-1.5 pl-4 text-[13px] text-ink-2">
                <li>{t(L("DuckDB en lugar de un servidor PostgreSQL: el mismo SQL estándar, sin infraestructura que mantener para un sitio estático. El SQL de staging y marts usa solo CTEs, ventanas, CAST y COALESCE.", "DuckDB instead of a PostgreSQL server: the same standard SQL with no infrastructure to maintain for a static site. Staging and mart SQL uses only CTEs, windows, CAST and COALESCE."))}</li>
                <li>{t(L("Ingresos desde ítems, no desde pagos: los pagos tienen varias filas por pedido y duplicarían montos en un JOIN (hay una prueba que lo demuestra).", "Revenue from items, not payments: payments have several rows per order and would duplicate amounts in a JOIN (a test demonstrates it)."))}</li>
                <li>{t(L("Agregados precalculados (~280 KB) en vez de una API en vivo: carga rápida y gratis en GitHub Pages; los filtros se resuelven en el navegador.", "Precomputed aggregates (~280 KB) instead of a live API: fast and free on GitHub Pages; filters resolve in the browser."))}</li>
                <li>{t(L("Pronóstico directo por horizonte con modelos base obligatorios: si el modelo avanzado no gana, se elige el simple.", "Direct per-horizon forecasting with mandatory baselines: if the advanced model does not win, the simple one is chosen."))}</li>
              </ul>
            </Card>
            <Card className="p-5">
              <h4 className="mb-2 font-semibold">{t(L("Repositorio y documentación", "Repository and documentation"))}</h4>
              <ul className="space-y-1.5 text-[13px]">
                <li><RepoLink path="analytics/revenue/sql" label={t(L("Modelos SQL (staging, marts, controles)", "SQL models (staging, marts, checks)"))} /></li>
                <li><RepoLink path="analytics/revenue/build.py" label={t(L("Pipeline de métricas e insights", "Metrics and insights pipeline"))} /></li>
                <li><RepoLink path="analytics/revenue/forecast.py" label={t(L("Pronóstico y backtest", "Forecast and backtest"))} /></li>
                <li><RepoLink path="analytics/api/main.py" label="FastAPI" /></li>
                <li><RepoLink path="analytics/tests" label={t(L("Pruebas automáticas", "Automated tests"))} /></li>
                <li><RepoLink path="analytics/README.md" label={t(L("Documentación técnica y ejecución", "Technical docs and how to run"))} /></li>
                <li><RepoLink path="web/src/features/revenue" label={t(L("Código de esta aplicación", "This app's code"))} /></li>
              </ul>
              <p className="mt-3 text-[12px] text-ink-3">{t(L(`Generado el ${d.meta.generatedAt} · ${num(d.meta.windowItems, "es")} líneas de pedido en la ventana`, `Generated on ${d.meta.generatedAt} · ${num(d.meta.windowItems, "en")} order lines in the window`))}</p>
            </Card>
          </div>
        </Section>

        <Section id="limitaciones" n={9} title={L("Limitaciones y futuras mejoras", "Limitations and future work")}>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-5">
              <h4 className="mb-2 font-semibold">{t(L("Limitaciones", "Limitations"))}</h4>
              <ul className="list-disc space-y-1.5 pl-4 text-[13px] text-ink-2">
                {[
                  L("Sin costos, comisiones ni devoluciones: no se calcula margen ni utilidad.", "No costs, commissions or returns: no margin or profit."),
                  L("Los datos se interrumpen hacia el 22-08-2018; se excluyen 2016 (baja cobertura) y agosto 2018 (incompleto).", "Data stops around 2018-08-22; 2016 (low coverage) and August 2018 (incomplete) are excluded."),
                  L("19 meses de historia: no se puede modelar estacionalidad anual; un solo Black Friday.", "19 months of history: yearly seasonality cannot be modelled; a single Black Friday."),
                  L("El intervalo del pronóstico cubrió menos de lo nominal fuera de muestra: es optimista.", "The forecast interval covered less than nominal out of sample: it is optimistic."),
                  L("Algunos gráficos (precios, top productos, RFM) responden solo a la región.", "Some charts (prices, top products, RFM) respond only to region."),
                  L("Todas las relaciones son asociaciones; no hay experimentos.", "All relationships are associations; there are no experiments."),
                ].map((x) => <li key={x.en}>{t(x)}</li>)}
              </ul>
            </Card>
            <Card className="p-5">
              <h4 className="mb-2 font-semibold">{t(L("Futuras mejoras", "Future work"))}</h4>
              <ul className="list-disc space-y-1.5 pl-4 text-[13px] text-ink-2">
                {[
                  L("Conectar a datos con costos para pasar de ingresos a margen por categoría.", "Connect to cost data to move from revenue to margin per category."),
                  L("Pronóstico por categoría y región (jerárquico) con reconciliación.", "Forecasts per category and region (hierarchical) with reconciliation."),
                  L("Modelo de probabilidad de recompra para un CLV predictivo con supuestos documentados.", "Repurchase-probability model for a predictive CLV with documented assumptions."),
                  L("Desplegar la API FastAPI con PostgreSQL gestionado si se necesitan datos en vivo.", "Deploy the FastAPI service with managed PostgreSQL if live data is needed."),
                  L("Alertas automáticas cuando un día cae fuera del rango esperado.", "Automatic alerts when a day falls outside the expected range."),
                ].map((x) => <li key={x.en}>{t(x)}</li>)}
              </ul>
            </Card>
          </div>
        </Section>
      </AppShell>
      <PresentationMode open={present} onClose={() => setPresent(false)} slides={slides} app="Revenue Intelligence" />
    </>
  );
}
