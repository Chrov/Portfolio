// node --test --experimental-strip-types src/lib/revenue.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { bucket, computeKpis, monthDays, priceVolume, simulate, type RevenueData } from "./revenue.ts";
import { robustAnomalies, sum, wilson } from "./stats.ts";
import { scoreProfile, rowProfile, type TalentData } from "./talentrisk.ts";

const rev: RevenueData = JSON.parse(fs.readFileSync(new URL("../../public/data/revenue.json", import.meta.url), "utf8"));
const tr: TalentData = JSON.parse(fs.readFileSync(new URL("../../public/data/talentrisk.json", import.meta.url), "utf8"));
const last = rev.calendar.months.length - 1;

test("month ranges tile the whole window", () => {
  const [a, b] = monthDays(rev.calendar, 0, last);
  assert.equal(a, 0);
  assert.equal(b, rev.calendar.days);
});

test("full-window KPIs equal pipeline totals", () => {
  const k = computeKpis(rev, "ALL", 0, last);
  assert.ok(Math.abs(k.revenue.value - rev.meta.windowRevenue) < 1);
  assert.equal(k.orders.value, rev.meta.windowOrders);
  assert.equal(k.customers.value, rev.meta.windowCustomers);
  assert.equal(k.hasPrev, false);
});

test("previous period has the same length and precedes the range", () => {
  const k = computeKpis(rev, "SE", last - 5, last);
  assert.ok(k.hasPrev && k.revenue.prev! > 0);
  const [pa, pb] = monthDays(rev.calendar, last - 11, last - 6);
  assert.ok(Math.abs(k.revenue.prev! - sum(rev.daily.SE.revenue, pa, pb)) < 1e-6);
});

test("weekly / monthly buckets preserve totals", () => {
  const [a, b] = monthDays(rev.calendar, 0, last);
  const total = sum(rev.daily.ALL.revenue, a, b);
  for (const g of ["week", "month"] as const) {
    const s = bucket(rev.calendar, rev.daily.ALL.revenue, a, b, g);
    assert.ok(Math.abs(s.values.reduce((x, y) => x + y, 0) - total) < 1e-3, g);
  }
});

test("price-volume components add up to the revenue change", () => {
  for (const r of priceVolume(rev, "ALL", 1, last)) assert.ok(Math.abs(r.volume + r.ticket - r.total) < 1e-6);
});

test("neutral scenario reproduces the measured baseline", () => {
  const s = simulate(rev, { orders: 0, ticket: 0, region: "SE", regionBoost: 0 });
  assert.ok(Math.abs(s.sim - s.base) < 1e-6);
});

test("browser anomaly rule matches the Python pipeline", () => {
  const flagged = robustAnomalies(rev.daily.ALL.revenue).map((x) => x.i);
  const py = rev.anomalies.map((x) => Math.round((Date.parse(x.date) - Date.parse(rev.calendar.start)) / 864e5));
  assert.deepEqual(flagged, py);
});

test("wilson interval brackets the proportion", () => {
  const [lo, hi] = wilson(30, 100);
  assert.ok(lo < 0.3 && hi > 0.3 && lo > 0.2 && hi < 0.4);
});

test("browser scorer: contributions + base equal the calibrated logit", () => {
  // Contributions + base must equal the calibrated logit for every employee.
  for (let i = 0; i < 50; i++) {
    const s = scoreProfile(tr.explorer, rowProfile(tr.rows, i));
    const total = Object.values(s.contributions).reduce((x, y) => x + y, 0) + s.baseLogOdds;
    assert.ok(Math.abs(total - s.logOdds) < 1e-9);
    assert.ok(s.probability > 0 && s.probability < 1);
  }
});
