/* ==========================================================================
   Camilo Vergara Salas — Portfolio Interactive Controller
   Features: Bilingual i18n (ES/EN),
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
        es: ["Categoría", "Costo de compra (CLP)", "Merma al costo (CLP)", "Merma / costo"],
        en: ["Category", "Purchase cost (CLP)", "Waste at cost (CLP)", "Waste / cost"],
      },
      rows: [
        ["Aceitunas · Olives (mayor monto)", "CLP 56,500,600", "CLP 2,984,432", "5.28%"],
        ["Frutos secos · Nuts", "CLP 98,469,600", "CLP 1,919,798", "1.95%"],
        ["Granos · Grains (mayor tasa)", "CLP 18,631,550", "CLP 1,710,315", "9.18%"],
        ["Total 14 categorías · 3,825 lotes", "CLP 309,556,750", "CLP 8,992,168", "2.90% · margen 25.03%"],
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
        ["Media móvil 8 sem. por día (Bebidas Tienda 1)", "Walk-Forward sin fuga futura", "32.79%", "Baseline simple competitivo"],
        ["LightGBM · WMAPE medio SKU-tienda", "360 series (alta intermitencia)", "115.56%", "Separar SKUs intermitentes en piloto"],
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
        ["Producción Física de Cobre", "5,505.9 kt", "+4.9%", "Recuperación moderada de tonelaje"],
        ["Valor Exportado (FOB Nominal)", "USD 49,708.4M", "+16.7%", "Impulsado principalmente por precio"],
        ["Precio Promedio LME", "414.9 ¢/lb", "+7.9%", "Correlación de variaciones YoY precio–exportaciones r = 0.923"],
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
        ["Seasonal Naive (Repetir semana previa)", "48.3% WMAPE", "44.6% WMAPE", "Baseline actual del negocio"],
        ["Media Móvil 8 Semanas por Día Semana", "37.9% WMAPE", "35.9% WMAPE", "-19.4% reducción de error relativo"],
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
        ["1. Train (Primer 60% · 24,712 filas)", "4.81%", "Entrenamiento", "Régimen inicial"],
        ["2. Validation (Siguiente 20% · 8,238 filas)", "11.07%", "0.489 AUC", "Sin poder discriminante"],
        ["3. Hold-out Final (Último 20% · 8,238 filas)", "30.83%", "0.458 AUC (bajo azar)", "0.308 Brier · No desplegar"],
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
      es: "Dataset académico portugués (2008–2010, UCI). La tasa de conversión salta de 4,8% en entrenamiento a 30,8% en hold-out por cambio en el entorno económico, y el modelo no supera al azar (AUC 0,458). El estudio muestra por qué validar en orden temporal evita llevar a producción modelos descalibrados.",
      en: "Portuguese academic dataset (2008–2010, UCI). Base conversion shifts from 4.8% in training to 30.8% in hold-out as the macro environment changes, and the model fails to beat random (0.458 AUC). Demonstrates why chronological validation prevents shipping uncalibrated models.",
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
      es: "Auditoría de deriva: por qué un clasificador bancario no supera al azar (AUC 0.458) en una cohorte futura",
      en: "Auditing drift: why a banking classifier fails to beat random (0.458 AUC) on a later cohort",
    },
    problem: {
      es: "Muchos tutoriales sobre el dataset bancario UCI reportan un AUC > 0.90 porque incluyen la variable 'duration' (duración de la llamada, que solo se conoce cuando la llamada termina) y dividen los datos al azar.",
      en: "Many tutorials on the UCI banking dataset report AUC > 0.90 because they include call 'duration' (which is only known after the call ends) and split rows randomly.",
    },
    code: `# Diagnóstico de deriva temporal y calibración en partición cronológica 60 / 20 / 20
# Solo variables conocidas antes de llamar: sin 'duration' ni demografía
features_pre_call = ['contact', 'month', 'day_of_week', 'pdays', 'previous', 'poutcome',
                     'emp.var.rate', 'cons.price.idx', 'cons.conf.idx', 'euribor3m', 'nr.employed']

# Partición respetando estrictamente el orden temporal de la campaña (2008-2010)
train, val, holdout = np.split(df, [int(0.6 * len(df)), int(0.8 * len(df))])

# Evaluación en cohorte futura real
val_auc = roc_auc_score(val['y'], model.predict_proba(val[features_pre_call])[:, 1])     # 0.489
hold_auc = roc_auc_score(holdout['y'], model.predict_proba(holdout[features_pre_call])[:, 1]) # 0.458
brier = brier_score_loss(holdout['y'], model.predict_proba(holdout[features_pre_call])[:, 1]) # 0.308`,
    takeaway: {
      es: "Aprendizaje clave: entre el primer 60% de los contactos y el último 20%, la tasa base de suscripción saltó de 4,8% a 30,8%, coincidiendo con un cambio del entorno macroeconómico (euribor, empleo). Saber cuándo recomendar NO desplegar un modelo es tan valioso como entrenarlo.",
      en: "Key takeaway: between the first 60% of contacts and the final 20%, base subscription jumped from 4.8% to 30.8%, coinciding with a shift in the macro environment (euribor, employment). Knowing when to recommend NOT shipping a model is as valuable as training one.",
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

/* ==========================================================================
   Motion system
   - UI feedback ≤ 300 ms (Doherty: the response starts on pointerdown)
   - Everything that moves can be interrupted: CSS transitions or
     Web Animations that are cancelled and restarted from where they are.
   - Frequent controls (nav, language) barely move; one-off moments
     (hero, filters, modal, copy email) get the richer motion.
   ========================================================================== */
