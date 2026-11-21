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
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { useDataset } from "@/lib/data";
import { WEEKDAYS, dateLabel, num, pct, signedPct } from "@/lib/format";
import { chartTheme, type ChartTheme } from "@/lib/palette";
import { L, usePrefs, type Bi, type Lang } from "@/lib/prefs";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Prof = { dow: number[]; hol: number; pay: number; all: number };
type GroceryData = {
  meta: { source: string; generatedAt: string; rawRows: number; calendarRows: number; series: number; items: number; stores: number; from: string; to: string; quakeFrom: string | null; quakeTo: string | null };
  families: string[]; stores: { id: number; city: string; type: string }[];
  weeks: string[]; weekly: Record<string, Record<string, number[]>>; profile: Record<string, Record<string, Prof>>;
  days: { dow: number[]; hol: number; pay: number; all: number };
  backtest: { fold: number; split: string; origin: string; model: string; macro: number; bev: number; pairs: number }[];
  predictions: Record<string, { dates: string[]; actual: number[] } & Record<string, number[]>>;
  abc: { items: string[]; family: string[]; units: number[]; cum: number[]; cls: string[]; perishable: number[] };
  checks: { check: string; passed: boolean; detail: string }[];
};
const isGrocery = (d: unknown): d is GroceryData => !!d && typeof d === "object" && "weekly" in d && "backtest" in d;
const SRC = L("Datos sintéticos estilo Favorita (semilla 42) · 6 tiendas × 60 productos · ene 2015 – ago 2016", "Synthetic Favorita-style data (seed 42) · 6 stores × 60 products · Jan 2015 – Aug 2016");
const MODELS: Record<string, { label: Bi; color: (ct: ChartTheme) => string }> = {
  seasonal_naive: { label: L("Ingenuo estacional", "Seasonal naive"), color: (ct) => ct.neutral },
  weekday_mean_8w: { label: L("Media 8 semanas por día", "8-week weekday mean"), color: (ct) => ct.series[3] },
  lightgbm_recursive: { label: L("LightGBM recursivo", "Recursive LightGBM"), color: (ct) => ct.series[0] },
};
const FAM_ES: Record<string, string> = { "GROCERY I": "Abarrotes", BEVERAGES: "Bebidas", PRODUCE: "Frutas y verduras", DAIRY: "Lácteos", CLEANING: "Limpieza", "BREAD/BAKERY": "Panadería", DELI: "Fiambrería", EGGS: "Huevos" };
type Ctx = { d: GroceryData; ct: ChartTheme; lang: Lang; t: (b: Bi | string) => string; fam: string; store: string; famName: (f: string) => string };

export default function GroceryApp() {
  const s = useDataset<GroceryData>("case-grocery", isGrocery);
  if (s.status === "loading") return <Loading what="Replenishment Forecast Lab" />;
  if (s.status === "error") return <LoadError error={s.error} dataset="case-grocery" />;
  return <Grocery d={s.data} />;
}

function sel(d: GroceryData, fam: string, store: string) {
  const fams = fam === "ALL" ? d.families : [fam];
  const stores = store === "ALL" ? d.stores.map((s) => String(s.id)) : [store];
  const weekly = d.weeks.map((_, k) => fams.reduce((s, f) => s + stores.reduce((u, st) => u + (d.weekly[f][st]?.[k] ?? 0), 0), 0));
  const prof = { dow: [0, 0, 0, 0, 0, 0, 0], hol: 0, pay: 0, all: 0 };
  fams.forEach((f) => stores.forEach((st) => { const p = d.profile[f][st]; if (!p) return; p.dow.forEach((x, i) => { prof.dow[i] += x; }); prof.hol += p.hol; prof.pay += p.pay; prof.all += p.all; }));
  return { weekly, prof };
}

