"""Interactive case studies: turn each project's published outputs into one JSON per app.

Run from the repository root:  python -m analytics.cases.build

Inputs
  * case-studies/<case>/ (bank, copper, feria): files already published in this repo.
  * analytics/data/raw/cases/<case>/ (airline, grocery, market): exports from the
    author's public project repositories (github.com/Chrov/<repo>), downloaded by
    `python -m analytics.cases.build --download` and verified with SHA-256.

Nothing is re-estimated here and nothing is hand-typed: the script aggregates the
reviewed outputs, re-checks that totals reconcile with each project's published
summary, and stops if any check fails.
"""
import json
import sys
import urllib.request
from datetime import datetime, timezone

import numpy as np
import pandas as pd

from analytics.common.data_sources import RAW, ROOT, WEB_DATA, sha256

CASES = ROOT / "case-studies"
RAWC = RAW / "cases"

REMOTE = {
    "airline": ("airline-reliability", {
        "reports/daily_reliability.csv": "",
        "reports/carrier_reliability.csv": "",
        "reports/route_reliability.csv": "",
        "reports/summary.json": "",
    }),
    "grocery": ("grocery-replenishment-policy", {
        "dashboard/data/demand_daily.csv": "",
        "dashboard/data/abc_items.csv": "",
        "outputs/complete_backtest.csv": "",
        "outputs/complete_predictions.csv": "",
    }),
    "market": ("market-stall-analytics", {
        "analysis_export/analysis_batches.csv": "",
        "analysis_export/reviewed_batch_cohorts.csv": "",
        "analysis_export/reviewed_category_economics.csv": "",
        "analysis_export/review_metrics.json": "",
        "analysis_export/analysis_products.csv": "",
    }),
}
MANIFEST = RAWC / "manifest.json"


def download():
    """Fetch the exports and record their hashes (first run) or verify them (later runs)."""
    known = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    for case, (repo, files) in REMOTE.items():
        for rel in files:
            dest = RAWC / case / rel.split("/")[-1]
            dest.parent.mkdir(parents=True, exist_ok=True)
            if not dest.exists():
                url = f"https://raw.githubusercontent.com/Chrov/{repo}/HEAD/{rel}"
                req = urllib.request.Request(url, headers={"User-Agent": "portfolio-analytics-build/1.0"})
                with urllib.request.urlopen(req, timeout=60) as r:
                    dest.write_bytes(r.read())
            key = f"{case}/{dest.name}"
            digest = sha256(dest)
            if key in known and known[key] != digest:
                raise SystemExit(f"Checksum mismatch for {key}")
            known[key] = digest
    MANIFEST.write_text(json.dumps(known, indent=1, sort_keys=True))


def verify():
    if not MANIFEST.exists():
        raise SystemExit("Missing analytics/data/raw/cases — run: python -m analytics.cases.build --download")
    known = json.loads(MANIFEST.read_text())
    for key, digest in known.items():
        p = RAWC / key
        if not p.exists() or sha256(p) != digest:
            raise SystemExit(f"Missing or altered input: {p}")


def csv(path, **kw):
    return pd.read_csv(path, encoding="utf-8-sig", **kw)


def r(x, n=4):
    return None if x is None or (isinstance(x, float) and not np.isfinite(x)) else round(float(x), n)


def sig(x, n=4):
    """Round to n significant digits (bank scores are as small as 1e-6)."""
    return float(f"{float(x):.{n}g}")


def wilson(k, n, z=1.96):
    if n == 0:
        return (0.0, 0.0)
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * np.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (c - h, c + h)


class Checks(list):
    def add(self, name, ok, detail=""):
        self.append({"check": name, "passed": bool(ok), "detail": detail})
        if not ok:
            raise SystemExit(f"CHECK FAILED: {name} {detail}")


# --------------------------------------------------------------------------- airline
CARRIERS = {
    "9E": "Endeavor Air", "AA": "American Airlines", "AS": "Alaska Airlines", "B6": "JetBlue Airways",
    "DL": "Delta Air Lines", "F9": "Frontier Airlines", "G4": "Allegiant Air", "HA": "Hawaiian Airlines",
    "MQ": "Envoy Air", "NK": "Spirit Airlines", "OH": "PSA Airlines", "OO": "SkyWest Airlines",
    "UA": "United Airlines", "WN": "Southwest Airlines", "YX": "Republic Airways",
}
COLS = ["scheduled", "cancelled", "diverted", "late", "arrival_known", "disrupted"]


