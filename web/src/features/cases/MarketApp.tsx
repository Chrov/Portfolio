"use client";
import { useMemo, useState } from "react";
import { AppShell, Section } from "@/components/AppShell";
import { CASE_NAV, CaseIntro, FilterBar, FindingsSection, ImpactSection, LimitsSection, MethodSection, SlideList, bi, ins, type Step } from "@/components/CaseKit";
import { ChartCard } from "@/components/ChartCard";
import { EChart, type EOption } from "@/components/EChart";
import { KpiCard, type Method } from "@/components/KpiCard";
import { FxNote, useMoney } from "@/components/Money";
import { BigStat, PresentationMode, type Slide } from "@/components/Presentation";
import { LoadError, Loading } from "@/components/States";
import { axisTip, barStyle, base, catAxis, legend, tipHead, tipNote, tipRow, valueAxis } from "@/components/chart-kit";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useDataset } from "@/lib/data";
import { monthLabel, num, pct, signedPct } from "@/lib/format";
import { cs, money, moneyAxis } from "@/lib/money";
import { chartTheme, type ChartTheme } from "@/lib/palette";
import { L, usePrefs, type Bi, type Lang } from "@/lib/prefs";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Agg = { rev: number[]; gp: number[]; cost: number[]; waste: number[]; n: number[] };
type MarketData = {
  meta: { source: string; generatedAt: string; latestClose: string; futureClosures: number; products: number; suppliers: number; batches: number };
  totals: { rev: number; gp: number; cost: number; waste: number; closedRev: number };
  scope: Record<string, { n: number; rev: number }>;
  categories: string[]; months: string[]; monthly: Record<string, Agg>;
  status: Record<string, Record<string, number>>;
  season: { order: string[]; rows: Record<string, [number, number][]> };
  suppliers: { name: string; role: string; products: number; cost: number; waste: number; batches: number; cats: string }[];
  hhi: number;
  products: { id: string; name: string; cat: string; cost: number; waste: number; rev: number; gp: number; n: number }[];
  checks: { check: string; passed: boolean; detail: string }[];
};
const isMarket = (d: unknown): d is MarketData => !!d && typeof d === "object" && "monthly" in d && "suppliers" in d;
const SRC = L("Datos simulados (market-stall-analytics): 3.825 lotes comprados jul 2023 – jun 2025, valorizados al costo en CLP", "Simulated data (market-stall-analytics): 3,825 batches bought Jul 2023 – Jun 2025, valued at cost in CLP");
const CAT_ES: Record<string, string> = { Olives: "Aceitunas", Nuts: "Frutos secos", Grains: "Granos", Peanuts: "Maní", "Trail Mix": "Mix de frutos", "Dried Fruit": "Fruta deshidratada", Candy: "Dulces", Chili: "Ají", Seeds: "Semillas", Pickles: "Encurtidos", Raisins: "Pasas", Honey: "Miel", Seasonings: "Condimentos", Packaging: "Envases" };
const SEASON: Record<string, Bi> = { Summer: L("Verano", "Summer"), Autumn: L("Otoño", "Autumn"), Winter: L("Invierno", "Winter"), Spring: L("Primavera", "Spring") };
type Ctx = { d: MarketData; ct: ChartTheme; lang: Lang; t: (b: Bi | string) => string; cat: string; cn: (c: string) => string; agg: Agg };

const sumA = (a: number[]) => a.reduce((s, x) => s + x, 0);

export default function MarketApp() {
  const s = useDataset<MarketData>("case-market", isMarket);
  if (s.status === "loading") return <Loading what="Waste & Margin Control" />;
  if (s.status === "error") return <LoadError error={s.error} dataset="case-market" />;
  return <Market d={s.data} />;
}

