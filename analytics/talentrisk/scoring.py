"""Scoring with the exported explorer model (same maths as web/src/lib/talentrisk-model.ts).

Contributions are exact for a linear model: in calibrated log-odds space,
phi_j = a * w_j * (x_j - E[x_j]), and sum(phi) + base = logit(p).
"""
import math

import numpy as np


def _parts(model, rec):
    a = model["platt"]["a"]
    contrib, logit = {}, model["intercept"]
    base = model["intercept"]
    for n in model["numeric"]:
        z = (float(rec[n["f"]]) - n["mean"]) / n["std"]
        logit += n["w"] * z
        contrib[n["f"]] = a * n["w"] * z                     # E[z] = 0
    for c in model["categorical"]:
        if rec[c["f"]] not in c["levels"]:
            raise ValueError(f"Unknown level {rec[c['f']]!r} for {c['f']}; expected one of {c['levels']}")
        k = c["levels"].index(rec[c["f"]])
        logit += c["w"][k]
        mean_w = sum(w * s for w, s in zip(c["w"], c["share"]))
        base += mean_w
        contrib[c["f"]] = a * (c["w"][k] - mean_w)
    cal = a * logit + model["platt"]["b"]
    base_cal = a * base + model["platt"]["b"]
    return cal, base_cal, contrib


def score(model, rec):
    cal, base_cal, contrib = _parts(model, rec)
    return {"probability": 1 / (1 + math.exp(-cal)), "logOdds": cal,
            "baseLogOdds": base_cal, "contributions": contrib}


def score_rows(model, df):
    return np.array([score(model, r)["probability"] for r in df.to_dict("records")])
