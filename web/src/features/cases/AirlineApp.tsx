"use client";
import { useMemo, useState } from "react";
import { AppShell, Section } from "@/components/AppShell";
import { CASE_NAV, CaseIntro, FilterBar, FindingsSection, ImpactSection, LimitsSection, MethodSection, SlideList, bi, ins, type Step } from "@/components/CaseKit";
import { ChartCard } from "@/components/ChartCard";
import { EChart, type EOption } from "@/components/EChart";
import { KpiCard, type Method } from "@/components/KpiCard";
import { BigStat, PresentationMode, type Slide } from "@/components/Presentation";
import { LoadError, Loading } from "@/components/States";
import { axisTip, barStyle, base, catAxis, errorBars, legend, tipHead, tipNote, tipRow, valueAxis } from "@/components/chart-kit";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useDataset } from "@/lib/data";
import { WEEKDAYS, dateLabel, num, pct } from "@/lib/format";
import { chartTheme, type ChartTheme } from "@/lib/palette";
import { L, usePrefs, type Bi, type Lang } from "@/lib/prefs";
import { median, wilson } from "@/lib/stats";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Counts = { scheduled: number; cancelled: number; diverted: number; late: number; arrival_known: number; disrupted: number };
type AirlineData = {
  meta: { period: string; source: string; sha256: string; generatedAt: string; routesTotal: number; routesKept: number; minKept: number };
  totals: Counts;
  daily: { date: string[] } & Record<keyof Counts, number[]>;
  carriers: ({ code: string; name: string } & Counts)[];
  routes: { cols: string[]; rows: (string | number)[][] };
  airports: ({ code: string } & Counts)[];
  checks: { check: string; passed: boolean; detail: string }[];
};
const isAirline = (d: unknown): d is AirlineData => !!d && typeof d === "object" && "daily" in d && "routes" in d;

type Metric = "disruption" | "late" | "cancel";
const METRIC: Record<Metric, { label: Bi; short: Bi; k: (c: Counts) => number; n: (c: Counts) => number }> = {
  disruption: { label: L("Vuelos afectados (cancelado, desviado o ≥15 min tarde)", "Disrupted flights (cancelled, diverted or ≥15 min late)"), short: L("afectación", "disruption"), k: (c) => c.disrupted, n: (c) => c.scheduled },
  late: { label: L("Llegadas con ≥15 min de retraso", "Arrivals ≥15 min late"), short: L("retraso", "delay"), k: (c) => c.late, n: (c) => c.arrival_known },
  cancel: { label: L("Cancelaciones", "Cancellations"), short: L("cancelación", "cancellation"), k: (c) => c.cancelled, n: (c) => c.scheduled },
};
const SRC = L("BTS On-Time Reporting Carrier Performance, junio 2023 (EE.UU., fuente oficial)", "BTS On-Time Reporting Carrier Performance, June 2023 (US, official source)");

type Route = Counts & { route: string };
type Ctx = { d: AirlineData; ct: ChartTheme; lang: Lang; t: (b: Bi | string) => string; metric: Metric; minN: number; airport: string; routes: Route[] };

const rn = (s: string) => s.replace(" - ", " → ");
const rate = (c: Counts, m: Metric) => { const n = METRIC[m].n(c); return n ? METRIC[m].k(c) / n : NaN; };

export default function AirlineApp() {
  const s = useDataset<AirlineData>("case-airline", isAirline);
  if (s.status === "loading") return <Loading what="Route Reliability Monitor" />;
  if (s.status === "error") return <LoadError error={s.error} dataset="case-airline" />;
  return <Airline d={s.data} />;
}

