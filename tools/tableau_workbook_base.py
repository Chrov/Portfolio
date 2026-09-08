"""
Build a Tableau Public workbook (.twb) from the CSV extracts in dashboard/data/.

Tableau Public refuses live connections to local files: every data source has to
be a Hyper extract. So this script does two things:

  1. writes one .hyper extract per CSV into dashboard/extracts/
  2. writes a .twb pointing at them, with the worksheets and dashboard laid out

The datasource XML is not written from scratch. It is cloned from a real
Tableau-authored workbook (`_plantilla_extract.twb`), so every structural detail
Tableau expects is inherited rather than guessed; only the parts that vary per
CSV are rewritten.

Requires: pandas, tableauhyperapi

Usage:  python dashboard/build_workbook.py
"""
from __future__ import annotations

import copy
import datetime as dt
import hashlib
import os
import xml.etree.ElementTree as ET

import pandas as pd
from tableauhyperapi import (Connection, CreateMode, HyperProcess, Inserter,
                             SqlType, TableDefinition, TableName, Telemetry)

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")
EXTRACTS = os.path.join(HERE, "extracts")
TEMPLATE = os.path.join(HERE, "_plantilla_extract.twb")
OUT = os.path.join(HERE, "replenishment_dashboard.twb")

DATA_DIR = DATA.replace("\\", "/")
ET.register_namespace("user", "http://www.tableausoftware.com/xml/user")

# local-type -> (remote-type, aggregation, role, shelf-type, hyper type)
TYPE_META = {
    "date":    ("133", "Year",  "dimension", "ordinal",      SqlType.date),
    "string":  ("129", "Count", "dimension", "nominal",      SqlType.text),
    "integer": ("20",  "Sum",   "measure",   "quantitative", SqlType.big_int),
    "real":    ("5",   "Sum",   "measure",   "quantitative", SqlType.double),
    "boolean": ("11",  "Count", "dimension", "nominal",      SqlType.bool),
}

FORCE_DIMENSION = {"store_nbr", "item_nbr", "class", "rank", "perishable",
                   "is_payday", "is_weekend", "earthquake_window"}

SHEETS = [
    dict(name="Demand Trend", source="demand_daily.csv", mark="Line",
         title="Daily demand, 2015 to 2016",
         cols=("date", "Day-Trunc"), rows=("units_sold", "Sum")),
    dict(name="Weekly Pattern", source="demand_daily.csv", mark="Bar",
         title="Average demand by day of week",
         cols=("day_of_week", "None-n"), rows=("units_sold", "Avg")),
    dict(name="Forecast vs Actual", source="forecast_vs_actual.csv", mark="Line",
         title="Forecast vs actual, 15-day hold-out",
         cols=("date", "Day-Trunc"), rows=("units", "Sum"), color=("model", "None-n")),
    dict(name="Model Accuracy", source="forecast_wmape_summary.csv", mark="Bar",
         title="WMAPE by model (lower is better)",
         rows=("model", "None-n"), cols=("wmape", "Sum")),
    dict(name="ABC Concentration", source="abc_items.csv", mark="Bar",
         title="Sales by ABC class",
         cols=("abc_class", "None-n"), rows=("total_sales", "Sum")),
    dict(name="Service Level vs Cost", source="service_level_curve.csv", mark="Line",
         title="Total cost by service level",
         cols=("service_level", "None-q"), rows=("total_cost", "Sum")),
]

GRID = [["Demand Trend", "Forecast vs Actual"],
        ["ABC Concentration", "Service Level vs Cost"]]

DERIV = {
    "Sum":       ("sum",  "qk", "quantitative", "Sum"),
    "Avg":       ("avg",  "qk", "quantitative", "Avg"),
    "Day-Trunc": ("tdy",  "qk", "quantitative", "Day-Trunc"),
    "None-q":    ("none", "qk", "quantitative", "None"),
    "None-n":    ("none", "nk", "nominal",      "None"),
}


def _id(prefix, seed):
    return prefix + "." + hashlib.md5(seed.encode()).hexdigest()[:26]


def _guid(seed):
    h = hashlib.md5(seed.encode()).hexdigest().upper()
    return "{{{}-{}-{}-{}-{}}}".format(h[:8], h[8:12], h[12:16], h[16:20], h[20:32])


def _objid(seed):
    return hashlib.md5(seed.encode()).hexdigest().upper()


