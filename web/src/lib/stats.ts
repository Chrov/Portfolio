// Small, dependency-free statistics used by the dashboards (mirrors the Python pipeline).

export function sum(a: ArrayLike<number>, from = 0, to = a.length): number {
  let s = 0;
  for (let i = from; i < to; i++) s += a[i];
  return s;
}

export function wilson(k: number, n: number, z = 1.96): [number, number] {
  if (n === 0) return [0, 0];
  const p = k / n, d = 1 + (z * z) / n;
  const c = (p + (z * z) / (2 * n)) / d;
  const h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [c - h, c + h];
}

export function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return NaN;
  const pos = (sorted.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function median(a: number[]): number {
  return quantile([...a].sort((x, y) => x - y), 0.5);
}

export function boxStats(values: number[]) {
  const s = [...values].sort((x, y) => x - y);
  const q1 = quantile(s, 0.25), med = quantile(s, 0.5), q3 = quantile(s, 0.75);
  const iqr = q3 - q1;
  const inside = s.filter((v) => v >= q1 - 1.5 * iqr && v <= q3 + 1.5 * iqr);
  return { q1, median: med, q3, lo: inside[0], hi: inside[inside.length - 1], n: s.length, outliers: s.length - inside.length };
}

/** Robust anomaly flags: |0.6745 (x - rolling median) / rolling MAD| > z, centred window. */
export function robustAnomalies(values: number[], window = 28, z = 3.5, minPeriods = 7) {
  const half = Math.floor(window / 2);
  const med: number[] = [], out: { i: number; z: number; expected: number }[] = [];
  const winMedian = (arr: number[], i: number) => {
    // pandas rolling(window, center=True) at i covers [i - half, i - half + window) (verified)
    const a = Math.max(0, i - half), b = Math.min(arr.length, i - half + window);
    const w = arr.slice(a, b).filter(Number.isFinite);
    return w.length >= minPeriods ? median(w) : NaN;
  };
  for (let i = 0; i < values.length; i++) med.push(winMedian(values, i));
  const dev = values.map((v, i) => Math.abs(v - med[i]));
  for (let i = 0; i < values.length; i++) {
    const mad = winMedian(dev, i);
    if (!mad || !Number.isFinite(mad)) continue;
    const rz = (0.6745 * (values[i] - med[i])) / mad;
    if (Math.abs(rz) > z) out.push({ i, z: rz, expected: med[i] });
  }
  return out;
}
