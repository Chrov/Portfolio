# Un pronóstico que una feria puede operar

Planificación de demanda · Simulación sintética

## Pregunta de negocio

Con solo fecha, producto y demanda, ¿un pronóstico transparente mejora repetir la última semana?

## Método y validación

Generar 140.288 registros diarios de 128 productos con semilla fija. Comparar naive estacional con promedio de ocho semanas por día, en cuatro orígenes de validación; reservar diciembre como prueba final de 28 días. Cada pronóstico queda fijo en su origen.

## Qué dicen los datos

El promedio por día reduce WMAPE de prueba de 44,6% a 35,9%: una reducción relativa de 19,4%. 69 productos quedan en clase A por volumen, incluyendo el que cruza el umbral de 80%.

## Recomendación

Usar el promedio por día como insumo de planificación. Recopilar disponibilidad, plazos y transacciones reales antes de recomendar cantidades de reposición o monetizar ahorros.

## Límites de la evidencia

Todos los registros son sintéticos, no evidencia reconstruida de un cliente. Sin precios, ventas perdidas, stock, vida útil ni plazos. La clasificación por volumen no es ABC de ingresos. Resultados de este generador, no de un negocio real ni de mejora de servicio.

## Fuente y archivos

[Reproducible generator · seed 20260907](https://github.com/Chrov/Portfolio/blob/main/tools/build_analysis.py)

![Evidence](evidence.png)

- [Excel dashboard and native PivotTable](dashboard.xlsx)
- [SQL](analysis.sql)
- [Data](demand.csv)
- [Computed metrics](metrics.json)
- [Source hashes](provenance.json)

## Reproduce / Reproducir

From the repository root / Desde la raíz:

```sh
python -m pip install -r tools/requirements-analysis.txt
python tools/build_analysis.py
```

The source workbooks and UCI archive are included; the generator has a fixed seed. Python asserts row coverage, keys, nonnegative demand and agreement with SQL. See tools/build_workbooks.mjs and tools/finalize_excel.ps1 for Excel; the latter requires Windows Excel.

## Tableau

[Packaged workbook](dashboard.twbx) contains three Hyper extracts, four worksheets and one bilingual dashboard. Extract contents and XML are validated; desktop rendering and Tableau Public publication are pending. This is a generated workbook, not a claim of a live published dashboard.
