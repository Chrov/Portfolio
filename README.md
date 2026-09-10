# Camilo Vergara · Data Analyst

[Explore the bilingual portfolio / Explorar portafolio bilingüe](https://chrov.github.io/Portfolio/)

SQL, Python, Excel and BI for practical operational decisions. Professional background in B2B SaaS and compliance reporting; independent projects demonstrate reproducible analysis and transparent validation.

| Case / Caso | Evidence / Evidencia | BI |
|---|---|---|
| [Retail waste / Merma](case-studies/market-stall-analytics/) | 3,825 synthetic batches; monetary waste and cohort reconciliation | Excel; complete Power BI ZIP and preview |
| [Replenishment / Reposición](case-studies/grocery-replenishment-policy/) | 360 synthetic series; recursive LightGBM; dbt quality tests | Published Tableau Public; TWBX download |
| [Airline reliability / Confiabilidad aérea](case-studies/airline-reliability/) | 577,262 official BTS flights, June 2023 | Complete Power BI ZIP and preview |
| [Chilean copper / Cobre](case-studies/copper-observatory/) | 49 annual COCHILCO observations | Excel + PivotTable; complete Power BI ZIP and preview |
| [Market demand / Demanda](case-studies/feria-demand/) | 128 synthetic products; forecast baselines | Excel + PivotTable; Tableau TWBX |
| [Bank campaign / Campaña bancaria](case-studies/bank-campaign/) | UCI historical data; chronological model evaluation | Excel + PivotTable |

## Open dashboards / Abrir dashboards

[Replenishment on Tableau Public](https://public.tableau.com/app/profile/camilo.vergara3198/viz/Replenishment_17889686809270/SyntheticreplenishmentReposicionsimulada)

Power BI: use the ZIP on each case page. Extract every file, open the .pbip in Power BI Desktop and select Refresh. The .Report and .SemanticModel folders must stay together. Browser previews are static captures of the desktop report; interactive exploration requires Desktop. No Power BI Service publication is claimed.

Power BI: descarga el ZIP de cada caso, extrae todos los archivos, abre el .pbip y pulsa Actualizar. Las vistas previas se pueden consultar sin instalar Power BI. Los casos distinguen fuentes oficiales de simulaciones y no presentan mejoras predictivas como ahorros realizados.

## Reproduce / Reproducir

The website is static: `python -m http.server 8765`. Each reviewed project links its own reproducibility guide. The three original studies use `tools/requirements-analysis.txt` and `tools/build_analysis.py`. Workbook formatting uses the documented artifact runtime plus native Excel; ready-to-use workbooks are provided. Legacy publishing scripts recreate older layouts, so do not run them to update the current website.

All six cases are published in GitHub. The Power BI packages include their models and embedded snapshots. Both Tableau studies are published and linked from their case pages; the complete TWBX files remain downloadable.


[Market demand / Demanda de feria · Tableau Public](https://public.tableau.com/app/profile/camilo.vergara3198/viz/dashboard_17889881761000/DemandasimuladaSyntheticdemand)

Published dashboard: synthetic demand, forecast validation, volume priority and product counts. / Dashboard publicado: demanda simulada, validación, prioridad por volumen y cantidad de productos.
