"""Load raw Olist CSVs into DuckDB, build staging + mart tables, run checks."""
from pathlib import Path

import duckdb

from analytics.common.data_sources import WAREHOUSE, verify

SQL_DIR = Path(__file__).parent / "sql"

RAW_TABLES = {
    "raw_orders": "olist_orders_dataset.csv",
    "raw_customers": "olist_customers_dataset.csv",
    "raw_order_items": "olist_order_items_dataset.csv",
    "raw_products": "olist_products_dataset.csv",
    "raw_payments": "olist_order_payments_dataset.csv",
    "raw_reviews": "olist_order_reviews_dataset.csv",
    "raw_category_translation": "product_category_name_translation.csv",
}


def build_warehouse(path=WAREHOUSE):
    raw = verify("olist")
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    con = duckdb.connect(str(path))
    for table, fname in RAW_TABLES.items():
        # all_varchar keeps the raw layer lossless; typing happens in staging SQL.
        con.execute(
            f"CREATE OR REPLACE TABLE {table} AS "
            f"SELECT * FROM read_csv('{raw / fname}', header=true, all_varchar=true)"
        )
    for sql_file in ("01_staging.sql", "02_marts.sql"):
        con.execute((SQL_DIR / sql_file).read_text())
    checks = con.execute((SQL_DIR / "03_checks.sql").read_text()).fetchall()
    failed = [c for c in checks if not c[1]]
    if failed:
        raise RuntimeError("Data-quality checks failed: " + repr(failed))
    return con, [{"check": c[0], "passed": bool(c[1]), "detail": c[2]} for c in checks]


if __name__ == "__main__":
    _, results = build_warehouse()
    for r in results:
        print("PASS" if r["passed"] else "FAIL", r["check"], r["detail"])
