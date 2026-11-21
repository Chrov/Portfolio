"use client";
import { ArrowDownRight, ArrowUpRight, Info, Minus } from "lucide-react";
import { useState } from "react";
import { L, usePrefs, type Bi } from "@/lib/prefs";
import { Card } from "./ui/card";
import { Dialog } from "./ui/dialog";

export type Method = { definition: Bi; formula: string; source: Bi; notes: Bi };

export function KpiCard({ label, value, change, changeLabel, description, method, goodWhenUp = true, compact = false }: {
  label: Bi; value: string; change: number | null; changeLabel: string; description: Bi; method: Method; goodWhenUp?: boolean; compact?: boolean;
}) {
  const { t } = usePrefs();
  const [open, setOpen] = useState(false);
  const dir = change == null || !Number.isFinite(change) ? 0 : change > 0.0005 ? 1 : change < -0.0005 ? -1 : 0;
  const good = dir === 0 ? null : (dir > 0) === goodWhenUp;
  const Icon = dir > 0 ? ArrowUpRight : dir < 0 ? ArrowDownRight : Minus;
  return (
    <Card className="flex min-w-0 flex-col gap-1.5 p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[12.5px] font-medium text-ink-2">{t(label)}</span>
        <button
          type="button" onClick={() => setOpen(true)}
          className="-m-1 rounded p-1 text-ink-3 hover:bg-surface-2 hover:text-ink cursor-pointer"
          aria-label={`${t(L("Metodología", "Methodology"))}: ${t(label)}`}
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </div>
      <span className={compact ? "text-[17px] font-semibold leading-snug text-ink" : `num truncate ${value.length > 11 ? "text-[21px]" : "text-[26px]"} font-semibold leading-tight tracking-tight text-ink`} title={value}>{value}</span>
      <span className={`num inline-flex items-center gap-1 text-[12.5px] font-medium ${good == null ? "text-ink-3" : good ? "text-good" : "text-bad"}`}>
        <Icon aria-hidden className="h-3.5 w-3.5" />
        {changeLabel}
      </span>
      <p className="text-[12px] leading-snug text-ink-3">{t(description)}</p>
      <Dialog open={open} onClose={() => setOpen(false)} title={`${t(L("Metodología", "Methodology"))} — ${t(label)}`}>
        <dl className="space-y-3">
          <div><dt className="font-medium text-ink">{t(L("Definición", "Definition"))}</dt><dd>{t(method.definition)}</dd></div>
          <div><dt className="font-medium text-ink">{t(L("Fórmula", "Formula"))}</dt><dd><code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[12.5px] text-ink">{method.formula}</code></dd></div>
          <div><dt className="font-medium text-ink">{t(L("Fuente", "Source"))}</dt><dd>{t(method.source)}</dd></div>
          <div><dt className="font-medium text-ink">{t(L("Notas y exclusiones", "Notes and exclusions"))}</dt><dd>{t(method.notes)}</dd></div>
        </dl>
      </Dialog>
    </Card>
  );
}