const MOTION = {
  reduced: window.matchMedia("(prefers-reduced-motion: reduce)"),
  fine: window.matchMedia("(hover: hover) and (pointer: fine)"),
  out: "cubic-bezier(0.22, 1, 0.36, 1)",
  inOut: "cubic-bezier(0.65, 0, 0.35, 1)",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
};

/* Where did the last interaction start? Used to make things grow from there. */
const lastInput = { x: window.innerWidth / 2, y: window.innerHeight / 3, kind: "pointer" };
document.addEventListener(
  "pointerdown",
  (e) => Object.assign(lastInput, { x: e.clientX, y: e.clientY, kind: "pointer" }),
  { capture: true, passive: true }
);
document.addEventListener(
  "keydown",
  (e) => { if (e.key === "Enter" || e.key === " ") lastInput.kind = "key"; },
  { capture: true }
);
function inputOrigin() {
  if (lastInput.kind === "key" && document.activeElement && document.activeElement !== document.body) {
    const r = document.activeElement.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  return { x: lastInput.x, y: lastInput.y };
}

function safe(fn, name) {
  try { fn(); } catch (err) { console.warn(`[portfolio] ${name} failed`, err); }
}
function store(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, value);
  } catch (_) { return null; }
  return null;
}
const dictFor = (lang) => (window.PORTFOLIO_I18N && window.PORTFOLIO_I18N[lang]) || {};
const currentLang = () => (document.documentElement.lang === "en" ? "en" : "es");

/* ===== Headlines: split into words for staggered, arcing entrances ===== */
let i18nVersion = 0;
const SPLIT_SEL = ".hero__title, main .section__title, .contact__title, .footer__thanks";

function splitWords(el) {
  const text = el.textContent.replace(/\s+/g, " ").trim();
  el.textContent = "";
  const sr = document.createElement("span");
  sr.className = "sr-only";
  sr.textContent = text;
  el.appendChild(sr);
  text.split(" ").forEach((word, i) => {
    const w = document.createElement("span");
    w.className = "w";
    w.setAttribute("aria-hidden", "true");
    w.style.setProperty("--i", String(Math.min(i, 14)));
    w.textContent = word;
    el.append(w, " ");
  });
}

/* Called after a language change: re-split without replaying what was already seen */
function refreshSplits() {
  document.querySelectorAll(".split").forEach((el) => {
    splitWords(el);
    if (el.dataset.seen) el.classList.remove("is-entering");
  });
}

function initSplit() {
  const els = [...document.querySelectorAll(SPLIT_SEL)];
  const enter = (el) => {
    if (el.dataset.seen) return;
    el.dataset.seen = "1";
    el.classList.remove("is-pending");
    el.classList.add("is-entering");
  };
  els.forEach((el) => {
    el.classList.add("split");
    splitWords(el);
    if (el.classList.contains("hero__title") || MOTION.reduced.matches || !("IntersectionObserver" in window)) enter(el);
    else el.classList.add("is-pending");
  });
  if (!("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      enter(e.target);
    }),
    { threshold: 0.2, rootMargin: "0px 0px -8% 0px" }
  );
  els.filter((el) => el.classList.contains("is-pending")).forEach((el) => io.observe(el));
  setTimeout(() => els.forEach(enter), 6000); // safety net
}

/* ===== Numbers that "decode" into place (digits settle left to right) ===== */
function decode(el) {
  if (MOTION.reduced.matches || el.dataset.decoding) return;
  const final = el.textContent;
  const chars = [...final];
  const idx = chars.map((c, i) => (/\d/.test(c) ? i : -1)).filter((i) => i >= 0);
  if (!idx.length) return;
  const v = i18nVersion;
  const t0 = performance.now();
  const dur = 300;
  let last = 0;
  el.dataset.decoding = "1";
  const tick = (now) => {
    if (v !== i18nVersion) { delete el.dataset.decoding; return; } // language changed: setLang already wrote the text
    const p = Math.min((now - t0) / dur, 1);
    if (p < 1) {
      if (now - last > 40) {
        last = now;
        const settled = Math.floor(p * idx.length);
        const out = chars.slice();
        idx.forEach((ci, k) => { if (k >= settled) out[ci] = String(Math.floor(Math.random() * 10)); });
        el.textContent = out.join("");
      }
      requestAnimationFrame(tick);
    } else {
      el.textContent = final;
      delete el.dataset.decoding;
    }
  };
  requestAnimationFrame(tick);
}

function initDecode() {
  if (MOTION.reduced.matches || !("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      e.target.querySelectorAll("dt").forEach((dt, i) => setTimeout(() => decode(dt), 140 + i * 70));
    }),
    { threshold: 0.6 }
  );
  document.querySelectorAll(".case-card__facts").forEach((el) => io.observe(el));
}

