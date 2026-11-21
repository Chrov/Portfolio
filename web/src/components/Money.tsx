"use client";
import { Coins } from "lucide-react";
import { FX, factor, fxNote, setActiveMoney, type Cur, type FxKey } from "@/lib/money";
import { L, usePrefs, type CurPref } from "@/lib/prefs";
import { cn } from "./ui/cn";

/** Resolve the viewer's currency for this app and activate it for every formatter. */
export function useMoney(key: FxKey) {
  const { cur, lang } = usePrefs();
  const native = FX.periods[key].native as Cur;
  const code: Cur = cur === "native" ? native : cur;
  setActiveMoney(code, factor(key, code));
  return { code, native, note: fxNote(key, code, lang) };
}

export function CurrencyToggle({ fxKey }: { fxKey: FxKey }) {
  const { cur, setCur, t } = usePrefs();
  const native = FX.periods[fxKey].native as Cur;
  const opts: { v: CurPref; label: string }[] = [{ v: "native", label: native }];
  for (const c of ["USD", "CLP"] as const) if (c !== native) opts.push({ v: c, label: c });
  const value: CurPref = cur === native ? "native" : cur;
  return (
    <div className="inline-flex items-center rounded-md border border-line p-0.5" role="radiogroup" aria-label={t(L("Moneda de los montos", "Currency for amounts"))}>
      <Coins aria-hidden className="mx-1 hidden h-3.5 w-3.5 text-ink-3 sm:block" />
      {opts.map((o) => (
        <button key={o.v} type="button" role="radio" aria-checked={value === o.v} onClick={() => setCur(o.v)}
          title={o.v === "native" ? t(L("Moneda original del dataset", "Dataset's original currency")) : t(L("Conversión con tipo de cambio oficial promedio del período", "Converted at the period's average official rate"))}
          className={cn("h-7 rounded-[5px] px-1.5 font-mono text-[11.5px] font-semibold cursor-pointer sm:px-2", value === o.v ? "bg-ink text-surface" : "text-ink-3 hover:text-ink")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function FxNote({ note, className }: { note: string; className?: string }) {
  return <p className={cn("text-[11.5px] leading-snug text-ink-3", className)}>{note}</p>;
}