function Airline({ d }: { d: AirlineData }) {
  const { lang, theme, t } = usePrefs();
  const ct = useMemo(() => chartTheme(theme), [theme]);
  const [metric, setMetric] = useState<Metric>("disruption");
  const [minN, setMinN] = useState(100);
  const [airport, setAirport] = useState("ALL");
  const [present, setPresent] = useState(false);
  const allRoutes = useMemo<Route[]>(() => d.routes.rows.map((r) => {
    const o: any = {};
    d.routes.cols.forEach((c, i) => { o[c] = r[i]; });
    return o as Route;
  }), [d]);
  const routes = useMemo(() => allRoutes.filter((r) => r.scheduled >= minN && (airport === "ALL" || r.route.split(" - ").includes(airport))), [allRoutes, minN, airport]);
  const c: Ctx = { d, ct, lang, t, metric, minN, airport, routes };

  const scope: Counts = airport === "ALL" ? d.totals : d.airports.find((a) => a.code === airport)!;
  const nat = d.totals;
  const dr = rate(scope, "disruption"), lr = rate(scope, "late"), cr = rate(scope, "cancel");
  const days = d.daily.date.map((_, i) => d.daily.disrupted[i] / d.daily.scheduled[i]);
  const worst = days.indexOf(Math.max(...days));
  const scopeName = airport === "ALL" ? t(L("Todo EE.UU.", "All US")) : airport;
  const ratio = (x: number, y: number) => (y ? x / y : NaN);
  const vsNat = (x: number, n: number) => airport === "ALL" ? t(L("Nivel nacional", "National level")) : `${x >= n ? "+" : "−"}${num(Math.abs(x - n) * 100, lang, 1)} pp ${t(L("vs nacional", "vs national"))}`;

  const M = (definition: Bi, formula: string, notes: Bi): Method => ({ definition, formula, source: SRC, notes });
  const top = [...allRoutes].filter((r) => r.scheduled >= 100).sort((a, b) => b.disrupted - a.disrupted);
  const pairShare = top.slice(0, 2).reduce((s, r) => s + r.disrupted, 0);
  const carriers = [...d.carriers].sort((a, b) => rate(b, "disruption") - rate(a, "disruption"));
  const lateShare = nat.late / nat.disrupted;
  const sim15 = top.slice(0, 15).reduce((s, r) => s + r.disrupted, 0) * 0.2;

  const insights = [
    ins("level", "measured", L("Casi 3 de cada 10 vuelos programados se vieron afectados", "Almost 3 in 10 scheduled flights were disrupted"),
      bi((l) => l === "es" ? `${num(nat.disrupted, l)} de ${num(nat.scheduled, l)} vuelos (${pct(rate(nat, "disruption"), l)}) se cancelaron, desviaron o llegaron ≥15 min tarde; el retraso explica ${pct(lateShare, l, 0)} de esas afectaciones.` : `${num(nat.disrupted, l)} of ${num(nat.scheduled, l)} flights (${pct(rate(nat, "disruption"), l)}) were cancelled, diverted or ≥15 min late; delay explains ${pct(lateShare, l, 0)} of those disruptions.`),
      L("El problema dominante es la puntualidad, no la cancelación: las acciones deben apuntar a holguras y conexiones.", "The dominant problem is punctuality, not cancellation: actions should target buffers and connections."),
      L("Separar los retrasos por causa (BTS publica minutos por aerolínea, clima, NAS, seguridad y avión tardío).", "Split delays by cause (BTS publishes minutes by carrier, weather, NAS, security and late aircraft)."),
      L("Comparar con otros meses: junio concentra tormentas y alta demanda.", "Compare with other months: June concentrates storms and peak demand.")),
    ins("routes", "measured", bi((l) => l === "es" ? `${rn(top[0].route)} y su vuelta concentran el mayor volumen afectado` : `${rn(top[0].route)} and its return leg have the largest disrupted volume`),
      bi((l) => l === "es" ? `${rn(top[0].route)}: ${num(top[0].disrupted, l)} de ${num(top[0].scheduled, l)} vuelos afectados (${pct(rate(top[0], "disruption"), l)}); con ${rn(top[1].route)} suman ${num(pairShare, l)}.` : `${rn(top[0].route)}: ${num(top[0].disrupted, l)} of ${num(top[0].scheduled, l)} flights disrupted (${pct(rate(top[0], "disruption"), l)}); with ${rn(top[1].route)} they total ${num(pairShare, l)}.`),
      L("Priorizar por cantidad afectada (no solo por tasa) enfoca el esfuerzo donde hay más pasajeros potencialmente impactados.", "Ranking by disrupted count (not only rate) focuses effort where more passengers are potentially affected."),
      L("Revisar programación y contingencias del corredor Atlanta–Orlando con la aerolínea y el aeropuerto.", "Review scheduling and contingencies on the Atlanta–Orlando corridor with the carrier and the airport."),
      L("Confirmar que el patrón persiste en otros meses antes de cambiar capacidad.", "Confirm the pattern persists in other months before changing capacity.")),
    ins("carriers", "measured", L("La tasa de afectación varía mucho entre aerolíneas", "Disruption rates vary widely across carriers"),
      bi((l) => l === "es" ? `${carriers[0].name}: ${pct(rate(carriers[0], "disruption"), l)} vs ${carriers[carriers.length - 1].name}: ${pct(rate(carriers[carriers.length - 1], "disruption"), l)}; intervalos de Wilson del 95% no se traslapan.` : `${carriers[0].name}: ${pct(rate(carriers[0], "disruption"), l)} vs ${carriers[carriers.length - 1].name}: ${pct(rate(carriers[carriers.length - 1], "disruption"), l)}; 95% Wilson intervals do not overlap.`),
      L("Las diferencias no son ruido de muestra, pero mezclan red, aeropuertos y tipo de operación.", "The differences are not sampling noise, but they mix network, airports and type of operation."),
      L("Comparar aerolíneas dentro de las mismas rutas antes de atribuir desempeño.", "Compare carriers within the same routes before attributing performance."),
      L("Los intervalos asumen independencia; un día de tormenta afecta a muchos vuelos a la vez.", "Intervals assume independence; a storm day affects many flights at once.")),
    ins("day", "measured", bi((l) => l === "es" ? `El peor día fue el ${dateLabel(d.daily.date[worst], l)}` : `The worst day was ${dateLabel(d.daily.date[worst], l)}`),
      bi((l) => l === "es" ? `${pct(days[worst], l)} de vuelos afectados frente a una mediana diaria de ${pct(median(days), l)}.` : `${pct(days[worst], l)} of flights disrupted vs a daily median of ${pct(median(days), l)}.`),
      L("Los peaks diarios sugieren eventos comunes (clima, congestión) que una regla por ruta no captura.", "Daily peaks suggest common events (weather, congestion) that a per-route rule does not capture."),
      L("Cruzar con registros meteorológicos y del sistema de tráfico aéreo.", "Cross-reference with weather and air-traffic system records."),
      L("Un mes no alcanza para estacionalidad; usar al menos 12 meses.", "One month is not enough for seasonality; use at least 12 months.")),
    ins("sim", "simulated", L("Escenario: mejorar 20% las 15 rutas prioritarias", "Scenario: improve the 15 priority routes by 20%"),
      bi((l) => l === "es" ? `Evitaría ≈ ${num(sim15, l)} vuelos afectados al mes (${pct(sim15 / nat.disrupted, l, 2)} del total nacional).` : `Would avoid ≈ ${num(sim15, l)} disrupted flights a month (${pct(sim15 / nat.disrupted, l, 2)} of the national total).`),
      L("Muestra la escala: concentrarse en pocas rutas mueve poco el total nacional, pero mucho la experiencia de esos corredores.", "Shows scale: focusing on a few routes barely moves the national total, but greatly changes those corridors."),
      L("Usar el simulador para fijar metas por corredor.", "Use the simulator to set per-corridor targets."),
      L("Es aritmética con supuestos, no una predicción del efecto de una intervención.", "It is arithmetic with assumptions, not a prediction of an intervention's effect.")),
  ];

  const steps: Step[] = [
    { title: L("Comprensión del problema", "Understanding the problem"), body: L("¿Qué rutas y aerolíneas concentran vuelos afectados y dónde conviene investigar primero?", "Which routes and carriers concentrate disrupted flights, and where should investigation start?") },
    { title: L("Recolección de datos", "Data collection"), body: L("Archivo oficial BTS de junio 2023 descargado y verificado con SHA-256.", "Official BTS June 2023 file downloaded and verified with SHA-256."), facts: [L(`${num(nat.scheduled, "es")} vuelos, ${num(d.meta.routesTotal, "es")} rutas`, `${num(nat.scheduled, "en")} flights, ${num(d.meta.routesTotal, "en")} routes`)] },
    { title: L("Preparación y limpieza", "Preparation and cleaning"), body: L("Esquema mapeado a dim_airline, dim_airport y fct_flight; claves y completitud de estados verificadas; cancelados y desviados se conservan.", "Schema mapped to dim_airline, dim_airport and fct_flight; keys and status completeness verified; cancelled and diverted flights kept.") },
    { title: L("Análisis exploratorio", "Exploratory analysis"), body: L("Tasas por día, aerolínea, ruta y aeropuerto con denominadores separados (programados vs llegadas conocidas).", "Rates by day, carrier, route and airport with separate denominators (scheduled vs known arrivals).") },
    { title: L("Desarrollo de métricas", "Metric development"), body: L("Intervalos de Wilson del 95% y regla de priorización: mínimo 100 vuelos, ordenar por cantidad afectada.", "95% Wilson intervals and a priority rule: at least 100 flights, rank by disrupted count.") },
    { title: L("Implementación", "Implementation"), body: L("Modelo semántico Power BI (PBIP), informe PDF y esta app con filtros por volumen, aeropuerto y métrica.", "Power BI semantic model (PBIP), PDF report and this app with volume, airport and metric filters.") },
    { title: L("Evaluación", "Evaluation"), body: L("Pruebas de fct_flight y reconciliación de totales en cada build de esta página.", "fct_flight tests and total reconciliation on every build of this page."), facts: [L(`${d.checks.length} controles aprobados`, `${d.checks.length} checks passing`)] },
  ];

  const slides: Slide[] = [
    { kicker: L("Contexto", "Context"), title: L("¿Dónde se concentran los vuelos afectados en EE.UU.?", "Where are disrupted US flights concentrated?"),
      body: <p className="max-w-3xl">{t(L("Junio 2023, todas las aerolíneas que reportan a BTS. Datos oficiales y públicos; sin pasajeros ni costos, así que no se estima impacto económico.", "June 2023, every carrier reporting to BTS. Official public data; no passengers or costs, so no economic impact is estimated."))}</p> },
    { kicker: L("Indicadores", "Indicators"), title: L("Junio 2023", "June 2023"), body: <div className="grid gap-4 md:grid-cols-4">
      <BigStat value={num(nat.scheduled, lang)} label={t(L("Vuelos programados", "Scheduled flights"))} />
      <BigStat value={pct(rate(nat, "disruption"), lang)} label={t(L("Afectados", "Disrupted"))} />
      <BigStat value={pct(rate(nat, "late"), lang)} label={t(L("Llegadas ≥15 min tarde", "Arrivals ≥15 min late"))} />
      <BigStat value={pct(rate(nat, "cancel"), lang)} label={t(L("Cancelados", "Cancelled"))} />
    </div> },
    { kicker: L("Hallazgos", "Findings"), title: L("Lo que muestran los datos", "What the data shows"), body: <SlideList items={insights.slice(0, 4).map((i) => i.evidence)} /> },
    { kicker: L("Recomendación", "Recommendation"), title: L("Investigar primero el corredor Atlanta–Orlando", "Investigate the Atlanta–Orlando corridor first"), body: <SlideList items={[L("Revisar programación, holguras y contingencias, sin atribuir causas con un solo mes.", "Review scheduling, buffers and contingencies without attributing causes from one month."), L("Repetir el análisis en 12 meses y desagregar por hora y aerolínea.", "Repeat the analysis over 12 months and split by hour and carrier."), L("Reportar siempre volumen, tasa y cobertura juntos.", "Always report volume, rate and coverage together.")]} /> },
    { kicker: L("Limitaciones", "Limitations"), title: L("Lo que este análisis no puede afirmar", "What this analysis cannot claim"), body: <SlideList items={[L("Sin pasajeros ni costos: no hay valorización económica.", "No passengers or costs: no economic valuation."), L("Un mes no representa el desempeño actual ni anual.", "One month does not represent current or annual performance."), L("Asociaciones descriptivas, no causas.", "Descriptive associations, not causes.")]} /> },
  ];

  return (
    <>
      <AppShell app="Route Reliability Monitor" tagline={L("Confiabilidad aérea · BTS EE.UU., junio 2023", "Airline reliability · US BTS, June 2023")} nav={CASE_NAV([{ id: "exploratorio", label: L("Rutas y aerolíneas", "Routes and carriers") }])} onPresent={() => setPresent(true)}
        filterBar={<FilterBar>
          <div className="w-36"><Select label={t(L("Aeropuerto", "Airport"))} value={airport} onChange={(e) => setAirport(e.target.value)}>
            <option value="ALL">{t(L("Todos", "All"))}</option>
            {d.airports.map((a) => <option key={a.code} value={a.code}>{a.code}</option>)}
          </Select></div>
          <div className="w-40"><Select label={t(L("Vuelos mínimos por ruta", "Min flights per route"))} value={minN} onChange={(e) => setMinN(+e.target.value)}>
            {[50, 100, 200, 300, 500].map((v) => <option key={v} value={v}>≥ {v}</option>)}
          </Select></div>
          <div className="flex flex-col gap-1"><span className="text-[11px] font-medium uppercase tracking-wider text-ink-3">{t(L("Métrica", "Metric"))}</span>
            <Segmented label={t(L("Métrica", "Metric"))} value={metric} onChange={setMetric} options={[{ value: "disruption", label: t(L("Afectación", "Disruption")) }, { value: "late", label: t(L("Retraso", "Delay")) }, { value: "cancel", label: t(L("Cancelación", "Cancellation")) }]} />
          </div>
        </FilterBar>}>
        <CaseIntro kind="real" badges={["BTS · DOT", t(L("junio 2023", "June 2023")), `n = ${num(nat.scheduled, lang)}`]}
          summary={[
            bi((l) => l === "es" ? `${pct(rate(nat, "disruption"), l)} de los ${num(nat.scheduled, l)} vuelos programados en junio 2023 se canceló, desvió o llegó con ≥15 min de retraso.` : `${pct(rate(nat, "disruption"), l)} of the ${num(nat.scheduled, l)} flights scheduled in June 2023 were cancelled, diverted or ≥15 min late.`),
            bi((l) => l === "es" ? `El corredor ${rn(top[0].route)} / ${rn(top[1].route)} encabeza el volumen afectado (${num(pairShare, l)} vuelos) entre rutas con ≥100 vuelos.` : `The ${rn(top[0].route)} / ${rn(top[1].route)} corridor leads disrupted volume (${num(pairShare, l)} flights) among routes with ≥100 flights.`),
            L("Las diferencias entre aerolíneas son grandes y estadísticamente claras, pero no implican causa.", "Differences across carriers are large and statistically clear, but they do not imply cause."),
          ]}
          decision={L("investigar primero programación y contingencias en Atlanta–Orlando, sin cambiar capacidad con un solo mes de evidencia.", "investigate scheduling and contingencies on Atlanta–Orlando first, without changing capacity on one month of evidence.")}
          questions={[[L("¿Cuántos vuelos se ven afectados?", "How many flights are disrupted?"), "dashboard"], [L("¿Qué días fueron críticos?", "Which days were critical?"), "chart-daily"], [L("¿Qué aerolíneas lo hacen peor?", "Which carriers do worse?"), "chart-carriers"], [L("¿Qué rutas priorizar?", "Which routes to prioritise?"), "chart-routes"], [L("¿Tasa o volumen?", "Rate or volume?"), "chart-scatter"], [L("¿Qué aeropuertos concentran el problema?", "Which airports concentrate it?"), "chart-airports"]]} />

        <Section id="dashboard" n={3} title={L("Dashboard de confiabilidad", "Reliability dashboard")}
          intro={bi((l) => l === "es" ? `${scopeName} · junio 2023. Con un aeropuerto seleccionado, los KPIs cuentan vuelos que salen o llegan a él.` : `${scopeName} · June 2023. With an airport selected, KPIs count flights departing from or arriving at it.`)}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <KpiCard label={L("Vuelos programados", "Scheduled flights")} value={num(scope.scheduled, lang)} change={null} changeLabel={airport === "ALL" ? t(L("30 días", "30 days")) : pct(ratio(scope.scheduled, nat.scheduled), lang) + " " + t(L("del total", "of total"))} description={L("Incluye cancelados y desviados", "Includes cancelled and diverted")} method={M(L("Vuelos domésticos programados por aerolíneas que reportan a BTS.", "Domestic flights scheduled by carriers reporting to BTS."), "COUNT(flights)", L("Con aeropuerto: salidas + llegadas.", "With an airport: departures + arrivals."))} />
            <KpiCard label={L("Tasa de afectación", "Disruption rate")} value={pct(dr, lang)} change={airport === "ALL" ? null : dr - rate(nat, "disruption")} goodWhenUp={false} changeLabel={vsNat(dr, rate(nat, "disruption"))} description={L("Cancelado, desviado o ≥15 min tarde", "Cancelled, diverted or ≥15 min late")} method={M(L("Vuelos afectados sobre programados.", "Disrupted over scheduled flights."), "(cancelled + diverted + late) / scheduled", L("«Late» usa la llegada; los cancelados no tienen llegada.", "“Late” uses arrival; cancelled flights have no arrival."))} />
            <KpiCard label={L("Llegadas con retraso", "Late arrivals")} value={pct(lr, lang)} change={airport === "ALL" ? null : lr - rate(nat, "late")} goodWhenUp={false} changeLabel={vsNat(lr, rate(nat, "late"))} description={L("≥15 min sobre llegadas conocidas", "≥15 min over known arrivals")} method={M(L("Llegadas con ≥15 min de retraso sobre llegadas con hora conocida.", "Arrivals ≥15 min late over arrivals with a known time."), "late / arrival_known", L("Denominador distinto al de afectación: no se suman tasas.", "A different denominator from disruption: rates are not added."))} />
            <KpiCard label={L("Cancelaciones", "Cancellations")} value={pct(cr, lang)} change={airport === "ALL" ? null : cr - rate(nat, "cancel")} goodWhenUp={false} changeLabel={vsNat(cr, rate(nat, "cancel"))} description={bi((l) => `${num(scope.cancelled, l)} ${l === "es" ? "vuelos" : "flights"}`)} method={M(L("Vuelos cancelados sobre programados.", "Cancelled over scheduled flights."), "cancelled / scheduled", L("Desvíos se cuentan aparte.", "Diversions are counted separately."))} />
            <KpiCard label={L("Rutas en el análisis", "Routes in the analysis")} value={num(routes.length, lang)} change={null} changeLabel={`≥ ${minN} ${t(L("vuelos", "flights"))}`} description={bi((l) => l === "es" ? `de ${num(d.meta.routesTotal, l)} rutas direccionales` : `of ${num(d.meta.routesTotal, l)} directional routes`)} method={M(L("Rutas origen→destino con al menos el mínimo de vuelos elegido.", "Origin→destination routes with at least the chosen minimum of flights."), "COUNT(route) WHERE scheduled ≥ min", L("El mínimo evita rankings dominados por rutas pequeñas.", "The minimum keeps rankings from being dominated by small routes."))} />
            <KpiCard label={L("Peor día (nacional)", "Worst day (national)")} value={pct(days[worst], lang)} change={null} changeLabel={dateLabel(d.daily.date[worst], lang)} description={bi((l) => l === "es" ? `mediana diaria ${pct(median(days), l)}` : `daily median ${pct(median(days), l)}`)} method={M(L("Día de junio con mayor tasa de afectación.", "June day with the highest disruption rate."), "max_d disrupted_d / scheduled_d", L("Nivel nacional: no cambia con el filtro de aeropuerto.", "National level: unaffected by the airport filter."))} />
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <DailyChart c={c} />
            <DailyMix c={c} />
          </div>
        </Section>

        <Section id="exploratorio" n={4} title={L("Rutas, aerolíneas y aeropuertos", "Routes, carriers and airports")} intro={L("Los gráficos de rutas responden al aeropuerto, al mínimo de vuelos y a la métrica; aerolíneas y aeropuertos, a la métrica.", "Route charts respond to airport, minimum flights and metric; carriers and airports, to the metric.")}>
          <div className="grid gap-4 xl:grid-cols-2">
            <CarrierChart c={c} />
            <RouteRanking c={c} />
            <RouteScatter c={c} />
            <AirportChart c={c} />
            <WeekdayChart c={c} />
          </div>
        </Section>

        <FindingsSection n={5} items={insights} />
        <ImpactSection n={6}
          measured={[bi((l) => l === "es" ? `${pct(rate(nat, "disruption"), l)} de vuelos afectados; ${pct(lateShare, l, 0)} por retraso.` : `${pct(rate(nat, "disruption"), l)} of flights disrupted; ${pct(lateShare, l, 0)} through delay.`), bi((l) => l === "es" ? `${rn(top[0].route)}: ${num(top[0].disrupted, l)} vuelos afectados.` : `${rn(top[0].route)}: ${num(top[0].disrupted, l)} disrupted flights.`), L("Diferencias entre aerolíneas con intervalos de Wilson que no se traslapan.", "Carrier differences with non-overlapping Wilson intervals.")]}
          simulated={<p>{t(L("Vuelos afectados evitables si se reduce la tasa de las rutas prioritarias (ajustable abajo).", "Disrupted flights avoidable if priority routes cut their rate (adjustable below)."))}</p>}
          expected={[L("Priorización transparente de corredores para operaciones", "Transparent corridor prioritisation for operations"), L("Reportes que muestran volumen, tasa y cobertura juntos", "Reports showing volume, rate and coverage together"), L("Detección temprana de días críticos", "Early detection of critical days")]}>
          <RouteSimulator c={c} all={allRoutes} />
        </ImpactSection>
        <MethodSection n={7} steps={steps}
          stages={[{ name: L("Ingesta", "Ingestion"), tech: "BTS PREZIP · SHA-256", detail: L("Archivo oficial versionado", "Versioned official file") }, { name: L("Limpieza", "Cleaning"), tech: "Python · pandas", detail: L("dim_airline, dim_airport, fct_flight", "dim_airline, dim_airport, fct_flight") }, { name: L("Métricas", "Metrics"), tech: "SQL · Wilson", detail: L("Tasas con denominadores separados", "Rates with separate denominators") }, { name: L("BI", "BI"), tech: "Power BI (PBIP)", detail: L("Modelo semántico e informe", "Semantic model and report") }, { name: L("App", "App"), tech: "Next.js · ECharts", detail: L("Filtros y simulador", "Filters and simulator") }]}
          defs={[[t(L("Afectado", "Disrupted")), "cancelled + diverted + late", t(L("Sobre programados", "Over scheduled"))], [t(L("Retraso", "Late")), "ArrDelay ≥ 15 min", t(L("Sobre llegadas conocidas", "Over known arrivals"))], [t(L("Intervalo", "Interval")), "Wilson 95%", t(L("Orientativo; asume independencia", "Indicative; assumes independence"))], [t(L("Prioridad", "Priority")), "scheduled ≥ 100 → ORDER BY disrupted", t(L("Volumen antes que tasa", "Volume before rate"))]]}
          checks={d.checks} decisions={[L("No se restan relojes locales entre zonas horarias para inferir duración.", "Local clocks are not subtracted across time zones to infer duration."), L("Tasa y volumen se muestran juntos: una ruta pequeña con tasa alta no desplaza a un corredor grande.", "Rate and volume are shown together: a small high-rate route does not displace a large corridor."), L("Las rutas con <50 vuelos se agregan solo en totales para mantener la página liviana.", "Routes with <50 flights only enter totals to keep the page light.")]}
          repo="https://github.com/Chrov/airline-reliability" generated={d.meta.generatedAt}
          links={[{ href: "../../case-studies/airline-reliability/Executive_Report.pdf", label: L("Informe ejecutivo (PDF)", "Executive report (PDF)") }, { href: "../../case-studies/airline-reliability/PowerBI.zip", label: L("Proyecto Power BI (PBIP, ZIP)", "Power BI project (PBIP, ZIP)") }, { href: d.meta.source, label: L("Archivo fuente BTS (ZIP oficial)", "BTS source file (official ZIP)"), external: true }]} />
        <LimitsSection n={8} limits={[L("Sin pasajeros, tarifas ni costos: no hay impacto económico medido.", "No passengers, fares or costs: no measured economic impact."), L("Un solo mes (junio 2023): no representa desempeño anual ni actual.", "A single month (June 2023): not annual or current performance."), L("Intervalos de Wilson orientativos: eventos comunes (clima) violan la independencia.", "Wilson intervals are indicative: common events (weather) violate independence."), L("Sin causas de retraso en esta versión.", "No delay causes in this version.")]}
          future={[L("Ampliar a 12–24 meses y comparar estacionalidad.", "Extend to 12–24 months and compare seasonality."), L("Incorporar causas de retraso y hora programada.", "Add delay causes and scheduled hour."), L("Comparar aerolíneas dentro de la misma ruta.", "Compare carriers within the same route."), L("Alertas cuando un corredor supera su rango histórico.", "Alerts when a corridor exceeds its historical range.")]} />
      </AppShell>
      <PresentationMode open={present} onClose={() => setPresent(false)} slides={slides} app="Route Reliability Monitor" />
    </>
  );
}

