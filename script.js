/* ==========================================================================
   Camilo Vergara Salas — Portfolio Interactive Controller
   Features: Bilingual i18n (ES/EN), Hero Data Constellation Canvas,
   Natural Scroll-Reveal Choreography, Animated Stat Counters,
   Case Filters, Architecture/SQL Benchmark Modal & Technical Notes Reader
   ========================================================================== */

const CV_FILES = {
  en: "assets/Camilo_Vergara_Resume_EN.pdf",
  es: "assets/Camilo_Vergara_CV_ES.pdf",
};

const CASE_AUDIT_DATA = {
  "market-stall-analytics": {
    meta: "Data Analytics & BI · SQL / Excel / Power BI",
    title: {
      es: "Arquitectura, Cohortes y SQL: Control de merma y reposición",
      en: "Architecture, Cohorts & SQL: Batch waste and replenishment control",
    },
    question: {
      es: "¿Dónde concentrar el primer piloto operativo de control de merma sin mezclar unidades físicas incompatibles ni confundir lotes abiertos con ventas cerradas?",
      en: "Where should the first operational waste-control pilot focus without mixing incompatible physical units or conflating open batches with closed sales?",
    },
    benchmark: {
      headers: {
        es: ["Categoría / Cohorte", "Lotes Analizados", "Merma al Costo (CLP)", "Tasa de Merma (%)"],
        en: ["Category / Cohort", "Batches Analyzed", "Waste at Cost (CLP)", "Waste Rate (%)"],
      },
      rows: [
        ["Aceitunas (Prioridad #1)", "812 lotes", "CLP 2,984,432", "2.90% (Mayor impacto CLP)"],
        ["Encurtidos y Conservas", "940 lotes", "CLP 1,842,110", "2.45%"],
        ["Frutos Secos y Semillas", "1,125 lotes", "CLP 1,410,880", "1.92%"],
        ["Total General (Corte Jun 2025)", "3,825 lotes (498 post-corte)", "CLP 8,214,900", "2.90% global / 25.03% margen"],
      ],
    },
    sql: `-- Conciliación de lotes por clave única y priorización monetaria de merma al costo (CLP)
WITH batch_reconciliation AS (
  SELECT
    b.batch_id,
    p.category_name,
    p.unit_type,
    b.purchase_date,
    b.closure_date,
    CASE WHEN b.closure_date <= DATE '2025-06-30' THEN 'CLOSED_IN_WINDOW'
         ELSE 'LATER_CLOSURE' END AS cohort_status,
    b.purchased_qty * b.unit_cost_clp AS purchase_cost_clp,
    b.wasted_qty * b.unit_cost_clp AS waste_cost_clp,
    b.sold_qty * (b.unit_price_clp - b.unit_cost_clp) AS gross_profit_clp
  FROM batches b
  INNER JOIN products p ON b.product_id = p.product_id
)
SELECT
  category_name,
  COUNT(*) AS total_batches,
  SUM(CASE WHEN cohort_status = 'LATER_CLOSURE' THEN 1 ELSE 0 END) AS later_closures,
  ROUND(SUM(waste_cost_clp), 0) AS total_waste_clp,
  ROUND(100.0 * SUM(waste_cost_clp) / NULLIF(SUM(purchase_cost_clp), 0), 2) AS waste_rate_pct
FROM batch_reconciliation
GROUP BY category_name
ORDER BY total_waste_clp DESC;`,
    limits: {
      es: "Los 3.825 lotes provienen de una simulación de cohortes. El libro de Excel separa los 498 cierres posteriores al 30 de junio de 2025. No se reclaman ahorros realizados ni retorno de inversión de equipos de frío sin medir antes merma diaria real por producto.",
      en: "All 3,825 batches come from a cohort simulation. The Excel workbook separates 498 closures occurring after June 30, 2025. No realized savings or cold-storage ROI are claimed prior to capturing daily physical SKU waste.",
    },
    caseUrl: "case-studies/market-stall-analytics/index.html",
  },
  "grocery-replenishment-policy": {
    meta: "Data Science & Data Engineering · dbt / LightGBM / Tableau",
    title: {
      es: "Arquitectura, Modelos y SQL: Pronóstico para piloto de reposición",
      en: "Architecture, Models & SQL: Forecasting for a replenishment pilot",
    },
    question: {
      es: "¿Un modelo recursivo LightGBM validado temporalmente supera al baseline estacional para guiar un piloto de reposición en sombra?",
      en: "Does a temporally validated recursive LightGBM model outperform a seasonal-naive baseline to guide a shadow replenishment pilot?",
    },
    benchmark: {
      headers: {
        es: ["Modelo / Nivel de Evaluación", "Esquema de Validación", "WMAPE (%)", "Decisión Técnica"],
        en: ["Model / Evaluation Level", "Validation Scheme", "WMAPE (%)", "Technical Decision"],
      },
      rows: [
        ["Seasonal Naive (Lag 7d)", "Walk-Forward (4 cortes + 15d)", "44.89%", "Baseline operativo de referencia"],
        ["LightGBM Recursivo (Bebidas Tienda 1)", "Walk-Forward sin fuga futura", "30.28%", "Supera baseline (-14.61 pp WMAPE)"],
        ["Prophet / SARIMAX (Serie agregada)", "Walk-Forward (4 cortes)", "34.12%", "Menor adaptabilidad a quiebres"],
        ["LightGBM Media Global SKU-Tienda", "360 series (alta intermitencia)", "115.56%", "Separar SKUs intermitentes en piloto"],
      ],
    },
    sql: `-- Completitud de calendario tienda-SKU en dbt (213.480 filas · 21 tests de calidad)
WITH spine AS (
  SELECT d.calendar_date, s.store_id, p.product_id, p.family
  FROM dim_calendar d
  CROSS JOIN dim_stores s
  CROSS JOIN dim_products p
  WHERE d.calendar_date BETWEEN DATE '2015-01-01' AND DATE '2016-08-31'
),
daily_sales AS (
  SELECT
    sp.calendar_date,
    sp.store_id,
    sp.product_id,
    sp.family,
    GREATEST(COALESCE(f.units_sold, 0), 0) AS clean_units_sold,
    -- Variables rezagadas estrictamente pasadas para evitar fuga de datos
    LAG(GREATEST(COALESCE(f.units_sold, 0), 0), 7) OVER (
      PARTITION BY sp.store_id, sp.product_id ORDER BY sp.calendar_date
    ) AS lag_7d_units
  FROM spine sp
  LEFT JOIN fct_raw_transactions f
    ON sp.calendar_date = f.date AND sp.store_id = f.store_id AND sp.product_id = f.product_id
)
SELECT * FROM daily_sales;`,
    limits: {
      es: "La reducción de WMAPE en bebidas tienda 1 (30,28% vs 44,89%) no equivale automáticamente a ahorro de inventario. La media por SKU-tienda (115,56%) refleja demanda intermitente; por ello se recomienda operar en piloto en sombra antes de automatizar compras.",
      en: "Lowering aggregate beverage WMAPE (30.28% vs 44.89%) does not automatically equal inventory savings. Mean SKU-store WMAPE (115.56%) reflects intermittent demand; therefore shadow operation is recommended before automating orders.",
    },
    caseUrl: "case-studies/grocery-replenishment-policy/index.html",
  },
  "airline-reliability": {
    meta: "Estadística Aplicada & BI · Datos Oficiales BTS / Python / Power BI",
    title: {
      es: "Arquitectura y SQL: Confiabilidad de rutas aéreas (BTS)",
      en: "Architecture & SQL: Air route reliability (BTS)",
    },
    question: {
      es: "¿Qué rutas direccionales concentran el mayor volumen de vuelos afectados en junio de 2023 separando correctamente cancelaciones, desvíos y retrasos?",
      en: "Which directional routes concentrate the highest disrupted-flight volume in June 2023 when properly separating cancellations, diversions, and arrival delays?",
    },
    benchmark: {
      headers: {
        es: ["Métrica / Partición BTS (Jun 2023)", "Volumen Oficial", "Denominador Correcto", "Impacto / Límite Wilson 95%"],
        en: ["Metric / BTS Partition (Jun 2023)", "Official Volume", "Proper Denominator", "Impact / 95% Wilson Lower Bound"],
      },
      rows: [
        ["Vuelos Programados Totales", "577,262 vuelos", "5,808 rutas direccionales", "100% universo analizado"],
        ["Cancelados / Desviados", "12,219 / 2,239", "Sobre vuelos programados", "2.12% cancelación / 0.39% desvío"],
        ["Arribos con Retraso (≥ 15 min)", "152,268 vuelos", "Sobre 562,804 arribos efectivos", "27.06% de arribos completados"],
        ["Ruta Prioritaria #1: ATL → MCO", "336 / 738 afectados", "Filtro ≥ 100 vuelos programados", "45.5% tasa (42.0% Wilson inf.)"],
      ],
    },
    sql: `-- Separación de denominadores en 577.262 vuelos oficiales BTS (Junio 2023)
SELECT
  origin_airport || ' -> ' || dest_airport AS directional_route,
  COUNT(*) AS scheduled_flights,
  SUM(CASE WHEN cancelled = 1 THEN 1 ELSE 0 END) AS cancelled_flights,
  SUM(CASE WHEN diverted = 1 THEN 1 ELSE 0 END) AS diverted_flights,
  SUM(CASE WHEN cancelled = 0 AND diverted = 0 THEN 1 ELSE 0 END) AS completed_arrivals,
  SUM(CASE WHEN cancelled = 0 AND diverted = 0 AND arr_delay_minutes >= 15 THEN 1 ELSE 0 END) AS delayed_arrivals,
  SUM(CASE WHEN cancelled = 1 OR diverted = 1 OR arr_delay_minutes >= 15 THEN 1 ELSE 0 END) AS total_disrupted
FROM bts_ontime_june_2023
GROUP BY origin_airport, dest_airport
HAVING COUNT(*) >= 100
ORDER BY total_disrupted DESC
LIMIT 15;`,
    limits: {
      es: "Un solo mes histórico (junio 2023) no representa el desempeño actual ni permite atribuir causas meteorológicas o de tráfico aéreo. Los intervalos de Wilson son descriptivos y no se cuenta con costos ni pasajeros por conexión.",
      en: "A single historical month (June 2023) does not represent current performance or isolate weather shocks. Wilson confidence intervals are descriptive guides, and passenger/cost figures are unavailable.",
    },
    caseUrl: "case-studies/airline-reliability/index.html",
  },
  "copper-observatory": {
    meta: "Minería y Macroeconomía · COCHILCO / SQL / Power BI (.pbip)",
    title: {
      es: "Arquitectura y SQL: Cobre chileno — volumen frente a valor",
      en: "Architecture & SQL: Chile’s copper — volume versus value",
    },
    question: {
      es: "¿Qué debe monitorear un equipo directivo cuando el valor nominal exportado crece 16,7% pero la producción física sube solo 4,9%?",
      en: "What should leadership monitor when nominal export value grows 16.7% while physical mine output rises only 4.9%?",
    },
    benchmark: {
      headers: {
        es: ["Indicador Oficial COCHILCO", "Valor 2024", "Variación YoY (2024 vs 2023)", "Lectura Ejecutiva"],
        en: ["Official COCHILCO Indicator", "2024 Value", "YoY Change (2024 vs 2023)", "Executive Takeaway"],
      },
      rows: [
        ["Producción Física de Cobre", "5,507.9 kMT", "+4.9%", "Recuperación moderada de tonelaje"],
        ["Valor Exportado (FOB Nominal)", "USD 50,858.2M", "+16.7%", "Impulsado principalmente por precio"],
        ["Precio Promedio LME", "414.9 ¢/lb", "+7.9%", "Correlación YoY con exportaciones r = 0.923"],
      ],
    },
    sql: `-- Conciliación anual 1976-2024 (49 años) y cálculo de variaciones YoY con SQL Window Functions
WITH annual_joined AS (
  SELECT
    p.year,
    p.production_kt,
    e.exports_usd_m,
    pr.lme_price_cent_lb,
    LAG(p.production_kt) OVER (ORDER BY p.year) AS prev_prod_kt,
    LAG(e.exports_usd_m) OVER (ORDER BY p.year) AS prev_exp_usd_m,
    LAG(pr.lme_price_cent_lb) OVER (ORDER BY p.year) AS prev_price
  FROM cochilco_production p
  INNER JOIN cochilco_exports e ON p.year = e.year
  INNER JOIN cochilco_price pr ON p.year = pr.year
  WHERE p.year BETWEEN 1976 AND 2024
)
SELECT
  year,
  ROUND(100.0 * (production_kt - prev_prod_kt) / prev_prod_kt, 2) AS prod_yoy_pct,
  ROUND(100.0 * (exports_usd_m - prev_exp_usd_m) / prev_exp_usd_m, 2) AS exports_yoy_pct,
  ROUND(100.0 * (lme_price_cent_lb - prev_price) / prev_price, 2) AS price_yoy_pct
FROM annual_joined
ORDER BY year DESC;`,
    limits: {
      es: "Serie agregada nacional hasta 2024 en valores nominales; no incluye leyes de mineral, costos C1 por faena ni contratos de venta. La correlación entre variaciones (0,923) es descriptiva, no causal.",
      en: "Aggregate national series through 2024 in nominal terms; excludes ore grades, mine-level C1 costs, and contract terms. The 0.923 change correlation is descriptive, not causal.",
    },
    caseUrl: "case-studies/copper-observatory/index.html",
  },
  "feria-demand": {
    meta: "Time-Series & Planificación Comercial · SQL / Python / Tableau",
    title: {
      es: "Arquitectura, Backtesting y SQL: Pronóstico operativo para comercio",
      en: "Architecture, Backtesting & SQL: Operational forecast for a small business",
    },
    question: {
      es: "Con solo fecha, producto y demanda histórica, ¿una media móvil de 8 semanas por día de la semana mejora el hábito de repetir la semana pasada?",
      en: "With only date, product, and historical demand, does an 8-week weekday mean improve on repeating last week?",
    },
    benchmark: {
      headers: {
        es: ["Regla de Pronóstico", "Backtest (4 Cortes)", "Hold-out Final (28 días)", "Mejora Relativa"],
        en: ["Forecasting Rule", "Backtest (4 Splits)", "Final Hold-out (28 days)", "Relative Improvement"],
      },
      rows: [
        ["Seasonal Naive (Repetir semana previa)", "43.8% WMAPE", "44.6% WMAPE", "Baseline actual del negocio"],
        ["Media Móvil 8 Semanas por Día Semana", "35.2% WMAPE", "35.9% WMAPE", "-19.4% reducción de error relativo"],
        ["69 Productos Clase A (Pareto)", "80.0% del volumen", "Prioridad de conteo diario", "Foco operativo inmediato"],
      ],
    },
    sql: `-- Comparación de WMAPE en hold-out final (28 días reservados de diciembre)
WITH holdout_eval AS (
  SELECT
    product_id,
    demand_date,
    actual_demand,
    seasonal_naive_7d,
    weekday_mean_8w,
    ABS(actual_demand - seasonal_naive_7d) AS abs_err_naive,
    ABS(actual_demand - weekday_mean_8w) AS abs_err_wk_mean
  FROM holdout_predictions
)
SELECT
  ROUND(100.0 * SUM(abs_err_naive) / NULLIF(SUM(actual_demand), 0), 2) AS wmape_naive_pct,
  ROUND(100.0 * SUM(abs_err_wk_mean) / NULLIF(SUM(actual_demand), 0), 2) AS wmape_weekday_mean_pct,
  ROUND(100.0 * (1.0 - SUM(abs_err_wk_mean) / NULLIF(SUM(abs_err_naive), 0)), 2) AS relative_improvement_pct
FROM holdout_eval;`,
    limits: {
      es: "Los 140.288 registros diarios son sintéticos (semilla fija 20260907). La clasificación ABC es por volumen físico y no por margen en pesos. Se requiere capturar quiebres de stock y vida útil antes de automatizar compras.",
      en: "All 140,288 daily records are synthetic (fixed seed 20260907). ABC classes reflect physical volume rather than revenue margin. Stockout and shelf-life tracking are required before automating orders.",
    },
    caseUrl: "case-studies/feria-demand/index.html",
  },
  "bank-campaign": {
    meta: "Machine Learning & Auditoría de Deriva · UCI / Python / SQL",
    title: {
      es: "Arquitectura, Deriva y SQL: Cuándo no desplegar un modelo bancario",
      en: "Architecture, Drift & SQL: When a banking model should not ship",
    },
    question: {
      es: "¿Se sostiene el ranking de propensión de contacto cuando se evalúa en una cohorte futura real y sin fuga de duración de llamada?",
      en: "Does contact propensity ranking hold up in a later chronological cohort when call-duration leakage is removed?",
    },
    benchmark: {
      headers: {
        es: ["Partición Cronológica (41,188 filas)", "Tasa de Conversión Base", "ROC-AUC (Sin Fuga)", "Brier Score / Diagnóstico"],
        en: ["Chronological Split (41,188 rows)", "Base Conversion Rate", "ROC-AUC (No Leakage)", "Brier Score / Diagnosis"],
      },
      rows: [
        ["1. Train (Primer 60% · 24,712 filas)", "4.85%", "Entrenamiento base", "Régimen pre-crisis"],
        ["2. Validation (Siguiente 20% · 8,238 filas)", "9.42%", "0.683 AUC", "Discriminación moderada"],
        ["3. Hold-out Final (Último 20% · 8,238 filas)", "30.80%", "0.458 AUC (Colapso)", "0.233 Brier · No desplegar"],
      ],
    },
    sql: `-- Evaluación de cambio en tasa base por partición cronológica estricta (60% / 20% / 20%)
WITH ordered_campaigns AS (
  SELECT
    row_id,
    subscribed_flag,
    NTILE(5) OVER (ORDER BY row_id ASC) AS chrono_quintile
  FROM campaign_records
)
SELECT
  CASE
    WHEN chrono_quintile IN (1, 2, 3) THEN '1_TRAIN (60%)'
    WHEN chrono_quintile = 4 THEN '2_VALIDATION (20%)'
    ELSE '3_HOLDOUT (20%)'
  END AS split_partition,
  COUNT(*) AS total_contacts,
  SUM(subscribed_flag) AS total_subscriptions,
  ROUND(100.0 * AVG(subscribed_flag), 2) AS conversion_rate_pct
FROM ordered_campaigns
GROUP BY 1
ORDER BY 1;`,
    limits: {
      es: "Dataset académico portugués (2008–2010, UCI). La tasa de conversión salta de 4,8% en entrenamiento a 30,8% en hold-out por cambio en el entorno económico, provocando un AUC de 0,458. El estudio muestra por qué validar en orden temporal evita llevar a producción modelos descalibrados.",
      en: "Portuguese academic dataset (2008–2010, UCI). Base conversion shifts from 4.8% in training to 30.8% in hold-out due to macroeconomic changes, yielding a 0.458 AUC. Demonstrates why chronological validation prevents shipping uncalibrated models.",
    },
    caseUrl: "case-studies/bank-campaign/index.html",
  },
};

