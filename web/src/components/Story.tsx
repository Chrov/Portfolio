"use client";
// Storytelling blocks shared by both apps: insights, impact triad, process timeline, technical panel.
import { CheckCircle2, ExternalLink, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { L, usePrefs, type Bi } from "@/lib/prefs";
import type { Insight } from "@/lib/revenue";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";

export const KIND: Record<string, { tone: "measured" | "simulated" | "expected"; label: Bi }> = {
  measured: { tone: "measured", label: L("Resultado medido", "Measured result") },
  simulated: { tone: "simulated", label: L("Resultado simulado", "Simulated result") },
  expected: { tone: "expected", label: L("Impacto esperado · por validar", "Expected impact · to validate") },
};

export function InsightsPanel({ items }: { items: Insight[] }) {
  const { t } = usePrefs();
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {items.map((it) => (
        <Card key={it.id} className="flex flex-col gap-2.5 p-4">
          <Badge tone={KIND[it.kind].tone} className="self-start">{t(KIND[it.kind].label)}</Badge>
          <h3 className="text-[15px] font-semibold leading-snug">{t(it.title)}</h3>
          <dl className="space-y-2 text-[13px] leading-relaxed">
            {([
              [L("Evidencia", "Evidence"), it.evidence],
              [L("Por qué importa", "Why it matters"), it.why],
              [L("Acción a investigar", "Action to investigate"), it.action],
              [L("Validar antes de actuar", "Validate before acting"), it.validate],
            ] as [Bi, Bi][]).map(([k, v]) => (
              <div key={k.en}><dt className="text-[11.5px] font-semibold uppercase tracking-wider text-ink-3">{t(k)}</dt><dd className="text-ink-2">{t(v)}</dd></div>
            ))}
          </dl>
        </Card>
      ))}
    </div>
  );
}

export function ImpactTriad({ measured, simulated, expected }: { measured: ReactNode; simulated: ReactNode; expected: ReactNode }) {
  const { t } = usePrefs();
  const cols: [keyof typeof KIND, Bi, ReactNode][] = [
    ["measured", L("Calculado sobre el dataset. Reproducible con el pipeline.", "Computed on the dataset. Reproducible with the pipeline."), measured],
    ["simulated", L("Obtenido con supuestos explícitos. No es una predicción.", "Obtained with explicit assumptions. Not a prediction."), simulated],
    ["expected", L("Beneficio potencial. Requiere validación en una empresa real.", "Potential benefit. Requires validation in a real company."), expected],
  ];
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {cols.map(([k, d, body]) => (
        <Card key={k} className="p-4">
          <Badge tone={KIND[k].tone}>{t(KIND[k].label)}</Badge>
          <p className="mt-2 text-[12.5px] text-ink-3">{t(d)}</p>
          <div className="mt-3 text-[13.5px] leading-relaxed text-ink-2">{body}</div>
        </Card>
      ))}
    </div>
  );
}

export type Step = { title: Bi; body: Bi; facts?: Bi[] };
export function ProcessTimeline({ steps }: { steps: Step[] }) {
  const { t } = usePrefs();
  return (
    <ol className="relative grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {steps.map((s, i) => (
        <li key={i} className="relative rounded-xl border border-line bg-surface p-4 shadow-card">
          <span className="num font-mono text-[12px] font-semibold text-accent">{String(i + 1).padStart(2, "0")}</span>
          <h3 className="mt-1 text-[14.5px] font-semibold">{t(s.title)}</h3>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{t(s.body)}</p>
          {s.facts && (
            <ul className="mt-2 space-y-1 text-[12.5px] text-ink-3">
              {s.facts.map((f, k) => <li key={k} className="flex gap-1.5"><span aria-hidden>·</span>{t(f)}</li>)}
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
}

export function ArchitectureFlow({ stages }: { stages: { name: Bi; tech: string; detail: Bi }[] }) {
  const { t } = usePrefs();
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-stretch">
      {stages.map((s, i) => (
        <div key={i} className="flex flex-1 flex-col gap-2 md:flex-row md:items-center">
          <div className="flex-1 rounded-lg border border-line bg-surface p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">{t(s.name)}</p>
            <p className="mt-0.5 font-mono text-[12.5px] text-ink">{s.tech}</p>
            <p className="mt-1 text-[12px] leading-snug text-ink-2">{t(s.detail)}</p>
          </div>
          {i < stages.length - 1 && <span aria-hidden className="self-center text-ink-3 md:rotate-0 rotate-90">→</span>}
        </div>
      ))}
    </div>
  );
}

export function ChecksList({ checks }: { checks: { check: string; passed: boolean; detail?: string }[] }) {
  return (
    <ul className="space-y-1.5 text-[13px]">
      {checks.map((c) => (
        <li key={c.check} className="flex items-start gap-2">
          {c.passed ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-good" aria-label="PASS" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-bad" aria-label="FAIL" />}
          <span className="text-ink-2">{c.check}</span>
        </li>
      ))}
    </ul>
  );
}

export function DefTable({ rows, head }: { rows: [string, string, string?][]; head: [string, string, string?] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[13px]">
        <thead><tr>{head.filter(Boolean).map((h) => <th key={h} className="border-b border-line px-2 py-1.5 font-medium text-ink-3">{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-line/60 align-top">
              <td className="px-2 py-1.5 font-medium text-ink">{r[0]}</td>
              <td className="px-2 py-1.5 font-mono text-[12px] text-ink-2">{r[1]}</td>
              {r[2] !== undefined && <td className="px-2 py-1.5 text-ink-2">{r[2]}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const REPO = "https://github.com/Chrov/Portfolio/tree/main";
export function RepoLink({ path, label }: { path: string; label: string }) {
  return (
    <a href={`${REPO}/${path}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
      {label} <ExternalLink className="h-3 w-3" aria-hidden />
    </a>
  );
}
