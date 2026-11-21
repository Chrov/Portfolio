"use client";
import { RotateCcw } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useDataset } from "@/lib/data";
import { num, pct, signedPct } from "@/lib/format";
import { cs, money, moneyAxis } from "@/lib/money";
import { chartTheme, type ChartTheme } from "@/lib/palette";
import { L, usePrefs, type Bi, type Lang } from "@/lib/prefs";

/* eslint-disable @typescript-eslint/no-explicit-any */
type CopperData = {
  meta: { source: string; url: string; generatedAt: string };
  years: number[]; production: number[]; price: number[]; exports: number[];
  corr: { price: number; production: number }; metrics: Record<string, number>;
  checks: { check: string; passed: boolean; detail: string }[];
};
const isCopper = (d: unknown): d is CopperData => !!d && typeof d === "object" && "exports" in d && "price" in d;
const SRC = L("COCHILCO, «50 años de la minería en cifras»: producción (kt de cobre fino), precio BML (US¢/lb) y exportaciones (US$ nominales)", "COCHILCO, “50 years of mining in figures”: output (kt fine copper), LME price (US¢/lb) and exports (nominal US$)");
const LB_PER_T = 2204.62;
type Ctx = { d: CopperData; ct: ChartTheme; lang: Lang; t: (b: Bi | string) => string; a: number; b: number; idx: number[] };