/* ===== Technical Notes Data (Eugene Yan Style Deep Dives) ===== */
const TECH_NOTES_DATA = {
  "walk-forward": {
    meta: "Nota Técnica #01 · Series de Tiempo, dbt y LightGBM",
    title: {
      es: "Por qué la validación aleatoria (K-Fold) falla en pronósticos de inventario y cómo implementar Walk-Forward",
      en: "Why random K-Fold fails in inventory forecasting and how to implement Walk-Forward validation",
    },
    problem: {
      es: "En problemas de reposición de inventario, evaluar un modelo de Machine Learning con K-Fold aleatorio permite que el árbol de decisión aprenda de ventas ocurridas después de la fecha que intenta predecir, inflando artificialmente las métricas.",
      en: "In inventory replenishment, evaluating a Machine Learning model with random K-Fold lets decision trees learn from sales occurring after the target forecast date, artificially inflating metrics.",
    },
    code: `# Esquema de pronóstico recursivo Walk-Forward sin fuga temporal (Python / LightGBM)
for step_day in horizon_days:
    # 1. Construir features rezagadas solo con historia observada + predicciones previas del propio modelo
    X_step = build_lag_features(history_plus_preds, target_date=step_day, allowed_lags=[7, 14, 28])
    
    # 2. Predecir día actual sin usar precios ni promociones futuras no confirmadas
    y_hat = np.clip(lgbm_model.predict(X_step), a_min=0, a_max=None)
    
    # 3. Anexar predicción como entrada para el siguiente paso del horizonte
    history_plus_preds = append_predictions(history_plus_preds, step_day, y_hat)`,
    takeaway: {
      es: "Aprendizaje clave: al exigir una espina de calendario completa en dbt (213.480 filas) y evaluación recursiva en 4 orígenes temporales, descubrimos que LightGBM reduce el WMAPE en bebidas de alta rotación (30,28% vs 44,89%), pero que las series intermitentes requieren políticas separadas en un piloto en sombra.",
      en: "Key takeaway: by enforcing a complete calendar spine in dbt (213,480 rows) and recursive evaluation across 4 temporal origins, we found LightGBM lowers high-turnover beverage WMAPE (30.28% vs 44.89%), while intermittent series require separate policies in a shadow pilot.",
    },
    caseUrl: "case-studies/grocery-replenishment-policy/index.html",
  },
  "concept-drift": {
    meta: "Nota Técnica #02 · Machine Learning y Calibración en Producción",
    title: {
      es: "Auditoría de Concept Drift: cuando un clasificador cae de 0.683 a 0.458 AUC en producción",
      en: "Auditing Concept Drift: when a classifier drops from 0.683 to 0.458 AUC in production",
    },
    problem: {
      es: "Muchos tutoriales sobre el dataset bancario UCI reportan un AUC > 0.90 porque incluyen la variable 'duration' (duración de la llamada, que solo se conoce cuando la llamada termina) y dividen los datos al azar.",
      en: "Many tutorials on the UCI banking dataset report AUC > 0.90 because they include call 'duration' (which is only known after the call ends) and split rows randomly.",
    },
    code: `# Diagnóstico de deriva temporal y calibración en partición cronológica 60 / 20 / 20
features_pre_call = [c for c in df.columns if c not in ['duration', 'y', 'row_id']]

# Partición respetando estrictamente el orden temporal de la campaña (2008-2010)
train, val, holdout = np.split(df, [int(0.6 * len(df)), int(0.8 * len(df))])

# Evaluación en cohorte futura real
val_auc = roc_auc_score(val['y'], model.predict_proba(val[features_pre_call])[:, 1])     # 0.683
hold_auc = roc_auc_score(holdout['y'], model.predict_proba(holdout[features_pre_call])[:, 1]) # 0.458
brier = brier_score_loss(holdout['y'], model.predict_proba(holdout[features_pre_call])[:, 1]) # 0.233`,
    takeaway: {
      es: "Aprendizaje clave: entre el primer 60% de los contactos y el último 20%, la tasa base de suscripción saltó de 4,8% a 30,8% por el cambio en las tasas de interés europeas. Saber cuándo recomendar NO desplegar un modelo es tan valioso como entrenarlo.",
      en: "Key takeaway: between the first 60% of contacts and the final 20%, base subscription jumped from 4.8% to 30.8% due to shifting European interest rates. Knowing when to recommend NOT shipping a model is as valuable as training one.",
    },
    caseUrl: "case-studies/bank-campaign/index.html",
  },
  "cohort-sql": {
    meta: "Nota Técnica #03 · SQL Avanzado y Control Financiero",
    title: {
      es: "Contabilidad de cohortes en SQL: conciliación de merma al costo sin mezclar unidades físicas",
      en: "Cohort accounting in SQL: reconciling waste at cost without mixing physical units",
    },
    problem: {
      es: "En comercio minorista de perecibles se suelen sumar kilos de aceitunas con frascos de conservas y bandejas de frutos secos, distorsionando dónde ocurre la verdadera pérdida financiera.",
      en: "In perishable retail, teams often sum kilos of olives with jars of preserves and trays of nuts, distorting where the true financial loss occurs.",
    },
    code: `-- Separación de lotes cerrados en ventana vs cierres posteriores y valorización en CLP
SELECT
  category_name,
  COUNT(*) FILTER (WHERE closure_date <= DATE '2025-06-30') AS closed_in_window,
  COUNT(*) FILTER (WHERE closure_date >  DATE '2025-06-30') AS closed_after_cutoff,
  SUM(wasted_qty * unit_cost_clp) AS waste_at_cost_clp,
  ROUND(100.0 * SUM(wasted_qty * unit_cost_clp) / NULLIF(SUM(purchased_qty * unit_cost_clp), 0), 2) AS waste_rate_pct
FROM reconciled_batches
GROUP BY category_name
ORDER BY waste_at_cost_clp DESC;`,
    takeaway: {
      es: "Aprendizaje clave: al valorizar cada lote al costo de adquisición en CLP y aislar los 498 cierres posteriores al corte de junio de 2025, se identificó que las aceitunas concentran CLP 2.984.432 de merma, permitiendo enfocar un piloto operativo sin gastar en equipos de frío innecesarios.",
      en: "Key takeaway: by valuing every batch at CLP acquisition cost and isolating 498 post-cutoff closures, we identified CLP 2,984,432 in olive waste—enabling a targeted operational pilot before committing cold-storage CAPEX.",
    },
    caseUrl: "case-studies/market-stall-analytics/index.html",
  },
  "wilson-intervals": {
    meta: "Nota Técnica #04 · Estadística Operativa y Calidad de Datos",
    title: {
      es: "Separación de denominadores e intervalos de Wilson para ranquear tasas operativas",
      en: "Denominator separation and Wilson confidence intervals for ranking operational rates",
    },
    problem: {
      es: "Si ordenamos rutas o sucursales únicamente por porcentaje bruto de fallas, los tramos con 3 vuelos y 2 atrasos (66,7%) aparecen falsamente por encima de rutas troncales con cientos de vuelos afectados.",
      en: "If we rank routes or branches solely by raw failure percentage, routes with 3 flights and 2 delays (66.7%) falsely outrank trunk routes with hundreds of disrupted flights.",
    },
    code: `# Límite inferior del intervalo de confianza de Wilson al 95% para priorización robusta
def wilson_lower_bound(disrupted, scheduled, z=1.96):
    if scheduled == 0:
        return 0.0
    p_hat = disrupted / scheduled
    denom = 1 + (z**2) / scheduled
    center = p_hat + (z**2) / (2 * scheduled)
    spread = z * np.sqrt((p_hat * (1 - p_hat) + (z**2) / (4 * scheduled)) / scheduled)
    return (center - spread) / denom`,
    takeaway: {
      es: "Aprendizaje clave: combinar un umbral mínimo de exposición (≥ 100 vuelos programados), denominadores separados (arribos efectivos vs programados) y el límite inferior de Wilson al 95% entrega rankings estables para toma de decisiones ejecutivas.",
      en: "Key takeaway: combining a minimum exposure threshold (≥ 100 scheduled flights), separated denominators (completed arrivals vs scheduled), and the 95% Wilson lower bound produces stable rankings for executive decision-making.",
    },
    caseUrl: "case-studies/airline-reliability/index.html",
  },
};