/* ===== Segmented controls: a thumb that squashes and stretches as it travels ===== */
function syncSeg(seg, animate) {
  const thumb = seg.querySelector(".seg__thumb");
  const btn = seg.querySelector("button.active") || seg.querySelector("button");
  if (!thumb || !btn || !btn.offsetWidth) return;
  const x = btn.offsetLeft;
  const w = btn.offsetWidth;
  const cs = getComputedStyle(thumb);
  const fromX = parseFloat(cs.left) || 0;
  const fromW = parseFloat(cs.width) || 0;
  thumb.getAnimations().forEach((a) => a.cancel()); // interruptible: restart from the current spot
  thumb.style.left = `${x}px`;
  thumb.style.width = `${w}px`;
  seg.classList.add("has-thumb");
  if (!animate || MOTION.reduced.matches || fromW === 0) return;
  if (Math.abs(fromX - x) < 1 && Math.abs(fromW - w) < 1) return;
  const spanX = Math.min(fromX, x);
  const spanW = Math.max(fromX + fromW, x + w) - spanX;
  thumb.animate(
    [
      { left: `${fromX}px`, width: `${fromW}px`, transform: "scaleY(1)", easing: "cubic-bezier(0.5, 0, 0.75, 0)" },
      { left: `${spanX}px`, width: `${spanW}px`, transform: "scaleY(0.82)", offset: 0.42, easing: MOTION.spring },
      { left: `${x}px`, width: `${w}px`, transform: "scaleY(1)" },
    ],
    { duration: 300 }
  );
}
function syncAllSegs(animate) {
  document.querySelectorAll("[data-seg]").forEach((seg) => syncSeg(seg, animate));
}
function initSegs() {
  document.querySelectorAll("[data-seg]").forEach((seg) => {
    seg.addEventListener("click", (e) => {
      if (e.target.closest("button")) syncSeg(seg, true);
    });
  });
}

/* ===== Language ===== */
function setLang(lang, opts = {}) {
  const targetLang = lang === "en" ? "en" : "es";
  const dict = dictFor(targetLang);
  const changed = document.documentElement.lang !== targetLang;
  i18nVersion += 1;

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const value = dict[el.getAttribute("data-i18n")];
    if (value) el.textContent = value;
  });
  document.documentElement.lang = targetLang;

  const btnEn = document.getElementById("btnEn");
  const btnEs = document.getElementById("btnEs");
  if (btnEn) { btnEn.classList.toggle("active", targetLang === "en"); btnEn.setAttribute("aria-pressed", String(targetLang === "en")); }
  if (btnEs) { btnEs.classList.toggle("active", targetLang === "es"); btnEs.setAttribute("aria-pressed", String(targetLang === "es")); }

  ["cvDownload", "navCvBtn", "contactCvBtn"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.href = CV_FILES[targetLang];
  });
  ["cvDownloadAlt", "contactCvAlt"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.href = CV_FILES[targetLang === "en" ? "es" : "en"];
  });

  store("lang", targetLang);
  if (!opts.initial) refreshSplits();
  syncAllSegs(!opts.initial);

  if (changed && !opts.initial && !MOTION.reduced.matches) {
    document.body.classList.remove("lang-swap");
    void document.body.offsetWidth;
    document.body.classList.add("lang-swap");
  }
}

/* ===== Cases: filters with FLIP (interruptible) and view toggle ===== */
const filterButtons = document.querySelectorAll(".filter-btn[data-filter]");
const viewCardsBtn = document.getElementById("viewCardsBtn");
const viewMatrixBtn = document.getElementById("viewMatrixBtn");
const casesList = document.getElementById("casesList");
const matrixView = document.getElementById("matrixView");

function showCards() {
  if (!casesList || !matrixView || !viewCardsBtn || !viewMatrixBtn) return;
  viewCardsBtn.classList.add("active");
  viewMatrixBtn.classList.remove("active");
  casesList.classList.remove("hidden");
  matrixView.classList.remove("active");
  const seg = viewCardsBtn.closest("[data-seg]");
  if (seg) syncSeg(seg, true);
}