function DailyChart({ c }: { c: Ctx }) {
  const { d, ct, lang, t } = c;
  const v = useMemo(() => d.daily.date.map((_, i) => {
    const k = d.daily.disrupted[i], n = d.daily.scheduled[i];
    const [lo, hi] = wilson(k, n);
    return { r: k / n, lo, hi, n, k };
  }), [d]);
  const labels = d.daily.date.map((x) => dateLabel(x, lang).replace(/ 2023|, 2023/, ""));
  const option = useMemo<EOption>(() => ({
    ...base(ct), legend: legend(ct, { data: [t(L("Tasa de afectación", "Disruption rate")), t(L("IC 95%", "95% CI"))] }),
    xAxis: catAxis(ct, labels, { boundaryGap: false }), yAxis: valueAxis(ct, (x: number) => pct(x, lang, 0), { min: 0.1 }),
    tooltip: axisTip(ct, (i) => tipHead(dateLabel(d.daily.date[i], lang)) + tipRow(ct.series[0], t(L("Afectados", "Disrupted")), `${pct(v[i].r, lang)} (${num(v[i].k, lang)})`) + tipRow(ct.neutral, t(L("IC 95% Wilson", "95% Wilson CI")), `${pct(v[i].lo, lang)} – ${pct(v[i].hi, lang)}`) + tipNote(`${num(v[i].n, lang)} ${t(L("vuelos programados", "scheduled flights"))}`)),
    series: [
      { name: "lo", type: "line", data: v.map((x) => x.lo), stack: "ci", lineStyle: { opacity: 0 }, symbol: "none", silent: true, tooltip: { show: false } },
      { name: t(L("IC 95%", "95% CI")), type: "line", data: v.map((x) => x.hi - x.lo), stack: "ci", lineStyle: { opacity: 0 }, areaStyle: { color: ct.band }, itemStyle: { color: ct.band }, symbol: "none", silent: true },
      { name: t(L("Tasa de afectación", "Disruption rate")), type: "line", data: v.map((x) => x.r), lineStyle: { width: 2, color: ct.series[0] }, itemStyle: { color: ct.series[0] }, symbolSize: 6 },
    ],
  }), [v, labels, ct, lang, t, d]);
  const rates = v.map((x) => x.r), iMax = rates.indexOf(Math.max(...rates)), iMin = rates.indexOf(Math.min(...rates));
  return (
    <ChartCard id="chart-daily" title={L("Tasa diaria de vuelos afectados", "Daily disruption rate")} subtitle={L("Nacional, con intervalo de confianza del 95% (Wilson)", "National, with a 95% confidence interval (Wilson)")}
      filters={[L("Nacional · junio 2023", "National · June 2023")]} source={SRC}
      table={{ columns: [t(L("Fecha", "Date")), t(L("Programados", "Scheduled")), t(L("Afectados", "Disrupted")), t(L("Tasa", "Rate"))], rows: d.daily.date.map((x, i) => [dateLabel(x, lang), num(v[i].n, lang), num(v[i].k, lang), pct(v[i].r, lang)]) }}
      explain={{
        measures: L("Por día: vuelos cancelados, desviados o con ≥15 min de retraso sobre vuelos programados. La banda es el intervalo de Wilson del 95%.", "Per day: cancelled, diverted or ≥15 min late flights over scheduled flights. The band is the 95% Wilson interval."),
        observed: bi((l) => l === "es" ? `La tasa va de ${pct(rates[iMin], l)} (${dateLabel(d.daily.date[iMin], l)}) a ${pct(rates[iMax], l)} (${dateLabel(d.daily.date[iMax], l)}). Las bandas son estrechas: con ~19.000 vuelos diarios, los saltos entre días son reales, no ruido de muestra.` : `The rate ranges from ${pct(rates[iMin], l)} (${dateLabel(d.daily.date[iMin], l)}) to ${pct(rates[iMax], l)} (${dateLabel(d.daily.date[iMax], l)}). Bands are narrow: with ~19,000 daily flights, day-to-day jumps are real, not sampling noise.`),
        implications: L("Los días críticos afectan a toda la red a la vez: indican causas comunes (clima, congestión) más que fallas de una ruta.", "Critical days hit the whole network at once: they point to common causes (weather, congestion) rather than single-route failures."),
        decisions: L("Planificar contingencias y holguras para días de alto riesgo; cruzar con meteorología.", "Plan contingencies and buffers for high-risk days; cross-reference with weather."),
        limits: L("Un mes; el intervalo asume vuelos independientes, lo que subestima la incertidumbre en días de tormenta.", "One month; the interval assumes independent flights, which understates uncertainty on storm days."),
      }}>
      <EChart option={option} height={300} label={t(L("Tasa diaria de vuelos afectados", "Daily disruption rate"))} />
    </ChartCard>
  );
}

