"""Weekly revenue forecasting with a leakage-free rolling-origin backtest.

Every model only sees weeks <= origin when predicting origin+1..origin+H.
Simple baselines are included so the advanced model has to earn its place.
"""
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.linear_model import Ridge
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

H = 8                     # forecast horizon (weeks)
FIRST_ORIGIN = 44         # first backtest origin (week index); needs enough history
ORIGIN_STEP = 2
BLACK_FRIDAYS = [pd.Timestamp("2017-11-24"), pd.Timestamp("2018-11-23")]

MODEL_LABELS = {
    "naive": {"es": "Ingenuo (última semana)", "en": "Naive (last week)"},
    "ma4": {"es": "Media móvil 4 semanas", "en": "4-week moving average"},
    "drift": {"es": "Tendencia lineal (deriva 26 sem.)", "en": "Linear drift (26 wk)"},
    "ridge": {"es": "Ridge con rezagos + calendario", "en": "Ridge with lags + calendar"},
    "gbm": {"es": "Gradient boosting con rezagos", "en": "Gradient boosting with lags"},
}
BASELINES = ("naive", "ma4")


def weekly(daily):
    """daily: pd.Series indexed by date. Returns Monday-start full weeks."""
    s = daily.copy()
    s.index = pd.to_datetime(s.index)
    w = s.groupby(s.index.to_period("W-SUN")).agg(["sum", "count"])
    w = w[w["count"] == 7]["sum"]
    w.index = w.index.start_time
    return w


def _bf_flag(week_starts):
    return np.array([any(ws <= bf < ws + pd.Timedelta(days=7) for bf in BLACK_FRIDAYS)
                     for ws in week_starts], dtype=float)


def _features(logy, t):
    """Features known at origin t (inclusive)."""
    return [logy[t], logy[t - 1], logy[t - 2], logy[t - 3], logy[t - 3:t + 1].mean(), t / 100.0]


def _direct_model(kind, logy, weeks, h, upto):
    """Train a direct h-step model on pairs (t, t+h) with t+h <= upto."""
    X, y = [], []
    for t in range(3, upto - h + 1):
        X.append(_features(logy, t) + [_bf_flag([weeks[t + h]])[0]])
        y.append(logy[t + h])
    if kind == "ridge":
        m = make_pipeline(StandardScaler(), Ridge(alpha=3.0))
    else:
        m = HistGradientBoostingRegressor(max_iter=150, learning_rate=0.05,
                                          min_samples_leaf=5, random_state=7)
    m.fit(np.array(X), np.array(y))
    return m


def predict(kind, y, weeks, origin, horizon=H, future_weeks=None):
    """Forecast weeks origin+1..origin+horizon using y[:origin+1] only."""
    hist = y[: origin + 1]
    if kind == "naive":
        return np.repeat(hist[-1], horizon)
    if kind == "ma4":
        return np.repeat(hist[-4:].mean(), horizon)
    if kind == "drift":
        slope = (hist[-1] - hist[-27]) / 26.0
        return hist[-1] + slope * np.arange(1, horizon + 1)
    logy = np.log1p(hist)
    all_weeks = list(weeks[: origin + 1]) + list(future_weeks if future_weeks is not None
                                                 else weeks[origin + 1: origin + 1 + horizon])
    out = []
    for h in range(1, horizon + 1):
        m = _direct_model(kind, np.log1p(y[: origin + 1]), all_weeks, h, origin)
        x = _features(logy, origin) + [_bf_flag([all_weeks[origin + h]])[0]]
        out.append(np.expm1(m.predict(np.array([x]))[0]))
    return np.array(out)


def backtest(y, weeks):
    origins = list(range(FIRST_ORIGIN, len(y) - H, ORIGIN_STEP))
    rows = []
    for kind in MODEL_LABELS:
        for o in origins:
            pred = predict(kind, y, weeks, o)
            for h in range(1, H + 1):
                rows.append({"model": kind, "origin": o, "h": h,
                             "actual": y[o + h], "pred": pred[h - 1]})
    return pd.DataFrame(rows), origins


def _wmape(df):
    return float((df.actual - df.pred).abs().sum() / df.actual.abs().sum())


def run(daily):
    w = weekly(daily)
    y = w.values.astype(float)
    weeks = list(w.index)
    bt, origins = backtest(y, weeks)

    metrics = []
    for kind, g in bt.groupby("model", sort=False):
        metrics.append({
            "model": kind,
            "label": MODEL_LABELS[kind],
            "baseline": kind in BASELINES,
            "wmape": _wmape(g),
            "mae": float((g.actual - g.pred).abs().mean()),
            "bias": float((g.pred - g.actual).sum() / g.actual.sum()),
            "wmapeByH": [_wmape(g[g.h == h]) for h in range(1, H + 1)],
        })
    metrics.sort(key=lambda m: m["wmape"])
    best = metrics[0]["model"]
    best_baseline = min((m for m in metrics if m["baseline"]), key=lambda m: m["wmape"])

    # 80% interval from empirical relative errors of the selected model.
    sel = bt[bt.model == best].copy()
    sel["rel"] = sel.actual / sel.pred - 1.0
    q_lo, q_hi = np.quantile(sel.rel, [0.10, 0.90])
    # Honest coverage check: quantiles from the first half of origins,
    # evaluated on the second half (never on the same residuals).
    half = origins[len(origins) // 2]
    early, late = sel[sel.origin < half], sel[sel.origin >= half]
    e_lo, e_hi = np.quantile(early.rel, [0.10, 0.90])
    covered = ((late.actual >= late.pred * (1 + e_lo)) & (late.actual <= late.pred * (1 + e_hi))).mean()

    future_weeks = [weeks[-1] + pd.Timedelta(weeks=k) for k in range(1, H + 1)]
    fut = predict(best, y, weeks, len(y) - 1, future_weeks=future_weeks)
    fut_base = predict(best_baseline["model"], y, weeks, len(y) - 1, future_weeks=future_weeks)

    preds = {k: {str(o): [round(float(v), 2) for v in g[g.origin == o].sort_values("h").pred]
                 for o in origins}
             for k, g in bt.groupby("model")}

    return {
        "weeks": [d.strftime("%Y-%m-%d") for d in weeks],
        "actual": [round(float(v), 2) for v in y],
        "horizon": H,
        "origins": origins,
        "backtestPred": preds,
        "metrics": metrics,
        "selected": best,
        "bestBaseline": best_baseline["model"],
        "improvementVsBaseline": 1 - metrics[0]["wmape"] / best_baseline["wmape"],
        "interval": {"level": 0.8, "relLo": float(q_lo), "relHi": float(q_hi),
                     "holdoutCoverage": float(covered), "holdoutN": int(len(late))},
        "future": {
            "weeks": [d.strftime("%Y-%m-%d") for d in future_weeks],
            "pred": [round(float(v), 2) for v in fut],
            "lo": [round(float(v * (1 + q_lo)), 2) for v in fut],
            "hi": [round(float(v * (1 + q_hi)), 2) for v in fut],
            "baseline": [round(float(v), 2) for v in fut_base],
        },
    }