function applyFilter(filter) {
  if (!casesList) return;
  const items = [...casesList.children];
  const first = new Map(items.map((el) => [el, el.hidden ? null : el.getBoundingClientRect()]));
  items.forEach((el) => el.getAnimations().forEach((a) => a.cancel()));

  items.forEach((el) => {
    if (!el.matches(".case-card[data-categories]")) return;
    const cats = (el.getAttribute("data-categories") || "").split(/\s+/);
    el.hidden = !(filter === "all" || cats.includes(filter));
  });
  casesList.classList.toggle("is-filtered", filter !== "all");

  let entering = 0;
  items.forEach((el) => {
    if (el.hidden) return;
    el.classList.add("visible", "is-visible");
    if (MOTION.reduced.matches) return;
    const a = first.get(el);
    const b = el.getBoundingClientRect();
    if (!a) {
      el.animate(
        [{ opacity: 0, transform: "scale(0.94)" }, { opacity: 1, transform: "none" }],
        { duration: 280, easing: MOTION.spring, delay: Math.min(entering++, 5) * 40, fill: "backwards" }
      );
      return;
    }
    const dx = a.left + a.width / 2 - (b.left + b.width / 2);
    const dy = a.top + a.height / 2 - (b.top + b.height / 2);
    const resized = Math.abs(a.width - b.width) > 2 || Math.abs(a.height - b.height) > 2;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && !resized) return;
    el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px)`, opacity: resized ? 0.55 : 1 },
        { transform: "none", opacity: 1 },
      ],
      { duration: 280, easing: MOTION.out }
    );
  });
}

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterButtons.forEach((b) => b.classList.toggle("active", b === btn));
    showCards();
    applyFilter(btn.getAttribute("data-filter"));
  });
});

if (viewCardsBtn && viewMatrixBtn && casesList && matrixView) {
  viewCardsBtn.addEventListener("click", showCards);
  viewMatrixBtn.addEventListener("click", () => {
    viewMatrixBtn.classList.add("active");
    viewCardsBtn.classList.remove("active");
    matrixView.classList.add("active");
    casesList.classList.add("hidden");
    matrixView.querySelectorAll(".matrix-kpi").forEach((el, i) => setTimeout(() => decode(el), 80 + i * 40));
  });
}

/* ===== Modal (SQL & architecture, technical notes): grows from the click ===== */
let modalReturnFocus = null;

function openModalShell() {
  const backdrop = document.getElementById("auditModalBackdrop");
  const modal = backdrop && backdrop.querySelector(".audit-modal");
  if (!backdrop || !modal) return;
  modalReturnFocus = document.activeElement;
  backdrop.scrollTop = 0;
  const o = inputOrigin();
  modal.style.setProperty("--ox", `${o.x - modal.offsetLeft}px`);
  modal.style.setProperty("--oy", `${o.y - modal.offsetTop}px`);
  backdrop.classList.add("open");
  document.body.classList.add("modal-open");
  const close = document.getElementById("auditModalClose");
  if (close) close.focus({ preventScroll: true });
}

function sectionLabel(text) {
  return `<p style="font-weight: 600; color: var(--text); margin-bottom: 6px;">${text}</p>`;
}

function openAuditModal(caseId) {
  const data = CASE_AUDIT_DATA[caseId];
  if (!data) return;
  const lang = currentLang();
  const metaEl = document.getElementById("auditModalMeta");
  const titleEl = document.getElementById("auditModalTitle");
  const bodyEl = document.getElementById("auditModalBody");
  if (!metaEl || !titleEl || !bodyEl) return;

  metaEl.textContent = data.meta;
  titleEl.textContent = data.title[lang];
  const L = lang === "en"
    ? { q: "Business Problem & Analytical Question", bench: "Model / Cohort Evaluation Summary", sql: "Reproducible SQL & Validation Logic", lim: "Methodological Scope & Limitations", open: "Explore Full Case Study & Deliverables" }
    : { q: "Problema de Negocio y Pregunta Analítica", bench: "Resumen Cuantitativo de Modelos / Cohortes", sql: "Consulta SQL y Lógica de Validación", lim: "Alcance Metodológico y Limitaciones", open: "Explorar Caso Completo y Descargables" };

  let benchHtml = "";
  if (data.benchmark) {
    const headers = data.benchmark.headers[lang].map((h) => `<th>${h}</th>`).join("");
    const rows = data.benchmark.rows
      .map((r) => `<tr>${r.map((cell, i) => `<td style="${i === 0 ? "font-weight:600;color:var(--text);" : ""}">${cell}</td>`).join("")}</tr>`)
      .join("");
    benchHtml = `<div>${sectionLabel(L.bench)}<table class="modal-bench-table"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  bodyEl.innerHTML = `
    <div>${sectionLabel(L.q)}<p style="color: var(--text-secondary); font-size: 0.95rem; margin-bottom: 18px;">${data.question[lang]}</p></div>
    ${benchHtml}
    <div>${sectionLabel(L.sql)}<pre class="audit-code"><code>${data.sql.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre></div>
    <div>${sectionLabel(L.lim)}<p style="color: var(--text-secondary); font-size: 0.93rem; margin-bottom: 22px;">${data.limits[lang]}</p></div>
    <div style="display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid var(--border); padding-top: 18px;">
      <a class="btn btn--ghost btn--sm" href="${data.caseUrl}">${L.open} <span class="arr" aria-hidden="true">→</span></a>
    </div>`;
  openModalShell();
}

function openNoteModal(noteId) {
  const note = TECH_NOTES_DATA[noteId];
  if (!note) return;
  const lang = currentLang();
  const metaEl = document.getElementById("auditModalMeta");
  const titleEl = document.getElementById("auditModalTitle");
  const bodyEl = document.getElementById("auditModalBody");
  if (!metaEl || !titleEl || !bodyEl) return;

  metaEl.textContent = note.meta;
  titleEl.textContent = note.title[lang];
  const L = lang === "en"
    ? { prob: "Engineering Context & Problem", code: "Implementation Pattern", take: "Production Takeaway", open: "Open Associated Case Study" }
    : { prob: "Contexto de Ingeniería y Problema", code: "Patrón de Implementación", take: "Aprendizaje y Criterio Aplicado", open: "Ver Caso de Estudio Asociado" };

  bodyEl.innerHTML = `
    <div>${sectionLabel(L.prob)}<p style="color: var(--text-secondary); font-size: 0.95rem; margin-bottom: 18px;">${note.problem[lang]}</p></div>
    <div>${sectionLabel(L.code)}<pre class="audit-code"><code>${note.code.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre></div>
    <div>${sectionLabel(L.take)}<p style="color: var(--text-secondary); font-size: 0.93rem; margin-bottom: 22px;">${note.takeaway[lang]}</p></div>
    <div style="display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid var(--border); padding-top: 18px;">
      <a class="btn btn--ghost btn--sm" href="${note.caseUrl}">${L.open} <span class="arr" aria-hidden="true">→</span></a>
    </div>`;
  openModalShell();
}