function Market({ d }: { d: MarketData }) {
  const { lang, theme, t } = usePrefs();
  const fx = useMoney("market");
  const ct = useMemo(() => chartTheme(theme), [theme]);
  const [cat, setCat] = useState("ALL");
  const [present, setPresent] = useState(false);
  const cn = (c: string) => (lang === "es" ? CAT_ES[c] ?? c : c);
  const agg = useMemo<Agg>(() => {
    const cats = cat === "ALL" ? d.categories : [cat];
    const z = () => d.months.map(() => 0);
    const o: Agg = { rev: z(), gp: z(), cost: z(), waste: z(), n: z() };
    cats.forEach((c) => (Object.keys(o) as (keyof Agg)[]).forEach((k) => d.monthly[c][k].forEach((v, i) => { o[k][i] += v; })));
    return o;
  }, [d, cat]);
  const c: Ctx = { d, ct, lang, t, cat, cn, agg };
  const M = (definition: Bi, formula: string, notes: Bi): Method => ({ definition, formula, source: SRC, notes });
  const R = sumA(agg.rev), G = sumA(agg.gp), C = sumA(agg.cost), W = sumA(agg.waste), N = sumA(agg.n);
  const h1 = (k: keyof Agg) => sumA(agg[k].slice(0, 12)), h2 = (k: keyof Agg) => sumA(agg[k].slice(12));
  const catTot = d.categories.map((x) => ({ c: x, rev: sumA(d.monthly[x].rev), gp: sumA(d.monthly[x].gp), cost: sumA(d.monthly[x].cost), waste: sumA(d.monthly[x].waste) }));
  const byRate = [...catTot].filter((x) => x.cost > 0).sort((a, b) => b.waste / b.cost - a.waste / a.cost);
  const top = catTot[0];
  const sup0 = d.suppliers[0], supShare = sup0.cost / sumA(d.suppliers.map((s) => s.cost));
  const seasonTot = d.season.order.map((_, i) => d.categories.reduce((s, x) => [s[0] + d.season.rows[x][i][0], s[1] + d.season.rows[x][i][1]], [0, 0]));
  const sRates = seasonTot.map((x) => x[1] / x[0]); const sMax = sRates.indexOf(Math.max(...sRates)), sMin = sRates.indexOf(Math.min(...sRates));
  const sim30 = (top.waste / 2) * 0.3;

  const insights = [
    ins("olives", "measured", bi((l) => l === "es" ? `${cn(top.c)} concentra la mayor merma valorizada` : `${top.c} carries the largest valued waste`),
      bi((l) => l === "es" ? `${money(top.waste, l)} al costo (${pct(top.waste / top.cost, l)} de lo comprado), ${pct(top.waste / d.totals.waste, l, 0)} de toda la merma.` : `${money(top.waste, l)} at cost (${pct(top.waste / top.cost, l)} of purchases), ${pct(top.waste / d.totals.waste, l, 0)} of all waste.`),
      L("Un piloto acotado a una categoría ataca un tercio del problema con bajo riesgo.", "A pilot scoped to one category tackles a third of the problem at low risk."),
      L("Piloto de control de merma en aceitunas antes de invertir en frío.", "Run a waste-control pilot on olives before investing in cold storage."),
      L("Registrar motivo de merma y stock contado durante el piloto.", "Record waste reasons and counted stock during the pilot.")),
    ins("rate", "measured", bi((l) => l === "es" ? `${cn(byRate[0].c)} tiene la tasa de merma más alta` : `${byRate[0].c} has the highest waste rate`),
      bi((l) => l === "es" ? `${pct(byRate[0].waste / byRate[0].cost, l)} del costo comprado se pierde, frente a ${pct(d.totals.waste / d.totals.cost, l)} del total.` : `${pct(byRate[0].waste / byRate[0].cost, l)} of purchased cost is lost, vs ${pct(d.totals.waste / d.totals.cost, l)} overall.`),
      L("Tasa alta con monto bajo sugiere revisar tamaño de lote o rotación, no invertir.", "A high rate with a low amount suggests reviewing batch size or rotation, not investing."),
      L("Reducir tamaño de compra o frecuencia en esa categoría.", "Reduce purchase size or frequency in that category."),
      L("Verificar vida útil real de los productos.", "Verify the real shelf life of the products.")),
    ins("supplier", "measured", L("La compra depende mucho de un proveedor", "Purchasing depends heavily on one supplier"),
      bi((l) => l === "es" ? `${sup0.name} concentra ${pct(supShare, l, 0)} del costo comprado; HHI = ${num(d.hhi, l)} (sobre 1.500 = concentración moderada).` : `${sup0.name} holds ${pct(supShare, l, 0)} of purchase cost; HHI = ${num(d.hhi, l)} (above 1,500 = moderate concentration).`),
      L("Un quiebre de ese proveedor afectaría varias categorías a la vez.", "A disruption at that supplier would hit several categories at once."),
      L("Calificar un proveedor de respaldo para frutos secos y maní.", "Qualify a backup supplier for nuts and peanuts."),
      L("Comparar precios y plazos antes de redistribuir.", "Compare prices and lead times before redistributing.")),
    ins("season", "measured", bi((l) => l === "es" ? `La merma es mayor en ${SEASON[d.season.order[sMax]].es.toLowerCase()}` : `Waste is highest in ${SEASON[d.season.order[sMax]].en.toLowerCase()}`),
      bi((l) => l === "es" ? `Tasa de merma ${pct(sRates[sMax], l)} en ${SEASON[d.season.order[sMax]].es.toLowerCase()} vs ${pct(sRates[sMin], l)} en ${SEASON[d.season.order[sMin]].es.toLowerCase()} (por estación de compra).` : `Waste rate ${pct(sRates[sMax], l)} in ${SEASON[d.season.order[sMax]].en.toLowerCase()} vs ${pct(sRates[sMin], l)} in ${SEASON[d.season.order[sMin]].en.toLowerCase()} (by purchase season).`),
      L("Ajustar tamaño de lote por estación reduce pérdidas sin inversión.", "Adjusting batch size by season cuts losses without investment."),
      L("Comprar lotes más pequeños en la estación de mayor merma.", "Buy smaller batches in the highest-waste season."),
      L("El efecto calor es un parámetro del generador: validar con registros reales.", "The heat effect is a generator parameter: validate with real records.")),
    ins("sim", "simulated", L("Escenario: −30% de merma en aceitunas", "Scenario: −30% olive waste"),
      bi((l) => l === "es" ? `Ahorro ≈ ${money(sim30, l)} al año al costo (merma anualizada de ${cn(top.c)} × 30%).` : `Saving ≈ ${money(sim30, l)} a year at cost (annualised ${top.c} waste × 30%).`),
      L("Dimensiona cuánto podría justificar un piloto o una inversión.", "Sizes how much a pilot or an investment could be worth."),
      L("Comparar contra el costo del piloto (tiempo, registro).", "Compare against the pilot's cost (time, logging)."),
      L("Supuesto, no resultado: no hay ahorros verificados.", "Assumption, not a result: no savings have been verified.")),
  ];
  const steps: Step[] = [
    { title: L("Comprensión del problema", "Understanding the problem"), body: L("Un puesto de frutos secos y encurtidos necesita saber dónde pierde dinero por merma antes de invertir en frío.", "A nuts-and-pickles stall needs to know where waste costs money before investing in cold storage.") },
    { title: L("Datos (simulados)", "Data (simulated)"), body: L("No había registros: se simularon 3.825 lotes, 128 productos y 22 proveedores; se declara en todas las vistas.", "No records existed: 3,825 batches, 128 products and 22 suppliers were simulated; declared in every view.") },
    { title: L("Preparación", "Preparation"), body: L("Lotes enlazados por clave única; conservación de cantidades (vendido + merma = comprado) y costo conciliados.", "Batches joined on unique keys; quantity conservation (sold + waste = bought) and cost reconciled.") },
    { title: L("Análisis exploratorio", "Exploratory analysis"), body: L("Margen y merma por categoría, mes de compra, estación, estado del lote y proveedor.", "Margin and waste by category, purchase month, season, batch status and supplier.") },
    { title: L("Métricas", "Metrics"), body: L("Merma valorizada al costo en CLP (no se suman kg con frascos), tasa de merma y HHI de proveedores.", "Waste valued at cost in CLP (kg and jars are never added), waste rate and supplier HHI.") },
    { title: L("Implementación", "Implementation"), body: L("SQL (DuckDB/SQLite), Excel con tablas dinámicas, Power BI y esta app con CLP/USD.", "SQL (DuckDB/SQLite), Excel with PivotTables, Power BI and this app with CLP/USD.") },
    { title: L("Evaluación", "Evaluation"), body: L("Reconciliación de ingresos, utilidad y merma con review_metrics.json en cada build.", "Revenue, profit and waste reconciled against review_metrics.json on every build."), facts: [L(`${d.checks.length} controles aprobados`, `${d.checks.length} checks passing`)] },
  ];
  const slides: Slide[] = [
    { kicker: L("Contexto", "Context"), title: L("¿Dónde pierde dinero un puesto de feria por merma?", "Where does a market stall lose money to waste?"), body: <p className="max-w-3xl">{t(L("Datos simulados (declarados) de 3.825 lotes. Objetivo: decidir si invertir en frío o primero controlar la operación.", "Simulated (declared) data for 3,825 batches. Goal: decide whether to invest in cold storage or first control operations."))}</p> },
    { kicker: L("Indicadores", "Indicators"), title: L("Cohortes de compra jul 2023 – jun 2025", "Purchase cohorts Jul 2023 – Jun 2025"), body: <div className="grid gap-4 md:grid-cols-4">
      <BigStat value={money(d.totals.rev, lang)} label={t(L("Ingresos", "Revenue"))} />
      <BigStat value={pct(d.totals.gp / d.totals.rev, lang)} label={t(L("Margen bruto", "Gross margin"))} />
      <BigStat value={money(d.totals.waste, lang)} label={t(L("Merma al costo", "Waste at cost"))} />
      <BigStat value={pct(d.totals.waste / d.totals.cost, lang)} label={t(L("Tasa de merma", "Waste rate"))} />
    </div> },
    { kicker: L("Hallazgos", "Findings"), title: L("Lo que muestran los datos", "What the data shows"), body: <SlideList items={insights.slice(0, 4).map((i) => i.evidence)} /> },
    { kicker: L("Recomendación", "Recommendation"), title: L("Piloto en aceitunas antes de invertir", "Olive pilot before investing"), body: <SlideList items={[L("Registrar ventas diarias, merma con motivo y stock contado.", "Record daily sales, waste with reason and counted stock."), L("Comparar costo de merma por kg entre ciclos equivalentes.", "Compare waste cost per kg across equivalent cycles."), L("Cotizar y validar aptitud del producto antes de evaluar frío.", "Quote and validate product suitability before assessing cold storage.")]} /> },
    { kicker: L("Limitaciones", "Limitations"), title: L("Datos simulados", "Simulated data"), body: <SlideList items={[L("Sin ahorros reales verificados.", "No verified real savings."), L("Las compras no son demanda observada.", "Purchases are not observed demand."), L("Cierres hasta 2035: no son ventas de dos años.", "Closures until 2035: not two years of sales.")]} /> },
  ];
  return (
    <>
      <AppShell app="Waste & Margin Control" tagline={L("Merma y margen por lote · datos simulados en CLP", "Batch waste and margin · simulated data in CLP")} currency="market" nav={CASE_NAV([{ id: "exploratorio", label: L("Categorías y proveedores", "Categories and suppliers") }])} onPresent={() => setPresent(true)}
        filterBar={<FilterBar note={<FxNote note={fx.note} />}>
          <div className="w-52"><Select label={t(L("Categoría", "Category"))} value={cat} onChange={(e) => setCat(e.target.value)}><option value="ALL">{t(L("Todas", "All"))}</option>{d.categories.map((x) => <option key={x} value={x}>{cn(x)}</option>)}</Select></div>
        </FilterBar>}>
        <CaseIntro kind="synthetic" badges={["CLP", `${num(d.meta.batches, lang)} ${t(L("lotes", "batches"))}`, "SQL · Excel · Power BI"]}
          summary={[
            bi((l) => l === "es" ? `La merma valorizada al costo suma ${money(d.totals.waste, l)} (${pct(d.totals.waste / d.totals.cost, l)} de lo comprado) sobre ${money(d.totals.rev, l)} de ingresos de las cohortes.` : `Waste valued at cost totals ${money(d.totals.waste, l)} (${pct(d.totals.waste / d.totals.cost, l)} of purchases) on ${money(d.totals.rev, l)} of cohort revenue.`),
            bi((l) => l === "es" ? `${cn(top.c)} concentra ${pct(top.waste / d.totals.waste, l, 0)} de la merma; ${cn(byRate[0].c)} tiene la tasa más alta (${pct(byRate[0].waste / byRate[0].cost, l)}).` : `${top.c} holds ${pct(top.waste / d.totals.waste, l, 0)} of waste; ${byRate[0].c} has the highest rate (${pct(byRate[0].waste / byRate[0].cost, l)}).`),
            L("Todos los datos son simulados y no hay ahorros verificados; el valor está en el método y la priorización.", "All data is simulated and no savings are verified; the value lies in the method and the prioritisation."),
          ]}
          decision={L("piloto de control de merma en aceitunas antes de aprobar inversión en frío u órdenes automáticas.", "a waste-control pilot on olives before approving cold-storage investment or automatic orders.")}
          questions={[[L("¿Cuánto se vende y cuánto margen queda?", "How much is sold and what margin remains?"), "chart-monthly"], [L("¿Cuánto se pierde por merma?", "How much is lost to waste?"), "chart-waste"], [L("¿Qué categorías priorizar?", "Which categories to prioritise?"), "chart-cats"], [L("¿Margen o merma?", "Margin or waste?"), "chart-scatter"], [L("¿Influye la estación?", "Does season matter?"), "chart-season"], [L("¿Dependo de un proveedor?", "Do I depend on one supplier?"), "chart-suppliers"]]} />
        <Section id="dashboard" n={3} title={L("Dashboard de margen y merma", "Margin and waste dashboard")} intro={bi((l) => `${cat === "ALL" ? (l === "es" ? "Todas las categorías" : "All categories") : cn(cat)} · ${l === "es" ? "cohortes de compra jul 2023 – jun 2025 · datos simulados" : "purchase cohorts Jul 2023 – Jun 2025 · simulated data"}`)}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <KpiCard label={L("Ingresos de cohortes", "Cohort revenue")} value={money(R, lang)} change={h2("rev") / h1("rev") - 1} changeLabel={`${signedPct(h2("rev") / h1("rev") - 1, lang)} ${t(L("año 2 vs año 1", "year 2 vs year 1"))}`} description={L("Ventas de los lotes comprados", "Sales of the batches bought")} method={M(L("Ingresos de todos los lotes comprados en el período, aunque cierren después.", "Revenue of all batches bought in the period, even if they close later."), "Σ Revenue_CLP", L("Cierres hasta 2035: no son ventas realizadas en dos años.", "Closures until 2035: not sales realised in two years."))} />
            <KpiCard label={L("Margen bruto", "Gross margin")} value={pct(G / R, lang)} change={null} changeLabel={money(G, lang)} description={L("Utilidad bruta / ingresos", "Gross profit / revenue")} method={M(L("Ingresos menos costo de compra del lote, sobre ingresos.", "Revenue minus batch purchase cost, over revenue."), "(Revenue − BatchCost) / Revenue", L("Sin gastos fijos ni arriendo.", "No fixed costs or rent."))} />
            <KpiCard label={L("Merma al costo", "Waste at cost")} value={money(W, lang)} change={h2("waste") / h1("waste") - 1} goodWhenUp={false} changeLabel={`${signedPct(h2("waste") / h1("waste") - 1, lang)} ${t(L("año 2 vs año 1", "year 2 vs year 1"))}`} description={L("Unidades perdidas × costo unitario", "Lost units × unit cost")} method={M(L("Cantidad perdida de cada lote valorizada a su costo unitario de compra.", "Quantity lost per batch valued at its unit purchase cost."), "Σ QtyWasted × UnitCost", L("Se agrega en dinero para no sumar kg con frascos.", "Aggregated in money so kg and jars are never added."))} />
            <KpiCard label={L("Tasa de merma", "Waste rate")} value={pct(W / C, lang)} change={(h2("waste") / h2("cost")) - (h1("waste") / h1("cost"))} goodWhenUp={false} changeLabel={`${num(((h2("waste") / h2("cost")) - (h1("waste") / h1("cost"))) * 100, lang, 2)} pp ${t(L("año 2 vs 1", "year 2 vs 1"))}`} description={L("Merma / costo comprado", "Waste / purchase cost")} method={M(L("Merma al costo dividida por el costo total comprado.", "Waste at cost divided by total purchase cost."), "Σ WasteCost / Σ BatchCost", L("Comparable entre categorías.", "Comparable across categories."))} />
            <KpiCard label={L("Lotes", "Batches")} value={num(N, lang)} change={null} changeLabel={`${num(d.meta.products, lang)} ${t(L("productos", "products"))} · ${d.meta.suppliers} ${t(L("proveedores", "suppliers"))}`} description={L("Compras registradas", "Recorded purchases")} method={M(L("Lotes de compra en el filtro.", "Purchase batches in the filter."), "COUNT(BatchID)", L("Clave única verificada.", "Unique key verified."))} />
            <KpiCard label={L("Concentración de proveedores", "Supplier concentration")} value={`HHI ${num(d.hhi, lang)}`} change={null} changeLabel={`${sup0.name.split(" ")[0]} ${pct(supShare, lang, 0)}`} description={L("1.500–2.500 = moderada", "1,500–2,500 = moderate")} method={M(L("Suma de cuadrados de la participación (%) de cada proveedor en el costo comprado.", "Sum of squared shares (%) of each supplier in purchase cost."), "HHI = Σ sᵢ²", L("Todas las categorías.", "All categories."))} />
          </div>
          <FxNote note={fx.note} className="mt-2 xl:hidden" />
          <div className="mt-4 grid gap-4 xl:grid-cols-2"><MonthlyChart c={c} /><WasteChart c={c} /></div>
        </Section>
        <Section id="exploratorio" n={4} title={L("Categorías, estaciones y proveedores", "Categories, seasons and suppliers")}>
          <div className="grid gap-4 xl:grid-cols-2"><CategoryChart c={c} /><ScatterChart c={c} /><SeasonChart c={c} /><StatusChart c={c} /><SupplierChart c={c} /><ProductChart c={c} /></div>
        </Section>
        <FindingsSection n={5} items={insights} />
        <ImpactSection n={6}
          measured={[bi((l) => l === "es" ? `Merma ${money(d.totals.waste, l)} (${pct(d.totals.waste / d.totals.cost, l)} del costo).` : `Waste ${money(d.totals.waste, l)} (${pct(d.totals.waste / d.totals.cost, l)} of cost).`), bi((l) => l === "es" ? `${cn(top.c)}: ${money(top.waste, l)}.` : `${top.c}: ${money(top.waste, l)}.`), L("Medido sobre datos simulados; reconciliado en cada build.", "Measured on simulated data; reconciled on every build.")]}
          simulated={<p>{t(L("Ahorro anual al costo si se reduce la merma de una categoría (ajustable abajo).", "Annual saving at cost if a category's waste is reduced (adjustable below)."))}</p>}
          expected={[L("Decidir inversión en frío con evidencia y no por intuición", "Decide on cold storage with evidence, not intuition"), L("Compras ajustadas por estación y rotación", "Purchasing adjusted by season and turnover"), L("Menor dependencia de un solo proveedor", "Less dependence on a single supplier")]}>
          <WasteSim c={c} />
        </ImpactSection>
        <MethodSection n={7} steps={steps}
          stages={[{ name: L("Simulación", "Simulation"), tech: "Python · seed", detail: L("Lotes, productos, proveedores", "Batches, products, suppliers") }, { name: L("SQL", "SQL"), tech: "DuckDB · SQLite", detail: L("Cohortes y conciliación", "Cohorts and reconciliation") }, { name: L("Excel", "Excel"), tech: "PivotTables · Power Query", detail: L("Cierres al corte", "Closures at cut-off") }, { name: L("BI", "BI"), tech: "Power BI (PBIP)", detail: L("Modelo semántico", "Semantic model") }, { name: L("App", "App"), tech: "Next.js · ECharts", detail: L("CLP/USD y simulador", "CLP/USD and simulator") }]}
          defs={[[t(L("Merma al costo", "Waste at cost")), "Σ QtyWasted × UnitCost", "CLP"], [t(L("Tasa de merma", "Waste rate")), "WasteCost / BatchCost", ""], [t(L("Margen bruto", "Gross margin")), "(Revenue − Cost) / Revenue", ""], ["HHI", "Σ (share %)²", t(L("Proveedores", "Suppliers"))]]}
          checks={d.checks}
          decisions={[L("Merma en dinero, no en unidades: el catálogo mezcla kg, frascos y paquetes.", "Waste in money, not units: the catalogue mixes kg, jars and packs."), L("Se reportan cohortes de compra; el Excel separa cierres antes y después del 30-06-2025.", "Purchase cohorts are reported; the Excel separates closures before and after 2025-06-30."), L("USD con el dólar observado promedio jul 2023 – jun 2025 (BCCh), reemplazando la tasa ilustrativa de 935.", "USD uses the average observed dollar Jul 2023 – Jun 2025 (BCCh), replacing the illustrative 935 rate.")]}
          repo="https://github.com/Chrov/market-stall-analytics" generated={d.meta.generatedAt}
          links={[{ href: "../../case-studies/market-stall-analytics/Executive_Report.pdf", label: L("Informe ejecutivo (PDF)", "Executive report (PDF)") }, { href: "../../case-studies/market-stall-analytics/Dashboard.xlsx", label: L("Dashboard Excel", "Excel dashboard") }, { href: "../../case-studies/market-stall-analytics/PowerBI.zip", label: L("Proyecto Power BI (PBIP)", "Power BI project (PBIP)") }, { href: "../../case-studies/market-stall-analytics/Process_Memoir.docx", label: L("Memoria del proceso (DOCX)", "Process memoir (DOCX)") }]} />
        <LimitsSection n={8}
          limits={[L("Datos simulados: catálogo, proveedores y resultados son material de portafolio.", "Simulated data: catalogue, suppliers and results are portfolio material."), bi((l) => l === "es" ? `${num(d.meta.futureClosures, l)} lotes cierran después de jun 2025 (hasta ${d.meta.latestClose.slice(0, 4)}): las cohortes no son ventas de dos años.` : `${num(d.meta.futureClosures, l)} batches close after Jun 2025 (until ${d.meta.latestClose.slice(0, 4)}): cohorts are not two years of sales.`), L("Las compras no son demanda observada; el stock es cualitativo.", "Purchases are not observed demand; stock is qualitative."), L("No hay ahorros ni beneficios de congeladores verificados.", "No verified savings or freezer benefits.")]}
          future={[L("Capturar ventas diarias por SKU y merma con motivo.", "Capture daily SKU sales and waste with reasons."), L("Inventario contado para pasar de compras a demanda.", "Counted inventory to move from purchases to demand."), L("Evaluar inversión en frío con cotizaciones reales.", "Assess cold-storage investment with real quotes.")]} />
      </AppShell>
      <PresentationMode open={present} onClose={() => setPresent(false)} slides={slides} app="Waste & Margin Control" />
    </>
  );
}

