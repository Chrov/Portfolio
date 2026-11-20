"""TalentRisk AI: associations, model comparison, calibration, SHAP, fairness -> talentrisk.json.

Run from the repository root:  python -m analytics.talentrisk.build
The IBM HR dataset is FICTIONAL (created by IBM data scientists). Attrition is a
Yes/No flag without a defined period, so its share is NOT an annual turnover rate.
"""
import json
import warnings
from datetime import datetime, timezone

import numpy as np
import pandas as pd
import shap
from scipy import stats
from sklearn.base import clone
from sklearn.calibration import calibration_curve
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (average_precision_score, brier_score_loss, confusion_matrix,
                             f1_score, precision_recall_curve, precision_score, recall_score,
                             roc_auc_score, roc_curve)
from sklearn.model_selection import (GridSearchCV, RepeatedStratifiedKFold, StratifiedKFold,
                                     cross_val_predict, train_test_split)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from analytics.common.data_sources import ARTIFACTS, SOURCES, WEB_DATA, verify

# numpy + macOS Accelerate emits spurious matmul RuntimeWarnings; results are unaffected.
warnings.filterwarnings("ignore", message=".*encountered in matmul", category=RuntimeWarning)

SEED = 42
TARGET = "Attrition"
DROP_CONSTANT = ["EmployeeCount", "Over18", "StandardHours"]
DROP_ID = ["EmployeeNumber"]
# Undocumented rate fields, inconsistent with MonthlyIncome -> excluded from the model.
DROP_UNDOCUMENTED = ["DailyRate", "HourlyRate", "MonthlyRate"]
# Protected / sensitive attributes: never model inputs, only used to audit fairness.
SENSITIVE = ["Gender", "Age", "MaritalStatus"]
CATEGORICAL = ["BusinessTravel", "Department", "EducationField", "JobRole", "OverTime"]
NUMERIC = ["DistanceFromHome", "Education", "EnvironmentSatisfaction", "JobInvolvement", "JobLevel",
           "JobSatisfaction", "MonthlyIncome", "NumCompaniesWorked", "PercentSalaryHike",
           "PerformanceRating", "RelationshipSatisfaction", "StockOptionLevel", "TotalWorkingYears",
           "TrainingTimesLastYear", "WorkLifeBalance", "YearsAtCompany", "YearsInCurrentRole",
           "YearsSinceLastPromotion", "YearsWithCurrManager"]
FEATURES = NUMERIC + CATEGORICAL

