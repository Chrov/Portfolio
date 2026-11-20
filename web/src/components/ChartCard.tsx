"use client";
import { ChevronDown, Filter, Table2, BarChart3 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { L, usePrefs, type Bi } from "@/lib/prefs";
import { Card } from "./ui/card";
import { cn } from "./ui/cn";

export type Explain = { measures: Bi; observed: Bi; implications: Bi; decisions: Bi; limits: Bi };
export type TableSpec = { columns: string[]; rows: (string | number)[][] };

export function ChartCard({ id, title, subtitle, filters, source, explain, table, empty, actions, children, className }: {
  id?: string; title: Bi; subtitle?: Bi; filters: Bi[]; source: Bi; explain: Explain; table?: TableSpec;
  empty?: boolean; actions?: ReactNode; children: ReactNode; className?: string;
}) {
  const { t } = usePrefs();
  const [view, setView] = useState<"chart" | "table">("chart");
  const [more, setMore] = useState(false);
  return (
    <Card id={id} className={cn("flex min-w-0 flex-col", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold leading-snug text-ink">{t(title)}</h3>
          {subtitle && <p className="mt-0.5 text-[12.5px] text-ink-3">{t(subtitle)}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          {table && (
            <button
              type="button" onClick={() => setView(view === "chart" ? "table" : "chart")}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line px-2.5 text-[12.5px] text-ink-2 hover:bg-surface-2 cursor-pointer"
              aria-pressed={view === "table"}
            >
              {view === "chart" ? <Table2 className="h-3.5 w-3.5" /> : <BarChart3 className="h-3.5 w-3.5" />}
              {view === "chart" ? t(L("Tabla", "Table")) : t(L("Gráfico", "Chart"))}
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 px-5 pt-2 text-[11px] text-ink-3">
        <Filter aria-hidden className="h-3 w-3" />
        {filters.map((f, i) => (
          <span key={i} className="rounded border border-line px-1.5 py-px">{t(f)}</span>
        ))}
      </div>
      <div className="min-w-0 px-3 pt-2">
        {empty ? (
          <div className="flex h-[220px] items-center justify-center rounded-lg border border-dashed border-line text-sm text-ink-3">
            {t(L("No hay datos para esta combinación de filtros.", "No data for this filter combination."))}
          </div>
        ) : view === "table" && table ? (
          <div className="max-h-[360px] overflow-auto px-2 pb-2">
            <table className="w-full text-left text-[12.5px]">
              <thead className="sticky top-0 bg-surface">
                <tr>{table.columns.map((c) => <th key={c} className="border-b border-line px-2 py-1.5 font-medium text-ink-3">{c}</th>)}</tr>
              </thead>
              <tbody>
                {table.rows.map((r, i) => (
                  <tr key={i} className="border-b border-line/60">
                    {r.map((c, j) => <td key={j} className={cn("px-2 py-1.5", typeof c === "number" || j > 0 ? "num text-right" : "")}>{c}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : children}
      </div>
      <section className="mx-5 mb-4 mt-2 rounded-lg bg-surface-2 px-4 py-3" aria-label={t(L("¿Qué nos muestra este gráfico?", "What does this chart show?"))}>
        <h4 className="text-[12px] font-semibold uppercase tracking-wider text-ink-2">{t(L("¿Qué nos muestra este gráfico?", "What does this chart show?"))}</h4>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink">{t(explain.observed)}</p>
        <button
          type="button" onClick={() => setMore(!more)} aria-expanded={more}
          className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-medium text-accent cursor-pointer"
        >
          {more ? t(L("Menos contexto", "Less context")) : t(L("Qué se mide, implicancias y límites", "What is measured, implications and limits"))}
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", more && "rotate-180")} />
        </button>
        {more && (
          <dl className="mt-2 grid gap-2 text-[13px] leading-relaxed sm:grid-cols-2">
            {([
              [L("Qué se mide", "What is measured"), explain.measures],
              [L("Implicancias", "Implications"), explain.implications],
              [L("Decisiones que permite investigar", "Decisions it helps investigate"), explain.decisions],
              [L("Limitaciones", "Limitations"), explain.limits],
            ] as [Bi, Bi][]).map(([k, v]) => (
              <div key={k.en}>
                <dt className="font-medium text-ink-2">{t(k)}</dt>
                <dd className="text-ink-2">{t(v)}</dd>
              </div>
            ))}
          </dl>
        )}
        <p className="mt-2 text-[11px] text-ink-3">{t(L("Fuente", "Source"))}: {t(source)}</p>
      </section>
    </Card>
  );
}