function MonthlyChart({ c }: { c: Ctx }) {
  const { d, ct, lang, t, agg } = c;
  const labels = d.months.map((m) => monthLabel(m, lang));
  const option = useMemo<EOption>(() => ({
    ...base(ct), legend: legend(ct), xAxis: catAxis(ct, labels), yAxis: valueAxis(ct, (x: number) => moneyAxis(x, lang)),
    tooltip: axisTip(ct, (k) => tipHead(monthLabel(d.months[k], lang, true)) + tipRow(ct.series[0], t(L("Ingresos", "Revenue")), money(agg.rev[k], lang)) + tipRow(ct.series[2], t(L("Utilidad bruta", "Gross profit")), money(agg.gp[k], lang)) + tipNote(`${t(L("Margen", "Margin"))} ${pct(agg.gp[k] / agg.rev[k], lang)}`), true),
    series: [
      { name: t(L("Ingresos", "Revenue")), type: "bar", data: agg.rev, itemStyle: barStyle(ct.series[0]), barMaxWidth: 16, barGap: "10%" },
      { name: t(L("Utilidad bruta", "Gross profit")), type: "bar", data: agg.gp, itemStyle: barStyle(ct.series[2]), barMaxWidth: 16 },
    ],
  }), [agg, labels, ct, lang, t, d]);
  const mg = agg.gp.map((g, k) => g / agg.rev[k]).filter(Number.isFinite);
  return (
    <ChartCard id="chart-monthly" title={L("Ingresos y utilidad bruta por mes de compra", "Revenue and gross profit by purchase month")} subtitle={bi((l) => l === "es" ? `${cs()} · cohorte = mes en que se compró el lote` : `${cs()} · cohort = month the batch was bought`)} filters={[L("Categoría", "Category"), L("Moneda", "Currency")]} source={SRC}
      table={{ columns: [t(L("Mes", "Month")), `${t(L("Ingresos", "Revenue"))} (${cs()})`, `${t(L("Utilidad", "Profit"))} (${cs()})`, t(L("Margen", "Margin"))], rows: d.months.map((m, k) => [monthLabel(m, lang, true), money(agg.rev[k], lang, false), money(agg.gp[k], lang, false), pct(agg.gp[k] / agg.rev[k], lang)]) }}
      explain={{
        measures: L("Ingresos y utilidad bruta de los lotes, asignados al mes de compra (aunque se vendan después).", "Revenue and gross profit of batches, assigned to the purchase month (even if sold later)."),
        observed: bi((l) => l === "es" ? `El margen mensual se mueve entre ${pct(Math.min(...mg), l)} y ${pct(Math.max(...mg), l)}; los meses de mayor compra coinciden con la temporada alta del generador (sep, dic).` : `Monthly margin ranges between ${pct(Math.min(...mg), l)} and ${pct(Math.max(...mg), l)}; the biggest purchase months match the generator's peak season (Sep, Dec).`),
        implications: L("El margen es estable: la palanca principal no es el precio sino la merma.", "Margin is stable: the main lever is waste, not price."),
        decisions: L("Planificar compras de temporada con tamaño de lote controlado.", "Plan seasonal purchasing with controlled batch sizes."),
        limits: L("Cohortes de compra, no ventas del mes; datos simulados.", "Purchase cohorts, not month sales; simulated data."),
      }}>
      <EChart option={option} height={300} label={t(L("Ingresos y utilidad bruta", "Revenue and gross profit"))} />
    </ChartCard>
  );
}

