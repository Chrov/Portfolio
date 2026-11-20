"use client";
import { ArrowRight, BrainCircuit, LineChart } from "lucide-react";
import { PrefToggles } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { L, usePrefs } from "@/lib/prefs";

const APPS = [
  {
    href: "revenue-intelligence/", name: "Revenue Intelligence", icon: LineChart,
    tag: L("Datos reales públicos · Olist, Brasil", "Real public data · Olist, Brazil"), tone: "measured" as const,
    problem: L("¿Cuánto vende realmente un marketplace, qué mueve sus ingresos y cómo planificar las próximas semanas?", "How much does a marketplace really sell, what moves its revenue and how to plan the coming weeks?"),
    features: [L("KPIs con metodología y comparación de períodos", "KPIs with methodology and period comparison"), L("Tendencias, anomalías y descomposición precio-volumen", "Trends, anomalies and price-volume decomposition"), L("Categorías, geografía y segmentación RFM", "Categories, geography and RFM segmentation"), L("Pronóstico con backtest frente a modelos base", "Forecast with backtest vs baselines"), L("Simulador de escenarios", "Scenario simulator")],
    stack: "SQL · DuckDB · pandas · scikit-learn · FastAPI · Next.js · ECharts",
  },
  {
    href: "talentrisk/", name: "TalentRisk AI", icon: BrainCircuit,
    tag: L("Datos ficticios de IBM · uso educativo", "IBM fictional data · educational use"), tone: "expected" as const,
    problem: L("¿Qué factores se asocian con la rotación, qué tan bien se puede anticipar y cómo usar un modelo de forma responsable?", "Which factors are associated with attrition, how well can it be anticipated, and how to use a model responsibly?"),
    features: [L("Dashboard filtrable de People Analytics", "Filterable People Analytics dashboard"), L("Asociaciones con intervalos y pruebas corregidas", "Associations with intervals and corrected tests"), L("3 modelos, calibración, SHAP y auditoría de equidad", "3 models, calibration, SHAP and fairness audit"), L("Explorador de riesgo con explicación exacta", "Risk explorer with exact explanation"), L("Simulador de retención (puntuación, no causalidad)", "Retention simulator (score, not causality)")],
    stack: "pandas · scikit-learn · XGBoost · SHAP · FastAPI · Next.js · ECharts",
  },
];

export default function Hub() {
  const { t } = usePrefs();
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <a href={`${base.replace(/\/apps$/, "")}/`} className="text-[13px] text-ink-3 hover:text-ink">← {t(L("Portafolio de Camilo Vergara Salas", "Camilo Vergara Salas's portfolio"))}</a>
          <PrefToggles />
        </div>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-4 py-12">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">{t(L("Aplicaciones analíticas", "Analytics applications"))}</p>
        <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight md:text-4xl">{t(L("Del dato a una herramienta que una empresa podría usar", "From data to a tool a company could use"))}</h1>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-ink-2">
          {t(L("Dos aplicaciones completas que conectan ingeniería de datos, análisis de negocio, machine learning y desarrollo web. Cada cifra se calcula en un pipeline reproducible y se distingue entre resultado medido, simulado e impacto esperado.",
            "Two complete applications connecting data engineering, business analysis, machine learning and web development. Every figure comes from a reproducible pipeline, and measured results, simulations and expected impact are kept apart."))}
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {APPS.map((a) => (
            <Card key={a.name} className="group flex flex-col p-6 transition-shadow hover:shadow-lg">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent"><a.icon className="h-5 w-5" aria-hidden /></span>
                <div>
                  <h2 className="text-lg font-semibold">{a.name}</h2>
                  <Badge tone={a.tone}>{t(a.tag)}</Badge>
                </div>
              </div>
              <p className="mt-4 text-[14px] leading-relaxed text-ink-2">{t(a.problem)}</p>
              <ul className="mt-3 space-y-1 text-[13px] text-ink-2">{a.features.map((f) => <li key={f.en} className="flex gap-2"><span className="text-accent" aria-hidden>✓</span>{t(f)}</li>)}</ul>
              <p className="mt-4 font-mono text-[11.5px] text-ink-3">{a.stack}</p>
              <a href={a.href} className="mt-5 inline-flex items-center gap-1.5 self-start rounded-md bg-ink px-4 py-2 text-sm font-medium text-surface hover:opacity-90">
                {t(L("Abrir aplicación", "Open application"))} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </a>
            </Card>
          ))}
        </div>
        <section className="mt-10 grid gap-4 md:grid-cols-4">
          {[
            [L("Ingeniería de datos", "Data engineering"), L("Ingesta verificada, SQL por capas, controles de calidad automáticos.", "Verified ingestion, layered SQL, automated quality checks.")],
            [L("Análisis empresarial", "Business analysis"), L("KPIs definidos, hallazgos con evidencia y qué validar antes de actuar.", "Defined KPIs, evidence-backed findings and what to validate before acting.")],
            [L("Machine learning", "Machine learning"), L("Modelos base, validación sin fuga, calibración, SHAP y equidad.", "Baselines, leakage-free validation, calibration, SHAP and fairness.")],
            [L("Desarrollo web", "Web development"), L("Next.js + TypeScript, gráficos interactivos accesibles, modo claro/oscuro.", "Next.js + TypeScript, accessible interactive charts, light/dark mode.")],
          ].map(([h, b]) => (
            <Card key={h.en} className="p-4">
              <h3 className="text-[14px] font-semibold">{t(h)}</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{t(b)}</p>
            </Card>
          ))}
        </section>
      </main>
    </div>
  );
}