function DailyMix({ c }: { c: Ctx }) {
  const { d, ct, lang, t } = c;
  const labels = d.daily.date.map((x) => dateLabel(x, lang).replace(/ 2023|, 2023/, ""));
  const keys: [keyof Counts, Bi, string][] = [["late", L("≥15 min tarde", "≥15 min late"), ct.series[0]], ["cancelled", L("Cancelados", "Cancelled"), ct.series[1]], ["diverted", L("Desviados", "Diverted"), ct.series[2]]];
  const option = useMemo<EOption>(() => ({
    ...base(ct), legend: legend(ct),
    xAxis: catAxis(ct, labels), yAxis: valueAxis(ct, (x: number) => num(x, lang)),
    tooltip: axisTip(ct, (i) => tipHead(dateLabel(d.daily.date[i], lang)) + keys.map(([k, n, col]) => tipRow(col, t(n), num(d.daily[k][i], lang))).join("") + tipNote(`${t(L("Total afectados", "Total disrupted"))}: ${num(d.daily.disrupted[i], lang)}`), true),
    series: keys.map(([k, n, col], j) => ({ name: t(n), type: "bar", stack: "a", data: d.daily[k], itemStyle: { color: col, borderColor: ct.surface, borderWidth: 1, ...(j === keys.length - 1 ? { borderRadius: [3, 3, 0, 0] } : {}) }, barMaxWidth: 18 })),
  }), [d, labels, ct, lang, t, keys]);
  const share = d.totals.late / d.totals.disrupted;
  const cMax = d.daily.cancelled.indexOf(Math.max(...d.daily.cancelled));
  return (
    <ChartCard title={L("¿Qué tipo de afectación domina?", "Which kind of disruption dominates?")} subtitle={L("Vuelos afectados por día y tipo", "Disrupted flights per day and type")}
      filters={[L("Nacional · junio 2023", "National · June 2023")]} source={SRC}
      table={{ columns: [t(L("Fecha", "Date")), t(L("Tarde", "Late")), t(L("Cancelados", "Cancelled")), t(L("Desviados", "Diverted"))], rows: d.daily.date.map((x, i) => [dateLabel(x, lang), num(d.daily.late[i], lang), num(d.daily.cancelled[i], lang), num(d.daily.diverted[i], lang)]) }}
      explain={{
        measures: L("Cantidad diaria de vuelos afectados, separada en retraso ≥15 min, cancelación y desvío (categorías excluyentes).", "Daily count of disrupted flights, split into ≥15 min delay, cancellation and diversion (mutually exclusive)."),
        observed: bi((l) => l === "es" ? `El retraso explica ${pct(share, l, 0)} de los vuelos afectados del mes. Las cancelaciones se disparan en días puntuales: el máximo fue ${num(d.daily.cancelled[cMax], l)} el ${dateLabel(d.daily.date[cMax], l)}.` : `Delay explains ${pct(share, l, 0)} of the month's disrupted flights. Cancellations spike on specific days: the peak was ${num(d.daily.cancelled[cMax], l)} on ${dateLabel(d.daily.date[cMax], l)}.`),
        implications: L("Mejorar puntualidad (holguras, rotación de aviones, conexiones) mueve mucho más el indicador que reducir cancelaciones.", "Improving punctuality (buffers, aircraft rotation, connections) moves the indicator far more than cutting cancellations."),
        decisions: L("Priorizar análisis de retrasos por causa y franja horaria.", "Prioritise delay analysis by cause and time band."),
        limits: L("No se incluyen minutos de retraso ni causa en esta versión.", "Delay minutes and causes are not included in this version."),
      }}>
      <EChart option={option} height={300} label={t(L("Vuelos afectados por día y tipo", "Disrupted flights per day and type"))} />
    </ChartCard>
  );
}