function WasteChart({ c }: { c: Ctx }) {
  const { d, ct, lang, t, agg } = c;
  const labels = d.months.map((m) => monthLabel(m, lang));
  const r = agg.waste.map((w, k) => (agg.cost[k] ? w / agg.cost[k] : NaN));
  const avg = sumA(agg.waste) / sumA(agg.cost);
  const option = useMemo<EOption>(() => ({
    ...base(ct), xAxis: catAxis(ct, labels), yAxis: valueAxis(ct, (x: number) => pct(x, lang, 1), { min: 0 }),
    tooltip: axisTip(ct, (k) => tipHead(monthLabel(d.months[k], lang, true)) + tipRow(ct.series[1], t(L("Tasa de merma", "Waste rate")), pct(r[k], lang, 2)) + tipRow(ct.neutral, t(L("Merma al costo", "Waste at cost")), money(agg.waste[k], lang))),
    series: [{ type: "line", data: r, lineStyle: { width: 2, color: ct.series[1] }, itemStyle: { color: ct.series[1] }, symbolSize: 5,
      markLine: { symbol: "none", silent: true, lineStyle: { color: ct.text3, type: "dashed" }, label: { formatter: t(L("Promedio", "Average")), position: "insideEndTop", color: ct.text3, fontSize: 10 }, data: [{ yAxis: avg }] } }],
  }), [r, labels, avg, agg, ct, lang, t, d]);
  const fin = r.filter(Number.isFinite); const iMax = r.indexOf(Math.max(...fin));
  return (
    <ChartCard id="chart-waste" title={L("Tasa de merma por mes de compra", "Waste rate by purchase month")} subtitle={L("Merma al costo / costo comprado", "Waste at cost / purchase cost")} filters={[L("Categoría", "Category")]} source={SRC}
      table={{ columns: [t(L("Mes", "Month")), t(L("Tasa", "Rate")), `${t(L("Merma", "Waste"))} (${cs()})`], rows: d.months.map((m, k) => [monthLabel(m, lang, true), pct(r[k], lang, 2), money(agg.waste[k], lang, false)]) }}
      explain={{
        measures: L("Proporción del costo de compra de cada mes que terminó como merma.", "Share of each month's purchase cost that ended as waste."),
        observed: bi((l) => l === "es" ? `Promedio ${pct(avg, l, 2)}; el máximo fue ${monthLabel(d.months[iMax], l, true)} (${pct(r[iMax], l, 2)}).` : `Average ${pct(avg, l, 2)}; the peak was ${monthLabel(d.months[iMax], l, true)} (${pct(r[iMax], l, 2)}).`),
        implications: L("Los picos estacionales sugieren ajustar tamaño de lote en los meses cálidos.", "Seasonal peaks suggest adjusting batch size in warm months."),
        decisions: L("Fijar una meta de tasa de merma por categoría y mes.", "Set a waste-rate target per category and month."),
        limits: L("Los últimos meses tienen lotes que aún no cierran; datos simulados.", "Recent months include batches not yet closed; simulated data."),
      }}>
      <EChart option={option} height={300} label={t(L("Tasa de merma por mes", "Waste rate by month"))} />
    </ChartCard>
  );
}