function Grocery({ d }: { d: GroceryData }) {
  const { lang, theme, t } = usePrefs();
  const ct = useMemo(() => chartTheme(theme), [theme]);
  const [fam, setFam] = useState("ALL");
  const [store, setStore] = useState("ALL");
  const [present, setPresent] = useState(false);
  const famName = (f: string) => (lang === "es" ? FAM_ES[f] ?? f : f.charAt(0) + f.slice(1).toLowerCase());
  const c: Ctx = { d, ct, lang, t, fam, store, famName };
  const M = (definition: Bi, formula: string, notes: Bi): Method => ({ definition, formula, source: SRC, notes });
  const s = useMemo(() => sel(d, fam, store), [d, fam, store]);
  const perDay = s.prof.all / d.days.all;
  const wkend = ((s.prof.dow[5] + s.prof.dow[6]) / (d.days.dow[5] + d.days.dow[6])) / ((s.prof.dow.slice(0, 5).reduce((a, x) => a + x, 0)) / d.days.dow.slice(0, 5).reduce((a, x) => a + x, 0)) - 1;
  const payLift = (s.prof.pay / d.days.pay) / perDay - 1;
  const hold = d.backtest.filter((x) => x.split === "holdout");
  const hb = (m: string) => hold.find((x) => x.model === m)!;
  const val = d.backtest.filter((x) => x.split === "validation");
  const valMean = (m: string) => val.filter((x) => x.model === m).reduce((a, x) => a + x.macro, 0) / 4;
  const imp = 1 - hb("lightgbm_recursive").bev / hb("seasonal_naive").bev;
  const nA = d.abc.cls.filter((x) => x === "A").length;
  const insights = [
    ins("model", "measured", L("LightGBM recursivo gana la validación temporal", "Recursive LightGBM wins temporal validation"),
      bi((l) => l === "es" ? `WMAPE medio por SKU-tienda en 4 cortes: LightGBM ${num(valMean("lightgbm_recursive"), l, 3)}, media 8 semanas ${num(valMean("weekday_mean_8w"), l, 3)}, ingenuo ${num(valMean("seasonal_naive"), l, 3)}.` : `Mean SKU-store WMAPE over 4 cut-offs: LightGBM ${num(valMean("lightgbm_recursive"), l, 3)}, 8-week mean ${num(valMean("weekday_mean_8w"), l, 3)}, naive ${num(valMean("seasonal_naive"), l, 3)}.`),
      L("La selección se hizo antes de mirar la prueba final, que lo confirma.", "Selection happened before looking at the final holdout, which confirms it."),
      L("Operarlo en sombra junto a la regla simple.", "Run it in shadow alongside the simple rule."),
      L("La mejora de error no es ahorro de inventario: medir quiebres y merma.", "Error improvement is not inventory savings: measure stockouts and waste.")),
    ins("bev", "measured", bi((l) => l === "es" ? `En bebidas de la tienda 1 el error baja ${pct(imp, l, 0)} frente al ingenuo` : `For store-1 beverages error drops ${pct(imp, l, 0)} vs naive`),
      bi((l) => l === "es" ? `Prueba final: WMAPE ${pct(hb("lightgbm_recursive").bev, l)} vs ${pct(hb("seasonal_naive").bev, l)} (ingenuo) y ${pct(hb("weekday_mean_8w").bev, l)} (media 8 semanas).` : `Final holdout: WMAPE ${pct(hb("lightgbm_recursive").bev, l)} vs ${pct(hb("seasonal_naive").bev, l)} (naive) and ${pct(hb("weekday_mean_8w").bev, l)} (8-week mean).`),
      L("En categorías de alta rotación el modelo aporta una mejora clara y estable.", "In high-turnover categories the model adds a clear, stable improvement."),
      L("Empezar el piloto por categorías de alta rotación.", "Start the pilot with high-turnover categories."),
      L("Verificar que la mejora se mantiene en otras tiendas.", "Verify the improvement holds in other stores.")),
    ins("intermittent", "measured", L("La demanda intermitente sigue siendo difícil", "Intermittent demand remains hard"),
      bi((l) => l === "es" ? `El WMAPE medio por SKU-tienda supera 100% para los tres modelos (LightGBM ${pct(hb("lightgbm_recursive").macro, l, 0)} en prueba): muchos SKU venden 0–2 unidades al día.` : `Mean SKU-store WMAPE exceeds 100% for all three models (LightGBM ${pct(hb("lightgbm_recursive").macro, l, 0)} in holdout): many SKUs sell 0–2 units a day.`),
      L("Automatizar pedidos en esos SKU con el mismo modelo generaría errores grandes.", "Automating orders for those SKUs with the same model would cause large errors."),
      L("Separar políticas por rotación (Croston, stock mínimo) antes de automatizar.", "Split policies by turnover (Croston, minimum stock) before automating."),
      L("Validar vida útil y restricciones del proveedor.", "Validate shelf life and supplier constraints.")),
    ins("calendar", "measured", L("Fin de semana y días de pago elevan la demanda", "Weekends and paydays lift demand"),
      bi((l) => l === "es" ? `Fin de semana ${signedPct(wkend, l)} vs día hábil; días de pago ${signedPct(payLift, l)} vs el promedio (filtro actual).` : `Weekend ${signedPct(wkend, l)} vs weekday; paydays ${signedPct(payLift, l)} vs average (current filter).`),
      L("Son variables de calendario conocidas de antemano: el modelo puede usarlas sin fuga.", "They are calendar variables known in advance: the model can use them without leakage."),
      L("Mantener calendario de pagos y feriados como entrada del pronóstico.", "Keep paydays and holidays as forecast inputs."),
      L("Reglas del generador sintético: confirmar con ventas reales.", "Synthetic generator rules: confirm with real sales.")),
    ins("pilot", "expected", L("Piloto en sombra de 4 semanas antes de emitir órdenes", "4-week shadow pilot before issuing orders"),
      L("Diseño propuesto (no ejecutado): comparar sesgo, quiebres y merma por SKU sin emitir pedidos automáticos.", "Proposed design (not executed): compare bias, stockouts and waste per SKU without issuing automatic orders."),
      L("Evita trasladar al inventario un error que el WMAPE agregado oculta.", "Avoids passing on to inventory an error that aggregate WMAPE hides."),
      L("Acordar umbrales de éxito antes de observar resultados.", "Agree success thresholds before observing results."),
      L("No atribuir causalidad a un antes/después sin controlar estacionalidad.", "Do not attribute causality to a before/after without controlling for seasonality.")),
  ];
  const steps: Step[] = [
    { title: L("Comprensión del problema", "Understanding the problem"), body: L("¿Puede un modelo de pronóstico apoyar la reposición de 360 series tienda-producto?", "Can a forecasting model support replenishment for 360 store-product series?") },
    { title: L("Datos (sintéticos)", "Data (synthetic)"), body: L("Generador estilo Favorita con semilla 42: ventas, tiendas, productos, feriados y petróleo.", "Favorita-style generator with seed 42: sales, stores, products, holidays and oil."), facts: [L("110.624 registros originales", "110,624 source records")] },
    { title: L("Ingeniería de datos", "Data engineering"), body: L("Esquema estrella en dbt + BigQuery; calendario completo con ceros explícitos (213.480 filas) y devoluciones negativas truncadas.", "Star schema in dbt + BigQuery; complete calendar with explicit zeros (213,480 rows) and negative returns clamped."), facts: [L("21 pruebas dbt aprobadas", "21 dbt tests passing")] },
    { title: L("Análisis exploratorio", "Exploratory analysis"), body: L("Tendencias por familia y tienda, efectos de calendario, Pareto ABC.", "Trends by family and store, calendar effects, ABC Pareto.") },
    { title: L("Modelos", "Models"), body: L("Ingenuo estacional, media de 8 semanas y LightGBM recursivo sin precios ni promociones futuras.", "Seasonal naive, 8-week mean and recursive LightGBM without future prices or promotions.") },
    { title: L("Evaluación", "Evaluation"), body: L("4 cortes de 15 días para elegir + 15 días finales reservados.", "4 cut-offs of 15 days to choose + 15 reserved final days.") },
    { title: L("Implementación", "Implementation"), body: L("Tableau Public, informe ejecutivo y esta app; plan de piloto en sombra.", "Tableau Public, executive report and this app; shadow-pilot plan."), facts: [L(`${d.checks.length} controles reproducidos aquí`, `${d.checks.length} checks reproduced here`)] },
  ];
  const slides: Slide[] = [
    { kicker: L("Contexto", "Context"), title: L("¿Puede un modelo apoyar la reposición de 360 series?", "Can a model support replenishment for 360 series?"), body: <p className="max-w-3xl">{t(L("Datos sintéticos estilo Favorita (declarados): 6 tiendas, 60 productos, ene 2015 – ago 2016.", "Synthetic Favorita-style data (declared): 6 stores, 60 products, Jan 2015 – Aug 2016."))}</p> },
    { kicker: L("Resultado", "Result"), title: L("LightGBM gana, con matices", "LightGBM wins, with caveats"), body: <div className="grid gap-4 md:grid-cols-3">
      <BigStat value={pct(hb("lightgbm_recursive").bev, lang)} label={t(L("WMAPE bebidas tienda 1", "WMAPE store-1 beverages"))} note="LightGBM" />
      <BigStat value={pct(hb("seasonal_naive").bev, lang)} label={t(L("WMAPE ingenuo", "Naive WMAPE"))} />
      <BigStat value="21" label={t(L("pruebas dbt aprobadas", "dbt tests passing"))} />
    </div> },
    { kicker: L("Hallazgos", "Findings"), title: L("Lo que muestran los datos", "What the data shows"), body: <SlideList items={insights.slice(0, 4).map((i) => i.evidence)} /> },
    { kicker: L("Recomendación", "Recommendation"), title: L("Piloto en sombra, segmentado por rotación", "Shadow pilot, segmented by turnover"), body: <SlideList items={[L("Operar LightGBM en sombra 4 semanas.", "Run LightGBM in shadow for 4 weeks."), L("Separar demanda intermitente con otra política.", "Handle intermittent demand with another policy."), L("Conservar la regla simple como referencia.", "Keep the simple rule as a reference.")]} /> },
    { kicker: L("Limitaciones", "Limitations"), title: L("Lo que este análisis no puede afirmar", "What this analysis cannot claim"), body: <SlideList items={[L("Datos sintéticos.", "Synthetic data."), L("Menor error no es ahorro de inventario.", "Lower error is not inventory savings."), L("El piloto es un diseño, no un resultado.", "The pilot is a design, not a result.")]} /> },
  ];
  return (
    <>
      <AppShell app="Replenishment Forecast Lab" tagline={L("Pronóstico para reposición · datos sintéticos", "Replenishment forecasting · synthetic data")} nav={CASE_NAV([{ id: "modelos", label: L("Modelos y backtest", "Models and backtest") }])} onPresent={() => setPresent(true)}
        filterBar={<FilterBar>
          <div className="w-44"><Select label={t(L("Familia", "Family"))} value={fam} onChange={(e) => setFam(e.target.value)}><option value="ALL">{t(L("Todas", "All"))}</option>{d.families.map((f) => <option key={f} value={f}>{famName(f)}</option>)}</Select></div>
          <div className="w-44"><Select label={t(L("Tienda", "Store"))} value={store} onChange={(e) => setStore(e.target.value)}><option value="ALL">{t(L("Todas", "All"))}</option>{d.stores.map((s) => <option key={s.id} value={String(s.id)}>{s.id} · {s.city}</option>)}</Select></div>
        </FilterBar>}>
        <CaseIntro kind="synthetic" badges={[t(L("semilla 42", "seed 42")), "dbt · BigQuery", "LightGBM"]}
          summary={[
            bi((l) => l === "es" ? `LightGBM recursivo obtiene el menor error en la validación temporal y en la prueba final (bebidas tienda 1: WMAPE ${pct(hb("lightgbm_recursive").bev, l)} vs ${pct(hb("seasonal_naive").bev, l)} del ingenuo).` : `Recursive LightGBM has the lowest error in temporal validation and in the final holdout (store-1 beverages: WMAPE ${pct(hb("lightgbm_recursive").bev, l)} vs naive ${pct(hb("seasonal_naive").bev, l)}).`),
            L("Pero la demanda intermitente mantiene errores superiores a 100% por SKU-tienda: no se debe automatizar todo.", "But intermittent demand keeps SKU-store errors above 100%: not everything should be automated."),
            L("Pipeline dbt con 21 pruebas y calendario completo con ceros explícitos; datos sintéticos declarados.", "dbt pipeline with 21 tests and a complete calendar with explicit zeros; synthetic data declared."),
          ]}
          decision={L("operar LightGBM en un piloto en sombra y separar la demanda intermitente antes de emitir órdenes automáticas.", "run LightGBM in a shadow pilot and separate intermittent demand before issuing automatic orders.")}
          questions={[[L("¿Cómo evoluciona la demanda?", "How does demand evolve?"), "chart-trend"], [L("¿Qué días se vende más?", "Which days sell most?"), "chart-calendar"], [L("¿Qué familias y tiendas pesan más?", "Which families and stores weigh most?"), "chart-heat"], [L("¿Qué modelo elegir?", "Which model to choose?"), "chart-backtest"], [L("¿Cómo se ve el pronóstico?", "What does the forecast look like?"), "chart-forecast"], [L("¿Qué productos priorizar?", "Which products to prioritise?"), "chart-abc"]]} />
        <Section id="dashboard" n={3} title={L("Dashboard de demanda", "Demand dashboard")} intro={bi((l) => `${fam === "ALL" ? (l === "es" ? "Todas las familias" : "All families") : famName(fam)} · ${store === "ALL" ? (l === "es" ? "todas las tiendas" : "all stores") : `${l === "es" ? "tienda" : "store"} ${store}`} · ${l === "es" ? "datos sintéticos" : "synthetic data"}`)}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <KpiCard label={L("Unidades vendidas", "Units sold")} value={num(s.prof.all, lang)} change={null} changeLabel={`${num(d.days.all, lang)} ${t(L("días", "days"))}`} description={L("Ene 2015 – ago 2016", "Jan 2015 – Aug 2016")} method={M(L("Suma de unidades vendidas en el filtro.", "Sum of units sold in the filter."), "Σ units_sold", L("Devoluciones negativas truncadas a cero.", "Negative returns clamped to zero."))} />
            <KpiCard label={L("Unidades por día", "Units per day")} value={num(perDay, lang)} change={null} changeLabel={t(L("promedio", "average"))} description={L("Demanda diaria media", "Mean daily demand")} method={M(L("Unidades totales sobre días del calendario.", "Total units over calendar days."), "Σ units / days", L("Calendario completo.", "Complete calendar."))} />
            <KpiCard label={L("Efecto fin de semana", "Weekend effect")} value={signedPct(wkend, lang)} change={wkend} changeLabel={t(L("vs día hábil", "vs weekday"))} description={L("Asociación, no causa", "Association, not cause")} method={M(L("Demanda media sáb–dom frente a lun–vie.", "Mean Sat–Sun demand vs Mon–Fri."), "mean(weekend) / mean(weekday) − 1", L("Regla del generador sintético.", "Synthetic generator rule."))} />
            <KpiCard label={L("Efecto día de pago", "Payday effect")} value={signedPct(payLift, lang)} change={payLift} changeLabel={t(L("vs promedio", "vs average"))} description={bi((l) => `${d.days.pay} ${l === "es" ? "días de pago" : "paydays"}`)} method={M(L("Demanda media en días de pago frente al promedio general.", "Mean demand on paydays vs overall average."), "mean(payday) / mean(all) − 1", L("Días 15 y último de cada mes.", "15th and last day of each month."))} />
            <KpiCard label={L("WMAPE bebidas · tienda 1", "WMAPE beverages · store 1")} value={pct(hb("lightgbm_recursive").bev, lang)} change={-imp} goodWhenUp={false} changeLabel={`${signedPct(-imp, lang)} ${t(L("vs ingenuo", "vs naive"))}`} description={L("LightGBM, prueba final", "LightGBM, final holdout")} method={M(L("Error absoluto total sobre demanda total en los 15 días finales.", "Total absolute error over total demand in the final 15 days."), "Σ|y − ŷ| / Σ y", L("Serie agregada de la familia en la tienda 1.", "Aggregated family series in store 1."))} />
            <KpiCard label={L("Productos clase A", "Class A products")} value={`${nA} / ${d.abc.items.length}`} change={null} changeLabel={t(L("acumulan ~80% de unidades", "hold ~80% of units"))} description={L("Pareto ABC", "ABC Pareto")} method={M(L("Productos que acumulan el 80% de las unidades.", "Products accumulating 80% of units."), "cumsum(units desc) ≤ 0.8", L("Todas las tiendas.", "All stores."))} />
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-2"><TrendChart c={c} sel={s} /><CalendarChart c={c} sel={s} /></div>
          <div className="mt-4"><HeatChart c={c} /></div>
        </Section>
        <Section id="modelos" n={4} title={L("Modelos y backtest", "Models and backtest")} intro={L("Validación walk-forward: 4 cortes para elegir el modelo y 15 días finales que nadie miró hasta el final.", "Walk-forward validation: 4 cut-offs to choose the model and 15 final days no one looked at until the end.")}>
          <div className="grid gap-4 xl:grid-cols-2"><BacktestChart c={c} /><ForecastChart c={c} /></div>
          <div className="mt-4"><AbcChart c={c} /></div>
        </Section>
        <FindingsSection n={5} items={insights} />
        <ImpactSection n={6}
          measured={[bi((l) => l === "es" ? `Bebidas tienda 1: WMAPE ${pct(hb("lightgbm_recursive").bev, l)} vs ${pct(hb("seasonal_naive").bev, l)} (ingenuo).` : `Store-1 beverages: WMAPE ${pct(hb("lightgbm_recursive").bev, l)} vs ${pct(hb("seasonal_naive").bev, l)} (naive).`), L("Mejor modelo en la media de 4 cortes de validación.", "Best model on the mean of 4 validation cut-offs."), L("21 pruebas dbt aprobadas; medido sobre datos sintéticos.", "21 dbt tests passing; measured on synthetic data.")]}
          simulated={<p>{t(L("No se simula ahorro de inventario: las políticas heredadas (stock de seguridad, punto de reorden) no están validadas y se excluyen de esta app.", "No inventory savings are simulated: inherited policies (safety stock, reorder point) are unvalidated and excluded from this app."))}</p>}
          expected={[L("Menos quiebres en categorías de alta rotación", "Fewer stockouts in high-turnover categories"), L("Pedidos más estables tras días atípicos", "More stable orders after atypical days"), L("Políticas diferenciadas por rotación", "Turnover-specific policies")]} />
        <MethodSection n={7} steps={steps}
          stages={[{ name: L("Generador", "Generator"), tech: "Python · seed 42", detail: L("Datos estilo Favorita", "Favorita-style data") }, { name: L("Warehouse", "Warehouse"), tech: "dbt · BigQuery", detail: L("Estrella + 21 pruebas", "Star schema + 21 tests") }, { name: L("Modelos", "Models"), tech: "LightGBM · pandas", detail: L("Recursivo, sin fuga", "Recursive, leakage-free") }, { name: "BI", tech: "Tableau Public", detail: L("Libro publicado", "Published workbook") }, { name: L("App", "App"), tech: "Next.js · ECharts", detail: L("Filtros y backtest", "Filters and backtest") }].map((x) => ({ ...x, name: typeof x.name === "string" ? L(x.name, x.name) : x.name }))}
          defs={[["WMAPE", "Σ|y − ŷ| / Σ y", t(L("Por serie o agregado", "Per series or aggregate"))], [t(L("Macro SKU-tienda", "Macro SKU-store")), "mean_s WMAPE_s", t(L("Puede superar 100%", "Can exceed 100%"))], [t(L("Recursivo", "Recursive")), "ŷₜ₊₁ = f(ŷₜ, …)", t(L("Usa sus propias predicciones", "Uses its own predictions"))], ["ABC", "cumsum ≤ 80% / 95%", ""]]}
          checks={d.checks}
          decisions={[L("Ceros explícitos solo bajo el contrato del generador: no extrapolar a datos reales.", "Explicit zeros only under the generator contract: do not extrapolate to real data."), L("Sin precios, petróleo ni promociones futuras en el pronóstico.", "No future prices, oil or promotions in the forecast."), L("Las salidas heredadas de inventario se marcan como no validadas y no se muestran.", "Inherited inventory outputs are flagged unvalidated and not shown.")]}
          repo="https://github.com/Chrov/grocery-replenishment-policy" generated={d.meta.generatedAt}
          links={[{ href: "../../case-studies/grocery-replenishment-policy/Executive_Report.pdf", label: L("Informe ejecutivo (PDF)", "Executive report (PDF)") }, { href: "../../case-studies/grocery-replenishment-policy/Dashboard.twbx", label: L("Libro Tableau (.twbx)", "Tableau workbook (.twbx)") }, { href: "https://public.tableau.com/app/profile/camilo.vergara3198/viz/Replenishment_17889686809270/SyntheticreplenishmentReposicionsimulada", label: L("Tableau Public", "Tableau Public"), external: true }]} />
        <LimitsSection n={8}
          limits={[L("Datos sintéticos: efectos de calendario y terremoto son reglas del generador.", "Synthetic data: calendar and earthquake effects are generator rules."), L("Menor error no equivale a ahorro de inventario.", "Lower error does not equal inventory savings."), L("WMAPE >100% en series intermitentes.", "WMAPE >100% on intermittent series."), L("El piloto de 4 semanas es una propuesta, no un resultado.", "The 4-week pilot is a proposal, not a result.")]}
          future={[L("Método específico para intermitentes (Croston/TSB).", "Intermittent-specific method (Croston/TSB)."), L("Intervalos de predicción para stock de seguridad.", "Prediction intervals for safety stock."), L("Validar con datos reales de una tienda.", "Validate with real store data.")]} />
      </AppShell>
      <PresentationMode open={present} onClose={() => setPresent(false)} slides={slides} app="Replenishment Forecast Lab" />
    </>
  );
}

