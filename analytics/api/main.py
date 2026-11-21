"""FastAPI service exposing the analytical results and the TalentRisk scorer.

The public portfolio is static (GitHub Pages) and reads the same JSON files
directly; this API is the local/server deployment path.

    uvicorn analytics.api.main:app --reload
"""
import json
import re
from functools import lru_cache
from typing import Dict, Optional, Union

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from analytics.common.data_sources import WEB_DATA
from analytics.talentrisk.scoring import score

app = FastAPI(title="Portfolio analytics API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET", "POST"])


@lru_cache(maxsize=2)
def load(name):
    path = WEB_DATA / f"{name}.json"
    if not path.exists():
        raise HTTPException(503, f"{path.name} not built. Run: python -m analytics.{name}.build")
    return json.loads(path.read_text(encoding="utf-8"))


@app.get("/health")
def health():
    return {"status": "ok", "datasets": sorted(p.stem for p in WEB_DATA.glob("*.json"))}


def _month_index(rev, label, field):
    months = rev["calendar"]["months"]
    if label not in months:
        raise HTTPException(422, f"{field} must be one of {months[0]}..{months[-1]}")
    return months.index(label)


def revenue_kpis(rev, region, start, end):
    """Same definitions as the web dashboard."""
    import datetime as dt

    if region not in rev["daily"]:
        raise HTTPException(422, f"region must be one of {list(rev['daily'])}")
    i, j = _month_index(rev, start, "start"), _month_index(rev, end, "end")
    if j < i:
        raise HTTPException(422, "end must be >= start")
    d0 = dt.date.fromisoformat(rev["calendar"]["start"])

    def sl(m0, m1, key):
        months = rev["calendar"]["months"]
        a = (dt.date.fromisoformat(months[m0] + "-01") - d0).days
        y, m = map(int, months[m1].split("-"))
        nxt = dt.date(y + (m == 12), m % 12 + 1, 1)
        b = (nxt - d0).days
        return sum(rev["daily"][region][key][a:b])

    revenue, orders = sl(i, j, "revenue"), sl(i, j, "orders")
    out = {"region": region, "start": start, "end": end, "revenue": round(revenue, 2), "orders": orders,
           "avgTicket": round(revenue / orders, 2) if orders else None,
           "customers": rev["customersByRange"][region][i][j]}
    n = j - i + 1
    if i - n >= 0:
        prev = sl(i - n, i - 1, "revenue")
        out["previousRevenue"] = round(prev, 2)
        out["changeVsPrevious"] = revenue / prev - 1 if prev else None
    return out


@app.get("/api/revenue/kpis")
def kpis(region: str = "ALL", start: str = "2018-01", end: str = "2018-07"):
    return revenue_kpis(load("revenue"), region, start, end)


@app.get("/api/revenue/forecast")
def revenue_forecast():
    f = load("revenue")["forecast"]
    return {k: f[k] for k in ("selected", "bestBaseline", "metrics", "interval", "future")}


MONEY_TOKEN = re.compile(r"⟦m:(-?[\d.]+)⟧")


def brl_text(s: str, lang: str) -> str:
    """Insight texts carry ⟦m:value⟧ tokens (the web app converts them); the API returns BRL."""
    def fmt(m):
        v = float(m.group(1))
        txt = f"{v / 1e6:,.2f} M" if abs(v) >= 1e6 else f"{v:,.0f}"
        return "R$ " + (txt.translate(str.maketrans(",.", ".,")) if lang == "es" else txt)
    return MONEY_TOKEN.sub(fmt, s)


@app.get("/api/revenue/insights")
def revenue_insights(lang: str = Query("es", pattern="^(es|en)$")):
    return [{k: (brl_text(v[lang], lang) if isinstance(v, dict) and lang in v else v) for k, v in i.items()}
            for i in load("revenue")["insights"]]


@app.get("/api/talentrisk/summary")
def talent_summary(department: Optional[str] = None):
    rows = load("talentrisk")["rows"]
    idx = [k for k, d in enumerate(rows["Department"]) if department in (None, d)]
    if not idx:
        raise HTTPException(404, f"No employees for department={department!r}")
    left = sum(rows["Attrition"][k] for k in idx)
    return {"employees": len(idx), "attritionYes": left, "attritionShare": left / len(idx),
            "note": "Fictional IBM dataset; share of Attrition = Yes, not an annual turnover rate."}


class Profile(BaseModel):
    features: Dict[str, Union[float, int, str]]


@app.post("/api/talentrisk/score")
def talent_score(profile: Profile):
    model = load("talentrisk")["explorer"]
    required = [n["f"] for n in model["numeric"]] + [c["f"] for c in model["categorical"]]
    missing = [f for f in required if f not in profile.features]
    if missing:
        raise HTTPException(422, f"Missing features: {missing}")
    try:
        result = score(model, profile.features)
    except (ValueError, TypeError) as exc:
        raise HTTPException(422, str(exc))
    result["disclaimer"] = ("Educational demo trained on fictional data. Not for decisions about real people.")
    return result
