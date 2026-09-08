-- Historical units: volume priority, not revenue ABC (no prices are supplied).
WITH totals AS (SELECT product_id, SUM(demand_units) AS units FROM demand
 WHERE date < '2025-12-01' GROUP BY product_id), ranked AS (
 SELECT *, SUM(units) OVER (ORDER BY units DESC, product_id ROWS UNBOUNDED PRECEDING) AS cumulative,
 SUM(units) OVER () AS total FROM totals)
SELECT *, 1.0*cumulative/total AS cumulative_share FROM ranked ORDER BY units DESC, product_id;