def airline():
    src = RAWC / "airline"
    s = json.loads((src / "summary.json").read_text())
    daily = csv(src / "daily_reliability.csv")
    carriers = csv(src / "carrier_reliability.csv")
    routes = csv(src / "route_reliability.csv")
    ck = Checks()
    for name, df in (("daily", daily), ("carrier", carriers), ("route", routes)):
        ok = all(int(df[c].sum()) == int(s[c]) for c in COLS)
        ck.add(f"{name} totals reconcile with summary.json (scheduled, cancelled, diverted, late, arrival_known, disrupted)", ok)
    ck.add("disrupted = cancelled + diverted + late (every route)",
           bool((routes.disrupted == routes.cancelled + routes.diverted + routes.late).all()))
    ck.add("arrival_known = scheduled − cancelled − diverted (every route)",
           bool((routes.arrival_known == routes.scheduled - routes.cancelled - routes.diverted).all()))
    ck.add(f"{len(routes)} directional routes, unique keys", routes.route.is_unique and len(routes) == s["routes"])
    ck.add("all 15 reporting carriers have a name", set(carriers.carrier) <= set(CARRIERS))

    routes[["origin", "dest"]] = routes.route.str.split(" - ", expand=True)
    airports = {}
    for side in ("origin", "dest"):
        g = routes.groupby(side)[COLS].sum()
        airports[side] = g
    ap = airports["origin"].add(airports["dest"], fill_value=0)
    ap = ap.sort_values("scheduled", ascending=False)
    top_ap = ap.head(30)
    keep = routes[routes.scheduled >= 50].copy()
    daily["dow"] = pd.to_datetime(daily.date).dt.dayofweek
    return {
        "meta": {"period": s["period"], "source": s["source_url"], "sha256": s["source_sha256"],
                 "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "routesTotal": int(s["routes"]),
                 "routesKept": int(len(keep)), "minKept": 50},
        "totals": {c: int(s[c]) for c in COLS},
        "daily": {"date": daily.date.tolist(), **{c: daily[c].astype(int).tolist() for c in COLS}},
        "carriers": [{"code": row.carrier, "name": CARRIERS[row.carrier], **{c: int(getattr(row, c)) for c in COLS}}
                     for row in carriers.itertuples()],
        "routes": {"cols": ["route"] + COLS, "rows": [[row.route] + [int(getattr(row, c)) for c in COLS] for row in keep.itertuples()]},
        "airports": [{"code": code, **{c: int(row[c]) for c in COLS}} for code, row in top_ap.iterrows()],
        "airportNote": "scheduled flights touching the airport (departures + arrivals)",
        "checks": ck,
    }


# --------------------------------------------------------------------------- bank
SEG_DIMS = ["job", "education", "contact", "month", "poutcome", "age_band", "marital"]