function closeAuditModal() {
  const backdrop = document.getElementById("auditModalBackdrop");
  if (!backdrop || !backdrop.classList.contains("open")) return;
  backdrop.classList.remove("open"); // a CSS transition: closing mid-opening simply reverses
  document.body.classList.remove("modal-open");
  if (modalReturnFocus && typeof modalReturnFocus.focus === "function") modalReturnFocus.focus({ preventScroll: true });
}

/* ===== Expandable About Story Drawer ===== */
function toggleAboutStory() {
  const content = document.getElementById("aboutExpandedContent");
  const btn = document.getElementById("aboutExpandBtn");
  if (!content || !btn) return;
  const isHidden = content.hasAttribute("hidden");
  const lang = currentLang();
  if (isHidden) {
    content.removeAttribute("hidden");
    btn.setAttribute("aria-expanded", "true");
    btn.textContent = lang === "en" ? "Hide full vision ↑" : "Ocultar principios y visión ↑";
  } else {
    content.setAttribute("hidden", "");
    btn.setAttribute("aria-expanded", "false");
    btn.textContent = lang === "en" ? "Read working principles & full vision ↓" : "Leer principios de trabajo y visión completa ↓";
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
  if (e.key !== "Escape") return;
  closeAuditModal();
  closeMenu();
});

/* ===== Ripple from the exact pointer position ===== */
function initRipple() {
  const HOSTS = ".btn, .seg > button, .icon-btn, .theme-btn, .nav__burger, .case-card__open";
  document.addEventListener(
    "pointerdown",
    (e) => {
      if (e.button > 0) return;
      const host = e.target.closest(HOSTS);
      if (!host) return;
      const r = host.getBoundingClientRect();
      const s = Math.max(r.width, r.height) * 2.2;
      const dot = document.createElement("span");
      dot.className = "ripple";
      dot.style.cssText = `--x:${e.clientX - r.left}px;--y:${e.clientY - r.top}px;--s:${s}px`;
      host.appendChild(dot);
      dot.addEventListener("animationend", () => dot.remove(), { once: true });
      setTimeout(() => dot.remove(), 700);
    },
    { passive: true }
  );
}

/* ===== Scroll reveal: staggered within each bento group ===== */
function initReveal() {
  document.documentElement.classList.add("js-ready");
  const groups = ".proof, .cases-grid, .timeline, .certs__grid, .skills__grid, .products-grid, .notes-grid, .exp-edu-grid, .about__grid";
  document.querySelectorAll(groups).forEach((group) => {
    [...group.children]
      .filter((el) => el.classList.contains("reveal"))
      .forEach((el, i) => el.style.setProperty("--d", `${Math.min(i, 6) * 45}ms`));
  });

  document.querySelectorAll(".skill-list, .product-list, .cert-card__tags, .contact__links, .timeline__card ul, .matrix-table tbody, .idcard__rows").forEach((list) => {
    [...list.children].forEach((li, i) => li.style.setProperty("--li", String(Math.min(i, 8))));
  });

  const els = document.querySelectorAll(".reveal");
  const show = (el) => el.classList.add("visible", "is-visible");
  if (!("IntersectionObserver" in window)) { els.forEach(show); return; }
  const io = new IntersectionObserver(
    (entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      show(entry.target);
      io.unobserve(entry.target);
    }),
    { threshold: 0.04, rootMargin: "0px 0px -6% 0px" }
  );
  els.forEach((el) => io.observe(el));
  setTimeout(() => els.forEach(show), 6000); // safety net: never leave content hidden
}