def _meta_record(parent, col, t, ordinal, obj_id, family=None, approx=None):
    """One <metadata-record class="column">, in the exact element order and with
    the exact per-type extras Tableau writes (verified against a Tableau-authored
    workbook: strings carry scale/width/collation, every record carries object-id).
    """
    rt, agg = TYPE_META[t][0], TYPE_META[t][1]
    mr = ET.SubElement(parent, "metadata-record", {"class": "column"})
    ET.SubElement(mr, "remote-name").text = col
    ET.SubElement(mr, "remote-type").text = rt
    ET.SubElement(mr, "local-name").text = "[{}]".format(col)
    ET.SubElement(mr, "parent-name").text = "[Extract]" if family else "[{}]".format(obj_id.split("_")[0])
    ET.SubElement(mr, "remote-alias").text = col
    ET.SubElement(mr, "ordinal").text = str(ordinal)
    if family:
        ET.SubElement(mr, "family").text = family
    ET.SubElement(mr, "local-type").text = t
    ET.SubElement(mr, "aggregation").text = agg
    if t == "string":
        ET.SubElement(mr, "scale").text = "1"
        ET.SubElement(mr, "width").text = "1073741823"
    if approx is not None:
        ET.SubElement(mr, "approx-count").text = str(approx)
    ET.SubElement(mr, "contains-null").text = "true"
    if t == "string":
        ET.SubElement(mr, "collation", {"flag": "0", "name": "LEN_RUS"})
    ET.SubElement(mr, "object-id").text = "[{}]".format(obj_id)
    return mr


def caption_of(col):
    return " ".join(w.capitalize() for w in col.replace("_", " ").split())


def load_csv(csv_name):
    df = pd.read_csv(os.path.join(DATA, csv_name), encoding="utf-8-sig")
    schema = []
    for col in df.columns:
        s = df[col]
        if col == "date" or col.endswith("_date"):
            df[col] = pd.to_datetime(s).dt.date
            t = "date"
        elif pd.api.types.is_bool_dtype(s):
            t = "boolean"
        elif pd.api.types.is_integer_dtype(s):
            t = "integer"
        elif pd.api.types.is_float_dtype(s):
            t = "real"
        else:
            df[col] = s.astype(str)
            t = "string"
        schema.append((col, t))
    return df, schema


# ---------------------------------------------------------------------
# 1. Hyper extracts
# ---------------------------------------------------------------------
def write_hyper(df, schema, csv_name):
    os.makedirs(EXTRACTS, exist_ok=True)
    path = os.path.join(EXTRACTS, csv_name[:-4] + ".hyper")
    if os.path.exists(path):
        os.remove(path)
    table = TableName("Extract", "Extract")
    definition = TableDefinition(
        table, [TableDefinition.Column(c, TYPE_META[t][4]()) for c, t in schema])

    with HyperProcess(telemetry=Telemetry.DO_NOT_SEND_USAGE_DATA_TO_TABLEAU) as hp:
        with Connection(endpoint=hp.endpoint, database=path,
                        create_mode=CreateMode.CREATE_AND_REPLACE) as conn:
            conn.catalog.create_schema("Extract")
            conn.catalog.create_table(definition)
            with Inserter(conn, definition) as ins:
                ins.add_rows([list(r) for r in df.itertuples(index=False, name=None)])
                ins.execute()
    return path.replace("\\", "/"), len(df)