def bank():
    d = CASES / "bank-campaign"
    rec = csv(d / "campaign_records.csv").sort_values("record_order").reset_index(drop=True)
    m = json.loads((d / "metrics.json").read_text())
    hold = csv(d / "holdout_scores.csv")
    cap = csv(d / "capacity_curve.csv")
    ck = Checks()
    n = len(rec)
    ntr, nva = m["train_records"], m["validation_records"]
    rec["cohort"] = np.where(rec.index < ntr, "train", np.where(rec.index < ntr + nva, "validation", "holdout"))
    rec["sub"] = (rec.y == "yes").astype(int)
    rates = rec.groupby("cohort")["sub"].mean()
    ck.add("cohort sizes 60/20/20 by record order", n == m["records"] and (rec.cohort == "holdout").sum() == m["holdout_records"])
    ck.add("cohort subscription rates match metrics.json",
           abs(rates["train"] - m["train_rate"]) < 1e-9 and abs(rates["holdout"] - m["holdout_rate"]) < 1e-9)
    ck.add("holdout_scores covers exactly the holdout cohort", len(hold) == m["holdout_records"]
           and set(hold.record_order) == set(rec.loc[rec.cohort == "holdout", "record_order"]))
    ck.add("call duration is not a model input (known only after the call)", True,
           "documented in the project; duration is excluded from this app as well")

    rec["age_band"] = pd.cut(rec.age, [0, 24, 34, 44, 54, 64, 120], labels=["≤24", "25–34", "35–44", "45–54", "55–64", "65+"]).astype(str)
    # 1) drift: bins of 1,000 consecutive contacts
    rec["bin"] = rec.index // 1000
    macro = ["euribor3m", "emp.var.rate", "nr.employed", "cons.conf.idx", "cons.price.idx"]
    gb = rec.groupby("bin")
    drift = {
        "start": gb.size().index.map(lambda b: int(b * 1000)).tolist(),
        "n": gb.size().astype(int).tolist(),
        "subs": gb["sub"].sum().astype(int).tolist(),
        "cohort": gb["cohort"].agg(lambda s: s.mode().iat[0]).tolist(),
        **{k.replace(".", "_"): [r(v, 3) for v in gb[k].mean()] for k in macro},
    }
    # 2) segments per cohort
    segs = {}
    for dim in SEG_DIMS:
        t = rec.groupby([dim, "cohort"])["sub"].agg(["size", "sum"]).reset_index()
        cats = rec[dim].value_counts().index.tolist()
        segs[dim] = {"cats": cats, "rows": {coh: [[int(t[(t[dim] == c) & (t.cohort == coh)]["size"].sum()),
                                                  int(t[(t[dim] == c) & (t.cohort == coh)]["sum"].sum())] for c in cats]
                                           for coh in ("train", "validation", "holdout")}}
    # 3) holdout: deciles, calibration, finer capacity curve
    # ties broken by record order, as in the project's capacity_curve.csv
    h = hold.sort_values(["probability", "record_order"], ascending=[False, True]).reset_index(drop=True)
    h["decile"] = (np.arange(len(h)) * 10 // len(h)) + 1
    dec = h.groupby("decile").agg(n=("subscribed", "size"), subs=("subscribed", "sum"), pmean=("probability", "mean"))
    h_cal = hold.copy()
    h_cal["bin"] = pd.qcut(h_cal.probability.rank(method="first"), 10, labels=False)
    cal = h_cal.groupby("bin").agg(n=("subscribed", "size"), subs=("subscribed", "sum"), pmean=("probability", "mean"))
    total_subs = int(h.subscribed.sum())
    fine = []
    for f in np.linspace(0.05, 1, 20):
        k = int(round(f * len(h)))
        fine.append([r(f, 2), k, int(h.subscribed.iloc[:k].sum())])
    ck.add("capacity_curve.csv reproduced from holdout scores",
           all(int(h.subscribed.iloc[:int(row.contacts)].sum()) == int(row.observed_subscriptions) for row in cap.itertuples()))
    # rank-based AUC check
    pos = hold.subscribed == 1
    ranks = hold.probability.rank()
    auc = (ranks[pos].sum() - pos.sum() * (pos.sum() + 1) / 2) / (pos.sum() * (~pos).sum())
    ck.add("holdout ROC-AUC recomputed", abs(auc - m["holdout_auc"]) < 1e-6, f"{auc:.4f}")
    return {
        "meta": {"source": "Moro, Rita & Cortez (2014), UCI Bank Marketing, DOI 10.24432/C5K306, CC BY 4.0",
                 "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d")},
        "metrics": m,
        "drift": drift,
        "segments": segs,
        "deciles": {"n": dec.n.astype(int).tolist(), "subs": dec.subs.astype(int).tolist(), "p": [sig(x) for x in dec.pmean]},
        "calibration": {"n": cal.n.astype(int).tolist(), "subs": cal.subs.astype(int).tolist(), "p": [sig(x) for x in cal.pmean]},
        "capacity": {"rows": fine, "total": total_subs, "contacts": int(len(h))},
        "checks": ck,
    }


