"use client";
import { useMemo, useState } from "react";
import { AppShell, Section } from "@/components/AppShell";
import { CASE_NAV, CaseIntro, FilterBar, FindingsSection, ImpactSection, LimitsSection, MethodSection, SlideList, bi, ins, type Step } from "@/components/CaseKit";
import { ChartCard } from "@/components/ChartCard";
import { EChart, type EOption } from "@/components/EChart";
import { KpiCard, type Method } from "@/components/KpiCard";
import { BigStat, PresentationMode, type Slide } from "@/components/Presentation";
import { LoadError, Loading } from "@/components/States";
import { axisTip, barStyle, base, catAxis, errorBars, legend, tipHead, tipNote, tipRow, valueAxis } from "@/components/chart-kit";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useDataset } from "@/lib/data";
import { num, pct } from "@/lib/format";
import { chartTheme, type ChartTheme } from "@/lib/palette";
import { L, usePrefs, type Bi, type Lang } from "@/lib/prefs";
import { wilson } from "@/lib/stats";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Cohort = "train" | "validation" | "holdout";
type BankData = {
  meta: { source: string; generatedAt: string };
  metrics: Record<string, number>;
  drift: { start: number[]; n: number[]; subs: number[]; cohort: Cohort[] } & Record<"euribor3m" | "emp_var_rate" | "nr_employed" | "cons_conf_idx" | "cons_price_idx", number[]>;
  segments: Record<string, { cats: string[]; rows: Record<Cohort, [number, number][]> }>;
  deciles: { n: number[]; subs: number[]; p: number[] };
  calibration: { n: number[]; subs: number[]; p: number[] };
  capacity: { rows: [number, number, number][]; total: number; contacts: number };
  checks: { check: string; passed: boolean; detail: string }[];
};
const isBank = (d: unknown): d is BankData => !!d && typeof d === "object" && "drift" in d && "capacity" in d;
const SRC = L("UCI Bank Marketing (Moro, Rita & Cortez, 2014), CC BY 4.0 · 41.188 contactos en orden cronológico", "UCI Bank Marketing (Moro, Rita & Cortez, 2014), CC BY 4.0 · 41,188 contacts in chronological order");
const COH: Record<Cohort | "all", Bi> = { all: L("Todas", "All"), train: L("Entrenamiento (60%)", "Training (60%)"), validation: L("Validación (20%)", "Validation (20%)"), holdout: L("Prueba final (20%)", "Final holdout (20%)") };
const DIMS: Record<string, Bi> = { contact: L("Canal de contacto", "Contact channel"), poutcome: L("Resultado de campaña previa", "Previous campaign outcome"), month: L("Mes del contacto", "Contact month"), job: L("Ocupación", "Occupation"), education: L("Educación", "Education"), age_band: L("Tramo de edad", "Age band"), marital: L("Estado civil", "Marital status") };
const MACRO: Record<string, { label: Bi; unit: string }> = {
  euribor3m: { label: L("Euribor a 3 meses (%)", "3-month Euribor (%)"), unit: "%" },
  emp_var_rate: { label: L("Variación del empleo (trimestral)", "Employment variation rate (quarterly)"), unit: "" },
  nr_employed: { label: L("Número de empleados (miles)", "Number employed (thousands)"), unit: "" },
  cons_conf_idx: { label: L("Índice de confianza del consumidor", "Consumer confidence index"), unit: "" },
};
type Ctx = { d: BankData; ct: ChartTheme; lang: Lang; t: (b: Bi | string) => string; cohort: Cohort | "all" };

export default function BankApp() {
  const s = useDataset<BankData>("case-bank", isBank);
  if (s.status === "loading") return <Loading what="Campaign Drift Audit" />;
  if (s.status === "error") return <LoadError error={s.error} dataset="case-bank" />;
  return <Bank d={s.data} />;
}