/* ===== Proof counters ===== */
function initCounters() {
  const els = document.querySelectorAll("[data-count]");
  const run = (el) => {
    const target = Number(el.dataset.count);
    const pre = el.dataset.prefix || "";
    const suf = el.dataset.suffix || "";
    if (MOTION.reduced.matches || !target) { el.textContent = `${pre}${target}${suf}`; return; }
    const t0 = performance.now();
    const dur = 900;
    const tick = (now) => {
      const p = Math.min((now - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      el.textContent = `${pre}${Math.round(target * eased)}${suf}`;
      if (p < 1) requestAnimationFrame(tick);
      else el.classList.add("is-done");
    };
    requestAnimationFrame(tick);
  };
  if (!("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      run(e.target);
    }),
    { threshold: 0.4 }
  );
  els.forEach((el) => io.observe(el));
}

/* ===== Parallax (hero only, cheap transforms) ===== */
function initParallax() {
  if (MOTION.reduced.matches) return;
  const items = [...document.querySelectorAll("[data-parallax]")];
  const hero = document.querySelector(".hero");
  if (!items.length || !hero) return;
  let queued = false;
  const update = () => {
    queued = false;
    const y = window.scrollY;
    if (y > hero.offsetHeight * 1.2) return;
    items.forEach((el) => {
      el.style.setProperty("--py", `${(y * parseFloat(el.dataset.parallax)).toFixed(1)}px`);
    });
  };
  window.addEventListener("scroll", () => {
    if (!queued) { queued = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();
}

/* ===== Case cards: tilt + glare that follows the pointer ===== */
function initTilt() {
  if (!MOTION.fine.matches || MOTION.reduced.matches) return;
  document.querySelectorAll(".case-card, .proof__tile, .idcard").forEach((card) => {
    let raf = 0;
    const max = card.classList.contains("case-card--feature") ? 1.6 : card.classList.contains("idcard") ? 5 : 3;
    card.addEventListener("pointermove", (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        card.style.setProperty("--ty", `${((px - 0.5) * max * 2).toFixed(2)}deg`);
        card.style.setProperty("--tx", `${((0.5 - py) * max * 2).toFixed(2)}deg`);
        card.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
        card.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
      });
    });
    card.addEventListener("pointerleave", () => {
      cancelAnimationFrame(raf);
      card.style.setProperty("--tx", "0deg");
      card.style.setProperty("--ty", "0deg");
    });
  });
}

/* ===== Magnetic primary actions: they lean toward the pointer ===== */
function initMagnetic() {
  if (!MOTION.fine.matches || MOTION.reduced.matches) return;
  document.querySelectorAll(".btn--accent, .nav__cta").forEach((btn) => {
    btn.addEventListener("pointermove", (e) => {
      const r = btn.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      btn.style.translate = `${(dx * 0.16).toFixed(1)}px ${(dy * 0.26).toFixed(1)}px`;
    });
    btn.addEventListener("pointerleave", () => { btn.style.translate = ""; });
  });
}

/* ===== Hover fill that grows from where the pointer enters (and leaves) ===== */
function initHoverFill() {
  if (!MOTION.fine.matches) return;
  const SEL = ".btn--ghost, .btn--neu, .btn--glass";
  const place = (btn, e) => {
    const r = btn.getBoundingClientRect();
    btn.style.setProperty("--hx", `${(e.clientX - r.left).toFixed(0)}px`);
    btn.style.setProperty("--hy", `${(e.clientY - r.top).toFixed(0)}px`);
    btn.style.setProperty("--hs", `${(Math.hypot(r.width, r.height) * 2.1).toFixed(0)}px`);
  };
  document.addEventListener("pointerover", (e) => {
    if (e.pointerType !== "mouse") return;
    const btn = e.target.closest(SEL);
    if (!btn || btn.contains(e.relatedTarget)) return;
    place(btn, e);
    btn.classList.add("is-hover");
  });
  document.addEventListener("pointerout", (e) => {
    if (e.pointerType !== "mouse") return;
    const btn = e.target.closest(SEL);
    if (!btn || btn.contains(e.relatedTarget)) return;
    place(btn, e);
    btn.classList.remove("is-hover");
  });

  // Nav links: the underline grows from the side the pointer came in, and leaves the same way
  document.querySelectorAll(".nav__links a").forEach((a) => {
    const side = (e) => {
      const r = a.getBoundingClientRect();
      a.style.setProperty("--from", e.clientX < r.left + r.width / 2 ? "left" : "right");
    };
    a.addEventListener("pointerenter", side);
    a.addEventListener("pointerleave", side);
  });
}

/* ===== Experience: a rail that fills as you read down the timeline ===== */
function initTimelineRail() {
  const tl = document.querySelector(".timeline");
  if (!tl) return;
  const cards = [...tl.querySelectorAll(".timeline__card")];
  let queued = false;
  const update = () => {
    queued = false;
    const r = tl.getBoundingClientRect();
    const mark = window.innerHeight * 0.6;
    const p = Math.min(Math.max((mark - r.top) / r.height, 0), 1);
    tl.style.setProperty("--tp", p.toFixed(3));
    cards.forEach((c) => c.classList.toggle("is-passed", c.getBoundingClientRect().top + 34 < mark));
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", queue);
  update();
}

/* ===== Case screenshots drift inside their frame while scrolling (depth) ===== */
function initShotParallax() {
  if (MOTION.reduced.matches || !("IntersectionObserver" in window)) return;
  const live = new Set();
  let queued = false;
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) live.add(e.target); else live.delete(e.target); });
    queue();
  });
  document.querySelectorAll(".case-card__shot").forEach((shot) => io.observe(shot));
  const update = () => {
    queued = false;
    const vh = window.innerHeight;
    live.forEach((shot) => {
      const r = shot.getBoundingClientRect();
      const c = (r.top + r.height / 2 - vh / 2) / vh;
      const img = shot.querySelector("img");
      if (img) img.style.translate = `0 ${(c * -16).toFixed(1)}px`;
    });
  };
  window.addEventListener("scroll", queue, { passive: true });
}

/* ===== Rails: drag to scroll, rubber band past the edges, spring back ===== */
function rubber(distance, dimension) {
  const c = 0.55; // same constant iOS uses for its overscroll
  return (1 - 1 / ((distance * c) / dimension + 1)) * dimension;
}

