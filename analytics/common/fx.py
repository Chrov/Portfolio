"""Reference exchange rates for the currency selector (USD / CLP) in the web apps.

Run from the repository root:  python -m analytics.common.fx

Sources (free, no API key):
  * USD -> CLP: Banco Central de Chile "dólar observado", via the public
    mindicador.cl API (https://mindicador.cl/api/dolar/<year>).
  * BRL -> USD: European Central Bank reference rates, via the Frankfurter API
    (https://api.frankfurter.app).

Rule: each app converts with the AVERAGE rate of the period its amounts belong
to, so a converted figure reads as "what this was worth at the time". Percent
changes and rankings never change with the currency. The raw API responses are
cached under analytics/data/raw/fx/ so a rebuild does not need the network.
"""
import json
import urllib.request
from datetime import date, datetime, timezone
from statistics import mean

from analytics.common.data_sources import RAW, WEB_DATA

CACHE = RAW / "fx"
UA = {"User-Agent": "portfolio-analytics-build/1.0"}

# period -> which amounts use it
PERIODS = {
    "olist": {"from": "2017-01-01", "to": "2018-07-31", "native": "BRL",
              "label": {"es": "promedio ene 2017 – jul 2018", "en": "average Jan 2017 – Jul 2018"}},
    "market": {"from": "2023-07-01", "to": "2025-06-30", "native": "CLP",
               "label": {"es": "promedio jul 2023 – jun 2025", "en": "average Jul 2023 – Jun 2025"}},
    "copper": {"from": "2024-01-01", "to": "2024-12-31", "native": "USD",
               "label": {"es": "promedio 2024 (último año de la serie)", "en": "2024 average (latest year in the series)"}},
}


def _get(url, cache_name):
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / cache_name
    if not path.exists():
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=30) as r:
            path.write_bytes(r.read())
    return json.loads(path.read_text(encoding="utf-8"))


def clp_per_usd(start, end):
    """Mean of daily BCCh observed dollar between two ISO dates (inclusive)."""
    vals = []
    for year in range(int(start[:4]), int(end[:4]) + 1):
        d = _get(f"https://mindicador.cl/api/dolar/{year}", f"dolar_{year}.json")
        for row in d["serie"]:
            day = row["fecha"][:10]
            if start <= day <= end:
                vals.append(float(row["valor"]))
    if len(vals) < 100:
        raise RuntimeError(f"Too few CLP observations for {start}..{end}: {len(vals)}")
    return mean(vals), len(vals)


def usd_per_brl(start, end):
    d = _get(f"https://api.frankfurter.app/{start}..{end}?from=BRL&to=USD", f"brl_usd_{start}_{end}.json")
    vals = [v["USD"] for k, v in d["rates"].items() if start <= k <= end]
    if len(vals) < 100:
        raise RuntimeError(f"Too few BRL observations: {len(vals)}")
    return mean(vals), len(vals)


def build():
    out = {"generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
           "sources": {
               "CLP": {"es": "Banco Central de Chile, dólar observado (vía mindicador.cl)",
                       "en": "Central Bank of Chile, observed dollar (via mindicador.cl)"},
               "BRL": {"es": "Banco Central Europeo, tipos de referencia (vía Frankfurter)",
                       "en": "European Central Bank reference rates (via Frankfurter)"}},
           "periods": {}}
    for key, p in PERIODS.items():
        clp, n_clp = clp_per_usd(p["from"], p["to"])
        entry = {"from": p["from"], "to": p["to"], "native": p["native"], "label": p["label"],
                 "clpPerUsd": round(clp, 2), "nClp": n_clp}
        if p["native"] == "BRL":
            u, n = usd_per_brl(p["from"], p["to"])
            entry.update(usdPerBrl=round(u, 5), nBrl=n)
        out["periods"][key] = entry
    WEB_DATA.mkdir(parents=True, exist_ok=True)
    (WEB_DATA / "fx.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    return out


if __name__ == "__main__":
    print(json.dumps(build(), ensure_ascii=False, indent=1))