function Bank({ d }: { d: BankData }) {
  const { lang, theme, t } = usePrefs();
  const ct = useMemo(() => chartTheme(theme), [theme]);
  const [cohort, setCohort] = useState<Cohort | "all">("all");
  const [present, setPresent] = useState(false);
  const m = d.metrics;
  const c: Ctx = { d, ct, lang, t, cohort };
  const M = (definition: Bi, formula: string, notes: Bi): Method => ({ definition, formula, source: SRC, notes });
  const rateOf = (coh: Cohort | "all") => {
    const idx = d.drift.cohort.map((x, i) => (coh === "all" || x === coh ? i : -1)).filter((i) => i >= 0);
    const n = idx.reduce((s, i) => s + d.drift.n[i], 0), k = idx.reduce((s, i) => s + d.drift.subs[i], 0);
    return { n, k, r: k / n };
  };
  const sc = rateOf(cohort);
  const top20 = d.capacity.rows.find((r) => r[0] === 0.2)!;
  const insights = [
    ins("drift", "measured", L("La tasa de suscripción se multiplicó por 6 entre el inicio y el final de los datos", "The subscription rate grew 6× between the start and the end of the data"),
      bi((l) => l === "es" ? `Entrenamiento ${pct(m.train_rate, l)}, validación ${pct(m.validation_rate, l)}, prueba final ${pct(m.holdout_rate, l)}, con el mismo orden cronológico.` : `Training ${pct(m.train_rate, l)}, validation ${pct(m.validation_rate, l)}, final holdout ${pct(m.holdout_rate, l)}, in the same chronological order.`),
      L("Un modelo entrenado con el pasado aprende un mundo que ya no existe: cambió el contexto, no solo la muestra.", "A model trained on the past learns a world that no longer exists: the context changed, not just the sample."),
      L("Monitorear la tasa base y las variables macro antes de confiar en cualquier puntaje.", "Monitor the base rate and macro variables before trusting any score."),
      L("Revisar si cambió también la política de campañas (a quién se llamó).", "Check whether the campaign policy (who was called) also changed.")),
    ins("auc", "measured", L("En el período final el modelo ordena peor que el azar", "In the final period the model ranks worse than chance"),
      bi((l) => l === "es" ? `ROC-AUC en prueba = ${num(m.holdout_auc, l, 3)} (azar = 0,5). El 30% de puntajes más bajos convierte más que el 30% más alto.` : `Holdout ROC-AUC = ${num(m.holdout_auc, l, 3)} (chance = 0.5). The lowest-scored 30% converts more than the highest-scored 30%.`),
      L("Desplegarlo priorizaría a los clientes equivocados.", "Deploying it would prioritise the wrong customers."),
      L("Bloquear el despliegue y reentrenar con datos recientes y validación temporal.", "Block deployment and retrain on recent data with temporal validation."),
      L("Fijar umbrales de aceptación (AUC, calibración) antes del próximo intento.", "Set acceptance thresholds (AUC, calibration) before the next attempt.")),
    ins("calib", "measured", L("Las probabilidades no significan nada en el período nuevo", "Probabilities mean nothing in the new period"),
      bi((l) => l === "es" ? `El modelo asigna en promedio menos de 0,01% de probabilidad, pero en prueba convirtió el ${pct(m.holdout_rate, l)} (Brier ${num(m.brier, l, 3)}).` : `The model assigns on average under 0.01% probability, yet the holdout converted ${pct(m.holdout_rate, l)} (Brier ${num(m.brier, l, 3)}).`),
      L("Cualquier cálculo de costo-beneficio con esas probabilidades estaría equivocado por órdenes de magnitud.", "Any cost-benefit calculation with those probabilities would be off by orders of magnitude."),
      L("Recalibrar con datos recientes o usar solo el orden relativo, con validación.", "Recalibrate on recent data or use only relative ranking, with validation."),
      L("Verificar si la definición de la variable objetivo cambió.", "Verify whether the target definition changed.")),
    ins("top20", "measured", L("Aun así, el 20% de puntaje más alto convierte algo más que el promedio", "Even so, the top-scored 20% converts slightly above average"),
      bi((l) => l === "es" ? `Top 20%: ${num(top20[2], l)} suscripciones en ${num(top20[1], l)} contactos (${pct(top20[2] / top20[1], l)}), lift ${num(m.lift_top20, l, 2)}× sobre la tasa de prueba.` : `Top 20%: ${num(top20[2], l)} subscriptions in ${num(top20[1], l)} contacts (${pct(top20[2] / top20[1], l)}), lift ${num(m.lift_top20, l, 2)}× over the holdout rate.`),
      L("Una señal parcial no compensa un orden global invertido: el resto de la lista está peor que al azar.", "A partial signal does not offset an inverted global ranking: the rest of the list is worse than random."),
      L("No usar la lista completa; si se usa algo, solo el tramo superior y con monitoreo.", "Do not use the full list; if anything, only the top tranche with monitoring."),
      L("Comprobar estabilidad del tramo superior en otra ventana temporal.", "Check stability of the top tranche in another time window.")),
    ins("segments", "measured", L("Canal y campaña previa siguen siendo diferenciadores", "Channel and previous campaign remain differentiators"),
      L("En todas las cohortes, contactos por celular y clientes con éxito en la campaña previa convierten más; ver gráfico de segmentos.", "Across cohorts, mobile contacts and customers with a previous success convert more; see the segment chart."),
      L("Son asociaciones descriptivas útiles para diseñar reglas simples mientras se reentrena.", "They are descriptive associations useful for simple rules while retraining."),
      L("Probar reglas simples (canal, historial) como línea base frente a un modelo nuevo.", "Test simple rules (channel, history) as a baseline against a new model."),
      L("No son efectos causales: el banco eligió a quién llamar.", "They are not causal effects: the bank chose whom to call.")),
  ];
  const steps: Step[] = [
    { title: L("Comprensión del problema", "Understanding the problem"), body: L("¿Se puede usar un modelo de propensión para priorizar llamadas de una campaña de depósitos a plazo?", "Can a propensity model prioritise calls in a term-deposit campaign?") },
    { title: L("Recolección de datos", "Data collection"), body: L("UCI Bank Marketing (bank-additional-full), 41.188 contactos, archivo oficial con SHA-256.", "UCI Bank Marketing (bank-additional-full), 41,188 contacts, official file with SHA-256.") },
    { title: L("Preparación", "Preparation"), body: L("Orden cronológico conservado; se excluye la duración de la llamada (solo se conoce después).", "Chronological order kept; call duration excluded (only known afterwards)."), facts: [L("Partición temporal 60/20/20, sin mezclar", "Temporal 60/20/20 split, no shuffling")] },
    { title: L("Análisis exploratorio", "Exploratory analysis"), body: L("Tasa base por bloque de contactos, contexto macro y segmentos por cohorte.", "Base rate by contact block, macro context and segments by cohort.") },
    { title: L("Desarrollo del modelo", "Model development"), body: L("Regresión logística en scikit-learn, ajustada en entrenamiento y elegida en validación.", "Logistic regression in scikit-learn, fitted on training and chosen on validation.") },
    { title: L("Evaluación", "Evaluation"), body: L("ROC-AUC, precisión promedio, Brier, deciles y curva de captura en la cohorte final intacta.", "ROC-AUC, average precision, Brier, deciles and capture curve on the untouched final cohort."), facts: [L(`AUC ${num(m.holdout_auc, "es", 3)} → no desplegar`, `AUC ${num(m.holdout_auc, "en", 3)} → do not deploy`)] },
    { title: L("Decisión", "Decision"), body: L("Bloquear despliegue, documentar la deriva y proponer monitoreo + reentrenamiento.", "Block deployment, document drift and propose monitoring + retraining."), facts: [L(`${d.checks.length} controles reproducidos en esta página`, `${d.checks.length} checks reproduced on this page`)] },
  ];
  const slides: Slide[] = [
    { kicker: L("Contexto", "Context"), title: L("¿Este modelo de campaña bancaria puede salir a producción?", "Can this bank campaign model go to production?"), body: <p className="max-w-3xl">{t(L("41.188 llamadas reales de un banco portugués (UCI), evaluadas en orden cronológico, como ocurriría en producción.", "41,188 real calls from a Portuguese bank (UCI), evaluated in chronological order, as would happen in production."))}</p> },
    { kicker: L("Indicadores", "Indicators"), title: L("La realidad cambió bajo el modelo", "Reality shifted under the model"), body: <div className="grid gap-4 md:grid-cols-4">
      <BigStat value={pct(m.train_rate, lang)} label={t(L("Tasa en entrenamiento", "Training rate"))} />
      <BigStat value={pct(m.holdout_rate, lang)} label={t(L("Tasa en prueba", "Holdout rate"))} />
      <BigStat value={num(m.holdout_auc, lang, 3)} label="ROC-AUC" note={t(L("azar = 0,5", "chance = 0.5"))} />
      <BigStat value={num(m.brier, lang, 3)} label="Brier" note={t(L("≈ tasa base: sin información", "≈ base rate: no information"))} />
    </div> },
    { kicker: L("Hallazgos", "Findings"), title: L("Lo que muestran los datos", "What the data shows"), body: <SlideList items={insights.slice(0, 4).map((i) => i.evidence)} /> },
    { kicker: L("Decisión", "Decision"), title: L("No desplegar; monitorear y reentrenar", "Do not deploy; monitor and retrain"), body: <SlideList items={[L("Monitorear tasa base y variables macro mensualmente.", "Monitor base rate and macro variables monthly."), L("Reentrenar con ventana reciente y validación temporal.", "Retrain on a recent window with temporal validation."), L("Fijar umbrales de aceptación antes de evaluar.", "Set acceptance thresholds before evaluating.")]} /> },
    { kicker: L("Limitaciones", "Limitations"), title: L("Lo que este análisis no puede afirmar", "What this analysis cannot claim"), body: <SlideList items={[L("Asociaciones, no efectos de llamar.", "Associations, not effects of calling."), L("Sin costos ni márgenes del banco.", "No bank costs or margins."), L("Un solo banco, 2008–2010.", "A single bank, 2008–2010.")]} /> },
  ];
  return (
    <>
      <AppShell app="Campaign Drift Audit" tagline={L("Auditoría de modelo · UCI Bank Marketing", "Model audit · UCI Bank Marketing")} nav={CASE_NAV([{ id: "exploratorio", label: L("Deriva y segmentos", "Drift and segments") }, { id: "modelos", label: L("Evaluación del modelo", "Model evaluation") }])} onPresent={() => setPresent(true)}
        filterBar={<FilterBar><div className="w-52"><Select label={t(L("Cohorte temporal", "Time cohort"))} value={cohort} onChange={(e) => setCohort(e.target.value as Cohort | "all")}>
          {(Object.keys(COH) as (Cohort | "all")[]).map((k) => <option key={k} value={k}>{t(COH[k])}</option>)}
        </Select></div></FilterBar>}>
        <CaseIntro kind="real" badges={["UCI · CC BY 4.0", "n = 41.188", t(L("orden cronológico", "chronological order"))]}
          summary={[
            bi((l) => l === "es" ? `La tasa de suscripción pasó de ${pct(m.train_rate, l)} (entrenamiento) a ${pct(m.holdout_rate, l)} (prueba final): el contexto cambió por completo.` : `The subscription rate went from ${pct(m.train_rate, l)} (training) to ${pct(m.holdout_rate, l)} (final holdout): the context changed completely.`),
            bi((l) => l === "es" ? `En el período final el modelo ordena peor que el azar (ROC-AUC ${num(m.holdout_auc, l, 3)}) y sus probabilidades están descalibradas (Brier ${num(m.brier, l, 3)}).` : `In the final period the model ranks worse than chance (ROC-AUC ${num(m.holdout_auc, l, 3)}) and its probabilities are miscalibrated (Brier ${num(m.brier, l, 3)}).`),
            L("Una validación aleatoria habría ocultado el problema; la partición temporal lo hace visible.", "A random validation would have hidden the problem; the temporal split makes it visible."),
          ]}
          decision={L("no desplegar el modelo; monitorear la tasa base y reentrenar con datos recientes y validación temporal.", "do not deploy the model; monitor the base rate and retrain on recent data with temporal validation.")}
          questions={[[L("¿Cambió la tasa de conversión?", "Did the conversion rate change?"), "chart-drift"], [L("¿Qué pasó en el contexto?", "What happened in the context?"), "chart-macro"], [L("¿Qué segmentos convierten más?", "Which segments convert more?"), "chart-segments"], [L("¿El modelo ordena bien?", "Does the model rank well?"), "chart-deciles"], [L("¿Sus probabilidades sirven?", "Are its probabilities usable?"), "chart-calibration"], [L("¿Cuánto capta si llamo al X%?", "How much is captured calling X%?"), "simulator"]]} />

        <Section id="dashboard" n={3} title={L("Dashboard de la campaña", "Campaign dashboard")} intro={bi((l) => l === "es" ? `Cohorte: ${COH[cohort].es}. Las métricas del modelo siempre se miden en la prueba final.` : `Cohort: ${COH[cohort].en}. Model metrics are always measured on the final holdout.`)}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <KpiCard label={L("Contactos", "Contacts")} value={num(sc.n, lang)} change={null} changeLabel={t(COH[cohort])} description={L("Llamadas en la cohorte", "Calls in the cohort")} method={M(L("Contactos telefónicos de la campaña en la cohorte elegida.", "Campaign phone contacts in the chosen cohort."), "COUNT(contacts)", L("Orden cronológico original del archivo.", "Original chronological order of the file."))} />
            <KpiCard label={L("Tasa de suscripción", "Subscription rate")} value={pct(sc.r, lang)} change={null} changeLabel={(() => { const [lo, hi] = wilson(sc.k, sc.n); return `IC 95% ${pct(lo, lang)}–${pct(hi, lang)}`; })()} description={bi((l) => `${num(sc.k, l)} ${l === "es" ? "suscripciones" : "subscriptions"}`)} method={M(L("Contactos que terminaron en depósito a plazo.", "Contacts that ended in a term deposit."), "SUM(y = yes) / COUNT(*)", L("Intervalo de Wilson del 95%.", "95% Wilson interval."))} />
            <KpiCard label={L("Cambio de tasa base", "Base-rate shift")} value={`×${num(m.holdout_rate / m.train_rate, lang, 1)}`} change={null} changeLabel={`${pct(m.train_rate, lang)} → ${pct(m.holdout_rate, lang)}`} description={L("Entrenamiento → prueba final", "Training → final holdout")} method={M(L("Cociente entre tasas de la prueba final y del entrenamiento.", "Ratio of holdout to training rates."), "rate_holdout / rate_train", L("Señal directa de deriva del objetivo.", "Direct signal of target drift."))} />
            <KpiCard label={L("ROC-AUC", "ROC-AUC")} value={num(m.holdout_auc, lang, 3)} change={m.holdout_auc - 0.5} changeLabel={t(L("vs 0,5 del azar", "vs 0.5 chance"))} description={L("Prueba final · menor a 0,5 = invertido", "Final holdout · below 0.5 = inverted")} method={M(L("Probabilidad de que un suscriptor tenga mayor puntaje que un no suscriptor.", "Probability a subscriber scores above a non-subscriber."), "AUC = P(s⁺ > s⁻)", L("Recalculado en el build a partir de los puntajes.", "Recomputed in the build from the scores."))} />
            <KpiCard label={L("Precisión promedio", "Average precision")} value={num(m.holdout_ap, lang, 3)} change={m.holdout_ap - m.holdout_rate} changeLabel={`${t(L("vs tasa base", "vs base rate"))} ${num(m.holdout_rate, lang, 3)}`} description={L("Apenas sobre la tasa base", "Barely above the base rate")} method={M(L("Área bajo la curva precisión-recall.", "Area under the precision-recall curve."), "AP = Σ (Rₙ − Rₙ₋₁) Pₙ", L("La referencia aleatoria es la tasa base.", "The random reference is the base rate."))} />
            <KpiCard label={L("Brier", "Brier")} value={num(m.brier, lang, 3)} change={null} changeLabel={t(L("≈ tasa base", "≈ base rate"))} description={L("Error de probabilidad: 0 es perfecto", "Probability error: 0 is perfect")} method={M(L("Error cuadrático medio entre probabilidad y resultado.", "Mean squared error between probability and outcome."), "mean((p − y)²)", L("Con p≈0 en todos, Brier ≈ tasa base.", "With p≈0 for everyone, Brier ≈ base rate."))} goodWhenUp={false} />
          </div>
          <div className="mt-4"><DriftChart c={c} /></div>
        </Section>

        <Section id="exploratorio" n={4} title={L("Deriva del contexto y segmentos", "Context drift and segments")}>
          <div className="grid gap-4 xl:grid-cols-2"><MacroChart c={c} /><SegmentChart c={c} /></div>
        </Section>
        <Section id="modelos" n={5} title={L("Evaluación del modelo en la prueba final", "Model evaluation on the final holdout")} intro={L("8.238 contactos que el modelo nunca vio, posteriores a todo el entrenamiento.", "8,238 contacts the model never saw, later than all training data.")}>
          <div className="grid gap-4 xl:grid-cols-2"><DecileChart c={c} /><CalibrationChart c={c} /></div>
        </Section>
        <FindingsSection n={6} items={insights} />
        <ImpactSection n={7}
          measured={[bi((l) => l === "es" ? `Tasa base ×${num(m.holdout_rate / m.train_rate, l, 1)} entre entrenamiento y prueba.` : `Base rate ×${num(m.holdout_rate / m.train_rate, l, 1)} between training and holdout.`), bi((l) => `ROC-AUC ${num(m.holdout_auc, l, 3)}; Brier ${num(m.brier, l, 3)}.`), bi((l) => l === "es" ? `Top 20%: precisión ${pct(m.precision_top20, l)}, lift ${num(m.lift_top20, l, 2)}×.` : `Top 20%: precision ${pct(m.precision_top20, l)}, lift ${num(m.lift_top20, l, 2)}×.`)]}
          simulated={<p>{t(L("Suscripciones captadas según capacidad de llamadas, modelo vs azar, medidas sobre la prueba final (ajustable abajo).", "Subscriptions captured by call capacity, model vs random, measured on the holdout (adjustable below)."))}</p>}
          expected={[L("Evitar un despliegue que priorizaría a los clientes equivocados", "Avoid a deployment that would prioritise the wrong customers"), L("Monitoreo de deriva como práctica estándar", "Drift monitoring as standard practice"), L("Criterios de aceptación definidos antes de evaluar", "Acceptance criteria defined before evaluation")]}>
          <CapacitySim c={c} />
        </ImpactSection>
        <MethodSection n={8} steps={steps}
          stages={[{ name: L("Fuente", "Source"), tech: "UCI · SHA-256", detail: L("bank-additional-full.csv", "bank-additional-full.csv") }, { name: L("SQL", "SQL"), tech: "SQLite / DuckDB", detail: L("Cohortes y captura por tramo", "Cohorts and capture per tranche") }, { name: L("Modelo", "Model"), tech: "scikit-learn", detail: L("Logística, partición temporal", "Logistic, temporal split") }, { name: L("Evidencia", "Evidence"), tech: "Excel · CSV", detail: L("Puntajes y métricas publicados", "Published scores and metrics") }, { name: L("App", "App"), tech: "Next.js · ECharts", detail: L("Deriva, deciles, calibración", "Drift, deciles, calibration") }]}
          defs={[["ROC-AUC", "P(score⁺ > score⁻)", t(L("0,5 = azar", "0.5 = chance"))], ["AP", "Σ ΔR·P", t(L("Referencia = tasa base", "Reference = base rate"))], ["Brier", "mean((p−y)²)", t(L("Calibración + discriminación", "Calibration + discrimination"))], ["Lift top 20%", "precision₂₀ / base rate", t(L("Sobre la prueba final", "On the final holdout"))]]}
          checks={d.checks}
          decisions={[L("Partición temporal y no aleatoria: replica cómo se usaría el modelo.", "Temporal, not random, split: replicates how the model would be used."), L("La duración de la llamada se excluye: es fuga de información.", "Call duration is excluded: it is information leakage."), L("Se reportan deciles y calibración además del AUC para ver dónde falla.", "Deciles and calibration are reported besides AUC to see where it fails.")]}
          repo="https://github.com/Chrov/Portfolio/tree/main/case-studies/bank-campaign" generated={d.meta.generatedAt}
          links={[{ href: "../../case-studies/bank-campaign/dashboard.xlsx", label: L("Dashboard Excel", "Excel dashboard") }, { href: "../../case-studies/bank-campaign/evidence-pack.zip", label: L("Paquete de evidencia (ZIP)", "Evidence pack (ZIP)") }, { href: "https://archive.ics.uci.edu/dataset/222/bank+marketing", label: L("Dataset en UCI", "Dataset at UCI"), external: true }]} />
        <LimitsSection n={9}
          limits={[L("Un banco portugués, 2008–2010: no generaliza a otros mercados.", "One Portuguese bank, 2008–2010: does not generalise to other markets."), L("Sin costos por llamada ni margen por depósito: no se calcula retorno.", "No cost per call or margin per deposit: no return is computed."), L("Las asociaciones por segmento reflejan a quién eligió llamar el banco.", "Segment associations reflect whom the bank chose to call."), L("El modelo auditado es uno; otro algoritmo podría degradarse distinto.", "One model was audited; another algorithm might degrade differently.")]}
          future={[L("Reentrenar con ventana móvil y comparar contra reglas simples.", "Retrain with a rolling window and compare against simple rules."), L("Monitorear PSI de variables macro y tasa base.", "Monitor PSI of macro variables and base rate."), L("Agregar costos para optimizar capacidad de llamadas.", "Add costs to optimise call capacity.")]} />
      </AppShell>
      <PresentationMode open={present} onClose={() => setPresent(false)} slides={slides} app="Campaign Drift Audit" />
    </>
  );
}

