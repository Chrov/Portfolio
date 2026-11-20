import type { Lang } from "./prefs";

const loc = (l: Lang) => (l === "es" ? "es-CL" : "en-US");

export function brl(v: number, l: Lang, compact = true): string {
  if (!Number.isFinite(v)) return "—";
  if (compact && Math.abs(v) >= 1e6) return `R$ ${(v / 1e6).toLocaleString(loc(l), { maximumFractionDigits: 2, minimumFractionDigits: 2 })} M`;
  if (compact && Math.abs(v) >= 1e4) return `R$ ${(v / 1e3).toLocaleString(loc(l), { maximumFractionDigits: 1 })} k`;
  return `R$ ${v.toLocaleString(loc(l), { maximumFractionDigits: 2, minimumFractionDigits: Math.abs(v) < 1000 ? 2 : 0 })}`;
}
/** Axis ticks: compact above 10k, whole reais below. */
export function brlAxis(v: number, l: Lang): string {
  return Math.abs(v) >= 1e4 ? brl(v, l) : `R$ ${num(v, l)}`;
}
export function usd(v: number, l: Lang): string {
  return `US$ ${v.toLocaleString(loc(l), { maximumFractionDigits: 0 })}`;
}
export function num(v: number, l: Lang, digits = 0): string {
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString(loc(l), { maximumFractionDigits: digits, minimumFractionDigits: digits });
}
export function pct(v: number, l: Lang, digits = 1): string {
  if (!Number.isFinite(v)) return "—";
  return `${(v * 100).toLocaleString(loc(l), { maximumFractionDigits: digits, minimumFractionDigits: digits })}%`;
}
export function signedPct(v: number, l: Lang, digits = 1): string {
  if (!Number.isFinite(v)) return "—";
  return `${v > 0 ? "+" : v < 0 ? "−" : "±"}${pct(Math.abs(v), l, digits)}`;
}
export function pp(v: number, l: Lang, digits = 1): string {
  if (!Number.isFinite(v)) return "—";
  return `${v > 0 ? "+" : v < 0 ? "−" : "±"}${num(Math.abs(v * 100), l, digits)} pp`;
}

const MONTHS = {
  es: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};
export function monthLabel(ym: string, l: Lang, long = false): string {
  const [y, m] = ym.split("-").map(Number);
  return long ? `${MONTHS[l][m - 1]} ${y}` : `${MONTHS[l][m - 1]} ${String(y).slice(2)}`;
}
export function dateLabel(iso: string, l: Lang): string {
  const [y, m, d] = iso.split("-").map(Number);
  return l === "es" ? `${d} ${MONTHS.es[m - 1]} ${y}` : `${MONTHS.en[m - 1]} ${d}, ${y}`;
}
export const WEEKDAYS = {
  es: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
};