function TrendChart({ c, sel: s0 }: { c: Ctx; sel: ReturnType<typeof sel> }) {
  const { d, ct, lang, t } = c;
  // first and last weeks are partial (calendar starts on a Thursday, ends mid-week): drop them
  const weeks = d.weeks.slice(1, -1);
  const s = { weekly: s0.weekly.slice(1, -1) };
  const labels = weeks.map((w) => dateLabel(w, lang));
  const qa = d.meta.quakeFrom ? weeks.findIndex((w) => w >= d.meta.quakeFrom!.slice(0, 10)) - 1 : -1;
  const option = useMemo<EOption>(() => ({
    ...base(ct), xAxis: catAxis(ct, labels, { boundaryGap: false, axisLabel: { color: ct.text3, fontSize: 10, interval: 12 } }), yAxis: valueAxis(ct, (x: number) => num(x, lang)),
    tooltip: axisTip(ct, (k) => tipHead(`${t(L("Semana del", "Week of"))} ${labels[k]}`) + tipRow(ct.series[0], t(L("Unidades", "Units")), num(s.weekly[k], lang))),
    series: [{ type: "line", data: s.weekly, lineStyle: { width: 2, color: ct.series[0] }, itemStyle: { color: ct.series[0] }, symbol: "none", areaStyle: { color: ct.band },
      ...(qa > 0 ? { markArea: { silent: true, itemStyle: { color: ct.neutralSoft, opacity: 0.5 }, label: { color: ct.text3, fontSize: 10, formatter: t(L("Terremoto (simulado)", "Earthquake (simulated)")) }, data: [[{ xAxis: qa }, { xAxis: qa + 2 }]] } } : {}) }],
  }), [s, labels, ct, lang, t, qa]);
  const full = s.weekly; const first = full.slice(0, 8).reduce((a, x) => a + x, 0) / 8, lastv = full.slice(-8).reduce((a, x) => a + x, 0) / 8;
  return (
    <ChartCard id="chart-trend" title={L("Demanda semanal", "Weekly demand")} subtitle={L("Unidades por semana (lunes)", "Units per week (Monday)")} filters={[L("Familia", "Family"), L("Tienda", "Store")]} source={SRC}
      explain={{
        measures: L("Suma semanal de unidades vendidas para la familia y tienda elegidas; se excluyen la primera y la última semana porque están incompletas.", "Weekly sum of units sold for the chosen family and store; the first and last weeks are excluded because they are incomplete."),
        observed: bi((l) => l === "es" ? `Las últimas 8 semanas completas promedian ${num(lastv, l)} unidades vs ${num(first, l)} en las primeras 8 (${signedPct(lastv / first - 1, l)}). La franja marca la ventana del terremoto de abril 2016 simulado por el generador.` : `The last 8 full weeks average ${num(lastv, l)} units vs ${num(first, l)} in the first 8 (${signedPct(lastv / first - 1, l)}). The band marks the April 2016 earthquake window simulated by the generator.`),
        implications: L("La tendencia y los shocks puntuales justifican un modelo que actualice su nivel continuamente.", "Trend and one-off shocks justify a model that keeps updating its level."),
        decisions: L("Excluir o marcar semanas de shock al entrenar.", "Exclude or flag shock weeks when training."),
        limits: L("Datos sintéticos.", "Synthetic data."),
      }}>
      <EChart option={option} height={300} label={t(L("Demanda semanal", "Weekly demand"))} />
    </ChartCard>
  );
}