function cohortAreas(ct: ChartTheme, d: BankData, t: (b: Bi) => string) {
  const first = (k: Cohort) => d.drift.cohort.indexOf(k), last = (k: Cohort) => d.drift.cohort.lastIndexOf(k);
  return {
    silent: true, itemStyle: { color: ct.neutralSoft, opacity: 0.35 }, label: { color: ct.text3, fontSize: 10, position: "insideTop" as const },
    data: (["validation", "holdout"] as Cohort[]).map((k) => [{ xAxis: first(k), name: t(COH[k]) }, { xAxis: last(k) }]),
  };
}

function DriftChart({ c }: { c: Ctx }) {
  const { d, ct, lang, t } = c;
  const v = d.drift.n.map((n, i) => { const [lo, hi] = wilson(d.drift.subs[i], n); return { r: d.drift.subs[i] / n, lo, hi }; });
  const labels = d.drift.start.map((s) => num(s + 1, lang));
  const option = useMemo<EOption>(() => ({
    ...base(ct), legend: legend(ct, { data: [t(L("Tasa de suscripción", "Subscription rate")), t(L("IC 95%", "95% CI"))] }),
    xAxis: catAxis(ct, labels, { name: t(L("Contacto n.º (bloques de 1.000)", "Contact # (blocks of 1,000)")), nameLocation: "middle", nameGap: 26 }), yAxis: valueAxis(ct, (x: number) => pct(x, lang, 0)),
    grid: { left: 8, right: 16, top: 32, bottom: 28, containLabel: true },
    tooltip: axisTip(ct, (i) => tipHead(`${t(L("Contactos", "Contacts"))} ${num(d.drift.start[i] + 1, lang)}–${num(d.drift.start[i] + d.drift.n[i], lang)}`) + tipRow(ct.series[0], t(L("Tasa", "Rate")), pct(v[i].r, lang)) + tipRow(ct.neutral, "IC 95%", `${pct(v[i].lo, lang)} – ${pct(v[i].hi, lang)}`) + tipNote(t(COH[d.drift.cohort[i]]))),
    series: [
      { name: "lo", type: "line", data: v.map((x) => x.lo), stack: "ci", lineStyle: { opacity: 0 }, symbol: "none", silent: true },
      { name: t(L("IC 95%", "95% CI")), type: "line", data: v.map((x) => x.hi - x.lo), stack: "ci", lineStyle: { opacity: 0 }, areaStyle: { color: ct.band }, itemStyle: { color: ct.band }, symbol: "none", silent: true },
      { name: t(L("Tasa de suscripción", "Subscription rate")), type: "line", data: v.map((x) => x.r), lineStyle: { width: 2, color: ct.series[0] }, itemStyle: { color: ct.series[0] }, symbolSize: 5, markArea: cohortAreas(ct, d, t) },
    ],
  }), [v, labels, ct, lang, t, d]);
  const first10 = v.slice(0, 10).reduce((s, x) => s + x.r, 0) / 10, last5 = v.slice(-5).reduce((s, x) => s + x.r, 0) / 5;
  return (
    <ChartCard id="chart-drift" title={L("La tasa de conversión cambió a lo largo del tiempo", "The conversion rate changed over time")} subtitle={L("Suscripción por bloque de 1.000 contactos consecutivos; sombreado = cohortes de validación y prueba", "Subscription per block of 1,000 consecutive contacts; shading = validation and holdout cohorts")}
      filters={[L("Todas las cohortes (referencia)", "All cohorts (reference)")]} source={SRC}
      table={{ columns: [t(L("Desde contacto", "From contact")), "n", t(L("Suscripciones", "Subscriptions")), t(L("Tasa", "Rate")), t(L("Cohorte", "Cohort"))], rows: d.drift.n.map((n, i) => [labels[i], n, d.drift.subs[i], pct(v[i].r, lang), t(COH[d.drift.cohort[i]])]) }}
      explain={{
        measures: L("Proporción de contactos que suscribieron, en bloques de 1.000 en orden cronológico, con intervalo de Wilson del 95%.", "Share of contacts that subscribed, in blocks of 1,000 in chronological order, with a 95% Wilson interval."),
        observed: bi((l) => l === "es" ? `Los primeros 10 bloques promedian ${pct(first10, l)}; los últimos 5, ${pct(last5, l)}. El salto ocurre dentro del período de validación y se acentúa en la prueba final.` : `The first 10 blocks average ${pct(first10, l)}; the last 5, ${pct(last5, l)}. The jump happens within the validation period and sharpens in the final holdout.`),
        implications: L("El modelo aprendió con un mundo de ~5% de conversión y se evalúa en uno de ~30%: es deriva del objetivo, no ruido.", "The model learned in a ~5% conversion world and is evaluated in a ~30% one: target drift, not noise."),
        decisions: L("Monitorear la tasa base como alerta temprana antes de usar cualquier puntaje.", "Monitor the base rate as an early warning before using any score."),
        limits: L("No sabemos si cambió el cliente, la economía o la política de a quién llamar.", "We do not know whether customers, the economy or the calling policy changed."),
      }}>
      <EChart option={option} height={320} label={t(L("Tasa de suscripción en el tiempo", "Subscription rate over time"))} />
    </ChartCard>
  );
}