function CategoryChart({ c }: { c: Ctx }) {
  const { d, ct, lang, t, cat, cn } = c;
  const rows = d.categories.map((x) => ({ c: x, w: sumA(d.monthly[x].waste), cost: sumA(d.monthly[x].cost) })).filter((x) => x.w > 0);
  const option = useMemo<EOption>(() => ({
    ...base(ct), grid: { left: 8, right: 48, top: 8, bottom: 8, containLabel: true },
    yAxis: catAxis(ct, rows.map((x) => cn(x.c)), { inverse: true }), xAxis: valueAxis(ct, (x: number) => moneyAxis(x, lang)),
    tooltip: axisTip(ct, (k) => tipHead(cn(rows[k].c)) + tipRow(ct.series[1], t(L("Merma al costo", "Waste at cost")), money(rows[k].w, lang)) + tipRow(ct.neutral, t(L("Tasa", "Rate")), pct(rows[k].w / rows[k].cost, lang)) + tipNote(`${pct(rows[k].w / d.totals.waste, lang)} ${t(L("de la merma total", "of total waste"))}`), true),
    series: [{ type: "bar", data: rows.map((x) => ({ value: x.w, itemStyle: barStyle(cat === "ALL" || cat === x.c ? ct.series[1] : ct.neutralSoft, true) })), barMaxWidth: 14, label: { show: true, position: "right", color: ct.text3, fontSize: 10, formatter: (p: any) => pct(rows[p.dataIndex].w / rows[p.dataIndex].cost, lang) } }],
  }), [rows, cat, ct, lang, t, cn, d]);
  const top3 = rows.slice(0, 3).reduce((s, x) => s + x.w, 0) / d.totals.waste;
  return (
    <ChartCard id="chart-cats" title={L("Merma por categoría", "Waste by category")} subtitle={L("Al costo · etiqueta = tasa de merma · resaltado = filtro", "At cost · label = waste rate · highlight = filter")} filters={[L("Categoría (resalta)", "Category (highlights)"), L("Moneda", "Currency")]} source={SRC}
      table={{ columns: [t(L("Categoría", "Category")), `${t(L("Merma", "Waste"))} (${cs()})`, t(L("Tasa", "Rate"))], rows: rows.map((x) => [cn(x.c), money(x.w, lang, false), pct(x.w / x.cost, lang)]) }}
      explain={{
        measures: L("Merma valorizada al costo por categoría, ordenada de mayor a menor; la etiqueta muestra la tasa sobre lo comprado.", "Waste valued at cost per category, largest first; the label shows the rate over purchases."),
        observed: bi((l) => l === "es" ? `Las 3 primeras (${rows.slice(0, 3).map((x) => cn(x.c)).join(", ")}) explican ${pct(top3, l, 0)} de la merma. ${cn(rows[0].c)} lidera en monto; Granos, en tasa.` : `The top 3 (${rows.slice(0, 3).map((x) => x.c).join(", ")}) explain ${pct(top3, l, 0)} of waste. ${rows[0].c} leads in amount; Grains, in rate.`),
        implications: L("Monto y tasa responden preguntas distintas: dónde está el dinero vs dónde está la ineficiencia.", "Amount and rate answer different questions: where the money is vs where the inefficiency is."),
        decisions: L("Pilotear donde el monto es mayor; ajustar lotes donde la tasa es mayor.", "Pilot where the amount is largest; adjust batches where the rate is highest."),
        limits: L("Datos simulados.", "Simulated data."),
      }}>
      <EChart option={option} height={380} label={t(L("Merma por categoría", "Waste by category"))} />
    </ChartCard>
  );
}

