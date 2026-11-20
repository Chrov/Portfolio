"use client";
import { RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell, Section, type NavItem } from "@/components/AppShell";
import { KpiCard, type Method } from "@/components/KpiCard";
import { BigStat, PresentationMode, type Slide } from "@/components/Presentation";
import { LoadError, Loading } from "@/components/States";
import { ArchitectureFlow, ChecksList, DefTable, ImpactTriad, InsightsPanel, ProcessTimeline, RepoLink, type Step } from "@/components/Story";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { useDataset } from "@/lib/data";
import { num, pct, pp } from "@/lib/format";
import { chartTheme } from "@/lib/palette";
import { L, usePrefs, type Bi } from "@/lib/prefs";
import { median } from "@/lib/stats";
import { isTalentData, type TalentData } from "@/lib/talentrisk";
import { applyFilters, describeFilters, lvl, NO_FILTERS, rate, TENURE_BANDS, type Filters, type TCtx } from "./ctx";
import { CalibrationChart, ConfusionChart, FairnessChart, ModelTable, RocPrCurves, ShapBeeswarm, ShapImportance } from "./ModelCharts";
import { AssociationTable, DeptChart, FactorExplorer, IncomeBoxplot, IncomeTenureScatter, SatisfactionHeatmap, TenureHistogram } from "./PeopleCharts";
import { RetentionSimulator, RiskExplorer } from "./Tools";

const NAV: NavItem[] = [
  { id: "resumen", label: L("Resumen ejecutivo", "Executive summary") },
  { id: "problema", label: L("Problema empresarial", "Business problem") },
  { id: "dashboard", label: L("Dashboard", "Dashboard") },
  { id: "exploratorio", label: L("Factores asociados", "Associated factors") },
  { id: "modelos", label: L("Modelos predictivos", "Predictive models") },
  { id: "hallazgos", label: L("Hallazgos", "Findings") },
  { id: "impacto", label: L("Impacto esperado", "Expected impact") },
  { id: "metodologia", label: L("Metodología y arquitectura", "Methodology & architecture") },
  { id: "limitaciones", label: L("Limitaciones y ética", "Limitations & ethics") },
];

const SRC_TXT = L("IBM HR Analytics (Kaggle) · datos ficticios · 1.470 filas", "IBM HR Analytics (Kaggle) · fictional data · 1,470 rows");
const M = (definition: Bi, formula: string, notes: Bi): Method => ({ definition, formula, source: SRC_TXT, notes });
const METHODS = {
  n: M(L("Personas en el segmento filtrado.", "People in the filtered segment."), "COUNT(*)", L("Datos ficticios creados por científicos de datos de IBM.", "Fictional data created by IBM data scientists.")),
  share: M(L("Proporción de personas marcadas con Attrition = Yes.", "Share of people flagged Attrition = Yes."), "Σ Attrition / n", L("No es una tasa anual de rotación: el dataset no indica el período en que ocurrieron las salidas. El intervalo es de Wilson al 95%.", "Not an annual turnover rate: the dataset does not state when exits happened. The interval is a 95% Wilson interval.")),
  tenure: M(L("Promedio de años en la empresa.", "Average years at the company."), "mean(YearsAtCompany)", L("Distribución asimétrica: la mediana se muestra en el texto de apoyo.", "Skewed distribution: the median is shown in the helper text.")),
  sat: M(L("Promedio de la escala de satisfacción laboral (1 = baja, 4 = muy alta).", "Average job satisfaction scale (1 = low, 4 = very high)."), "mean(JobSatisfaction)", L("Escala ordinal autodeclarada; el promedio es una aproximación.", "Self-reported ordinal scale; the mean is an approximation.")),
  income: M(L("Mediana del ingreso mensual.", "Median monthly income."), "median(MonthlyIncome)", L("La moneda no está documentada en el dataset.", "The currency is not documented in the dataset.")),
  overtime: M(L("Proporción de personas que hacen horas extra.", "Share of people working overtime."), "mean(OverTime = Yes)", L("Variable binaria; no indica cuántas horas.", "Binary variable; does not say how many hours.")),
};

export default function TalentApp() {
  const s = useDataset<TalentData>("talentrisk", isTalentData);
  if (s.status === "loading") return <Loading what="TalentRisk AI" />;
  if (s.status === "error") return <LoadError error={s.error} dataset="talentrisk" />;
  return <Talent d={s.data} />;
}