function MacroChart({ c }: { c: Ctx }) {
  const { d, ct, lang, t } = c;
  const [k, setK] = useState<keyof typeof MACRO>("euribor3m");
  const vals = d.drift[k as keyof BankData["drift"]] as number[];
  const labels = d.drift.start.map((s) => num(s + 1, lang));
  const option = useMemo<EOption>(() => ({
    ...base(ct), grid: { left: 8, right: 16, top: 28, bottom: 28, containLabel: true },
    xAxis: catAxis(ct, labels, { name: t(L("Contacto n.º", "Contact #")), nameLocation: "middle", nameGap: 26 }), yAxis: valueAxis(ct, (x: number) => num(x, lang, k === "nr_employed" ? 0 : 1), { scale: true }),
    tooltip: axisTip(ct, (i) => tipHead(`${t(L("Contactos", "Contacts"))} ${labels[i]}+`) + tipRow(ct.series[3], t(MACRO[k].label), num(vals[i], lang, 2)) + tipNote(t(COH[d.drift.cohort[i]]))),
    series: [{ type: "line", data: vals, lineStyle: { width: 2, color: ct.series[3] }, itemStyle: { color: ct.series[3] }, symbolSize: 4, markArea: cohortAreas(ct, d, t) }],
  }), [vals, labels, ct, lang, t, d, k]);
  const trainAvg = vals.filter((_, i) => d.drift.cohort[i] === "train"), holdAvg = vals.filter((_, i) => d.drift.cohort[i] === "holdout");
  const avg = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
  return (
    <ChartCard id="chart-macro" title={L("El contexto económico también cambió", "The economic context changed too")} subtitle={MACRO[k].label}
      actions={<div className="w-48"><Select label={t(L("Variable", "Variable"))} value={k} onChange={(e) => setK(e.target.value as keyof typeof MACRO)}>{Object.keys(MACRO).map((x) => <option key={x} value={x}>{t(MACRO[x].label)}</option>)}</Select></div>}
      filters={[L("Variable macro", "Macro variable")]} source={SRC}
      explain={{
        measures: L("Promedio de la variable macroeconómica incluida en el dataset, por bloque de 1.000 contactos.", "Average of the macroeconomic variable included in the dataset, per block of 1,000 contacts."),
        observed: bi((l) => l === "es" ? `${MACRO[k].label.es}: ${num(avg(trainAvg), l, 2)} en entrenamiento frente a ${num(avg(holdAvg), l, 2)} en la prueba final.` : `${MACRO[k].label.en}: ${num(avg(trainAvg), l, 2)} in training vs ${num(avg(holdAvg), l, 2)} in the final holdout.`),
        implications: L("La prueba final cae en un régimen económico distinto (tasas bajas, menos empleo): el modelo extrapola fuera de lo que vio.", "The final holdout falls in a different economic regime (low rates, less employment): the model extrapolates beyond what it saw."),
        decisions: L("Incluir indicadores de régimen en el monitoreo y reentrenar cuando cambien.", "Include regime indicators in monitoring and retrain when they shift."),
        limits: L("Coincidencia temporal, no causalidad: la tasa base pudo cambiar por otras razones.", "Temporal coincidence, not causation: the base rate may have changed for other reasons."),
      }}>
      <EChart option={option} height={300} label={t(MACRO[k].label)} />
    </ChartCard>
  );
}