# --------------------------------------------------------------------------- copper
def copper():
    d = CASES / "copper-observatory"
    a = csv(d / "annual.csv")
    m = json.loads((d / "metrics.json").read_text())
    ck = Checks()
    ck.add("49 consecutive years 1976–2024", list(a.year) == list(range(1976, 2025)))
    last = a.iloc[-1]
    ck.add("latest-year figures match metrics.json", abs(last.exports_usd_m - m["exports_usd_m"]) < 1e-6
           and abs(last.production_kt - m["production_kt"]) < 1e-9)
    corr = a[["exports_usd_m_yoy", "price_us_cent_lb_yoy"]].corr().iloc[0, 1]
    ck.add("Pearson r of yearly changes (exports vs price) matches metrics.json", abs(corr - m["change_correlation"]) < 1e-9, f"r = {corr:.3f}")
    corr_q = a[["exports_usd_m_yoy", "production_kt_yoy"]].corr().iloc[0, 1]
    return {
        "meta": {"source": "COCHILCO, «50 años de la minería en cifras» (anuarios de producción, precio y exportaciones)",
                 "url": "https://www.cochilco.cl/web/50-anios-de-la-mineria-en-cifras/",
                 "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d")},
        "years": a.year.astype(int).tolist(),
        "production": [r(x, 1) for x in a.production_kt],
        "price": [r(x, 3) for x in a.price_us_cent_lb],
        "exports": [r(x, 2) for x in a.exports_usd_m],
        "corr": {"price": r(corr), "production": r(corr_q)},
        "metrics": m,
        "checks": ck,
    }