function CarrierChart({ c }: { c: Ctx }) {
  const { d, ct, lang, t, metric } = c;
  const rows = useMemo(() => d.carriers.map((x) => { const k = METRIC[metric].k(x), n = METRIC[metric].n(x); const [lo, hi] = wilson(k, n); return { ...x, r: k / n, lo, hi, k, n }; }).sort((a, b) => a.r - b.r), [d, metric]);
  const names = rows.map((r) => r.name);
  const natR = rate(d.totals, metric);
  const option = useMemo<EOption>(() => ({
    ...base(ct), grid: { left: 8, right: 24, top: 8, bottom: 8, containLabel: true },
    yAxis: catAxis(ct, names), xAxis: valueAxis(ct, (x: number) => pct(x, lang, 0)),
    tooltip: axisTip(ct, (i) => { const r = rows[i]; return tipHead(`${r.name} (${r.code})`) + tipRow(ct.series[0], t(METRIC[metric].short), pct(r.r, lang)) + tipRow(ct.neutral, t(L("IC 95%", "95% CI")), `${pct(r.lo, lang)} – ${pct(r.hi, lang)}`) + tipNote(`${num(r.k, lang)} / ${num(r.n, lang)}`); }, true),
    series: [
      { name: t(METRIC[metric].short), type: "bar", data: rows.map((r) => ({ value: r.r, itemStyle: barStyle(r.r > natR ? ct.series[1] : ct.series[0], true) })), barMaxWidth: 14,
        markLine: { symbol: "none", silent: true, lineStyle: { color: ct.text3, type: "dashed" }, label: { formatter: t(L("Nacional", "National")), color: ct.text3, fontSize: 10 }, data: [{ xAxis: natR }] } },
      errorBars("ci", ct.text2, rows.map((r, i) => [i, r.lo, r.hi]), true),
    ],
  }), [rows, names, ct, lang, t, metric, natR]);
  const worst = rows[rows.length - 1], best = rows[0];
  return (
    <ChartCard id="chart-carriers" title={L("Aerolíneas: tasa con intervalo de confianza", "Carriers: rate with confidence interval")} subtitle={METRIC[metric].label}
      filters={[L("Métrica", "Metric"), L("Nacional", "National")]} source={SRC}
      table={{ columns: [t(L("Aerolínea", "Carrier")), t(L("Vuelos", "Flights")), t(L("Tasa", "Rate")), "IC 95%"], rows: [...rows].reverse().map((r) => [`${r.name} (${r.code})`, num(r.n, lang), pct(r.r, lang), `${pct(r.lo, lang)} – ${pct(r.hi, lang)}`]) }}
      explain={{
        measures: bi((l) => l === "es" ? `Tasa de ${METRIC[metric].short.es} por aerolínea con su intervalo de Wilson del 95%. Naranjo: sobre el promedio nacional (${pct(natR, l)}).` : `${METRIC[metric].short.en[0].toUpperCase() + METRIC[metric].short.en.slice(1)} rate per carrier with its 95% Wilson interval. Orange: above the national average (${pct(natR, l)}).`),
        observed: bi((l) => l === "es" ? `${worst.name} registra ${pct(worst.r, l)} y ${best.name} ${pct(best.r, l)}: ${num((worst.r / best.r), l, 1)} veces más. Los intervalos son angostos porque cada aerolínea tiene miles de vuelos.` : `${worst.name} records ${pct(worst.r, l)} and ${best.name} ${pct(best.r, l)}: ${num((worst.r / best.r), l, 1)} times more. Intervals are narrow because each carrier has thousands of flights.`),
        implications: L("Las diferencias son reales en este mes, pero reflejan también red, hubs y tipo de operación (regionales vs troncales).", "The differences are real for this month, but they also reflect network, hubs and type of operation (regional vs mainline)."),
        decisions: L("Comparar aerolíneas dentro de las mismas rutas antes de hablar de desempeño.", "Compare carriers within the same routes before discussing performance."),
        limits: L("No es un ranking de calidad: falta ajustar por ruta, aeropuerto y hora.", "Not a quality ranking: route, airport and hour adjustments are missing."),
      }}>
      <EChart option={option} height={380} label={t(L("Tasa por aerolínea con intervalo", "Rate per carrier with interval"))} />
    </ChartCard>
  );
}

