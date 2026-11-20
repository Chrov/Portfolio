from fastapi.testclient import TestClient

from analytics.api.main import app

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200 and {"revenue", "talentrisk"} <= set(r.json()["datasets"])


def test_kpis_and_previous_period():
    r = client.get("/api/revenue/kpis", params={"region": "ALL", "start": "2018-01", "end": "2018-06"})
    body = r.json()
    assert r.status_code == 200 and body["orders"] > 0 and "changeVsPrevious" in body
    assert body["avgTicket"] == round(body["revenue"] / body["orders"], 2)


def test_kpis_validation_errors():
    assert client.get("/api/revenue/kpis", params={"region": "XX"}).status_code == 422
    assert client.get("/api/revenue/kpis", params={"start": "2019-01"}).status_code == 422
    assert client.get("/api/revenue/kpis", params={"start": "2018-05", "end": "2018-01"}).status_code == 422


def test_forecast_endpoint():
    assert client.get("/api/revenue/forecast").json()["selected"]


def test_score_endpoint():
    import pandas as pd
    from analytics.common.data_sources import RAW
    rec = pd.read_csv(RAW / "ibm_hr" / "WA_Fn-UseC_-HR-Employee-Attrition.csv").iloc[3].to_dict()
    r = client.post("/api/talentrisk/score", json={"features": rec})
    assert r.status_code == 200 and 0 < r.json()["probability"] < 1
    assert client.post("/api/talentrisk/score", json={"features": {"OverTime": "Yes"}}).status_code == 422


def test_summary_unknown_department():
    assert client.get("/api/talentrisk/summary", params={"department": "Nope"}).status_code == 404
