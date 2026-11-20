"""Revenue Intelligence: compute every metric the web app shows -> revenue.json.

Run from the repository root:  python -m analytics.revenue.build
All figures are measured on the Olist public dataset; nothing is hand-typed.
"""
import json
from datetime import datetime, timezone

import numpy as np
import pandas as pd

from analytics.common.data_sources import SOURCES, WEB_DATA
from analytics.revenue import forecast
from analytics.revenue.categories import label as cat_label
from analytics.revenue.warehouse import build_warehouse

START, END = "2017-01-01", "2018-07-31"
REF_DATE = pd.Timestamp("2018-08-01")          # recency reference for RFM
REGIONS = [
    ("ALL", "Brasil (todas)", "Brazil (all)"),
    ("SE", "Sudeste", "Southeast"),
    ("S", "Sur", "South"),
    ("NE", "Nordeste", "Northeast"),
    ("CO", "Centro-Oeste", "Center-West"),
    ("N", "Norte", "North"),
]
HIST_EDGES = [0, 25, 50, 75, 100, 150, 200, 300, 500, 1000]           # BRL, last bin open
VALUE_EDGES = [0, 50, 100, 200, 500, 1000, 2000, 5000]               # BRL, last bin open
DELAY_BUCKETS = [
    (-999, -15, {"es": "15+ días antes", "en": "15+ days early"}),
    (-14, -8, {"es": "8–14 días antes", "en": "8–14 days early"}),
    (-7, -1, {"es": "1–7 días antes", "en": "1–7 days early"}),
    (0, 0, {"es": "Día estimado", "en": "On the estimated day"}),
    (1, 7, {"es": "1–7 días tarde", "en": "1–7 days late"}),
    (8, 999, {"es": "8+ días tarde", "en": "8+ days late"}),
]
SEGMENTS = [
    ("repeat_active", {"es": "Recurrentes activos", "en": "Active repeat buyers"}),
    ("repeat_risk", {"es": "Recurrentes en riesgo", "en": "Repeat buyers at risk"}),
    ("new_high", {"es": "Nuevos de alto valor", "en": "New, high value"}),
    ("new", {"es": "Nuevos", "en": "New"}),
    ("lapsed_high", {"es": "Alto valor sin recompra", "en": "High value, no repeat"}),
    ("hibernating", {"es": "Hibernando", "en": "Hibernating"}),
]


def r2(x):
    return round(float(x), 2)


def subsets(df):
    yield "ALL", df
    for rid, *_ in REGIONS[1:]:
        yield rid, df[df.region == rid]


def daily_block(orders, days):
    g = orders.groupby("purchase_date").agg(revenue=("product_revenue", "sum"),
                                            orders=("order_id", "count"),
                                            items=("items", "sum"),
                                            freight=("freight", "sum")).reindex(days, fill_value=0)
    return {"revenue": [r2(v) for v in g.revenue], "orders": [int(v) for v in g.orders],
            "items": [int(v) for v in g["items"]], "freight": [r2(v) for v in g.freight]}


def customers_by_range(orders, n_months):
    sets = [set(orders.loc[orders.m == i, "customer_unique_id"]) for i in range(n_months)]
    mat = [[None] * n_months for _ in range(n_months)]
    for i in range(n_months):
        acc = set()
        for j in range(i, n_months):
            acc |= sets[j]
            mat[i][j] = len(acc)
    return mat