function CalendarChart({ c, sel: s }: { c: Ctx; sel: ReturnType<typeof sel> }) {
  const { d, ct, lang, t } = c;
  const days = WEEKDAYS[lang];
  const v = s.prof.dow.map((x, i) => x / d.days.dow[i]);
  const extra = [s.prof.pay / d.days.pay, s.prof.hol / d.days.hol];
  const avg = s.prof.all / d.days.all;
  const labels = [...days, t(L("Día de pago", "Payday")), t(L("Feriado", "Holiday"))];
  const vals = [...v, ...extra];
  const option = useMemo<EOption>(() => ({
    ...base(ct), xAxis: catAxis(ct, labels), yAxis: valueAxis(ct, (x: number) => num(x, lang)),
    tooltip: axisTip(ct, (k) => tipHead(labels[k]) + tipRow(ct.series[0], t(L("Unidades por día", "Units per day")), num(vals[k], lang)) + tipNote(`${signedPct(vals[k] / avg - 1, lang)} ${t(L("vs promedio", "vs average"))}`), true),
    series: [{ type: "bar", data: vals.map((x, k) => ({ value: x, itemStyle: barStyle(k >= 7 ? ct.series[2] : k >= 5 ? ct.series[1] : ct.series[0]) })), barMaxWidth: 30,
      markLine: { symbol: "none", silent: true, lineStyle: { color: ct.text3, type: "dashed" }, label: { formatter: t(L("Promedio", "Average")), position: "insideEndTop", color: ct.text3, fontSize: 10 }, data: [{ yAxis: avg }] } }],
  }), [vals, labels, avg, ct, lang, t]);
  return (
    <ChartCard id="chart-calendar" title={L("Efectos de calendario", "Calendar effects")} subtitle={L("Unidades promedio por día según día de la semana, día de pago y feriado", "Average units per day by weekday, payday and holiday")} filters={[L("Familia", "Family"), L("Tienda", "Store")]} source={SRC}
      table={{ columns: [t(L("Tipo de día", "Day type")), t(L("Unidades/día", "Units/day")), t(L("vs promedio", "vs average"))], rows: labels.map((x, k) => [x, num(vals[k], lang), signedPct(vals[k] / avg - 1, lang)]) }}
      explain={{
        measures: L("Unidades totales en cada tipo de día divididas por el número de días de ese tipo.", "Total units on each day type divided by the number of such days."),
        observed: bi((l) => l === "es" ? `Fin de semana: ${num(v[5], l)} y ${num(v[6], l)} unidades/día vs ${num(avg, l)} de promedio; días de pago ${signedPct(extra[0] / avg - 1, l)}, feriados ${signedPct(extra[1] / avg - 1, l)}.` : `Weekend: ${num(v[5], l)} and ${num(v[6], l)} units/day vs ${num(avg, l)} average; paydays ${signedPct(extra[0] / avg - 1, l)}, holidays ${signedPct(extra[1] / avg - 1, l)}.`),
        implications: L("El calendario se conoce de antemano: es información válida para el pronóstico, sin fuga.", "The calendar is known in advance: valid forecast information, no leakage."),
        decisions: L("Incluir día de la semana, pago y feriados como variables del modelo.", "Include weekday, payday and holidays as model features."),
        limits: L("Feriados = 17 días; patrones del generador sintético.", "Holidays = 17 days; synthetic generator patterns."),
      }}>
      <EChart option={option} height={300} label={t(L("Efectos de calendario", "Calendar effects"))} />
    </ChartCard>
  );
}

