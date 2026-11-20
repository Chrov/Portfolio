// Types + the exported logistic model, scored exactly as analytics/talentrisk/scoring.py.
import type { Bi } from "./prefs";
import type { Insight } from "./revenue";

export type NumFeat = { f: string; mean: number; std: number; w: number; label: Bi; min: number; max: number; median: number };
export type CatFeat = { f: string; label: Bi; levels: string[]; levelsEs: string[]; w: number[]; share: number[]; mode: string };
export type ExplorerModel = { intercept: number; platt: { a: number; b: number }; C: number; numeric: NumFeat[]; categorical: CatFeat[]; oofProbability: number[] };
export type TestMetrics = {
  label: Bi; threshold: number; prAuc: number; rocAuc: number; brier: number; brierUncalibrated: number;
  precision: number; recall: number; f1: number; roc: [number, number][]; pr: [number, number][];
};
export type Assoc = {
  feature: string; type: "categorical" | "numeric"; test: string; stat: number; p: number; pAdj: number;
  effect: number; effectName: string; label: Bi; medianLeft?: number; medianStayed?: number;
};
export type TalentData = {
  meta: {
    title: string; source: { name: string; url: string; license: string }; synthetic: boolean; generatedAt: string;
    quality: { rows: number; columns: number; missing: number; duplicates: number; constantDropped: string[]; idDropped: string[]; undocumentedDropped: string[]; sensitiveExcluded: string[] };
    attritionShare: number; leavers: number;
  };
  labels: Record<string, Bi>;
  levelsEs: Record<string, string>;
  rows: Record<string, (number | string)[]>;
  associations: Assoc[];
  model: {
    split: { train: number; test: number; testPositives: number; seed: number; stratified: boolean };
    cv: Record<string, { prAuc: number; prAucSe: number; rocAuc: number; rocAucSd: number; brierRaw: number; folds: number; label: Bi }>;
    cvScheme: string; selected: string; selectionRule: string; logregC: number; threshold: number;
    test: Record<string, TestMetrics>; confusion: number[][];
    calibration: { observed: number[]; predicted: number[]; rawObserved: number[]; rawPredicted: number[] };
    features: string[]; sensitiveAblation: { with: number; without: number };
  };
  shap: { importance: { f: string; value: number; label: Bi }[]; beeswarm: Record<string, [number, number, number | string][]>; order: string[]; space: string; explainer: string };
  explorer: ExplorerModel;
  fairness: { attr: string; group: string; groupEs: string; n: number; observed: number; meanScore: number; flagged: number; recall: number | null; precision: number | null }[];
  insights: Insight[];
};

export function isTalentData(d: unknown): d is TalentData {
  const x = d as TalentData;
  return !!x && typeof x === "object" && Array.isArray(x.rows?.Attrition) && !!x.explorer?.numeric && !!x.model?.test;
}

export type Profile = Record<string, number | string>;

export function scoreProfile(m: ExplorerModel, rec: Profile) {
  const a = m.platt.a;
  let logit = m.intercept, base = m.intercept;
  const contrib: Record<string, number> = {};
  for (const n of m.numeric) {
    const z = (Number(rec[n.f]) - n.mean) / n.std;
    if (!Number.isFinite(z)) throw new Error(`Invalid value for ${n.f}`);
    logit += n.w * z;
    contrib[n.f] = a * n.w * z;
  }
  for (const c of m.categorical) {
    const k = c.levels.indexOf(String(rec[c.f]));
    if (k < 0) throw new Error(`Unknown level ${rec[c.f]} for ${c.f}`);
    logit += c.w[k];
    const meanW = c.w.reduce((s, w, i) => s + w * c.share[i], 0);
    base += meanW;
    contrib[c.f] = a * (c.w[k] - meanW);
  }
  const cal = a * logit + m.platt.b, baseCal = a * base + m.platt.b;
  return { probability: 1 / (1 + Math.exp(-cal)), logOdds: cal, baseLogOdds: baseCal, baseProbability: 1 / (1 + Math.exp(-baseCal)), contributions: contrib };
}

export function rowProfile(rows: TalentData["rows"], i: number): Profile {
  const p: Profile = {};
  for (const k of Object.keys(rows)) p[k] = rows[k][i];
  return p;
}
