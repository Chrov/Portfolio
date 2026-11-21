"""Interactive case studies: every published figure must reconcile with its source project."""
import json

import pytest

from analytics.cases import build as cases
from analytics.common.data_sources import WEB_DATA

NAMES = list(cases.BUILDERS)


@pytest.fixture(scope="module", params=NAMES)
def built(request):
    cases.verify()
    return request.param, cases.BUILDERS[request.param]()


def test_all_reconciliation_checks_pass(built):
    name, data = built
    assert data["checks"], name
    assert all(c["passed"] for c in data["checks"]), name


def test_published_json_matches_a_fresh_build(built):
    name, data = built
    published = json.loads((WEB_DATA / f"case-{name}.json").read_text())
    fresh = json.loads(json.dumps(data, ensure_ascii=False))
    for d in (published, fresh):
        d["meta"].pop("generatedAt", None)
    assert published == fresh, f"case-{name}.json is stale: run python -m analytics.cases.build"


def test_headline_figures():
    bank = cases.bank()["metrics"]
    assert round(bank["holdout_auc"], 3) == 0.458 and round(bank["train_rate"], 3) == 0.048
    market = cases.market()["totals"]
    assert round(market["waste"]) == 8992168 and market["rev"] == 412926945
    air = cases.airline()["totals"]
    assert air["scheduled"] == 577262 and air["disrupted"] == 166726
    feria = cases.feria()["holdout"]["wmape"]["ALL"]
    assert feria["weekday_mean_8w"] < feria["seasonal_naive"]


def test_fx_reference_rates_are_documented():
    fx = json.loads((WEB_DATA / "fx.json").read_text())
    assert set(fx["periods"]) == {"olist", "market", "copper"}
    assert fx["periods"]["olist"]["native"] == "BRL" and 0.2 < fx["periods"]["olist"]["usdPerBrl"] < 0.4
    for p in fx["periods"].values():
        assert 550 < p["clpPerUsd"] < 1100 and p["nClp"] > 200