/* ===== Language Switcher ===== */
function setLang(lang) {
  const targetLang = lang === "en" ? "en" : "es";
  const dict = (window.PORTFOLIO_I18N && window.PORTFOLIO_I18N[targetLang]) || {};

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) el.textContent = dict[key];
  });

  document.documentElement.lang = targetLang;
  const btnEn = document.getElementById("btnEn");
  const btnEs = document.getElementById("btnEs");
  if (btnEn) btnEn.classList.toggle("active", targetLang === "en");
  if (btnEs) btnEs.classList.toggle("active", targetLang === "es");

  // Update all CV download buttons to match active language
  const primary = document.getElementById("cvDownload");
  const alt = document.getElementById("cvDownloadAlt");
  const navCta = document.getElementById("navCvBtn");
  const contactCv = document.getElementById("contactCvBtn");
  if (primary) primary.href = CV_FILES[targetLang];
  if (navCta) navCta.href = CV_FILES[targetLang];
  if (contactCv) contactCv.href = CV_FILES[targetLang];
  if (alt) alt.href = CV_FILES[targetLang === "en" ? "es" : "en"];

  localStorage.setItem("lang", targetLang);
}

/* ===== Case Studies Domain Filter & View Mode Toggle ===== */
const filterButtons = document.querySelectorAll(".filter-btn[data-filter]");
const caseArticles = document.querySelectorAll(".evidence-case[data-categories]");
const viewCardsBtn = document.getElementById("viewCardsBtn");
const viewMatrixBtn = document.getElementById("viewMatrixBtn");
const casesList = document.getElementById("casesList");
const matrixView = document.getElementById("matrixView");

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const filter = btn.getAttribute("data-filter");
    filterButtons.forEach((b) => b.classList.toggle("active", b === btn));

    if (casesList && matrixView && viewCardsBtn && viewMatrixBtn) {
      casesList.classList.remove("hidden");
      matrixView.classList.remove("active");
      viewCardsBtn.classList.add("active");
      viewMatrixBtn.classList.remove("active");
    }

    caseArticles.forEach((article) => {
      const cats = (article.getAttribute("data-categories") || "").split(/\s+/);
      if (filter === "all" || cats.includes(filter)) {
        article.removeAttribute("hidden");
        requestAnimationFrame(() => article.classList.add("visible", "is-visible"));
      } else {
        article.setAttribute("hidden", "");
      }
    });
  });
});