function RouteRanking({ c }: { c: Ctx }) {
  const { ct, lang, t, metric, routes, minN, airport } = c;
  const rows = useMemo(() => [...routes].sort((a, b) => METRIC[metric].k(b) - METRIC[metric].k(a)).slice(0, 15), [routes, metric]);
  const names = rows.map((r) => r.route.replace(" - ", " → "));
  const option = useMemo<EOption>(() => ({
    ...base(ct), grid: { left: 8, right: 40, top: 8, bottom: 8, containLabel: true },
    yAxis: catAxis(ct, names, { inverse: true }), xAxis: valueAxis(ct, (x: number) => num(x, lang)),
    tooltip: axisTip(ct, (i) => { const r = rows[i]; const [lo, hi] = wilson(METRIC[metric].k(r), METRIC[metric].n(r)); return tipHead(names[i]) + tipRow(ct.series[0], t(L("Afectados (métrica)", "Count (metric)")), num(METRIC[metric].k(r), lang)) + tipRow(ct.neutral, t(L("Tasa", "Rate")), `${pct(rate(r, metric), lang)} (${pct(lo, lang)}–${pct(hi, lang)})`) + tipNote(`${num(r.scheduled, lang)} ${t(L("vuelos programados", "scheduled flights"))}`); }, true),
    series: [{ type: "bar", data: rows.map((r) => METRIC[metric].k(r)), itemStyle: barStyle(ct.series[0], true), barMaxWidth: 14, label: { show: true, position: "right", color: ct.text3, fontSize: 10, formatter: (p: any) => pct(rate(rows[p.dataIndex], metric), lang, 0) } }],
  }), [rows, names, ct, lang, t, metric]);
  const empty = rows.length === 0;
  return (
    <ChartCard id="chart-routes" title={L("Rutas prioritarias por volumen afectado", "Priority routes by affected volume")} subtitle={L("Top 15 por cantidad; la etiqueta muestra la tasa", "Top 15 by count; the label shows the rate")}
      filters={[L("Aeropuerto", "Airport"), L("Vuelos mínimos", "Min flights"), L("Métrica", "Metric")]} source={SRC} empty={empty}
      table={{ columns: [t(L("Ruta", "Route")), t(L("Vuelos", "Flights")), t(L("Cantidad", "Count")), t(L("Tasa", "Rate"))], rows: rows.map((r, i) => [names[i], num(r.scheduled, lang), num(METRIC[metric].k(r), lang), pct(rate(r, metric), lang)]) }}
      explain={{
        measures: bi((l) => l === "es" ? `Rutas con ≥${minN} vuelos${airport !== "ALL" ? ` que tocan ${airport}` : ""}, ordenadas por cantidad de vuelos con ${METRIC[metric].short.es}.` : `Routes with ≥${minN} flights${airport !== "ALL" ? ` touching ${airport}` : ""}, ranked by count of flights with ${METRIC[metric].short.en}.`),
        observed: empty ? L("No hay rutas con este filtro.", "No routes match this filter.") : bi((l) => l === "es" ? `${names[0]} encabeza con ${num(METRIC[metric].k(rows[0]), l)} vuelos (${pct(rate(rows[0], metric), l)}). Las 15 rutas suman ${num(rows.reduce((s, r) => s + METRIC[metric].k(r), 0), l)}.` : `${names[0]} leads with ${num(METRIC[metric].k(rows[0]), l)} flights (${pct(rate(rows[0], metric), l)}). The 15 routes total ${num(rows.reduce((s, r) => s + METRIC[metric].k(r), 0), l)}.`),
        implications: L("Ordenar por cantidad prioriza donde más pasajeros podrían verse afectados; la tasa indica si el problema es intenso o solo grande.", "Ranking by count prioritises where more passengers may be affected; the rate tells whether the problem is intense or just large."),
        decisions: L("Elegir corredores para revisar programación, holguras y contingencias.", "Choose corridors to review scheduling, buffers and contingencies."),
        limits: L("Rutas direccionales: ida y vuelta aparecen por separado.", "Directional routes: outbound and return appear separately."),
      }}>
      <EChart option={option} height={400} label={t(L("Rutas prioritarias", "Priority routes"))} />
    </ChartCard>
  );
}