function SegmentChart({ c }: { c: Ctx }) {
  const { d, ct, lang, t, cohort } = c;
  const [dim, setDim] = useState("poutcome");
  const seg = d.segments[dim];
  const rows = useMemo(() => seg.cats.map((cat, i) => {
    const pairs = cohort === "all" ? (["train", "validation", "holdout"] as Cohort[]).map((k) => seg.rows[k][i]) : [seg.rows[cohort][i]];
    const n = pairs.reduce((s, p) => s + p[0], 0), k = pairs.reduce((s, p) => s + p[1], 0);
    const [lo, hi] = wilson(k, n);
    return { cat, n, k, r: n ? k / n : NaN, lo, hi };
  }).filter((x) => x.n >= 30).sort((a, b) => b.r - a.r), [seg, cohort]);
  const all = rateOfRows(rows);
  const option = useMemo<EOption>(() => ({
    ...base(ct), grid: { left: 8, right: 24, top: 8, bottom: 8, containLabel: true },
    yAxis: catAxis(ct, rows.map((r) => r.cat), { inverse: true }), xAxis: valueAxis(ct, (x: number) => pct(x, lang, 0)),
    tooltip: axisTip(ct, (i) => tipHead(rows[i].cat) + tipRow(ct.series[0], t(L("Tasa", "Rate")), pct(rows[i].r, lang)) + tipRow(ct.neutral, "IC 95%", `${pct(rows[i].lo, lang)} – ${pct(rows[i].hi, lang)}`) + tipNote(`n = ${num(rows[i].n, lang)}`), true),
    series: [
      { type: "bar", data: rows.map((r) => r.r), itemStyle: barStyle(ct.series[0], true), barMaxWidth: 14, markLine: { symbol: "none", silent: true, lineStyle: { color: ct.text3, type: "dashed" }, label: { formatter: t(L("Promedio", "Average")), color: ct.text3, fontSize: 10 }, data: [{ xAxis: all }] } },
      errorBars("ci", ct.text2, rows.map((r, i) => [i, r.lo, r.hi]), true),
    ],
  }), [rows, ct, lang, t, all]);
  return (
    <ChartCard id="chart-segments" title={L("¿Qué segmentos convierten más?", "Which segments convert more?")} subtitle={bi((l) => `${DIMS[dim][l]} · ${COH[cohort][l]}`)}
      actions={<div className="w-48"><Select label={t(L("Dimensión", "Dimension"))} value={dim} onChange={(e) => setDim(e.target.value)}>{Object.keys(DIMS).map((x) => <option key={x} value={x}>{t(DIMS[x])}</option>)}</Select></div>}
      filters={[L("Cohorte", "Cohort"), L("Dimensión", "Dimension")]} source={SRC} empty={!rows.length}
      table={{ columns: [t(L("Segmento", "Segment")), "n", t(L("Suscripciones", "Subscriptions")), t(L("Tasa", "Rate")), "IC 95%"], rows: rows.map((r) => [r.cat, num(r.n, lang), num(r.k, lang), pct(r.r, lang), `${pct(r.lo, lang)}–${pct(r.hi, lang)}`]) }}
      explain={{
        measures: L("Tasa de suscripción por categoría con intervalo de Wilson del 95%; se ocultan categorías con menos de 30 contactos.", "Subscription rate per category with a 95% Wilson interval; categories with fewer than 30 contacts are hidden."),
        observed: rows.length ? bi((l) => l === "es" ? `En ${COH[cohort].es.toLowerCase()}, «${rows[0].cat}» convierte ${pct(rows[0].r, l)} y «${rows[rows.length - 1].cat}» ${pct(rows[rows.length - 1].r, l)} (promedio ${pct(all, l)}).` : `In ${COH[cohort].en.toLowerCase()}, “${rows[0].cat}” converts ${pct(rows[0].r, l)} and “${rows[rows.length - 1].cat}” ${pct(rows[rows.length - 1].r, l)} (average ${pct(all, l)}).`) : L("Sin datos suficientes.", "Not enough data."),
        implications: L("Cambia la cohorte: los segmentos fuertes suelen mantenerse, pero el nivel de todos sube. Por eso un modelo sin recalibrar falla aunque el orden de segmentos se conserve.", "Change the cohort: strong segments usually stay strong, but every level rises. That is why an uncalibrated model fails even if segment order holds."),
        decisions: L("Diseñar reglas simples de priorización (canal, historial) como línea base.", "Design simple prioritisation rules (channel, history) as a baseline."),
        limits: L("Asociación, no efecto: el banco decidió a quién y cómo contactar.", "Association, not effect: the bank decided whom and how to contact."),
      }}>
      <EChart option={option} height={Math.max(220, rows.length * 28 + 30)} label={t(L("Tasa por segmento", "Rate by segment"))} />
    </ChartCard>
  );
}
const rateOfRows = (rows: { n: number; k: number }[]) => rows.reduce((s, r) => s + r.k, 0) / Math.max(1, rows.reduce((s, r) => s + r.n, 0));