function initRail(rail) {
  let pull = 0;
  let raf = 0;
  let drag = null;
  let touch = null;
  const max = () => rail.scrollWidth - rail.clientWidth;
  const setPull = (v) => {
    pull = v;
    rail.style.setProperty("--pull", `${v.toFixed(2)}px`);
  };
  const springBack = () => {
    cancelAnimationFrame(raf);
    let velocity = 0;
    let last = performance.now();
    const k = 320; // stiffness
    const d = 26;  // damping (≈ critical: one soft overshoot at most)
    const step = (now) => {
      const dt = Math.min((now - last) / 1000, 0.032);
      last = now;
      velocity += (-k * pull - d * velocity) * dt;
      const next = pull + velocity * dt;
      if (Math.abs(next) < 0.3 && Math.abs(velocity) < 4) { setPull(0); return; }
      setPull(next);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  };
  const stretch = (target) => {
    const m = max();
    if (target < 0) { rail.scrollLeft = 0; setPull(rubber(-target, rail.clientWidth)); }
    else if (target > m) { rail.scrollLeft = m; setPull(-rubber(target - m, rail.clientWidth)); }
    else { rail.scrollLeft = target; if (pull) setPull(0); }
  };

  // Mouse: drag the rail like a touch surface
  rail.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0 || max() <= 1) return;
    cancelAnimationFrame(raf); // interrupt a running spring
    drag = { x: e.clientX, start: rail.scrollLeft, moved: false, id: e.pointerId };
  });
  rail.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved) {
      if (Math.abs(dx) < 6) return;
      drag.moved = true;
      rail.setPointerCapture(e.pointerId);
      rail.classList.add("is-dragging");
    }
    stretch(drag.start - dx);
  });
  const endDrag = () => {
    if (!drag) return;
    const moved = drag.moved;
    drag = null;
    rail.classList.remove("is-dragging");
    if (moved) {
      const eat = (ev) => { ev.preventDefault(); ev.stopPropagation(); };
      rail.addEventListener("click", eat, { capture: true, once: true });
      setTimeout(() => rail.removeEventListener("click", eat, { capture: true }), 0);
    }
    if (pull) springBack();
  };
  rail.addEventListener("pointerup", endDrag);
  rail.addEventListener("pointercancel", endDrag);

  // Touch: native scrolling, plus the stretch when pulling past an edge
  rail.addEventListener("touchstart", (e) => {
    if (max() <= 1) return;
    cancelAnimationFrame(raf);
    const t = e.touches[0];
    touch = { x: t.clientX, y: t.clientY, start: rail.scrollLeft, axis: null };
  }, { passive: true });
  rail.addEventListener("touchmove", (e) => {
    if (!touch) return;
    const t = e.touches[0];
    const dx = t.clientX - touch.x;
    const dy = t.clientY - touch.y;
    if (!touch.axis && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) touch.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    if (touch.axis !== "x") return;
    const target = touch.start - dx;
    const m = max();
    if (target < 0 && rail.scrollLeft <= 0) setPull(rubber(-target, rail.clientWidth));
    else if (target > m && rail.scrollLeft >= m - 1) setPull(-rubber(target - m, rail.clientWidth));
    else if (pull) setPull(0);
  }, { passive: true });
  const endTouch = () => { touch = null; if (pull) springBack(); };
  rail.addEventListener("touchend", endTouch, { passive: true });
  rail.addEventListener("touchcancel", endTouch, { passive: true });

  // Arrow buttons: scroll by one card; at the end, a small bump instead of nothing
  document.querySelectorAll(`.rail-nav[data-rail="${rail.id}"] [data-dir]`).forEach((btn) => {
    btn.addEventListener("click", () => {
      const dir = Number(btn.dataset.dir);
      const card = rail.firstElementChild;
      const step = card ? card.getBoundingClientRect().width + 16 : rail.clientWidth * 0.8;
      const atEdge = dir < 0 ? rail.scrollLeft <= 1 : rail.scrollLeft >= max() - 1;
      if (atEdge && !MOTION.reduced.matches) {
        cancelAnimationFrame(raf);
        setPull(-dir * 28);
        springBack();
        return;
      }
      rail.scrollBy({ left: dir * step, behavior: MOTION.reduced.matches ? "auto" : "smooth" });
    });
  });
}

function initRails() {
  document.querySelectorAll(".rail").forEach((rail) => safe(() => initRail(rail), "rail"));
}

/* ===== Copy email: exaggerated success + a bubble that flies on an arc ===== */
function initCopyEmail() {
  const btn = document.getElementById("copyEmail");
  if (!btn) return;
  let timer = 0;
  btn.addEventListener("click", async (e) => {
    const email = btn.dataset.email || "";
    let ok = true;
    try {
      await navigator.clipboard.writeText(email);
    } catch (_) {
      const ta = document.createElement("textarea");
      ta.value = email;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      try { ok = document.execCommand("copy"); } catch (__) { ok = false; }
      ta.remove();
    }
    const label = btn.querySelector(".copy-btn__label");
    const d = dictFor(currentLang());
    btn.classList.remove("is-copied");
    void btn.offsetWidth;
    if (ok) btn.classList.add("is-copied");
    if (label) label.textContent = ok ? d["contact.copied"] || "¡Copiado!" : email;
    clearTimeout(timer);
    timer = setTimeout(() => {
      btn.classList.remove("is-copied");
      if (label) label.textContent = dictFor(currentLang())["contact.copy"] || "Copiar correo";
    }, 1800);

    if (!ok || MOTION.reduced.matches) return;
    const r = btn.getBoundingClientRect();
    const x = e.detail === 0 ? r.left + r.width / 2 : e.clientX;
    const y = e.detail === 0 ? r.top + r.height / 2 : e.clientY;
    const bubble = document.createElement("span");
    bubble.className = "fly-bubble";
    bubble.setAttribute("aria-hidden", "true");
    bubble.textContent = "✓";
    bubble.style.left = `${x}px`;
    bubble.style.top = `${y}px`;
    document.body.appendChild(bubble);
    bubble.addEventListener("animationend", () => bubble.remove(), { once: true });
    setTimeout(() => bubble.remove(), 1000);
  });
}