function HeatChart({ c }: { c: Ctx }) {
  const { d, ct, lang, t, famName } = c;
  const stores = d.stores.map((s) => `${s.id} · ${s.city}`);
  const data: [number, number, number][] = [];
  d.families.forEach((f, fi) => d.stores.forEach((s, si) => data.push([si, fi, d.profile[f][String(s.id)]?.all ?? 0])));
  const max = Math.max(...data.map((x) => x[2]));
  const fams = d.families.map(famName);
  const option = useMemo<EOption>(() => ({
    ...base(ct), grid: { left: 8, right: 16, top: 8, bottom: 40, containLabel: true },
    xAxis: catAxis(ct, stores, { axisLabel: { color: ct.text3, fontSize: 10.5 } }), yAxis: catAxis(ct, fams, { inverse: true }),
    visualMap: { min: 0, max, show: false, inRange: { color: ct.seq } },
    tooltip: { ...base(ct).tooltip, trigger: "item", formatter: (p: any) => tipHead(`${fams[p.value[1]]} · ${stores[p.value[0]]}`) + tipRow(ct.series[0], t(L("Unidades", "Units")), num(p.value[2], lang)) },
    series: [{ type: "heatmap", data: data.map((x) => ({ value: x, label: { color: x[2] > max * 0.55 ? "#fff" : ct.text } })), itemStyle: { borderColor: ct.surface, borderWidth: 2, borderRadius: 3 },
      label: { show: true, fontSize: 10, formatter: (p: any) => num(p.value[2] / 1000, lang, 0) + "k" }, emphasis: { itemStyle: { borderColor: ct.text, borderWidth: 1 } } }],
  }), [data, stores, fams, max, ct, lang, t]);
  const byStore = d.stores.map((s) => d.families.reduce((a, f) => a + (d.profile[f][String(s.id)]?.all ?? 0), 0));
  const top = byStore.indexOf(Math.max(...byStore)), low = byStore.indexOf(Math.min(...byStore));
  return (
    <ChartCard id="chart-heat" title={L("¿Dónde se vende? Familia × tienda", "Where does it sell? Family × store")} subtitle={L("Unidades totales del período (miles)", "Total units over the period (thousands)")} filters={[L("Sin filtros (vista completa)", "No filters (full view)")]} source={SRC}
      table={{ columns: [t(L("Familia", "Family")), ...stores], rows: d.families.map((f, fi) => [fams[fi], ...d.stores.map((s) => num(d.profile[f][String(s.id)]?.all ?? 0, lang))]) }}
      explain={{
        measures: L("Unidades vendidas por familia y tienda en todo el período; color más oscuro = más unidades.", "Units sold per family and store over the whole period; darker = more units."),
        observed: bi((l) => l === "es" ? `La tienda ${stores[top]} vende ${num(byStore[top] / byStore[low], l, 1)} veces más que ${stores[low]}. ${fams[0]} y ${fams[1]} dominan en todas las tiendas.` : `Store ${stores[top]} sells ${num(byStore[top] / byStore[low], l, 1)} times more than ${stores[low]}. ${fams[0]} and ${fams[1]} dominate in every store.`),
        implications: L("La escala difiere mucho entre series: por eso se reporta WMAPE por serie y no un total en unidades mezcladas.", "Scale differs widely across series: hence per-series WMAPE rather than a mixed-unit total."),
        decisions: L("Priorizar el piloto en las combinaciones de mayor volumen.", "Prioritise the pilot in the highest-volume combinations."),
        limits: L("Datos sintéticos.", "Synthetic data."),
      }}>
      <EChart option={option} height={340} label={t(L("Unidades por familia y tienda", "Units by family and store"))} />
    </ChartCard>
  );
}