def rfm(orders):
    c = orders.groupby("customer_unique_id").agg(last=("purchased_at", "max"),
                                                 freq=("order_id", "nunique"),
                                                 value=("product_revenue", "sum"))
    c["recency"] = (REF_DATE - c["last"]).dt.days
    c["R"] = pd.qcut(c.recency.rank(method="first"), 5, labels=[5, 4, 3, 2, 1]).astype(int)
    c["M"] = pd.qcut(c.value.rank(method="first"), 5, labels=[1, 2, 3, 4, 5]).astype(int)
    rep = c.freq >= 2
    c["segment"] = np.select(
        [rep & (c.R >= 3), rep, (c.R >= 4) & (c.M >= 4), c.R >= 4, c.M >= 4],
        ["repeat_active", "repeat_risk", "new_high", "new", "lapsed_high"], "hibernating")
    total = c.value.sum()
    segs = []
    for sid, lab in SEGMENTS:
        s = c[c.segment == sid]
        segs.append({"id": sid, "label": lab, "customers": int(len(s)),
                     "revenue": r2(s.value.sum()), "share": float(s.value.sum() / total),
                     "avgValue": r2(s.value.mean()) if len(s) else 0,
                     "avgRecency": r2(s.recency.mean()) if len(s) else 0,
                     "avgOrders": r2(s.freq.mean()) if len(s) else 0})
    v = np.sort(c.value.values)[::-1]
    cum = np.cumsum(v) / v.sum()
    n = len(v)
    curve = [0.0] + [float(cum[max(int(np.ceil(n * p / 100)) - 1, 0)]) for p in range(1, 101)]
    hist = np.histogram(c.value, bins=VALUE_EDGES + [np.inf])[0]
    fd = c.freq.clip(upper=4).value_counts().reindex([1, 2, 3, 4], fill_value=0)
    return {
        "customers": int(n), "revenue": r2(total),
        "repeatRate": float(rep.mean()),
        "repeatRevenueShare": float(c.loc[rep, "value"].sum() / total),
        "freqDist": [int(x) for x in fd.values],
        "concentration": [round(x, 4) for x in curve],
        "top10Share": curve[10], "top1Share": curve[1],
        "valueHist": {"edges": VALUE_EDGES, "counts": [int(x) for x in hist]},
        "medianValue": r2(c.value.median()),
        "segments": segs,
    }


def price_box(items, top_n=10):
    top = items.groupby("category").price.sum().nlargest(top_n).index
    out = []
    for cat in top:
        p = items.loc[items.category == cat, "price"].astype(float)
        q1, med, q3 = np.percentile(p, [25, 50, 75])
        iqr = q3 - q1
        inside = p[(p >= q1 - 1.5 * iqr) & (p <= q3 + 1.5 * iqr)]
        out.append({"category": cat, "q1": r2(q1), "median": r2(med), "q3": r2(q3),
                    "lo": r2(inside.min()), "hi": r2(inside.max()), "n": int(len(p)),
                    "outliers": int(len(p) - len(inside)), "mean": r2(p.mean())})
    return out


def top_products(items, n=12):
    g = items.groupby(["product_id", "category"]).agg(revenue=("price", "sum"),
                                                      units=("price", "count"),
                                                      orders=("order_id", "nunique")).reset_index()
    g = g.nlargest(n, "revenue")
    return [{"id": r.product_id[:8], "category": r.category, "revenue": r2(r.revenue),
             "units": int(r.units), "orders": int(r.orders), "avgPrice": r2(r.revenue / r.units)}
            for r in g.itertuples()]


def delivery_block(orders, n_months):
    d = orders.dropna(subset=["delivery_delay_days", "review_score"]).copy()
    d["b"] = -1
    for k, (lo, hi, _) in enumerate(DELAY_BUCKETS):
        d.loc[(d.delivery_delay_days >= lo) & (d.delivery_delay_days <= hi), "b"] = k
    cnt = np.zeros((n_months, len(DELAY_BUCKETS)), int)
    ssum = np.zeros((n_months, len(DELAY_BUCKETS)))
    for (m, b), g in d.groupby(["m", "b"]):
        cnt[m, b] = len(g)
        ssum[m, b] = g.review_score.astype(float).sum()
    return {"count": cnt.tolist(), "reviewSum": ssum.round(0).astype(int).tolist()}


def anomalies(dates, values, window=28, z=3.5):
    """Robust z-score vs a centred rolling median / MAD (same rule as the web app)."""
    s = pd.Series(values, index=dates)
    med = s.rolling(window, center=True, min_periods=7).median()
    mad = (s - med).abs().rolling(window, center=True, min_periods=7).median()
    rz = 0.6745 * (s - med) / mad.replace(0, np.nan)
    flagged = rz[rz.abs() > z]
    return [{"date": d.strftime("%Y-%m-%d"), "value": r2(s[d]), "expected": r2(med[d]),
             "z": round(float(v), 1)} for d, v in flagged.items()]


