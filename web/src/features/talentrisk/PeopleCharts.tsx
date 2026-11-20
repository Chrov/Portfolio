"use client";
import { useMemo, useState } from "react";
import { ChartCard } from "@/components/ChartCard";
import { EChart, type EOption } from "@/components/EChart";
import { base, barStyle, catAxis, legend, tipHead, tipNote, tipRow, valueAxis } from "@/components/chart-kit";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { num, pct, pp } from "@/lib/format";
import { L, type Bi } from "@/lib/prefs";
import { boxStats, quantile, wilson } from "@/lib/stats";
import { describeFilters, FT, lvl, rate, SRC, TENURE_BANDS, type TCtx } from "./ctx";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Error bars (Wilson 95% CI) as an ECharts custom series on a category axis. */
export function ciSeries(color: string, data: [number, number, number][]) {
  return {
    type: "custom", silent: true, z: 5, data,
    renderItem: (_: any, api: any) => {
      const x = api.value(0), lo = api.coord([x, api.value(1)]), hi = api.coord([x, api.value(2)]);
      const st = { stroke: color, lineWidth: 1.5 };
      return { type: "group", children: [
        { type: "line", shape: { x1: lo[0], y1: lo[1], x2: hi[0], y2: hi[1] }, style: st },
        { type: "line", shape: { x1: lo[0] - 5, y1: lo[1], x2: lo[0] + 5, y2: lo[1] }, style: st },
        { type: "line", shape: { x1: hi[0] - 5, y1: hi[1], x2: hi[0] + 5, y2: hi[1] }, style: st },
      ] };
    },
  };
}

export function DeptChart({ c }: { c: TCtx }) {
  const { d, idx, ct, lang, t } = c;
  const depts = ["Research & Development", "Sales", "Human Resources"];
  const rows = depts.map((dep) => { const sel = idx.filter((i) => d.rows.Department[i] === dep); return { dep, ...rate(c, sel) }; });
  const names = depts.map((x) => lvl(c, x));
  const option = useMemo<EOption>(() => ({
    ...base(ct), legend: legend(ct), grid: { left: 8, right: 56, top: 32, bottom: 8, containLabel: true },
    yAxis: catAxis(ct, names, { inverse: true, axisLabel: { color: ct.text2, fontSize: 12 } }), xAxis: valueAxis(ct, (v: number) => num(v, lang)),
    tooltip: { ...base(ct).tooltip, axisPointer: { type: "shadow", shadowStyle: { color: ct.grid, opacity: 0.5 } }, formatter: (ps: any[]) => { const r = rows[ps[0].dataIndex]; return tipHead(names[ps[0].dataIndex]) + tipRow(ct.neutral, t(L("Permanecen", "Stayed")), num(r.n - r.k, lang)) + tipRow(ct.series[1], "Attrition = Yes", num(r.k, lang)) + tipNote(r.n ? `${pct(r.p, lang)} (IC95% ${pct(r.lo, lang)}–${pct(r.hi, lang)})` : ""); } },
    series: [
      { name: t(L("Permanecen", "Stayed")), type: "bar", stack: "d", data: rows.map((r) => r.n - r.k), itemStyle: { color: ct.neutral, borderColor: ct.surface, borderWidth: 1 }, barMaxWidth: 26 },
      { name: "Attrition = Yes", type: "bar", stack: "d", data: rows.map((r) => r.k), itemStyle: { color: ct.series[1], borderColor: ct.surface, borderWidth: 1, borderRadius: [0, 4, 4, 0] }, barMaxWidth: 26,
        label: { show: true, position: "right", fontSize: 11, color: ct.text2, formatter: (p: any) => (rows[p.dataIndex].n ? pct(rows[p.dataIndex].p, lang) : "") } },
    ],
  }), [rows, names, ct, lang, t]);
  const top = [...rows].filter((r) => r.n >= 20).sort((a, b) => b.p - a.p)[0];
  return (
    <ChartCard title={L("Distribución por departamento", "Distribution by department")} subtitle={L("Personas; la etiqueta indica la proporción con Attrition = Yes", "People; label shows the share with Attrition = Yes")}
      filters={[FT.filters]} source={SRC} empty={!idx.length}
      table={{ columns: [t(L("Departamento", "Department")), t(L("Personas", "People")), "Attrition = Yes", "%", "IC95%"], rows: rows.map((r, i) => [names[i], r.n, r.k, pct(r.p, lang), `${pct(r.lo, lang)}–${pct(r.hi, lang)}`]) }}
      explain={{
        measures: L("Número de personas por departamento y cuántas tienen Attrition = Yes. La proporción NO es una tasa anual: el dataset no indica en qué período salieron.", "People per department and how many have Attrition = Yes. The share is NOT an annual rate: the dataset does not say when they left."),
        observed: c.f.dept !== "ALL" && top ? { es: `Filtro de un solo departamento: ${lvl({ ...c, lang: "es" }, top.dep)} tiene ${pct(top.p, "es")} con Attrition = Yes (IC95% ${pct(top.lo, "es")}–${pct(top.hi, "es")}, n = ${top.n}).`, en: `Single-department filter: ${top.dep} has ${pct(top.p, "en")} with Attrition = Yes (95% CI ${pct(top.lo, "en")}–${pct(top.hi, "en")}, n = ${top.n}).` }
          : top ? { es: `En ${describeFilters({ ...c, lang: "es" })}, ${lvl({ ...c, lang: "es" }, top.dep)} tiene la mayor proporción: ${pct(top.p, "es")} (IC95% ${pct(top.lo, "es")}–${pct(top.hi, "es")}, n = ${top.n}).`, en: `In ${describeFilters({ ...c, lang: "en" })}, ${top.dep} shows the highest share: ${pct(top.p, "en")} (95% CI ${pct(top.lo, "en")}–${pct(top.hi, "en")}, n = ${top.n}).` } : L("Muestra insuficiente (menos de 20 personas por departamento).", "Insufficient sample (fewer than 20 people per department)."),
        implications: L("Muestra dónde se concentra el volumen de salidas y dónde la proporción es mayor; no son lo mismo.", "Shows where exits concentrate in volume and where the share is highest; they are not the same."),
        decisions: L("Dónde priorizar entrevistas de salida y encuestas de clima.", "Where to prioritise exit interviews and engagement surveys."),
        limits: L("Recursos Humanos tiene pocas personas: sus intervalos son amplios.", "Human Resources has few people: its intervals are wide."),
      }}>
      <EChart option={option} height={200} label={t(L("Barras apiladas por departamento", "Stacked bars by department"))} />
    </ChartCard>
  );
}

