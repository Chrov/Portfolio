-- Data-quality assertions. Each query returns one row: (check_name, passed, detail).
-- build.py fails the pipeline if any check does not pass.

SELECT 'fct_orders keeps every order' AS check_name,
       (SELECT COUNT(*) FROM fct_orders) = (SELECT COUNT(*) FROM stg_orders) AS passed,
       CAST((SELECT COUNT(*) FROM fct_orders) AS VARCHAR) AS detail
UNION ALL
SELECT 'order_id unique in fct_orders',
       (SELECT COUNT(*) FROM fct_orders) = (SELECT COUNT(DISTINCT order_id) FROM fct_orders),
       ''
UNION ALL
SELECT 'line revenue == order revenue (no fan-out)',
       (SELECT SUM(price) FROM fct_order_items) = (SELECT SUM(product_revenue) FROM fct_orders),
       CAST((SELECT SUM(price) FROM fct_order_items) AS VARCHAR)
UNION ALL
SELECT 'line revenue == raw revenue',
       (SELECT SUM(price) FROM fct_order_items) = (SELECT SUM(price) FROM stg_order_items),
       ''
UNION ALL
SELECT 'one review per order after dedup',
       (SELECT COUNT(*) FROM stg_reviews) = (SELECT COUNT(DISTINCT order_id) FROM stg_reviews),
       CAST((SELECT COUNT(*) FROM stg_reviews) AS VARCHAR)
UNION ALL
SELECT 'every order has a region',
       (SELECT COUNT(*) FROM fct_orders WHERE region IS NULL) = 0,
       ''
UNION ALL
SELECT 'payments match items+freight within 1 BRL for >= 99% of valid orders',
       (SELECT AVG(CASE WHEN ABS(payment_total - product_revenue - freight) <= 1 THEN 1.0 ELSE 0.0 END)
          FROM fct_orders WHERE is_valid AND payment_total IS NOT NULL) >= 0.99,
       CAST((SELECT AVG(CASE WHEN ABS(payment_total - product_revenue - freight) <= 1 THEN 1.0 ELSE 0.0 END)
          FROM fct_orders WHERE is_valid AND payment_total IS NOT NULL) AS VARCHAR)
UNION ALL
SELECT 'no negative prices',
       (SELECT COUNT(*) FROM stg_order_items WHERE price < 0 OR freight < 0) = 0,
       '';