function BacktestChart({ c }: { c: Ctx }) {
  const { d, ct, lang, t } = c;
  const [metric, setMetric] = useState<"bev" | "macro">("bev");
  const folds = [1, 2, 3, 4, 5];
  const labels = folds.map((f) => { const o = d.backtest.find((x) => x.fold === f)!; return `${f === 5 ? t(L("Prueba", "Holdout")) : `${t(L("Corte", "Cut"))} ${f}`} · ${dateLabel(o.origin, lang).replace(/ 2016|, 2016/, "")}`; });
  const option = useMemo<EOption>(() => ({
    ...base(ct), legend: legend(ct), xAxis: catAxis(ct, labels, { axisLabel: { color: ct.text3, fontSize: 10, interval: 0 } }), yAxis: valueAxis(ct, (x: number) => pct(x, lang, 0), { min: 0 }),
    tooltip: axisTip(ct, (k) => tipHead(labels[k]) + Object.keys(MODELS).map((m) => tipRow(MODELS[m].color(ct), t(MODELS[m].label), pct(d.backtest.find((x) => x.fold === folds[k] && x.model === m)![metric], lang))).join(""), true),
    series: Object.keys(MODELS).map((m) => ({ name: t(MODELS[m].label), type: "bar", data: folds.map((f) => d.backtest.find((x) => x.fold === f && x.model === m)![metric]), itemStyle: barStyle(MODELS[m].color(ct)), barMaxWidth: 16 })),
  }), [labels, metric, ct, lang, t, d]);
  const wins = folds.filter((f) => { const r = d.backtest.filter((x) => x.fold === f); return r.reduce((a, b) => (b[metric] < a[metric] ? b : a)).model === "lightgbm_recursive"; }).length;
  return (
    <ChartCard id="chart-backtest" title={L("Selección de modelo: error por corte", "Model selection: error by cut-off")} subtitle={metric === "bev" ? L("WMAPE de bebidas en la tienda 1 (serie agregada)", "WMAPE for store-1 beverages (aggregate series)") : L("WMAPE medio por SKU-tienda (360 series)", "Mean SKU-store WMAPE (360 series)")}
      actions={<Segmented label={t(L("Métrica", "Metric"))} value={metric} onChange={setMetric} options={[{ value: "bev", label: t(L("Bebidas T1", "Beverages S1")) }, { value: "macro", label: "SKU-store" }]} />}
      filters={[L("Métrica de error", "Error metric")]} source={SRC}
      table={{ columns: [t(L("Corte", "Cut-off")), ...Object.keys(MODELS).map((m) => t(MODELS[m].label))], rows: folds.map((f, k) => [labels[k], ...Object.keys(MODELS).map((m) => pct(d.backtest.find((x) => x.fold === f && x.model === m)![metric], lang))]) }}
      explain={{
        measures: L("Cada corte entrena con datos anteriores y pronostica 15 días; los cortes 1–4 eligen el modelo y el 5 es la prueba final reservada.", "Each cut-off trains on earlier data and forecasts 15 days; cut-offs 1–4 choose the model and 5 is the reserved final holdout."),
        observed: bi((l) => l === "es" ? `LightGBM tiene el menor error en ${wins} de 5 cortes. ${metric === "macro" ? "Con la métrica por SKU-tienda todos superan 100%: la demanda intermitente domina." : "En la serie agregada de bebidas la ventaja es clara y estable."}` : `LightGBM has the lowest error at ${wins} of 5 cut-offs. ${metric === "macro" ? "With the SKU-store metric all exceed 100%: intermittent demand dominates." : "On the aggregate beverages series the advantage is clear and stable."}`),
        implications: L("El modelo es mejor de forma consistente, pero el nivel de error por SKU impide automatizar sin segmentar.", "The model is consistently better, but SKU-level error prevents automating without segmenting."),
        decisions: L("Pilotear en sombra en series agregadas o de alta rotación.", "Shadow-pilot on aggregate or high-turnover series."),
        limits: L("Cortes de 15 días; datos sintéticos.", "15-day cut-offs; synthetic data."),
      }}>
      <EChart option={option} height={320} label={t(L("Error por corte y modelo", "Error by cut-off and model"))} />
    </ChartCard>
  );
}