type FactorId = "tenure" | "income" | "satisfaction" | "overtime" | "department" | "level" | "distance" | "promotion" | "training";
const FACTORS: Record<FactorId, Bi> = {
  tenure: L("Antigüedad", "Tenure"), income: L("Remuneración (cuartil)", "Pay (quartile)"), satisfaction: L("Satisfacción laboral", "Job satisfaction"),
  overtime: L("Horas extra", "Overtime"), department: L("Departamento", "Department"), level: L("Nivel de cargo", "Job level"),
  distance: L("Distancia al trabajo", "Distance from home"), promotion: L("Años desde último ascenso", "Years since promotion"), training: L("Capacitaciones último año", "Trainings last year"),
};

export function FactorExplorer({ c }: { c: TCtx }) {
  const { d, idx, ct, lang, t } = c;
  const [factor, setFactor] = useState<FactorId>("overtime");
  const R = d.rows;
  const groups = useMemo(() => {
    const num_ = (k: string) => (i: number) => Number(R[k][i]);
    const incQ = [0.25, 0.5, 0.75].map((q) => quantile([...R.MonthlyIncome.map(Number)].sort((a, b) => a - b), q));
    const defs: Record<FactorId, { label: Bi; test: (i: number) => boolean }[]> = {
      tenure: TENURE_BANDS.map((b) => ({ label: b.label, test: (i) => num_("YearsAtCompany")(i) >= b.lo && num_("YearsAtCompany")(i) <= b.hi })),
      income: [0, 1, 2, 3].map((q) => ({ label: L(`Q${q + 1}${q === 0 ? " (más bajo)" : q === 3 ? " (más alto)" : ""}`, `Q${q + 1}${q === 0 ? " (lowest)" : q === 3 ? " (highest)" : ""}`), test: (i: number) => { const v = num_("MonthlyIncome")(i); return (q === 0 || v > incQ[q - 1]) && (q === 3 || v <= incQ[q]); } })),
      satisfaction: [1, 2, 3, 4].map((v) => ({ label: L(`${v} de 4`, `${v} of 4`), test: (i) => num_("JobSatisfaction")(i) === v })),
      overtime: ["No", "Yes"].map((v) => ({ label: L(lvl({ d, lang: "es" }, v), v), test: (i) => R.OverTime[i] === v })),
      department: ["Research & Development", "Sales", "Human Resources"].map((v) => ({ label: L(lvl({ d, lang: "es" }, v), v), test: (i) => R.Department[i] === v })),
      level: [1, 2, 3, 4, 5].map((v) => ({ label: L(`Nivel ${v}`, `Level ${v}`), test: (i) => num_("JobLevel")(i) === v })),
      distance: [[1, 5], [6, 10], [11, 20], [21, 29]].map(([a, b]) => ({ label: L(`${a}–${b}`, `${a}–${b}`), test: (i) => num_("DistanceFromHome")(i) >= a && num_("DistanceFromHome")(i) <= b })),
      promotion: [[0, 0], [1, 2], [3, 6], [7, 15]].map(([a, b]) => ({ label: L(a === b ? `${a} años` : `${a}–${b} años`, a === b ? `${a} years` : `${a}–${b} years`), test: (i) => num_("YearsSinceLastPromotion")(i) >= a && num_("YearsSinceLastPromotion")(i) <= b })),
      training: [[0, 1], [2, 3], [4, 6]].map(([a, b]) => ({ label: L(`${a}–${b}`, `${a}–${b}`), test: (i) => num_("TrainingTimesLastYear")(i) >= a && num_("TrainingTimesLastYear")(i) <= b })),
    };
    return defs[factor].map((g) => ({ label: g.label, ...rate(c, idx.filter(g.test)) }));
  }, [factor, idx, R, d, c]);
  const overall = rate(c, idx);
  const labels = groups.map((g) => t(g.label));
  const valid = groups.filter((g) => g.n >= 15);
  const hi = [...valid].sort((a, b) => b.p - a.p)[0], lo = [...valid].sort((a, b) => a.p - b.p)[0];
  const option = useMemo<EOption>(() => ({
    ...base(ct), grid: { left: 8, right: 16, top: 24, bottom: 8, containLabel: true },
    xAxis: catAxis(ct, labels, { axisLabel: { color: ct.text2, fontSize: 11.5, interval: 0 } }),
    yAxis: valueAxis(ct, (v: number) => pct(v, lang, 0), { min: 0, max: (v: any) => Math.min(1, Math.max(0.3, v.max + 0.05)) }),
    tooltip: { ...base(ct).tooltip, axisPointer: { type: "shadow", shadowStyle: { color: ct.grid, opacity: 0.5 } }, formatter: (ps: any[]) => { const g = groups[ps[0].dataIndex]; return tipHead(labels[ps[0].dataIndex]) + tipRow(ct.series[1], "Attrition = Yes", g.n ? pct(g.p, lang) : "—") + tipRow(ct.text2, "IC95% (Wilson)", g.n ? `${pct(g.lo, lang)} – ${pct(g.hi, lang)}` : "—") + tipNote(`${g.k} ${t(L("de", "of"))} ${g.n} ${t(L("personas", "people"))}${g.n < 15 ? " · " + t(L("muestra pequeña", "small sample")) : ""}`); } },
    series: [
      { type: "bar", barMaxWidth: 44, data: groups.map((g) => ({ value: g.n ? g.p : null, itemStyle: { ...barStyle(g.n < 15 ? ct.neutralSoft : ct.series[1]) } })),
        markLine: { silent: true, symbol: "none", lineStyle: { color: ct.text3, type: "dashed" }, label: { color: ct.text3, fontSize: 10.5, formatter: `${t(L("promedio filtro", "filter average"))} ${pct(overall.p, lang)}`, position: "insideEndTop" }, data: overall.n ? [{ yAxis: overall.p }] : [] } },
      ciSeries(ct.text2, groups.map((g, i) => [i, g.lo, g.hi]) as [number, number, number][]),
    ],
  }), [groups, labels, ct, lang, t, overall]);
  return (
    <ChartCard id="chart-factors" title={L("Factores asociados a la rotación", "Factors associated with attrition")} subtitle={L("Proporción con Attrition = Yes por grupo, con intervalo de confianza del 95%", "Share with Attrition = Yes by group, with 95% confidence interval")}
      filters={[FT.filters]} source={SRC} empty={idx.length < 10}
      actions={<div className="w-52"><Select label={t(L("Factor", "Factor"))} value={factor} onChange={(e) => setFactor(e.target.value as FactorId)}>
        {(Object.keys(FACTORS) as FactorId[]).map((k) => <option key={k} value={k}>{t(FACTORS[k])}</option>)}
      </Select></div>}
      table={{ columns: [t(L("Grupo", "Group")), "n", "Attrition = Yes", "%", "IC95%"], rows: groups.map((g, i) => [labels[i], g.n, g.k, g.n ? pct(g.p, lang) : "—", g.n ? `${pct(g.lo, lang)}–${pct(g.hi, lang)}` : "—"]) }}
      explain={{
        measures: L("Para el factor elegido, la proporción de personas con Attrition = Yes en cada grupo. La barra vertical es el intervalo de Wilson al 95%; grupos con menos de 15 personas se muestran en gris.", "For the chosen factor, the share of people with Attrition = Yes in each group. The vertical line is the 95% Wilson interval; groups under 15 people are greyed out."),
        observed: hi && lo && hi !== lo ? { es: `${FACTORS[factor].es}: el grupo «${hi.label.es}» llega a ${pct(hi.p, "es")} (n = ${hi.n}) y «${lo.label.es}» a ${pct(lo.p, "es")} (n = ${lo.n}); diferencia ${pp(hi.p - lo.p, "es")}. ${hi.lo > lo.hi ? "Los intervalos no se solapan." : "Los intervalos se solapan: la diferencia puede ser ruido."}`,
          en: `${FACTORS[factor].en}: group “${hi.label.en}” reaches ${pct(hi.p, "en")} (n = ${hi.n}) and “${lo.label.en}” ${pct(lo.p, "en")} (n = ${lo.n}); a ${pp(hi.p - lo.p, "en")} gap. ${hi.lo > lo.hi ? "The intervals do not overlap." : "The intervals overlap: the gap may be noise."}` }
          : L("Muestra insuficiente para comparar grupos con este filtro.", "Insufficient sample to compare groups with this filter."),
        implications: L("Indica qué condiciones laborales concentran más salidas en el segmento elegido.", "Indicates which working conditions concentrate more exits in the chosen segment."),
        decisions: L("Qué hipótesis llevar a Recursos Humanos para validar con entrevistas o encuestas.", "Which hypotheses to bring to HR for validation through interviews or surveys."),
        limits: L("Es una asociación sin controlar otras variables (p. ej. nivel e ingreso están correlacionados). No implica causalidad.", "An association without controlling for other variables (e.g. level and income are correlated). It does not imply causation."),
      }}>
      <EChart option={option} height={300} label={t(L("Barras de proporción de salida por grupo con intervalos", "Bars of attrition share by group with intervals"))} />
    </ChartCard>
  );
}