const corr = (x: number[], y: number[]) => {
  const n = x.length, mx = x.reduce((s, v) => s + v, 0) / n, my = y.reduce((s, v) => s + v, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
  return sxy / Math.sqrt(sxx * syy);
};
const yoy = (a: number[], i: number) => a[i] / a[i - 1] - 1;

export default function CopperApp() {
  const s = useDataset<CopperData>("case-copper", isCopper);
  if (s.status === "loading") return <Loading what="Copper Value Observatory" />;
  if (s.status === "error") return <LoadError error={s.error} dataset="case-copper" />;
  return <Copper d={s.data} />;
}

function Copper({ d }: { d: CopperData }) {
  const { lang, theme, t } = usePrefs();
  const fx = useMoney("copper");
  const ct = useMemo(() => chartTheme(theme), [theme]);
  const last = d.years.length - 1;
  const [a, setA] = useState(0);
  const [b, setB] = useState(last);
  const [present, setPresent] = useState(false);
  const idx = useMemo(() => Array.from({ length: b - a + 1 }, (_, i) => a + i), [a, b]);
  const c: Ctx = { d, ct, lang, t, a, b, idx };
  const M = (definition: Bi, formula: string, notes: Bi): Method => ({ definition, formula, source: SRC, notes });
  const yb = d.years[b];
  const ch = (arr: number[]) => (b > 0 ? yoy(arr, b) : null);
  const rIdx = idx.filter((i) => i > 0);
  const rP = rIdx.length > 2 ? corr(rIdx.map((i) => yoy(d.exports, i)), rIdx.map((i) => yoy(d.price, i))) : NaN;
  const rQ = rIdx.length > 2 ? corr(rIdx.map((i) => yoy(d.exports, i)), rIdx.map((i) => yoy(d.production, i))) : NaN;
  const span = b - a;
  const cagr = (arr: number[]) => (span > 0 ? (arr[b] / arr[a]) ** (1 / span) - 1 : NaN);
  const peak = d.exports.indexOf(Math.max(...d.exports));
  const unitValue = (i: number) => (d.exports[i] * 1e6) / (d.production[i] * 1000);

  const insights = [
    ins("2024", "measured", L("En 2024 el valor exportado creció más del triple que la producción", "In 2024 export value grew more than three times faster than output"),
      bi((l) => l === "es" ? `Exportaciones ${signedPct(yoy(d.exports, last), l)} frente a producción ${signedPct(yoy(d.production, last), l)}; el precio subió ${signedPct(yoy(d.price, last), l)}.` : `Exports ${signedPct(yoy(d.exports, last), l)} vs output ${signedPct(yoy(d.production, last), l)}; the price rose ${signedPct(yoy(d.price, last), l)}.`),
      L("Un tablero que mezcla toneladas y dólares atribuiría al volumen un crecimiento que es mayormente precio.", "A dashboard mixing tonnes and dollars would credit volume with growth that is mostly price."),
      L("Separar tableros de tonelaje físico y de valor nominal.", "Separate physical-tonnage and nominal-value dashboards."),
      L("Ajustar por inflación (US$ reales) antes de comparar décadas.", "Adjust for inflation (real US$) before comparing decades.")),
    ins("corr", "measured", L("El precio, no el volumen, mueve el valor exportado año a año", "Price, not volume, moves export value year to year"),
      bi((l) => l === "es" ? `Correlación de los cambios anuales 1977–2024: exportaciones vs precio r = ${num(d.corr.price, l, 2)}; vs producción r = ${num(d.corr.production, l, 2)}.` : `Correlation of yearly changes 1977–2024: exports vs price r = ${num(d.corr.price, l, 2)}; vs output r = ${num(d.corr.production, l, 2)}.`),
      L("Los ingresos por exportación del país dependen de un precio que Chile no controla.", "The country's export revenue depends on a price Chile does not control."),
      L("Planificar con escenarios de precio, no con proyecciones de un solo valor.", "Plan with price scenarios, not single-value projections."),
      L("Correlación no es causalidad; hay rezagos de contratos y subproductos.", "Correlation is not causation; there are contract lags and by-products.")),
    ins("long", "measured", L("En 49 años la producción creció ×5 y el valor exportado ×40 (nominal)", "In 49 years output grew ×5 and nominal export value ×40"),
      bi((l) => l === "es" ? `Producción ${num(d.production[0], l)} → ${num(d.production[last], l)} kt; exportaciones ${money(d.exports[0] * 1e6, l)} → ${money(d.exports[last] * 1e6, l)}.` : `Output ${num(d.production[0], l)} → ${num(d.production[last], l)} kt; exports ${money(d.exports[0] * 1e6, l)} → ${money(d.exports[last] * 1e6, l)}.`),
      L("La brecha refleja precio e inflación del dólar; sin deflactar no es crecimiento real.", "The gap reflects price and dollar inflation; without deflating it is not real growth."),
      L("Agregar una serie deflactada (CPI EE.UU.) para comparar períodos largos.", "Add a deflated series (US CPI) to compare long periods."),
      L("Validar consistencia de definiciones entre anuarios.", "Validate definition consistency across yearbooks.")),
    ins("peak", "measured", bi((l) => l === "es" ? `El valor exportado máximo fue en ${d.years[peak]}` : `Export value peaked in ${d.years[peak]}`),
      bi((l) => l === "es" ? `${money(d.exports[peak] * 1e6, l)} con ${num(d.production[peak], l)} kt; en 2024, ${money(d.exports[last] * 1e6, l)} con ${num(d.production[last], l)} kt.` : `${money(d.exports[peak] * 1e6, l)} with ${num(d.production[peak], l)} kt; in 2024, ${money(d.exports[last] * 1e6, l)} with ${num(d.production[last], l)} kt.`),
      L("Mayor volumen no garantiza mayor valor: los ciclos de precio dominan.", "More volume does not guarantee more value: price cycles dominate."),
      L("Monitorear el valor por tonelada como indicador de ciclo.", "Monitor value per tonne as a cycle indicator."),
      L("Valores nominales: comparar con cautela entre años lejanos.", "Nominal values: compare carefully across distant years.")),
    ins("sim", "simulated", L("Escenario: precio −10% con volumen estable", "Scenario: price −10% with stable volume"),
      bi((l) => l === "es" ? `Las exportaciones bajarían ≈ ${money(d.exports[last] * 1e6 * 0.1, l)} frente a 2024 (aritmética precio × volumen).` : `Exports would fall ≈ ${money(d.exports[last] * 1e6 * 0.1, l)} vs 2024 (price × volume arithmetic).`),
      L("Dimensiona la sensibilidad del ingreso exportador al precio.", "Sizes the sensitivity of export revenue to price."),
      L("Usar el simulador para escenarios combinados.", "Use the simulator for combined scenarios."),
      L("No es un pronóstico del precio ni de la producción.", "Not a forecast of price or output.")),
  ];
  const steps: Step[] = [
    { title: L("Comprensión del problema", "Understanding the problem"), body: L("¿El crecimiento del valor exportado de cobre se explica por más producción o por mejor precio?", "Is growth in copper export value explained by more output or by a better price?") },
    { title: L("Recolección de datos", "Data collection"), body: L("Tres anuarios oficiales de COCHILCO (producción, precio, exportaciones) con SHA-256.", "Three official COCHILCO yearbooks (output, price, exports) with SHA-256.") },
    { title: L("Preparación", "Preparation"), body: L("Conciliación anual 1976–2024 en un grano único; precios y valores se tratan como nominales y nunca se suman.", "Annual reconciliation 1976–2024 at a single grain; prices and values are nominal and never summed.") },
    { title: L("Análisis exploratorio", "Exploratory analysis"), body: L("Índices base 100, cambios anuales con funciones de ventana (LAG) y descomposición logarítmica precio-volumen.", "Base-100 indices, yearly changes with window functions (LAG) and log price-volume decomposition.") },
    { title: L("Métricas", "Metrics"), body: L("Correlación de cambios anuales y valor exportado por tonelada producida.", "Correlation of yearly changes and export value per tonne produced.") },
    { title: L("Implementación", "Implementation"), body: L("Modelo semántico Power BI, Excel y esta app con rango de años, USD/CLP y escenarios.", "Power BI semantic model, Excel and this app with year range, USD/CLP and scenarios.") },
    { title: L("Evaluación", "Evaluation"), body: L("Las cifras del último año y la correlación se recalculan y comparan con metrics.json en cada build.", "Latest-year figures and the correlation are recomputed and compared with metrics.json on every build."), facts: [L(`${d.checks.length} controles aprobados`, `${d.checks.length} checks passing`)] },
  ];
  const slides: Slide[] = [
    { kicker: L("Contexto", "Context"), title: L("¿Chile exporta más cobre o el cobre vale más?", "Does Chile export more copper, or is copper worth more?"), body: <p className="max-w-3xl">{t(L("49 años de cifras oficiales de COCHILCO (1976–2024) para separar volumen físico y valor nominal.", "49 years of official COCHILCO figures (1976–2024) to separate physical volume from nominal value."))}</p> },
    { kicker: L("2024", "2024"), title: L("Valor sube más que volumen", "Value grows faster than volume"), body: <div className="grid gap-4 md:grid-cols-3">
      <BigStat value={signedPct(yoy(d.exports, last), lang)} label={t(L("Exportaciones", "Exports"))} note={money(d.exports[last] * 1e6, lang)} />
      <BigStat value={signedPct(yoy(d.production, last), lang)} label={t(L("Producción", "Output"))} note={`${num(d.production[last], lang)} kt`} />
      <BigStat value={signedPct(yoy(d.price, last), lang)} label={t(L("Precio BML", "LME price"))} note={`${num(d.price[last], lang, 1)} US¢/lb`} />
    </div> },
    { kicker: L("Hallazgos", "Findings"), title: L("Lo que muestran los datos", "What the data shows"), body: <SlideList items={insights.slice(0, 4).map((i) => i.evidence)} /> },
    { kicker: L("Recomendación", "Recommendation"), title: L("Separar tonelaje y valor; planificar con escenarios de precio", "Separate tonnage and value; plan with price scenarios"), body: <SlideList items={[L("Tableros separados para volumen físico y valor nominal.", "Separate dashboards for physical volume and nominal value."), L("Escenarios de precio en lugar de un único pronóstico.", "Price scenarios instead of a single forecast."), L("Agregar series deflactadas para comparar décadas.", "Add deflated series to compare decades.")]} /> },
    { kicker: L("Limitaciones", "Limitations"), title: L("Lo que este análisis no puede afirmar", "What this analysis cannot claim"), body: <SlideList items={[L("Valores nominales: no descuentan inflación.", "Nominal values: no inflation adjustment."), L("Correlación, no causalidad.", "Correlation, not causation."), L("La conversión a CLP es referencial (promedio 2024).", "CLP conversion is a reference (2024 average).")]} /> },
  ];
  const yearSel = (label: Bi, v: number, set: (x: number) => void) => (
    <div className="w-28"><Select label={t(label)} value={v} onChange={(e) => set(+e.target.value)}>{d.years.map((y, i) => <option key={y} value={i}>{y}</option>)}</Select></div>
  );
  return (
    <>
      <AppShell app="Copper Value Observatory" tagline={L("Cobre chileno 1976–2024 · COCHILCO", "Chilean copper 1976–2024 · COCHILCO")} currency="copper" nav={CASE_NAV([{ id: "exploratorio", label: L("Precio vs volumen", "Price vs volume") }])} onPresent={() => setPresent(true)}
        filterBar={<FilterBar note={<FxNote note={fx.note} />}>
          {yearSel(L("Desde", "From"), a, (x) => { setA(x); if (x >= b) setB(Math.min(last, x + 1)); })}
          {yearSel(L("Hasta", "To"), b, (x) => { setB(x); if (x <= a) setA(Math.max(0, x - 1)); })}
          <div className="flex gap-1.5 pb-0.5">
            {[[0, last, "1976–2024"], [last - 19, last, "2005–2024"], [last - 9, last, "2015–2024"]].map(([x, y, lbl]) => <Button key={String(lbl)} size="sm" variant="ghost" onClick={() => { setA(x as number); setB(y as number); }}>{lbl}</Button>)}
            <Button size="sm" variant="ghost" onClick={() => { setA(0); setB(last); }}><RotateCcw className="h-3.5 w-3.5" /></Button>
          </div>
        </FilterBar>}>
        <CaseIntro kind="real" badges={["COCHILCO", "1976–2024", t(L("49 años", "49 years"))]}
          summary={[
            bi((l) => l === "es" ? `En 2024 Chile produjo ${num(d.production[last], l)} kt de cobre fino (${signedPct(yoy(d.production, last), l)}) y exportó ${money(d.exports[last] * 1e6, l)} (${signedPct(yoy(d.exports, last), l)}).` : `In 2024 Chile produced ${num(d.production[last], l)} kt of fine copper (${signedPct(yoy(d.production, last), l)}) and exported ${money(d.exports[last] * 1e6, l)} (${signedPct(yoy(d.exports, last), l)}).`),
            bi((l) => l === "es" ? `Los cambios anuales del valor exportado siguen al precio (r = ${num(d.corr.price, l, 2)}), no a la producción (r = ${num(d.corr.production, l, 2)}).` : `Yearly changes in export value track price (r = ${num(d.corr.price, l, 2)}), not output (r = ${num(d.corr.production, l, 2)}).`),
            L("Las cifras son nominales: la comparación entre décadas exige deflactar.", "Figures are nominal: comparing decades requires deflating."),
          ]}
          decision={L("reportar tonelaje físico y valor nominal en tableros separados y planificar ingresos con escenarios de precio.", "report physical tonnage and nominal value in separate dashboards and plan revenue with price scenarios.")}
          questions={[[L("¿Cómo evolucionaron volumen, precio y valor?", "How did volume, price and value evolve?"), "chart-index"], [L("¿Cuánto se exportó cada año?", "How much was exported each year?"), "chart-exports"], [L("¿Precio o volumen explica cada año?", "Price or volume, year by year?"), "chart-decomp"], [L("¿Qué tan fuerte es la relación con el precio?", "How strong is the link to price?"), "chart-scatter"], [L("¿Cuánto vale cada tonelada?", "What is each tonne worth?"), "chart-unit"], [L("¿Qué pasa si cae el precio?", "What if the price falls?"), "simulator"]]} />

        <Section id="dashboard" n={3} title={L("Dashboard del cobre", "Copper dashboard")} intro={bi((l) => l === "es" ? `Rango ${d.years[a]}–${yb}. Los KPIs muestran ${yb} frente al año anterior.` : `Range ${d.years[a]}–${yb}. KPIs show ${yb} vs the prior year.`)}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <KpiCard label={bi((l) => l === "es" ? `Producción ${yb}` : `Output ${yb}`)} value={`${num(d.production[b], lang)} kt`} change={ch(d.production)} changeLabel={ch(d.production) == null ? "—" : `${signedPct(ch(d.production)!, lang)} ${t(L("vs año anterior", "vs prior year"))}`} description={L("Cobre fino, miles de toneladas", "Fine copper, thousand tonnes")} method={M(L("Producción minera de cobre fino de Chile.", "Chile's mine output of fine copper."), "production_kt", L("Unidad física; no se mezcla con valores.", "Physical unit; never mixed with values."))} />
            <KpiCard label={bi((l) => l === "es" ? `Exportaciones ${yb}` : `Exports ${yb}`)} value={money(d.exports[b] * 1e6, lang)} change={ch(d.exports)} changeLabel={ch(d.exports) == null ? "—" : `${signedPct(ch(d.exports)!, lang)} ${t(L("vs año anterior", "vs prior year"))}`} description={L("Valor nominal", "Nominal value")} method={M(L("Valor de las exportaciones de cobre del año.", "Value of copper exports in the year."), "exports_usd_m × 10⁶", L("US$ nominales; en CLP se convierte al promedio 2024 (referencial).", "Nominal US$; CLP uses the 2024 average (reference)."))} />
            <KpiCard label={bi((l) => l === "es" ? `Precio ${yb}` : `Price ${yb}`)} value={`${money(d.price[b] / 100, lang, false)}/lb`} change={ch(d.price)} changeLabel={ch(d.price) == null ? "—" : `${signedPct(ch(d.price)!, lang)} ${t(L("vs año anterior", "vs prior year"))}`} description={bi((l) => `${num(d.price[b], l, 1)} US¢/lb · BML`)} method={M(L("Precio promedio anual en la Bolsa de Metales de Londres.", "Annual average London Metal Exchange price."), "price_us_cent_lb / 100", L("Nominal.", "Nominal."))} />
            <KpiCard label={L("Crecimiento anual compuesto", "Compound annual growth")} value={Number.isFinite(cagr(d.exports)) ? signedPct(cagr(d.exports), lang) : "—"} change={null} changeLabel={`${t(L("Producción", "Output"))} ${Number.isFinite(cagr(d.production)) ? signedPct(cagr(d.production), lang) : "—"}`} description={bi((l) => l === "es" ? `Exportaciones, ${d.years[a]}–${yb}` : `Exports, ${d.years[a]}–${yb}`)} method={M(L("Tasa anual constante que lleva del primer al último año del rango.", "Constant annual rate from the first to the last year of the range."), "(Vₙ / V₀)^(1/n) − 1", L("Nominal; sensible a los años extremos elegidos.", "Nominal; sensitive to the chosen endpoints."))} />
            <KpiCard label={L("Relación con el precio", "Link to price")} value={Number.isFinite(rP) ? `r = ${num(rP, lang, 2)}` : "—"} change={null} changeLabel={`${t(L("vs producción", "vs output"))} r = ${Number.isFinite(rQ) ? num(rQ, lang, 2) : "—"}`} description={L("Correlación de cambios anuales", "Correlation of yearly changes")} method={M(L("Pearson entre la variación anual de exportaciones y la del precio, en el rango elegido.", "Pearson between yearly change in exports and in price, within the chosen range."), "corr(Δ%exports, Δ%price)", L("Requiere al menos 3 cambios anuales.", "Needs at least 3 yearly changes."))} />
            <KpiCard label={L("Valor por tonelada", "Value per tonne")} value={`${money(unitValue(b), lang, false)}`} change={b > 0 ? unitValue(b) / unitValue(b - 1) - 1 : null} changeLabel={b > 0 ? `${signedPct(unitValue(b) / unitValue(b - 1) - 1, lang)} ${t(L("vs año anterior", "vs prior year"))}` : "—"} description={L("Exportaciones / producción", "Exports / output")} method={M(L("Valor exportado dividido por toneladas producidas: indicador descriptivo de ciclo.", "Export value divided by tonnes produced: a descriptive cycle indicator."), "exports / (production_kt × 1000)", L("Las exportaciones incluyen concentrados y refinados; no es un precio.", "Exports include concentrates and refined copper; not a price."))} />
          </div>
          <FxNote note={fx.note} className="mt-2 xl:hidden" />
          <div className="mt-4 grid gap-4 xl:grid-cols-2"><IndexChart c={c} /><ExportsChart c={c} /></div>
        </Section>
        <Section id="exploratorio" n={4} title={L("¿Precio o volumen?", "Price or volume?")}>
          <div className="grid gap-4 xl:grid-cols-2"><DecompChart c={c} /><ScatterChart c={c} /><UnitValueChart c={c} /><DecadeChart c={c} /></div>
        </Section>
        <FindingsSection n={5} items={insights} />
        <ImpactSection n={6}
          measured={[bi((l) => l === "es" ? `2024: exportaciones ${signedPct(yoy(d.exports, last), l)}, producción ${signedPct(yoy(d.production, last), l)}.` : `2024: exports ${signedPct(yoy(d.exports, last), l)}, output ${signedPct(yoy(d.production, last), l)}.`), bi((l) => `r(Δ exports, Δ price) = ${num(d.corr.price, l, 2)}`), L("49 años conciliados entre tres anuarios oficiales.", "49 years reconciled across three official yearbooks.")]}
          simulated={<p>{t(L("Valor exportado con supuestos de precio y volumen sobre la base 2024 (ajustable abajo).", "Export value under price and volume assumptions on the 2024 base (adjustable below)."))}</p>}
          expected={[L("Lecturas sin confundir volumen con valor", "Readings that do not confuse volume with value"), L("Planificación fiscal y comercial con escenarios", "Fiscal and commercial planning with scenarios"), L("Comunicación más clara de los ciclos del cobre", "Clearer communication of copper cycles")]}>
          <PriceSim c={c} />
        </ImpactSection>
        <MethodSection n={7} steps={steps}
          stages={[{ name: L("Fuente", "Source"), tech: "COCHILCO · 3 XLSX", detail: L("SHA-256 en provenance.json", "SHA-256 in provenance.json") }, { name: L("Conciliación", "Reconciliation"), tech: "Python · pandas", detail: L("Grano anual único", "Single annual grain") }, { name: "SQL", tech: "LAG() OVER (ORDER BY year)", detail: L("Variaciones anuales", "Yearly changes") }, { name: "BI", tech: "Power BI · Excel", detail: L("Modelo semántico PBIP", "PBIP semantic model") }, { name: L("App", "App"), tech: "Next.js · ECharts", detail: L("Rango, USD/CLP, escenarios", "Range, USD/CLP, scenarios") }].map((s) => ({ ...s, name: typeof s.name === "string" ? L(s.name, s.name) : s.name }))}
          defs={[[t(L("Índice", "Index")), "Vₜ / V₀ × 100", t(L("Base = primer año del rango", "Base = first year in range"))], ["Δ log", "ln(Vₜ/Vₜ₋₁) = Δln P + Δln Q + ε", t(L("Descomposición aproximada", "Approximate decomposition"))], [t(L("Correlación", "Correlation")), "Pearson(Δ%X, Δ%P)", t(L("Cambios, no niveles", "Changes, not levels"))], ["CAGR", "(Vₙ/V₀)^(1/n) − 1", t(L("Nominal", "Nominal"))]]}
          checks={d.checks}
          decisions={[L("Se correlacionan cambios anuales y no niveles: los niveles comparten tendencia y inflarían r.", "Yearly changes, not levels, are correlated: levels share a trend and would inflate r."), L("CLP es solo una unidad de lectura (promedio 2024); no reconstruye el valor histórico en pesos.", "CLP is only a reading unit (2024 average); it does not rebuild historical peso values."), L("Precio y volumen en ejes separados (gráficos distintos), nunca doble eje.", "Price and volume on separate charts, never a dual axis.")]}
          repo="https://github.com/Chrov/Portfolio/tree/main/case-studies/copper-observatory" generated={d.meta.generatedAt}
          links={[{ href: "../../case-studies/copper-observatory/dashboard.xlsx", label: L("Dashboard Excel", "Excel dashboard") }, { href: "../../case-studies/copper-observatory/PowerBI.zip", label: L("Proyecto Power BI (PBIP)", "Power BI project (PBIP)") }, { href: "../../case-studies/copper-observatory/annual.csv", label: L("Serie anual (CSV)", "Annual series (CSV)") }, { href: d.meta.url, label: L("Fuente COCHILCO", "COCHILCO source"), external: true }]} />
        <LimitsSection n={8}
          limits={[L("Valores nominales en US$: no descuentan inflación.", "Nominal US$ values: no inflation adjustment."), L("Exportaciones incluyen distintos productos (cátodos, concentrados); la división por producción es descriptiva.", "Exports include different products (cathodes, concentrates); dividing by output is descriptive."), L("Correlación de 48 cambios anuales: no prueba causalidad.", "Correlation of 48 yearly changes: not proof of causation."), L("La vista en CLP usa un único tipo de cambio (2024).", "The CLP view uses a single exchange rate (2024).")]}
          future={[L("Deflactar con CPI de EE.UU. y mostrar valores reales.", "Deflate with US CPI and show real values."), L("Agregar costos de producción (cash cost) para margen.", "Add production costs (cash cost) for margin."), L("Escenarios de precio con distribución histórica de variaciones.", "Price scenarios using the historical distribution of changes.")]} />
      </AppShell>
      <PresentationMode open={present} onClose={() => setPresent(false)} slides={slides} app="Copper Value Observatory" />
    </>
  );
}

function IndexChart({ c }: { c: Ctx }) {
  const { d, ct, lang, t, a, idx } = c;
  const series: [Bi, number[], string][] = [[L("Exportaciones (valor)", "Exports (value)"), d.exports, ct.series[0]], [L("Precio BML", "LME price"), d.price, ct.series[1]], [L("Producción (kt)", "Output (kt)"), d.production, ct.series[2]]];
  const labels = idx.map((i) => String(d.years[i]));
  const option = useMemo<EOption>(() => ({
    ...base(ct), legend: legend(ct), xAxis: catAxis(ct, labels, { boundaryGap: false }), yAxis: valueAxis(ct, (x: number) => num(x, lang)),
    tooltip: axisTip(ct, (k) => tipHead(labels[k]) + series.map(([n, arr, col]) => tipRow(col, t(n), num((arr[idx[k]] / arr[a]) * 100, lang))).join("") + tipNote(t(L(`Índice ${d.years[a]} = 100`, `Index ${d.years[a]} = 100`)))),
    series: series.map(([n, arr, col]) => ({ name: t(n), type: "line", data: idx.map((i) => (arr[i] / arr[a]) * 100), lineStyle: { width: 2, color: col }, itemStyle: { color: col }, symbol: "none" })),
  }), [idx, labels, ct, lang, t, a, d]);
  const fin = (arr: number[]) => (arr[idx[idx.length - 1]] / arr[a]) * 100;
  return (
    <ChartCard id="chart-index" title={L("Volumen, precio y valor: índice base 100", "Volume, price and value: base-100 index")} subtitle={bi((l) => l === "es" ? `Base ${d.years[a]} = 100` : `Base ${d.years[a]} = 100`)}
      filters={[L("Rango de años", "Year range")]} source={SRC}
      table={{ columns: [t(L("Año", "Year")), t(L("Exportaciones", "Exports")), t(L("Precio", "Price")), t(L("Producción", "Output"))], rows: idx.map((i) => [d.years[i], num(d.exports[i] / d.exports[a] * 100, lang), num(d.price[i] / d.price[a] * 100, lang), num(d.production[i] / d.production[a] * 100, lang)]) }}
      explain={{
        measures: L("Cada serie dividida por su valor del primer año del rango ×100: permite comparar unidades distintas en un solo eje.", "Each series divided by its first-year value ×100: compares different units on one axis."),
        observed: bi((l) => l === "es" ? `Desde ${d.years[a]}, exportaciones ${num(fin(d.exports), l)}, precio ${num(fin(d.price), l)} y producción ${num(fin(d.production), l)} (base 100). La distancia entre producción y exportaciones es el efecto precio (e inflación).` : `Since ${d.years[a]}, exports ${num(fin(d.exports), l)}, price ${num(fin(d.price), l)} and output ${num(fin(d.production), l)} (base 100). The gap between output and exports is the price (and inflation) effect.`),
        implications: L("Mirar solo el valor exportado sobrestima cuánto creció la actividad física.", "Looking only at export value overstates how much physical activity grew."),
        decisions: L("Cambiar el año base para ver ciclos (p. ej. 2005 o 2015).", "Change the base year to see cycles (e.g. 2005 or 2015)."),
        limits: L("Nominal; el año base elegido cambia la lectura visual.", "Nominal; the chosen base year changes the visual reading."),
      }}>
      <EChart option={option} height={320} label={t(L("Índice de volumen, precio y valor", "Volume, price and value index"))} />
    </ChartCard>
  );
}

function ExportsChart({ c }: { c: Ctx }) {
  const { d, ct, lang, t, idx } = c;
  const labels = idx.map((i) => String(d.years[i]));
  const option = useMemo<EOption>(() => ({
    ...base(ct), xAxis: catAxis(ct, labels), yAxis: valueAxis(ct, (x: number) => moneyAxis(x, lang)),
    tooltip: axisTip(ct, (k) => tipHead(labels[k]) + tipRow(ct.series[0], t(L("Exportaciones", "Exports")), money(d.exports[idx[k]] * 1e6, lang)) + (idx[k] > 0 ? tipNote(`${signedPct(yoy(d.exports, idx[k]), lang)} ${t(L("vs año anterior", "vs prior year"))}`) : ""), true),
    series: [{ type: "bar", data: idx.map((i) => d.exports[i] * 1e6), itemStyle: barStyle(ct.series[0]), barMaxWidth: 22 }],
  }), [idx, labels, ct, lang, t, d]);
  const sub = idx.map((i) => d.exports[i]); const iMax = idx[sub.indexOf(Math.max(...sub))];
  const drops = idx.filter((i) => i > 0 && yoy(d.exports, i) < -0.15);
  return (
    <ChartCard id="chart-exports" title={L("Valor exportado por año", "Export value per year")} subtitle={bi((l) => l === "es" ? `Nominal, en ${cs()}` : `Nominal, in ${cs()}`)} filters={[L("Rango de años", "Year range"), L("Moneda", "Currency")]} source={SRC}
      table={{ columns: [t(L("Año", "Year")), `${t(L("Exportaciones", "Exports"))} (${cs()})`], rows: idx.map((i) => [d.years[i], money(d.exports[i] * 1e6, lang, false)]) }}
      explain={{
        measures: L("Valor anual de las exportaciones de cobre de Chile, en la moneda elegida.", "Annual value of Chile's copper exports, in the chosen currency."),
        observed: bi((l) => l === "es" ? `El máximo del rango es ${d.years[iMax]} (${money(d.exports[iMax] * 1e6, l)}). Hubo ${drops.length} caídas de más de 15% en un año${drops.length ? ` (p. ej. ${drops.slice(0, 3).map((i) => d.years[i]).join(", ")})` : ""}.` : `The range maximum is ${d.years[iMax]} (${money(d.exports[iMax] * 1e6, l)}). There were ${drops.length} single-year drops above 15%${drops.length ? ` (e.g. ${drops.slice(0, 3).map((i) => d.years[i]).join(", ")})` : ""}.`),
        implications: L("Las caídas bruscas coinciden con crisis de precio (2009, 2015), no con colapsos de producción.", "Sharp drops coincide with price crises (2009, 2015), not output collapses."),
        decisions: L("Usar la serie para dimensionar la volatilidad del ingreso exportador.", "Use the series to size export-revenue volatility."),
        limits: L("En CLP se usa un único tipo de cambio (promedio 2024): sirve para leer magnitudes, no para reconstruir pesos de cada año.", "CLP uses a single rate (2024 average): it reads magnitudes, it does not rebuild each year's pesos."),
      }}>
      <EChart option={option} height={320} label={t(L("Valor exportado por año", "Export value per year"))} />
    </ChartCard>
  );
}

function DecompChart({ c }: { c: Ctx }) {
  const { d, ct, lang, t, idx } = c;
  const ys = idx.filter((i) => i > 0);
  const rows = ys.map((i) => { const tot = Math.log(d.exports[i] / d.exports[i - 1]), p = Math.log(d.price[i] / d.price[i - 1]), q = Math.log(d.production[i] / d.production[i - 1]); return { y: d.years[i], tot, p, q, e: tot - p - q }; });
  const labels = rows.map((r) => String(r.y));
  const parts: [keyof typeof rows[0], Bi, string][] = [["p", L("Precio", "Price"), ct.series[1]], ["q", L("Volumen", "Volume"), ct.series[2]], ["e", L("Otros (mix, rezagos)", "Other (mix, lags)"), ct.neutral]];
  const option = useMemo<EOption>(() => ({
    ...base(ct), legend: legend(ct), xAxis: catAxis(ct, labels), yAxis: valueAxis(ct, (x: number) => `${num(x * 100, lang)}`, { name: "Δ log ×100", nameTextStyle: { color: ct.text3, fontSize: 10 } }),
    tooltip: axisTip(ct, (k) => tipHead(labels[k]) + parts.map(([key, n, col]) => tipRow(col, t(n), num((rows[k][key] as number) * 100, lang, 1))).join("") + tipNote(`${t(L("Total", "Total"))} Δ log ×100 = ${num(rows[k].tot * 100, lang, 1)}`), true),
    series: parts.map(([key, n, col]) => ({ name: t(n), type: "bar", stack: "x", data: rows.map((r) => r[key]), itemStyle: { color: col, borderColor: ct.surface, borderWidth: 1 }, barMaxWidth: 18 })),
  }), [rows, labels, ct, lang, t]);
  const sp = rows.reduce((s, r) => s + Math.abs(r.p), 0), sq = rows.reduce((s, r) => s + Math.abs(r.q), 0);
  return (
    <ChartCard id="chart-decomp" title={L("¿Precio o volumen? Descomposición anual", "Price or volume? Yearly decomposition")} subtitle={L("Cambio logarítmico del valor exportado = precio + volumen + otros", "Log change in export value = price + volume + other")} filters={[L("Rango de años", "Year range")]} source={SRC} empty={!rows.length}
      table={{ columns: [t(L("Año", "Year")), t(L("Precio", "Price")), t(L("Volumen", "Volume")), t(L("Otros", "Other")), "Total"], rows: rows.map((r) => [r.y, num(r.p * 100, lang, 1), num(r.q * 100, lang, 1), num(r.e * 100, lang, 1), num(r.tot * 100, lang, 1)]) }}
      explain={{
        measures: L("Δln(exportaciones) = Δln(precio) + Δln(producción) + residuo. El residuo recoge mezcla de productos, rezagos de embarque y subproductos.", "Δln(exports) = Δln(price) + Δln(output) + residual. The residual captures product mix, shipping lags and by-products."),
        observed: bi((l) => l === "es" ? `En el rango, el componente precio movió ${num(sp / Math.max(sq, 1e-9), l, 1)} veces más que el volumen (suma de cambios absolutos).` : `Within the range, the price component moved ${num(sp / Math.max(sq, 1e-9), l, 1)} times more than volume (sum of absolute changes).`),
        implications: L("La variación anual del ingreso exportador es sobre todo un fenómeno de precio.", "Yearly variation in export revenue is mostly a price phenomenon."),
        decisions: L("Cobertura y planificación deben centrarse en el riesgo de precio.", "Hedging and planning should focus on price risk."),
        limits: L("Descomposición contable aproximada, no causal.", "Approximate accounting decomposition, not causal."),
      }}>
      <EChart option={option} height={320} label={t(L("Descomposición precio-volumen", "Price-volume decomposition"))} />
    </ChartCard>
  );
}

function ScatterChart({ c }: { c: Ctx }) {
  const { d, ct, lang, t, idx } = c;
  const pts = idx.filter((i) => i > 0).map((i) => [yoy(d.price, i), yoy(d.exports, i), d.years[i]]);
  const r = pts.length > 2 ? corr(pts.map((p) => p[0]), pts.map((p) => p[1])) : NaN;
  const option = useMemo<EOption>(() => ({
    ...base(ct), grid: { left: 8, right: 16, top: 16, bottom: 28, containLabel: true },
    xAxis: valueAxis(ct, (x: number) => pct(x, lang, 0), { name: t(L("Variación anual del precio", "Yearly price change")), nameLocation: "middle", nameGap: 26 }), yAxis: valueAxis(ct, (x: number) => pct(x, lang, 0)),
    tooltip: { ...base(ct).tooltip, trigger: "item", formatter: (p: any) => tipHead(String(p.value[2])) + tipRow(ct.series[1], t(L("Precio", "Price")), signedPct(p.value[0], lang)) + tipRow(ct.series[0], t(L("Exportaciones", "Exports")), signedPct(p.value[1], lang)) },
    series: [{ type: "scatter", data: pts, symbolSize: 9, itemStyle: { color: ct.series[0], borderColor: ct.surface, borderWidth: 1.5 },
      markLine: { symbol: "none", silent: true, lineStyle: { color: ct.text3, type: "dashed" }, label: { show: false }, data: [[{ coord: [-0.4, -0.4] }, { coord: [0.8, 0.8] }]] } }],
  }), [pts, ct, lang, t]);
  return (
    <ChartCard id="chart-scatter" title={L("Cambios anuales: exportaciones vs precio", "Yearly changes: exports vs price")} subtitle={bi((l) => `r = ${Number.isFinite(r) ? num(r, l, 2) : "—"} · ${l === "es" ? "línea = cambio idéntico" : "line = identical change"}`)} filters={[L("Rango de años", "Year range")]} source={SRC} empty={pts.length < 3}
      explain={{
        measures: L("Cada punto es un año: variación % del precio (X) y del valor exportado (Y).", "Each point is a year: % change in price (X) and in export value (Y)."),
        observed: bi((l) => l === "es" ? `Con ${pts.length} años, la correlación es ${num(r, l, 2)}: los puntos siguen la diagonal, es decir, el valor exportado se mueve casi uno a uno con el precio.` : `With ${pts.length} years, the correlation is ${num(r, l, 2)}: points follow the diagonal, so export value moves almost one-to-one with price.`),
        implications: L("Un 10% de caída de precio anticipa una caída similar del ingreso exportador, salvo que cambie el volumen.", "A 10% price drop anticipates a similar fall in export revenue unless volume changes."),
        decisions: L("Usar la relación para escenarios de sensibilidad.", "Use the relationship for sensitivity scenarios."),
        limits: L("Pocos puntos en rangos cortos; correlación no es causalidad.", "Few points in short ranges; correlation is not causation."),
      }}>
      <EChart option={option} height={320} label={t(L("Exportaciones vs precio", "Exports vs price"))} />
    </ChartCard>
  );
}

function UnitValueChart({ c }: { c: Ctx }) {
  const { d, ct, lang, t, idx } = c;
  const labels = idx.map((i) => String(d.years[i]));
  const uv = idx.map((i) => (d.exports[i] * 1e6) / (d.production[i] * 1000));
  const pr = idx.map((i) => (d.price[i] / 100) * LB_PER_T);
  const option = useMemo<EOption>(() => ({
    ...base(ct), legend: legend(ct), xAxis: catAxis(ct, labels, { boundaryGap: false }), yAxis: valueAxis(ct, (x: number) => moneyAxis(x, lang)),
    tooltip: axisTip(ct, (k) => tipHead(labels[k]) + tipRow(ct.series[0], t(L("Valor exportado / t producida", "Export value / t produced")), money(uv[k], lang, false)) + tipRow(ct.series[1], t(L("Precio BML por tonelada", "LME price per tonne")), money(pr[k], lang, false))),
    series: [
      { name: t(L("Valor exportado por tonelada", "Export value per tonne")), type: "line", data: uv, lineStyle: { width: 2, color: ct.series[0] }, itemStyle: { color: ct.series[0] }, symbol: "none" },
      { name: t(L("Precio BML por tonelada", "LME price per tonne")), type: "line", data: pr, lineStyle: { width: 2, type: "dashed", color: ct.series[1] }, itemStyle: { color: ct.series[1] }, symbol: "none" },
    ],
  }), [uv, pr, labels, ct, lang, t]);
  const ratio = uv.map((u, k) => u / pr[k]);
  return (
    <ChartCard id="chart-unit" title={L("¿Cuánto vale cada tonelada producida?", "What is each tonne produced worth?")} subtitle={bi((l) => l === "es" ? `${cs()} por tonelada, nominal` : `${cs()} per tonne, nominal`)} filters={[L("Rango de años", "Year range"), L("Moneda", "Currency")]} source={SRC}
      explain={{
        measures: L("Valor exportado dividido por toneladas producidas, junto al precio BML convertido a tonelada (×2.204,62 lb).", "Export value divided by tonnes produced, next to the LME price converted to tonnes (×2,204.62 lb)."),
        observed: bi((l) => l === "es" ? `Ambas series se mueven juntas; el valor por tonelada promedia ${pct(ratio.reduce((s, x) => s + x, 0) / ratio.length, l, 0)} del precio BML en el rango.` : `Both series move together; value per tonne averages ${pct(ratio.reduce((s, x) => s + x, 0) / ratio.length, l, 0)} of the LME price within the range.`),
        implications: L("La brecha refleja que se exporta parte como concentrado (con descuentos de fundición) y diferencias de timing.", "The gap reflects that part is exported as concentrate (with smelting discounts) and timing differences."),
        decisions: L("Seguir el valor por tonelada como indicador de ciclo y de mezcla de productos.", "Track value per tonne as a cycle and product-mix indicator."),
        limits: L("Producción y exportación no son el mismo flujo en un año (inventarios, embarques).", "Production and exports are not the same flow within a year (inventories, shipments)."),
      }}>
      <EChart option={option} height={300} label={t(L("Valor por tonelada", "Value per tonne"))} />
    </ChartCard>
  );
}

function DecadeChart({ c }: { c: Ctx }) {
  const { d, ct, lang, t } = c;
  const decs = [1970, 1980, 1990, 2000, 2010, 2020];
  const rows = decs.map((dec) => { const ii = d.years.map((y, i) => (y >= dec && y < dec + 10 ? i : -1)).filter((i) => i >= 0); const avg = (a: number[]) => ii.reduce((s, i) => s + a[i], 0) / ii.length; return { dec, n: ii.length, q: avg(d.production), x: avg(d.exports) * 1e6 }; });
  const labels = rows.map((r) => `${r.dec}s`);
  const option = useMemo<EOption>(() => ({
    ...base(ct), xAxis: catAxis(ct, labels), yAxis: valueAxis(ct, (x: number) => num(x, lang)),
    tooltip: axisTip(ct, (k) => tipHead(labels[k]) + tipRow(ct.series[2], t(L("Producción media", "Average output")), `${num(rows[k].q, lang)} kt`) + tipRow(ct.series[0], t(L("Exportación media", "Average exports")), money(rows[k].x, lang)) + tipNote(`${rows[k].n} ${t(L("años", "years"))}`), true),
    series: [{ type: "bar", data: rows.map((r) => r.q), itemStyle: barStyle(ct.series[2]), barMaxWidth: 36, label: { show: true, position: "top", color: ct.text3, fontSize: 10, formatter: (p: any) => money(rows[p.dataIndex].x, lang) } }],
  }), [rows, labels, ct, lang, t]);
  return (
    <ChartCard title={L("Producción promedio por década", "Average output per decade")} subtitle={L("Barras = kt/año · etiqueta = exportación media anual", "Bars = kt/year · label = average yearly exports")} filters={[L("Serie completa", "Full series"), L("Moneda", "Currency")]} source={SRC}
      table={{ columns: [t(L("Década", "Decade")), t(L("Años", "Years")), t(L("Producción (kt/año)", "Output (kt/yr)")), `${t(L("Exportación media", "Avg exports"))} (${cs()})`], rows: rows.map((r, k) => [labels[k], r.n, num(r.q, lang), money(r.x, lang)]) }}
      explain={{
        measures: L("Promedio anual de producción por década; la etiqueta muestra el valor exportado promedio anual.", "Average yearly output per decade; the label shows the average yearly export value."),
        observed: bi((l) => l === "es" ? `La producción se multiplicó entre los 80 y los 2000 (${num(rows[1].q, l)} → ${num(rows[3].q, l)} kt/año) y luego se estancó cerca de ${num(rows[5].q, l)} kt/año.` : `Output multiplied between the 1980s and 2000s (${num(rows[1].q, l)} → ${num(rows[3].q, l)} kt/yr) and then plateaued near ${num(rows[5].q, l)} kt/yr.`),
        implications: L("Con producción estancada, el crecimiento futuro del valor depende del precio o de nueva capacidad.", "With flat output, future value growth depends on price or new capacity."),
        decisions: L("Monitorear proyectos de capacidad y leyes de mineral como variables clave.", "Monitor capacity projects and ore grades as key variables."),
        limits: L("Los 70 incluyen solo 1976–1979 y los 2020, 2020–2024.", "The 1970s cover only 1976–1979 and the 2020s, 2020–2024."),
      }}>
      <EChart option={option} height={300} label={t(L("Producción por década", "Output per decade"))} />
    </ChartCard>
  );
}

function PriceSim({ c }: { c: Ctx }) {
  const { d, ct, lang, t } = c;
  const last = d.years.length - 1;
  const [dp, setDp] = useState(-10);
  const [dq, setDq] = useState(0);
  const base0 = d.exports[last] * 1e6;
  const sim = base0 * (1 + dp / 100) * (1 + dq / 100);
  const scen = [-20, -10, 0, 10, 20].map((p) => base0 * (1 + p / 100) * (1 + dq / 100));
  const option = useMemo<EOption>(() => ({
    ...base(ct), xAxis: catAxis(ct, ["−20%", "−10%", "0%", "+10%", "+20%"], { name: t(L("Variación del precio", "Price change")), nameLocation: "middle", nameGap: 26 }), yAxis: valueAxis(ct, (x: number) => moneyAxis(x, lang)),
    grid: { left: 8, right: 16, top: 24, bottom: 28, containLabel: true },
    tooltip: axisTip(ct, (k) => tipHead(["−20%", "−10%", "0%", "+10%", "+20%"][k]) + tipRow(ct.series[6], t(L("Exportaciones simuladas", "Simulated exports")), money(scen[k], lang)), true),
    series: [{ type: "bar", data: scen, itemStyle: barStyle(ct.series[6]), barMaxWidth: 40, markLine: { symbol: "none", silent: true, lineStyle: { color: ct.text3, type: "dashed" }, label: { formatter: "2024", position: "insideEndTop", color: ct.text3, fontSize: 10 }, data: [{ yAxis: base0 }] } }],
  }), [scen, base0, ct, lang, t]);
  return (
    <Card id="simulator" className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-sim-bg px-5 py-3">
        <div><Badge tone="simulated">{t(L("SIMULACIÓN · supuestos explícitos", "SIMULATION · explicit assumptions"))}</Badge>
          <h3 className="mt-1 text-[15px] font-semibold">{t(L("Escenarios de precio y volumen sobre 2024", "Price and volume scenarios on 2024"))}</h3></div>
        <p className="max-w-xl text-[12.5px] text-sim-text">{t(L("Exportaciones ≈ exportaciones 2024 × (1 + Δprecio) × (1 + Δvolumen). No pronostica el precio.", "Exports ≈ 2024 exports × (1 + Δprice) × (1 + Δvolume). It does not forecast price."))}</p>
      </div>
      <div className="grid gap-6 p-5 lg:grid-cols-[300px_1fr]">
        <div className="flex flex-col gap-4">
          <Slider label={t(L("Variación del precio", "Price change"))} value={dp} min={-40} max={40} onChange={setDp} format={(v) => signedPct(v / 100, lang, 0)} />
          <Slider label={t(L("Variación del volumen", "Volume change"))} value={dq} min={-15} max={15} onChange={setDq} format={(v) => signedPct(v / 100, lang, 0)} />
          <div className="rounded-lg bg-surface-2 p-3 text-[13px]">
            <p className="text-ink-3">{t(L("Exportaciones simuladas", "Simulated exports"))}</p>
            <p className="num text-2xl font-semibold">{money(sim, lang)}</p>
            <p className={sim >= base0 ? "text-good" : "text-bad"}>{signedPct(sim / base0 - 1, lang)} · {money(sim - base0, lang)} {t(L("vs 2024", "vs 2024"))}</p>
          </div>
          <p className="font-mono text-[11.5px] text-ink-3">X₂₀₂₄ · (1+Δp) · (1+Δq)</p>
        </div>
        <EChart option={option} height={280} label={t(L("Sensibilidad al precio", "Price sensitivity"))} />
      </div>
    </Card>
  );
}
