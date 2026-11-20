// Types + pure calculations for Revenue Intelligence (unit-tested in revenue.test.ts).
import type { Bi } from "./prefs";
import { sum } from "./stats.ts";

export type Daily = { revenue: number[]; orders: number[]; items: number[]; freight: number[] };
export type Segment = { id: string; label: Bi; customers: number; revenue: number; share: number; avgValue: number; avgRecency: number; avgOrders: number };
export type Customers = {
  customers: number; revenue: number; repeatRate: number; repeatRevenueShare: number; freqDist: number[];
  concentration: number[]; top10Share: number; top1Share: number; valueHist: { edges: number[]; counts: number[] };
  medianValue: number; segments: Segment[];
};
export type Insight = { id: string; kind: "measured" | "simulated" | "expected"; title: Bi; evidence: Bi; why: Bi; action: Bi; validate: Bi };
export type ModelMetric = { model: string; label: Bi; baseline: boolean; wmape: number; mae: number; bias: number; wmapeByH: number[] };
export type RevenueData = {
  meta: {
    title: string; source: { name: string; url: string; license: string; kaggleVersion: number }; generatedAt: string;
    window: { start: string; end: string }; rawOrders: number; validOrdersAllTime: number; excludedOrders: number;
    windowOrders: number; windowItems: number; windowCustomers: number; windowRevenue: number;
  };
  checks: { check: string; passed: boolean; detail: string }[];
  calendar: { start: string; days: number; months: string[] };
  regions: { id: string; es: string; en: string }[];
  categories: { id: string; revenue: number; es: string; en: string }[];
  daily: Record<string, Daily>;
  customersByRange: Record<string, (number | null)[][]>;
  catMonthly: Record<string, { revenue: number[][]; units: number[][]; orders: number[][] }>;
  heat: Record<string, number[][]>;
  hist: { edges: number[] } & Record<string, number[][]>;
  delivery: { buckets: Bi[] } & Record<string, { count: number[][]; reviewSum: number[][] }>;
  priceBox: Record<string, { category: string; q1: number; median: number; q3: number; lo: number; hi: number; n: number; outliers: number; mean: number }[]>;
  topProducts: Record<string, { id: string; category: string; revenue: number; units: number; orders: number; avgPrice: number }[]>;
  customers: Record<string, Customers>;
  states: { id: string; region: string; revenue: number[]; orders: number[] }[];
  anomalies: { date: string; value: number; expected: number; z: number }[];
  forecast: {
    weeks: string[]; actual: number[]; horizon: number; origins: number[]; backtestPred: Record<string, Record<string, number[]>>;
    metrics: ModelMetric[]; selected: string; bestBaseline: string; improvementVsBaseline: number;
    interval: { level: number; relLo: number; relHi: number; holdoutCoverage: number; holdoutN: number };
    future: { weeks: string[]; pred: number[]; lo: number[]; hi: number[]; baseline: number[] };
  };
  insights: Insight[];
};

export function isRevenueData(d: unknown): d is RevenueData {
  const x = d as RevenueData;
  return !!x && typeof x === "object" && !!x.daily?.ALL?.revenue && Array.isArray(x.calendar?.months) && !!x.forecast?.metrics;
}

const DAY = 86400000;
const toUTC = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +(iso.slice(8, 10) || 1));

export function dayIndex(cal: RevenueData["calendar"], iso: string) {
  return Math.round((toUTC(iso) - toUTC(cal.start)) / DAY);
}
export function dayISO(cal: RevenueData["calendar"], i: number) {
  return new Date(toUTC(cal.start) + i * DAY).toISOString().slice(0, 10);
}
/** Half-open day range [a, b) covering months i..j (inclusive). */
export function monthDays(cal: RevenueData["calendar"], i: number, j: number): [number, number] {
  const a = dayIndex(cal, cal.months[i] + "-01");
  const [y, m] = cal.months[j].split("-").map(Number);
  const next = `${m === 12 ? y + 1 : y}-${String((m % 12) + 1).padStart(2, "0")}-01`;
  return [a, dayIndex(cal, next)];
}

export type Kpi = { value: number; prev: number | null; change: number | null };
export type Kpis = {
  revenue: Kpi; orders: Kpi; ticket: Kpi; customers: Kpi; yoy: Kpi; freight: number;
  topCategory: { id: string; share: number; revenue: number } | null; months: number; hasPrev: boolean;
};

const mk = (value: number, prev: number | null): Kpi => ({ value, prev, change: prev ? value / prev - 1 : null });