function Talent({ d }: { d: TalentData }) {
  const { lang, theme, t } = usePrefs();
  const [f, setF] = useState<Filters>(NO_FILTERS);
  const [present, setPresent] = useState(false);
  const ct = useMemo(() => chartTheme(theme), [theme]);
  const idx = useMemo(() => applyFilters(d, f), [d, f]);
  const all = useMemo(() => d.rows.Attrition.map((_, i) => i), [d]);
  const c: TCtx = useMemo(() => ({ d, idx, f, ct, lang, t }), [d, idx, f, ct, lang, t]);
  const R = d.rows;

  const k = useMemo(() => {
    const avg = (key: string, s: number[]) => s.reduce((a, i) => a + Number(R[key][i]), 0) / (s.length || 1);
    const share = (s: number[]) => s.filter((i) => R.OverTime[i] === "Yes").length / (s.length || 1);
    const kk = (s: number[]) => ({ r: rate(c, s), tenure: avg("YearsAtCompany", s), tenureMed: median(s.map((i) => Number(R.YearsAtCompany[i]))), sat: avg("JobSatisfaction", s), income: median(s.map((i) => Number(R.MonthlyIncome[i]))), ot: share(s) });
    return { cur: kk(idx), org: kk(all) };
  }, [idx, all, R, c]);

  const roles = useMemo(() => [...new Set(R.JobRole.filter((_, i) => f.dept === "ALL" || R.Department[i] === f.dept).map(String))].sort(), [R, f.dept]);
  const filtered = idx.length !== all.length;
  const vsOrg = (cur: number, org: number, fmt: (x: number) => string) => (filtered ? `${fmt(cur - org)} ${t(L("vs organización", "vs organisation"))}` : t(L("Toda la organización", "Whole organisation")));

  const filterBar = (
    <div className="border-t border-line bg-surface/95">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-end gap-3 px-4 py-2">
        <div className="w-44"><Select label={t(L("Departamento", "Department"))} value={f.dept} onChange={(e) => setF({ ...f, dept: e.target.value, role: "ALL" })}>
          <option value="ALL">{t(L("Todos", "All"))}</option>
          {["Research & Development", "Sales", "Human Resources"].map((x) => <option key={x} value={x}>{lvl(c, x)}</option>)}
        </Select></div>
        <div className="w-52"><Select label={t(L("Cargo", "Job role"))} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
          <option value="ALL">{t(L("Todos", "All"))}</option>
          {roles.map((x) => <option key={x} value={x}>{lvl(c, x)}</option>)}
        </Select></div>
        <div className="w-32"><Select label={t(L("Antigüedad", "Tenure"))} value={f.tenure} onChange={(e) => setF({ ...f, tenure: e.target.value })}>
          <option value="ALL">{t(L("Toda", "Any"))}</option>
          {TENURE_BANDS.map((b) => <option key={b.id} value={b.id}>{t(b.label)}</option>)}
        </Select></div>
        <div className="w-28"><Select label={t(L("Horas extra", "Overtime"))} value={f.overtime} onChange={(e) => setF({ ...f, overtime: e.target.value })}>
          <option value="ALL">{t(L("Todas", "All"))}</option><option value="Yes">{t(L("Sí", "Yes"))}</option><option value="No">No</option>
        </Select></div>
        <div className="w-24"><Select label={t(L("Nivel", "Level"))} value={f.level} onChange={(e) => setF({ ...f, level: e.target.value })}>
          <option value="ALL">{t(L("Todos", "All"))}</option>{[1, 2, 3, 4, 5].map((x) => <option key={x} value={String(x)}>{x}</option>)}
        </Select></div>
        <Button size="sm" variant="ghost" className="mb-0.5" onClick={() => setF(NO_FILTERS)}><RotateCcw className="h-3.5 w-3.5" /> {t(L("Restablecer", "Reset"))}</Button>
        <p className="num mb-1.5 ml-auto text-[12px] text-ink-3">{num(idx.length, lang)} {t(L("de", "of"))} {num(all.length, lang)} {t(L("personas", "people"))}</p>
      </div>
    </div>
  );

  const m = d.model, sel = m.test[m.selected];
  const otYes = rate(c, all.filter((i) => R.OverTime[i] === "Yes")), otNo = rate(c, all.filter((i) => R.OverTime[i] === "No"));
  const ot = d.insights.find((i) => i.id === "overtime")!;
  const steps: Step[] = [
    { title: L("Comprensión del problema", "Understanding the problem"), body: L("RR. HH. necesita entender qué patrones se asocian con la rotación y dónde investigar, sin automatizar decisiones sobre personas.", "HR needs to understand which patterns are associated with attrition and where to investigate, without automating decisions about people."), facts: [L("Uso educativo y de investigación, no operativo", "Educational and research use, not operational")] },
    { title: L("Recolección de datos", "Data collection"), body: L("Dataset IBM HR Analytics descargado de Kaggle con kagglehub y verificado con SHA-256.", "IBM HR Analytics dataset downloaded from Kaggle with kagglehub and verified with SHA-256."), facts: [L("1.470 personas, 35 columnas, sin fechas", "1,470 people, 35 columns, no dates"), L("Datos FICTICIOS, no empleados reales de IBM", "FICTIONAL data, not real IBM employees")] },
    { title: L("Preparación y limpieza", "Preparation and cleaning"), body: L(`Sin nulos ni duplicados. Se eliminan 3 columnas constantes, el identificador y 3 tasas sin definición (${d.meta.quality.undocumentedDropped.join(", ")}).`, `No nulls or duplicates. 3 constant columns, the identifier and 3 undefined rate fields (${d.meta.quality.undocumentedDropped.join(", ")}) are dropped.`), facts: [L("Género, edad y estado civil excluidos del modelo", "Gender, age and marital status excluded from the model")] },
    { title: L("Análisis exploratorio", "Exploratory analysis"), body: L(`Proporciones con intervalos de Wilson y ${d.associations.length} pruebas de asociación (χ², Mann-Whitney) con corrección Benjamini-Hochberg.`, `Shares with Wilson intervals and ${d.associations.length} association tests (χ², Mann-Whitney) with Benjamini-Hochberg correction.`) },
    { title: L("Desarrollo de modelos", "Model development"), body: L("Regresión logística, Random Forest y XGBoost en pipelines con preprocesamiento dentro de cada pliegue; pesos de clase; calibración de Platt; umbral por F1 fuera de pliegue.", "Logistic regression, Random Forest and XGBoost in pipelines with in-fold preprocessing; class weights; Platt calibration; out-of-fold F1 threshold."), facts: [L(`Elegido: regresión logística (CV PR-AUC ${m.cv.logreg.prAuc.toFixed(3)})`, `Selected: logistic regression (CV PR-AUC ${m.cv.logreg.prAuc.toFixed(3)})`)] },
    { title: L("Implementación de la solución", "Solution implementation"), body: L("El modelo se exporta como coeficientes: el explorador calcula probabilidad y SHAP exactos en el navegador, y la API FastAPI expone el mismo cálculo.", "The model is exported as coefficients: the explorer computes probability and exact SHAP in the browser, and the FastAPI service exposes the same computation.") },
    { title: L("Evaluación", "Evaluation"), body: L("Métricas en un conjunto de prueba intocado, curva de calibración, auditoría de equidad y pruebas de paridad Python–navegador.", "Metrics on an untouched test set, calibration curve, fairness audit and Python–browser parity tests."), facts: [L(`Prueba: PR-AUC ${sel.prAuc.toFixed(2)}, ROC-AUC ${sel.rocAuc.toFixed(2)}`, `Test: PR-AUC ${sel.prAuc.toFixed(2)}, ROC-AUC ${sel.rocAuc.toFixed(2)}`)] },
  ];

  const slides: Slide[] = [
    { kicker: L("Contexto", "Context"), title: L("¿Qué se asocia con la rotación y dónde conviene investigar?", "What is associated with attrition, and where should we investigate?"),
      body: <p className="max-w-3xl">{t(L("Analizamos 1.470 perfiles ficticios publicados por IBM. El objetivo es entender patrones organizacionales y priorizar preguntas para Recursos Humanos, no evaluar a personas.", "We analysed 1,470 fictional profiles published by IBM. The goal is to understand organisational patterns and prioritise questions for HR, not to assess individuals."))}</p> },
    { kicker: L("Indicadores", "Indicators"), title: L("La organización en cifras", "The organisation in figures"),
      body: <div className="grid gap-4 md:grid-cols-4">
        <BigStat value={num(all.length, lang)} label={t(L("Personas", "People"))} note={t(L("datos ficticios", "fictional data"))} />
        <BigStat value={pct(k.org.r.p, lang)} label="Attrition = Yes" note={t(L("no es una tasa anual", "not an annual rate"))} />
        <BigStat value={pct(k.org.ot, lang, 0)} label={t(L("Hacen horas extra", "Work overtime"))} />
        <BigStat value={sel.prAuc.toFixed(2)} label={t(L("PR-AUC del modelo (prueba)", "Model PR-AUC (test)"))} note={t(L(`azar: ${k.org.r.p.toFixed(2)}`, `chance: ${k.org.r.p.toFixed(2)}`))} />
      </div> },
    { kicker: L("Hallazgos", "Findings"), title: L("Patrones con evidencia", "Patterns with evidence"),
      body: <ol className="grid gap-4 md:grid-cols-2">{d.insights.slice(0, 4).map((i, n) => <li key={i.id} className="rounded-xl border border-line bg-surface p-5"><p className="text-sm font-semibold text-accent">{n + 1}</p><p className="mt-1 font-semibold text-ink">{t(i.title)}</p><p className="mt-2 text-base">{t(i.evidence)}</p></li>)}</ol> },
    { kicker: L("Interpretación", "Interpretation"), title: L("Perfiles de entrada con carga alta", "Entry-level profiles under high workload"),
      body: <ul className="max-w-4xl list-disc space-y-3 pl-6">
        <li>{t(L("Horas extra, nivel 1 y los primeros dos años concentran las salidas; estas variables están correlacionadas entre sí.", "Overtime, level 1 and the first two years concentrate exits; these variables are correlated with each other."))}</li>
        <li>{t(L("El modelo ordena el riesgo mejor que el azar, pero con muchos falsos positivos: sirve para priorizar segmentos, no personas.", "The model ranks risk better than chance, but with many false positives: it helps prioritise segments, not people."))}</li>
        <li>{t(L("Aun sin usar edad, el modelo detecta peor las salidas de personas de 50+: requiere supervisión.", "Even without age as input, the model catches exits of people aged 50+ less well: it requires oversight."))}</li>
      </ul> },
    { kicker: L("Recomendaciones", "Recommendations"), title: L("Validar con Recursos Humanos", "Validate with HR"),
      body: <ol className="max-w-4xl list-decimal space-y-3 pl-6">{d.insights.slice(0, 4).map((i) => <li key={i.id}>{t(i.action)} <span className="text-ink-3">— {t(i.validate)}</span></li>)}</ol> },
    { kicker: L("Impacto potencial", "Potential impact"), title: L("Qué podría aportar, a validar", "What it could add, to be validated"),
      body: <div className="max-w-4xl space-y-4"><Badge tone="expected">{t(L("Impacto esperado · sin cifras", "Expected impact · no figures"))}</Badge>
        <p>{t(L("Mejor comprensión de factores asociados, planificación de programas de retención, transparencia de indicadores de RR. HH. y seguimiento de satisfacción. Cuantificarlo requiere un piloto con grupo de control en datos reales.", "Better understanding of associated factors, retention-programme planning, transparent HR indicators and satisfaction tracking. Quantifying it requires a controlled pilot on real data."))}</p></div> },
    { kicker: L("Limitaciones", "Limitations"), title: L("Lo que no se puede afirmar", "What cannot be claimed"),
      body: <ul className="max-w-4xl list-disc space-y-3 pl-6">
        <li>{t(L("Datos ficticios y sin fechas: no hay tasas anuales ni causalidad.", "Fictional, undated data: no annual rates and no causality."))}</li>
        <li>{t(L("Las simulaciones cambian la puntuación del modelo, no la conducta de las personas.", "Simulations change the model score, not people's behaviour."))}</li>
        <li>{t(L("Ningún uso para decisiones individuales de empleo.", "No use for individual employment decisions."))}</li>
      </ul> },
  ];

  return (
    <>
      <AppShell app="TalentRisk AI" tagline={L("People analytics responsable · datos ficticios de IBM", "Responsible people analytics · IBM fictional data")} nav={NAV} onPresent={() => setPresent(true)} filterBar={filterBar}>
        <div className="mb-4 rounded-lg border border-warn-text/30 bg-warn-bg px-4 py-2.5 text-[13px] text-warn-text" role="note">
          <strong>{t(L("Datos sintéticos.", "Synthetic data."))}</strong>{" "}
          {t(L("El dataset IBM HR Analytics es ficticio (creado por científicos de datos de IBM); no describe empleados reales. «Attrition = Yes» no tiene período definido, así que no se presenta como tasa anual.", "The IBM HR Analytics dataset is fictional (created by IBM data scientists); it does not describe real employees. “Attrition = Yes” has no defined period, so it is not presented as an annual rate."))}
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
          <Section id="resumen" n={1} title={L("Resumen ejecutivo", "Executive summary")}>
            <Card className="p-5 text-[14px] leading-relaxed text-ink-2">
              <ul className="space-y-2">
                <li>{t(L(`${pct(k.org.r.p, "es")} de las ${num(all.length, "es")} personas tiene Attrition = Yes. Las horas extra son el factor más asociado: ${pct(otYes.p, "es")} entre quienes las hacen frente a ${pct(otNo.p, "es")} entre quienes no.`, `${pct(k.org.r.p, "en")} of the ${num(all.length, "en")} people have Attrition = Yes. Overtime is the most associated factor: ${pct(otYes.p, "en")} among those who work it vs ${pct(otNo.p, "en")} among those who do not.`))}</li>
                <li>{t(L(`Una regresión logística calibrada ordena el riesgo mejor que el azar (PR-AUC ${sel.prAuc.toFixed(2)} vs ${k.org.r.p.toFixed(2)}) y supera a XGBoost en validación cruzada.`, `A calibrated logistic regression ranks risk better than chance (PR-AUC ${sel.prAuc.toFixed(2)} vs ${k.org.r.p.toFixed(2)}) and beats XGBoost in cross-validation.`))}</li>
                <li>{t(L("Todo se presenta como asociación y como apoyo a la investigación de RR. HH., con auditoría de equidad y sin decisiones automatizadas.", "Everything is framed as association and as support for HR investigation, with a fairness audit and no automated decisions."))}</li>
              </ul>
            </Card>
          </Section>
          <Section id="problema" n={2} title={L("Problema empresarial", "Business problem")} className="pt-0">
            <Card className="p-5 text-[13.5px] leading-relaxed text-ink-2">
              <p>{t(L("Recursos Humanos necesita entender qué factores se asocian con la rotación, cómo se distribuye el talento y qué situaciones requieren atención, para planificar acciones de retención.", "HR needs to understand which factors are associated with attrition, how talent is distributed and which situations need attention, to plan retention actions."))}</p>
              <ul className="mt-2 space-y-1">
                {([[L("¿Dónde se concentran las salidas?", "Where do exits concentrate?"), "dashboard"], [L("¿Qué condiciones se asocian a ellas?", "Which conditions are associated with them?"), "chart-factors"], [L("¿Qué tan bien se pueden anticipar?", "How well can they be anticipated?"), "modelos"], [L("¿Es equitativo el modelo?", "Is the model fair?"), "chart-fairness"]] as [Bi, string][]).map(([q, id]) => <li key={q.en}><a href={`#${id}`} className="text-accent hover:underline">{t(q)}</a></li>)}
              </ul>
            </Card>
          </Section>
        </div>

        <Section id="dashboard" n={3} title={L("Dashboard de People Analytics", "People Analytics dashboard")} intro={{ es: `Segmento: ${describeFilters({ ...c, lang: "es" })}. Las variaciones comparan con toda la organización.`, en: `Segment: ${describeFilters({ ...c, lang: "en" })}. Changes compare with the whole organisation.` }}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <KpiCard label={L("Personas", "People")} value={num(k.cur.r.n, lang)} change={null} changeLabel={filtered ? `${pct(k.cur.r.n / all.length, lang)} ${t(L("de la organización", "of the organisation"))}` : t(L("Toda la organización", "Whole organisation"))} description={L("En el segmento filtrado", "In the filtered segment")} method={METHODS.n} />
            <KpiCard label={L("Attrition = Yes", "Attrition = Yes")} value={k.cur.r.n ? pct(k.cur.r.p, lang) : "—"} change={filtered ? k.cur.r.p - k.org.r.p : null} goodWhenUp={false} changeLabel={vsOrg(k.cur.r.p, k.org.r.p, (x) => pp(x, lang))} description={{ es: `IC95% ${pct(k.cur.r.lo, "es")}–${pct(k.cur.r.hi, "es")} · no es tasa anual`, en: `95% CI ${pct(k.cur.r.lo, "en")}–${pct(k.cur.r.hi, "en")} · not an annual rate` }} method={METHODS.share} />
            <KpiCard label={L("Antigüedad promedio", "Average tenure")} value={`${num(k.cur.tenure, lang, 1)} ${t(L("años", "yrs"))}`} change={filtered ? k.cur.tenure - k.org.tenure : null} changeLabel={vsOrg(k.cur.tenure, k.org.tenure, (x) => `${x > 0 ? "+" : ""}${num(x, lang, 1)}`)} description={{ es: `Mediana ${num(k.cur.tenureMed, "es")} años`, en: `Median ${num(k.cur.tenureMed, "en")} years` }} method={METHODS.tenure} />
            <KpiCard label={L("Satisfacción laboral", "Job satisfaction")} value={`${num(k.cur.sat, lang, 2)} / 4`} change={filtered ? k.cur.sat - k.org.sat : null} changeLabel={vsOrg(k.cur.sat, k.org.sat, (x) => `${x > 0 ? "+" : ""}${num(x, lang, 2)}`)} description={L("Escala 1–4 autodeclarada", "Self-reported 1–4 scale")} method={METHODS.sat} />
            <KpiCard label={L("Ingreso mensual mediano", "Median monthly income")} value={num(k.cur.income, lang)} change={filtered ? k.cur.income / k.org.income - 1 : null} changeLabel={vsOrg(k.cur.income, k.org.income, (x) => `${x > 0 ? "+" : ""}${num(x, lang)}`)} description={L("Moneda no documentada", "Currency undocumented")} method={METHODS.income} />
            <KpiCard label={L("Hacen horas extra", "Work overtime")} value={pct(k.cur.ot, lang)} change={filtered ? k.cur.ot - k.org.ot : null} goodWhenUp={false} changeLabel={vsOrg(k.cur.ot, k.org.ot, (x) => pp(x, lang))} description={L("Condición laboral registrada", "Recorded working condition")} method={METHODS.overtime} />
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <FactorExplorer c={c} />
            <div className="grid gap-4">
              <DeptChart c={c} />
              <SatisfactionHeatmap c={c} />
            </div>
          </div>
        </Section>

        <Section id="exploratorio" n={4} title={L("Análisis de factores asociados", "Associated factors analysis")} intro={L("Relaciones entre rotación y antigüedad, remuneración y satisfacción. Son asociaciones estadísticas: no prueban causalidad.", "Relationships between attrition and tenure, pay and satisfaction. These are statistical associations: they do not prove causality.")}>
          <div className="grid gap-4 xl:grid-cols-2">
            <IncomeTenureScatter c={c} />
            <IncomeBoxplot c={c} />
            <TenureHistogram c={c} />
            <AssociationTable c={c} />
          </div>
        </Section>

        <Section id="modelos" n={5} title={L("Machine learning: predicción, explicabilidad y equidad", "Machine learning: prediction, explainability and fairness")} intro={L("Tres modelos comparados sin fuga de información; métricas en un conjunto de prueba que no se usó para elegir nada.", "Three models compared without leakage; metrics on a test set that was not used to choose anything.")}>
          <ModelTable c={c} />
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <RocPrCurves c={c} />
            <CalibrationChart c={c} />
            <ConfusionChart c={c} />
            <ShapImportance c={c} />
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <ShapBeeswarm c={c} />
            <FairnessChart c={c} />
          </div>
          <h3 className="mb-3 mt-8 text-[13px] font-semibold uppercase tracking-wider text-ink-3">{t(L("Explorador de riesgo (perfil hipotético)", "Risk explorer (hypothetical profile)"))}</h3>
          <RiskExplorer c={c} />
        </Section>

        <Section id="hallazgos" n={6} title={L("Insights organizacionales y recomendaciones", "Organisational insights and recommendations")} intro={L("Generados con reglas reproducibles (analytics/talentrisk/build.py). Todas son hipótesis para validar con Recursos Humanos.", "Generated by reproducible rules (analytics/talentrisk/build.py). All are hypotheses to validate with HR.")}>
          <InsightsPanel items={d.insights} />
          <Card className="mt-4 p-5">
            <h4 className="font-semibold">{t(L("Segmentos que merecen investigación adicional", "Segments that deserve further investigation"))}</h4>
            <ul className="mt-2 grid gap-2 text-[13px] text-ink-2 md:grid-cols-3">
              {([
                [L("Representantes de ventas", "Sales representatives"), { dept: "Sales", role: "Sales Representative" }],
                [L("Nivel 1 con horas extra", "Level 1 with overtime"), { level: "1", overtime: "Yes" }],
                [L("Antigüedad 0–2 años", "Tenure 0–2 years"), { tenure: "0-2" }],
              ] as [Bi, Partial<Filters>][]).map(([label, ff]) => {
                const sel2 = applyFilters(d, { ...NO_FILTERS, ...ff });
                const r = rate(c, sel2);
                return (
                  <li key={label.en} className="rounded-lg border border-line p-3">
                    <p className="font-medium text-ink">{t(label)}</p>
                    <p className="num mt-1">{pct(r.p, lang)} <span className="text-ink-3">(IC95% {pct(r.lo, lang)}–{pct(r.hi, lang)}, n = {r.n})</span></p>
                    <button type="button" className="mt-1 text-[12.5px] text-accent hover:underline cursor-pointer" onClick={() => { setF({ ...NO_FILTERS, ...ff }); document.getElementById("dashboard")?.scrollIntoView(); }}>{t(L("Aplicar como filtro", "Apply as filter"))}</button>
                  </li>
                );
              })}
            </ul>
          </Card>
        </Section>

        <Section id="impacto" n={7} title={L("Impacto empresarial esperado", "Expected business impact")} intro={L("Separamos lo medido, lo simulado y lo que solo puede validarse en una organización real.", "We separate what was measured, what is simulated and what can only be validated in a real organisation.")}>
          <ImpactTriad
            measured={<ul className="list-disc space-y-1.5 pl-4">
              <li>{t(ot.evidence)}</li>
              <li>{t(L(`Modelo en prueba: PR-AUC ${sel.prAuc.toFixed(2)}, precisión ${pct(sel.precision, "es", 0)}, recall ${pct(sel.recall, "es", 0)}.`, `Model on test: PR-AUC ${sel.prAuc.toFixed(2)}, precision ${pct(sel.precision, "en", 0)}, recall ${pct(sel.recall, "en", 0)}.`))}</li>
              <li>{t(L(`Excluir atributos sensibles cuesta ${(m.sensitiveAblation.with - m.sensitiveAblation.without).toFixed(3)} de PR-AUC (CV).`, `Excluding sensitive attributes costs ${(m.sensitiveAblation.with - m.sensitiveAblation.without).toFixed(3)} PR-AUC (CV).`))}</li>
            </ul>}
            simulated={<div className="space-y-2"><p>{t(L("El simulador muestra cómo cambiaría la puntuación del modelo bajo supuestos de política (menos horas extra, más satisfacción, desarrollo).", "The simulator shows how the model score would change under policy assumptions (less overtime, more satisfaction, development)."))}</p><p className="text-[12.5px] text-ink-3">{t(L("Cambio de puntuación ≠ reducción de rotación.", "Score change ≠ attrition reduction."))}</p><a href="#retention" className="text-accent hover:underline">{t(L("Abrir el simulador ↓", "Open the simulator ↓"))}</a></div>}
            expected={<ul className="list-disc space-y-1.5 pl-4">
              {[L("Mejor comprensión de factores asociados a la rotación", "Better understanding of attrition-associated factors"), L("Planificación de programas de retención", "Retention-programme planning"), L("Identificación de áreas que requieren investigación", "Identification of areas needing investigation"), L("Más transparencia en indicadores de RR. HH.", "More transparent HR indicators"), L("Mejor seguimiento de la satisfacción laboral", "Better job-satisfaction tracking"), L("Apoyo analítico a la planificación de talento", "Analytical support for talent planning")].map((x) => <li key={x.en}>{t(x)}</li>)}
            </ul>}
          />
          <div className="mt-4"><RetentionSimulator c={c} /></div>
        </Section>

        <Section id="metodologia" n={8} title={L("¿Qué se hizo? Metodología y arquitectura", "What was done? Methodology and architecture")}>
          <ProcessTimeline steps={steps} />
          <h3 className="mb-3 mt-8 text-[13px] font-semibold uppercase tracking-wider text-ink-3">{t(L("Exploración técnica", "Technical exploration"))}</h3>
          <Card className="p-5">
            <ArchitectureFlow stages={[
              { name: L("Ingesta", "Ingestion"), tech: "kagglehub · SHA-256", detail: L("Descarga versionada y verificada", "Versioned, verified download") },
              { name: L("Validación", "Validation"), tech: "pandas", detail: L("Nulos, duplicados, constantes, sensibles", "Nulls, duplicates, constants, sensitive") },
              { name: L("Modelado", "Modelling"), tech: "scikit-learn · XGBoost", detail: L("Pipelines, CV repetida, calibración", "Pipelines, repeated CV, calibration") },
              { name: L("Explicabilidad", "Explainability"), tech: "SHAP", detail: L("LinearExplainer, auditoría de equidad", "LinearExplainer, fairness audit") },
              { name: L("Servicio", "Serving"), tech: "JSON · FastAPI", detail: L("Coeficientes exportados + /score", "Exported coefficients + /score") },
              { name: L("Presentación", "Presentation"), tech: "Next.js · ECharts", detail: L("Explorador y simulador en el navegador", "In-browser explorer and simulator") },
            ]} />
          </Card>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <Card className="p-5">
              <h4 className="mb-2 font-semibold">{t(L("Metodología de machine learning", "Machine-learning methodology"))}</h4>
              <DefTable head={[t(L("Paso", "Step")), t(L("Detalle", "Detail")), ""]} rows={[
                [t(L("División", "Split")), `train ${m.split.train} / test ${m.split.test}`, t(L("Estratificada, semilla 42", "Stratified, seed 42"))],
                [t(L("Validación", "Validation")), "RepeatedStratifiedKFold 5×3", t(L("Solo en entrenamiento", "Training split only"))],
                [t(L("Desbalance", "Imbalance")), "class_weight / scale_pos_weight", t(L("16% de positivos", "16% positives"))],
                [t(L("Selección", "Selection")), t(L("Regla de 1 error estándar", "One-SE rule")), t(L("PR-AUC en CV, el más simple primero", "CV PR-AUC, simplest first"))],
                [t(L("Calibración", "Calibration")), "Platt (OOF)", `Brier ${sel.brierUncalibrated.toFixed(3)} → ${sel.brier.toFixed(3)}`],
                [t(L("Umbral", "Threshold")), `${m.threshold.toFixed(3)}`, t(L("Máx. F1 fuera de pliegue", "Max out-of-fold F1"))],
                [t(L("Regularización", "Regularisation")), `C = ${m.logregC}`, t(L("Búsqueda interna por PR-AUC", "Inner search on PR-AUC"))],
              ]} />
            </Card>
            <Card className="p-5">
              <h4 className="mb-2 font-semibold">{t(L("Controles de datos y de fuga de información", "Data and leakage controls"))}</h4>
              <ChecksList checks={[
                { check: t(L(`Sin nulos (${d.meta.quality.missing}) ni duplicados (${d.meta.quality.duplicates})`, `No nulls (${d.meta.quality.missing}) or duplicates (${d.meta.quality.duplicates})`)), passed: d.meta.quality.missing === 0 && d.meta.quality.duplicates === 0 },
                { check: t(L(`Columnas constantes eliminadas: ${d.meta.quality.constantDropped.join(", ")}`, `Constant columns dropped: ${d.meta.quality.constantDropped.join(", ")}`)), passed: true },
                { check: t(L("Escalado y one-hot dentro de cada pliegue (Pipeline)", "Scaling and one-hot inside each fold (Pipeline)")), passed: true },
                { check: t(L("Conjunto de prueba no usado en selección, umbral ni calibración", "Test set not used for selection, threshold or calibration")), passed: true },
                { check: t(L("Atributos sensibles fuera del modelo", "Sensitive attributes excluded from the model")), passed: true },
                { check: t(L("Fórmula del navegador = probabilidad de scikit-learn (1e-9)", "Browser formula = scikit-learn probability (1e-9)")), passed: true },
              ]} />
              <p className="mt-2 text-[12px] text-ink-3">{t(L("Cada control corre como aserción en el pipeline o como prueba en analytics/tests.", "Each control runs as a pipeline assertion or as a test in analytics/tests."))}</p>
            </Card>
            <Card className="p-5">
              <h4 className="mb-2 font-semibold">{t(L("Decisiones de ingeniería", "Engineering decisions"))}</h4>
              <ul className="list-disc space-y-1.5 pl-4 text-[13px] text-ink-2">
                <li>{t(L("Modelo lineal desplegado: además de ganar en CV, permite SHAP exacto y puntuación en el navegador sin servidor.", "Linear model deployed: besides winning in CV, it allows exact SHAP and in-browser scoring with no server."))}</li>
                <li>{t(L("Probabilidades fuera de pliegue para la auditoría de equidad: ninguna persona se evalúa con un modelo entrenado con ella.", "Out-of-fold probabilities for the fairness audit: nobody is scored by a model trained on them."))}</li>
                <li>{t(L("Sin listas de personas «en riesgo» en la interfaz: solo agregados y perfiles hipotéticos.", "No lists of “at-risk” people in the interface: only aggregates and hypothetical profiles."))}</li>
                <li>{t(L("Tasas de pago sin definición (DailyRate, HourlyRate, MonthlyRate) excluidas por no ser interpretables.", "Undefined pay rates (DailyRate, HourlyRate, MonthlyRate) excluded as not interpretable."))}</li>
              </ul>
            </Card>
            <Card className="p-5">
              <h4 className="mb-2 font-semibold">{t(L("Repositorio y documentación", "Repository and documentation"))}</h4>
              <ul className="space-y-1.5 text-[13px]">
                <li><RepoLink path="analytics/talentrisk/build.py" label={t(L("Pipeline de modelado, SHAP y equidad", "Modelling, SHAP and fairness pipeline"))} /></li>
                <li><RepoLink path="analytics/talentrisk/scoring.py" label={t(L("Puntuación exportable", "Exportable scoring"))} /></li>
                <li><RepoLink path="analytics/api/main.py" label="FastAPI (/api/talentrisk/score)" /></li>
                <li><RepoLink path="analytics/tests/test_talentrisk.py" label={t(L("Pruebas de fuga y paridad", "Leakage and parity tests"))} /></li>
                <li><RepoLink path="analytics/README.md" label={t(L("Documentación técnica", "Technical docs"))} /></li>
                <li><RepoLink path="web/src/features/talentrisk" label={t(L("Código de esta aplicación", "This app's code"))} /></li>
              </ul>
            </Card>
          </div>
        </Section>

        <Section id="limitaciones" n={9} title={L("Limitaciones, ética y futuras mejoras", "Limitations, ethics and future work")}>
          <div className="grid gap-4 md:grid-cols-3">
            {([
              [L("Limitaciones de los datos", "Data limitations"), [L("Datos ficticios: los patrones no describen a ninguna empresa real.", "Fictional data: patterns describe no real company."), L("Sin fechas: Attrition no tiene período; no hay tasas anuales ni análisis de supervivencia.", "No dates: Attrition has no period; no annual rates or survival analysis."), L("Escalas de satisfacción gruesas y autodeclaradas.", "Coarse, self-reported satisfaction scales."), L("1.470 filas y 237 salidas: intervalos amplios en segmentos pequeños.", "1,470 rows and 237 exits: wide intervals in small segments.")]],
              [L("Riesgos metodológicos y uso responsable", "Methodological risks and responsible use"), [L("Asociación ≠ causalidad; las simulaciones no estiman efectos de intervenciones.", "Association ≠ causation; simulations do not estimate intervention effects."), L("Variables proxy pueden reintroducir sesgos de edad o estado civil.", "Proxy variables can reintroduce age or marital-status bias."), L("Nunca automatizar despidos, ascensos ni remuneraciones con este modelo.", "Never automate dismissals, promotions or pay with this model."), L("Datos reales de RR. HH. requieren base legal, minimización y control de acceso.", "Real HR data require a legal basis, minimisation and access control.")]],
              [L("Futuras mejoras", "Future work"), [L("Datos longitudinales para modelos de supervivencia (tiempo hasta la salida).", "Longitudinal data for survival models (time to exit)."), L("Inferencia causal con pilotos y grupo de control.", "Causal inference with pilots and control groups."), L("Umbrales definidos por política y con revisión humana.", "Policy-defined thresholds with human review."), L("Monitoreo de deriva y de equidad en producción.", "Drift and fairness monitoring in production.")]],
            ] as [Bi, Bi[]][]).map(([title, items]) => (
              <Card key={title.en} className="p-5">
                <h4 className="mb-2 font-semibold">{t(title)}</h4>
                <ul className="list-disc space-y-1.5 pl-4 text-[13px] text-ink-2">{items.map((x) => <li key={x.en}>{t(x)}</li>)}</ul>
              </Card>
            ))}
          </div>
        </Section>
      </AppShell>
      <PresentationMode open={present} onClose={() => setPresent(false)} slides={slides} app="TalentRisk AI" />
    </>
  );
}
