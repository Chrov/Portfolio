import json

import numpy as np
import pandas as pd
import pytest

from analytics.common.data_sources import WEB_DATA
from analytics.revenue import forecast
from analytics.revenue.warehouse import build_warehouse


@pytest.fixture(scope="module")
def rev():
    return json.loads((WEB_DATA / "revenue.json").read_text())


@pytest.fixture(scope="module")
def con(tmp_path_factory):
    con, checks = build_warehouse(tmp_path_factory.mktemp("wh") / "w.duckdb")
    assert all(c["passed"] for c in checks)
    return con


def test_ingestion_row_counts(con):
    assert con.execute("SELECT COUNT(*) FROM raw_orders").fetchone()[0] == 99441
    assert con.execute("SELECT COUNT(*) FROM raw_order_items").fetchone()[0] == 112650


def test_naive_join_would_duplicate_revenue(con):
    """Documents the trap the mart avoids: joining items x payments x reviews inflates revenue."""
    naive = con.execute("""
        SELECT SUM(CAST(i.price AS DOUBLE)) FROM raw_order_items i
        JOIN raw_payments p USING (order_id) JOIN raw_reviews r USING (order_id)""").fetchone()[0]
    correct = con.execute("SELECT SUM(CAST(product_revenue AS DOUBLE)) FROM fct_orders").fetchone()[0]
    assert naive > correct * 1.03


def test_daily_totals_match_meta(rev):
    assert sum(rev["daily"]["ALL"]["revenue"]) == pytest.approx(rev["meta"]["windowRevenue"], abs=1)
    assert sum(rev["daily"]["ALL"]["orders"]) == rev["meta"]["windowOrders"]


def test_regions_add_up_to_total(rev):
    for key in ("revenue", "orders"):
        regional = sum(sum(rev["daily"][r["id"]][key]) for r in rev["regions"][1:])
        assert regional == pytest.approx(sum(rev["daily"]["ALL"][key]), abs=1)


def test_category_cube_matches_daily(rev):
    cube = np.array(rev["catMonthly"]["ALL"]["revenue"]).sum()
    assert cube == pytest.approx(rev["meta"]["windowRevenue"], abs=5)


def test_distinct_customers_are_not_summed(rev):
    m = rev["customersByRange"]["ALL"]
    n = len(m)
    assert m[0][n - 1] == rev["meta"]["windowCustomers"]
    assert m[0][n - 1] <= sum(m[k][k] for k in range(n))


def test_forecast_has_no_leakage():
    """Changing values after the origin must not change the forecast."""
    rng = np.random.default_rng(0)
    days = pd.date_range("2017-01-02", periods=7 * 70)
    daily = pd.Series(1000 + rng.normal(0, 50, len(days)), index=days)
    w = forecast.weekly(daily)
    y, weeks = w.values.copy(), list(w.index)
    origin = 55
    for kind in forecast.MODEL_LABELS:
        before = forecast.predict(kind, y, weeks, origin)
        y2 = y.copy()
        y2[origin + 1:] *= 10
        after = forecast.predict(kind, y2, weeks, origin)
        np.testing.assert_allclose(before, after, err_msg=kind)


def test_forecast_selection_and_interval(rev):
    f = rev["forecast"]
    assert f["metrics"][0]["model"] == f["selected"]
    assert all(lo <= p <= hi for lo, p, hi in zip(f["future"]["lo"], f["future"]["pred"], f["future"]["hi"]))
    assert 0 < f["interval"]["holdoutCoverage"] <= 1
