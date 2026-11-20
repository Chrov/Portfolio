"use client";
import { AlertTriangle } from "lucide-react";
import { useMemo, useState } from "react";
import { EChart, type EOption } from "@/components/EChart";
import { base, barStyle, catAxis, legend, tipHead, tipNote, tipRow, valueAxis } from "@/components/chart-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { num, pct, pp } from "@/lib/format";
import { L } from "@/lib/prefs";
import { rowProfile, scoreProfile, type Profile } from "@/lib/talentrisk";
import { describeFilters, lvl, type TCtx } from "./ctx";

/* eslint-disable @typescript-eslint/no-explicit-any */

function medianProfile(c: TCtx): Profile {
  const p: Profile = {};
  for (const n of c.d.explorer.numeric) p[n.f] = Math.round(n.median);
  for (const k of c.d.explorer.categorical) p[k.f] = k.mode;
  return p;
}

export function RiskExplorer({ c }: { c: TCtx }) {
  const { d, ct, lang, t } = c;
  const m = d.explorer;
  const [p, setP] = useState<Profile>(() => medianProfile(c));
  const [all, setAll] = useState(false);
  const r = useMemo(() => { try { return { ok: true as const, ...scoreProfile(m, p) }; } catch (e) { return { ok: false as const, error: (e as Error).message }; } }, [m, p]);
  const importance = d.shap.importance.map((x) => x.f);
  const numShown = m.numeric.filter((n) => all || importance.slice(0, 10).includes(n.f)).sort((a, b) => importance.indexOf(a.f) - importance.indexOf(b.f));
  const catShown = m.categorical.filter((k) => all || importance.slice(0, 10).includes(k.f));
  const contrib = r.ok ? Object.entries(r.contributions).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 10) : [];
  const names = contrib.map(([f]) => t(d.labels[f]));
  const option = useMemo<EOption>(() => ({
    ...base(ct), grid: { left: 8, right: 40, top: 8, bottom: 26, containLabel: true },
    yAxis: catAxis(ct, names, { inverse: true, axisLabel: { color: ct.text2, fontSize: 11.5 } }),
    xAxis: valueAxis(ct, (v: number) => v.toFixed(1), { name: t(L("Aporte al log-odds (← menos riesgo · más riesgo →)", "Contribution to log-odds (← less risk · more risk →)")), nameLocation: "middle", nameGap: 22 }),
    tooltip: { ...base(ct).tooltip, axisPointer: { type: "shadow", shadowStyle: { color: ct.grid, opacity: 0.5 } }, formatter: (ps: any[]) => { const [f, v] = contrib[ps[0].dataIndex]; return tipHead(names[ps[0].dataIndex]) + tipRow(v > 0 ? ct.divPos : ct.divNeg, t(L("Aporte", "Contribution")), (v > 0 ? "+" : "") + v.toFixed(3)) + tipNote(`${t(L("Valor", "Value"))}: ${lvl(c, String(p[f]))}`); } },
    series: [{ type: "bar", barMaxWidth: 16, data: contrib.map(([, v]) => ({ value: v, itemStyle: barStyle(v > 0 ? ct.divPos : ct.divNeg, true) })),
      label: { show: true, position: "right", fontSize: 10.5, color: ct.text2, formatter: (x: any) => (x.value > 0 ? "+" : "") + x.value.toFixed(2) },
      markLine: { silent: true, symbol: "none", lineStyle: { color: ct.axis }, label: { show: false }, data: [{ xAxis: 0 }] } }],
  }), [contrib, names, ct, t, c, p]);
  const randomRow = () => setP(rowProfile(d.rows, Math.floor(Math.random() * d.rows.Attrition.length)));
  return (
    <Card id="explorer" className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-warn-bg px-5 py-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn-text" aria-hidden />
          <p className="max-w-3xl text-[12.5px] text-warn-text">
            {t(L("Demostración educativa con datos ficticios. No debe usarse para decidir despidos, ascensos, remuneraciones ni ninguna acción sobre personas reales.",
              "Educational demo on fictional data. It must not be used to decide dismissals, promotions, pay or any action on real people."))}
          </p>
        </div>
      </div>
      <div className="grid gap-6 p-5 xl:grid-cols-[380px_1fr]">
        <div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            <Button size="sm" onClick={() => setP(medianProfile(c))}>{t(L("Perfil típico", "Typical profile"))}</Button>
            <Button size="sm" onClick={randomRow}>{t(L("Perfil al azar del dataset", "Random dataset profile"))}</Button>
            <Button size="sm" variant="ghost" onClick={() => setAll(!all)} aria-expanded={all}>{all ? t(L("Ver menos variables", "Fewer variables")) : t(L(`Ver las ${m.numeric.length + m.categorical.length} variables`, `Show all ${m.numeric.length + m.categorical.length} variables`))}</Button>
          </div>
          <div className="grid max-h-[520px] gap-3 overflow-y-auto pr-2">
            {catShown.map((k) => (
              <Select key={k.f} label={t(k.label)} value={String(p[k.f])} onChange={(e) => setP({ ...p, [k.f]: e.target.value })}>
                {k.levels.map((v, i) => <option key={v} value={v}>{lang === "es" ? k.levelsEs[i] : v}</option>)}
              </Select>
            ))}
            {numShown.map((n) => (
              <Slider key={n.f} label={t(n.label)} value={Number(p[n.f])} min={n.min} max={n.max} step={n.max - n.min > 100 ? 100 : 1}
                onChange={(v) => setP({ ...p, [n.f]: v })} format={(v) => num(v, lang)} />
            ))}
          </div>
        </div>
        <div className="min-w-0">
          {r.ok ? (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-line p-4">
                  <p className="text-[12px] text-ink-3">{t(L("Probabilidad estimada (calibrada)", "Estimated probability (calibrated)"))}</p>
                  <p className="num mt-1 text-3xl font-semibold tracking-tight">{pct(r.probability, lang)}</p>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-2" aria-hidden>
                    <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, r.probability * 100)}%` }} />
                  </div>
                </div>
                <div className="rounded-lg border border-line p-4">
                  <p className="text-[12px] text-ink-3">{t(L("Perfil promedio del dataset", "Average dataset profile"))}</p>
                  <p className="num mt-1 text-3xl font-semibold tracking-tight text-ink-2">{pct(r.baseProbability, lang)}</p>
                  <p className="mt-1 text-[12px] text-ink-3">{t(L("Diferencia", "Difference"))}: {pp(r.probability - r.baseProbability, lang)}</p>
                </div>
                <div className="rounded-lg border border-line p-4 text-[12.5px] leading-relaxed text-ink-2">
                  <p className="font-medium text-ink">{t(L("Incertidumbre", "Uncertainty"))}</p>
                  {t(L(`El modelo acierta el orden de riesgo en ~${pct(d.model.test[d.model.selected].rocAuc, "es", 0)} de los pares (ROC-AUC). Una probabilidad de 30% significa que, de 10 perfiles así, se esperaría que ~3 tuvieran Attrition = Yes.`, `The model orders risk correctly for ~${pct(d.model.test[d.model.selected].rocAuc, "en", 0)} of pairs (ROC-AUC). A 30% probability means that out of 10 such profiles, ~3 would be expected to have Attrition = Yes.`))}
                </div>
              </div>
              <h4 className="mt-5 text-[13px] font-semibold">{t(L("¿Qué empuja esta estimación? (aportes SHAP exactos)", "What drives this estimate? (exact SHAP contributions)"))}</h4>
              <EChart option={option} height={330} label={t(L("Barras de aportes por variable", "Bars of contributions per variable"))} />
              <p className="text-[12px] leading-relaxed text-ink-3">
                {t(L("Cada barra es cuánto aleja esa variable la estimación del perfil promedio. Rojo sube la estimación; azul la baja. Explica al modelo, no a la persona: no dice qué cambiaría su decisión real.",
                  "Each bar is how far that variable moves the estimate from the average profile. Red raises it; blue lowers it. It explains the model, not the person: it does not say what would change their real decision."))}
              </p>
            </>
          ) : (
            <div role="alert" className="rounded-lg border border-bad p-4 text-sm text-bad">{t(L("No se pudo calcular la estimación", "The estimate could not be computed"))}: {r.error}</div>
          )}
        </div>
      </div>
    </Card>
  );
}

type Levers = { overtime: number; jobSat: boolean; envSat: boolean; wlb: boolean; training: boolean; promo: boolean; stock: boolean };

export function RetentionSimulator({ c }: { c: TCtx }) {
  const { d, idx, ct, lang, t } = c;
  const m = d.explorer, thr = d.model.threshold;
  const [lv, setLv] = useState<Levers>({ overtime: 50, jobSat: true, envSat: false, wlb: false, training: false, promo: false, stock: false });
  const res = useMemo(() => {
    const before: number[] = [], after: number[] = [];
    for (const i of idx) {
      const p = rowProfile(d.rows, i);
      const s0 = scoreProfile(m, p).probability;
      const q: Profile = { ...p };
      if (lv.jobSat && Number(q.JobSatisfaction) <= 2) q.JobSatisfaction = Number(q.JobSatisfaction) + 1;
      if (lv.envSat && Number(q.EnvironmentSatisfaction) <= 2) q.EnvironmentSatisfaction = Number(q.EnvironmentSatisfaction) + 1;
      if (lv.wlb && Number(q.WorkLifeBalance) <= 2) q.WorkLifeBalance = Number(q.WorkLifeBalance) + 1;
      if (lv.training) q.TrainingTimesLastYear = Math.min(6, Number(q.TrainingTimesLastYear) + 1);
      if (lv.promo && Number(q.YearsSinceLastPromotion) >= 5) q.YearsSinceLastPromotion = 0;
      if (lv.stock && Number(q.StockOptionLevel) === 0) q.StockOptionLevel = 1;
      let s1 = scoreProfile(m, q).probability;
      if (q.OverTime === "Yes" && lv.overtime > 0) {
        const sNo = scoreProfile(m, { ...q, OverTime: "No" }).probability;
        s1 = (1 - lv.overtime / 100) * s1 + (lv.overtime / 100) * sNo;   // expected score over who loses overtime
      }
      before.push(s0); after.push(s1);
    }
    const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
    const bins = Array.from({ length: 10 }, (_, k) => k / 10);
    const hist = (a: number[]) => bins.map((b) => a.filter((x) => x >= b && x < b + 0.1).length);
    return { n: idx.length, m0: mean(before), m1: mean(after), f0: before.filter((x) => x >= thr).length, f1: after.filter((x) => x >= thr).length, h0: hist(before), h1: hist(after), bins };
  }, [idx, d, m, lv, thr]);
  const labels = res.bins.map((b) => `${Math.round(b * 100)}–${Math.round(b * 100) + 10}%`);
  const option = useMemo<EOption>(() => ({
    ...base(ct), legend: legend(ct), grid: { left: 8, right: 16, top: 32, bottom: 28, containLabel: true },
    xAxis: catAxis(ct, labels, { name: t(L("Puntuación del modelo", "Model score")), nameLocation: "middle", nameGap: 24, axisLabel: { color: ct.text3, fontSize: 10, interval: 0, rotate: 30 } }),
    yAxis: valueAxis(ct, (v: number) => num(v, lang), { name: t(L("Personas", "People")) }),
    tooltip: { ...base(ct).tooltip, axisPointer: { type: "shadow", shadowStyle: { color: ct.grid, opacity: 0.5 } }, formatter: (ps: any[]) => tipHead(labels[ps[0].dataIndex]) + ps.map((p) => tipRow(p.color, p.seriesName, num(p.value, lang))).join("") },
    series: [
      { name: t(L("Puntuación actual", "Current score")), type: "bar", data: res.h0, itemStyle: barStyle(ct.neutral), barGap: "10%" },
      { name: t(L("Puntuación con el escenario", "Score under the scenario")), type: "bar", data: res.h1, itemStyle: barStyle(ct.series[6]) },
    ],
  }), [res, labels, ct, lang, t]);
  const toggle = (k: keyof Levers, label: ReturnType<typeof L>) => (
    <label className="flex cursor-pointer items-start gap-2 text-[13px] text-ink-2">
      <input type="checkbox" className="mt-0.5 accent-[var(--accent)]" checked={lv[k] as boolean} onChange={(e) => setLv({ ...lv, [k]: e.target.checked })} />
      {t(label)}
    </label>
  );
  return (
    <Card id="retention" className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-sim-bg px-5 py-3">
        <div>
          <Badge tone="simulated">{t(L("SIMULACIÓN · cambio en la puntuación del modelo", "SIMULATION · change in model score"))}</Badge>
          <h3 className="mt-1 text-[15px] font-semibold">{t(L("Simulador de estrategias de retención", "Retention strategy simulator"))}</h3>
        </div>
        <p className="max-w-2xl text-[12.5px] text-sim-text">
          {t(L("Muestra cuánto cambiaría la puntuación del modelo si cambiaran estas variables. NO estima cuántas personas dejarían de irse: el modelo aprendió asociaciones, no efectos de intervenciones.",
            "Shows how much the model score would change if these variables changed. It does NOT estimate how many people would stay: the model learned associations, not intervention effects."))}
        </p>
      </div>
      <div className="grid gap-6 p-5 lg:grid-cols-[320px_1fr]">
        <div className="flex flex-col gap-3">
          <p className="text-[12.5px] text-ink-3">{t(L("Segmento", "Segment"))}: <span className="text-ink">{describeFilters(c)}</span> ({num(res.n, lang)} {t(L("personas", "people"))})</p>
          <Slider label={t(L("Reducir horas extra: % de quienes las hacen", "Reduce overtime: % of those who do it"))} value={lv.overtime} min={0} max={100} step={10} onChange={(v) => setLv({ ...lv, overtime: v })} format={(v) => `${v}%`} />
          {toggle("jobSat", L("Satisfacción laboral +1 para quienes tienen 1 o 2", "Job satisfaction +1 for those at 1 or 2"))}
          {toggle("envSat", L("Satisfacción con el entorno +1 (1 o 2)", "Environment satisfaction +1 (1 or 2)"))}
          {toggle("wlb", L("Equilibrio vida-trabajo +1 (1 o 2)", "Work-life balance +1 (1 or 2)"))}
          {toggle("training", L("Una capacitación adicional al año", "One extra training per year"))}
          {toggle("promo", L("Ascenso a quienes llevan 5+ años sin ascender", "Promotion for those 5+ years without one"))}
          {toggle("stock", L("Nivel 1 de opciones sobre acciones a quienes tienen 0", "Stock option level 1 for those at 0"))}
        </div>
        <div className="min-w-0">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              [L("Puntuación media actual", "Current mean score"), pct(res.m0, lang), "measured"],
              [L("Puntuación media en el escenario", "Mean score in scenario"), `${pct(res.m1, lang)} (${pp(res.m1 - res.m0, lang)})`, "simulated"],
              [L(`Personas sobre el umbral (${pct(thr, "es", 0)})`, `People above threshold (${pct(thr, "en", 0)})`), `${num(res.f0, lang)} → ${num(Math.round(res.f1), lang)}`, "simulated"],
            ].map(([k, v, tone]) => (
              <div key={(k as { en: string }).en} className="rounded-lg border border-line p-3">
                <Badge tone={tone as "measured" | "simulated"}>{tone === "measured" ? t(L("Modelo actual", "Current model")) : t(L("Simulado", "Simulated"))}</Badge>
                <p className="mt-2 text-[12px] text-ink-3">{t(k as { es: string; en: string })}</p>
                <p className="num text-lg font-semibold tracking-tight">{v as string}</p>
              </div>
            ))}
          </div>
          <EChart option={option} height={260} label={t(L("Histograma de puntuaciones antes y después", "Histogram of scores before and after"))} />
          <p className="text-[12px] leading-relaxed text-ink-3">
            {t(L("Para medir el efecto real de una política hace falta un piloto con grupo de control y datos longitudinales. Esta herramienta sirve para decidir qué hipótesis probar primero.",
              "Measuring a policy's real effect requires a pilot with a control group and longitudinal data. This tool helps decide which hypotheses to test first."))}
          </p>
        </div>
      </div>
    </Card>
  );
}