function DecileChart({ c }: { c: Ctx }) {
  const { d, ct, lang, t } = c;
  const r = d.deciles.n.map((n, i) => d.deciles.subs[i] / n);
  const base0 = d.metrics.holdout_rate;
  const labels = r.map((_, i) => `D${i + 1}`);
  const option = useMemo<EOption>(() => ({
    ...base(ct), xAxis: catAxis(ct, labels, { name: t(L("Decil de puntaje (D1 = más alto)", "Score decile (D1 = highest)")), nameLocation: "middle", nameGap: 26 }), yAxis: valueAxis(ct, (x: number) => pct(x, lang, 0)),
    grid: { left: 8, right: 16, top: 24, bottom: 28, containLabel: true },
    tooltip: axisTip(ct, (i) => tipHead(labels[i]) + tipRow(ct.series[0], t(L("Tasa observada", "Observed rate")), pct(r[i], lang)) + tipNote(`${num(d.deciles.subs[i], lang)} / ${num(d.deciles.n[i], lang)} · ${t(L("prob. media del modelo", "model mean prob."))} ${(d.deciles.p[i] * 100).toExponential(1)}%`), true),
    series: [{ type: "bar", data: r.map((x) => ({ value: x, itemStyle: barStyle(x >= base0 ? ct.series[0] : ct.series[1]) })), barMaxWidth: 30,
      markLine: { symbol: "none", silent: true, lineStyle: { color: ct.text3, type: "dashed" }, label: { formatter: t(L("Tasa base", "Base rate")), position: "insideEndTop", color: ct.text3, fontSize: 10 }, data: [{ yAxis: base0 }] } }],
  }), [r, labels, ct, lang, t, base0, d]);
  return (
    <ChartCard id="chart-deciles" title={L("¿El modelo ordena bien? Conversión por decil", "Does the model rank well? Conversion by decile")} subtitle={L("Prueba final: si el modelo funcionara, las barras bajarían de izquierda a derecha", "Final holdout: if the model worked, bars would fall from left to right")}
      filters={[L("Prueba final (fija)", "Final holdout (fixed)")]} source={SRC}
      table={{ columns: [t(L("Decil", "Decile")), "n", t(L("Suscripciones", "Subscriptions")), t(L("Tasa", "Rate"))], rows: labels.map((l, i) => [l, d.deciles.n[i], d.deciles.subs[i], pct(r[i], lang)]) }}
      explain={{
        measures: L("Los 8.238 contactos de prueba se ordenan por puntaje y se dividen en 10 grupos iguales; se mide cuántos suscribieron en cada uno.", "The 8,238 holdout contacts are sorted by score and split into 10 equal groups; the share that subscribed is measured in each."),
        observed: bi((l) => l === "es" ? `D1 convierte ${pct(r[0], l)}, pero D8–D10 (los puntajes más bajos) convierten ${pct(r[7], l)}, ${pct(r[8], l)} y ${pct(r[9], l)}: más que la tasa base (${pct(base0, l)}).` : `D1 converts ${pct(r[0], l)}, but D8–D10 (lowest scores) convert ${pct(r[7], l)}, ${pct(r[8], l)} and ${pct(r[9], l)}: above the base rate (${pct(base0, l)}).`),
        implications: L("El orden se invirtió en la cola: quienes el modelo descartaría son los que más compran ahora.", "The order inverted in the tail: those the model would discard are now the best buyers."),
        decisions: L("No usar la lista completa del modelo; reentrenar.", "Do not use the model's full list; retrain."),
        limits: L("Un único período de prueba; la forma puede cambiar en otra ventana.", "A single holdout period; the shape may change in another window."),
      }}>
      <EChart option={option} height={300} label={t(L("Conversión por decil de puntaje", "Conversion by score decile"))} />
    </ChartCard>
  );
}