LABELS = {
    "Age": ("Edad", "Age"), "BusinessTravel": ("Viajes de negocio", "Business travel"),
    "Department": ("Departamento", "Department"), "DistanceFromHome": ("Distancia al trabajo", "Distance from home"),
    "Education": ("Nivel educativo", "Education level"), "EducationField": ("Área de estudio", "Education field"),
    "EnvironmentSatisfaction": ("Satisfacción con el entorno", "Environment satisfaction"),
    "Gender": ("Género", "Gender"), "JobInvolvement": ("Involucramiento", "Job involvement"),
    "JobLevel": ("Nivel de cargo", "Job level"), "JobRole": ("Cargo", "Job role"),
    "JobSatisfaction": ("Satisfacción laboral", "Job satisfaction"), "MaritalStatus": ("Estado civil", "Marital status"),
    "MonthlyIncome": ("Ingreso mensual", "Monthly income"), "NumCompaniesWorked": ("Empresas anteriores", "Companies worked"),
    "OverTime": ("Horas extra", "Overtime"), "PercentSalaryHike": ("Alza salarial %", "Salary hike %"),
    "PerformanceRating": ("Evaluación de desempeño", "Performance rating"),
    "RelationshipSatisfaction": ("Satisfacción con relaciones", "Relationship satisfaction"),
    "StockOptionLevel": ("Nivel de opciones sobre acciones", "Stock option level"),
    "TotalWorkingYears": ("Años de experiencia", "Total working years"),
    "TrainingTimesLastYear": ("Capacitaciones último año", "Trainings last year"),
    "WorkLifeBalance": ("Equilibrio vida-trabajo", "Work-life balance"),
    "YearsAtCompany": ("Antigüedad (años)", "Years at company"),
    "YearsInCurrentRole": ("Años en el cargo actual", "Years in current role"),
    "YearsSinceLastPromotion": ("Años desde último ascenso", "Years since last promotion"),
    "YearsWithCurrManager": ("Años con jefatura actual", "Years with current manager"),
}
LEVELS_ES = {
    "Travel_Rarely": "Viaja poco", "Travel_Frequently": "Viaja frecuentemente", "Non-Travel": "No viaja",
    "Research & Development": "I+D", "Sales": "Ventas", "Human Resources": "Recursos Humanos",
    "Life Sciences": "Ciencias de la vida", "Medical": "Medicina", "Marketing": "Marketing",
    "Technical Degree": "Título técnico", "Other": "Otra", "Yes": "Sí", "No": "No",
    "Sales Executive": "Ejecutivo/a de ventas", "Research Scientist": "Científico/a investigador/a",
    "Laboratory Technician": "Técnico/a de laboratorio", "Manufacturing Director": "Director/a de manufactura",
    "Healthcare Representative": "Representante de salud", "Manager": "Gerente",
    "Sales Representative": "Representante de ventas", "Research Director": "Director/a de investigación",
    "Male": "Hombre", "Female": "Mujer", "Single": "Soltero/a", "Married": "Casado/a", "Divorced": "Divorciado/a",
}


def lab(f):
    es, en = LABELS[f]
    return {"es": es, "en": en}


def wilson(k, n, z=1.96):
    if n == 0:
        return (0.0, 0.0)
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * np.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (float(c - h), float(c + h))


def bh(pvals):
    """Benjamini–Hochberg adjusted p-values."""
    p = np.asarray(pvals)
    order = np.argsort(p)
    ranked = p[order] * len(p) / (np.arange(len(p)) + 1)
    adj = np.minimum.accumulate(ranked[::-1])[::-1]
    out = np.empty_like(adj)
    out[order] = np.minimum(adj, 1)
    return out


def associations(df):
    y = df[TARGET]
    rows = []
    for f in CATEGORICAL + SENSITIVE[:1] + ["MaritalStatus"]:
        ct = pd.crosstab(df[f], y)
        chi2, p, dof, _ = stats.chi2_contingency(ct)
        v = np.sqrt(chi2 / (ct.values.sum() * (min(ct.shape) - 1)))
        rows.append({"feature": f, "type": "categorical", "test": "chi2", "stat": float(chi2), "p": float(p),
                     "effect": float(v), "effectName": "Cramér V"})
    for f in NUMERIC + ["Age"]:
        a, b = df.loc[y == 1, f], df.loc[y == 0, f]
        u, p = stats.mannwhitneyu(a, b, alternative="two-sided")
        rbc = 1 - 2 * u / (len(a) * len(b))       # rank-biserial: >0 means lower values among leavers
        rows.append({"feature": f, "type": "numeric", "test": "Mann-Whitney U", "stat": float(u), "p": float(p),
                     "effect": float(-rbc), "effectName": "rank-biserial",
                     "medianLeft": float(a.median()), "medianStayed": float(b.median())})
    adj = bh([r["p"] for r in rows])
    for r, q in zip(rows, adj):
        r["pAdj"] = float(q)
        r["label"] = lab(r["feature"])
    rows.sort(key=lambda r: -abs(r["effect"]))
    return rows


def make_pre():
    return ColumnTransformer([
        ("num", StandardScaler(), NUMERIC),
        ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CATEGORICAL),
    ])


