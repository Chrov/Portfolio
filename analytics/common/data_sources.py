"""Dataset ingestion: download from Kaggle and verify file integrity.

Both datasets are public on Kaggle. `kagglehub` downloads public datasets
without credentials; if Kaggle ever requires them, set KAGGLE_USERNAME and
KAGGLE_KEY (see analytics/README.md). The pipeline never substitutes data:
if a file is missing or its checksum differs, it stops with an error.
"""
import hashlib
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]          # repository root
ANALYTICS = ROOT / "analytics"
RAW = ANALYTICS / "data" / "raw"
WAREHOUSE = ANALYTICS / "data" / "warehouse.duckdb"
WEB_DATA = ROOT / "web" / "public" / "data"
ARTIFACTS = ANALYTICS / "artifacts"

SOURCES = {
    "olist": {
        "kaggle": "olistbr/brazilian-ecommerce",
        "version": 2,
        "url": "https://www.kaggle.com/datasets/olistbr/brazilian-ecommerce",
        "license": "CC BY-NC-SA 4.0",
        "files": {
            "olist_customers_dataset.csv": "983a422239e1712ded753b3bf9ecf47dc73f144d306029dcfa99e70a226883d2",
            "olist_order_items_dataset.csv": "0bc4d068c4fe38cbb01bd90e8746e3c613fe7b4baef75fab7b0e329701c3e279",
            "olist_order_payments_dataset.csv": "4f713964f2815dbbaa40b9488268c55aac3627bfce5aa96cf58d1f3616de3cc0",
            "olist_order_reviews_dataset.csv": "012b61c7593e34f51fa614efdf802b9c7056ce6aae5307ddb93236e7cfc797d7",
            "olist_orders_dataset.csv": "8df58ef3d2d7e9944010f7beecd9b75367f5588ec6e3c91cec19ae3345ef9ecf",
            "olist_products_dataset.csv": "3e6569628a17fbc75fd206ee357b59e20364b9afa90f5b6cd5b4d624c58aa9cc",
            "olist_sellers_dataset.csv": "1f643d2b950373b85735e7794b20986f528d7a000432e7c6f9bcbb44d0846a0e",
            "product_category_name_translation.csv": "a81f0d1f27b27e7293f761bc79e3ce8f348ee39c4b3ed3e49bde38f478586278",
        },
    },
    "ibm_hr": {
        "kaggle": "pavansubhasht/ibm-hr-analytics-attrition-dataset",
        "version": 1,
        "url": "https://www.kaggle.com/datasets/pavansubhasht/ibm-hr-analytics-attrition-dataset",
        "license": "Kaggle dataset page (fictional data created by IBM data scientists)",
        "files": {
            "WA_Fn-UseC_-HR-Employee-Attrition.csv": "a5c31e38bd7fafc9bc333884eb181b06b41b8e5e488e8f7ccb27199fb3be7659",
        },
    },
}


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def verify(name):
    """Raise if any expected file is missing or altered. Returns the folder."""
    folder = RAW / name
    problems = []
    for fname, digest in SOURCES[name]["files"].items():
        p = folder / fname
        if not p.exists():
            problems.append(f"missing {p}")
        elif sha256(p) != digest:
            problems.append(f"checksum mismatch {p}")
    if problems:
        raise RuntimeError(
            f"Dataset '{name}' failed validation:\n  " + "\n  ".join(problems)
            + "\nRun: python -m analytics.common.data_sources --download"
        )
    return folder


def download(name):
    import kagglehub  # imported lazily: only needed for ingestion

    src = SOURCES[name]
    cache = Path(kagglehub.dataset_download(f"{src['kaggle']}/versions/{src['version']}"))
    dest = RAW / name
    dest.mkdir(parents=True, exist_ok=True)
    for fname in src["files"]:
        shutil.copy2(cache / fname, dest / fname)
    return verify(name)


if __name__ == "__main__":
    import sys

    for ds in SOURCES:
        if "--download" in sys.argv:
            download(ds)
        print(ds, "OK", verify(ds))
