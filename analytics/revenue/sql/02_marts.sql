-- Mart layer. Every amount is aggregated to the target grain BEFORE joining,
-- so order_items x payments x reviews can never multiply revenue.

-- fct_orders — grain: one row per order (99,441 rows expected).
CREATE OR REPLACE TABLE fct_orders AS
WITH items AS (
    SELECT order_id,
           COUNT(*)     AS items,
           SUM(price)   AS product_revenue,
           SUM(freight) AS freight
    FROM stg_order_items
    GROUP BY order_id
),
payments AS (
    SELECT order_id, SUM(payment_value) AS payment_total
    FROM stg_payments
    GROUP BY order_id
)
SELECT
    o.order_id,
    c.customer_unique_id,
    c.state,
    s.region,
    o.order_status,
    o.purchased_at,
    CAST(o.purchased_at AS DATE)                                   AS purchase_date,
    (o.order_status NOT IN ('canceled', 'unavailable')
        AND i.order_id IS NOT NULL)                                AS is_valid,
    COALESCE(i.items, 0)                                           AS items,
    COALESCE(i.product_revenue, 0)                                 AS product_revenue,
    COALESCE(i.freight, 0)                                         AS freight,
    p.payment_total,
    r.review_score,
    CAST(o.delivered_at AS DATE) - CAST(o.estimated_at AS DATE)    AS delivery_delay_days
FROM stg_orders o
JOIN stg_customers c   ON c.customer_id = o.customer_id
LEFT JOIN dim_state s  ON s.state = c.state
LEFT JOIN items i      ON i.order_id = o.order_id
LEFT JOIN payments p   ON p.order_id = o.order_id
LEFT JOIN stg_reviews r ON r.order_id = o.order_id;

-- fct_order_items — grain: one row per order line. Order attributes are
-- attached for slicing; amounts stay at line level.
CREATE OR REPLACE TABLE fct_order_items AS
SELECT
    i.order_id,
    i.order_item_id,
    i.product_id,
    pr.category,
    i.price,
    i.freight,
    o.customer_unique_id,
    o.state,
    o.region,
    o.purchase_date,
    o.is_valid
FROM stg_order_items i
JOIN fct_orders o        ON o.order_id = i.order_id
LEFT JOIN stg_products pr ON pr.product_id = i.product_id;