def models():
    return {
        "logreg": GridSearchCV(
            Pipeline([("pre", make_pre()),
                      ("clf", LogisticRegression(class_weight="balanced", max_iter=5000))]),
            {"clf__C": [0.03, 0.1, 0.3, 1.0]}, scoring="average_precision",
            cv=StratifiedKFold(5, shuffle=True, random_state=SEED)),
        "rf": Pipeline([("pre", make_pre()),
                        ("clf", RandomForestClassifier(n_estimators=400, min_samples_leaf=5, max_features="sqrt",
                                                       class_weight="balanced_subsample", random_state=SEED,
                                                       n_jobs=-1))]),
        "xgb": Pipeline([("pre", make_pre()),
                         ("clf", __import__("xgboost").XGBClassifier(
                             n_estimators=300, max_depth=3, learning_rate=0.05, subsample=0.8,
                             colsample_bytree=0.8, min_child_weight=3, reg_lambda=2.0,
                             scale_pos_weight=1233 / 237, random_state=SEED, n_jobs=4,
                             eval_metric="logloss"))]),
    }


MODEL_LABELS = {
    "logreg": {"es": "Regresión logística", "en": "Logistic regression"},
    "rf": {"es": "Random Forest", "en": "Random Forest"},
    "xgb": {"es": "XGBoost", "en": "XGBoost"},
}


def cv_compare(X, y):
    cv = RepeatedStratifiedKFold(n_splits=5, n_repeats=3, random_state=SEED)
    out = {}
    for name, est in models().items():
        pr, roc, br = [], [], []
        for tr, te in cv.split(X, y):
            m = clone(est).fit(X.iloc[tr], y.iloc[tr])
            p = m.predict_proba(X.iloc[te])[:, 1]
            pr.append(average_precision_score(y.iloc[te], p))
            roc.append(roc_auc_score(y.iloc[te], p))
            br.append(brier_score_loss(y.iloc[te], p))
        out[name] = {"prAuc": float(np.mean(pr)), "prAucSe": float(np.std(pr, ddof=1) / np.sqrt(len(pr))),
                     "rocAuc": float(np.mean(roc)), "rocAucSd": float(np.std(roc, ddof=1)),
                     "brierRaw": float(np.mean(br)), "folds": len(pr)}
    return out


def sensitive_ablation(df, y):
    """How much PR-AUC would adding the sensitive attributes buy? (We still exclude them.)"""
    cv = RepeatedStratifiedKFold(n_splits=5, n_repeats=3, random_state=SEED)
    res = {}
    for name, cats, nums in (("without", CATEGORICAL, NUMERIC),
                             ("with", CATEGORICAL + ["Gender", "MaritalStatus"], NUMERIC + ["Age"])):
        pipe = Pipeline([("pre", ColumnTransformer([("num", StandardScaler(), nums),
                                                    ("cat", OneHotEncoder(handle_unknown="ignore"), cats)])),
                         ("clf", LogisticRegression(class_weight="balanced", C=0.3, max_iter=5000))])
        scores = []
        for tr, te in cv.split(df, y):
            m = clone(pipe).fit(df.iloc[tr], y.iloc[tr])
            scores.append(average_precision_score(y.iloc[te], m.predict_proba(df.iloc[te])[:, 1]))
        res[name] = float(np.mean(scores))
    return res


class Platt:
    """Sigmoid recalibration of a score s: p = 1 / (1 + exp(-(a*s + b)))."""

    def fit(self, s, y):
        lr = LogisticRegression(C=1e6, max_iter=1000).fit(np.asarray(s).reshape(-1, 1), y)
        self.a, self.b = float(lr.coef_[0, 0]), float(lr.intercept_[0])
        return self

    def __call__(self, s):
        return 1 / (1 + np.exp(-(self.a * np.asarray(s) + self.b)))


def logit(p):
    p = np.clip(p, 1e-6, 1 - 1e-6)
    return np.log(p / (1 - p))


def curve_points(x, y, n=80):
    idx = np.unique(np.linspace(0, len(x) - 1, min(n, len(x))).astype(int))
    return [[round(float(x[i]), 4), round(float(y[i]), 4)] for i in idx]


