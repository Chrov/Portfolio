"use client";
// Shared layout for the interactive case studies: the same sections and storytelling
// blocks as the two flagship apps (summary, problem, dashboard, insights, measured /
// simulated / expected impact, "what was done" 01–07, technical exploration, limits).
import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { L, usePrefs, type Bi } from "@/lib/prefs";
import type { Insight } from "@/lib/revenue";
import { Section, type NavItem } from "./AppShell";
import { ArchitectureFlow, ChecksList, DefTable, ImpactTriad, InsightsPanel, ProcessTimeline, RepoLink, type Step } from "./Story";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";

export type { Insight, Step };

export const CASE_NAV = (extra: NavItem[] = []): NavItem[] => [
  { id: "resumen", label: L("Resumen ejecutivo", "Executive summary") },
  { id: "problema", label: L("Problema de negocio", "Business problem") },
  { id: "dashboard", label: L("Dashboard", "Dashboard") },
  ...extra,
  { id: "hallazgos", label: L("Hallazgos", "Findings") },
  { id: "impacto", label: L("Impacto esperado", "Expected impact") },
  { id: "metodologia", label: L("¿Qué se hizo?", "What was done?") },
  { id: "limitaciones", label: L("Limitaciones", "Limitations") },
];

export type DataKind = "real" | "synthetic" | "fictional";
export const DATA_BADGE: Record<DataKind, { tone: "measured" | "expected" | "simulated"; label: Bi }> = {
  real: { tone: "measured", label: L("Datos reales públicos", "Real public data") },
  synthetic: { tone: "expected", label: L("Datos sintéticos · declarado", "Synthetic data · declared") },
  fictional: { tone: "expected", label: L("Datos ficticios", "Fictional data") },
};

export function CaseIntro({ kind, badges, summary, questions, decision }: {
  kind: DataKind; badges: string[]; summary: Bi[]; questions: [Bi, string][]; decision: Bi;
}) {
  const { t } = usePrefs();
  return (
    <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
      <Section id="resumen" n={1} title={L("Resumen ejecutivo", "Executive summary")}>
        <Card className="p-5 text-[14px] leading-relaxed text-ink-2">
          <div className="mb-3 flex flex-wrap gap-1.5">
            <Badge tone={DATA_BADGE[kind].tone}>{t(DATA_BADGE[kind].label)}</Badge>
            {badges.map((b) => <Badge key={b} tone="outline">{b}</Badge>)}
          </div>
          <ul className="space-y-2">{summary.map((s, i) => <li key={i}>{t(s)}</li>)}</ul>
          <p className="mt-4 rounded-lg border-l-4 border-accent bg-accent-soft/60 px-3 py-2 text-[13.5px] text-ink">
            <span className="font-semibold">{t(L("Decisión recomendada: ", "Recommended decision: "))}</span>{t(decision)}
          </p>
        </Card>
      </Section>
      <Section id="problema" n={2} className="pt-0" title={L("Problema de negocio", "Business problem")}>
        <Card className="p-5">
          <p className="text-[13.5px] text-ink-2">{t(L("Preguntas que la aplicación responde con evidencia:", "Questions this application answers with evidence:"))}</p>
          <ul className="mt-2 grid gap-x-4 gap-y-1 text-[13px] sm:grid-cols-2">
            {questions.map(([q, id]) => <li key={q.en}><a href={`#${id}`} className="text-accent hover:underline">{t(q)}</a></li>)}
          </ul>
        </Card>
      </Section>
    </div>
  );
}

export function FindingsSection({ n, items, intro }: { n: number; items: Insight[]; intro?: Bi }) {
  return (
    <Section id="hallazgos" n={n} title={L("Insights y recomendaciones", "Insights and recommendations")}
      intro={intro ?? L("Calculados con reglas reproducibles sobre los datos de esta página. Cada uno indica qué validar antes de actuar.", "Computed with reproducible rules on this page's data. Each states what to validate before acting.")}>
      <InsightsPanel items={items} />
    </Section>
  );
}

export function ImpactSection({ n, measured, simulated, expected, children }: { n: number; measured: Bi[]; simulated: ReactNode; expected: Bi[]; children?: ReactNode }) {
  const { t } = usePrefs();
  return (
    <Section id="impacto" n={n} title={L("Impacto empresarial esperado", "Expected business impact")}
      intro={L("Separamos lo medido, lo simulado y lo que solo puede validarse en una operación real.", "We separate what was measured, what is simulated and what can only be validated in a real operation.")}>
      <ImpactTriad
        measured={<ul className="list-disc space-y-1.5 pl-4">{measured.map((m) => <li key={m.en}>{t(m)}</li>)}</ul>}
        simulated={simulated}
        expected={<ul className="list-disc space-y-1.5 pl-4">
          {expected.map((m) => <li key={m.en}>{t(m)}</li>)}
          <li className="list-none pt-1 text-[12px] text-ink-3">{t(L("Sin cifras inventadas: cuantificarlo requiere un piloto con línea base.", "No invented figures: quantifying it requires a pilot with a baseline."))}</li>
        </ul>}
      />
      {children && <div className="mt-4">{children}</div>}
    </Section>
  );
}

