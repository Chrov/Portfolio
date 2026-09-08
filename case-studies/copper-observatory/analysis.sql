-- Annual grain. Prices and export values are nominal; never sum prices.
WITH prior AS (
 SELECT *, LAG(production_kt) OVER (ORDER BY year) AS previous_production,
 LAG(exports_usd_m) OVER (ORDER BY year) AS previous_exports FROM annual
)
SELECT year, production_kt, exports_usd_m,
 100.0 * (production_kt / previous_production - 1) AS production_yoy_pct,
 100.0 * (exports_usd_m / previous_exports - 1) AS exports_yoy_pct
FROM prior ORDER BY year;