function ForecastChart({ c }: { c: Ctx }) {
  const { d, ct, lang, t } = c;
  const [fold, setFold] = useState("5");
  const p = d.predictions[fold];
  const labels = p.dates.map((x) => dateLabel(x, lang).replace(/ 2016|, 2016/, ""));
  const option = useMemo<EOption>(() => ({
    ...base(ct), legend: legend(ct), xAxis: catAxis(ct, labels, { boundaryGap: false }), yAxis: valueAxis(ct, (x: number) => num(x, lang)),
    tooltip: axisTip(ct, (k) => tipHead(dateLabel(p.dates[k], lang)) + tipRow(ct.text2, t(L("Real", "Actual")), num(p.actual[k], lang)) + Object.keys(MODELS).map((m) => tipRow(MODELS[m].color(ct), t(MODELS[m].label), num(p[m][k], lang))).join("")),
    series: [
      { name: t(L("Real", "Actual")), type: "line", data: p.actual, lineStyle: { width: 2.5, color: ct.text2 }, itemStyle: { color: ct.text2 }, symbolSize: 5 },
      ...Object.keys(MODELS).map((m) => ({ name: t(MODELS[m].label), type: "line", data: p[m], lineStyle: { width: m === "lightgbm_recursive" ? 2 : 1.5, type: m === "seasonal_naive" ? "dashed" : "solid", color: MODELS[m].color(ct) }, itemStyle: { color: MODELS[m].color(ct) }, symbol: "none" })),
    ],
  }), [p, labels, ct, lang, t]);
  const err = (m: string) => p[m].reduce((a, x, k) => a + Math.abs(x - p.actual[k]), 0) / p.actual.reduce((a, x) => a + x, 0);
  return (
    <ChartCard id="chart-forecast" title={L("Pronóstico vs real · bebidas, tienda 1", "Forecast vs actual · beverages, store 1")} subtitle={L("15 días por corte, sin información futura", "15 days per cut-off, no future information")}
      actions={<div className="w-36"><Select label={t(L("Corte", "Cut-off"))} value={fold} onChange={(e) => setFold(e.target.value)}>{["1", "2", "3", "4", "5"].map((f) => <option key={f} value={f}>{f === "5" ? t(L("5 · prueba final", "5 · final holdout")) : `${t(L("Corte", "Cut"))} ${f}`}</option>)}</Select></div>}
      filters={[L("Corte", "Cut-off")]} source={SRC}
      table={{ columns: [t(L("Fecha", "Date")), t(L("Real", "Actual")), ...Object.keys(MODELS).map((m) => t(MODELS[m].label))], rows: p.dates.map((x, k) => [dateLabel(x, lang), num(p.actual[k], lang), ...Object.keys(MODELS).map((m) => num(p[m][k], lang))]) }}
      explain={{
        measures: L("Unidades diarias reales de bebidas en la tienda 1 frente a los tres pronósticos del corte elegido.", "Actual daily beverage units in store 1 vs the three forecasts for the chosen cut-off."),
        observed: bi((l) => l === "es" ? `En este corte: LightGBM ${pct(err("lightgbm_recursive"), l)}, media 8 semanas ${pct(err("weekday_mean_8w"), l)}, ingenuo ${pct(err("seasonal_naive"), l)} de WMAPE. LightGBM sigue el patrón semanal sin copiar picos de la semana anterior.` : `This cut-off: LightGBM ${pct(err("lightgbm_recursive"), l)}, 8-week mean ${pct(err("weekday_mean_8w"), l)}, naive ${pct(err("seasonal_naive"), l)} WMAPE. LightGBM follows the weekly pattern without copying last week's spikes.`),
        implications: L("Un pronóstico más suave reduce pedidos excesivos después de días atípicos.", "A smoother forecast reduces excessive orders after atypical days."),
        decisions: L("Comparar en sombra cuántas órdenes habría cambiado cada modelo.", "Compare in shadow how many orders each model would have changed."),
        limits: L("Una serie agregada; los SKU individuales son más ruidosos.", "One aggregate series; individual SKUs are noisier."),
      }}>
      <EChart option={option} height={320} label={t(L("Pronóstico vs real", "Forecast vs actual"))} />
    </ChartCard>
  );
}