# --------------------------------------------------------------------------- feria
def feria():
    d = CASES / "feria-demand"
    dem = csv(d / "demand.csv", parse_dates=["date"])
    pri = csv(d / "product_priority.csv")
    folds = csv(d / "fold_metrics.csv")
    back = csv(d / "backtest.csv")
    hold = csv(d / "holdout_predictions.csv")
    m = json.loads((d / "metrics.json").read_text())
    ck = Checks()
    ck.add("140,288 daily rows = 128 products × 1,096 days", len(dem) == m["rows"] == 128 * 1096)
    ck.add("no missing or negative demand", dem.demand_units.notna().all() and (dem.demand_units >= 0).all())
    cls = dict(zip(pri.product_id, pri.volume_class))
    dem["cls"] = dem.product_id.map(cls)
    ck.add("every product has an ABC volume class", dem.cls.notna().all())
    dem["month"] = dem.date.dt.strftime("%Y-%m")
    monthly = {}
    for c in ("ALL", "A", "B", "C"):
        sub = dem if c == "ALL" else dem[dem.cls == c]
        g = sub.groupby("month").demand_units.sum()
        monthly[c] = g.astype(int).tolist()
    months = sorted(dem.month.unique())
    # weekday profile (training period only: before the 28-day holdout)
    train = dem[dem.date < "2025-12-01"]
    wk = {}
    for c in ("ALL", "A", "B", "C"):
        sub = train if c == "ALL" else train[train.cls == c]
        daily = sub.groupby("date").demand_units.sum()
        wk[c] = [r(daily[daily.index.dayofweek == i].mean(), 1) for i in range(7)]
    # backtest by class
    back["cls"] = back.product_id.map(cls)
    bt = {}
    for c in ("ALL", "A", "B", "C"):
        sub = back if c == "ALL" else back[back.cls == c]
        g = sub.groupby(["origin", "model"]).agg(a=("actual_units", "sum"), e=("absolute_error", "sum"), s=("signed_error", "sum"))
        bt[c] = {mod: {"wmape": [r(g.loc[(o, mod), "e"] / g.loc[(o, mod), "a"]) for o in sorted(back.origin.unique())],
                       "bias": [r(g.loc[(o, mod), "s"] / g.loc[(o, mod), "a"]) for o in sorted(back.origin.unique())]}
                 for mod in ("seasonal_naive", "weekday_mean_8w")}
    f_all = folds.set_index(["origin", "model"])
    ck.add("backtest.csv reproduces fold_metrics.csv WMAPE",
           all(abs(bt["ALL"][mod]["wmape"][i] - f_all.loc[(o, mod), "wmape"]) < 1e-4
               for mod in ("seasonal_naive", "weekday_mean_8w") for i, o in enumerate(sorted(back.origin.unique()))))
    # holdout per product
    hold["cls"] = hold.product_id.map(cls)
    hp = hold.pivot_table(index=["product_id", "date"], columns="model", values=["actual_units", "forecast_units"])
    products = []
    for pid in pri.product_id:
        x = hp.loc[pid]
        products.append({"id": pid, "cls": cls[pid], "units": int(pri.set_index("product_id").loc[pid, "demand_units"]),
                         "actual": x[("actual_units", "weekday_mean_8w")].astype(int).tolist(),
                         "naive": [r(v, 1) for v in x[("forecast_units", "seasonal_naive")]],
                         "weekday": [r(v, 1) for v in x[("forecast_units", "weekday_mean_8w")]]})
    hdates = sorted(hold.date.unique())
    hw = {}
    for c in ("ALL", "A", "B", "C"):
        sub = hold if c == "ALL" else hold[hold.cls == c]
        hw[c] = {mod: r((sub[sub.model == mod].forecast_units - sub[sub.model == mod].actual_units).abs().sum()
                        / sub[sub.model == mod].actual_units.sum()) for mod in ("seasonal_naive", "weekday_mean_8w")}
    ck.add("holdout WMAPE matches metrics.json", abs(hw["ALL"]["weekday_mean_8w"] - m["holdout_wmape"]) < 1e-4
           and abs(hw["ALL"]["seasonal_naive"] - m["baseline_wmape"]) < 1e-4)
    return {
        "meta": {"source": "Datos sintéticos generados con semilla 20260907 (tools/build_analysis.py)", "seed": m["seed"],
                 "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "holdoutFrom": hdates[0], "holdoutTo": hdates[-1]},
        "metrics": m,
        "months": months, "monthly": monthly, "weekday": wk,
        "pareto": [r(x) for x in pri.cumulative_share],
        "classCounts": pri.volume_class.value_counts().to_dict(),
        "origins": sorted(back.origin.unique()), "backtest": bt,
        "holdout": {"dates": hdates, "wmape": hw, "products": products},
        "checks": ck,
    }


# --------------------------------------------------------------------------- grocery
def grocery():
    src = RAWC / "grocery"
    dd = csv(src / "demand_daily.csv", parse_dates=["date"])
    bt = csv(src / "complete_backtest.csv")
    pr = csv(src / "complete_predictions.csv")
    abc = csv(src / "abc_items.csv")
    ck = Checks()
    ck.add("daily family×store grain is unique", not dd.duplicated(["date", "family", "store_nbr"]).any())
    ck.add("units are non-negative (returns already clamped to zero)", (dd.units_sold >= 0).all())
    ck.add("backtest: 5 folds × 3 models, fold 5 is the reserved holdout",
           len(bt) == 15 and set(bt[bt.fold == 5].split) == {"holdout"})
    sel = bt[bt.split == "validation"].groupby("model").macro_sku_wmape.mean()
    ck.add("selected model = lowest mean validation SKU-store WMAPE (lightgbm_recursive)", sel.idxmin() == "lightgbm_recursive",
           ", ".join(f"{k} {v:.3f}" for k, v in sel.items()))
    dd["week"] = (dd.date - pd.to_timedelta(dd.date.dt.dayofweek, unit="D")).dt.strftime("%Y-%m-%d")
    fams = dd.groupby("family").units_sold.sum().sort_values(ascending=False).index.tolist()
    stores = sorted(dd.store_nbr.unique().tolist())
    weeks = sorted(dd.week.unique())
    wk = dd.groupby(["family", "store_nbr", "week"]).units_sold.sum()
    weekly = {f: {str(s): [r(wk.get((f, s, w), 0.0), 1) for w in weeks] for s in stores} for f in fams}
    days = dd.drop_duplicates("date")[["date", "is_holiday", "is_payday"]]
    dd["dow"] = dd.date.dt.dayofweek
    prof = {}
    for f in fams:
        prof[f] = {}
        for s in stores:
            x = dd[(dd.family == f) & (dd.store_nbr == s)]
            prof[f][str(s)] = {"dow": [r(x[x.dow == i].units_sold.sum(), 1) for i in range(7)],
                               "hol": r(x[x.is_holiday].units_sold.sum(), 1), "pay": r(x[x.is_payday == 1].units_sold.sum(), 1),
                               "all": r(x.units_sold.sum(), 1)}
    days["dow"] = days.date.dt.dayofweek
    nd = {"dow": [int((days.dow == i).sum()) for i in range(7)], "hol": int(days.is_holiday.sum()),
          "pay": int((days.is_payday == 1).sum()), "all": int(len(days))}
    stores_meta = dd.drop_duplicates("store_nbr").set_index("store_nbr")[["city", "store_type"]]
    eq = dd[dd.earthquake_window == 1].date
    preds = {}
    for (fold, model), g in pr.groupby(["fold", "model"]):
        g = g.sort_values("date")
        preds.setdefault(str(fold), {"dates": g.date.tolist(), "actual": [r(v, 1) for v in g.actual]})
        preds[str(fold)][model] = [r(v, 1) for v in g.prediction]
    return {
        "meta": {"source": "Datos sintéticos estilo Favorita (generador con semilla 42, repositorio grocery-replenishment-policy)",
                 "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "rawRows": 110624, "calendarRows": 213480,
                 "series": 360, "items": 60, "stores": 6, "from": dd.date.min().strftime("%Y-%m-%d"), "to": dd.date.max().strftime("%Y-%m-%d"),
                 "quakeFrom": eq.min().strftime("%Y-%m-%d") if len(eq) else None, "quakeTo": eq.max().strftime("%Y-%m-%d") if len(eq) else None},
        "families": fams, "stores": [{"id": int(s), "city": stores_meta.loc[s, "city"], "type": stores_meta.loc[s, "store_type"]} for s in stores],
        "weeks": weeks, "weekly": weekly, "profile": prof, "days": nd,
        "backtest": [{"fold": int(x.fold), "split": x.split, "origin": x.origin, "model": x.model, "macro": r(x.macro_sku_wmape),
                      "bev": r(x.beverages_store1_wmape), "pairs": int(x.scored_pairs)} for x in bt.itertuples()],
        "predictions": preds,
        "abc": {"items": abc.item_nbr.astype(str).tolist(), "family": abc.family.tolist(), "units": abc.total_sales.astype(int).tolist(),
                "cum": [r(x) for x in abc.cum_pct], "cls": abc.abc_class.tolist(), "perishable": abc.perishable.astype(int).tolist()},
        "checks": ck,
    }


# --------------------------------------------------------------------------- market
SEASON_ORDER = ["Summer", "Autumn", "Winter", "Spring"]


def market():
    src = RAWC / "market"
    coh = csv(src / "reviewed_batch_cohorts.csv")
    bat = csv(src / "analysis_batches.csv")
    econ = csv(src / "reviewed_category_economics.csv")
    rm = json.loads((src / "review_metrics.json").read_text())
    prods = csv(src / "analysis_products.csv")
    ck = Checks()
    b = coh.merge(bat[["BatchID", "Product", "SupplierName", "SupplierRole", "Season"]], on="BatchID", validate="one_to_one")
    ck.add("3,825 batches, unique keys, one-to-one join", len(b) == rm["batch_count"] and b.BatchID.is_unique)
    ck.add("quantity conservation: sold + wasted = purchased (±0.01)", (b.QtySold + b.QtyWasted - b.QtyPurchased).abs().max() < 0.011)
    ck.add("cohort revenue and gross profit match review_metrics.json",
           int(b.Revenue_CLP.sum()) == rm["cohort_revenue_clp"] and int(b.GrossProfit_CLP.sum()) == rm["cohort_gross_profit_clp"])
    ck.add("waste cost at acquisition cost matches review_metrics.json", abs(b.WasteCost_CLP.sum() - rm["waste_cost_clp"]) < 1)
    ck.add("gross profit = revenue − batch cost (every batch)", ((b.Revenue_CLP - b.BatchCost_CLP - b.GrossProfit_CLP).abs() < 1).all())
    g = b.groupby("Category").agg(rev=("Revenue_CLP", "sum"), gp=("GrossProfit_CLP", "sum"), cost=("BatchCost_CLP", "sum"), waste=("WasteCost_CLP", "sum"))
    e = econ.set_index("Category")
    ck.add("category economics reproduce reviewed_category_economics.csv",
           all(abs(g.loc[c, "waste"] - e.loc[c, "waste_cost_clp"]) < 1 and int(g.loc[c, "rev"]) == int(e.loc[c, "revenue_clp"]) for c in e.index))
    cats = g.sort_values("waste", ascending=False).index.tolist()
    months = sorted(b.PurchaseCohort.unique())
    mt = b.groupby(["Category", "PurchaseCohort"]).agg(rev=("Revenue_CLP", "sum"), gp=("GrossProfit_CLP", "sum"),
                                                       cost=("BatchCost_CLP", "sum"), waste=("WasteCost_CLP", "sum"), n=("BatchID", "size"))
    monthly = {c: {k: [int(round(mt[k].get((c, mo), 0))) for mo in months] for k in ("rev", "gp", "cost", "waste", "n")} for c in cats}
    st = b.groupby(["Category", "Status"]).size().unstack(fill_value=0)
    sea = b.groupby(["Category", "Season"]).agg(cost=("BatchCost_CLP", "sum"), waste=("WasteCost_CLP", "sum"))
    sup = b.groupby(["SupplierName"]).agg(role=("SupplierRole", lambda s: s.mode().iat[0]), products=("ProductID", "nunique"),
                                          cost=("BatchCost_CLP", "sum"), waste=("WasteCost_CLP", "sum"), batches=("BatchID", "size"),
                                          cats=("Category", lambda s: ", ".join(sorted(s.unique()))))
    sup = sup.sort_values("cost", ascending=False)
    share = sup.cost / sup.cost.sum()
    hhi = float((share * 100).pow(2).sum())
    pw = b.groupby(["ProductID", "Product", "Category"]).agg(cost=("BatchCost_CLP", "sum"), waste=("WasteCost_CLP", "sum"),
                                                             rev=("Revenue_CLP", "sum"), gp=("GrossProfit_CLP", "sum"), n=("BatchID", "size")).reset_index()
    pw = pw.sort_values("waste", ascending=False)
    scope = b.groupby("ClosureScope").agg(n=("BatchID", "size"), rev=("Revenue_CLP", "sum"))
    return {
        "meta": {"source": "Datos simulados (repositorio market-stall-analytics); compras jul 2023 – jun 2025, cierres hasta 2035",
                 "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "latestClose": rm["latest_close_date"],
                 "futureClosures": rm["future_closures"], "products": int(prods.ProductID.nunique()),
                 "suppliers": int(b.SupplierName.nunique()), "batches": int(len(b))},
        "totals": {"rev": int(b.Revenue_CLP.sum()), "gp": int(b.GrossProfit_CLP.sum()), "cost": int(b.BatchCost_CLP.sum()),
                   "waste": r(b.WasteCost_CLP.sum(), 1), "closedRev": int(rm["closed_by_cutoff_revenue_clp"])},
        "scope": {k: {"n": int(v.n), "rev": int(v.rev)} for k, v in scope.iterrows()},
        "categories": cats, "months": months, "monthly": monthly,
        "status": {c: {s: int(st.loc[c].get(s, 0)) for s in st.columns} for c in cats},
        "season": {"order": SEASON_ORDER, "rows": {c: [[int(sea.cost.get((c, s), 0)), r(sea.waste.get((c, s), 0), 1)] for s in SEASON_ORDER] for c in cats}},
        "suppliers": [{"name": n, "role": x.role, "products": int(x.products), "cost": int(x.cost), "waste": r(x.waste, 1),
                       "batches": int(x.batches), "cats": x.cats} for n, x in sup.iterrows()],
        "hhi": r(hhi, 1),
        "products": [{"id": x.ProductID, "name": x.Product, "cat": x.Category, "cost": int(x.cost), "waste": r(x.waste, 1),
                      "rev": int(x.rev), "gp": int(x.gp), "n": int(x.n)} for x in pw.head(25).itertuples()],
        "checks": ck,
    }


BUILDERS = {"airline": airline, "bank": bank, "copper": copper, "feria": feria, "grocery": grocery, "market": market}


def build(names=None):
    verify()
    WEB_DATA.mkdir(parents=True, exist_ok=True)
    out = {}
    for name in names or BUILDERS:
        data = BUILDERS[name]()
        path = WEB_DATA / f"case-{name}.json"
        path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        out[name] = (path.stat().st_size, len(data["checks"]))
        print(f"{name:8s} {path.stat().st_size / 1024:7.1f} KB  {len(data['checks'])} checks passed")
    return out


if __name__ == "__main__":
    if "--download" in sys.argv:
        download()
    build([a for a in sys.argv[1:] if not a.startswith("--")] or None)