if (viewCardsBtn && viewMatrixBtn && casesList && matrixView) {
  viewCardsBtn.addEventListener("click", () => {
    viewCardsBtn.classList.add("active");
    viewMatrixBtn.classList.remove("active");
    casesList.classList.remove("hidden");
    matrixView.classList.remove("active");
  });

  viewMatrixBtn.addEventListener("click", () => {
    viewMatrixBtn.classList.add("active");
    viewCardsBtn.classList.remove("active");
    matrixView.classList.add("active");
    casesList.classList.add("hidden");
  });
}

/* ===== Quick SQL, Architecture & Model Benchmark Modal ===== */
function openAuditModal(caseId) {
  const data = CASE_AUDIT_DATA[caseId];
  if (!data) return;
  const lang = document.documentElement.lang === "en" ? "en" : "es";
  const backdrop = document.getElementById("auditModalBackdrop");
  const metaEl = document.getElementById("auditModalMeta");
  const titleEl = document.getElementById("auditModalTitle");
  const bodyEl = document.getElementById("auditModalBody");

  if (!backdrop || !metaEl || !titleEl || !bodyEl) return;

  metaEl.textContent = data.meta;
  titleEl.textContent = data.title[lang];

  const lblQ = lang === "en" ? "Business Problem & Analytical Question" : "Problema de Negocio y Pregunta Analítica";
  const lblBench = lang === "en" ? "Model / Cohort Evaluation Summary" : "Resumen Cuantitativo de Modelos / Cohortes";
  const lblSql = lang === "en" ? "Reproducible SQL & Validation Logic" : "Consulta SQL y Lógica de Validación";
  const lblLim = lang === "en" ? "Methodological Scope & Limitations" : "Alcance Metodológico y Limitaciones";
  const lblOpen = lang === "en" ? "Explore Full Case Study & Deliverables →" : "Explorar Caso Completo y Descargables →";

  let benchHtml = "";
  if (data.benchmark) {
    const headers = data.benchmark.headers[lang]
      .map((h) => `<th>${h}</th>`)
      .join("");
    const rows = data.benchmark.rows
      .map((r) => `<tr>${r.map((cell, i) => `<td style="${i === 0 ? "font-weight:600;color:var(--text);" : ""}">${cell}</td>`).join("")}</tr>`)
      .join("");
    benchHtml = `
      <p style="font-weight: 700; color: var(--text); margin-bottom: 6px;">${lblBench}</p>
      <table class="modal-bench-table">
        <thead><tr>${headers}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  bodyEl.innerHTML = `
    <p style="font-weight: 700; color: var(--text); margin-bottom: 4px;">${lblQ}</p>
    <p style="color: var(--text-secondary); font-size: 0.94rem; margin-bottom: 16px;">${data.question[lang]}</p>
    ${benchHtml}
    <p style="font-weight: 700; color: var(--text); margin-bottom: 4px;">${lblSql}</p>
    <pre class="audit-code"><code>${data.sql.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>
    <p style="font-weight: 700; color: var(--text); margin-bottom: 4px;">${lblLim}</p>
    <p style="color: var(--text-secondary); font-size: 0.92rem; margin-bottom: 22px;">${data.limits[lang]}</p>
    <div style="display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid var(--border); padding-top: 16px;">
      <a class="btn btn--primary btn--sm" href="${data.caseUrl}">${lblOpen}</a>
    </div>
  `;

  backdrop.classList.add("open");
}

/* ===== Technical Notes Reader Modal ===== */
function openNoteModal(noteId) {
  const note = TECH_NOTES_DATA[noteId];
  if (!note) return;
  const lang = document.documentElement.lang === "en" ? "en" : "es";
  const backdrop = document.getElementById("auditModalBackdrop");
  const metaEl = document.getElementById("auditModalMeta");
  const titleEl = document.getElementById("auditModalTitle");
  const bodyEl = document.getElementById("auditModalBody");

  if (!backdrop || !metaEl || !titleEl || !bodyEl) return;

  metaEl.textContent = note.meta;
  titleEl.textContent = note.title[lang];

  const lblProb = lang === "en" ? "Engineering Context & Problem" : "Contexto de Ingeniería y Problema";
  const lblCode = lang === "en" ? "Implementation Pattern" : "Patrón de Implementación";
  const lblTake = lang === "en" ? "Production Takeaway" : "Aprendizaje y Criterio Aplicado";
  const lblCase = lang === "en" ? "Open Associated Case Study →" : "Ver Caso de Estudio Asociado →";

  bodyEl.innerHTML = `
    <p style="font-weight: 700; color: var(--text); margin-bottom: 4px;">${lblProb}</p>
    <p style="color: var(--text-secondary); font-size: 0.94rem; margin-bottom: 16px;">${note.problem[lang]}</p>
    <p style="font-weight: 700; color: var(--text); margin-bottom: 4px;">${lblCode}</p>
    <pre class="audit-code"><code>${note.code.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>
    <p style="font-weight: 700; color: var(--text); margin-bottom: 4px;">${lblTake}</p>
    <p style="color: var(--text-secondary); font-size: 0.93rem; margin-bottom: 22px;">${note.takeaway[lang]}</p>
    <div style="display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid var(--border); padding-top: 16px;">
      <a class="btn btn--primary btn--sm" href="${note.caseUrl}">${lblCase}</a>
    </div>
  `;

  backdrop.classList.add("open");
}

function closeAuditModal() {
  const backdrop = document.getElementById("auditModalBackdrop");
  if (backdrop) backdrop.classList.remove("open");
}

/* ===== Expandable About Story Drawer ===== */
function toggleAboutStory() {
  const content = document.getElementById("aboutExpandedContent");
  const btn = document.getElementById("aboutExpandBtn");
  if (!content || !btn) return;
  const isHidden = content.hasAttribute("hidden");
  const lang = document.documentElement.lang === "en" ? "en" : "es";
  if (isHidden) {
    content.removeAttribute("hidden");
    btn.setAttribute("aria-expanded", "true");
    btn.textContent = lang === "en" ? "Hide full vision ↑" : "Ocultar principios y visión ↑";
  } else {
    content.setAttribute("hidden", "");
    btn.setAttribute("aria-expanded", "false");
    btn.textContent =
      lang === "en"
        ? "Read working principles & full vision ↓"
        : "Leer principios de trabajo y visión completa ↓";
  }
}

window.openAuditModal = openAuditModal;
window.openNoteModal = openNoteModal;
window.closeAuditModal = closeAuditModal;
window.toggleAboutStory = toggleAboutStory;
window.setLang = setLang;

document.getElementById("auditModalBackdrop")?.addEventListener("click", (e) => {
  if (e.target.id === "auditModalBackdrop") closeAuditModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeAuditModal();
});

/* ===== Interactive Hero Data Constellation Canvas ===== */
(function initHeroCanvas() {
  const canvas = document.getElementById("heroCanvas");
  if (!canvas) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let width = 0;
  let height = 0;
  let nodes = [];
  const NODE_COUNT = 28;
  let mouse = { x: -1000, y: -1000 };

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    canvas.width = width;
    canvas.height = height;
  }

  function createNodes() {
    nodes = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        r: Math.random() * 1.8 + 1.2,
      });
    }
  }

  resize();
  createNodes();
  window.addEventListener("resize", () => {
    resize();
    createNodes();
  });

  canvas.parentElement.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });

  canvas.parentElement.addEventListener("mouseleave", () => {
    mouse.x = -1000;
    mouse.y = -1000;
  });

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const strokeRgb = isDark ? "124, 194, 156" : "31, 75, 56";

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      n.x += n.vx;
      n.y += n.vy;

      if (n.x < 0 || n.x > width) n.vx *= -1;
      if (n.y < 0 || n.y > height) n.vy *= -1;

      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${strokeRgb}, 0.28)`;
      ctx.fill();

      for (let j = i + 1; j < nodes.length; j++) {
        const m = nodes[j];
        const dx = n.x - m.x;
        const dy = n.y - m.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 145) {
          const alpha = (1 - dist / 145) * 0.14;
          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(m.x, m.y);
          ctx.strokeStyle = `rgba(${strokeRgb}, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      const mdx = n.x - mouse.x;
      const mdy = n.y - mouse.y;
      const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
      if (mdist < 170) {
        const alpha = (1 - mdist / 170) * 0.24;
        ctx.beginPath();
        ctx.moveTo(n.x, n.y);
        ctx.lineTo(mouse.x, mouse.y);
        ctx.strokeStyle = `rgba(${strokeRgb}, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    requestAnimationFrame(draw);
  }

  requestAnimationFrame(draw);
})();

/* ===== Natural Scroll-Reveal Choreography ===== */
document.documentElement.classList.add("js-ready");
const revealElements = document.querySelectorAll(".reveal");

document.querySelectorAll(".hero__proof-strip, .skills__grid, .timeline, .products-grid, .notes-grid").forEach((group) => {
  group.querySelectorAll(":scope > .reveal").forEach((el, idx) => {
    el.style.setProperty("--reveal-delay", `${idx * 70}ms`);
  });
});

function markRevealed(el) {
  el.classList.add("visible", "is-visible");
}

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          markRevealed(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.06, rootMargin: "0px 0px -20px 0px" }
  );

  revealElements.forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.95) {
      requestAnimationFrame(() => markRevealed(el));
    } else {
      revealObserver.observe(el);
    }
  });
} else {
  revealElements.forEach((el) => markRevealed(el));
}