def main():
    raw = verify("ibm_hr")
    df = pd.read_csv(raw / "WA_Fn-UseC_-HR-Employee-Attrition.csv")
    quality = {
        "rows": int(len(df)), "columns": int(df.shape[1]), "missing": int(df.isna().sum().sum()),
        "duplicates": int(df.duplicated().sum()),
        "constantDropped": [c for c in DROP_CONSTANT if df[c].nunique() == 1],
        "idDropped": DROP_ID, "undocumentedDropped": DROP_UNDOCUMENTED, "sensitiveExcluded": SENSITIVE,
    }
    assert quality["missing"] == 0 and quality["duplicates"] == 0
    assert quality["constantDropped"] == DROP_CONSTANT
    df[TARGET] = (df[TARGET] == "Yes").astype(int)
    y = df[TARGET]
    X = df[FEATURES]

    # ---- 1. Hold-out split (test set is touched once, at the end) ----
    X_tr, X_te, y_tr, y_te, idx_tr, idx_te = train_test_split(
        X, y, df.index, test_size=0.2, stratify=y, random_state=SEED)

    # ---- 2. Model comparison: repeated stratified CV on the training split only ----
    cvres = cv_compare(X_tr, y_tr)
    best_pr = max(cvres.values(), key=lambda r: r["prAuc"])
    # Prefer the simplest model within one standard error of the best (one-SE rule).
    order = ["logreg", "rf", "xgb"]
    selected = next(m for m in order if cvres[m]["prAuc"] >= best_pr["prAuc"] - best_pr["prAucSe"])

    # ---- 3. Fit every model on the full training split; calibrate with OOF scores ----
    fitted, calib, test_scores, oof_cal = {}, {}, {}, {}
    inner = StratifiedKFold(5, shuffle=True, random_state=SEED)
    for name, est in models().items():
        oof = cross_val_predict(clone(est), X_tr, y_tr, cv=inner, method="predict_proba")[:, 1]
        cal = Platt().fit(logit(oof), y_tr)
        m = clone(est).fit(X_tr, y_tr)
        fitted[name], calib[name] = m, cal
        oof_cal[name] = cal(logit(oof))
        test_scores[name] = cal(logit(m.predict_proba(X_te)[:, 1]))

    # Each model's threshold is chosen on its own training OOF probabilities
    # (never on test) by maximising F1.
    thresholds = {}
    for name, p_oof in oof_cal.items():
        prec, rec, thr = precision_recall_curve(y_tr, p_oof)
        f1s = 2 * prec[:-1] * rec[:-1] / np.maximum(prec[:-1] + rec[:-1], 1e-9)
        thresholds[name] = float(thr[np.argmax(f1s)])
    threshold = thresholds[selected]

    test = {}
    for name in order:
        p = test_scores[name]
        raw_p = fitted[name].predict_proba(X_te)[:, 1]
        yhat = (p >= thresholds[name]).astype(int)
        test[name] = {
            "label": MODEL_LABELS[name], "threshold": thresholds[name], "prAuc": float(average_precision_score(y_te, p)),
            "rocAuc": float(roc_auc_score(y_te, p)), "brier": float(brier_score_loss(y_te, p)),
            "brierUncalibrated": float(brier_score_loss(y_te, raw_p)),
            "precision": float(precision_score(y_te, yhat, zero_division=0)),
            "recall": float(recall_score(y_te, yhat)), "f1": float(f1_score(y_te, yhat)),
        }
        fpr, tpr, _ = roc_curve(y_te, p)
        pr_p, pr_r, _ = precision_recall_curve(y_te, p)
        test[name]["roc"] = curve_points(fpr, tpr)
        test[name]["pr"] = curve_points(pr_r[::-1], pr_p[::-1])
    p_sel = test_scores[selected]
    cm = confusion_matrix(y_te, (p_sel >= threshold).astype(int)).tolist()
    frac_pos, mean_pred = calibration_curve(y_te, p_sel, n_bins=6, strategy="quantile")
    raw_frac, raw_mean = calibration_curve(y_te, fitted[selected].predict_proba(X_te)[:, 1], n_bins=6, strategy="quantile")

    # ---- 4. Explainability: SHAP on the selected, calibrated model (log-odds space) ----
    pre = (fitted[selected].best_estimator_ if selected == "logreg" else fitted[selected]).named_steps["pre"]
    clf = (fitted[selected].best_estimator_ if selected == "logreg" else fitted[selected]).named_steps["clf"]
    Z_tr, Z_te = pre.transform(X_tr), pre.transform(X_te)
    names = list(pre.get_feature_names_out())
    if selected == "logreg":
        expl = shap.LinearExplainer(clf, Z_tr)
    else:
        expl = shap.TreeExplainer(clf)
    sv = np.asarray(expl.shap_values(Z_te)) * calib[selected].a       # calibrated log-odds
    groups = {}
    for j, n in enumerate(names):
        base = n.split("__", 1)[1]
        feat = next((c for c in CATEGORICAL if base.startswith(c + "_")), base)
        groups.setdefault(feat, []).append(j)
    gsv = {f: sv[:, js].sum(1) for f, js in groups.items()}
    imp = sorted(((f, float(np.abs(v).mean())) for f, v in gsv.items()), key=lambda t: -t[1])
    top = [f for f, _ in imp[:10]]
    bees = {}
    for f in top:
        if f in NUMERIC:
            v = X_te[f].astype(float)
            norm = ((v.rank(pct=True)).round(3)).tolist()
            raw_vals = v.tolist()
        else:
            norm = (X_te[f] == X_te[f].mode()[0]).astype(float).tolist()   # 1 = modal level
            raw_vals = X_te[f].tolist()
        bees[f] = [[round(float(s), 3), n_, r] for s, n_, r in zip(gsv[f], norm, raw_vals)]

    # ---- 5. Deployable explorer model: logistic regression refit on ALL data ----
    #      (selected or not, the browser explorer needs a model whose explanation is exact)
    lr_full = clone(models()["logreg"]).fit(X, y)
    oof_all = cross_val_predict(clone(lr_full.best_estimator_), X, y,
                                cv=StratifiedKFold(5, shuffle=True, random_state=SEED),
                                method="decision_function")
    platt_all = Platt().fit(oof_all, y)
    best = lr_full.best_estimator_
    sc = best.named_steps["pre"].named_transformers_["num"]
    oh = best.named_steps["pre"].named_transformers_["cat"]
    coef = best.named_steps["clf"].coef_[0]
    nn = len(NUMERIC)
    explorer = {
        "intercept": float(best.named_steps["clf"].intercept_[0]),
        "platt": {"a": platt_all.a, "b": platt_all.b},
        "C": float(lr_full.best_params_["clf__C"]),
        "numeric": [{"f": f, "mean": float(m), "std": float(s), "w": float(w), "label": lab(f),
                     "min": int(df[f].min()), "max": int(df[f].max()), "median": float(df[f].median())}
                    for f, m, s, w in zip(NUMERIC, sc.mean_, sc.scale_, coef[:nn])],
        "categorical": [],
        "oofProbability": [round(float(v), 4) for v in platt_all(oof_all)],
    }
    k = nn
    for f, levels in zip(CATEGORICAL, oh.categories_):
        lv = list(levels)
        explorer["categorical"].append({
            "f": f, "label": lab(f), "levels": lv, "levelsEs": [LEVELS_ES.get(v, v) for v in lv],
            "w": [float(x) for x in coef[k:k + len(lv)]],
            "share": [float((df[f] == v).mean()) for v in lv], "mode": df[f].mode()[0]})
        k += len(lv)

    # Parity: the browser formula (z-scored numerics + one-hot weights, then Platt)
    # must reproduce sklearn's calibrated probability for every row.
    from analytics.talentrisk.scoring import score_rows
    manual = score_rows(explorer, df)
    sk = platt_all(best.decision_function(X))
    assert np.allclose(manual, sk, atol=1e-9), "explorer formula diverges from sklearn"

    # ---- 6. Fairness audit with out-of-fold probabilities on all rows ----
    p_all = platt_all(oof_all)
    flag = p_all >= threshold
    age_band = pd.cut(df.Age, [17, 29, 39, 49, 100], labels=["18–29", "30–39", "40–49", "50+"])
    fairness = []
    for attr, series in (("Gender", df.Gender), ("AgeBand", age_band.astype(str)), ("MaritalStatus", df.MaritalStatus)):
        for g in sorted(series.unique()):
            mask = (series == g).values
            pos = mask & (y.values == 1)
            fairness.append({
                "attr": attr, "group": g, "groupEs": LEVELS_ES.get(g, g), "n": int(mask.sum()),
                "observed": float(y.values[mask].mean()), "meanScore": float(p_all[mask].mean()),
                "flagged": float(flag[mask].mean()),
                "recall": float(flag[pos].mean()) if pos.sum() else None,
                "precision": float(y.values[mask & flag].mean()) if (mask & flag).sum() else None,
            })

    # ---- 7. Rows for the client-side dashboard (fictional data; no identifiers) ----
    keep = ["Age", "Gender", "MaritalStatus", "Department", "JobRole", "JobLevel", "YearsAtCompany",
            "MonthlyIncome", "OverTime", "JobSatisfaction", "EnvironmentSatisfaction", "WorkLifeBalance",
            "DistanceFromHome", "YearsSinceLastPromotion", "TrainingTimesLastYear", "BusinessTravel",
            "StockOptionLevel", "TotalWorkingYears", "EducationField", "Education", "JobInvolvement",
            "NumCompaniesWorked", "PercentSalaryHike", "PerformanceRating", "RelationshipSatisfaction",
            "YearsInCurrentRole", "YearsWithCurrManager"]
    rows = {c: df[c].tolist() for c in keep}
    rows["Attrition"] = y.tolist()

    assoc = associations(df)
    data = {
        "meta": {
            "title": "TalentRisk AI",
            "source": {"name": "IBM HR Analytics Employee Attrition & Performance", "url": SOURCES["ibm_hr"]["url"],
                       "license": SOURCES["ibm_hr"]["license"]},
            "synthetic": True,
            "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "quality": quality, "attritionShare": float(y.mean()), "leavers": int(y.sum()),
        },
        "labels": {f: lab(f) for f in LABELS}, "levelsEs": LEVELS_ES,
        "rows": rows,
        "associations": assoc,
        "model": {
            "split": {"train": int(len(X_tr)), "test": int(len(X_te)), "testPositives": int(y_te.sum()),
                      "seed": SEED, "stratified": True},
            "cv": {k: dict(v, label=MODEL_LABELS[k]) for k, v in cvres.items()},
            "cvScheme": "RepeatedStratifiedKFold(5 folds x 3 repeats) on the training split",
            "selected": selected, "selectionRule": "one-SE rule on CV PR-AUC, simplest model first",
            "logregC": float(fitted["logreg"].best_params_["clf__C"]),
            "threshold": threshold, "test": test, "confusion": cm,
            "calibration": {"observed": frac_pos.round(4).tolist(), "predicted": mean_pred.round(4).tolist(),
                            "rawObserved": raw_frac.round(4).tolist(), "rawPredicted": raw_mean.round(4).tolist()},
            "features": FEATURES, "sensitiveAblation": sensitive_ablation(df, y),
        },
        "shap": {"importance": [{"f": f, "value": v, "label": lab(f)} for f, v in imp],
                 "beeswarm": bees, "order": top, "space": "calibrated log-odds",
                 "explainer": "LinearExplainer" if selected == "logreg" else "TreeExplainer"},
        "explorer": explorer,
        "fairness": fairness,
    }
    data["insights"] = insights(df, assoc, data)

    WEB_DATA.mkdir(parents=True, exist_ok=True)
    (WEB_DATA / "talentrisk.json").write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    (ARTIFACTS / "talentrisk_explorer_model.json").write_text(json.dumps(
        {k: v for k, v in explorer.items() if k != "oofProbability"} | {"threshold": threshold}, indent=1))
    print("selected", selected, "threshold", round(threshold, 3))
    for k, v in cvres.items():
        print(f"  CV {k:6s} PR-AUC {v['prAuc']:.3f}±{v['prAucSe']:.3f} ROC {v['rocAuc']:.3f}")
    for k, v in test.items():
        print(f"  TEST {k:6s} PR-AUC {v['prAuc']:.3f} ROC {v['rocAuc']:.3f} Brier {v['brier']:.3f} (raw {v['brierUncalibrated']:.3f}) P {v['precision']:.2f} R {v['recall']:.2f} F1 {v['f1']:.2f}")
    print("  confusion", cm, "ablation", data["model"]["sensitiveAblation"])
    print("  shap top", [f for f, _ in imp[:6]])
    return data