def insights(data, fc):
    """Rule-based findings. Every number is read from computed data."""
    out = []
    d = data["daily"]["ALL"]
    days = pd.date_range(START, END)
    rev = pd.Series(d["revenue"], index=days)
    m = rev.groupby(rev.index.to_period("M")).sum()

    h1_17, h1_18 = m["2017-01":"2017-06"].sum(), m["2018-01":"2018-06"].sum()
    out.append({
        "id": "growth", "kind": "measured",
        "title": {"es": "El ingreso creció con fuerza entre 2017 y 2018, pero se estabilizó",
                  "en": "Revenue grew strongly from 2017 to 2018, then levelled off"},
        "evidence": {"es": f"Ene–jun 2018 sumó R$ {h1_18/1e6:.2f} M frente a R$ {h1_17/1e6:.2f} M en ene–jun 2017 ({h1_18/h1_17-1:+.0%}). Desde ene 2018 el ingreso mensual se mantiene entre R$ {m['2018-01':].min()/1e6:.2f} M y R$ {m['2018-01':].max()/1e6:.2f} M.",
                     "en": f"Jan–Jun 2018 totalled R$ {h1_18/1e6:.2f}M vs R$ {h1_17/1e6:.2f}M in Jan–Jun 2017 ({h1_18/h1_17-1:+.0%}). Since Jan 2018 monthly revenue stays between R$ {m['2018-01':].min()/1e6:.2f}M and R$ {m['2018-01':].max()/1e6:.2f}M."},
        "why": {"es": "Una meseta tras el crecimiento cambia la conversación: de captar volumen a sostenerlo.",
                "en": "A plateau after growth shifts the question from acquiring volume to sustaining it."},
        "action": {"es": "Investigar si la meseta viene de menos pedidos o de un ticket menor (ver descomposición precio-volumen).",
                   "en": "Check whether the plateau comes from fewer orders or a lower ticket (see price-volume decomposition)."},
        "validate": {"es": "Confirmar con datos de tráfico y conversión, que este dataset no incluye.",
                     "en": "Confirm with traffic and conversion data, which this dataset does not include."},
    })

    bf = rev.idxmax()
    med28 = rev[bf - pd.Timedelta(days=14): bf + pd.Timedelta(days=14)].median()
    out.append({
        "id": "black_friday", "kind": "measured",
        "title": {"es": "Black Friday 2017 es el mayor pico del período", "en": "Black Friday 2017 is the largest spike in the period"},
        "evidence": {"es": f"El {bf:%d-%m-%Y} se facturaron R$ {rev[bf]:,.0f}, {rev[bf]/med28:.1f} veces la mediana de los 28 días alrededor.",
                     "en": f"On {bf:%Y-%m-%d} revenue reached R$ {rev[bf]:,.0f}, {rev[bf]/med28:.1f}× the median of the surrounding 28 days."},
        "why": {"es": "Un solo día concentra demanda equivalente a varios días normales; afecta inventario y logística.",
                "en": "One day concentrates the demand of several normal days, which strains inventory and logistics."},
        "action": {"es": "Planificar stock y capacidad de despacho para el evento con semanas de anticipación.",
                   "en": "Plan stock and dispatch capacity for the event weeks in advance."},
        "validate": {"es": "Solo hay un Black Friday en la ventana; no se puede estimar su tamaño típico.",
                     "en": "Only one Black Friday is in the window, so its typical size cannot be estimated."},
    })

    cats = data["categories"]
    tot = sum(c["revenue"] for c in cats)
    top5 = sum(c["revenue"] for c in cats[:5]) / tot
    out.append({
        "id": "category_concentration", "kind": "measured",
        "title": {"es": f"Cinco de {len(cats)} categorías generan el {top5:.0%} del ingreso",
                  "en": f"Five of {len(cats)} categories generate {top5:.0%} of revenue"},
        "evidence": {"es": f"Las 5 principales de {len(cats)} categorías suman {top5:.1%} del ingreso; lidera {cats[0]['es']} con {cats[0]['revenue']/tot:.1%}.",
                     "en": f"The top 5 of {len(cats)} categories account for {top5:.1%} of revenue; {cats[0]['en']} leads with {cats[0]['revenue']/tot:.1%}."},
        "why": {"es": "La concentración define dónde una caída tendría más impacto.",
                "en": "Concentration shows where a decline would hurt most."},
        "action": {"es": "Priorizar el seguimiento semanal de esas categorías y de su surtido de vendedores.",
                   "en": "Track those categories weekly, together with their seller assortment."},
        "validate": {"es": "Sin costos no se sabe si son también las más rentables.",
                     "en": "Without costs we cannot tell whether they are also the most profitable."},
    })

    cu = data["customers"]["ALL"]
    out.append({
        "id": "repeat", "kind": "measured",
        "title": {"es": "Casi todos los clientes compran una sola vez", "en": "Almost every customer buys only once"},
        "evidence": {"es": f"Solo {cu['repeatRate']:.1%} de {cu['customers']:,} clientes hizo 2 o más pedidos en la ventana; aportan {cu['repeatRevenueShare']:.1%} del ingreso.",
                     "en": f"Only {cu['repeatRate']:.1%} of {cu['customers']:,} customers placed 2+ orders in the window; they bring {cu['repeatRevenueShare']:.1%} of revenue."},
        "why": {"es": "El crecimiento depende casi por completo de captar clientes nuevos.",
                "en": "Growth depends almost entirely on acquiring new customers."},
        "action": {"es": "Evaluar un piloto de recompra (p. ej. post-entrega) con grupo de control.",
                   "en": "Evaluate a repurchase pilot (e.g. post-delivery) with a control group."},
        "validate": {"es": "Olist es un marketplace: el cliente puede volver a la tienda del vendedor fuera de Olist.",
                     "en": "Olist is a marketplace: customers may return to the seller outside Olist."},
    })

    reg = {rid: sum(data["daily"][rid]["revenue"]) for rid, *_ in REGIONS[1:]}
    se = reg["SE"] / sum(reg.values())
    out.append({
        "id": "region", "kind": "measured",
        "title": {"es": "El Sudeste concentra la mayor parte del ingreso", "en": "The Southeast concentrates most revenue"},
        "evidence": {"es": f"Sudeste aporta {se:.1%} del ingreso del período; São Paulo es el mayor estado.",
                     "en": f"The Southeast brings {se:.1%} of period revenue; São Paulo is the largest state."},
        "why": {"es": "La exposición geográfica afecta costos de envío y plazos.",
                "en": "Geographic exposure drives shipping cost and delivery times."},
        "action": {"es": "Comparar ticket y experiencia de entrega por región antes de invertir en expansión.",
                   "en": "Compare ticket and delivery experience by region before investing in expansion."},
        "validate": {"es": "Refleja la población y la base de vendedores, no necesariamente potencial.",
                     "en": "Reflects population and seller base, not necessarily potential."},
    })

    dl = data["delivery"]["ALL"]
    cnt = np.array(dl["count"]).sum(0)
    ssum = np.array(dl["reviewSum"]).sum(0)
    avg = ssum / np.maximum(cnt, 1)
    out.append({
        "id": "delivery", "kind": "measured",
        "title": {"es": "Los atrasos de entrega se asocian con peores reseñas", "en": "Late deliveries are associated with worse reviews"},
        "evidence": {"es": f"Pedidos entregados 8+ días tarde promedian {avg[-1]:.2f} estrellas frente a {avg[2]:.2f} cuando llegan 1–7 días antes de lo estimado (n = {int(cnt[-1]):,} y {int(cnt[2]):,}).",
                     "en": f"Orders delivered 8+ days late average {avg[-1]:.2f} stars vs {avg[2]:.2f} when they arrive 1–7 days early (n = {int(cnt[-1]):,} and {int(cnt[2]):,})."},
        "why": {"es": "La reputación del marketplace influye en la recompra y en la conversión futura.",
                "en": "Marketplace reputation can affect repurchase and future conversion."},
        "action": {"es": "Investigar qué vendedores y rutas concentran los atrasos.",
                   "en": "Investigate which sellers and routes concentrate the delays."},
        "validate": {"es": "Es una asociación: otros factores (producto, vendedor) pueden explicar ambas cosas.",
                     "en": "This is an association: other factors (product, seller) may explain both."},
    })

    sel = next(m for m in fc["metrics"] if m["model"] == fc["selected"])
    base = next(m for m in fc["metrics"] if m["model"] == fc["bestBaseline"])
    adv_beats = not sel["baseline"]
    out.append({
        "id": "forecast", "kind": "measured",
        "title": ({"es": "El modelo avanzado mejora al pronóstico base", "en": "The advanced model beats the simple baseline"}
                  if adv_beats else
                  {"es": "Un pronóstico simple es tan bueno como el modelo avanzado", "en": "A simple forecast is as good as the advanced model"}),
        "evidence": {"es": f"En {len(fc['origins'])} orígenes de backtest (8 semanas), {sel['label']['es']} tiene WMAPE {sel['wmape']:.1%} frente a {base['wmape']:.1%} de {base['label']['es']}.",
                     "en": f"Across {len(fc['origins'])} backtest origins (8 weeks), {sel['label']['en']} has WMAPE {sel['wmape']:.1%} vs {base['wmape']:.1%} for {base['label']['en']}."},
        "why": {"es": "Elegir modelo por evidencia evita complejidad que no agrega precisión.",
                "en": "Choosing by evidence avoids complexity that adds no accuracy."},
        "action": {"es": "Usar el pronóstico como rango para planificación, no como meta.",
                   "en": "Use the forecast as a planning range, not as a target."},
        "validate": {"es": "Con 19 meses de historia no se puede modelar estacionalidad anual.",
                     "en": "With 19 months of history, yearly seasonality cannot be modelled."},
    })
    return out