function AbcChart({ c }: { c: Ctx }) {
  const { d, ct, lang, t, famName } = c;
  const colors: Record<string, string> = { A: ct.series[0], B: ct.series[3], C: ct.neutral };
  const option = useMemo<EOption>(() => ({
    ...base(ct), legend: legend(ct, { data: ["A", "B", "C"] }),
    xAxis: catAxis(ct, d.abc.items, { axisLabel: { show: false }, name: t(L("60 productos ordenados por unidades", "60 products ranked by units")), nameLocation: "middle", nameGap: 12 }), yAxis: valueAxis(ct, (x: number) => num(x, lang)),
    grid: { left: 8, right: 16, top: 32, bottom: 24, containLabel: true },
    tooltip: axisTip(ct, (k) => tipHead(`${t(L("Producto", "Item"))} ${d.abc.items[k]} · ${famName(d.abc.family[k])}`) + tipRow(colors[d.abc.cls[k]], t(L("Unidades", "Units")), num(d.abc.units[k], lang)) + tipRow(ct.text3, t(L("Acumulado", "Cumulative")), pct(d.abc.cum[k], lang)) + tipNote(`${t(L("Clase", "Class"))} ${d.abc.cls[k]} · ${d.abc.perishable[k] ? t(L("perecible", "perishable")) : t(L("no perecible", "non-perishable"))}`), true),
    series: ["A", "B", "C"].map((k) => ({ name: k, type: "bar", stack: "abc", data: d.abc.units.map((u, i) => (d.abc.cls[i] === k ? u : null)), itemStyle: barStyle(colors[k]), barMaxWidth: 14 })),
  }), [d, ct, lang, t, famName, colors]);
  const nA = d.abc.cls.filter((x) => x === "A").length, perA = d.abc.perishable.filter((p, i) => p && d.abc.cls[i] === "A").length;
  return (
    <ChartCard id="chart-abc" title={L("Prioridad de productos: Pareto ABC", "Product priority: ABC Pareto")} subtitle={L("Unidades por producto, coloreadas por clase", "Units per product, coloured by class")} filters={[L("Todas las tiendas", "All stores")]} source={SRC}
      table={{ columns: [t(L("Producto", "Item")), t(L("Familia", "Family")), t(L("Unidades", "Units")), t(L("Acumulado", "Cumulative")), t(L("Clase", "Class"))], rows: d.abc.items.map((x, k) => [x, famName(d.abc.family[k]), num(d.abc.units[k], lang), pct(d.abc.cum[k], lang), d.abc.cls[k]]) }}
      explain={{
        measures: L("Unidades totales de cada uno de los 60 productos, de mayor a menor; A = hasta 80% acumulado, B = hasta 95%, C = resto.", "Total units for each of the 60 products, largest first; A = up to 80% cumulative, B = up to 95%, C = the rest."),
        observed: bi((l) => l === "es" ? `${nA} productos son clase A; ${perA} de ellos son perecibles, donde un error de pronóstico se convierte en merma.` : `${nA} products are class A; ${perA} of them are perishable, where forecast error turns into waste.`),
        implications: L("El piloto debe empezar por los productos A no perecibles (menor riesgo) y luego A perecibles (mayor valor).", "The pilot should start with non-perishable A items (lower risk) and then perishable A items (higher value)."),
        decisions: L("Definir el orden del piloto por clase y perecibilidad.", "Set the pilot order by class and perishability."),
        limits: L("Volumen en unidades, no en valor.", "Volume in units, not value."),
      }}>
      <EChart option={option} height={300} label={t(L("Pareto ABC", "ABC Pareto"))} />
    </ChartCard>
  );
}
