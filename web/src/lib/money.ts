// Currency display for the apps: every amount is stored in its native currency
// (BRL for Olist, CLP for the market stall, USD for copper) and converted only for
// display, with the average official rate of the period the amounts belong to
// (analytics/common/fx.py -> public/data/fx.json). Percentages never change.
import fxData from "../../public/data/fx.json" with { type: "json" };
import type { Bi, Lang } from "./prefs";

export type Cur = "BRL" | "USD" | "CLP";
export type FxKey = keyof typeof fxData.periods;
type Period = { from: string; to: string; native: string; label: Bi; clpPerUsd: number; usdPerBrl?: number };

export const FX = fxData as unknown as { generatedAt: string; sources: Record<"CLP" | "BRL", Bi>; periods: Record<FxKey, Period> };

const loc = (l: Lang) => (l === "es" ? "es-CL" : "en-US");
const SYMBOL: Record<Cur, string> = { BRL: "R$", USD: "US$", CLP: "CLP" };

/** Multiplier from the native currency of a period to `to`. */
export function factor(key: FxKey, to: Cur): number {
  const p = FX.periods[key];
  const native = p.native as Cur;
  const toUsd = native === "USD" ? 1 : native === "BRL" ? p.usdPerBrl! : 1 / p.clpPerUsd;
  const fromUsd = to === "USD" ? 1 : to === "CLP" ? p.clpPerUsd : 1 / p.usdPerBrl!;
  return native === to ? 1 : toUsd * fromUsd;
}

// Active display currency. Set by the app component on every render (before any
// chart formatter runs), so plain formatter functions can stay outside React.
let active: { code: Cur; f: number } = { code: "BRL", f: 1 };
export function setActiveMoney(code: Cur, f: number) { active = { code, f }; }
export function activeCurrency() { return active.code; }

function fmtNum(v: number, l: Lang, max: number, min = 0) {
  return v.toLocaleString(loc(l), { maximumFractionDigits: max, minimumFractionDigits: min });
}

/** Format a native amount in the active currency. compact: 1,23 M / 12,3 k. */
export function money(v: number, l: Lang, compact = true): string {
  if (!Number.isFinite(v)) return "—";
  const x = v * active.f, a = Math.abs(x), s = SYMBOL[active.code];
  if (active.code === "CLP") {
    // 10¹² = "billón" in Spanish, "trillion" in English
    if (compact && a >= 1e12) return `${s} ${fmtNum(x / 1e12, l, 1)} ${l === "es" ? "bill." : "tn"}`;
    if (compact && a >= 1e6) return `${s} ${fmtNum(x / 1e6, l, a >= 1e8 ? 0 : a >= 1e7 ? 1 : 2)} M`;
    return `${s} ${fmtNum(x, l, 0)}`;
  }
  // Spanish readers use "millones" for large figures; "B" would be ambiguous (billón = 10¹²).
  if (compact && a >= 1e9) return l === "es" ? `${s} ${fmtNum(x / 1e6, l, 0)} M` : `${s} ${fmtNum(x / 1e9, l, 2, 2)} B`;
  if (compact && a >= 1e6) return `${s} ${fmtNum(x / 1e6, l, 2, 2)} M`;
  if (compact && a >= 1e4) return `${s} ${fmtNum(x / 1e3, l, 1)} k`;
  return `${s} ${fmtNum(x, l, a < 1000 ? 2 : 0, a < 1000 ? 2 : 0)}`;
}

/** Axis ticks: compact above 10k (above 1M for CLP), whole units below. */
export function moneyAxis(v: number, l: Lang): string {
  const a = Math.abs(v * active.f);
  if (active.code === "CLP") return a >= 1e6 ? money(v, l) : `${SYMBOL.CLP} ${fmtNum(v * active.f, l, 0)}`;
  return a >= 1e4 ? money(v, l) : `${SYMBOL[active.code]} ${fmtNum(v * active.f, l, 0)}`;
}

/** Explains the conversion in one line, in the current language. */
export function fxNote(key: FxKey, code: Cur, l: Lang): string {
  const p = FX.periods[key];
  const native = p.native as Cur;
  if (code === native) {
    return l === "es" ? `Montos en moneda original (${native}).` : `Amounts in their original currency (${native}).`;
  }
  const parts: string[] = [];
  if (native === "BRL" || code === "BRL") parts.push(`1 US$ = ${fmtNum(1 / p.usdPerBrl!, l, 3)} R$`);
  if (native === "CLP" || code === "CLP") parts.push(`1 US$ = ${fmtNum(p.clpPerUsd, l, 2)} CLP`);
  const src = [native, code].includes("BRL") ? `${FX.sources.BRL[l]}; ${FX.sources.CLP[l]}` : FX.sources.CLP[l];
  return l === "es"
    ? `Convertido desde ${native} con ${parts.join(" y ")} (${p.label.es}). Fuente: ${src}. Solo cambia la unidad de lectura: porcentajes y rankings son idénticos.`
    : `Converted from ${native} at ${parts.join(" and ")} (${p.label.en}). Source: ${src}. Only the reading unit changes: percentages and rankings are identical.`;
}

/** Active currency symbol, for axis names and table headers. */
export const cs = () => SYMBOL[active.code];

/** Converted number without symbol (tables). CLP has no decimals. */
export function mnum(v: number, l: Lang, digits = 0): string {
  if (!Number.isFinite(v)) return "—";
  return fmtNum(v * active.f, l, active.code === "CLP" ? 0 : digits, active.code === "CLP" ? 0 : digits);
}

/** Bin edge in the active currency, rounded for reading (e.g. histogram buckets). */
export function edge(v: number, l: Lang): string {
  const x = v * active.f;
  return fmtNum(x, l, active.code === "CLP" || Math.abs(x) >= 100 || Number.isInteger(x) ? 0 : 1);
}

/** Replace ⟦m:123.4⟧ tokens written by the pipelines with formatted amounts. */
export function fillMoney(s: string, l: Lang): string {
  return s.replace(/⟦m:(-?[\d.]+)⟧/g, (_, x) => money(Number(x), l));
}