function ScatterChart({ c }: { c: Ctx }) {
  const { d, ct, lang, t, cn } = c;
  const rows = d.categories.map((x) => { const m = d.monthly[x]; const rev = sumA(m.rev), gp = sumA(m.gp), cost = sumA(m.cost), w = sumA(m.waste); return { c: x, margin: gp / rev, rate: w / cost, rev }; });
  const maxR = Math.max(...rows.map((r) => r.rev));
  const option = useMemo<EOption>(() => ({
    ...base(ct), grid: { left: 8, right: 24, top: 16, bottom: 28, containLabel: true },
    xAxis: valueAxis(ct, (x: number) => pct(x, lang, 0), { name: t(L("Tasa de merma", "Waste rate")), nameLocation: "middle", nameGap: 26 }), yAxis: valueAxis(ct, (x: number) => pct(x, lang, 0), { scale: true }),
    tooltip: { ...base(ct).tooltip, trigger: "item", formatter: (p: any) => { const r = rows[p.dataIndex]; return tipHead(cn(r.c)) + tipRow(ct.series[0], t(L("Margen bruto", "Gross margin")), pct(r.margin, lang)) + tipRow(ct.series[1], t(L("Tasa de merma", "Waste rate")), pct(r.rate, lang)) + tipNote(`${t(L("Ingresos", "Revenue"))} ${money(r.rev, lang)}`); } },
    series: [{ type: "scatter", data: rows.map((r) => [r.rate, r.margin]), symbolSize: (_: any, p: any) => 8 + 26 * Math.sqrt(rows[p.dataIndex].rev / maxR), itemStyle: { color: ct.series[0], opacity: 0.8, borderColor: ct.surface, borderWidth: 1.5 },
      label: { show: true, position: "right", color: ct.text3, fontSize: 10, formatter: (p: any) => cn(rows[p.dataIndex].c) } }],
  }), [rows, maxR, ct, lang, t, cn]);
  const g = rows.find((r) => r.c === "Grains")!;
  return (
    <ChartCard id="chart-scatter" title={L("¿Margen o merma? Mapa de categorías", "Margin or waste? Category map")} subtitle={L("Tamaño = ingresos", "Size = revenue")} filters={[L("Todas las categorías", "All categories")]} source={SRC}
      explain={{
        measures: L("Cada burbuja es una categoría: eje X = tasa de merma, eje Y = margen bruto, tamaño = ingresos.", "Each bubble is a category: X = waste rate, Y = gross margin, size = revenue."),
        observed: bi((l) => l === "es" ? `${cn("Grains")} combina la mayor tasa de merma (${pct(g.rate, l)}) con margen de ${pct(g.margin, l)}; las categorías grandes (frutos secos, aceitunas) tienen margen medio y merma moderada.` : `Grains combine the highest waste rate (${pct(g.rate, l)}) with a ${pct(g.margin, l)} margin; large categories (nuts, olives) have mid margins and moderate waste.`),
        implications: L("Abajo a la derecha (poco margen, mucha merma) están las categorías que destruyen valor.", "Bottom right (low margin, high waste) are the value-destroying categories."),
        decisions: L("Revisar precio o tamaño de lote de las categorías de abajo a la derecha.", "Review price or batch size for bottom-right categories."),
        limits: L("Márgenes por categoría son parámetros del generador.", "Category margins are generator parameters."),
      }}>
      <EChart option={option} height={360} label={t(L("Margen vs merma por categoría", "Margin vs waste by category"))} />
    </ChartCard>
  );
}

function SeasonChart({ c }: { c: Ctx }) {
  const { d, ct, lang, t, cn } = c;
  const cats = d.categories.filter((x) => d.season.rows[x].some((r) => r[1] > 0));
  const data: { value: [number, number, number] }[] = [];
  cats.forEach((x, ci) => d.season.order.forEach((_, si) => { const [cost, w] = d.season.rows[x][si]; data.push({ value: [si, ci, cost ? w / cost : 0] }); }));
  const max = Math.max(...data.map((x) => x.value[2]));
  const sn = d.season.order.map((s) => t(SEASON[s]));
  const option = useMemo<EOption>(() => ({
    ...base(ct), grid: { left: 8, right: 16, top: 8, bottom: 8, containLabel: true },
    xAxis: catAxis(ct, sn, { position: "top" }), yAxis: catAxis(ct, cats.map(cn), { inverse: true }),
    visualMap: { min: 0, max, show: false, inRange: { color: ct.seq } },
    tooltip: { ...base(ct).tooltip, trigger: "item", formatter: (p: any) => tipHead(`${cn(cats[p.value[1]])} · ${sn[p.value[0]]}`) + tipRow(ct.series[1], t(L("Tasa de merma", "Waste rate")), pct(p.value[2], lang, 2)) },
    series: [{ type: "heatmap", data: data.map((x) => ({ ...x, label: { color: x.value[2] > max * 0.55 ? "#fff" : ct.text } })), itemStyle: { borderColor: ct.surface, borderWidth: 2, borderRadius: 3 }, label: { show: true, fontSize: 10, formatter: (p: any) => pct(p.value[2], lang, 1) } }],
  }), [data, cats, sn, max, ct, lang, t, cn]);
  const g = cats.map((x) => { const r = d.season.rows[x].map(([cost, w]) => (cost ? w / cost : 0)); return { x, spread: Math.max(...r) / Math.max(1e-9, Math.min(...r.filter((v) => v > 0))) }; }).sort((a, b) => b.spread - a.spread)[0];
  return (
    <ChartCard id="chart-season" title={L("¿Influye la estación? Tasa de merma", "Does season matter? Waste rate")} subtitle={L("Por categoría y estación de compra", "By category and purchase season")} filters={[L("Todas las categorías", "All categories")]} source={SRC}
      explain={{
        measures: L("Merma al costo sobre costo comprado, por categoría y estación del año en que se compró el lote (hemisferio sur).", "Waste at cost over purchase cost, by category and season the batch was bought (southern hemisphere)."),
        observed: bi((l) => l === "es" ? `${cn(g.x)} es la categoría más sensible a la estación: su peor estación pierde ${num(g.spread, l, 1)} veces más que la mejor.` : `${g.x} is the most season-sensitive category: its worst season loses ${num(g.spread, l, 1)} times more than its best.`),
        implications: L("Ajustar tamaño de lote por estación reduce pérdidas sin inversión.", "Adjusting batch size by season cuts losses without investment."),
        decisions: L("Comprar lotes más pequeños en las celdas más oscuras.", "Buy smaller batches in the darkest cells."),
        limits: L("Efecto calor = parámetro del generador; validar con registros reales.", "Heat effect = generator parameter; validate with real records."),
      }}>
      <EChart option={option} height={Math.max(280, cats.length * 26 + 40)} label={t(L("Merma por categoría y estación", "Waste by category and season"))} />
    </ChartCard>
  );
}