function CalibrationChart({ c }: { c: Ctx }) {
  const { d, ct, lang, t } = c;
  const obs = d.calibration.n.map((n, i) => d.calibration.subs[i] / n);
  const labels = obs.map((_, i) => `B${i + 1}`);
  const option = useMemo<EOption>(() => ({
    ...base(ct), legend: legend(ct),
    xAxis: catAxis(ct, labels, { name: t(L("Grupo de probabilidad predicha (B1 = más baja)", "Predicted-probability group (B1 = lowest)")), nameLocation: "middle", nameGap: 26 }), yAxis: valueAxis(ct, (x: number) => pct(x, lang, 0)),
    grid: { left: 8, right: 16, top: 32, bottom: 28, containLabel: true },
    tooltip: axisTip(ct, (i) => tipHead(labels[i]) + tipRow(ct.series[0], t(L("Observado", "Observed")), pct(obs[i], lang)) + tipRow(ct.series[1], t(L("Predicho (promedio)", "Predicted (mean)")), `${(d.calibration.p[i] * 100).toExponential(1)}%`)),
    series: [
      { name: t(L("Tasa observada", "Observed rate")), type: "bar", data: obs, itemStyle: barStyle(ct.series[0]), barMaxWidth: 26 },
      { name: t(L("Probabilidad predicha", "Predicted probability")), type: "line", data: d.calibration.p, lineStyle: { width: 2, color: ct.series[1] }, itemStyle: { color: ct.series[1] }, symbolSize: 6 },
    ],
  }), [obs, labels, ct, lang, t, d]);
  const maxP = Math.max(...d.calibration.p);
  return (
    <ChartCard id="chart-calibration" title={L("¿Sus probabilidades sirven? Calibración", "Are its probabilities usable? Calibration")} subtitle={L("Prueba final: predicho vs observado por grupo", "Final holdout: predicted vs observed per group")}
      filters={[L("Prueba final (fija)", "Final holdout (fixed)")]} source={SRC}
      table={{ columns: [t(L("Grupo", "Group")), t(L("Predicho", "Predicted")), t(L("Observado", "Observed")), "n"], rows: labels.map((l, i) => [l, `${(d.calibration.p[i] * 100).toExponential(2)}%`, pct(obs[i], lang), d.calibration.n[i]]) }}
      explain={{
        measures: L("Contactos agrupados en 10 tramos por probabilidad predicha; se compara el promedio predicho con la tasa real. Un modelo calibrado tendría ambas series juntas.", "Contacts grouped into 10 bands by predicted probability; the mean prediction is compared with the actual rate. A calibrated model would have both series together."),
        observed: bi((l) => l === "es" ? `La probabilidad predicha más alta es ${(maxP * 100).toExponential(1)}% (casi cero), mientras la tasa real va de ${pct(Math.min(...obs), l)} a ${pct(Math.max(...obs), l)}.` : `The highest predicted probability is ${(maxP * 100).toExponential(1)}% (near zero), while the actual rate ranges from ${pct(Math.min(...obs), l)} to ${pct(Math.max(...obs), l)}.`),
        implications: L("Las probabilidades no sirven para estimar volumen de ventas ni costo-beneficio: subestiman por órdenes de magnitud.", "Probabilities cannot estimate sales volume or cost-benefit: they understate by orders of magnitude."),
        decisions: L("Recalibrar (Platt o isotónica) con datos recientes, o descartar el modelo.", "Recalibrate (Platt or isotonic) on recent data, or discard the model."),
        limits: L("La línea predicha está en otra escala (casi cero): se muestra en el mismo eje justamente para evidenciarlo.", "The predicted line is on another scale (near zero): it shares the axis precisely to show this."),
      }}>
      <EChart option={option} height={300} label={t(L("Calibración del modelo", "Model calibration"))} />
    </ChartCard>
  );
}