/* ===== Doherty: prefetch an app as soon as the pointer shows intent ===== */
function initPrefetch() {
  const done = new Set();
  const go = (a) => {
    const href = a.getAttribute("href");
    if (!href || done.has(href)) return;
    done.add(href);
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = href;
    document.head.appendChild(link);
  };
  document.querySelectorAll('a[href^="apps/"]').forEach((a) => {
    ["pointerenter", "focus", "touchstart"].forEach((type) =>
      a.addEventListener(type, () => go(a), { once: true, passive: true })
    );
  });
}

/* ===== Theme: the new theme spreads as a circle from the toggle ===== */
function setTheme(theme, persist) {
  if (theme === "dark") document.documentElement.setAttribute("data-theme", "dark");
  else document.documentElement.removeAttribute("data-theme");
  if (persist) store("theme", theme); // only an explicit choice is remembered; otherwise follow the OS
}

function initTheme() {
  const btn = document.getElementById("themeToggle");
  setTheme(store("theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  if (!btn) return;
  btn.addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    const spin = () => {
      const icon = btn.querySelector(next === "dark" ? ".icon-sun" : ".icon-moon");
      if (icon && !MOTION.reduced.matches) {
        icon.animate(
          [{ transform: "rotate(-120deg) scale(0.4)", opacity: 0 }, { transform: "none", opacity: 1 }],
          { duration: 300, easing: MOTION.spring }
        );
      }
    };
    if (!document.startViewTransition || MOTION.reduced.matches) {
      setTheme(next, true);
      spin();
      return;
    }
    const r = btn.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    document.documentElement.classList.add("theme-vt");
    const vt = document.startViewTransition(() => { setTheme(next, true); spin(); });
    vt.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 300, easing: MOTION.inOut, pseudoElement: "::view-transition-new(root)" }
      );
    }).catch(() => {});
    vt.finished.finally(() => document.documentElement.classList.remove("theme-vt"));
  });
}

/* ===== Mobile menu: unfolds from the burger ===== */
const burger = document.getElementById("burger");
const navLinks = document.getElementById("navLinks");
function closeMenu() {
  if (!burger || !navLinks || !navLinks.classList.contains("open")) return;
  navLinks.classList.remove("open");
  burger.setAttribute("aria-expanded", "false");
}
function initMenu() {
  if (!burger || !navLinks) return;
  burger.addEventListener("click", () => {
    const open = navLinks.classList.toggle("open");
    burger.setAttribute("aria-expanded", String(open));
  });
  navLinks.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMenu));
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".nav__inner")) closeMenu();
  });
}

/* ===== Scroll progress + nav elevation ===== */
function initScrollChrome() {
  const bar = document.getElementById("progress");
  const nav = document.querySelector(".nav");
  let queued = false;
  const update = () => {
    queued = false;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const pct = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
    if (bar) bar.style.width = `${Math.min(pct, 100)}%`;
    if (nav) nav.classList.toggle("is-scrolled", window.scrollY > 8);
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", queue);
  update();
}

/* ===== Scrollspy ===== */
function initScrollspy() {
  if (!navLinks || !("IntersectionObserver" in window)) return;
  // Every section is observed; sections without a nav link clear the marker
  const spy = new Map();
  document.querySelectorAll("main > section[id]").forEach((section) => {
    spy.set(section, navLinks.querySelector(`a[href="#${section.id}"]`));
  });
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      navLinks.querySelectorAll("a.active").forEach((l) => l.classList.remove("active"));
      const link = spy.get(e.target);
      if (link) link.classList.add("active");
    }),
    { rootMargin: "-35% 0px -55% 0px" }
  );
  spy.forEach((_, section) => io.observe(section));
}

/* ===== Initialize ===== */
safe(initReveal, "reveal");
safe(initTheme, "theme");
safe(initSegs, "segs");
safe(() => setLang(store("lang") || "es", { initial: true }), "lang");
safe(initSplit, "split");
safe(initDecode, "decode");
safe(initRipple, "ripple");
safe(initCounters, "counters");
safe(initParallax, "parallax");
safe(initTilt, "tilt");
safe(initMagnetic, "magnetic");
safe(initHoverFill, "hoverfill");
safe(initTimelineRail, "timeline");
safe(initShotParallax, "shots");
safe(initRails, "rails");
safe(initCopyEmail, "copy");
safe(initPrefetch, "prefetch");
safe(initMenu, "menu");
safe(initScrollChrome, "scroll");
safe(initScrollspy, "scrollspy");
requestAnimationFrame(() => document.documentElement.classList.add("is-loaded"));
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => syncAllSegs(false));
let resizeTimer = 0;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => syncAllSegs(false), 120);
});