export function computeKpis(d: RevenueData, region: string, i: number, j: number): Kpis {
  const daily = d.daily[region];
  const n = j - i + 1;
  const [a, b] = monthDays(d.calendar, i, j);
  const rev = sum(daily.revenue, a, b), ord = sum(daily.orders, a, b);
  const hasPrev = i - n >= 0;
  let pRev: number | null = null, pOrd: number | null = null, pCust: number | null = null;
  if (hasPrev) {
    const [pa, pb] = monthDays(d.calendar, i - n, i - 1);
    pRev = sum(daily.revenue, pa, pb); pOrd = sum(daily.orders, pa, pb);
    pCust = d.customersByRange[region][i - n][i - 1];
  }
  let yoy: Kpi = { value: rev, prev: null, change: null };
  if (i - 12 >= 0) {
    const [ya, yb] = monthDays(d.calendar, i - 12, j - 12);
    yoy = mk(rev, sum(daily.revenue, ya, yb));
  }
  const cm = d.catMonthly[region].revenue;
  let best = -1, bestV = 0;
  cm.forEach((row, k) => { const v = sum(row, i, j + 1); if (v > bestV) { bestV = v; best = k; } });
  return {
    revenue: mk(rev, pRev), orders: mk(ord, pOrd),
    ticket: mk(ord ? rev / ord : 0, pOrd ? (pRev as number) / pOrd : null),
    customers: mk(d.customersByRange[region][i][j] ?? 0, pCust),
    yoy, freight: sum(daily.freight, a, b),
    topCategory: best >= 0 ? { id: d.categories[best].id, share: rev ? bestV / rev : 0, revenue: bestV } : null,
    months: n, hasPrev,
  };
}

export type Gran = "day" | "week" | "month";
/** Aggregate a daily array over [a, b) to day / ISO-week (Mon start) / month buckets. */
export function bucket(cal: RevenueData["calendar"], values: number[], a: number, b: number, gran: Gran) {
  const labels: string[] = [], out: number[] = [], partial: boolean[] = [];
  if (gran === "day") {
    for (let k = a; k < b; k++) { labels.push(dayISO(cal, k)); out.push(values[k]); partial.push(false); }
    return { labels, values: out, partial };
  }
  let key = "", acc = 0, count = 0;
  const flush = (expected: number) => { if (key) { labels.push(key); out.push(acc); partial.push(count < expected); } };
  for (let k = a; k < b; k++) {
    const iso = dayISO(cal, k);
    let kk: string;
    if (gran === "month") kk = iso.slice(0, 7);
    else {
      const dow = (new Date(toUTC(iso)).getUTCDay() + 6) % 7;     // Monday = 0
      kk = dayISO(cal, k - dow);
    }
    if (kk !== key) { flush(gran === "week" ? 7 : 28); key = kk; acc = 0; count = 0; }
    acc += values[k]; count++;
  }
  flush(gran === "week" ? 7 : 28);
  return { labels, values: out, partial };
}

/** Month-over-month price/volume decomposition: ΔR = ΔO·T0 + O1·ΔT. */
export function priceVolume(d: RevenueData, region: string, i: number, j: number) {
  const rows: { month: string; volume: number; ticket: number; total: number }[] = [];
  for (let m = Math.max(i, 1); m <= j; m++) {
    const [a0, b0] = monthDays(d.calendar, m - 1, m - 1), [a1, b1] = monthDays(d.calendar, m, m);
    const dd = d.daily[region];
    const r0 = sum(dd.revenue, a0, b0), o0 = sum(dd.orders, a0, b0), r1 = sum(dd.revenue, a1, b1), o1 = sum(dd.orders, a1, b1);
    if (!o0 || !o1) continue;
    const t0 = r0 / o0, t1 = r1 / o1;
    rows.push({ month: d.calendar.months[m], volume: (o1 - o0) * t0, ticket: o1 * (t1 - t0), total: r1 - r0 });
  }
  return rows;
}

export type Scenario = { orders: number; ticket: number; region: string; regionBoost: number };
/** Simulated annual revenue = Σ_r O_r(1 + Δo + g_r) · T_r(1 + Δt), baseline = last 12 measured months. */
export function simulate(d: RevenueData, s: Scenario) {
  const nM = d.calendar.months.length;
  const [a, b] = monthDays(d.calendar, nM - 12, nM - 1);
  const rows = d.regions.slice(1).map((r) => {
    const O = sum(d.daily[r.id].orders, a, b), R = sum(d.daily[r.id].revenue, a, b), T = O ? R / O : 0;
    const g = s.region === r.id ? s.regionBoost : 0;
    const sim = O * (1 + s.orders + g) * T * (1 + s.ticket);
    return { id: r.id, orders: O, ticket: T, base: R, sim };
  });
  const base = rows.reduce((x, r) => x + r.base, 0), sim = rows.reduce((x, r) => x + r.sim, 0);
  return { rows, base, sim, delta: sim - base, change: sim / base - 1, from: d.calendar.months[nM - 12], to: d.calendar.months[nM - 1] };
}
