"use client";
import { ArrowRight, BrainCircuit, CalendarDays, Landmark, LineChart, Mountain, PlaneTakeoff, ShoppingBasket, Trash2, type LucideIcon } from "lucide-react";
import { BrandMark, PrefToggles } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { L, usePrefs, type Bi } from "@/lib/prefs";

type App = { href: string; name: string; icon: LucideIcon; tag: Bi; tone: "measured" | "expected"; domain: Bi; problem: Bi; result: Bi; stack: string };

const REAL = (src: string) => ({ tag: L(`Datos reales públicos · ${src}`, `Real public data · ${src}`), tone: "measured" as const });
const SYN = (src: string) => ({ tag: L(`Datos sintéticos · ${src}`, `Synthetic data · ${src}`), tone: "expected" as const });

const APPS: App[] = [
  { href: "revenue-intelligence/", name: "Revenue Intelligence", icon: LineChart, ...REAL("Olist"), domain: L("Comercial · pronóstico", "Commercial · forecasting"),
    problem: L("¿Cuánto vende realmente un marketplace, qué mueve sus ingresos y cómo planificar las próximas semanas?", "How much does a marketplace really sell, what moves revenue and how to plan the coming weeks?"),
    result: L("−18% de error de pronóstico vs media móvil · BRL/USD/CLP", "−18% forecast error vs moving average · BRL/USD/CLP"), stack: "SQL · DuckDB · scikit-learn · Next.js" },
  { href: "talentrisk/", name: "TalentRisk AI", icon: BrainCircuit, tag: L("Datos ficticios de IBM · educativo", "IBM fictional data · educational"), tone: "expected", domain: L("People Analytics · ML", "People Analytics · ML"),
    problem: L("¿Qué factores se asocian con la rotación y cómo usar un modelo de forma responsable?", "Which factors are associated with attrition, and how to use a model responsibly?"),
    result: L("PR-AUC 0,62 (azar 0,16) · SHAP · auditoría de equidad", "PR-AUC 0.62 (chance 0.16) · SHAP · fairness audit"), stack: "scikit-learn · XGBoost · SHAP · Next.js" },
  { href: "replenishment-forecast/", name: "Replenishment Forecast Lab", icon: ShoppingBasket, ...SYN("Favorita"), domain: L("Retail · ingeniería de datos", "Retail · data engineering"),
    problem: L("¿Puede un modelo apoyar la reposición de 360 series tienda-producto?", "Can a model support replenishment for 360 store-product series?"),
    result: L("WMAPE 30,3% vs 44,9% · 21 pruebas dbt · piloto en sombra", "WMAPE 30.3% vs 44.9% · 21 dbt tests · shadow pilot"), stack: "dbt · BigQuery · LightGBM · Tableau" },
  { href: "campaign-drift/", name: "Campaign Drift Audit", icon: Landmark, ...REAL("UCI"), domain: L("Banca · auditoría de modelo", "Banking · model audit"),
    problem: L("¿Un modelo de propensión para campañas bancarias puede salir a producción?", "Can a bank-campaign propensity model go to production?"),
    result: L("Tasa base 4,8% → 30,8% · AUC 0,458 · no desplegar", "Base rate 4.8% → 30.8% · AUC 0.458 · do not deploy"), stack: "SQL · scikit-learn · Excel" },
  { href: "waste-control/", name: "Waste & Margin Control", icon: Trash2, ...SYN("CLP"), domain: L("Operaciones · BI", "Operations · BI"),
    problem: L("¿Dónde pierde dinero un comercio por merma antes de invertir en frío?", "Where does a stall lose money to waste before investing in cold storage?"),
    result: L("Merma CLP 8,99 M (2,9%) · aceitunas primero · CLP/USD", "Waste CLP 8.99M (2.9%) · olives first · CLP/USD"), stack: "SQL · Excel · Power BI" },
  { href: "route-reliability/", name: "Route Reliability Monitor", icon: PlaneTakeoff, ...REAL("BTS"), domain: L("Logística aérea · estadística", "Air logistics · statistics"),
    problem: L("¿Qué rutas y aerolíneas concentran vuelos afectados y dónde investigar primero?", "Which routes and carriers concentrate disrupted flights, and where to look first?"),
    result: L("577.262 vuelos · intervalos de Wilson · ATL–MCO primero", "577,262 flights · Wilson intervals · ATL–MCO first"), stack: "Python · SQL · Power BI" },
  { href: "demand-baseline/", name: "Demand Baseline Planner", icon: CalendarDays, ...SYN("feria"), domain: L("Planificación · series de tiempo", "Planning · time series"),
    problem: L("¿Qué regla simple de pronóstico puede operar un comercio pequeño?", "Which simple forecasting rule can a small business run?"),
    result: L("−19,4% de error vs ingenuo · simulador de colchón", "−19.4% error vs naive · buffer simulator"), stack: "SQL · Python · Excel · Tableau" },
  { href: "copper-observatory/", name: "Copper Value Observatory", icon: Mountain, ...REAL("COCHILCO"), domain: L("Economía · datos oficiales", "Economics · official data"),
    problem: L("¿El valor exportado de cobre crece por volumen o por precio?", "Does copper export value grow through volume or price?"),
    result: L("2024: valor +16,7% vs volumen +4,9% · USD/CLP", "2024: value +16.7% vs volume +4.9% · USD/CLP"), stack: "SQL · Python · Power BI" },
];