/* ===== Animated Stat Counters ===== */
const statCounters = document.querySelectorAll(".stat-counter[data-target]");
function animateCounter(el) {
  const target = parseInt(el.getAttribute("data-target") || "0", 10);
  if (!target || isNaN(target)) return;
  const duration = 1200;
  const startTime = performance.now();

  function tick(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = String(Math.round(target * eased));
    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      el.textContent = String(target);
    }
  }
  requestAnimationFrame(tick);
}

if ("IntersectionObserver" in window && statCounters.length > 0) {
  const counterObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );
  statCounters.forEach((counter) => counterObserver.observe(counter));
}

/* ===== Subtle Interactive Cursor Spotlight on Project Cards ===== */
document.querySelectorAll(".evidence-case").forEach((card) => {
  card.addEventListener("mousemove", (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty("--mouse-x", `${x}px`);
    card.style.setProperty("--mouse-y", `${y}px`);
  });
});

/* ===== Theme Controller ===== */
function setTheme(theme) {
  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  localStorage.setItem("theme", theme);
}

document.getElementById("themeToggle")?.addEventListener("click", () => {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  setTheme(isDark ? "light" : "dark");
});

setTheme(
  localStorage.getItem("theme") ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
);

/* ===== Mobile Menu ===== */
const burger = document.getElementById("burger");
const navLinks = document.getElementById("navLinks");
if (burger && navLinks) {
  burger.addEventListener("click", () => {
    const open = navLinks.classList.toggle("open");
    burger.setAttribute("aria-expanded", String(open));
  });
  navLinks.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      navLinks.classList.remove("open");
      burger.setAttribute("aria-expanded", "false");
    })
  );
}

/* ===== Scroll Progress Bar ===== */
const progressBar = document.getElementById("progress");
function updateProgress() {
  if (!progressBar) return;
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const pct = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
  progressBar.style.width = `${Math.min(pct, 100)}%`;
}
window.addEventListener("scroll", updateProgress, { passive: true });
window.addEventListener("resize", updateProgress);
updateProgress();

/* ===== Scrollspy ===== */
const spyLinks = new Map();
if (navLinks) {
  navLinks.querySelectorAll("a[href^='#']").forEach((a) => {
    const section = document.querySelector(a.getAttribute("href"));
    if (section) spyLinks.set(section, a);
  });

  const spyObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        const link = spyLinks.get(e.target);
        if (!link) return;
        if (e.isIntersecting) {
          spyLinks.forEach((l) => l.classList.remove("active"));
          link.classList.add("active");
        }
      });
    },
    { rootMargin: "-35% 0px -55% 0px" }
  );
  spyLinks.forEach((_, section) => spyObserver.observe(section));
}

/* ===== Initialize ===== */
const initialLang = localStorage.getItem("lang") || "es";
setLang(initialLang);