def rate_table(df, f, bins=None):
    s = pd.cut(df[f], bins) if bins is not None else df[f]
    g = df.groupby(s, observed=True).Attrition.agg(["sum", "count"])
    return g


def insights(df, assoc, data):
    out = []
    y = df.Attrition
    base = y.mean()

    def rate(mask):
        k, n = int(y[mask].sum()), int(mask.sum())
        lo, hi = wilson(k, n)
        return k / n, lo, hi, n

    def p_of(f):
        return next(a for a in assoc if a["feature"] == f)["pAdj"]

    ot = rate(df.OverTime == "Yes")
    no = rate(df.OverTime == "No")
    out.append({
        "id": "overtime", "kind": "measured",
        "title": {"es": "Las horas extra son el factor más asociado a la salida", "en": "Overtime is the factor most associated with leaving"},
        "evidence": {"es": f"Con horas extra, {ot[0]:.1%} tiene Attrition = Yes (IC95% {ot[1]:.1%}–{ot[2]:.1%}, n = {ot[3]}); sin horas extra, {no[0]:.1%} (n = {no[3]}). p ajustado {p_of('OverTime'):.1e}.",
                     "en": f"With overtime, {ot[0]:.1%} have Attrition = Yes (95% CI {ot[1]:.1%}–{ot[2]:.1%}, n = {ot[3]}); without, {no[0]:.1%} (n = {no[3]}). Adjusted p {p_of('OverTime'):.1e}."},
        "why": {"es": "Es una condición laboral que la organización puede observar y gestionar.",
                "en": "It is a working condition the organisation can observe and manage."},
        "action": {"es": "Revisar carga y dotación en los equipos con más horas extra.",
                   "en": "Review workload and staffing in teams with the most overtime."},
        "validate": {"es": "Asociación, no causa: verificar con datos reales de horas y encuestas de clima.",
                     "en": "Association, not cause: verify with real hours data and engagement surveys."},
    })
    jl = rate(df.JobLevel == 1)
    jl2 = rate(df.JobLevel >= 2)
    out.append({
        "id": "joblevel", "kind": "measured",
        "title": {"es": "El nivel de cargo inicial concentra la mayor proporción de salidas", "en": "Entry job level shows the highest share of leavers"},
        "evidence": {"es": f"Nivel 1: {jl[0]:.1%} (IC95% {jl[1]:.1%}–{jl[2]:.1%}, n = {jl[3]}) frente a {jl2[0]:.1%} en niveles 2–5 (n = {jl2[3]}).",
                     "en": f"Level 1: {jl[0]:.1%} (95% CI {jl[1]:.1%}–{jl[2]:.1%}, n = {jl[3]}) vs {jl2[0]:.1%} at levels 2–5 (n = {jl2[3]})."},
        "why": {"es": "Nivel, ingreso y antigüedad están correlacionados: el patrón describe a perfiles de entrada.",
                "en": "Level, income and tenure are correlated: the pattern describes entry-level profiles."},
        "action": {"es": "Investigar onboarding y planes de carrera para cargos de entrada.",
                   "en": "Investigate onboarding and career paths for entry roles."},
        "validate": {"es": "Separar el efecto del ingreso del efecto del nivel requiere datos longitudinales.",
                     "en": "Separating income from level effects requires longitudinal data."},
    })
    t2 = rate(df.YearsAtCompany <= 2)
    t3 = rate(df.YearsAtCompany > 2)
    out.append({
        "id": "tenure", "kind": "measured",
        "title": {"es": "Los primeros dos años son el tramo con más salidas", "en": "The first two years show the most leavers"},
        "evidence": {"es": f"Antigüedad ≤ 2 años: {t2[0]:.1%} (n = {t2[3]}); más de 2 años: {t3[0]:.1%} (n = {t3[3]}).",
                     "en": f"Tenure ≤ 2 years: {t2[0]:.1%} (n = {t2[3]}); over 2 years: {t3[0]:.1%} (n = {t3[3]})."},
        "why": {"es": "Señala dónde un programa de retención temprana tendría más casos para observar.",
                "en": "Shows where an early-retention programme would have the most cases to observe."},
        "action": {"es": "Diseñar entrevistas de permanencia a los 6 y 18 meses.",
                   "en": "Design stay interviews at 6 and 18 months."},
        "validate": {"es": "El dataset no tiene fechas: no sabemos cuándo ocurrió cada salida.",
                     "en": "The dataset has no dates: we do not know when each exit happened."},
    })
    js1 = rate(df.JobSatisfaction == 1)
    js4 = rate(df.JobSatisfaction == 4)
    out.append({
        "id": "satisfaction", "kind": "measured",
        "title": {"es": "Baja satisfacción laboral, más salidas", "en": "Low job satisfaction, more leavers"},
        "evidence": {"es": f"Satisfacción 1/4: {js1[0]:.1%} (n = {js1[3]}); satisfacción 4/4: {js4[0]:.1%} (n = {js4[3]}).",
                     "en": f"Satisfaction 1/4: {js1[0]:.1%} (n = {js1[3]}); satisfaction 4/4: {js4[0]:.1%} (n = {js4[3]})."},
        "why": {"es": "Es una señal que RR. HH. ya puede medir con encuestas periódicas.",
                "en": "It is a signal HR can already measure with periodic surveys."},
        "action": {"es": "Seguir la satisfacción por equipo y cruzarla con carga de trabajo.",
                   "en": "Track satisfaction by team and cross it with workload."},
        "validate": {"es": "La escala 1–4 es gruesa y autodeclarada.",
                     "en": "The 1–4 scale is coarse and self-reported."},
    })
    m = data["model"]
    sel = m["test"][m["selected"]]
    out.append({
        "id": "model", "kind": "measured",
        "title": {"es": "El modelo ordena el riesgo mejor que el azar, con margen de error relevante",
                  "en": "The model ranks risk better than chance, with meaningful error"},
        "evidence": {"es": f"En el conjunto de prueba ({m['split']['test']} personas), PR-AUC {sel['prAuc']:.2f} frente a {base:.2f} de una línea base aleatoria; precisión {sel['precision']:.0%} y recall {sel['recall']:.0%} con el umbral elegido.",
                     "en": f"On the test set ({m['split']['test']} people), PR-AUC {sel['prAuc']:.2f} vs {base:.2f} for a random baseline; precision {sel['precision']:.0%} and recall {sel['recall']:.0%} at the chosen threshold."},
        "why": {"es": "Sirve para priorizar investigación por segmentos, no para decidir sobre personas.",
                "en": "It helps prioritise segment-level investigation, not decisions about individuals."},
        "action": {"es": "Usarlo para orientar encuestas y conversaciones con jefaturas.",
                   "en": "Use it to guide surveys and conversations with managers."},
        "validate": {"es": "Datos ficticios: el modelo debe reentrenarse y validarse con datos reales.",
                     "en": "Fictional data: the model must be retrained and validated on real data."},
    })
    return out


if __name__ == "__main__":
    main()