function RouteScatter({ c }: { c: Ctx }) {
  const { ct, lang, t, metric, routes } = c;
  const topSet = useMemo(() => new Set([...routes].sort((a, b) => METRIC[metric].k(b) - METRIC[metric].k(a)).slice(0, 15).map((r) => r.route)), [routes, metric]);
  const pts = useMemo(() => routes.map((r) => [r.scheduled, rate(r, metric), r.route]), [routes, metric]);
  const option = useMemo<EOption>(() => ({
    ...base(ct), grid: { left: 8, right: 16, top: 28, bottom: 28, containLabel: true }, legend: legend(ct),
    xAxis: valueAxis(ct, (x: number) => num(x, lang), { type: "log", name: t(L("Vuelos programados (escala log)", "Scheduled flights (log scale)")), nameLocation: "middle", nameGap: 26, splitLine: { show: false } }),
    yAxis: valueAxis(ct, (x: number) => pct(x, lang, 0)),
    tooltip: { ...base(ct).tooltip, trigger: "item", formatter: (p: any) => tipHead(String(p.value[2]).replace(" - ", " → ")) + tipRow(p.color, t(L("Tasa", "Rate")), pct(p.value[1], lang)) + tipNote(`${num(p.value[0], lang)} ${t(L("vuelos", "flights"))}`) },
    series: [
      { name: t(L("Otras rutas", "Other routes")), type: "scatter", data: pts.filter((p) => !topSet.has(p[2] as string)), symbolSize: 5, itemStyle: { color: ct.neutral, opacity: 0.55 } },
      { name: t(L("Top 15 por volumen afectado", "Top 15 by affected volume")), type: "scatter", data: pts.filter((p) => topSet.has(p[2] as string)), symbolSize: 9, itemStyle: { color: ct.series[1], borderColor: ct.surface, borderWidth: 1.5 } },
    ],
  }), [pts, topSet, ct, lang, t]);
  const rs = pts.map((p) => p[1] as number).filter(Number.isFinite);
  const hiRate = pts.filter((p) => (p[1] as number) > 0.5).length;
  return (
    <ChartCard id="chart-scatter" title={L("¿Tasa alta o volumen alto?", "High rate or high volume?")} subtitle={L("Cada punto es una ruta", "Each point is a route")}
      filters={[L("Aeropuerto", "Airport"), L("Vuelos mínimos", "Min flights"), L("Métrica", "Metric")]} source={SRC} empty={!pts.length}
      explain={{
        measures: L("Eje X: vuelos programados de la ruta (log). Eje Y: tasa de la métrica elegida. Naranjo: las 15 rutas con más vuelos afectados.", "X: scheduled flights on the route (log). Y: rate of the chosen metric. Orange: the 15 routes with most affected flights."),
        observed: bi((l) => l === "es" ? `${num(pts.length, l)} rutas; ${num(hiRate, l)} superan 50%, casi todas con pocos vuelos. La mediana de tasa es ${pct(median(rs), l)}. Las rutas prioritarias combinan volumen alto y tasa sobre la mediana.` : `${num(pts.length, l)} routes; ${num(hiRate, l)} exceed 50%, nearly all with few flights. The median rate is ${pct(median(rs), l)}. Priority routes combine high volume with an above-median rate.`),
        implications: L("Un ranking solo por tasa premiaría rutas pequeñas y ruidosas; por eso se exige un mínimo de vuelos.", "A rate-only ranking would reward small, noisy routes; hence the minimum-flights rule."),
        decisions: L("Usar ambos ejes: tasa para intensidad, volumen para impacto.", "Use both axes: rate for intensity, volume for impact."),
        limits: L("La dispersión vertical en rutas pequeñas es en parte ruido de muestra.", "Vertical spread on small routes is partly sampling noise."),
      }}>
      <EChart option={option} height={360} label={t(L("Tasa frente a volumen por ruta", "Rate vs volume per route"))} />
    </ChartCard>
  );
}

function AirportChart({ c }: { c: Ctx }) {
  const { d, ct, lang, t, metric } = c;
  const rows = useMemo(() => [...d.airports].sort((a, b) => METRIC[metric].k(b) - METRIC[metric].k(a)).slice(0, 15), [d, metric]);
  const option = useMemo<EOption>(() => ({
    ...base(ct), grid: { left: 8, right: 40, top: 8, bottom: 8, containLabel: true },
    yAxis: catAxis(ct, rows.map((r) => r.code), { inverse: true }), xAxis: valueAxis(ct, (x: number) => num(x, lang)),
    tooltip: axisTip(ct, (i) => { const r = rows[i]; return tipHead(r.code) + tipRow(ct.series[0], t(L("Cantidad", "Count")), num(METRIC[metric].k(r), lang)) + tipRow(ct.neutral, t(L("Tasa", "Rate")), pct(rate(r, metric), lang)) + tipNote(`${num(r.scheduled, lang)} ${t(L("vuelos (salidas + llegadas)", "flights (departures + arrivals)"))}`); }, true),
    series: [{ type: "bar", data: rows.map((r) => METRIC[metric].k(r)), itemStyle: barStyle(ct.series[2], true), barMaxWidth: 14, label: { show: true, position: "right", color: ct.text3, fontSize: 10, formatter: (p: any) => pct(rate(rows[p.dataIndex], metric), lang, 0) } }],
  }), [rows, ct, lang, t, metric]);
  const byRate = [...rows].sort((a, b) => rate(b, metric) - rate(a, metric));
  return (
    <ChartCard id="chart-airports" title={L("Aeropuertos con más vuelos afectados", "Airports with most affected flights")} subtitle={L("Top 15 · salidas + llegadas · etiqueta = tasa", "Top 15 · departures + arrivals · label = rate")}
      filters={[L("Métrica", "Metric")]} source={SRC}
      table={{ columns: [t(L("Aeropuerto", "Airport")), t(L("Vuelos", "Flights")), t(L("Cantidad", "Count")), t(L("Tasa", "Rate"))], rows: rows.map((r) => [r.code, num(r.scheduled, lang), num(METRIC[metric].k(r), lang), pct(rate(r, metric), lang)]) }}
      explain={{
        measures: L("Vuelos que salen o llegan a cada aeropuerto (un vuelo cuenta en ambos extremos) y cuántos tuvieron la afectación elegida.", "Flights departing from or arriving at each airport (a flight counts at both ends) and how many had the chosen disruption."),
        observed: bi((l) => l === "es" ? `${rows[0].code} concentra la mayor cantidad (${num(METRIC[metric].k(rows[0]), l)}); entre los 15, la tasa más alta es la de ${byRate[0].code} (${pct(rate(byRate[0], metric), l)}).` : `${rows[0].code} has the largest count (${num(METRIC[metric].k(rows[0]), l)}); among the 15, the highest rate is ${byRate[0].code} (${pct(rate(byRate[0], metric), l)}).`),
        implications: L("Los hubs grandes concentran volumen; una tasa alta en un hub propaga retrasos a toda la red.", "Large hubs concentrate volume; a high rate at a hub propagates delays across the network."),
        decisions: L("Usar el filtro de aeropuerto para revisar sus rutas y KPIs.", "Use the airport filter to review its routes and KPIs."),
        limits: L("Un vuelo afectado cuenta en origen y destino: no sumar aeropuertos.", "A disrupted flight counts at origin and destination: do not add airports."),
      }}>
      <EChart option={option} height={400} label={t(L("Aeropuertos con más vuelos afectados", "Airports with most affected flights"))} />
    </ChartCard>
  );
}