def main():
    con, checks = build_warehouse()
    orders = con.execute(f"""
        SELECT order_id, customer_unique_id, state, region, purchased_at, purchase_date,
               items, CAST(product_revenue AS DOUBLE) product_revenue, CAST(freight AS DOUBLE) freight,
               review_score, delivery_delay_days
        FROM fct_orders
        WHERE is_valid AND purchase_date BETWEEN DATE '{START}' AND DATE '{END}'
    """).df()
    items = con.execute(f"""
        SELECT order_id, product_id, category, CAST(price AS DOUBLE) price, region, purchase_date
        FROM fct_order_items
        WHERE is_valid AND purchase_date BETWEEN DATE '{START}' AND DATE '{END}'
    """).df()
    counts = con.execute("""
        SELECT COUNT(*), SUM(CASE WHEN is_valid THEN 1 ELSE 0 END),
               SUM(CASE WHEN order_status IN ('canceled','unavailable') THEN 1 ELSE 0 END)
        FROM fct_orders""").fetchone()

    days = pd.date_range(START, END)
    months = pd.period_range(START, END, freq="M")
    orders["purchase_date"] = pd.to_datetime(orders.purchase_date)
    items["purchase_date"] = pd.to_datetime(items.purchase_date)
    orders["m"] = orders.purchase_date.dt.to_period("M").map(lambda p: months.get_loc(p))
    items["m"] = items.purchase_date.dt.to_period("M").map(lambda p: months.get_loc(p))
    nm = len(months)

    cat_rank = items.groupby("category").price.sum().sort_values(ascending=False)
    cat_ids = list(cat_rank.index)
    data = {
        "meta": {
            "title": "Revenue Intelligence",
            "source": {"name": "Brazilian E-Commerce Public Dataset by Olist", "url": SOURCES["olist"]["url"],
                       "license": SOURCES["olist"]["license"], "kaggleVersion": SOURCES["olist"]["version"]},
            "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "window": {"start": START, "end": END},
            "rawOrders": int(counts[0]), "validOrdersAllTime": int(counts[1]), "excludedOrders": int(counts[2]),
            "windowOrders": int(len(orders)), "windowItems": int(len(items)),
            "windowCustomers": int(orders.customer_unique_id.nunique()),
            "windowRevenue": r2(orders.product_revenue.sum()),
        },
        "checks": checks,
        "calendar": {"start": START, "days": len(days), "months": [str(p) for p in months]},
        "regions": [{"id": r, "es": es, "en": en} for r, es, en in REGIONS],
        "categories": [dict(id=c, revenue=r2(cat_rank[c]), **cat_label(c)) for c in cat_ids],
        "daily": {}, "customersByRange": {}, "catMonthly": {}, "heat": {}, "hist": {"edges": HIST_EDGES},
        "delivery": {"buckets": [b[2] for b in DELAY_BUCKETS]}, "priceBox": {}, "topProducts": {},
        "customers": {},
    }

    for rid, o in subsets(orders):
        it = items if rid == "ALL" else items[items.region == rid]
        data["daily"][rid] = daily_block(o, days)
        data["customersByRange"][rid] = customers_by_range(o, nm)
        cm = {}
        for meas, agg in (("revenue", ("price", "sum")), ("units", ("price", "count")), ("orders", ("order_id", "nunique"))):
            t = it.groupby(["category", "m"]).agg(v=agg).v.unstack(fill_value=0).reindex(index=cat_ids, columns=range(nm), fill_value=0)
            cm[meas] = [[r2(v) if meas == "revenue" else int(v) for v in row] for row in t.values]
        data["catMonthly"][rid] = cm
        o2 = o.assign(wd=o.purchased_at.dt.weekday, hr=o.purchased_at.dt.hour)
        heat = np.zeros((nm, 168), int)
        for (m, wd, hr), n in o2.groupby(["m", "wd", "hr"]).size().items():
            heat[m, wd * 24 + hr] = n
        data["heat"][rid] = heat.tolist()
        hist = np.zeros((nm, len(HIST_EDGES)), int)
        for m, g in o.groupby("m"):
            hist[m] = np.histogram(g.product_revenue, bins=HIST_EDGES + [np.inf])[0]
        data["hist"][rid] = hist.tolist()
        data["delivery"][rid] = delivery_block(o, nm)
        data["priceBox"][rid] = price_box(it)
        data["topProducts"][rid] = top_products(it)
        data["customers"][rid] = rfm(o)

    st = orders.groupby(["state", "region", "m"]).agg(revenue=("product_revenue", "sum"), orders=("order_id", "count")).reset_index()
    data["states"] = []
    for (s, reg), g in st.groupby(["state", "region"]):
        g = g.set_index("m").reindex(range(nm), fill_value=0)
        data["states"].append({"id": s, "region": reg, "revenue": [r2(v) for v in g.revenue], "orders": [int(v) for v in g.orders]})

    daily_all = pd.Series(data["daily"]["ALL"]["revenue"], index=days)
    data["anomalies"] = anomalies(days, data["daily"]["ALL"]["revenue"])
    data["forecast"] = forecast.run(daily_all)
    data["insights"] = insights(data, data["forecast"])

    WEB_DATA.mkdir(parents=True, exist_ok=True)
    out = WEB_DATA / "revenue.json"
    out.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{out}: {out.stat().st_size/1024:.0f} KB | revenue R$ {data['meta']['windowRevenue']:,.2f} | "
          f"orders {data['meta']['windowOrders']:,} | forecast selected {data['forecast']['selected']}")
    for m in data["forecast"]["metrics"]:
        print(f"  {m['model']:6s} WMAPE {m['wmape']:.3f} bias {m['bias']:+.3f}")
    print("  interval", data["forecast"]["interval"])
    return data


if __name__ == "__main__":
    main()
