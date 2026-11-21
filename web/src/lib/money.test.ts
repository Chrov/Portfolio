// node --test --experimental-strip-types src/lib/money.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { FX, factor, fillMoney, money, setActiveMoney } from "./money.ts";

test("native currency is never converted", () => {
  assert.equal(factor("olist", "BRL"), 1);
  assert.equal(factor("market", "CLP"), 1);
  assert.equal(factor("copper", "USD"), 1);
});

test("conversions use the period's official averages and are consistent", () => {
  const o = FX.periods.olist;
  assert.ok(Math.abs(factor("olist", "USD") - o.usdPerBrl!) < 1e-12);
  assert.ok(Math.abs(factor("olist", "CLP") - o.usdPerBrl! * o.clpPerUsd) < 1e-9);
  assert.ok(Math.abs(factor("market", "USD") * FX.periods.market.clpPerUsd - 1) < 1e-12);
  assert.ok(Math.abs(factor("copper", "CLP") - FX.periods.copper.clpPerUsd) < 1e-12);
  // rates are plausible for their periods (guards against a swapped or stale file)
  assert.ok(o.usdPerBrl! > 0.2 && o.usdPerBrl! < 0.4);
  for (const p of Object.values(FX.periods)) assert.ok(p.clpPerUsd > 550 && p.clpPerUsd < 1100);
});

test("formatting follows the active currency and language", () => {
  setActiveMoney("CLP", 1);
  assert.equal(money(8992168, "es"), "CLP 8,99 M");
  assert.equal(money(46.9e12, "en"), "CLP 46.9 tn");
  setActiveMoney("USD", 1);
  assert.equal(money(49708369220, "es"), "US$ 49.708 M");
  assert.equal(money(49708369220, "en"), "US$ 49.71 B");
  setActiveMoney("BRL", 1);
  assert.equal(fillMoney("sumó ⟦m:5614133.04⟧ en total", "es"), "sumó R$ 5,61 M en total");
});