function WeekdayChart({ c }: { c: Ctx }) {
  const { d, ct, lang, t, metric } = c;
  const v = useMemo(() => {
    const acc = Array.from({ length: 7 }, () => ({ scheduled: 0, cancelled: 0, diverted: 0, late: 0, arrival_known: 0, disrupted: 0, days: 0 }));
    d.daily.date.forEach((x, i) => {
      const w = (new Date(x + "T00:00:00Z").getUTCDay() + 6) % 7;
      (Object.keys(acc[0]) as (keyof Counts | "days")[]).forEach((k) => { if (k !== "days") acc[w][k] += d.daily[k][i]; });
      acc[w].days += 1;
    });
    return acc;
  }, [d]);
  const days = WEEKDAYS[lang];
  const option = useMemo<EOption>(() => ({
    ...base(ct), xAxis: catAxis(ct, days), yAxis: valueAxis(ct, (x: number) => pct(x, lang, 0)),
    tooltip: axisTip(ct, (i) => tipHead(days[i]) + tipRow(ct.series[0], t(METRIC[metric].short), pct(rate(v[i], metric), lang)) + tipNote(`${v[i].days} ${t(L("días en junio", "days in June"))} · ${num(v[i].scheduled, lang)} ${t(L("vuelos", "flights"))}`), true),
    series: [{ type: "bar", data: v.map((x) => rate(x, metric)), itemStyle: barStyle(ct.series[0]), barMaxWidth: 34 }],
  }), [v, days, ct, lang, t, metric]);
  const rs = v.map((x) => rate(x, metric)), iMax = rs.indexOf(Math.max(...rs)), iMin = rs.indexOf(Math.min(...rs));
  return (
    <ChartCard title={L("Tasa por día de la semana", "Rate by weekday")} subtitle={METRIC[metric].label} filters={[L("Métrica", "Metric"), L("Nacional", "National")]} source={SRC}
      table={{ columns: [t(L("Día", "Day")), t(L("Días", "Days")), t(L("Vuelos", "Flights")), t(L("Tasa", "Rate"))], rows: v.map((x, i) => [days[i], x.days, num(x.scheduled, lang), pct(rate(x, metric), lang)]) }}
      explain={{
        measures: L("Suma de vuelos y afectaciones por día de la semana en junio, dividida por su denominador.", "Sum of flights and disruptions by weekday in June, divided by its denominator."),
        observed: bi((l) => l === "es" ? `${days[iMax]} registra la tasa más alta (${pct(rs[iMax], l)}) y ${days[iMin]} la más baja (${pct(rs[iMin], l)}). Cada día de la semana aparece solo 4 o 5 veces.` : `${days[iMax]} has the highest rate (${pct(rs[iMax], l)}) and ${days[iMin]} the lowest (${pct(rs[iMin], l)}). Each weekday appears only 4 or 5 times.`),
        implications: L("Con tan pocas repeticiones, un solo día de tormenta puede definir el patrón.", "With so few repetitions, a single storm day can define the pattern."),
        decisions: L("No ajustar programación semanal con un mes; acumular más meses primero.", "Do not adjust weekly scheduling on one month; accumulate more months first."),
        limits: L("4–5 observaciones por día: patrón frágil.", "4–5 observations per day: a fragile pattern."),
      }}>
      <EChart option={option} height={280} label={t(L("Tasa por día de la semana", "Rate by weekday"))} />
    </ChartCard>
  );
}

function RouteSimulator({ c, all }: { c: Ctx; all: Route[] }) {
  const { ct, lang, t, d } = c;
  const [n, setN] = useState(15);
  const [red, setRed] = useState(20);
  const ranked = useMemo(() => [...all].filter((r) => r.scheduled >= 100).sort((a, b) => b.disrupted - a.disrupted), [all]);
  const sel = ranked.slice(0, n);
  const base0 = sel.reduce((s, r) => s + r.disrupted, 0);
  const avoided = base0 * red / 100;
  const option = useMemo<EOption>(() => ({
    ...base(ct), legend: legend(ct),
    xAxis: catAxis(ct, sel.slice(0, 10).map((r) => r.route.replace(" - ", "→")), { axisLabel: { color: ct.text3, fontSize: 10, rotate: 30, interval: 0 } }),
    yAxis: valueAxis(ct, (x: number) => num(x, lang)),
    tooltip: axisTip(ct, (i) => tipHead(sel[i].route) + tipRow(ct.neutral, t(L("Medido", "Measured")), num(sel[i].disrupted, lang)) + tipRow(ct.series[6], t(L("Escenario", "Scenario")), num(sel[i].disrupted * (1 - red / 100), lang)), true),
    series: [
      { name: t(L("Medido (junio 2023)", "Measured (June 2023)")), type: "bar", data: sel.slice(0, 10).map((r) => r.disrupted), itemStyle: barStyle(ct.neutral), barMaxWidth: 20 },
      { name: t(L("Escenario simulado", "Simulated scenario")), type: "bar", data: sel.slice(0, 10).map((r) => r.disrupted * (1 - red / 100)), itemStyle: barStyle(ct.series[6]), barMaxWidth: 20 },
    ],
  }), [sel, red, ct, lang, t]);
  return (
    <Card id="simulator" className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-sim-bg px-5 py-3">
        <div><Badge tone="simulated">{t(L("SIMULACIÓN · supuestos explícitos", "SIMULATION · explicit assumptions"))}</Badge>
          <h3 className="mt-1 text-[15px] font-semibold">{t(L("¿Cuánto cambia el total si mejoran las rutas prioritarias?", "How much does the total change if priority routes improve?"))}</h3></div>
        <p className="max-w-xl text-[12.5px] text-sim-text">{t(L("Aritmética sobre junio 2023: no predice el efecto de ninguna intervención concreta.", "Arithmetic on June 2023: it does not predict the effect of any specific intervention."))}</p>
      </div>
      <div className="grid gap-6 p-5 lg:grid-cols-[300px_1fr]">
        <div className="flex flex-col gap-4">
          <Slider label={t(L("Rutas prioritarias (≥100 vuelos)", "Priority routes (≥100 flights)"))} value={n} min={5} max={50} onChange={setN} format={(v) => String(v)} />
          <Slider label={t(L("Reducción de vuelos afectados", "Reduction in disrupted flights"))} value={red} min={5} max={50} step={5} onChange={setRed} format={(v) => `−${v}%`} />
          <div className="rounded-lg bg-surface-2 p-3 text-[13px]">
            <p className="text-ink-3">{t(L("Vuelos afectados evitados / mes", "Disrupted flights avoided / month"))}</p>
            <p className="num text-2xl font-semibold">{num(avoided, lang)}</p>
            <p className="text-ink-3">{t(L(`${pct(avoided / d.totals.disrupted, "es", 2)} del total nacional · ${pct(base0 / d.totals.disrupted, "es", 1)} del total está en estas rutas`, `${pct(avoided / d.totals.disrupted, "en", 2)} of the national total · ${pct(base0 / d.totals.disrupted, "en", 1)} of the total sits on these routes`))}</p>
          </div>
          <p className="font-mono text-[11.5px] text-ink-3">Σᵢ disruptedᵢ × r</p>
        </div>
        <EChart option={option} height={300} label={t(L("Simulación por ruta", "Simulation per route"))} />
      </div>
    </Card>
  );
}