function CapacitySim({ c }: { c: Ctx }) {
  const { d, ct, lang, t } = c;
  const [k, setK] = useState(4);
  const rows = d.capacity.rows;
  const row = rows[k - 1];
  const random = d.capacity.total * row[0];
  const option = useMemo<EOption>(() => ({
    ...base(ct), legend: legend(ct),
    xAxis: catAxis(ct, rows.map((r) => pct(r[0], lang, 0)), { boundaryGap: false, name: t(L("Porcentaje de la lista contactado", "Share of list contacted")), nameLocation: "middle", nameGap: 26 }), yAxis: valueAxis(ct, (x: number) => pct(x, lang, 0), { max: 1 }),
    grid: { left: 8, right: 16, top: 32, bottom: 28, containLabel: true },
    tooltip: axisTip(ct, (i) => tipHead(`${pct(rows[i][0], lang, 0)} ${t(L("de la lista", "of the list"))}`) + tipRow(ct.series[0], t(L("Modelo", "Model")), `${pct(rows[i][2] / d.capacity.total, lang)} (${num(rows[i][2], lang)})`) + tipRow(ct.neutral, t(L("Azar", "Random")), pct(rows[i][0], lang))),
    series: [
      { name: t(L("Orden del modelo", "Model order")), type: "line", data: rows.map((r) => r[2] / d.capacity.total), lineStyle: { width: 2, color: ct.series[0] }, itemStyle: { color: ct.series[0] }, symbolSize: 5, markPoint: { symbol: "circle", symbolSize: 12, itemStyle: { color: ct.series[6], borderColor: ct.surface, borderWidth: 2 }, label: { show: false }, data: [{ coord: [k - 1, row[2] / d.capacity.total] }] } },
      { name: t(L("Azar", "Random")), type: "line", data: rows.map((r) => r[0]), lineStyle: { width: 1.5, type: "dashed", color: ct.neutral }, itemStyle: { color: ct.neutral }, symbol: "none" },
    ],
  }), [rows, k, row, ct, lang, t, d]);
  return (
    <Card id="simulator" className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-sim-bg px-5 py-3">
        <div><Badge tone="simulated">{t(L("SIMULACIÓN DE CAPACIDAD · medida en la prueba final", "CAPACITY SIMULATION · measured on the final holdout"))}</Badge>
          <h3 className="mt-1 text-[15px] font-semibold">{t(L("Si solo puedo llamar a una parte de la lista, ¿cuántas suscripciones capto?", "If I can only call part of the list, how many subscriptions do I capture?"))}</h3></div>
        <p className="max-w-xl text-[12.5px] text-sim-text">{t(L("Cuenta lo que pasó en la prueba final si se hubiera seguido el orden del modelo. No es efecto causal de llamar.", "Counts what happened in the holdout had the model's order been followed. Not a causal effect of calling."))}</p>
      </div>
      <div className="grid gap-6 p-5 lg:grid-cols-[300px_1fr]">
        <div className="flex flex-col gap-4">
          <Slider label={t(L("Capacidad de llamadas", "Call capacity"))} value={k} min={1} max={20} onChange={setK} format={(v) => pct(rows[v - 1][0], lang, 0)} />
          <div className="rounded-lg bg-surface-2 p-3 text-[13px]">
            <p className="text-ink-3">{t(L("Contactos", "Contacts"))}: <b className="num text-ink">{num(row[1], lang)}</b></p>
            <p className="text-ink-3">{t(L("Suscripciones con el modelo", "Subscriptions with the model"))}: <b className="num text-ink">{num(row[2], lang)}</b></p>
            <p className="text-ink-3">{t(L("Esperadas al azar", "Expected at random"))}: <b className="num text-ink">{num(random, lang)}</b></p>
            <p className={`mt-1 font-medium ${row[2] >= random ? "text-good" : "text-bad"}`}>{row[2] >= random ? "+" : "−"}{num(Math.abs(row[2] - random), lang)} {t(L("vs azar", "vs random"))}</p>
          </div>
        </div>
        <EChart option={option} height={300} label={t(L("Curva de captura", "Capture curve"))} />
      </div>
    </Card>
  );
}
