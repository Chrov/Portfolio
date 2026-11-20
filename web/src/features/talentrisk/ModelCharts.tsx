"use client";
import { useMemo, useState } from "react";
import { ChartCard } from "@/components/ChartCard";
import { EChart, type EOption } from "@/components/EChart";
import { base, barStyle, catAxis, legend, tipHead, tipNote, tipRow, valueAxis } from "@/components/chart-kit";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { num, pct } from "@/lib/format";
import { L } from "@/lib/prefs";
import { FT, SRC, type TCtx } from "./ctx";

/* eslint-disable @typescript-eslint/no-explicit-any */
const ORDER = ["logreg", "rf", "xgb"];

export function ModelTable({ c }: { c: TCtx }) {
  const { d, lang, t } = c;
  const m = d.model;
  return (
    <Card className="p-5">
      <h3 className="text-[15px] font-semibold">{t(L("Comparación de modelos", "Model comparison"))}</h3>
      <p className="mt-0.5 text-[12.5px] text-ink-3">{t(L(`Selección por validación cruzada (5 pliegues × 3 repeticiones) solo en entrenamiento (${m.split.train} personas); el conjunto de prueba (${m.split.test}, ${m.split.testPositives} salidas) se evalúa una vez al final.`, `Selection by cross-validation (5 folds × 3 repeats) on the training split only (${m.split.train} people); the test set (${m.split.test}, ${m.split.testPositives} exits) is evaluated once at the end.`))}</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-[12.5px]">
          <thead><tr>{[t(L("Modelo", "Model")), "CV PR-AUC", "CV ROC-AUC", "Test PR-AUC", "Test ROC-AUC", "Brier", t(L("Precisión", "Precision")), "Recall", "F1"].map((h) => <th key={h} className="border-b border-line px-2 py-1.5 font-medium text-ink-3">{h}</th>)}</tr></thead>
          <tbody>
            {ORDER.map((k) => {
              const cv = m.cv[k], te = m.test[k];
              return (
                <tr key={k} className={`border-b border-line/60 ${k === m.selected ? "bg-accent-soft/60" : ""}`}>
                  <td className="px-2 py-1.5 font-medium text-ink">{t(cv.label)}{k === m.selected && <span className="ml-1.5 text-[11px] text-accent">{t(L("elegido", "selected"))}</span>}</td>
                  <td className="num px-2 py-1.5 text-right">{cv.prAuc.toFixed(3)} <span className="text-ink-3">± {cv.prAucSe.toFixed(3)}</span></td>
                  <td className="num px-2 py-1.5 text-right">{cv.rocAuc.toFixed(3)}</td>
                  <td className="num px-2 py-1.5 text-right">{te.prAuc.toFixed(3)}</td>
                  <td className="num px-2 py-1.5 text-right">{te.rocAuc.toFixed(3)}</td>
                  <td className="num px-2 py-1.5 text-right">{te.brier.toFixed(3)} <span className="text-ink-3">({te.brierUncalibrated.toFixed(3)})</span></td>
                  <td className="num px-2 py-1.5 text-right">{pct(te.precision, lang, 0)}</td>
                  <td className="num px-2 py-1.5 text-right">{pct(te.recall, lang, 0)}</td>
                  <td className="num px-2 py-1.5 text-right">{te.f1.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ul className="mt-3 list-disc space-y-1 pl-4 text-[12.5px] text-ink-2">
        <li>{t(L(`Línea base aleatoria: PR-AUC = proporción de positivos (${pct(d.meta.attritionShare, "es")}), ROC-AUC = 0,5.`, `Random baseline: PR-AUC = positive share (${pct(d.meta.attritionShare, "en")}), ROC-AUC = 0.5.`))}</li>
        <li>{t(L("Brier entre paréntesis = antes de calibrar. Las ponderaciones de clase distorsionan las probabilidades; la calibración sigmoide (Platt) con predicciones fuera de pliegue las corrige.", "Brier in parentheses = before calibration. Class weights distort probabilities; sigmoid (Platt) calibration fitted on out-of-fold predictions corrects them."))}</li>
        <li>{t(L(`Umbral de cada modelo elegido maximizando F1 en predicciones fuera de pliegue del entrenamiento (logística: ${m.threshold.toFixed(2)}), nunca en prueba.`, `Each model's threshold chosen by maximising F1 on training out-of-fold predictions (logistic: ${m.threshold.toFixed(2)}), never on test.`))}</li>
        <li>{t(L("XGBoost no mejora a la regresión logística: con 1.470 filas y relaciones mayormente monótonas, el modelo lineal generaliza mejor y es explicable de forma exacta.", "XGBoost does not beat logistic regression: with 1,470 rows and mostly monotonic relationships, the linear model generalises better and is exactly explainable."))}</li>
      </ul>
    </Card>
  );
}

export function RocPrCurves({ c }: { c: TCtx }) {
  const { d, ct, lang, t } = c;
  const [kind, setKind] = useState<"pr" | "roc">("pr");
  const m = d.model;
  const base0 = m.split.testPositives / m.split.test;
  const option = useMemo<EOption>(() => ({
    ...base(ct), legend: legend(ct), grid: { left: 8, right: 16, top: 34, bottom: 28, containLabel: true },
    xAxis: valueAxis(ct, (v: number) => v.toFixed(1), { min: 0, max: 1, name: kind === "pr" ? "Recall" : t(L("Tasa de falsos positivos", "False positive rate")), nameLocation: "middle", nameGap: 24 }),
    yAxis: valueAxis(ct, (v: number) => v.toFixed(1), { min: 0, max: 1, name: kind === "pr" ? t(L("Precisión", "Precision")) : t(L("Tasa de verdaderos positivos", "True positive rate")) }),
    tooltip: { ...base(ct).tooltip, trigger: "item", formatter: (p: any) => tipHead(p.seriesName) + tipRow(p.color, kind === "pr" ? "Recall" : "FPR", p.value[0].toFixed(2)) + tipRow(p.color, kind === "pr" ? t(L("Precisión", "Precision")) : "TPR", p.value[1].toFixed(2)) },
    series: [
      ...ORDER.map((k, i) => ({ name: `${t(m.test[k].label)} (${(kind === "pr" ? m.test[k].prAuc : m.test[k].rocAuc).toFixed(2)})`, type: "line", data: kind === "pr" ? m.test[k].pr : m.test[k].roc, showSymbol: false, step: kind === "pr" ? "end" : false, lineStyle: { width: k === m.selected ? 2.5 : 1.5, color: ct.series[i] }, itemStyle: { color: ct.series[i] } })),
      { name: t(L("Azar", "Chance")), type: "line", data: kind === "pr" ? [[0, base0], [1, base0]] : [[0, 0], [1, 1]], showSymbol: false, lineStyle: { type: "dashed", width: 1, color: ct.neutral }, itemStyle: { color: ct.neutral } },
    ],
  }), [kind, m, ct, t, base0]);
  const s = m.test[m.selected];
  return (
    <ChartCard title={L("Curvas de evaluación (conjunto de prueba)", "Evaluation curves (test set)")} subtitle={L("Precision-Recall es más informativa con clases desbalanceadas", "Precision-Recall is more informative with imbalanced classes")}
      filters={[FT.none]} source={SRC}
      actions={<Segmented label={t(L("Curva", "Curve"))} value={kind} onChange={setKind} options={[{ value: "pr", label: "PR" }, { value: "roc", label: "ROC" }]} />}
      table={{ columns: [t(L("Modelo", "Model")), "PR-AUC", "ROC-AUC"], rows: ORDER.map((k) => [t(m.test[k].label), m.test[k].prAuc.toFixed(3), m.test[k].rocAuc.toFixed(3)]) }}
      explain={{
        measures: L("Curvas sobre 294 personas que el modelo nunca vio. PR: qué precisión se obtiene a cada nivel de recall. ROC: verdaderos vs falsos positivos.", "Curves on 294 people the model never saw. PR: precision at each recall level. ROC: true vs false positives."),
        observed: { es: `La regresión logística obtiene PR-AUC ${s.prAuc.toFixed(2)} frente a ${base0.toFixed(2)} del azar y ROC-AUC ${s.rocAuc.toFixed(2)}. Para capturar el 80% de las salidas, la precisión cae por debajo del 40%.`, en: `Logistic regression reaches PR-AUC ${s.prAuc.toFixed(2)} vs ${base0.toFixed(2)} for chance and ROC-AUC ${s.rocAuc.toFixed(2)}. To capture 80% of exits, precision drops below 40%.` },
        implications: L("El modelo ordena mejor que el azar, pero cualquier lista de «riesgo» tendrá muchos falsos positivos.", "The model ranks better than chance, but any “risk” list will contain many false positives."),
        decisions: L("Usarlo para priorizar investigación por segmentos, no para actuar sobre individuos.", "Use it to prioritise segment-level investigation, not to act on individuals."),
        limits: L("Con 47 salidas en prueba, las curvas tienen varianza alta; la CV da estimaciones más estables.", "With 47 exits in test, curves have high variance; CV gives more stable estimates."),
      }}>
      <EChart option={option} height={320} label={t(L("Curvas PR o ROC de tres modelos", "PR or ROC curves for three models"))} />
    </ChartCard>
  );
}

export function CalibrationChart({ c }: { c: TCtx }) {
  const { d, ct, lang, t } = c;
  const cal = d.model.calibration;
  const option = useMemo<EOption>(() => ({
    ...base(ct), legend: legend(ct), grid: { left: 8, right: 16, top: 34, bottom: 28, containLabel: true },
    xAxis: valueAxis(ct, (v: number) => pct(v, lang, 0), { min: 0, max: 1, name: t(L("Probabilidad predicha (media del tramo)", "Predicted probability (bin mean)")), nameLocation: "middle", nameGap: 24 }),
    yAxis: valueAxis(ct, (v: number) => pct(v, lang, 0), { min: 0, max: 1, name: t(L("Proporción observada", "Observed share")) }),
    tooltip: { ...base(ct).tooltip, trigger: "item", formatter: (p: any) => tipHead(p.seriesName) + tipRow(p.color, t(L("Predicho", "Predicted")), pct(p.value[0], lang)) + tipRow(p.color, t(L("Observado", "Observed")), pct(p.value[1], lang)) },
    series: [
      { name: t(L("Calibrado (Platt)", "Calibrated (Platt)")), type: "line", data: cal.predicted.map((x, i) => [x, cal.observed[i]]), symbolSize: 8, lineStyle: { width: 2, color: ct.series[0] }, itemStyle: { color: ct.series[0], borderColor: ct.surface, borderWidth: 2 } },
      { name: t(L("Sin calibrar", "Uncalibrated")), type: "line", data: cal.rawPredicted.map((x, i) => [x, cal.rawObserved[i]]), symbolSize: 7, lineStyle: { width: 1.5, type: "dashed", color: ct.series[1] }, itemStyle: { color: ct.series[1], borderColor: ct.surface, borderWidth: 2 } },
      { name: t(L("Calibración perfecta", "Perfect calibration")), type: "line", data: [[0, 0], [1, 1]], showSymbol: false, lineStyle: { width: 1, type: "dotted", color: ct.neutral }, itemStyle: { color: ct.neutral } },
    ],
  }), [cal, ct, lang, t]);
  const s = d.model.test[d.model.selected];
  return (
    <ChartCard title={L("Calibración de probabilidades", "Probability calibration")} subtitle={L("Conjunto de prueba, 6 tramos por cuantiles", "Test set, 6 quantile bins")}
      filters={[FT.none]} source={SRC}
      table={{ columns: [t(L("Predicho", "Predicted")), t(L("Observado", "Observed"))], rows: cal.predicted.map((x, i) => [pct(x, lang), pct(cal.observed[i], lang)]) }}
      explain={{
        measures: L("Si el modelo dice 30%, ¿salen realmente ~30% de esas personas? Se compara la probabilidad media de cada tramo con la proporción observada.", "If the model says 30%, do ~30% of those people actually leave? Each bin's mean predicted probability is compared with the observed share."),
        observed: { es: `Sin calibrar, el modelo (entrenado con pesos de clase) sobreestima el riesgo; tras calibrar, el Brier baja de ${s.brierUncalibrated.toFixed(3)} a ${s.brier.toFixed(3)}.`, en: `Uncalibrated, the model (trained with class weights) overstates risk; after calibration, Brier drops from ${s.brierUncalibrated.toFixed(3)} to ${s.brier.toFixed(3)}.` },
        implications: L("Solo con probabilidades calibradas tiene sentido mostrar un porcentaje en el explorador.", "Only with calibrated probabilities does it make sense to show a percentage in the explorer."),
        decisions: L("Qué umbrales usar al planificar capacidad de entrevistas de permanencia.", "Which thresholds to use when planning stay-interview capacity."),
        limits: L("6 tramos con ~49 personas cada uno: la curva es ruidosa.", "6 bins of ~49 people each: the curve is noisy."),
      }}>
      <EChart option={option} height={300} label={t(L("Curva de calibración", "Calibration curve"))} />
    </ChartCard>
  );
}

export function ConfusionChart({ c }: { c: TCtx }) {
  const { d, ct, lang, t } = c;
  const cm = d.model.confusion;
  const total = cm[0][0] + cm[0][1] + cm[1][0] + cm[1][1];
  const names = [[t(L("Verdadero negativo", "True negative")), t(L("Falso positivo", "False positive"))], [t(L("Falso negativo", "False negative")), t(L("Verdadero positivo", "True positive"))]];
  const option = useMemo<EOption>(() => ({
    ...base(ct), grid: { left: 8, right: 16, top: 8, bottom: 30, containLabel: true },
    xAxis: catAxis(ct, [t(L("Predicho: se queda", "Predicted: stays")), t(L("Predicho: sale", "Predicted: leaves"))], { name: t(L("Predicción", "Prediction")), nameLocation: "middle", nameGap: 26, axisLabel: { color: ct.text2, fontSize: 12 } }),
    yAxis: catAxis(ct, [t(L("Real: se queda", "Actual: stays")), t(L("Real: sale", "Actual: leaves"))], { inverse: true, axisLabel: { color: ct.text2, fontSize: 12 } }),
    visualMap: { show: false, min: 0, max: Math.max(...cm.flat()), inRange: { color: [ct.seq[0], ct.seq[3]] } },
    tooltip: { ...base(ct).tooltip, trigger: "item", formatter: (p: any) => tipHead(names[p.value[1]][p.value[0]]) + tipRow(ct.series[0], t(L("Personas", "People")), num(p.value[2], lang)) + tipNote(pct(p.value[2] / total, lang) + " " + t(L("del conjunto de prueba", "of the test set"))) },
    series: [{ type: "heatmap", data: [[0, 0, cm[0][0]], [1, 0, cm[0][1]], [0, 1, cm[1][0]], [1, 1, cm[1][1]]], itemStyle: { borderColor: ct.surface, borderWidth: 3, borderRadius: 6 },
      label: { show: true, fontSize: 14, fontWeight: 600, color: ct.text, formatter: (p: any) => `${p.value[2]}\n{s|${names[p.value[1]][p.value[0]]}}`, rich: { s: { fontSize: 11, fontWeight: 400, color: ct.text2, padding: [4, 0, 0, 0] } } } }],
  }), [cm, ct, lang, t, names, total]);
  return (
    <ChartCard title={L("Matriz de confusión", "Confusion matrix")} subtitle={L(`Regresión logística calibrada, umbral ${d.model.threshold.toFixed(2)}, conjunto de prueba`, `Calibrated logistic regression, threshold ${d.model.threshold.toFixed(2)}, test set`)}
      filters={[FT.none]} source={SRC}
      table={{ columns: ["", t(L("Predicho: se queda", "Predicted: stays")), t(L("Predicho: sale", "Predicted: leaves"))], rows: [[t(L("Real: se queda", "Actual: stays")), cm[0][0], cm[0][1]], [t(L("Real: sale", "Actual: leaves")), cm[1][0], cm[1][1]]] }}
      explain={{
        measures: L("Cruce entre la predicción (con el umbral elegido) y lo que ocurrió en el conjunto de prueba.", "Cross between the prediction (at the chosen threshold) and what happened in the test set."),
        observed: { es: `De ${cm[1][0] + cm[1][1]} salidas reales, el modelo detecta ${cm[1][1]} (recall ${pct(cm[1][1] / (cm[1][0] + cm[1][1]), "es", 0)}); de ${cm[0][1] + cm[1][1]} personas marcadas, ${cm[0][1]} no salieron (${pct(cm[0][1] / (cm[0][1] + cm[1][1]), "es", 0)} de falsos positivos).`, en: `Of ${cm[1][0] + cm[1][1]} actual exits, the model catches ${cm[1][1]} (recall ${pct(cm[1][1] / (cm[1][0] + cm[1][1]), "en", 0)}); of ${cm[0][1] + cm[1][1]} people flagged, ${cm[0][1]} did not leave (${pct(cm[0][1] / (cm[0][1] + cm[1][1]), "en", 0)} false positives).` },
        implications: L("Casi la mitad de las alertas serían falsas y la mitad de las salidas pasarían inadvertidas.", "Almost half the alerts would be false and half the exits would go unnoticed."),
        decisions: L("El costo de un falso positivo (intervenir sin necesidad) frente a un falso negativo define el umbral.", "The cost of a false positive (intervening needlessly) vs a false negative sets the threshold."),
        limits: L("Una matriz depende del umbral; cambiarlo intercambia precisión por recall.", "The matrix depends on the threshold; changing it trades precision for recall."),
      }}>
      <EChart option={option} height={260} label={t(L("Matriz de confusión", "Confusion matrix"))} />
    </ChartCard>
  );
}

export function ShapImportance({ c }: { c: TCtx }) {
  const { d, ct, lang, t } = c;
  const top = d.shap.importance.slice(0, 12);
  const names = top.map((x) => t(x.label));
  const option = useMemo<EOption>(() => ({
    ...base(ct), grid: { left: 8, right: 40, top: 8, bottom: 8, containLabel: true },
    yAxis: catAxis(ct, names, { inverse: true, axisLabel: { color: ct.text2, fontSize: 11.5 } }), xAxis: valueAxis(ct, (v: number) => v.toFixed(2)),
    tooltip: { ...base(ct).tooltip, axisPointer: { type: "shadow", shadowStyle: { color: ct.grid, opacity: 0.5 } }, formatter: (ps: any[]) => tipHead(names[ps[0].dataIndex]) + tipRow(ct.series[0], "mean |SHAP|", top[ps[0].dataIndex].value.toFixed(3)) + tipNote(t(L("log-odds calibrados", "calibrated log-odds"))) },
    series: [{ type: "bar", barMaxWidth: 16, data: top.map((x, i) => ({ value: x.value, itemStyle: barStyle(i < 3 ? ct.series[0] : ct.neutral, true) })), label: { show: true, position: "right", fontSize: 10.5, color: ct.text2, formatter: (p: any) => p.value.toFixed(2) } }],
  }), [top, names, ct, t]);
  void lang;
  return (
    <ChartCard title={L("Importancia global (SHAP)", "Global importance (SHAP)")} subtitle={L("Media del |valor SHAP| en el conjunto de prueba; categorías agregadas por variable", "Mean |SHAP value| on the test set; categories aggregated per variable")}
      filters={[FT.none]} source={SRC}
      table={{ columns: [t(L("Variable", "Variable")), "mean |SHAP|"], rows: d.shap.importance.map((x) => [t(x.label), x.value.toFixed(3)]) }}
      explain={{
        measures: L(`SHAP (${d.shap.explainer}) reparte la predicción entre variables. Para un modelo lineal es exacto: aporte = peso × (valor − media). Se expresa en log-odds del modelo calibrado.`, `SHAP (${d.shap.explainer}) splits each prediction across variables. For a linear model it is exact: contribution = weight × (value − mean). Expressed in calibrated-model log-odds.`),
        observed: { es: `Las variables que más mueven las predicciones son ${names.slice(0, 3).join(", ")}.`, en: `The variables that move predictions most are ${names.slice(0, 3).join(", ")}.` },
        implications: L("Indica en qué se apoya el modelo, no qué causa la rotación.", "Shows what the model relies on, not what causes attrition."),
        decisions: L("Qué variables merecen mejor medición y seguimiento en datos reales de la empresa.", "Which variables deserve better measurement and tracking in real company data."),
        limits: L("Variables correlacionadas (antigüedad, años en el cargo, con jefatura) se reparten la importancia.", "Correlated variables (tenure, years in role, with manager) share importance."),
      }}>
      <EChart option={option} height={340} label={t(L("Barras de importancia SHAP", "SHAP importance bars"))} />
    </ChartCard>
  );
}

export function ShapBeeswarm({ c }: { c: TCtx }) {
  const { d, ct, lang, t } = c;
  const order = d.shap.order.slice(0, 8);
  const names = order.map((f) => t(d.labels[f]));
  const pts = useMemo(() => order.flatMap((f, k) => d.shap.beeswarm[f].map((p, j) => [p[0], k + (((j * 2654435761) % 1000) / 1000 - 0.5) * 0.6, p[1], p[2], k])), [d, order]);
  const option = useMemo<EOption>(() => ({
    ...base(ct), grid: { left: 8, right: 24, top: 8, bottom: 60, containLabel: true },
    yAxis: { type: "value", min: -0.6, max: order.length - 0.4, inverse: true, interval: 1, axisLabel: { color: ct.text2, fontSize: 11.5, formatter: (v: number) => names[Math.round(v)] ?? "" }, splitLine: { show: false }, axisLine: { show: false }, axisTick: { show: false } },
    xAxis: valueAxis(ct, (v: number) => v.toFixed(1), { name: t(L("Valor SHAP (← reduce el riesgo · aumenta el riesgo →)", "SHAP value (← lowers risk · raises risk →)")), nameLocation: "middle", nameGap: 24 }),
    visualMap: { dimension: 2, min: 0, max: 1, orient: "horizontal", left: "center", bottom: 0, itemHeight: 140, itemWidth: 10, text: [t(L("valor alto", "high value")), t(L("bajo", "low"))], textStyle: { color: ct.text3, fontSize: 11 }, inRange: { color: [ct.divNeg, ct.neutralSoft, ct.divPos] }, calculable: false },
    tooltip: { ...base(ct).tooltip, trigger: "item", formatter: (p: any) => tipHead(names[p.value[4]]) + tipRow(ct.text2, t(L("Valor de la variable", "Variable value")), String(lvl2(c, p.value[3]))) + tipRow(ct.text2, "SHAP", (p.value[0] as number).toFixed(3)) },
    series: [{ type: "scatter", symbolSize: 4.5, data: pts, itemStyle: { opacity: 0.8 },
      markLine: { silent: true, symbol: "none", lineStyle: { color: ct.axis }, label: { show: false }, data: [{ xAxis: 0 }] } }],
  }), [pts, names, order.length, ct, t, c]);
  void lang;
  return (
    <ChartCard title={L("Efecto de cada variable por persona (SHAP)", "Per-person effect of each variable (SHAP)")} subtitle={L("Cada punto es una persona del conjunto de prueba; color = valor de la variable (para categorías: rojo = categoría más común)", "Each point is a test-set person; colour = variable value (for categories: red = most common level)")}
      filters={[FT.none]} source={SRC}
      explain={{
        measures: L("Distribución de los aportes SHAP por persona para las 8 variables más importantes.", "Distribution of per-person SHAP contributions for the 8 most important variables."),
        observed: L("Hacer horas extra desplaza la predicción hacia más riesgo; más años de experiencia, más opciones sobre acciones y mayor satisfacción con el entorno la desplazan hacia menos.", "Working overtime pushes predictions towards higher risk; more years of experience, more stock options and higher environment satisfaction push them lower."),
        implications: L("La dirección de cada efecto coincide con las asociaciones descriptivas: el modelo no aprendió patrones contraintuitivos.", "Each effect's direction matches the descriptive associations: the model did not learn counter-intuitive patterns."),
        decisions: L("Qué conversaciones tener con jefaturas: carga laboral, desarrollo y entorno.", "Which conversations to have with managers: workload, development and environment."),
        limits: L("Para la variable «Horas extra» el color rojo marca la categoría más común (No).", "For “Overtime”, red marks the most common level (No)."),
      }}>
      <EChart option={option} height={360} label={t(L("Gráfico de enjambre de valores SHAP", "Beeswarm of SHAP values"))} />
    </ChartCard>
  );
}
function lvl2(c: TCtx, v: number | string) {
  return typeof v === "string" && c.lang === "es" ? c.d.levelsEs[v] ?? v : v;
}

export function FairnessChart({ c }: { c: TCtx }) {
  const { d, ct, lang, t } = c;
  const [attr, setAttr] = useState("AgeBand");
  const rows = d.fairness.filter((f) => f.attr === attr);
  const names = rows.map((r) => (lang === "es" ? r.groupEs : r.group));
  const option = useMemo<EOption>(() => ({
    ...base(ct), legend: legend(ct), grid: { left: 8, right: 16, top: 34, bottom: 8, containLabel: true },
    xAxis: catAxis(ct, names, { axisLabel: { color: ct.text2, fontSize: 12 } }), yAxis: valueAxis(ct, (v: number) => pct(v, lang, 0), { min: 0, max: 1 }),
    tooltip: { ...base(ct).tooltip, axisPointer: { type: "shadow", shadowStyle: { color: ct.grid, opacity: 0.5 } }, formatter: (ps: any[]) => { const r = rows[ps[0].dataIndex]; return tipHead(names[ps[0].dataIndex]) + ps.map((p) => tipRow(p.color, p.seriesName, pct(p.value, lang))).join("") + tipNote(`n = ${r.n} · ${t(L("precisión", "precision"))} ${r.precision != null ? pct(r.precision, lang, 0) : "—"}`); } },
    series: [
      { name: t(L("Proporción observada (Attrition = Yes)", "Observed share (Attrition = Yes)")), type: "bar", data: rows.map((r) => r.observed), itemStyle: barStyle(ct.neutral), barGap: "10%", barMaxWidth: 22 },
      { name: t(L("Marcados por el modelo", "Flagged by the model")), type: "bar", data: rows.map((r) => r.flagged), itemStyle: barStyle(ct.series[0]), barMaxWidth: 22 },
      { name: t(L("Recall (salidas detectadas)", "Recall (exits caught)")), type: "bar", data: rows.map((r) => r.recall ?? 0), itemStyle: barStyle(ct.series[1]), barMaxWidth: 22 },
    ],
  }), [rows, names, ct, lang, t]);
  const withRecall = rows.filter((r) => r.recall != null);
  const lo = [...withRecall].sort((a, b) => a.recall! - b.recall!)[0], hi = [...withRecall].sort((a, b) => b.recall! - a.recall!)[0];
  const abl = d.model.sensitiveAblation;
  return (
    <ChartCard id="chart-fairness" title={L("Auditoría de equidad", "Fairness audit")} subtitle={L("Predicciones fuera de pliegue para las 1.470 personas; atributos sensibles NO usados por el modelo", "Out-of-fold predictions for all 1,470 people; sensitive attributes NOT used by the model")}
      filters={[FT.global]} source={SRC}
      actions={<Segmented label={t(L("Atributo", "Attribute"))} value={attr} onChange={setAttr} options={[{ value: "AgeBand", label: t(L("Edad", "Age")) }, { value: "Gender", label: t(L("Género", "Gender")) }, { value: "MaritalStatus", label: t(L("Estado civil", "Marital status")) }]} />}
      table={{ columns: [t(L("Grupo", "Group")), "n", t(L("Observada", "Observed")), t(L("Marcados", "Flagged")), "Recall", t(L("Precisión", "Precision"))], rows: rows.map((r, i) => [names[i], r.n, pct(r.observed, lang), pct(r.flagged, lang), r.recall != null ? pct(r.recall, lang) : "—", r.precision != null ? pct(r.precision, lang) : "—"]) }}
      explain={{
        measures: L("Por grupo: proporción real de salidas, proporción marcada por el modelo (umbral elegido) y recall. Género, edad y estado civil se excluyeron como variables de entrada; aquí solo se usan para auditar.", "Per group: actual exit share, share flagged by the model (chosen threshold) and recall. Gender, age and marital status were excluded as inputs; here they are only used for auditing."),
        observed: lo && hi ? { es: `El recall varía entre ${pct(lo.recall!, "es", 0)} (${lo.groupEs}) y ${pct(hi.recall!, "es", 0)} (${hi.groupEs}): el modelo detecta peor las salidas de algunos grupos aunque no use el atributo. Excluir los atributos sensibles costó ${(abl.with - abl.without).toFixed(3)} de PR-AUC en CV.`, en: `Recall ranges from ${pct(lo.recall!, "en", 0)} (${lo.group}) to ${pct(hi.recall!, "en", 0)} (${hi.group}): the model catches exits worse for some groups even without using the attribute. Excluding sensitive attributes cost ${(abl.with - abl.without).toFixed(3)} PR-AUC in CV.` } : L("Sin datos.", "No data."),
        implications: L("Excluir un atributo no garantiza equidad: otras variables (p. ej. años de experiencia) actúan como aproximaciones de la edad.", "Excluding an attribute does not guarantee fairness: other variables (e.g. years of experience) act as proxies for age."),
        decisions: L("Cualquier uso real requiere revisión de equidad, umbrales por política explícita y supervisión humana.", "Any real use requires fairness review, policy-defined thresholds and human oversight."),
        limits: L("Grupos pequeños (p. ej. 50+ con 23 salidas) hacen que estas tasas sean inestables.", "Small groups (e.g. 50+ with 23 exits) make these rates unstable."),
      }}>
      <EChart option={option} height={300} label={t(L("Barras de métricas de equidad por grupo", "Bars of fairness metrics by group"))} />
    </ChartCard>
  );
}
