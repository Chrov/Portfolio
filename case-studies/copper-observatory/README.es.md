# Cobre chileno: volumen frente a valor

Minería · Datos públicos oficiales

## Pregunta de negocio

¿Qué debe vigilar la gerencia cuando el valor exportado crece más que la producción?

## Método y validación

Conciliación de 49 observaciones anuales de tres archivos Cochilco. Normalización de años, uniones uno a uno, variaciones e índices base 1976. Funciones de ventana SQL reproducen las variaciones.

## Qué dicen los datos

En 2024 la producción creció 4,9%, el valor nominal exportado 16,7% y el precio nominal LME 7,9%. El crecimiento exportador no mide el crecimiento productivo.

## Recomendación

Mantener indicadores separados de volumen físico, precio y valor exportado. Investigar sus diferencias antes de revisar supuestos de capacidad operativa.

## Límites de la evidencia

Historia anual agregada hasta 2024; sin costos por faena, contratos ni tonelaje exportado. Precios y exportaciones nominales. Correlación entre variaciones (0,923) descriptiva, no causal. Un error de año en 1951 está fuera del período; no se corrigió silenciosamente.

## Fuente y archivos

[COCHILCO · 50 años de la minería en cifras](https://www.cochilco.cl/web/50-anios-de-la-mineria-en-cifras/)

![Evidence](evidence.png)

- [Excel dashboard and native PivotTable](dashboard.xlsx)
- [SQL](analysis.sql)
- [Data](annual.csv)
- [Computed metrics](metrics.json)
- [Source hashes](provenance.json)

## Reproduce / Reproducir

From the repository root / Desde la raíz:

```sh
python -m pip install -r tools/requirements-analysis.txt
python tools/build_analysis.py
```

The source workbooks and UCI archive are included; the generator has a fixed seed. Python asserts row coverage, keys, nonnegative demand and agreement with SQL. See tools/build_workbooks.mjs and tools/finalize_excel.ps1 for Excel; the latter requires Windows Excel.

## Power BI

[PBIP project](powerbi/Copper.pbip), two language pages, six bound visuals, DAX measures and a portable Power Query snapshot. The official report-authoring validator reports zero errors/warnings. Desktop has not confirmed opening the report: native rendering and refresh remain unverified. This is not a published Power BI Service report. Regenerate the snapshot with `python tools/build_powerbi.py` after updating the sources.
