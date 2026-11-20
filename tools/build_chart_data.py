"""Build charts-data.js for the interactive homepage charts.

Every value comes from evidence files already published in this repository:
  grocery  case-studies/grocery-replenishment-policy/complete_summary.json
           (copied from Chrov/grocery-replenishment-policy outputs/complete_summary.json)
  bank     case-studies/bank-campaign/capacity_curve.csv + metrics.json
  market   case-studies/market-stall-analytics/category_economics.csv
           (copied from Chrov/market-stall-analytics analysis_export/reviewed_category_economics.csv)
  airline  Routes table embedded in case-studies/airline-reliability/PowerBI.zip
  feria    case-studies/feria-demand/fold_metrics.csv + product_priority.csv
  copper   case-studies/copper-observatory/annual.csv

Run from the repository root:  python3 tools/build_chart_data.py
Standard library only.
"""
import base64
import csv
import io
import json
import re
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CS = ROOT / "case-studies"


def rows(path):
    with open(path, newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def r(x, n=4):
    return round(float(x), n)


def grocery():
    summary = json.loads((CS / "grocery-replenishment-policy/complete_summary.json").read_text())
    order = ["seasonal_naive", "weekday_mean_8w", "lightgbm_recursive"]
    by_model = {h["model"]: h for h in summary["holdout"]}
    return {
        "models": order,
        "beverages": [r(by_model[m]["beverages_store1_wmape"]) for m in order],
        "skuMean": [r(by_model[m]["macro_sku_wmape"]) for m in order],
        "selected": summary["selected_model"],
    }


def bank():
    curve = rows(CS / "bank-campaign/capacity_curve.csv")
    metrics = json.loads((CS / "bank-campaign/metrics.json").read_text())
    positives = metrics["holdout_records"] * metrics["holdout_rate"]
    return {
        "capacity": [r(c["contact_fraction"], 2) for c in curve],
        "model": [r(c["recall"]) for c in curve],
        # Random ranking captures the same share of subscribers as of contacts.
        "random": [r(float(c["random_expected_subscriptions"]) / positives) for c in curve],
        "contacts": [int(c["contacts"]) for c in curve],
        "captured": [int(c["observed_subscriptions"]) for c in curve],
        "cohorts": ["train", "validation", "holdout"],
        "cohortRows": [metrics["train_records"], metrics["validation_records"], metrics["holdout_records"]],
        "baseRate": [r(metrics["train_rate"]), r(metrics["validation_rate"]), r(metrics["holdout_rate"])],
    }


CATEGORY_ES = {
    "Olives": "Aceitunas", "Nuts": "Frutos secos", "Grains": "Granos", "Peanuts": "Maní",
    "Trail Mix": "Mix de frutos", "Dried Fruit": "Fruta deshidratada", "Candy": "Dulces",
    "Chili": "Ají", "Seeds": "Semillas", "Pickles": "Encurtidos", "Raisins": "Pasas",
    "Honey": "Miel", "Seasonings": "Condimentos", "Packaging": "Envases",
}


def market():
    out = []
    for c in rows(CS / "market-stall-analytics/category_economics.csv"):
        out.append({
            "en": c["Category"],
            "es": CATEGORY_ES.get(c["Category"], c["Category"]),
            "waste": round(float(c["waste_cost_clp"])),
            "cost": round(float(c["purchase_cost_clp"])),
            "rate": r(c["waste_cost_rate"]),
        })
    return out


def airline():
    with zipfile.ZipFile(CS / "airline-reliability/PowerBI.zip") as z:
        tmdl = z.read("Airline.SemanticModel/definition/tables/Routes.tmdl").decode()
    blob = re.search(r'Binary\.FromText\("([^"]+)"', tmdl).group(1)
    table = list(csv.DictReader(io.StringIO(base64.b64decode(blob).decode())))
    return [{
        "route": t["route"].replace(" - ", " → "),
        "scheduled": int(float(t["scheduled"])),
        "disrupted": int(float(t["disrupted"])),
        "rate": r(t["disruption_rate"]),
        "lo": r(t["wilson_low"]),
        "hi": r(t["wilson_high"]),
    } for t in table]


def feria():
    folds = rows(CS / "feria-demand/fold_metrics.csv")
    origins = sorted({f["origin"] for f in folds})
    get = {(f["origin"], f["model"]): r(f["wmape"]) for f in folds}
    priority = rows(CS / "feria-demand/product_priority.csv")
    return {
        "origins": origins,
        "naive": [get[(o, "seasonal_naive")] for o in origins],
        "weekday": [get[(o, "weekday_mean_8w")] for o in origins],
        "abcShare": [r(p["cumulative_share"]) for p in priority],
        "abcClass": "".join(p["volume_class"] for p in priority),
        "abcUnits": [int(p["demand_units"]) for p in priority],
        "abcIds": [p["product_id"] for p in priority],
    }


def copper():
    annual = rows(CS / "copper-observatory/annual.csv")
    return {
        "years": [int(a["year"]) for a in annual],
        "production": [r(a["production_kt_index"], 1) for a in annual],
        "price": [r(a["price_us_cent_lb_index"], 1) for a in annual],
        "exports": [r(a["exports_usd_m_index"], 1) for a in annual],
        "productionKt": [r(a["production_kt"], 1) for a in annual],
        "priceCents": [r(a["price_us_cent_lb"], 1) for a in annual],
        "exportsUsdM": [r(a["exports_usd_m"], 1) for a in annual],
    }


def main():
    data = {
        "grocery": grocery(), "bank": bank(), "market": market(),
        "airline": airline(), "feria": feria(), "copper": copper(),
    }
    js = "/* Generated by tools/build_chart_data.py — do not edit by hand. */\nwindow.CHART_DATA = "
    js += json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n"
    (ROOT / "charts-data.js").write_text(js, encoding="utf-8")
    print(f"charts-data.js: {len(js):,} bytes")


if __name__ == "__main__":
    main()