export type Link = { href: string; label: Bi; external?: boolean };

export function MethodSection({ n, steps, stages, defs, checks, decisions, repo, links, generated }: {
  n: number; steps: Step[]; stages: { name: Bi; tech: string; detail: Bi }[]; defs: [string, string, string?][];
  checks: { check: string; passed: boolean; detail?: string }[]; decisions: Bi[]; repo?: string; links: Link[]; generated: string;
}) {
  const { t } = usePrefs();
  return (
    <Section id="metodologia" n={n} title={L("¿Qué se hizo? Metodología y arquitectura", "What was done? Methodology and architecture")}>
      <ProcessTimeline steps={steps} />
      <h3 className="mb-3 mt-8 text-[13px] font-semibold uppercase tracking-wider text-ink-3">{t(L("Exploración técnica", "Technical exploration"))}</h3>
      <Card className="p-5"><ArchitectureFlow stages={stages} /></Card>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <h4 className="mb-2 font-semibold">{t(L("Definiciones de métricas", "Metric definitions"))}</h4>
          <DefTable head={[t(L("Métrica", "Metric")), t(L("Fórmula", "Formula")), t(L("Nota", "Note"))]} rows={defs} />
        </Card>
        <Card className="p-5">
          <h4 className="mb-2 font-semibold">{t(L("Controles de reconciliación (ejecutados en cada build)", "Reconciliation checks (run on every build)"))}</h4>
          <ChecksList checks={checks} />
        </Card>
        <Card className="p-5">
          <h4 className="mb-2 font-semibold">{t(L("Decisiones de análisis", "Analysis decisions"))}</h4>
          <ul className="list-disc space-y-1.5 pl-4 text-[13px] text-ink-2">{decisions.map((d) => <li key={d.en}>{t(d)}</li>)}</ul>
        </Card>
        <Card className="p-5">
          <h4 className="mb-2 font-semibold">{t(L("Repositorio, evidencia y descargas", "Repository, evidence and downloads"))}</h4>
          <ul className="space-y-1.5 text-[13px]">
            {repo && <li><a href={repo} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">{t(L("Repositorio del proyecto (código, SQL, pruebas)", "Project repository (code, SQL, tests)"))} <ExternalLink className="h-3 w-3" aria-hidden /></a></li>}
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} {...(l.external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="inline-flex items-center gap-1 text-accent hover:underline">
                  {t(l.label)}{l.external && <ExternalLink className="h-3 w-3" aria-hidden />}
                </a>
              </li>
            ))}
            <li><RepoLink path="analytics/cases/build.py" label={t(L("Pipeline que prepara los datos de esta app", "Pipeline that prepares this app's data"))} /></li>
          </ul>
          <p className="mt-3 text-[12px] text-ink-3">{t(L(`Datos generados el ${generated}`, `Data generated on ${generated}`))}</p>
        </Card>
      </div>
    </Section>
  );
}

export function LimitsSection({ n, limits, future }: { n: number; limits: Bi[]; future: Bi[] }) {
  const { t } = usePrefs();
  return (
    <Section id="limitaciones" n={n} title={L("Limitaciones y futuras mejoras", "Limitations and future work")}>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h4 className="mb-2 font-semibold">{t(L("Limitaciones", "Limitations"))}</h4>
          <ul className="list-disc space-y-1.5 pl-4 text-[13px] text-ink-2">{limits.map((x) => <li key={x.en}>{t(x)}</li>)}</ul>
        </Card>
        <Card className="p-5">
          <h4 className="mb-2 font-semibold">{t(L("Futuras mejoras", "Future work"))}</h4>
          <ul className="list-disc space-y-1.5 pl-4 text-[13px] text-ink-2">{future.map((x) => <li key={x.en}>{t(x)}</li>)}</ul>
        </Card>
      </div>
    </Section>
  );
}

/** A labelled filter row rendered under the app header. */
export function FilterBar({ children, note }: { children: ReactNode; note?: ReactNode }) {
  const { t } = usePrefs();
  return (
    <div className="border-t border-line bg-surface/95">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-end gap-3 px-4 py-2">
        {children}
        <div className="mb-1 ml-auto hidden max-w-md xl:block">
          <p className="text-[12px] text-ink-3">{t(L("Los filtros actualizan KPIs, gráficos y sus explicaciones. Cada gráfico indica qué filtros usa.", "Filters update KPIs, charts and their explanations. Each chart states which filters it uses."))}</p>
          {note}
        </div>
      </div>
    </div>
  );
}

/** Consistent slide body helpers for presentation mode. */
export function SlideList({ items }: { items: Bi[] }) {
  const { t } = usePrefs();
  return <ul className="max-w-4xl list-disc space-y-3 pl-6">{items.map((x) => <li key={x.en}>{t(x)}</li>)}</ul>;
}

export function ins(id: string, kind: Insight["kind"], title: Bi, evidence: Bi, why: Bi, action: Bi, validate: Bi): Insight {
  return { id, kind, title, evidence, why, action, validate };
}

/** Bilingual template: both languages from one function of the language. */
export function bi(f: (l: "es" | "en") => string): Bi {
  return { es: f("es"), en: f("en") };
}
