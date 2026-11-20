# Analytics platform — Revenue Intelligence & TalentRisk AI

Python pipelines, SQL models, a FastAPI service and tests behind the two web
applications published at <https://chrov.github.io/Portfolio/apps/>.

| App | Dataset | Nature of the data |
|---|---|---|
| Revenue Intelligence | [Olist Brazilian E-Commerce](https://www.kaggle.com/datasets/olistbr/brazilian-ecommerce) (Kaggle v2, CC BY-NC-SA 4.0) | Real, anonymised public data |
| TalentRisk AI | [IBM HR Analytics Attrition](https://www.kaggle.com/datasets/pavansubhasht/ibm-hr-analytics-attrition-dataset) (Kaggle v1) | **Fictional** data created by IBM data scientists |

## Architecture

```
Kaggle ──kagglehub──▶ data/raw (SHA-256 verified)
   │
   ├─ Revenue:  DuckDB raw_* ─▶ sql/01_staging ─▶ sql/02_marts (fct_orders, fct_order_items)
   │            ─▶ sql/03_checks (8 assertions) ─▶ build.py (KPIs, RFM, anomalies) + forecast.py
   │
   ├─ TalentRisk: pandas validation ─▶ sklearn Pipelines (LR / RF / XGBoost) ─▶ Platt calibration
   │            ─▶ SHAP + fairness audit ─▶ exported linear model (scoring.py)
   │
   └─▶ web/public/data/{revenue,talentrisk}.json ─▶ Next.js static apps (web/) ─▶ GitHub Pages (apps/)
                                                └▶ FastAPI (api/main.py) for server deployment
```

Why DuckDB rather than a PostgreSQL server: the published site is static and
free to host; DuckDB runs the same standard SQL in-process with no
infrastructure. The staging/mart SQL uses only CTEs, window functions, CAST,
COALESCE and date subtraction, so it ports to PostgreSQL by loading the
`raw_*` tables there (not tested against a PostgreSQL server).

## Run it

```bash
python3.11 -m venv analytics/.venv && source analytics/.venv/bin/activate   # Python 3.9–3.12 (macOS: /usr/bin/python3 works)
pip install -r analytics/requirements.txt
python -m analytics.common.data_sources --download   # Kaggle -> analytics/data/raw, verified
python -m analytics.revenue.build                    # -> web/public/data/revenue.json
python -m analytics.talentrisk.build                 # -> web/public/data/talentrisk.json
python -m pytest analytics/tests -q                  # 22 tests
uvicorn analytics.api.main:app --reload              # http://127.0.0.1:8000/docs
```

* Kaggle: `kagglehub` downloaded both public datasets without credentials. If
  Kaggle requires them in your environment, set `KAGGLE_USERNAME` and
  `KAGGLE_KEY` (Kaggle → Settings → API). The pipeline never substitutes data:
  a missing file or checksum mismatch stops the build.
* macOS + XGBoost: XGBoost needs OpenMP (`brew install libomp`), or point
  `DYLD_LIBRARY_PATH` at scikit-learn's bundled `sklearn/.dylibs`.

Web apps (Node 20+): `cd web && npm ci && npm run dev` then open
<http://localhost:3000/Portfolio/apps/>. `npm run export:site` builds the static
export and copies it to `../apps`, which GitHub Pages serves from `main`.
`npm test` runs the TypeScript parity tests against the generated JSON.

## Key definitions

**Revenue Intelligence**
* *Revenue* = Σ `order_items.price` of valid orders (status not canceled/unavailable), by purchase date. Freight excluded; not profit (no costs in the data).
* *Window*: 2017-01-01 → 2018-07-31. 2016 has very few orders and collection stops around 2018-08-22.
* *Unique customers* = distinct `customer_unique_id`; precomputed for every month range because distinct counts are not additive.
* *Historical value* = sum of a customer's purchases in the window — **not** a predictive CLV.
* *Forecast*: weekly, 8-week horizon, direct Ridge on log revenue vs naive / 4-week moving average / drift / gradient boosting; rolling-origin backtest (15 origins). 80% interval from empirical relative errors; out-of-sample coverage is reported (it was below nominal).

**TalentRisk AI**
* *Attrition share* = share of rows with `Attrition = Yes`. The dataset has no dates, so this is **not** an annual turnover rate.
* Model inputs exclude `Gender`, `Age`, `MaritalStatus` (used only for the fairness audit), identifiers, constant columns and undocumented rate fields.
* Stratified 80/20 split; model comparison by repeated stratified 5×3 CV on the training split; one-SE rule on PR-AUC; class weights; Platt calibration on out-of-fold scores; threshold by max out-of-fold F1. The test set is used once.
* SHAP is exact for the deployed logistic model (`φⱼ = a·wⱼ·(xⱼ − E[xⱼ])` in calibrated log-odds); `scoring.py` and the browser reproduce scikit-learn's probabilities to 1e-9.
* The retention simulator reports changes in **model score**, never causal effects.

## Tests (`analytics/tests`, `web/src/lib/revenue.test.ts`)

Ingestion row counts · SQL fan-out (a naive items×payments×reviews join inflates revenue; the mart does not) · regional and category totals · non-additivity of distinct customers · forecast leakage (perturbing the future does not change predictions) · CV-only model selection · calibration improves Brier · explorer contributions sum to the logit · API validation errors (422/404) · browser KPI, bucketing, price-volume and anomaly parity with Python.

## Limitations

See section 09 of each app. In short: no costs (Olist), 19 months of history,
fictional and undated HR data, associations rather than causal effects, and the
Dockerfile was not executed in the author's environment.
