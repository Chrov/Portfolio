import type { ChartTheme } from "@/lib/palette";
import { L, type Bi, type Lang } from "@/lib/prefs";
import type { RevenueData } from "@/lib/revenue";

export type RCtx = {
  d: RevenueData; region: string; from: number; to: number; ct: ChartTheme; lang: Lang;
  t: (b: Bi | string) => string;
};

export const SRC: Bi = L("Olist, Brazilian E-Commerce Public Dataset (Kaggle, CC BY-NC-SA 4.0) · pipeline analytics/revenue",
  "Olist, Brazilian E-Commerce Public Dataset (Kaggle, CC BY-NC-SA 4.0) · pipeline analytics/revenue");

export const F = {
  region: L("Región", "Region"),
  period: L("Período", "Period"),
  regionOnly: L("Región (período: ventana completa)", "Region (period: full window)"),
  none: L("Sin filtros: Brasil total", "No filters: Brazil total"),
};

export const regionName = (c: RCtx) => {
  const r = c.d.regions.find((x) => x.id === c.region)!;
  return c.lang === "es" ? r.es : r.en;
};
export const catName = (c: RCtx, id: string) => {
  const k = c.d.categories.find((x) => x.id === id);
  return k ? (c.lang === "es" ? k.es : k.en) : id;
};