function StatusChart({ c }: { c: Ctx }) {
  const { d, ct, lang, t, cn } = c;
  const cats = d.categories;
  const so = cats.map((x) => d.status[x]["Sold Out"] ?? 0), pl = cats.map((x) => d.status[x]["Partial Loss"] ?? 0);
  const share = cats.map((_, i) => pl[i] / (so[i] + pl[i]));
  const order = cats.map((_, i) => i).sort((a, b) => share[b] - share[a]);
  const option = useMemo<EOption>(() => ({
    ...base(ct), legend: legend(ct), grid: { left: 8, right: 16, top: 32, bottom: 8, containLabel: true },
    yAxis: catAxis(ct, order.map((i) => cn(cats[i])), { inverse: true }), xAxis: valueAxis(ct, (x: number) => pct(x, lang, 0), { max: 1 }),
    tooltip: axisTip(ct, (k) => { const i = order[k]; return tipHead(cn(cats[i])) + tipRow(ct.series[2], t(L("Vendido completo", "Sold out")), `${num(so[i], lang)} (${pct(1 - share[i], lang, 0)})`) + tipRow(ct.series[1], t(L("Con pérdida parcial", "Partial loss")), `${num(pl[i], lang)} (${pct(share[i], lang, 0)})`); }, true),
    series: [
      { name: t(L("Vendido completo", "Sold out")), type: "bar", stack: "s", data: order.map((i) => 1 - share[i]), itemStyle: { color: ct.series[2], borderColor: ct.surface, borderWidth: 1 }, barMaxWidth: 14 },
      { name: t(L("Con pérdida parcial", "Partial loss")), type: "bar", stack: "s", data: order.map((i) => share[i]), itemStyle: { color: ct.series[1], borderColor: ct.surface, borderWidth: 1, borderRadius: [0, 3, 3, 0] }, barMaxWidth: 14 },
    ],
  }), [order, so, pl, share, cats, ct, lang, t, cn]);
  const tot = sumA(pl) / (sumA(pl) + sumA(so));
  return (
    <ChartCard id="chart-status" title={L("¿Cuántos lotes terminan con pérdida?", "How many batches end with a loss?")} subtitle={L("Estado final de los lotes por categoría", "Final batch status by category")} filters={[L("Todas las categorías", "All categories")]} source={SRC}
      table={{ columns: [t(L("Categoría", "Category")), t(L("Vendido completo", "Sold out")), t(L("Pérdida parcial", "Partial loss")), "%"], rows: order.map((i) => [cn(cats[i]), so[i], pl[i], pct(share[i], lang, 0)]) }}
      explain={{
        measures: L("Proporción de lotes vendidos por completo vs lotes con alguna pérdida.", "Share of batches sold out vs batches with some loss."),
        observed: bi((l) => l === "es" ? `${pct(tot, l, 0)} de los lotes tiene pérdida parcial; ${cn(cats[order[0]])} es la categoría con más lotes afectados (${pct(share[order[0]], l, 0)}).` : `${pct(tot, l, 0)} of batches have a partial loss; ${cats[order[0]]} has the most affected batches (${pct(share[order[0]], l, 0)}).`),
        implications: L("Muchos lotes con pérdidas pequeñas indican lotes demasiado grandes para la rotación.", "Many batches with small losses indicate batches too large for turnover."),
        decisions: L("Probar lotes más pequeños y más frecuentes en las categorías superiores.", "Test smaller, more frequent batches in the top categories."),
        limits: L("Frecuencia, no monto: combinar con el gráfico de merma al costo.", "Frequency, not amount: combine with the waste-at-cost chart."),
      }}>
      <EChart option={option} height={380} label={t(L("Estado de lotes por categoría", "Batch status by category"))} />
    </ChartCard>
  );
}

function SupplierChart({ c }: { c: Ctx }) {
  const { d, ct, lang, t } = c;
  const rows = d.suppliers.slice(0, 12);
  const tot = sumA(d.suppliers.map((s) => s.cost));
  const option = useMemo<EOption>(() => ({
    ...base(ct), grid: { left: 8, right: 48, top: 8, bottom: 8, containLabel: true },
    yAxis: catAxis(ct, rows.map((s) => s.name), { inverse: true, axisLabel: { color: ct.text3, fontSize: 10.5 } }), xAxis: valueAxis(ct, (x: number) => pct(x, lang, 0)),
    tooltip: axisTip(ct, (k) => { const s = rows[k]; return tipHead(s.name) + tipRow(ct.series[0], t(L("Participación en compras", "Share of purchases")), pct(s.cost / tot, lang)) + tipRow(ct.neutral, t(L("Costo comprado", "Purchase cost")), money(s.cost, lang)) + tipRow(ct.series[1], t(L("Merma", "Waste")), `${money(s.waste, lang)} (${pct(s.waste / s.cost, lang)})`) + tipNote(`${s.role} · ${s.products} ${t(L("productos", "products"))} · ${s.cats}`); }, true),
    series: [{ type: "bar", data: rows.map((s) => ({ value: s.cost / tot, itemStyle: barStyle(s.role === "Backup" ? ct.series[3] : ct.series[0], true) })), barMaxWidth: 14, label: { show: true, position: "right", color: ct.text3, fontSize: 10, formatter: (p: any) => pct(p.value, lang, 0) } }],
  }), [rows, tot, ct, lang, t]);
  return (
    <ChartCard id="chart-suppliers" title={L("¿Dependo de un proveedor? Concentración de compras", "Do I depend on one supplier? Purchase concentration")} subtitle={bi((l) => l === "es" ? `Top 12 de ${d.suppliers.length} · azul = principal, amarillo = respaldo · HHI ${num(d.hhi, l)}` : `Top 12 of ${d.suppliers.length} · blue = primary, yellow = backup · HHI ${num(d.hhi, l)}`)} filters={[L("Todas las categorías", "All categories")]} source={SRC}
      table={{ columns: [t(L("Proveedor", "Supplier")), t(L("Rol", "Role")), t(L("Participación", "Share")), `${t(L("Merma", "Waste"))} (${cs()})`], rows: d.suppliers.map((s) => [s.name, s.role, pct(s.cost / tot, lang), money(s.waste, lang, false)]) }}
      explain={{
        measures: L("Participación de cada proveedor en el costo total comprado; el HHI resume la concentración (0–10.000).", "Each supplier's share of total purchase cost; HHI summarises concentration (0–10,000)."),
        observed: bi((l) => l === "es" ? `${rows[0].name} concentra ${pct(rows[0].cost / tot, l, 0)} y ${rows[1].name} ${pct(rows[1].cost / tot, l, 0)}; los proveedores de respaldo pesan poco.` : `${rows[0].name} holds ${pct(rows[0].cost / tot, l, 0)} and ${rows[1].name} ${pct(rows[1].cost / tot, l, 0)}; backup suppliers weigh little.`),
        implications: L("Riesgo de abastecimiento concentrado en frutos secos y maní.", "Supply risk concentrated in nuts and peanuts."),
        decisions: L("Calificar y usar regularmente un proveedor de respaldo.", "Qualify and regularly use a backup supplier."),
        limits: L("Proveedores y precios simulados.", "Simulated suppliers and prices."),
      }}>
      <EChart option={option} height={380} label={t(L("Concentración de proveedores", "Supplier concentration"))} />
    </ChartCard>
  );
}

