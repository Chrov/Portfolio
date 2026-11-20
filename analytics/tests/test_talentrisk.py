import json

import numpy as np
import pandas as pd
import pytest

from analytics.common.data_sources import RAW, WEB_DATA
from analytics.talentrisk import build
from analytics.talentrisk.scoring import score, score_rows


@pytest.fixture(scope="module")
def tr():
    return json.loads((WEB_DATA / "talentrisk.json").read_text())


@pytest.fixture(scope="module")
def df():
    return pd.read_csv(RAW / "ibm_hr" / "WA_Fn-UseC_-HR-Employee-Attrition.csv")


def test_dataset_flagged_synthetic(tr):
    assert tr["meta"]["synthetic"] is True
    assert tr["meta"]["quality"]["rows"] == 1470


def test_no_target_or_sensitive_leakage_in_features():
    feats = set(build.FEATURES)
    assert build.TARGET not in feats
    assert not feats & set(build.SENSITIVE)
    assert not feats & set(build.DROP_ID + build.DROP_CONSTANT)


def test_preprocessing_lives_inside_pipelines():
    """Scaler/encoder are refit within each CV fold (no fit on the full data first)."""
    for name, est in build.models().items():
        pipe = est.estimator if hasattr(est, "estimator") else est
        assert pipe.steps[0][0] == "pre", name


def test_selected_model_chosen_by_cv_not_test(tr):
    m = tr["model"]
    best = max(m["cv"].values(), key=lambda r: r["prAuc"])
    assert m["cv"][m["selected"]]["prAuc"] >= best["prAuc"] - best["prAucSe"]


def test_calibration_improves_brier(tr):
    t = tr["model"]["test"][tr["model"]["selected"]]
    assert t["brier"] < t["brierUncalibrated"]


def test_explorer_contributions_sum_to_logit(tr, df):
    model = tr["explorer"]
    rec = df.iloc[0].to_dict()
    s = score(model, rec)
    assert sum(s["contributions"].values()) + s["baseLogOdds"] == pytest.approx(s["logOdds"])
    assert s["probability"] == pytest.approx(1 / (1 + np.exp(-s["logOdds"])))


def test_explorer_rejects_unknown_level(tr, df):
    rec = df.iloc[0].to_dict()
    rec["OverTime"] = "Maybe"
    with pytest.raises(ValueError):
        score(tr["explorer"], rec)


def test_oof_probabilities_in_range(tr):
    p = np.array(tr["explorer"]["oofProbability"])
    assert p.min() > 0 and p.max() < 1 and len(p) == 1470