# ---------------------------------------------------------------------
# 2. Datasource, cloned from the Tableau-authored prototype
# ---------------------------------------------------------------------
def build_datasource(proto, csv_name, schema, hyper_path, nrows):
    base = csv_name[:-4]
    ds = copy.deepcopy(proto)
    ds_name = _id("federated", csv_name)
    conn_name = _id("textscan", csv_name + "c")
    obj_id = "{}.csv_{}".format(base, _objid(csv_name))

    ds.set("caption", base)
    ds.set("name", ds_name)

    # --- federated connection: one named-connection, one relation ---
    fed = ds.find("connection")
    ncs = fed.find("named-connections")
    for child in list(ncs):
        ncs.remove(child)
    nc = ET.SubElement(ncs, "named-connection", {"caption": base, "name": conn_name})
    ET.SubElement(nc, "connection", {"class": "textscan", "directory": DATA_DIR,
                                     "filename": csv_name, "password": "", "server": ""})

    fed.remove(fed.find("relation"))
    rel = ET.Element("relation", {"connection": conn_name, "name": csv_name,
                                  "table": "[{}#csv]".format(base), "type": "table"})
    cols_el = ET.SubElement(rel, "columns", {"character-set": "UTF-8", "header": "yes",
                                             "locale": "en_US", "separator": ","})
    for i, (c, t) in enumerate(schema):
        ET.SubElement(cols_el, "column", {"datatype": t, "name": c, "ordinal": str(i)})
    fed.insert(list(fed).index(ncs) + 1, rel)

    # --- source metadata-records ---
    mrs = fed.find("metadata-records")
    for child in list(mrs):
        mrs.remove(child)
    for i, (c, t) in enumerate(schema):
        mr = _meta_record(mrs, c, t, i, obj_id)
        mr.find("parent-name").text = "[{}]".format(csv_name)

    # --- datasource-level columns ---
    for child in list(ds):
        if child.tag == "column":
            ds.remove(child)
    anchor = list(ds).index(ds.find("aliases")) + 1
    for k, (c, t) in enumerate(schema):
        role, shelf = TYPE_META[t][2], TYPE_META[t][3]
        if c in FORCE_DIMENSION:
            role, shelf = "dimension", "ordinal" if t == "date" else "nominal"
        ds.insert(anchor + k, ET.Element("column", {
            "caption": caption_of(c), "datatype": t, "name": "[{}]".format(c),
            "role": role, "type": shelf}))

    # --- extract: repoint at our .hyper, rewrite its metadata ---
    ec = ds.find("extract").find("connection")
    ec.set("dbname", hyper_path)
    ec.set("update-time", dt.datetime.now().strftime("%m/%d/%Y %I:%M:%S %p"))
    emrs = ec.find("metadata-records")
    for child in list(emrs):
        emrs.remove(child)
    for i, (c, t) in enumerate(schema):
        _meta_record(emrs, c, t, i, obj_id, family=csv_name, approx=nrows)

    # --- object-graph ---
    objs = ds.find("object-graph").find("objects")
    for child in list(objs):
        objs.remove(child)
    obj = ET.SubElement(objs, "object", {"caption": base, "id": obj_id})
    props = ET.SubElement(obj, "properties", {"context": ""})
    props.append(copy.deepcopy(rel))

    return ds_name, ds


# ---------------------------------------------------------------------
# 3. Worksheets and dashboard
# ---------------------------------------------------------------------
def worksheet_el(sheet, ds_name, schema):
    types = dict(schema)
    deps, shelves, used = [], {}, []
    for shelf in ("cols", "rows", "color"):
        if shelf not in sheet:
            continue
        col, deriv = sheet[shelf]
        prefix, key, ctype, derivation = DERIV[deriv]
        inst = "[{}:{}:{}]".format(prefix, col, key)
        shelves[shelf] = "[{}].{}".format(ds_name, inst)
        deps.append('<column-instance column="[{c}]" derivation="{d}" name="{n}" '
                    'pivot="key" type="{t}" />'.format(c=col, d=derivation,
                                                       n=inst, t=ctype))
        used.append(col)

    base_cols = []
    for c in dict.fromkeys(used):
        t = types[c]
        role, st = TYPE_META[t][2], TYPE_META[t][3]
        if c in FORCE_DIMENSION:
            role, st = "dimension", "nominal"
        base_cols.append('<column caption="{cap}" datatype="{t}" name="[{c}]" '
                         'role="{r}" type="{s}" />'.format(
                             cap=caption_of(c), t=t, c=c, r=role, s=st))

    enc = ""
    if "color" in shelves:
        enc = '<encodings><color column="{}" /></encodings>'.format(shelves["color"])

    xml = """<worksheet name="{name}">
  <layout-options><title><formatted-text><run bold="true">{title}</run></formatted-text></title></layout-options>
  <table>
    <view>
      <datasources><datasource caption="{cap}" name="{ds}" /></datasources>
      <datasource-dependencies datasource="{ds}">{base}{deps}</datasource-dependencies>
      <aggregation value="true" />
    </view>
    <style />
    <panes><pane selection-relaxation-option="selection-relaxation-allow">
      <view><breakdown value="auto" /></view><mark class="{mark}" />{enc}
    </pane></panes>
    <rows>{rows}</rows>
    <cols>{cols}</cols>
  </table>
  <simple-id uuid="{uuid}" />
</worksheet>""".format(name=sheet["name"], title=sheet.get("title", sheet["name"]),
                       cap=sheet["source"][:-4], ds=ds_name,
                       base="".join(base_cols), deps="".join(deps),
                       mark=sheet["mark"], enc=enc,
                       rows=shelves.get("rows", ""), cols=shelves.get("cols", ""),
                       uuid=_guid(sheet["name"]))
    return ET.fromstring(xml)