function ProductChart({ c }: { c: Ctx }) {
  const { d, ct, lang, t, cat, cn } = c;
  const rows = d.products.filter((p) => cat === "ALL" || p.cat === cat).slice(0, 12);
  const option = useMemo<EOption>(() => ({
    ...base(ct), grid: { left: 8, right: 48, top: 8, bottom: 8, containLabel: true },
    yAxis: catAxis(ct, rows.map((p) => (p.name.length > 34 ? p.name.slice(0, 33) + "…" : p.name)), { inverse: true, axisLabel: { color: ct.text3, fontSize: 10.5 } }), xAxis: valueAxis(ct, (x: number) => moneyAxis(x, lang)),
    tooltip: axisTip(ct, (k) => { const p = rows[k]; return tipHead(p.name) + tipRow(ct.series[1], t(L("Merma al costo", "Waste at cost")), money(p.waste, lang)) + tipRow(ct.neutral, t(L("Tasa", "Rate")), pct(p.waste / p.cost, lang)) + tipNote(`${cn(p.cat)} · ${p.n} ${t(L("lotes", "batches"))} · ${t(L("margen", "margin"))} ${pct(p.gp / p.rev, lang)}`); }, true),
    series: [{ type: "bar", data: rows.map((p) => p.waste), itemStyle: barStyle(ct.series[1], true), barMaxWidth: 14, label: { show: true, position: "right", color: ct.text3, fontSize: 10, formatter: (p: any) => pct(rows[p.dataIndex].waste / rows[p.dataIndex].cost, lang) } }],
  }), [rows, ct, lang, t, cn]);
  return (
    <ChartCard title={L("Productos con más merma", "Products with most waste")} subtitle={L("Top 12 por merma al costo · etiqueta = tasa", "Top 12 by waste at cost · label = rate")} filters={[L("Categoría", "Category"), L("Moneda", "Currency")]} source={SRC} empty={!rows.length}
      table={{ columns: [t(L("Producto", "Product")), t(L("Categoría", "Category")), `${t(L("Merma", "Waste"))} (${cs()})`, t(L("Tasa", "Rate"))], rows: rows.map((p) => [p.name, cn(p.cat), money(p.waste, lang, false), pct(p.waste / p.cost, lang)]) }}
      explain={{
        measures: L("Merma al costo por producto (entre los 25 con más merma de todo el catálogo).", "Waste at cost per product (among the 25 with the most waste across the catalogue)."),
        observed: rows.length ? bi((l) => l === "es" ? `«${rows[0].name}» encabeza con ${money(rows[0].waste, l)} (${pct(rows[0].waste / rows[0].cost, l)} de su costo).` : `“${rows[0].name}” leads with ${money(rows[0].waste, l)} (${pct(rows[0].waste / rows[0].cost, l)} of its cost).`) : L("Esta categoría no tiene productos en el top 25 de merma.", "This category has no products in the top-25 waste list."),
        implications: L("Pocos productos explican gran parte de la merma: el control puede ser muy focalizado.", "A few products explain much of the waste: control can be very targeted."),
        decisions: L("Empezar el registro de merma por estos productos.", "Start waste logging with these products."),
        limits: L("Solo se publican los 25 productos con más merma.", "Only the 25 highest-waste products are published."),
      }}>
      <EChart option={option} height={380} label={t(L("Productos con más merma", "Products with most waste"))} />
    </ChartCard>
  );
}

function WasteSim({ c }: { c: Ctx }) {
  const { d, ct, lang, t, cn } = c;
  const [cat, setCat] = useState(d.categories[0]);
  const [red, setRed] = useState(30);
  const rows = d.categories.map((x) => ({ c: x, w: sumA(d.monthly[x].waste) / 2 })).filter((x) => x.w > 0).slice(0, 8);
  const sel = rows.find((x) => x.c === cat) ?? rows[0];
  const save = sel.w * red / 100;
  const option = useMemo<EOption>(() => ({
    ...base(ct), legend: legend(ct), xAxis: catAxis(ct, rows.map((x) => cn(x.c)), { axisLabel: { color: ct.text3, fontSize: 10, rotate: 25, interval: 0 } }), yAxis: valueAxis(ct, (x: number) => moneyAxis(x, lang)),
    tooltip: axisTip(ct, (k) => tipHead(cn(rows[k].c)) + tipRow(ct.neutral, t(L("Merma anual medida", "Measured annual waste")), money(rows[k].w, lang)) + (rows[k].c === sel.c ? tipRow(ct.series[6], t(L("Escenario", "Scenario")), money(rows[k].w - save, lang)) : ""), true),
    series: [
      { name: t(L("Merma anual medida", "Measured annual waste")), type: "bar", data: rows.map((x) => x.w), itemStyle: barStyle(ct.neutral), barMaxWidth: 22, barGap: "10%" },
      { name: t(L("Escenario simulado", "Simulated scenario")), type: "bar", data: rows.map((x) => (x.c === sel.c ? x.w - save : null)), itemStyle: barStyle(ct.series[6]), barMaxWidth: 22 },
    ],
  }), [rows, sel, save, ct, lang, t, cn]);
  return (
    <Card id="simulator" className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-sim-bg px-5 py-3">
        <div><Badge tone="simulated">{t(L("SIMULACIÓN · supuestos explícitos", "SIMULATION · explicit assumptions"))}</Badge>
          <h3 className="mt-1 text-[15px] font-semibold">{t(L("¿Cuánto vale reducir la merma de una categoría?", "What is reducing a category's waste worth?"))}</h3></div>
        <p className="max-w-xl text-[12.5px] text-sim-text">{t(L("Ahorro = merma anual al costo (promedio de 2 años de compras) × reducción. No es un ahorro verificado.", "Saving = annual waste at cost (2-year purchase average) × reduction. Not a verified saving."))}</p>
      </div>
      <div className="grid gap-6 p-5 lg:grid-cols-[300px_1fr]">
        <div className="flex flex-col gap-4">
          <Select label={t(L("Categoría", "Category"))} value={sel.c} onChange={(e) => setCat(e.target.value)}>{rows.map((x) => <option key={x.c} value={x.c}>{cn(x.c)}</option>)}</Select>
          <Slider label={t(L("Reducción de merma", "Waste reduction"))} value={red} min={5} max={60} step={5} onChange={setRed} format={(v) => `−${v}%`} />
          <div className="rounded-lg bg-surface-2 p-3 text-[13px]">
            <p className="text-ink-3">{t(L("Ahorro anual al costo", "Annual saving at cost"))}</p>
            <p className="num text-2xl font-semibold">{money(save, lang)}</p>
            <p className="text-ink-3">{pct(save / (d.totals.waste / 2), lang)} {t(L("de la merma anual total", "of total annual waste"))}</p>
          </div>
          <p className="font-mono text-[11.5px] text-ink-3">(Σ waste / 2) × r</p>
        </div>
        <EChart option={option} height={300} label={t(L("Simulación de reducción de merma", "Waste reduction simulation"))} />
      </div>
    </Card>
  );
}
