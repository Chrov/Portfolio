/* ==========================================================================
   Camilo Vergara Salas — Portfolio Interactive Controller
   Features: Bilingual i18n (ES/EN), Natural Scroll-Reveal Choreography,
   Animated Stat Counters, Interactive Card Spotlight, Case Filters & SQL Modal
   ========================================================================== */

const CV_FILES = {
  en: "assets/Camilo_Vergara_Resume_EN.pdf",
  es: "assets/Camilo_Vergara_CV_ES.pdf",
};

const CASE_AUDIT_DATA = {
  "market-stall-analytics": {
    meta: "Retail e Inventario · SQL / Excel / Power BI",
    title: {
      es: "Metodología y SQL: Control de merma y reposición",
      en: "Methodology & SQL: Batch waste and replenishment control",
    },
    question: {
      es: "¿Dónde concentrar el primer piloto operativo de control de merma sin mezclar unidades físicas incompatibles ni confundir lotes abiertos con ventas cerradas?",
      en: "Where should the first operational waste-control pilot focus without mixing incompatible physical units or conflating open batches with closed sales?",
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
    meta: "Cadena de Suministro · dbt / LightGBM / Tableau",
    title: {
      es: "Metodología y SQL: Pronóstico para piloto de reposición",
      en: "Methodology & SQL: Forecasting for a replenishment pilot",
    },
    question: {
      es: "¿Un modelo recursivo LightGBM validado temporalmente supera al baseline estacional para guiar un piloto de reposición en sombra?",
      en: "Does a temporally validated recursive LightGBM model outperform a seasonal-naive baseline to guide a shadow replenishment pilot?",
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
    meta: "Logística Aérea · Datos Oficiales BTS / Python / Power BI",
    title: {
      es: "Metodología y SQL: Confiabilidad de rutas aéreas",
      en: "Methodology & SQL: Air route reliability (BTS)",
    },
    question: {
      es: "¿Qué rutas direccionales concentran el mayor volumen de vuelos afectados en junio de 2023 separando correctamente cancelaciones, desvíos y retrasos?",
      en: "Which directional routes concentrate the highest disrupted-flight volume in June 2023 when properly separating cancellations, diversions, and arrival delays?",
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
    meta: "Minería y Economía · COCHILCO / SQL / Power BI",
    title: {
      es: "Metodología y SQL: Cobre chileno — volumen frente a valor",
      en: "Methodology & SQL: Chile’s copper — volume versus value",
    },
    question: {
      es: "¿Qué debe monitorear un equipo directivo cuando el valor nominal exportado crece 16,7% pero la producción física sube solo 4,9%?",
      en: "What should leadership monitor when nominal export value grows 16.7% while physical mine output rises only 4.9%?",
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
    meta: "Planificación Comercial · SQL / Python / Tableau",
    title: {
      es: "Metodología y SQL: Pronóstico operativo para comercio",
      en: "Methodology & SQL: Operational forecast for a small business",
    },
    question: {
      es: "Con solo fecha, producto y demanda histórica, ¿una media móvil de 8 semanas por día de la semana mejora el hábito de repetir la semana pasada?",
      en: "With only date, product, and historical demand, does an 8-week weekday mean improve on repeating last week?",
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
    meta: "Banca y Modelos Predictivos · UCI / Python / SQL",
    title: {
      es: "Metodología y SQL: Cuándo no desplegar un modelo bancario",
      en: "Methodology & SQL: When a banking model should not ship",
    },
    question: {
      es: "¿Se sostiene el ranking de propensión de contacto cuando se evalúa en una cohorte futura real y sin fuga de duración de llamada?",
      en: "Does contact propensity ranking hold up in a later chronological cohort when call-duration leakage is removed?",
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
        requestAnimationFrame(() => article.classList.add("is-visible"));
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

/* ===== Quick SQL & Method Modal ===== */
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

  const lblQ = lang === "en" ? "Business Question & Context" : "Pregunta de Negocio y Contexto";
  const lblSql = lang === "en" ? "SQL & Validation Logic" : "Consulta SQL y Lógica de Validación";
  const lblLim = lang === "en" ? "Scope & Considerations" : "Alcance y Consideraciones del Análisis";
  const lblOpen = lang === "en" ? "Explore Full Case Study & Files →" : "Explorar Caso Completo y Descargables →";

  bodyEl.innerHTML = `
    <p style="font-weight: 600; color: var(--text); margin-bottom: 4px;">${lblQ}</p>
    <p style="color: var(--text-secondary); font-size: 0.94rem; margin-bottom: 16px;">${data.question[lang]}</p>
    <p style="font-weight: 600; color: var(--text); margin-bottom: 4px;">${lblSql}</p>
    <pre class="audit-code"><code>${data.sql.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>
    <p style="font-weight: 600; color: var(--text); margin-bottom: 4px;">${lblLim}</p>
    <p style="color: var(--text-secondary); font-size: 0.92rem; margin-bottom: 22px;">${data.limits[lang]}</p>
    <div style="display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid var(--border); padding-top: 16px;">
      <a class="btn btn--primary btn--sm" href="${data.caseUrl}">${lblOpen}</a>
    </div>
  `;

  backdrop.classList.add("open");
}

function closeAuditModal() {
  const backdrop = document.getElementById("auditModalBackdrop");
  if (backdrop) backdrop.classList.remove("open");
}

window.openAuditModal = openAuditModal;
window.closeAuditModal = closeAuditModal;
window.setLang = setLang;

document.getElementById("auditModalBackdrop")?.addEventListener("click", (e) => {
  if (e.target.id === "auditModalBackdrop") closeAuditModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeAuditModal();
});

/* ===== Natural Scroll-Reveal Choreography ===== */
const revealElements = document.querySelectorAll(".reveal");

// Assign subtle stagger delays to sibling reveal elements within grids
document.querySelectorAll(".hero__proof-strip, .skills__grid, .timeline").forEach((group) => {
  group.querySelectorAll(":scope > .reveal").forEach((el, idx) => {
    el.style.setProperty("--reveal-delay", `${idx * 75}ms`);
  });
});

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
  );

  revealElements.forEach((el) => revealObserver.observe(el));
} else {
  revealElements.forEach((el) => el.classList.add("is-visible"));
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
    // Ease out cubic
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
  burger.addEventListener("click", () => navLinks.classList.toggle("open"));
  navLinks.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => navLinks.classList.remove("open"))
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