def dashboard_el(sheet_ds):
    zid, rows_xml, row_h = 10, [], 49000
    for r, row in enumerate(GRID):
        inner = []
        for c, name in enumerate(row):
            zid += 1
            inner.append('<zone h="{h}" id="{i}" name="{n}" w="50000" x="{x}" y="{y}">'
                         '<zone-style><format attr="border-style" value="none" />'
                         '<format attr="border-width" value="0" />'
                         '<format attr="margin" value="4" /></zone-style></zone>'.format(
                             h=row_h, i=zid, n=name, x=c * 50000, y=1000 + r * row_h))
        zid += 1
        rows_xml.append('<zone h="{h}" id="{i}" param="horz" type-v2="layout-flow" '
                        'w="100000" x="0" y="{y}">{inner}</zone>'.format(
                            h=row_h, i=zid, y=1000 + r * row_h, inner="".join(inner)))

    used = {s for row in GRID for s in row}
    ds_decl = "".join('<datasource caption="{}" name="{}" />'.format(src[:-4], nm)
                      for src, nm in sorted({sheet_ds[s] for s in used}))

    xml = """<dashboard enable-sort-zone-taborder="true" name="Replenishment Dashboard">
  <style />
  <size maxheight="900" maxwidth="1300" minheight="900" minwidth="1300" />
  <datasources>{ds}</datasources>
  <zones>
    <zone h="100000" id="3" type-v2="layout-basic" w="100000" x="0" y="0">
      <zone h="98000" id="4" param="vert" type-v2="layout-flow" w="100000" x="0" y="1000">{rows}</zone>
    </zone>
  </zones>
  <simple-id uuid="{uuid}" />
</dashboard>""".format(ds=ds_decl, rows="".join(rows_xml), uuid=_guid("dashboard"))
    return ET.fromstring(xml)


# ---------------------------------------------------------------------
def main():
    if not os.path.exists(TEMPLATE):
        raise SystemExit("Missing template: " + TEMPLATE)
    tree = ET.parse(TEMPLATE)
    root = tree.getroot()
    proto = root.find("datasources/datasource")

    sources = sorted({s["source"] for s in SHEETS})
    ds_names, schemas, built = {}, {}, []
    for csv_name in sources:
        df, schema = load_csv(csv_name)
        hyper_path, nrows = write_hyper(df, schema, csv_name)
        name, ds = build_datasource(proto, csv_name, schema, hyper_path, nrows)
        ds_names[csv_name], schemas[csv_name] = name, schema
        built.append(ds)
        print("  {:<28} {:>6,} rows -> extracts/{}.hyper".format(
            csv_name, nrows, csv_name[:-4]))

    dss = root.find("datasources")
    for child in list(dss):
        dss.remove(child)
    for ds in built:
        dss.append(ds)

    ws_parent = root.find("worksheets")
    for child in list(ws_parent):
        ws_parent.remove(child)
    sheet_ds = {}
    for s in SHEETS:
        ws_parent.append(worksheet_el(s, ds_names[s["source"]], schemas[s["source"]]))
        sheet_ds[s["name"]] = (s["source"], ds_names[s["source"]])

    for tag in ("dashboards", "windows", "thumbnails"):
        el = root.find(tag)
        if el is not None:
            root.remove(el)
    dbs = ET.SubElement(root, "dashboards")
    dbs.append(dashboard_el(sheet_ds))
    wins = ET.SubElement(root, "windows")
    for s in SHEETS:
        w = ET.SubElement(wins, "window", {"class": "worksheet", "name": s["name"]})
        ET.SubElement(w, "cards")

    ET.indent(tree, space="  ")
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("<?xml version='1.0' encoding='utf-8' ?>\n\n")
        f.write(ET.tostring(root, encoding="unicode"))
        f.write("\n")
    print("\n  -> dashboard/replenishment_dashboard.twb")
    print("     {} extracts, {} worksheets, 1 dashboard".format(
        len(sources), len(SHEETS)))


if __name__ == "__main__":
    print("Building Hyper extracts and Tableau workbook ...")
    main()
