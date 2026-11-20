import type { ChartTheme } from "@/lib/palette";
import { L, type Bi, type Lang } from "@/lib/prefs";
import { wilson } from "@/lib/stats";
import type { TalentData } from "@/lib/talentrisk";

export type Filters = { dept: string; role: string; tenure: string; overtime: string; level: string };
export const NO_FILTERS: Filters = { dept: "ALL", role: "ALL", tenure: "ALL", overtime: "ALL", level: "ALL" };

export const TENURE_BANDS = [
  { id: "0-2", lo: 0, hi: 2, label: L("0–2 años", "0–2 years") },
  { id: "3-5", lo: 3, hi: 5, label: L("3–5 años", "3–5 years") },
  { id: "6-10", lo: 6, hi: 10, label: L("6–10 años", "6–10 years") },
  { id: "11+", lo: 11, hi: 99, label: L("11+ años", "11+ years") },
];

export type TCtx = {
  d: TalentData; idx: number[]; f: Filters; ct: ChartTheme; lang: Lang; t: (b: Bi | string) => string;
};

export function applyFilters(d: TalentData, f: Filters): number[] {
  const r = d.rows, out: number[] = [];
  const band = TENURE_BANDS.find((b) => b.id === f.tenure);
  for (let i = 0; i < r.Attrition.length; i++) {
    if (f.dept !== "ALL" && r.Department[i] !== f.dept) continue;
    if (f.role !== "ALL" && r.JobRole[i] !== f.role) continue;
    if (f.overtime !== "ALL" && r.OverTime[i] !== f.overtime) continue;
    if (f.level !== "ALL" && String(r.JobLevel[i]) !== f.level) continue;
    if (band && (Number(r.YearsAtCompany[i]) < band.lo || Number(r.YearsAtCompany[i]) > band.hi)) continue;
    out.push(i);
  }
  return out;
}

export function describeFilters(c: Pick<TCtx, "f" | "d" | "lang">): string {
  const parts: string[] = [];
  const lv = (v: string) => (c.lang === "es" ? c.d.levelsEs[v] ?? v : v);
  if (c.f.dept !== "ALL") parts.push(lv(c.f.dept));
  if (c.f.role !== "ALL") parts.push(lv(c.f.role));
  if (c.f.tenure !== "ALL") parts.push(TENURE_BANDS.find((b) => b.id === c.f.tenure)!.label[c.lang]);
  if (c.f.overtime !== "ALL") parts.push(c.lang === "es" ? `horas extra: ${lv(c.f.overtime)}` : `overtime: ${c.f.overtime}`);
  if (c.f.level !== "ALL") parts.push(c.lang === "es" ? `nivel ${c.f.level}` : `level ${c.f.level}`);
  return parts.length ? parts.join(" · ") : c.lang === "es" ? "toda la organización" : "the whole organisation";
}

export const lvl = (c: { d: TalentData; lang: Lang }, v: string | number) => (c.lang === "es" ? c.d.levelsEs[String(v)] ?? String(v) : String(v));

export function rate(c: TCtx, sel: number[]) {
  const k = sel.reduce((s, i) => s + Number(c.d.rows.Attrition[i]), 0);
  const [lo, hi] = wilson(k, sel.length);
  return { k, n: sel.length, p: sel.length ? k / sel.length : NaN, lo, hi };
}

export const SRC: Bi = L("IBM HR Analytics Employee Attrition & Performance (Kaggle) · datos FICTICIOS creados por IBM · pipeline analytics/talentrisk",
  "IBM HR Analytics Employee Attrition & Performance (Kaggle) · FICTIONAL data created by IBM · pipeline analytics/talentrisk");
export const FT = {
  filters: L("Filtros de la organización", "Organisation filters"),
  none: L("Sin filtros: conjunto de prueba / modelo global", "No filters: test set / global model"),
  global: L("Sin filtros: 1.470 personas", "No filters: 1,470 people"),
};
