# Cuándo no desplegar un modelo bancario

Banca · Dataset académico histórico

## Pregunta de negocio

¿Se puede priorizar capacidad de contacto con información previa a la llamada y mantener el desempeño en una cohorte posterior?

## Método y validación

Usar los 41.188 registros cronológicos de UCI. Separar 60/20/20 sin mezclar, ajustar transformaciones solo en entrenamiento y excluir duración, contactos de campaña actual y demografía. Auditar ranking y calibración en datos reservados.

## Qué dicen los datos

AUC de prueba de 0,458. Con 20% de capacidad captura 26,7% de suscriptores observados, pero la tasa cambia de 4,8% en entrenamiento a 30,8% en prueba. El lift positivo a capacidad limitada no rescata el ranking global ni la calibración.

## Recomendación

No desplegar este modelo. Investigar composición de cohortes y cambio macroeconómico, obtener datos recientes previos al contacto y validar otra política antes de experimentar. No se afirma ROI ni uplift causal.

## Límites de la evidencia

Campañas portuguesas de 2008–2010, no banca chilena actual. UCI aporta orden pero no fechas exactas ni IDs; no se descarta repetición de clientes entre particiones. Se predice suscripción de depósitos, no impago. Captura observacional. AP de validación ya inferior a prevalencia; prueba final diagnóstica, no evidencia para desplegar.

## Fuente y archivos

[Moro, Rita & Cortez (2014) · UCI · CC BY 4.0 · DOI 10.24432/C5K306](https://archive.ics.uci.edu/dataset/222/bank+marketing)

![Evidence](evidence.png)

- [Excel dashboard and native PivotTable](dashboard.xlsx)
- [SQL](analysis.sql)
- [Data](holdout_scores.csv)
- [Computed metrics](metrics.json)
- [Source hashes](provenance.json)

## Reproduce / Reproducir

From the repository root / Desde la raíz:

```sh
python -m pip install -r tools/requirements-analysis.txt
python tools/build_analysis.py
```

The source workbooks and UCI archive are included; the generator has a fixed seed. Python asserts row coverage, keys, nonnegative demand and agreement with SQL. See tools/build_workbooks.mjs and tools/finalize_excel.ps1 for Excel; the latter requires Windows Excel.