export function AssociationTable({ c }: { c: TCtx }) {
  const { d, lang, t } = c;
  return (
    <Card className="p-5">
      <h3 className="text-[15px] font-semibold">{t(L("Pruebas de asociación (toda la organización)", "Association tests (whole organisation)"))}</h3>
      <p className="mt-0.5 text-[12.5px] text-ink-3">{t(L("χ² para categorías (efecto: V de Cramér), Mann-Whitney U para numéricas (efecto: correlación rango-biserial; negativo = valores más bajos entre quienes salieron). p ajustado por Benjamini-Hochberg.", "χ² for categories (effect: Cramér's V), Mann-Whitney U for numerics (effect: rank-biserial; negative = lower values among leavers). p adjusted with Benjamini-Hochberg."))}</p>
      <div className="mt-3 max-h-[360px] overflow-auto">
        <table className="w-full text-left text-[12.5px]">
          <thead className="sticky top-0 bg-surface"><tr>{[t(L("Variable", "Variable")), t(L("Prueba", "Test")), t(L("Efecto", "Effect")), t(L("p ajustado", "Adjusted p")), t(L("Mediana salió / se quedó", "Median left / stayed"))].map((h) => <th key={h} className="border-b border-line px-2 py-1.5 font-medium text-ink-3">{h}</th>)}</tr></thead>
          <tbody>
            {d.associations.map((a) => (
              <tr key={a.feature} className="border-b border-line/60">
                <td className="px-2 py-1.5 text-ink">{t(a.label)}{["Gender", "Age", "MaritalStatus"].includes(a.feature) && <span className="ml-1.5 rounded bg-warn-bg px-1 text-[10.5px] text-warn-text">{t(L("sensible", "sensitive"))}</span>}</td>
                <td className="px-2 py-1.5 text-ink-3">{a.test}</td>
                <td className="num px-2 py-1.5 text-right">{a.effect.toFixed(2)} <span className="text-ink-3">{a.effectName === "Cramér V" ? "V" : "r"}</span></td>
                <td className={`num px-2 py-1.5 text-right ${a.pAdj < 0.05 ? "font-medium text-ink" : "text-ink-3"}`}>{a.pAdj < 0.001 ? a.pAdj.toExponential(1) : a.pAdj.toFixed(3)}</td>
                <td className="num px-2 py-1.5 text-right text-ink-3">{a.medianLeft != null ? `${num(a.medianLeft, lang, 1)} / ${num(a.medianStayed!, lang, 1)}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11.5px] text-ink-3">{t(L(`${d.associations.filter((a) => a.pAdj < 0.05).length} de ${d.associations.length} variables muestran asociación estadísticamente significativa (p ajustado < 0,05). Significativo no implica causal ni relevante para el negocio.`, `${d.associations.filter((a) => a.pAdj < 0.05).length} of ${d.associations.length} variables show a statistically significant association (adjusted p < 0.05). Significant does not mean causal or business-relevant.`))}</p>
    </Card>
  );
}

export function IncomeTenureScatter({ c }: { c: TCtx }) {
  const { d, idx, ct, lang, t } = c;
  const R = d.rows;
  const pts = (y: number) => idx.filter((i) => R.Attrition[i] === y).map((i) => [Number(R.YearsAtCompany[i]) + ((i * 7919) % 100) / 250 - 0.2, Number(R.MonthlyIncome[i]), i]);
  const stay = pts(0), left = pts(1);
  const option = useMemo<EOption>(() => ({
    ...base(ct), legend: legend(ct), grid: { left: 8, right: 16, top: 32, bottom: 28, containLabel: true },
    xAxis: valueAxis(ct, (v: number) => num(v, lang), { name: t(L("Antigüedad (años, con leve dispersión)", "Tenure (years, slightly jittered)")), nameLocation: "middle", nameGap: 24, min: -1 }),
    yAxis: valueAxis(ct, (v: number) => num(v, lang), { name: t(L("Ingreso mensual", "Monthly income")) }),
    tooltip: { ...base(ct).tooltip, trigger: "item", formatter: (p: any) => { const i = p.value[2]; return tipHead(`${lvl(c, String(R.JobRole[i]))}`) + tipRow(p.color, t(L("Antigüedad", "Tenure")), `${R.YearsAtCompany[i]} ${t(L("años", "years"))}`) + tipRow(p.color, t(L("Ingreso mensual", "Monthly income")), num(Number(R.MonthlyIncome[i]), lang)) + tipRow(p.color, t(L("Nivel", "Level")), String(R.JobLevel[i])) + tipNote(`Attrition = ${R.Attrition[i] ? "Yes" : "No"} · ${t(L("persona ficticia", "fictional person"))}`); } },
    series: [
      { name: t(L("Permanecen", "Stayed")), type: "scatter", data: stay, symbolSize: 5, itemStyle: { color: ct.series[0], opacity: 0.45 } },
      { name: "Attrition = Yes", type: "scatter", data: left, symbolSize: 6, itemStyle: { color: ct.series[1], opacity: 0.85, borderColor: ct.surface, borderWidth: 1 } },
    ],
  }), [stay, left, ct, lang, t, R, c]);
  const shortLow = left.filter((p) => p[0] <= 2.5 && p[1] <= 4000).length;
  return (
    <ChartCard title={L("Ingreso frente a antigüedad", "Income vs tenure")} subtitle={L("Cada punto es una persona ficticia", "Each point is a fictional person")}
      filters={[FT.filters]} source={SRC} empty={!idx.length}
      table={{ columns: [t(L("Grupo", "Group")), "n", t(L("Mediana ingreso", "Median income")), t(L("Mediana antigüedad", "Median tenure"))], rows: [[t(L("Permanecen", "Stayed")), stay], ["Attrition = Yes", left]].map(([k, a]: any) => [k, a.length, num(quantile(a.map((p: number[]) => p[1]).sort((x: number, y: number) => x - y), 0.5), lang), num(quantile(a.map((p: number[]) => Math.round(p[0])).sort((x: number, y: number) => x - y), 0.5), lang)]) }}
      explain={{
        measures: L("Relación entre años en la empresa e ingreso mensual (unidad monetaria no documentada en el dataset), coloreada por Attrition.", "Relationship between years at the company and monthly income (currency undocumented in the dataset), coloured by Attrition."),
        observed: { es: `De ${left.length} personas con Attrition = Yes en el filtro, ${shortLow} (${pct(shortLow / (left.length || 1), "es", 0)}) tienen ≤ 2 años de antigüedad e ingreso ≤ 4.000.`, en: `Of ${left.length} people with Attrition = Yes in the filter, ${shortLow} (${pct(shortLow / (left.length || 1), "en", 0)}) have ≤ 2 years of tenure and income ≤ 4,000.` },
        implications: L("Las salidas se agrupan en perfiles nuevos y de menor ingreso; ingreso y antigüedad crecen juntos.", "Exits cluster among newer, lower-income profiles; income and tenure grow together."),
        decisions: L("Revisar bandas salariales de entrada y la experiencia de los primeros años.", "Review entry salary bands and the early-years experience."),
        limits: L("Ingreso y antigüedad están correlacionados: este gráfico no separa sus efectos.", "Income and tenure are correlated: this chart does not separate their effects."),
      }}>
      <EChart option={option} height={320} label={t(L("Dispersión de ingreso frente a antigüedad", "Scatter of income vs tenure"))} />
    </ChartCard>
  );
}

export function IncomeBoxplot({ c }: { c: TCtx }) {
  const { d, idx, ct, lang, t } = c;
  const R = d.rows;
  const levels = [1, 2, 3, 4, 5];
  const stats = levels.flatMap((lv) => [0, 1].map((y) => {
    const v = idx.filter((i) => Number(R.JobLevel[i]) === lv && R.Attrition[i] === y).map((i) => Number(R.MonthlyIncome[i]));
    return v.length >= 5 ? boxStats(v) : null;
  }));
  const option = useMemo<EOption>(() => ({
    ...base(ct), legend: legend(ct), grid: { left: 8, right: 16, top: 32, bottom: 8, containLabel: true },
    xAxis: catAxis(ct, levels.map((l) => `${t(L("Nivel", "Level"))} ${l}`)),
    yAxis: valueAxis(ct, (v: number) => num(v, lang), { name: t(L("Ingreso mensual", "Monthly income")) }),
    tooltip: { ...base(ct).tooltip, trigger: "item", formatter: (p: any) => { const s = stats[p.dataIndex * 2 + p.seriesIndex]; return s ? tipHead(`${t(L("Nivel", "Level"))} ${levels[p.dataIndex]} · ${p.seriesName}`) + tipRow(p.color, t(L("Mediana", "Median")), num(s.median, lang)) + tipRow(p.color, "Q1 – Q3", `${num(s.q1, lang)} – ${num(s.q3, lang)}`) + tipNote(`n = ${s.n}`) : ""; } },
    series: [0, 1].map((y) => ({
      name: y ? "Attrition = Yes" : t(L("Permanecen", "Stayed")), type: "boxplot", boxWidth: [8, 22],
      data: levels.map((_, k) => { const s = stats[k * 2 + y]; return s ? [s.lo, s.q1, s.median, s.q3, s.hi] : [null, null, null, null, null]; }),
      itemStyle: { color: y ? "transparent" : "transparent", borderColor: y ? ct.series[1] : ct.series[0], borderWidth: 1.5 },
    })),
  }), [stats, ct, lang, t]);
  const l1 = [stats[0], stats[1]];
  return (
    <ChartCard title={L("Remuneración por nivel de cargo", "Pay by job level")} subtitle={L("Boxplot del ingreso mensual, separado por Attrition (grupos con n ≥ 5)", "Boxplot of monthly income, split by Attrition (groups with n ≥ 5)")}
      filters={[FT.filters]} source={SRC} empty={!stats.some(Boolean)}
      table={{ columns: [t(L("Nivel", "Level")), t(L("Grupo", "Group")), "Q1", t(L("Mediana", "Median")), "Q3", "n"], rows: stats.map((s, k) => [levels[Math.floor(k / 2)], k % 2 ? "Attrition = Yes" : t(L("Permanecen", "Stayed")), s ? num(s.q1, lang) : "—", s ? num(s.median, lang) : "—", s ? num(s.q3, lang) : "—", s ? s.n : 0]) }}
      explain={{
        measures: L("Distribución del ingreso mensual dentro de cada nivel de cargo, comparando a quienes permanecen y a quienes tienen Attrition = Yes.", "Distribution of monthly income within each job level, comparing those who stayed with those with Attrition = Yes."),
        observed: l1[0] && l1[1] ? { es: `En nivel 1, la mediana de quienes salieron es ${num(l1[1].median, "es")} frente a ${num(l1[0].median, "es")} de quienes permanecen: dentro del mismo nivel la diferencia de ingreso es ${Math.abs(l1[1].median / l1[0].median - 1) < 0.1 ? "pequeña" : "relevante"}.`, en: `At level 1, leavers' median is ${num(l1[1].median, "en")} vs ${num(l1[0].median, "en")} for those who stayed: within the same level the income gap is ${Math.abs(l1[1].median / l1[0].median - 1) < 0.1 ? "small" : "material"}.` } : L("Muestra insuficiente en nivel 1 con este filtro.", "Insufficient level-1 sample with this filter."),
        implications: L("Comparar dentro de cada nivel evita confundir el efecto del ingreso con el del cargo.", "Comparing within each level avoids confusing the effect of pay with that of role."),
        decisions: L("Si revisar bandas salariales o, más bien, la progresión entre niveles.", "Whether to review pay bands or, rather, progression between levels."),
        limits: L("Unidad monetaria no documentada; datos ficticios.", "Currency undocumented; fictional data."),
      }}>
      <EChart option={option} height={300} label={t(L("Diagramas de caja de ingreso por nivel", "Boxplots of income by level"))} />
    </ChartCard>
  );
}

export function TenureHistogram({ c }: { c: TCtx }) {
  const { d, idx, ct, lang, t } = c;
  const R = d.rows;
  const bins = [[0, 0], [1, 1], [2, 2], [3, 4], [5, 6], [7, 9], [10, 14], [15, 19], [20, 40]];
  const labels = bins.map(([a, b]) => (a === b ? `${a}` : b === 40 ? `${a}+` : `${a}–${b}`));
  const share = (y: number) => {
    const sel = idx.filter((i) => R.Attrition[i] === y);
    return bins.map(([a, b]) => sel.filter((i) => Number(R.YearsAtCompany[i]) >= a && Number(R.YearsAtCompany[i]) <= b).length / (sel.length || 1));
  };
  const s0 = share(0), s1 = share(1);
  const option = useMemo<EOption>(() => ({
    ...base(ct), legend: legend(ct), grid: { left: 8, right: 16, top: 32, bottom: 28, containLabel: true },
    xAxis: catAxis(ct, labels, { name: t(L("Años en la empresa", "Years at company")), nameLocation: "middle", nameGap: 24 }), yAxis: valueAxis(ct, (v: number) => pct(v, lang, 0)),
    tooltip: { ...base(ct).tooltip, axisPointer: { type: "shadow", shadowStyle: { color: ct.grid, opacity: 0.5 } }, formatter: (ps: any[]) => tipHead(`${labels[ps[0].dataIndex]} ${t(L("años", "years"))}`) + ps.map((p) => tipRow(p.color, p.seriesName, pct(p.value, lang))).join("") + tipNote(t(L("% dentro de cada grupo", "% within each group"))) },
    series: [
      { name: t(L("Permanecen", "Stayed")), type: "bar", data: s0, itemStyle: barStyle(ct.series[0]), barGap: "10%" },
      { name: "Attrition = Yes", type: "bar", data: s1, itemStyle: barStyle(ct.series[1]) },
    ],
  }), [s0, s1, labels, ct, lang, t]);
  const early1 = s1[0] + s1[1] + s1[2], early0 = s0[0] + s0[1] + s0[2];
  return (
    <ChartCard title={L("Distribución de la antigüedad", "Tenure distribution")} subtitle={L("Histograma normalizado dentro de cada grupo", "Histogram normalised within each group")}
      filters={[FT.filters]} source={SRC} empty={!idx.length}
      table={{ columns: [t(L("Años", "Years")), t(L("Permanecen", "Stayed")), "Attrition = Yes"], rows: labels.map((l, k) => [l, pct(s0[k], lang), pct(s1[k], lang)]) }}
      explain={{
        measures: L("Qué parte de cada grupo cae en cada tramo de antigüedad (cada serie suma 100%).", "Which share of each group falls in each tenure bin (each series sums to 100%)."),
        observed: { es: `${pct(early1, "es", 0)} de quienes tienen Attrition = Yes llevaba 0–2 años, frente a ${pct(early0, "es", 0)} de quienes permanecen.`, en: `${pct(early1, "en", 0)} of those with Attrition = Yes had 0–2 years of tenure, vs ${pct(early0, "en", 0)} of those who stayed.` },
        implications: L("Las salidas están sobrerrepresentadas en los primeros años.", "Exits are over-represented in the first years."),
        decisions: L("Diseño de onboarding y seguimiento durante el primer y segundo año.", "Onboarding design and follow-up during the first and second year."),
        limits: L("Sin fechas de salida no se puede construir una curva de supervivencia real.", "Without exit dates a proper survival curve cannot be built."),
      }}>
      <EChart option={option} height={280} label={t(L("Histograma de antigüedad por grupo", "Histogram of tenure by group"))} />
    </ChartCard>
  );
}

export function SatisfactionHeatmap({ c }: { c: TCtx }) {
  const { d, idx, ct, lang, t } = c;
  const R = d.rows;
  const cells = useMemo(() => {
    const out: { js: number; es: number; k: number; n: number; p: number }[] = [];
    for (let js = 1; js <= 4; js++) for (let es = 1; es <= 4; es++) {
      const sel = idx.filter((i) => Number(R.JobSatisfaction[i]) === js && Number(R.EnvironmentSatisfaction[i]) === es);
      const k = sel.reduce((s, i) => s + Number(R.Attrition[i]), 0);
      out.push({ js, es, k, n: sel.length, p: sel.length ? k / sel.length : NaN });
    }
    return out;
  }, [idx, R]);
  const option = useMemo<EOption>(() => ({
    ...base(ct), grid: { left: 8, right: 16, top: 8, bottom: 70, containLabel: true },
    xAxis: catAxis(ct, ["1", "2", "3", "4"], { name: t(L("Satisfacción con el entorno", "Environment satisfaction")), nameLocation: "middle", nameGap: 26 }),
    yAxis: catAxis(ct, ["1", "2", "3", "4"], { name: t(L("Satisfacción laboral", "Job satisfaction")), nameLocation: "middle", nameGap: 26 }),
    visualMap: { min: 0, max: 0.4, calculable: false, orient: "horizontal", left: "center", bottom: 0, itemHeight: 140, itemWidth: 10, text: ["40%", "0%"], textStyle: { color: ct.text3, fontSize: 11 }, inRange: { color: ct.seq.slice(0, 5) }, outOfRange: { color: ct.neutralSoft } },
    tooltip: { ...base(ct).tooltip, trigger: "item", formatter: (p: any) => { const x = cells[p.dataIndex]; const [lo, hi] = wilson(x.k, x.n); return tipHead(`${t(L("Laboral", "Job"))} ${x.js} · ${t(L("Entorno", "Environment"))} ${x.es}`) + tipRow(ct.series[0], "Attrition = Yes", x.n ? pct(x.p, lang) : "—") + tipRow(ct.text2, "IC95%", x.n ? `${pct(lo, lang)}–${pct(hi, lang)}` : "—") + tipNote(`n = ${x.n}${x.n < 15 ? " · " + t(L("muestra pequeña", "small sample")) : ""}`); } },
    series: [{ type: "heatmap", data: cells.map((x) => {
        const v = x.n >= 15 ? Math.min(x.p, 0.4) : "-";
        // Label colour follows cell darkness so text keeps contrast on the strongest cells.
        const strong = typeof v === "number" && v / 0.4 > 0.6;
        return { value: [x.es - 1, x.js - 1, v], label: { color: strong ? (ct.dark ? "#0b0b0b" : "#ffffff") : ct.text } };
      }), itemStyle: { borderColor: ct.surface, borderWidth: 2, borderRadius: 3 },
      label: { show: true, fontSize: 11.5, formatter: (p: any) => { const x = cells[p.dataIndex]; return x.n >= 15 ? pct(x.p, lang, 0) : `n=${x.n}`; } } }],
  }), [cells, ct, lang, t]);
  const valid = cells.filter((x) => x.n >= 15);
  const worst = [...valid].sort((a, b) => b.p - a.p)[0], best = [...valid].sort((a, b) => a.p - b.p)[0];
  return (
    <ChartCard title={L("Satisfacción laboral × satisfacción con el entorno", "Job × environment satisfaction")} subtitle={L("Proporción con Attrition = Yes por combinación; celdas con n < 15 sin color", "Share with Attrition = Yes per combination; cells with n < 15 uncoloured")}
      filters={[FT.filters]} source={SRC} empty={idx.length < 30}
      table={{ columns: [t(L("Laboral", "Job")), t(L("Entorno", "Environment")), "n", "%"], rows: cells.map((x) => [x.js, x.es, x.n, x.n ? pct(x.p, lang) : "—"]) }}
      explain={{
        measures: L("Cruce de dos escalas de satisfacción (1 = baja, 4 = alta) y la proporción con Attrition = Yes en cada celda.", "Cross of two satisfaction scales (1 = low, 4 = high) and the share with Attrition = Yes in each cell."),
        observed: worst && best ? { es: `La combinación laboral ${worst.js} / entorno ${worst.es} llega a ${pct(worst.p, "es")} (n = ${worst.n}); laboral ${best.js} / entorno ${best.es}, a ${pct(best.p, "es")} (n = ${best.n}).`, en: `Job ${worst.js} / environment ${worst.es} reaches ${pct(worst.p, "en")} (n = ${worst.n}); job ${best.js} / environment ${best.es}, ${pct(best.p, "en")} (n = ${best.n}).` } : L("Muestra insuficiente.", "Insufficient sample."),
        implications: L("La baja satisfacción en ambas dimensiones a la vez se asocia con más salidas que cada una por separado.", "Low satisfaction on both dimensions at once is associated with more exits than either alone."),
        decisions: L("Priorizar equipos con baja satisfacción doble en las encuestas de clima.", "Prioritise teams with double-low satisfaction in engagement surveys."),
        limits: L("Escalas autodeclaradas y gruesas; con filtros, varias celdas quedan con pocas personas.", "Coarse, self-reported scales; with filters, several cells have few people."),
      }}>
      <EChart option={option} height={330} label={t(L("Mapa de calor de satisfacción y salida", "Heatmap of satisfaction and attrition"))} />
    </ChartCard>
  );
}
