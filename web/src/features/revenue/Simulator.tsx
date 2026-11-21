"use client";
import { useMemo, useState } from "react";
import { EChart, type EOption } from "@/components/EChart";
import { base, barStyle, catAxis, legend, tipHead, tipRow, valueAxis } from "@/components/chart-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { monthLabel, signedPct } from "@/lib/format";
import { money, moneyAxis } from "@/lib/money";
import { L } from "@/lib/prefs";
import { simulate, type Scenario } from "@/lib/revenue";
import type { RCtx } from "./ctx";

/* eslint-disable @typescript-eslint/no-explicit-any */
const PRESETS: { id: string; label: ReturnType<typeof L>; s: Omit<Scenario, "region"> }[] = [
  { id: "cons", label: L("Conservador", "Conservative"), s: { orders: -0.05, ticket: 0, regionBoost: 0 } },
  { id: "mod", label: L("Moderado", "Moderate"), s: { orders: 0.05, ticket: 0.02, regionBoost: 0.05 } },
  { id: "opt", label: L("Optimista", "Optimistic"), s: { orders: 0.12, ticket: 0.05, regionBoost: 0.1 } },
];

export function Simulator({ c }: { c: RCtx }) {
  const { d, ct, lang, t } = c;
  const [s, setS] = useState<Scenario>({ orders: 0.05, ticket: 0.02, region: "NE", regionBoost: 0.05 });
  const r = useMemo(() => simulate(d, s), [d, s]);
  const names = r.rows.map((x) => { const g = d.regions.find((k) => k.id === x.id)!; return lang === "es" ? g.es : g.en; });
  const option = useMemo<EOption>(() => ({
    ...base(ct), legend: legend(ct), grid: { left: 8, right: 16, top: 32, bottom: 8, containLabel: true },
    xAxis: catAxis(ct, names), yAxis: valueAxis(ct, (v: number) => moneyAxis(v, lang)),
    tooltip: { ...base(ct).tooltip, axisPointer: { type: "shadow", shadowStyle: { color: ct.grid, opacity: 0.5 } }, formatter: (ps: any[]) => { const x = r.rows[ps[0].dataIndex]; return tipHead(names[ps[0].dataIndex]) + tipRow(ct.neutral, t(L("Base medida (12 meses)", "Measured baseline (12 months)")), money(x.base, lang, false)) + tipRow(ct.series[6], t(L("Escenario simulado", "Simulated scenario")), money(x.sim, lang, false)) + tipRow(ct.text, t(L("Diferencia", "Difference")), signedPct(x.sim / x.base - 1, lang)); } },
    series: [
      { name: t(L("Base medida", "Measured baseline")), type: "bar", data: r.rows.map((x) => x.base), itemStyle: barStyle(ct.neutral), barMaxWidth: 26, barGap: "10%" },
      { name: t(L("Simulado", "Simulated")), type: "bar", data: r.rows.map((x) => x.sim), itemStyle: barStyle(ct.series[6]), barMaxWidth: 26 },
    ],
  }), [r, names, ct, lang, t]);
  const pctFmt = (v: number) => signedPct(v, lang, 0);
  return (
    <Card id="simulator" className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-sim-bg px-5 py-3">
        <div>
          <Badge tone="simulated">{t(L("SIMULACIÓN · supuestos explícitos", "SIMULATION · explicit assumptions"))}</Badge>
          <h3 className="mt-1 text-[15px] font-semibold">{t(L("Simulador de escenarios comerciales", "Commercial scenario simulator"))}</h3>
        </div>
        <p className="max-w-xl text-[12.5px] text-sim-text">
          {t(L("Esto no es una predicción: aplica tus supuestos a los últimos 12 meses medidos. El pronóstico estadístico está en la sección 05.",
            "This is not a prediction: it applies your assumptions to the last 12 measured months. The statistical forecast is in section 05."))}
        </p>
      </div>
      <div className="grid gap-6 p-5 lg:grid-cols-[320px_1fr]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t(L("Escenarios predefinidos", "Preset scenarios"))}>
            {PRESETS.map((p) => (
              <Button key={p.id} size="sm" onClick={() => setS({ ...s, ...p.s })}>{t(p.label)}</Button>
            ))}
          </div>
          <Slider label={t(L("Variación en número de pedidos", "Change in order count"))} value={Math.round(s.orders * 100)} min={-30} max={30} onChange={(v) => setS({ ...s, orders: v / 100 })} format={(v) => pctFmt(v / 100)} />
          <Slider label={t(L("Variación del ticket promedio", "Change in average ticket"))} value={Math.round(s.ticket * 100)} min={-20} max={20} onChange={(v) => setS({ ...s, ticket: v / 100 })} format={(v) => pctFmt(v / 100)} />
          <Select label={t(L("Región con crecimiento adicional", "Region with extra growth"))} value={s.region} onChange={(e) => setS({ ...s, region: e.target.value })}>
            {d.regions.slice(1).map((g) => <option key={g.id} value={g.id}>{lang === "es" ? g.es : g.en}</option>)}
          </Select>
          <Slider label={t(L("Crecimiento adicional de pedidos en esa región", "Extra order growth in that region"))} value={Math.round(s.regionBoost * 100)} min={0} max={40} onChange={(v) => setS({ ...s, regionBoost: v / 100 })} format={(v) => pctFmt(v / 100)} />
          <div className="rounded-lg border border-line p-3 text-[12.5px] leading-relaxed text-ink-2">
            <p className="font-medium text-ink">{t(L("Fórmula", "Formula"))}</p>
            <code className="mt-1 block font-mono text-[12px] text-ink">Σᵣ Oᵣ·(1 + Δo + gᵣ) · Tᵣ·(1 + Δt)</code>
            <p className="mt-1">{t(L(`Oᵣ y Tᵣ = pedidos y ticket medidos por región entre ${monthLabel(r.from, "es", true)} y ${monthLabel(r.to, "es", true)}; gᵣ solo aplica a la región elegida.`,
              `Oᵣ and Tᵣ = orders and ticket measured by region from ${monthLabel(r.from, "en", true)} to ${monthLabel(r.to, "en", true)}; gᵣ applies only to the chosen region.`))}</p>
          </div>
        </div>
        <div className="min-w-0">
          <div className="grid grid-cols-3 gap-3">
            {[
              [t(L("Base medida (12 meses)", "Measured baseline (12 months)")), money(r.base, lang), "measured"],
              [t(L("Escenario simulado", "Simulated scenario")), money(r.sim, lang), "simulated"],
              [t(L("Diferencia", "Difference")), `${money(r.delta, lang)} (${signedPct(r.change, lang)})`, "simulated"],
            ].map(([k, v, tone]) => (
              <div key={k} className="rounded-lg border border-line p-3">
                <Badge tone={tone as "measured" | "simulated"}>{tone === "measured" ? t(L("Medido", "Measured")) : t(L("Simulado", "Simulated"))}</Badge>
                <p className="mt-2 text-[12px] text-ink-3">{k}</p>
                <p className="num text-lg font-semibold tracking-tight md:text-xl">{v}</p>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <EChart option={option} height={260} label={t(L("Barras de ingreso base frente a simulado por región", "Bars of baseline vs simulated revenue by region"))} />
          </div>
          <p className="mt-2 text-[12px] text-ink-3">
            {t(L("Los supuestos son ilustrativos. Antes de usar un escenario para presupuestar, valida elasticidades de precio y capacidad de captación con datos de la empresa.",
              "Assumptions are illustrative. Before budgeting on a scenario, validate price elasticities and acquisition capacity with company data."))}
          </p>
        </div>
      </div>
    </Card>
  );
}