export default function Hub() {
  const { t } = usePrefs();
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <a href={`${base.replace(/\/apps$/, "")}/#cases`} className="inline-flex items-center gap-2 text-[13px] text-ink-3 hover:text-ink"><BrandMark /> {t(L("Portafolio de Camilo Vergara Salas", "Camilo Vergara Salas's portfolio"))}</a>
          <PrefToggles />
        </div>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-4 py-12">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">{t(L("Casos interactivos", "Interactive cases"))}</p>
        <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight md:text-4xl">{t(L("Ocho casos completos, del dato a una decisión", "Eight complete cases, from data to a decision"))}</h1>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-ink-2">
          {t(L("Cada caso es una aplicación con dashboard filtrable, «¿Qué nos muestra este gráfico?» bajo cada visualización, hallazgos, impacto medido / simulado / esperado, el proceso 01–07 y modo presentación. Los datos sintéticos se declaran como tales; los montos se pueden ver en USD o CLP.",
            "Each case is an application with a filterable dashboard, “What does this chart show?” under every visual, findings, measured / simulated / expected impact, the 01–07 process and presentation mode. Synthetic data is declared as such; amounts can be shown in USD or CLP."))}
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {APPS.map((a, i) => (
            <Card key={a.name} className="group flex flex-col p-6 transition-shadow hover:shadow-lg">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent"><a.icon className="h-5 w-5" aria-hidden /></span>
                <div className="min-w-0">
                  <p className="font-mono text-[11px] text-ink-3">{String(i + 1).padStart(2, "0")} · {t(a.domain)}</p>
                  <h2 className="text-lg font-semibold leading-snug">{a.name}</h2>
                </div>
              </div>
              <Badge tone={a.tone} className="mt-3 self-start">{t(a.tag)}</Badge>
              <p className="mt-3 text-[14px] leading-relaxed text-ink-2">{t(a.problem)}</p>
              <p className="mt-2 text-[13px] font-medium text-ink">{t(a.result)}</p>
              <p className="mt-3 font-mono text-[11.5px] text-ink-3">{a.stack}</p>
              <a href={a.href} className="mt-5 inline-flex items-center gap-1.5 self-start rounded-md bg-ink px-4 py-2 text-sm font-medium text-surface hover:opacity-90">
                {t(L("Abrir caso", "Open case"))} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </a>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
